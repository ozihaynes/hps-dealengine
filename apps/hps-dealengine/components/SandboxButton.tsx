'use client';
import Link from 'next/link';

export default function SandboxButton() {
  return (
    <Link
      href="/sandbox"
      className="fixed top-4 right-4 z-50 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm"
      aria-label="Open Business Logic Sandbox"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 1 1 6 0v3H9z"
          fill="currentColor"
        />
      </svg>
      <span className="hidden sm:inline">Business Logic Sandbox</span>
    </Link>
  );
}
