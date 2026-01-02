"use client";

import React, { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export type UploadFile = {
  id: string;
  file: File;
  filename: string;
  size: number;
  mimeType: string;
  status: "pending" | "uploading" | "scanning" | "complete" | "error";
  progress: number;
  error?: string;
  scanStatus?: "PENDING" | "CLEAN" | "INFECTED" | "SCAN_FAILED";
};

type FileUploadZoneProps = {
  token: string;
  linkId: string;
  uploadKey?: string;
  label: string;
  accept?: string[];
  maxFiles?: number;
  files: UploadFile[];
  onFilesChange: (files: UploadFile[]) => void;
  onUploadStart: (file: File) => Promise<{
    fileId: string;
    uploadUrl: string;
    uploadToken: string;
  }>;
  onUploadComplete: (fileId: string) => Promise<{
    scanStatus: string;
    storageState: string;
  }>;
  disabled?: boolean;
};

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MIME_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileUploadZone({
  label,
  accept,
  maxFiles = 10,
  files,
  onFilesChange,
  onUploadStart,
  onUploadComplete,
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = accept ?? ALLOWED_MIME_TYPES;

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        const allowedLabels = allowedTypes.map((t) => MIME_TYPE_LABELS[t] ?? t).join(", ");
        return `Invalid file type. Allowed: ${allowedLabels}`;
      }
      if (file.size > MAX_FILE_SIZE) {
        return `File too large. Maximum size: ${formatBytes(MAX_FILE_SIZE)}`;
      }
      return null;
    },
    [allowedTypes],
  );

  const startUpload = useCallback(
    async (fileToUpload: UploadFile) => {
      try {
        // Update status to uploading
        onFilesChange(
          files.map((f) =>
            f.id === fileToUpload.id ? { ...f, status: "uploading" as const, progress: 0 } : f,
          ),
        );

        // Get signed upload URL
        const { fileId, uploadUrl } = await onUploadStart(fileToUpload.file);

        // Update with real file ID
        onFilesChange(
          files.map((f) =>
            f.id === fileToUpload.id ? { ...f, id: fileId, progress: 10 } : f,
          ),
        );

        // Upload file to storage
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": fileToUpload.mimeType,
            "x-upsert": "true",
          },
          body: fileToUpload.file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        // Update progress
        onFilesChange(
          files.map((f) =>
            f.id === fileId || f.id === fileToUpload.id
              ? { ...f, id: fileId, status: "scanning" as const, progress: 80 }
              : f,
          ),
        );

        // Notify backend upload is complete, trigger scan
        const scanResult = await onUploadComplete(fileId);

        // Update with final status
        onFilesChange(
          files.map((f) =>
            f.id === fileId || f.id === fileToUpload.id
              ? {
                  ...f,
                  id: fileId,
                  status: "complete" as const,
                  progress: 100,
                  scanStatus: scanResult.scanStatus as UploadFile["scanStatus"],
                }
              : f,
          ),
        );

        // Show success toast
        toast.success(`Uploaded: ${fileToUpload.filename}`, {
          description: "Document ready for submission",
          duration: 4000,
        });
      } catch (err) {
        console.error("Upload error:", err);
        const message = err instanceof Error ? err.message : "Upload failed";
        onFilesChange(
          files.map((f) =>
            f.id === fileToUpload.id ? { ...f, status: "error" as const, error: message } : f,
          ),
        );

        // Show error toast
        toast.error(`Upload failed: ${fileToUpload.filename}`, {
          description: message,
          duration: 5000,
        });
      }
    },
    [files, onFilesChange, onUploadStart, onUploadComplete],
  );

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      if (disabled) return;

      const newFiles: UploadFile[] = [];
      const remainingSlots = maxFiles - files.length;

      for (let i = 0; i < Math.min(fileList.length, remainingSlots); i++) {
        const file = fileList[i];
        const error = validateFile(file);

        const uploadFileObj: UploadFile = {
          id: crypto.randomUUID(),
          file,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          status: error ? "error" : "pending",
          progress: 0,
          error: error ?? undefined,
        };

        newFiles.push(uploadFileObj);
      }

      if (newFiles.length > 0) {
        const updatedFiles = [...files, ...newFiles];
        onFilesChange(updatedFiles);

        // Start uploading valid files
        for (const newFile of newFiles) {
          if (newFile.status === "pending") {
            // Use setTimeout to allow state to update before starting upload
            setTimeout(() => {
              void startUpload(newFile);
            }, 100);
          }
        }
      }

      // Show error if files were skipped due to limit
      if (fileList.length > remainingSlots) {
        console.warn(`Only ${remainingSlots} files added. Maximum ${maxFiles} files allowed.`);
      }
    },
    [disabled, files, maxFiles, onFilesChange, validateFile, startUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        void handleFiles(e.target.files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFiles],
  );

  const handleRemove = useCallback(
    (fileId: string) => {
      onFilesChange(files.filter((f) => f.id !== fileId));
    },
    [files, onFilesChange],
  );

  const canAddMore = files.length < maxFiles;
  const acceptString = allowedTypes.join(",");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[color:var(--text-primary)]">
        {label}
      </label>

      {/* Drop zone */}
      {canAddMore && (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors
            ${isDragging
              ? "border-[color:var(--accent-blue)] bg-[color:var(--accent-blue)]/10"
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
            }
            ${disabled ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            multiple
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
          <svg
            className="mb-2 h-8 w-8 text-[color:var(--text-secondary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-[color:var(--text-secondary)]">
            <span className="font-medium text-[color:var(--accent-blue)]">Click to upload</span> or
            drag and drop
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
            {allowedTypes.map((t) => MIME_TYPE_LABELS[t] ?? t).join(", ")} (max{" "}
            {formatBytes(MAX_FILE_SIZE)})
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
            {files.length}/{maxFiles} files
          </p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              onRemove={() => handleRemove(file.id)}
              onReplace={() => {
                handleRemove(file.id);
                // Small delay to allow state to update before opening picker
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  onRemove,
  onReplace,
  disabled,
}: {
  file: UploadFile;
  onRemove: () => void;
  onReplace: () => void;
  disabled: boolean;
}) {
  const isUploading = file.status === "uploading" || file.status === "scanning";
  const isComplete = file.status === "complete" && file.scanStatus === "CLEAN";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      {/* File icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <FileIcon mimeType={file.mimeType} />
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
          {file.filename}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[color:var(--text-secondary)]">
            {formatBytes(file.size)}
          </span>
          {file.status === "uploading" && (
            <span className="text-xs text-[color:var(--accent-blue)]">
              Uploading... {file.progress}%
            </span>
          )}
          {file.status === "scanning" && (
            <span className="text-xs text-amber-400">Scanning...</span>
          )}
          {file.status === "complete" && file.scanStatus === "CLEAN" && (
            <span className="text-xs text-emerald-400">Ready</span>
          )}
          {file.status === "complete" && file.scanStatus === "INFECTED" && (
            <span className="text-xs text-red-400">Infected - will be removed</span>
          )}
          {file.status === "error" && (
            <span className="text-xs text-red-400">{file.error ?? "Upload failed"}</span>
          )}
        </div>
        {/* Progress bar */}
        {isUploading && (
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[color:var(--accent-blue)] transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status icon and action buttons */}
      <div className="shrink-0 flex items-center gap-2">
        {/* Spinner during upload/scanning */}
        {isUploading && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--accent-blue)] border-t-transparent" />
        )}
        {/* Success checkmark for clean files */}
        {isComplete && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
            <svg
              className="h-4 w-4 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Action buttons - Replace and Remove */}
        {!isUploading && (
          <div className="flex items-center gap-1">
            {/* Replace button */}
            <button
              type="button"
              onClick={onReplace}
              disabled={disabled}
              title="Replace file"
              className="px-2 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors disabled:opacity-50"
            >
              Replace
            </button>
            {/* Remove button */}
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              title="Remove file"
              className="px-2 py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        )}

        {/* Cancel button during upload */}
        {isUploading && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            title="Cancel upload"
            className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--text-secondary)] hover:bg-white/10 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) {
    return (
      <svg
        className="h-5 w-5 text-[color:var(--text-secondary)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <svg
        className="h-5 w-5 text-[color:var(--text-secondary)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-5 w-5 text-[color:var(--text-secondary)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

export default FileUploadZone;
