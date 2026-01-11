// ============================================================================
// PUBLIC SUBMISSION PAGE: /submit-estimate
// ============================================================================
// Purpose: GC estimate file submission via magic link
// Auth: None (public page, validated by token)
// ============================================================================

import { Suspense } from "react";
import { SubmitEstimateContent } from "./SubmitEstimateContent";

// Loading fallback for Suspense boundary
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-emerald-400">HPS DealEngine</h1>
          <p className="text-slate-400 mt-1">Repair Estimate Submission</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center">
          <div className="w-12 h-12 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading...</p>
        </div>
      </div>
    </div>
  );
}

// Page component with Suspense boundary (required for useSearchParams in Next.js 14)
export default function SubmitEstimatePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubmitEstimateContent />
    </Suspense>
  );
}
