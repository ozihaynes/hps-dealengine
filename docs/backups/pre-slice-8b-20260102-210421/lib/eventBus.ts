"use client";
type Handler<T = any> = (payload: T) => void;
const channels = new Map<string, Set<Handler>>();

export function on<T = any>(event: string, handler: Handler<T>) {
  const set = channels.get(event) ?? new Set<Handler>();
  set.add(handler as Handler);
  channels.set(event, set);
  return () => set.delete(handler as Handler);
}

export function emit<T = any>(event: string, payload?: T) {
  const set = channels.get(event);
  if (!set) return;
  set.forEach((fn) => fn(payload));
}
