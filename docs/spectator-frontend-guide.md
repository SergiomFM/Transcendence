# Spectator Support – Frontend Changes Needed (Tailored to Current Code)

This doc only lists **what the frontend must change** to support spectator mode, with references to the current files:

- `frontend/components/Pong/pongSocket.ts`
- `frontend/components/Pong/pongEvents.ts`
- `frontend/components/Pong/pong.ts`

## ✅ UI/State additions (likely in `pong.ts` / GUI layer)

- Add state flags in `Pong`:
  - `role: "player" | "spectator"`
  - `seatsAvailable: number`
- Show **“Press space to ready”** if `role === "spectator" && seatsAvailable > 0`.
- Provide a **“Become spectator”** action (button or menu).

## ✅ WebSocket handler changes (`pongSocket.ts`)

Update `handleServerMessage` to support new event types:

- `PLAYER_SEAT_AVAILABLE`
- `PLAYER_PROMOTED`
- `PLAYER_SEAT_UNAVAILABLE`

Update `handleGameJoined` to read:

- `message.role`
- `message.playerId`
- `message.seatsAvailable`
  Use these to set `pong.role` and `pong.seatsAvailable`.

Add new handlers:

- `handleSeatAvailable(pong, message)`
- `handlePlayerPromoted(pong, message)`
- `handleSeatUnavailable(pong)`

Add a new send helper:

- `sendBecomeSpectator(pong)` → sends `{ type: "BECOME_SPECTATOR" }`

## ✅ Input gating (`pongEvents.ts`)

Currently `waitingForStartEvents` uses space to call `sendPlayerReady`.
Update the logic:

- If `pong.role === "spectator"`, pressing space should **request promotion** by calling `sendPlayerReady`.
- If `pong.role === "player"`, keep the existing ready logic.

Also gate all in‑game input:

- If `pong.role === "spectator"`, ignore `playerUseSpellEvent`, `playerDashEvent`, and `PlayerDirectionEvent`.

## ✅ UI flow expectations (GUI layer)

Use the existing GUI methods where possible:

- On `PLAYER_SEAT_AVAILABLE` → call `GUI.pressReadyUI()` if spectator.
- On `PLAYER_PROMOTED` → call `GUI.pressReadyUI()` (player now waiting for match start).
- On `PLAYER_DISCONNECTED` → call `GUI.opponentLeftUI()` or `GUI.waitingForPlayersUI()`.

## ✅ Required new message handlers (summary)

Add these cases in `handleServerMessage`:

- `PLAYER_SEAT_AVAILABLE`
- `PLAYER_PROMOTED`
- `PLAYER_SEAT_UNAVAILABLE`

## ⚠️ Edge cases to handle

- Two spectators press space → only one gets `PLAYER_PROMOTED`.
- If seat claim fails → show waiting UI, keep spectator mode.
- Player disconnects mid‑round → go back to waiting UI and open seats.
