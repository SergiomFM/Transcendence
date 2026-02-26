import { useSyncExternalStore } from "react";
import { isMobileDevice } from "./device-detection";

export type InputMethod = "keyboard" | "gamepad" | "touch";

/**
 * Singleton module that tracks the currently active input method.
 *
 * Only ONE set of event listeners / polling exists regardless of how many
 * components call `useInputMethod`.
 *
 * Switching logic:
 *  - Any keydown or mousedown → "keyboard"
 *  - Gamepad button press or axis movement → "gamepad"
 *  - Mobile device in fullscreen → "touch" (overrides the above)
 */

let currentMethod: InputMethod = "keyboard";
let subscribers = new Set<() => void>();
let refCount = 0;
let cleanupGlobal: (() => void) | null = null;

// Cached once – device type never changes at runtime
let _isMobile: boolean | null = null;
function getIsMobile(): boolean {
  if (_isMobile === null) {
    _isMobile = typeof window !== "undefined" ? isMobileDevice() : false;
  }
  return _isMobile;
}

function notify() {
  subscribers.forEach((cb) => cb());
}

function set(method: InputMethod) {
  if (currentMethod !== method) {
    currentMethod = method;
    notify();
  }
}

// ── Global listeners (started/stopped by ref-counting) ──────────────────

function startListening() {
  if (cleanupGlobal) return; // already active

  // Keyboard / mouse handlers – lightweight, only call set() on actual change
  const onKeyDown = () => set("keyboard");
  const onMouseDown = () => set("keyboard");

  window.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("mousedown", onMouseDown, { passive: true });

  // Gamepad: connect/disconnect events for instant feedback.
  // We still need to poll for button/axis activity because the Gamepad API
  // has no input events, but we poll at a low frequency (4 Hz) since this
  // is only for UI label switching, not gameplay input.
  let gamepadPollId: ReturnType<typeof setInterval> | null = null;

  const checkGamepad = () => {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp?.connected) continue;

      // Check buttons
      for (let j = 0; j < gp.buttons.length; j++) {
        if (gp.buttons[j].pressed || gp.buttons[j].value > 0.5) {
          set("gamepad");
          return;
        }
      }

      // Check axes
      for (let j = 0; j < gp.axes.length; j++) {
        if (Math.abs(gp.axes[j]) > 0.25) {
          set("gamepad");
          return;
        }
      }
    }
  };

  const onGamepadConnected = () => {
    set("gamepad");
    // Start polling only when a gamepad is present
    if (!gamepadPollId) {
      gamepadPollId = setInterval(checkGamepad, 250);
    }
  };

  const onGamepadDisconnected = () => {
    // If no gamepads remain, stop polling and fall back to keyboard
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    let anyConnected = false;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]?.connected) { anyConnected = true; break; }
    }
    if (!anyConnected) {
      if (gamepadPollId) { clearInterval(gamepadPollId); gamepadPollId = null; }
      set("keyboard");
    }
  };

  window.addEventListener("gamepadconnected", onGamepadConnected);
  window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

  // Check if a gamepad is already connected at startup
  if (navigator.getGamepads) {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]?.connected) {
        gamepadPollId = setInterval(checkGamepad, 250);
        break;
      }
    }
  }

  cleanupGlobal = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("gamepadconnected", onGamepadConnected);
    window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
    if (gamepadPollId) clearInterval(gamepadPollId);
    cleanupGlobal = null;
  };
}

function stopListening() {
  cleanupGlobal?.();
}

// ── External-store helpers for useSyncExternalStore ──────────────────────

function subscribe(cb: () => void) {
  // Start global listeners on first subscriber
  if (refCount === 0) startListening();
  refCount++;
  subscribers.add(cb);

  return () => {
    subscribers.delete(cb);
    refCount--;
    if (refCount === 0) stopListening();
  };
}

function getSnapshot(): InputMethod {
  return currentMethod;
}

function getServerSnapshot(): InputMethod {
  return "keyboard";
}

// ── Public hook ──────────────────────────────────────────────────────────

/**
 * React hook that returns the currently active input method.
 *
 * - On mobile devices in fullscreen → always "touch"
 * - Otherwise → "keyboard" or "gamepad" based on last user activity
 *
 * All component instances share a single set of event listeners.
 */
export function useInputMethod(isFullscreen: boolean = false): InputMethod {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Mobile in fullscreen always overrides to touch
  if (getIsMobile() && isFullscreen) return "touch";

  return raw;
}
