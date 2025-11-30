"use client";
import type { AnalyzeResult } from "@hps-internal/contracts";

type Listener = (r: AnalyzeResult) => void;

let last: AnalyzeResult | null = null;
const listeners = new Set<Listener>();

export function publishAnalyzeResult(r: AnalyzeResult) {
  last = r;
  for (const fn of listeners) fn(r);
}

export function subscribeAnalyzeResult(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLastAnalyzeResult() {
  return last;
}
