import Papa from "papaparse";
import * as XLSX from "xlsx";

// =============================================================================
// TYPES
// =============================================================================

export interface ParsedFile {
  /** Original file name */
  fileName: string;
  /** Detected file type */
  fileType: "csv" | "xlsx" | "json";
  /** Column headers from first row */
  headers: string[];
  /** All data rows (excluding header) */
  rows: Record<string, unknown>[];
  /** Total row count (excluding header) */
  totalRows: number;
  /** Preview rows (first 25) */
  previewRows: Record<string, unknown>[];
  /** Any parsing warnings */
  warnings: string[];
  /** Parsing metadata */
  meta: {
    delimiter?: string;
    encoding?: string;
    sheetName?: string;
  };
}

export interface ParseOptions {
  /** Max rows to fully parse (default: 10000) */
  maxRows?: number;
  /** Preview row count (default: 25) */
  previewCount?: number;
  /** For XLSX: which sheet to parse (default: 0 = first) */
  sheetIndex?: number;
}

export interface ParseError {
  type:
    | "parse_error"
    | "empty_file"
    | "no_headers"
    | "invalid_format"
    | "too_large";
  message: string;
  details?: unknown;
}

export type ParseResult =
  | { success: true; data: ParsedFile }
  | { success: false; error: ParseError };

// =============================================================================
// CSV PARSING (Papa Parse)
// =============================================================================

async function parseCSV(
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const { maxRows = 10000, previewCount = 25 } = options;
  const warnings: string[] = [];

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        // Check for errors
        if (results.errors.length > 0) {
          const criticalErrors = results.errors.filter(
            (e) => e.type === "Quotes" || e.type === "FieldMismatch"
          );
          if (criticalErrors.length > 0) {
            resolve({
              success: false,
              error: {
                type: "parse_error",
                message: `CSV parsing failed: ${criticalErrors[0].message}`,
                details: criticalErrors,
              },
            });
            return;
          }
          // Non-critical errors become warnings
          warnings.push(
            ...results.errors.map((e) => `Row ${e.row}: ${e.message}`)
          );
        }

        // Validate headers
        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          resolve({
            success: false,
            error: {
              type: "no_headers",
              message: "CSV file has no column headers",
            },
          });
          return;
        }

        // Check for empty file
        const rows = results.data as Record<string, unknown>[];
        if (rows.length === 0) {
          resolve({
            success: false,
            error: {
              type: "empty_file",
              message: "CSV file contains no data rows",
            },
          });
          return;
        }

        // Enforce max rows
        const limitedRows = rows.slice(0, maxRows);
        if (rows.length > maxRows) {
          warnings.push(
            `File has ${rows.length} rows, only first ${maxRows} will be processed`
          );
        }

        resolve({
          success: true,
          data: {
            fileName: file.name,
            fileType: "csv",
            headers,
            rows: limitedRows,
            totalRows: limitedRows.length,
            previewRows: limitedRows.slice(0, previewCount),
            warnings,
            meta: {
              delimiter: results.meta.delimiter,
              encoding: "UTF-8",
            },
          },
        });
      },
      error: (error) => {
        resolve({
          success: false,
          error: {
            type: "parse_error",
            message: `CSV parsing failed: ${error.message}`,
            details: error,
          },
        });
      },
    });
  });
}

// =============================================================================
// XLSX PARSING (SheetJS)
// =============================================================================

async function parseXLSX(
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const { maxRows = 10000, previewCount = 25, sheetIndex = 0 } = options;
  const warnings: string[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Get sheet names
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      return {
        success: false,
        error: { type: "empty_file", message: "Excel file contains no sheets" },
      };
    }

    // Select sheet
    const targetSheetName = sheetNames[sheetIndex] || sheetNames[0];
    const worksheet = workbook.Sheets[targetSheetName];

    if (!worksheet) {
      return {
        success: false,
        error: {
          type: "empty_file",
          message: `Sheet "${targetSheetName}" not found`,
        },
      };
    }

    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      worksheet,
      {
        defval: "", // Default empty cells to empty string
        raw: false, // Convert all values to strings
      }
    );

    if (jsonData.length === 0) {
      return {
        success: false,
        error: {
          type: "empty_file",
          message: "Excel sheet contains no data rows",
        },
      };
    }

    // Extract headers from first row keys
    const headers = Object.keys(jsonData[0] || {}).map((h) => h.trim());
    if (headers.length === 0) {
      return {
        success: false,
        error: {
          type: "no_headers",
          message: "Excel file has no column headers",
        },
      };
    }

    // Enforce max rows
    const limitedRows = jsonData.slice(0, maxRows);
    if (jsonData.length > maxRows) {
      warnings.push(
        `File has ${jsonData.length} rows, only first ${maxRows} will be processed`
      );
    }

    // Warn about multiple sheets
    if (sheetNames.length > 1) {
      warnings.push(
        `Workbook has ${sheetNames.length} sheets, only "${targetSheetName}" will be imported`
      );
    }

    return {
      success: true,
      data: {
        fileName: file.name,
        fileType: "xlsx",
        headers,
        rows: limitedRows,
        totalRows: limitedRows.length,
        previewRows: limitedRows.slice(0, previewCount),
        warnings,
        meta: {
          sheetName: targetSheetName,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "parse_error",
        message: `Excel parsing failed: ${error instanceof Error ? error.message : String(error)}`,
        details: error,
      },
    };
  }
}

// =============================================================================
// JSON PARSING
// =============================================================================

async function parseJSON(
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Expect array of objects
    if (!Array.isArray(parsed)) {
      // Check if it's an object with a data array
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.data)) {
        return parseJSONArray(parsed.data, file.name, options);
      }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.rows)) {
        return parseJSONArray(parsed.rows, file.name, options);
      }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        return parseJSONArray(parsed.items, file.name, options);
      }
      return {
        success: false,
        error: {
          type: "invalid_format",
          message:
            'JSON must be an array of objects, or an object with a "data", "rows", or "items" array',
        },
      };
    }

    return parseJSONArray(parsed, file.name, options);
  } catch (error) {
    return {
      success: false,
      error: {
        type: "parse_error",
        message: `JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`,
        details: error,
      },
    };
  }
}

function parseJSONArray(
  data: unknown[],
  fileName: string,
  options: ParseOptions = {}
): ParseResult {
  const { maxRows = 10000, previewCount = 25 } = options;
  const warnings: string[] = [];

  if (data.length === 0) {
    return {
      success: false,
      error: { type: "empty_file", message: "JSON array is empty" },
    };
  }

  // Validate all items are objects
  const validRows = data.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && !Array.isArray(item)
  );

  if (validRows.length === 0) {
    return {
      success: false,
      error: {
        type: "invalid_format",
        message: "JSON array contains no valid objects",
      },
    };
  }

  if (validRows.length < data.length) {
    warnings.push(
      `${data.length - validRows.length} non-object items were skipped`
    );
  }

  // Extract headers from all rows (union of all keys)
  const headerSet = new Set<string>();
  validRows.forEach((row) => {
    Object.keys(row).forEach((key) => headerSet.add(key.trim()));
  });
  const headers = Array.from(headerSet);

  if (headers.length === 0) {
    return {
      success: false,
      error: { type: "no_headers", message: "JSON objects have no properties" },
    };
  }

  // Enforce max rows
  const limitedRows = validRows.slice(0, maxRows);
  if (validRows.length > maxRows) {
    warnings.push(
      `File has ${validRows.length} rows, only first ${maxRows} will be processed`
    );
  }

  return {
    success: true,
    data: {
      fileName,
      fileType: "json",
      headers,
      rows: limitedRows,
      totalRows: limitedRows.length,
      previewRows: limitedRows.slice(0, previewCount),
      warnings,
      meta: {},
    },
  };
}

// =============================================================================
// MAIN PARSER (Auto-detect)
// =============================================================================

export async function parseFile(
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> {
  // Check file size (50MB max)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      success: false,
      error: {
        type: "too_large",
        message: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed (50MB)`,
      },
    };
  }

  // Detect file type
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // CSV
  if (
    extension === "csv" ||
    mimeType === "text/csv" ||
    mimeType === "text/plain"
  ) {
    return parseCSV(file, options);
  }

  // XLSX
  if (
    extension === "xlsx" ||
    extension === "xls" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return parseXLSX(file, options);
  }

  // JSON
  if (extension === "json" || mimeType === "application/json") {
    return parseJSON(file, options);
  }

  return {
    success: false,
    error: {
      type: "invalid_format",
      message: `Unsupported file type: ${extension || mimeType}. Supported: CSV, XLSX, JSON`,
    },
  };
}

// =============================================================================
// UTILITY: Detect file type from File object
// =============================================================================

export function detectFileType(file: File): "csv" | "xlsx" | "json" | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  if (extension === "csv" || mimeType === "text/csv") return "csv";
  if (
    extension === "xlsx" ||
    extension === "xls" ||
    mimeType.includes("spreadsheet")
  )
    return "xlsx";
  if (extension === "json" || mimeType === "application/json") return "json";

  return null;
}
