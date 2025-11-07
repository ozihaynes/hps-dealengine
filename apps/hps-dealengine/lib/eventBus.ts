'use client';
export function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
export function on(name: string, handler: (e: CustomEvent) => void) {
  const h = (e: Event) => handler(e as CustomEvent);
  window.addEventListener(name, h as any);
  return () => window.removeEventListener(name, h as any);
}
