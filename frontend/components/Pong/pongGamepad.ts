import { Pong } from "./pong";
import { Events } from "./pongEvents";

// ─── Constants (easy to tweak) ───────────────────────────────────────────────

/** Analog stick deadzone – inputs below this magnitude are ignored. */
const GAMEPAD_DEADZONE = 0.25;

/** Trigger axis value above which the trigger counts as "pressed". */
const TRIGGER_THRESHOLD = 0.5;

// Standard Gamepad button indices
// https://w3c.github.io/gamepad/#remapping
const BTN_A = 0; // A / Cross          → Ready (space)
const BTN_B = 1; // B / Circle         → Action (c)
const BTN_LT = 6; // LT / L2           → Counter spell
const BTN_RT = 7; // RT / R2           → Offensive spell
const BTN_DPAD_UP = 12;
const BTN_DPAD_DOWN = 13;
const BTN_DPAD_LEFT = 14;
const BTN_DPAD_RIGHT = 15;

// Standard Gamepad axis indices
const AXIS_LEFT_X = 0;
const AXIS_LEFT_Y = 1;

// Player key sets (must match pongEvents.ts)
const player1Keys = ["w", "a", "s", "d", "q", "e"];
const player2Keys = [
  "arrowup",
  "arrowleft",
  "arrowdown",
  "arrowright",
  "k",
  "l",
];

// Key indices within a player key set
const KEY_UP = 0;
const KEY_LEFT = 1;
const KEY_DOWN = 2;
const KEY_RIGHT = 3;
const KEY_COUNTER = 4;
const KEY_OFFENSIVE = 5;

// ─── Types ───────────────────────────────────────────────────────────────────

interface GamepadState {
  buttons: boolean[];
  axisX: number; // digitized: -1, 0, or 1
  axisY: number; // digitized: -1, 0, or 1
}

// ─── Gamepad Manager ─────────────────────────────────────────────────────────

export namespace GamepadManager {
  /**
   * Maps a gamepad index → player number (1 or 2).
   * Used only in local mode (first-press assignment).
   */
  const gamepadAssignments = new Map<number, number>();

  /** Previous frame state per gamepad, keyed by gamepad index. */
  const previousStates = new Map<number, GamepadState>();

  /** Whether we're currently polling. */
  let active = false;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function digitizeAxis(value: number): number {
    if (value < -GAMEPAD_DEADZONE) return -1;
    if (value > GAMEPAD_DEADZONE) return 1;
    return 0;
  }

  function isButtonPressed(button: GamepadButton): boolean {
    return button.pressed || button.value > TRIGGER_THRESHOLD;
  }

  function getKeysForPlayer(playerNum: number): string[] {
    return playerNum === 1 ? player1Keys : player2Keys;
  }

  function emptyState(buttonCount: number): GamepadState {
    return {
      buttons: new Array(buttonCount).fill(false),
      axisX: 0,
      axisY: 0,
    };
  }

  // ── Assignment (local mode, first-press) ─────────────────────────────────

  function tryAssignGamepad(
    gamepadIndex: number,
    pong: Pong,
  ): number | null {
    if (gamepadAssignments.has(gamepadIndex)) {
      return gamepadAssignments.get(gamepadIndex)!;
    }

    // Determine which player slots are taken
    const assignedPlayers = new Set(gamepadAssignments.values());
    let slot: number | null = null;
    if (!assignedPlayers.has(1)) slot = 1;
    else if (!assignedPlayers.has(2)) slot = 2;

    if (slot !== null) {
      gamepadAssignments.set(gamepadIndex, slot);
      console.log(`🎮 Gamepad ${gamepadIndex} assigned to Player ${slot}`);
    }

    return slot;
  }

  function hasAnyButtonPressed(gamepad: Gamepad): boolean {
    for (let i = 0; i < gamepad.buttons.length; i++) {
      if (isButtonPressed(gamepad.buttons[i])) return true;
    }
    return false;
  }

  // ── Core processing ──────────────────────────────────────────────────────

  function processGamepad(
    gamepad: Gamepad,
    pong: Pong,
    keys: string[],
  ): void {
    const prev =
      previousStates.get(gamepad.index) ?? emptyState(gamepad.buttons.length);

    const curr: GamepadState = {
      buttons: gamepad.buttons.map((b) => isButtonPressed(b)),
      axisX: digitizeAxis(gamepad.axes[AXIS_LEFT_X] ?? 0),
      axisY: digitizeAxis(gamepad.axes[AXIS_LEFT_Y] ?? 0),
    };

    // ── Analog stick X → left/right movement ──

    if (curr.axisX !== prev.axisX) {
      // Release old direction
      if (prev.axisX === -1) Events.simulateKeyUp(pong, keys[KEY_LEFT]);
      if (prev.axisX === 1) Events.simulateKeyUp(pong, keys[KEY_RIGHT]);

      // Press new direction
      if (curr.axisX === -1) Events.simulateKeyDown(pong, keys[KEY_LEFT]);
      if (curr.axisX === 1) Events.simulateKeyDown(pong, keys[KEY_RIGHT]);
    }

    // ── Analog stick Y → up/down movement ──

    if (curr.axisY !== prev.axisY) {
      // Release old direction
      if (prev.axisY === -1) Events.simulateKeyUp(pong, keys[KEY_UP]);
      if (prev.axisY === 1) Events.simulateKeyUp(pong, keys[KEY_DOWN]);

      // Press new direction
      if (curr.axisY === -1) Events.simulateKeyDown(pong, keys[KEY_UP]);
      if (curr.axisY === 1) Events.simulateKeyDown(pong, keys[KEY_DOWN]);
    }

    // ── D-pad → movement (same keys as analog stick) ──

    processDpadButton(gamepad, prev, curr, BTN_DPAD_UP, keys[KEY_UP], pong);
    processDpadButton(gamepad, prev, curr, BTN_DPAD_DOWN, keys[KEY_DOWN], pong);
    processDpadButton(gamepad, prev, curr, BTN_DPAD_LEFT, keys[KEY_LEFT], pong);
    processDpadButton(
      gamepad,
      prev,
      curr,
      BTN_DPAD_RIGHT,
      keys[KEY_RIGHT],
      pong,
    );

    // ── Face buttons ──

    processButton(prev, curr, BTN_A, " ", pong); // Ready
    processButton(prev, curr, BTN_B, "c", pong); // Action

    // ── Triggers → spells ──

    processButton(prev, curr, BTN_LT, keys[KEY_COUNTER], pong);
    processButton(prev, curr, BTN_RT, keys[KEY_OFFENSIVE], pong);

    // Save state for next frame
    previousStates.set(gamepad.index, curr);
  }

  function processButton(
    prev: GamepadState,
    curr: GamepadState,
    btnIndex: number,
    key: string,
    pong: Pong,
  ): void {
    const wasPressed = prev.buttons[btnIndex] ?? false;
    const isNowPressed = curr.buttons[btnIndex] ?? false;

    if (!wasPressed && isNowPressed) {
      Events.simulateKeyDown(pong, key);
    } else if (wasPressed && !isNowPressed) {
      Events.simulateKeyUp(pong, key);
    }
  }

  function processDpadButton(
    gamepad: Gamepad,
    prev: GamepadState,
    curr: GamepadState,
    btnIndex: number,
    key: string,
    pong: Pong,
  ): void {
    // Only fire D-pad if analog stick is neutral to avoid double input
    if (
      curr.axisX !== 0 &&
      (btnIndex === BTN_DPAD_LEFT || btnIndex === BTN_DPAD_RIGHT)
    )
      return;
    if (
      curr.axisY !== 0 &&
      (btnIndex === BTN_DPAD_UP || btnIndex === BTN_DPAD_DOWN)
    )
      return;

    processButton(prev, curr, btnIndex, key, pong);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Poll all connected gamepads and generate key events.
   * Call this once per frame from the render loop.
   */
  export function pollGamepads(pong: Pong): void {
    if (!active) return;

    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad || !gamepad.connected) continue;

      if (pong.online) {
        // Online: all gamepads control Player 1 (the local player)
        processGamepad(gamepad, pong, player1Keys);
      } else {
        // Local: first-press assignment
        if (!gamepadAssignments.has(gamepad.index)) {
          // Only assign when a button is actually pressed
          if (!hasAnyButtonPressed(gamepad)) continue;
          const slot = tryAssignGamepad(gamepad.index, pong);
          if (slot === null) continue; // Both slots taken
        }

        const playerNum = gamepadAssignments.get(gamepad.index)!;
        const keys = getKeysForPlayer(playerNum);
        processGamepad(gamepad, pong, keys);
      }
    }
  }

  /** Start polling. Listen for gamepad connect/disconnect. */
  export function startPolling(): void {
    active = true;

    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
  }

  /** Reset all assignments (e.g. on mode change or new game). */
  export function resetAssignments(): void {
    gamepadAssignments.clear();
    previousStates.clear();
  }

  /** Stop polling and clean up. */
  export function dispose(): void {
    active = false;
    gamepadAssignments.clear();
    previousStates.clear();

    window.removeEventListener("gamepadconnected", onGamepadConnected);
    window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
  }

  // ── Event listeners ──────────────────────────────────────────────────────

  function onGamepadConnected(e: GamepadEvent): void {
    console.log(
      `🎮 Gamepad connected: "${e.gamepad.id}" (index ${e.gamepad.index})`,
    );
  }

  function onGamepadDisconnected(e: GamepadEvent): void {
    console.log(
      `🎮 Gamepad disconnected: "${e.gamepad.id}" (index ${e.gamepad.index})`,
    );

    // Clean up assignment and state for the disconnected gamepad
    gamepadAssignments.delete(e.gamepad.index);
    previousStates.delete(e.gamepad.index);
  }
}
