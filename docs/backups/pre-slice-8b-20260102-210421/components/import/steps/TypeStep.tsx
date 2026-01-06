"use client";

import {
  FileSpreadsheetIcon,
  FileJsonIcon,
  FileTextIcon,
  CheckCircleIcon,
} from "lucide-react";
import type { FileType } from "@hps-internal/contracts";
import type { ParsedFile } from "@/lib/import";

interface TypeStepProps {
  file: File | null;
  fileType: FileType | null;
  parsedFile: ParsedFile | null;
  onFileTypeChange: (type: FileType) => void;
  onNext: () => void;
  onBack: () => void;
}

const FILE_TYPE_INFO: Record<
  FileType,
  { icon: typeof FileTextIcon; label: string; description: string }
> = {
  csv: {
    icon: FileTextIcon,
    label: "CSV",
    description: "Comma-separated values file",
  },
  xlsx: {
    icon: FileSpreadsheetIcon,
    label: "Excel",
    description: "Microsoft Excel spreadsheet",
  },
  json: {
    icon: FileJsonIcon,
    label: "JSON",
    description: "JavaScript Object Notation file",
  },
};

export function TypeStep({
  file,
  fileType,
  parsedFile,
  onFileTypeChange,
  onNext,
  onBack,
}: TypeStepProps) {
  if (!file || !parsedFile || !fileType) {
    return null;
  }

  const typeInfo = FILE_TYPE_INFO[fileType];
  const Icon = typeInfo.icon;

  return (
    <div className="space-y-6">
      {/* Detected Type Card */}
      <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Icon className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-medium text-white">{file.name}</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                {typeInfo.label}
              </span>
            </div>
            <p className="text-slate-400 text-sm">{typeInfo.description}</p>
          </div>
          <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      {/* File Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
          <p className="text-2xl font-semibold text-white">
            {parsedFile.totalRows}
          </p>
          <p className="text-slate-400 text-sm">Total Rows</p>
        </div>
        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
          <p className="text-2xl font-semibold text-white">
            {parsedFile.headers.length}
          </p>
          <p className="text-slate-400 text-sm">Columns</p>
        </div>
        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
          <p className="text-2xl font-semibold text-white">
            {parsedFile.previewRows.length}
          </p>
          <p className="text-slate-400 text-sm">Preview Rows</p>
        </div>
        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
          <p className="text-2xl font-semibold text-white">
            {parsedFile.warnings.length}
          </p>
          <p className="text-slate-400 text-sm">Warnings</p>
        </div>
      </div>

      {/* Warnings */}
      {parsedFile.warnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 font-medium mb-2">Warnings</p>
          <ul className="space-y-1">
            {parsedFile.warnings.map((warning, i) => (
              <li key={i} className="text-amber-300/80 text-sm">
                - {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      <div>
        <h3 className="text-white font-medium mb-3">Data Preview</h3>
        <div className="overflow-x-auto border border-slate-700 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800">
                {parsedFile.headers.slice(0, 6).map((header, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-slate-300 font-medium"
                  >
                    {header}
                  </th>
                ))}
                {parsedFile.headers.length > 6 && (
                  <th className="px-4 py-3 text-left text-slate-500">
                    +{parsedFile.headers.length - 6} more
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {parsedFile.previewRows.slice(0, 5).map((row, i) => (
                <tr key={i} className="bg-slate-800/30">
                  {parsedFile.headers.slice(0, 6).map((header, j) => (
                    <td
                      key={j}
                      className="px-4 py-3 text-slate-400 truncate max-w-[200px]"
                    >
                      {String(row[header] ?? "")}
                    </td>
                  ))}
                  {parsedFile.headers.length > 6 && (
                    <td className="px-4 py-3 text-slate-600">...</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsedFile.previewRows.length > 5 && (
          <p className="text-slate-500 text-sm mt-2">
            Showing 5 of {parsedFile.previewRows.length} preview rows
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
        >
          Continue to Mapping
        </button>
      </div>
    </div>
  );
}
