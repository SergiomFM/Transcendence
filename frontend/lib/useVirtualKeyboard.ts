"use client";

import { useSyncExternalStore } from "react";

/**
 * Detect whether the mobile virtual keyboard is currently open.
 *
 * Uses the `visualViewport` API — when the keyboard appears, the visual
 * viewport height shrinks relative to `window.innerHeight`. A delta larger
 * than `THRESHOLD` (in CSS px) means the keyboard is showing.
 *
 * Falls back to `false` on desktop or browsers without `visualViewport`.
 */

const THRESHOLD = 150; // px — keyboards are at least ~150px tall

let _isOpen = false;
const _listeners = new Set<() => void>();

function notify() {
  for (const fn of _listeners) fn();
}

function update() {
  if (typeof window === "undefined" || !window.visualViewport) return;
  const next = window.innerHeight - window.visualViewport.height > THRESHOLD;
  if (next !== _isOpen) {
    _isOpen = next;
    notify();
  }
}

// Attach viewport listeners once (module-level singleton like useInputMethod)
if (typeof window !== "undefined" && window.visualViewport) {
  window.visualViewport.addEventListener("resize", update);
  window.visualViewport.addEventListener("scroll", update);
}

function subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
}

function getSnapshot() {
  return _isOpen;
}

function getServerSnapshot() {
  return false;
}

export function useVirtualKeyboard(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
