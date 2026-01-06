"use client";

import { useMemo } from "react";
import { CheckCircleIcon, AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import type { ColumnMapping, CanonicalField } from "@hps-internal/contracts";
import type { ParsedFile } from "@/lib/import";
import { checkMappingCompleteness } from "@/lib/import";

interface MappingStepProps {
  parsedFile: ParsedFile | null;
  columnMapping: ColumnMapping;
  mappingComplete: boolean;
  onMappingChange: (sourceColumn: string, targetField: string | null) => void;
  onResetMapping: () => void;
  onNext: () => Promise<void>;
  onBack: () => void;
  isProcessing: boolean;
  processingPhase: string | null;
}

const ALL_FIELDS: { field: CanonicalField; label: string; required: boolean }[] =
  [
    { field: "street", label: "Street Address", required: true },
    { field: "city", label: "City", required: true },
    { field: "state", label: "State", required: true },
    { field: "zip", label: "ZIP Code", required: true },
    { field: "client_name", label: "Client Name", required: true },
    { field: "client_phone", label: "Client Phone", required: true },
    { field: "client_email", label: "Client Email", required: true },
    { field: "seller_name", label: "Seller Name", required: false },
    { field: "seller_phone", label: "Seller Phone", required: false },
    { field: "seller_email", label: "Seller Email", required: false },
    { field: "tags", label: "Tags", required: false },
    { field: "notes", label: "Notes", required: false },
    { field: "external_id", label: "External ID", required: false },
  ];

export function MappingStep({
  parsedFile,
  columnMapping,
  mappingComplete,
  onMappingChange,
  onResetMapping,
  onNext,
  onBack,
  isProcessing,
  processingPhase,
}: MappingStepProps) {
  const completeness = useMemo(
    () => checkMappingCompleteness(columnMapping),
    [columnMapping]
  );

  const mappedFields = useMemo(
    () => new Set(Object.values(columnMapping).filter(Boolean)),
    [columnMapping]
  );

  if (!parsedFile) return null;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div
        className={`
        flex items-center gap-3 p-4 rounded-lg
        ${
          mappingComplete
            ? "bg-emerald-500/10 border border-emerald-500/30"
            : "bg-amber-500/10 border border-amber-500/30"
        }
      `}
      >
        {mappingComplete ? (
          <>
            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
            <p className="text-emerald-400">
              All required fields mapped! You can proceed to validation.
            </p>
          </>
        ) : (
          <>
            <AlertCircleIcon className="w-5 h-5 text-amber-400" />
            <p className="text-amber-400">
              {completeness.missingRequired.length} required field(s) need to be
              mapped:{" "}
              <span className="font-medium">
                {completeness.missingRequired
                  .map((f) => ALL_FIELDS.find((af) => af.field === f)?.label)
                  .join(", ")}
              </span>
            </p>
          </>
        )}
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={onResetMapping}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400
                     hover:text-white transition-colors"
        >
          <RefreshCwIcon className="w-4 h-4" />
          Reset to Auto-detected
        </button>
      </div>

      {/* Mapping Table */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-300 w-1/2">
                Your Column
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-300 w-1/2">
                Maps To
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {parsedFile.headers.map((header) => {
              const currentMapping = columnMapping[header];
              const sampleValue = parsedFile.previewRows[0]?.[header];

              return (
                <tr key={header} className="bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">{header}</p>
                      {sampleValue !== undefined && sampleValue !== "" && (
                        <p className="text-slate-500 text-sm truncate max-w-[250px]">
                          e.g., {String(sampleValue)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={currentMapping || ""}
                      onChange={(e) =>
                        onMappingChange(header, e.target.value || null)
                      }
                      className={`
                        w-full px-3 py-2 rounded-lg border transition-colors
                        bg-slate-900 text-white
                        ${
                          currentMapping
                            ? "border-emerald-500/50"
                            : "border-slate-600"
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500/50
                      `}
                    >
                      <option value="">-- Do not import --</option>

                      <optgroup label="Required Fields">
                        {ALL_FIELDS.filter((f) => f.required).map(
                          ({ field, label }) => (
                            <option
                              key={field}
                              value={field}
                              disabled={
                                mappedFields.has(field) &&
                                currentMapping !== field
                              }
                            >
                              {label}{" "}
                              {mappedFields.has(field) &&
                              currentMapping !== field
                                ? "(already mapped)"
                                : ""}
                            </option>
                          )
                        )}
                      </optgroup>

                      <optgroup label="Optional Fields">
                        {ALL_FIELDS.filter((f) => !f.required).map(
                          ({ field, label }) => (
                            <option
                              key={field}
                              value={field}
                              disabled={
                                mappedFields.has(field) &&
                                currentMapping !== field
                              }
                            >
                              {label}{" "}
                              {mappedFields.has(field) &&
                              currentMapping !== field
                                ? "(already mapped)"
                                : ""}
                            </option>
                          )
                        )}
                      </optgroup>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Field Legend */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/30 rounded-lg">
        <div>
          <p className="text-sm font-medium text-white mb-2">Required Fields</p>
          <div className="flex flex-wrap gap-2">
            {ALL_FIELDS.filter((f) => f.required).map(({ field, label }) => (
              <span
                key={field}
                className={`
                  px-2 py-1 text-xs rounded
                  ${
                    mappedFields.has(field)
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  }
                `}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-white mb-2">Optional Fields</p>
          <div className="flex flex-wrap gap-2">
            {ALL_FIELDS.filter((f) => !f.required).map(({ field, label }) => (
              <span
                key={field}
                className={`
                  px-2 py-1 text-xs rounded
                  ${
                    mappedFields.has(field)
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-slate-700 text-slate-500"
                  }
                `}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!mappingComplete || isProcessing}
          className={`
            px-6 py-2 font-medium rounded-lg transition-colors
            ${
              mappingComplete && !isProcessing
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }
          `}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {processingPhase || "Processing..."}
            </span>
          ) : (
            "Validate Data"
          )}
        </button>
      </div>
    </div>
  );
}
