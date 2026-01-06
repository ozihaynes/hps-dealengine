"use client";

import { Loader2Icon } from "lucide-react";

interface LoadingOverlayProps {
  message?: string;
  submessage?: string;
}

export function LoadingOverlay({
  message = "Loading...",
  submessage,
}: LoadingOverlayProps) {
  return (
    <div
      className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-10
                    flex flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2Icon className="w-10 h-10 text-blue-400 animate-spin mb-4" />
      <p className="text-white font-medium">{message}</p>
      {submessage && (
        <p className="text-slate-400 text-sm mt-1">{submessage}</p>
      )}
    </div>
  );
}
