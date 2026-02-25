# Implementation Details

This document describes the technical implementation of each service in the Transcendence project. It is organized by service, each of which was owned by a different team member.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Users Service](#users-service) -- Sergio (database, profiles) & Lourenco (auth, 2FA, OAuth)
3. [Chat Service](#chat-service) -- Sergio
4. [Game Service](#game-service) -- Tiago (3D, customization) & Paulo (sockets, remote play, spectator)
5. [Frontend](#frontend) -- Afonso (framework, components) & Tiago (game/3D)
6. [Nginx Proxy & Infrastructure](#nginx-proxy--infrastructure) -- Sergio & Paulo

---

## Architecture Overview

The project is a **microservices-based web application** running entirely on the **Bun** runtime. All services sit behind an **Nginx reverse proxy** that exposes a single entry point on port 3000.

```
                         Port 3000
                            |
                     +------v------+
                     |    NGINX    |
                     +------+------+
                            |
           +--------+-------+-------+--------+
           |        |               |        |
     /api/users/  /api/game/   /api/chat/    /
                  /ws/pong     (SSE)       (catch-all)
                  /ws/lobby
           |        |               |        |
      +----v---+ +--v-----+ +------v--+ +---v-------+
      | Users  | |  Game  | |  Chat   | | Frontend  |
      | :3000  | | :3000  | |  :3000  | |  :3000    |
      +--------+ +--------+ +---------+ +-----------+
```

**Key technology choices:**

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Runtime            | Bun (all services)                                 |
| Backend framework  | Fastify 5                                          |
| Frontend framework | Next.js 16 + React 19                              |
| 3D engine          | Babylon.js                                         |
| UI components      | shadcn/ui (Radix) + Tailwind CSS                   |
| Databases          | SQLite (Users: raw `bun:sqlite`, Chat: Prisma ORM) |
| Real-time (game)   | WebSocket (`@fastify/websocket`)                   |
| Real-time (chat)   | Server-Sent Events (SSE)                           |
| Auth               | Google OAuth 2.0, local login (argon2id), TOTP 2FA |
| i18n               | `next-intl` -- 5 locales (en, pt, cv, hi, he)      |
| Containerization   | Docker Compose with `dev` and `prod` profiles      |

Inter-service communication uses Docker DNS hostnames (e.g., `http://users-dev:3000`). There is no API gateway -- Nginx handles path-based routing only.

---

## Users Service

**Responsible:** Sergio (database schema, player profiles, match history, friends) & Lourenco (authentication, 2FA, OAuth, password management)

**Stack:** Fastify 5 + Bun + SQLite (via `bun:sqlite`) + Passport.js

### Database (`plugins/db.js`)

The database is a single SQLite file at `/app/database/app.db` with WAL mode enabled for concurrent read/write performance. The schema is defined imperatively (not via migrations) and contains 6 tables:

| Table             | Purpose                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `users`           | Core user accounts: id, username, email, alias, avatar (base64), google_id, password_hash, 2FA fields, role, is_active |
| `recovery_codes`  | Hashed 2FA recovery codes, linked to users via FK                                                                      |
| `player_profiles` | Display name, bio, avatar_url -- one-to-one with users                                                                 |
| `match_history`   | Game results: player1_id, player2_id (nullable for guests), scores, winner_id, timestamp                               |
| `friend_requests` | Friend request state (pending/accepted/rejected)                                                                       |
| `friends`         | Bidirectional friendship links (composite PK: user_id + friend_id)                                                     |

All data access goes through **pre-compiled prepared statements** decorated onto the Fastify instance as `fastify.users`, `fastify.profiles`, `fastify.matches`, and `fastify.friends`. There is no ORM -- all queries are raw SQL.

The database includes migration logic to handle schema evolution: it adds columns (`avatar`, `google_avatar`) if missing, and recreates `match_history` if the old schema had `NOT NULL` constraints on player IDs (to support guest players).

### Session & Authentication (`plugins/auth.js`)

Sessions use `@fastify/secure-session` with an encrypted cookie (symmetric key from `/app/database/secret-key`). Sessions are **stateless on the server** -- all session data lives in the encrypted cookie on the client.

Passport.js is configured with two strategies:

1. **Google OAuth 2.0** (`passport-google-oauth20`):
   - Configured via `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` env vars.
   - On callback: checks for existing user by `google_id`, then by `email` (account linking), or creates a new user.
   - Downloads the Google profile photo, converts it to a base64 data URL, and stores it directly in the database.
   - Blocks disabled accounts (`is_active = 0`).

2. **Local username/password** (implemented in routes, not as a Passport strategy):
   - Passwords are hashed with **argon2id** via Bun's native `Bun.password.hash()` / `Bun.password.verify()`.
   - Login accepts either email or username as the `identifier` field.

### Routes

#### Google OAuth (`routes/google-auth.js`)

| Method | Path                    | Description                                                                                                                                                |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/auth/google`          | Initiates Google OAuth flow (redirects to Google consent screen)                                                                                           |
| `GET`  | `/auth/google/callback` | OAuth callback. If user has 2FA enabled, sets `session.pending2FA` and redirects to `/auth?2fa=true`. Otherwise completes login and redirects to frontend. |
| `GET`  | `/dashboard`            | Returns authenticated user info (id, email, username, alias, role, avatar, google_id, 2FA status). Used by the frontend to check session validity.         |

#### Local Auth (`routes/local-user-auth.js`)

| Method | Path             | Description                                                                                                                                     |
| ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/auth/register` | Registers a new user. Validates username/email/password via regex. Hashes password. Creates user + player profile. Registers with chat service. |
| `POST` | `/auth/login`    | Authenticates by email or username. Verifies password. If 2FA enabled, returns `{ twoFactorRequired: true }` and pauses at session level.       |

Validation rules (from `utilities/validation_regex.js`):

- **Username:** 3-20 chars, alphanumeric + underscore
- **Password:** min 8 chars, requires uppercase, lowercase, digit, and special char (`@$!%*?&`)
- **Email:** standard format via regex

#### Two-Factor Authentication (`routes/2fa.js`)

| Method | Path                | Description                                                                                                                          |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `POST` | `/auth/2fa/setup`   | Generates a TOTP secret via `speakeasy`, stores as temp secret, returns QR code (data URL)                                           |
| `POST` | `/auth/2fa/confirm` | Verifies a TOTP token, promotes temp secret to permanent, generates 8 recovery codes (hashed with argon2id), returns plaintext codes |
| `POST` | `/auth/2fa/verify`  | Verifies 2FA during login (TOTP or recovery code). Completes the login flow.                                                         |
| `POST` | `/auth/2fa/disable` | Disables 2FA. Requires valid token or recovery code for confirmation.                                                                |
| `POST` | `/auth/verify_auth` | Returns the authenticated user's identity. Used by the chat service to validate sessions.                                            |

The 2FA implementation uses `speakeasy` for TOTP with a verification window of 1 (allowing ~30 seconds of clock drift). Recovery codes are 10-character random hex strings, individually hashed with argon2id. Verification iterates all stored codes because argon2id uses random salts, making direct lookup impossible.

#### Friends (`routes/friends.js`)

| Method   | Path                           | Description                                                                                                  |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `POST`   | `/friends/request`             | Sends a friend request. Checks for self-add, duplicate requests in both directions, and existing friendship. |
| `POST`   | `/friends/accept`              | Accepts a request. Creates **bidirectional** friendship rows (A->B and B->A).                                |
| `POST`   | `/friends/reject`              | Rejects and deletes a request.                                                                               |
| `GET`    | `/friends/requests`            | Lists pending incoming requests with sender profile data.                                                    |
| `GET`    | `/friends/requests/sent`       | Lists pending sent requests.                                                                                 |
| `DELETE` | `/friends/request/:receiverId` | Cancels a sent request.                                                                                      |
| `GET`    | `/friends`                     | Lists all friends with profile and avatar data.                                                              |
| `DELETE` | `/friends/:friendId`           | Removes a friendship (deletes both direction rows).                                                          |

#### Player Profiles (`routes/player-profie.js`)

| Method | Path                       | Description                                                                              |
| ------ | -------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`  | `/me/profile`              | Own profile with live-computed win/loss stats from `match_history`.                      |
| `GET`  | `/player/:userId`          | Any player's profile with win/loss stats (public).                                       |
| `POST` | `/me/profile/display-name` | Update display name.                                                                     |
| `POST` | `/me/profile/bio`          | Update bio.                                                                              |
| `GET`  | `/players/search?q=`       | Search players by display name (case-insensitive LIKE, up to 20 results, excludes self). |

Win/loss stats are computed live on each request -- there is no cached aggregate.

#### Avatar (`routes/avatar.js`)

| Method   | Path         | Description                                                                 |
| -------- | ------------ | --------------------------------------------------------------------------- |
| `POST`   | `/me/avatar` | Upload avatar as a base64 data URL (max ~1.5MB). Stored directly in SQLite. |
| `DELETE` | `/me/avatar` | Delete custom avatar. Google users fall back to their Google profile photo. |

#### Matches (`routes/matches.js`)

| Method | Path                      | Description                                                                                                                                           |
| ------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/matches`                | Record a match result. Called by the game server. Player IDs can be null (guest players). **No auth guard** -- designed for service-to-service calls. |
| `GET`  | `/me/matches`             | Own match history (last 50, with player profile data via JOINs).                                                                                      |
| `GET`  | `/player/:userId/matches` | Any player's match history (public).                                                                                                                  |

#### Other Routes

| Method | Path           | Description                                                                        |
| ------ | -------------- | ---------------------------------------------------------------------------------- |
| `POST` | `/me/password` | Change password (local users only, blocked for Google OAuth users).                |
| `GET`  | `/auth/logout` | Destroys session, clears cookies, clears pending 2FA state, redirects to `/login`. |

### Cross-Service Communication

- **Users -> Chat:** On every successful login/registration, calls `POST CHAT_BACKEND_URL/register` with the username. This is fire-and-forget (failure never blocks login).
- **Game -> Users:** The `POST /matches` endpoint receives match results from the game server (no authentication on this endpoint).
- **Chat -> Users:** The chat service calls `POST /auth/verify_auth` to validate session cookies.

---

## Chat Service

**Responsible:** Sergio

**Stack:** Fastify 5 + Bun + TypeScript + Prisma ORM + SQLite

### Database (Prisma Schema)

Uses Prisma ORM with SQLite (`file:./data/dev.db`). Three models:

| Model        | Fields                                                        | Purpose                          |
| ------------ | ------------------------------------------------------------- | -------------------------------- |
| `User`       | id, username (unique), timestamps                             | Chat participant record          |
| `Message`    | id, content, senderId, receiverId, read (bool), timestamps    | Direct message between two users |
| `GameInvite` | id, roomId, senderId, receiverId, accepted (bool), timestamps | Game room invitation             |

### Authentication (`utils/authVerify.ts`)

The chat service has **no session management** of its own. It delegates all authentication to the users service by forwarding the incoming `Cookie` header to `POST USERS_SERVICE_URL/auth/verify_auth`. The response provides `username`, `alias` (fallback for Google OAuth users), `id`, and `email`.

### REST Endpoints (`routes/messages.ts`)

| Method | Path                            | Auth | Description                                                                                            |
| ------ | ------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ |
| `POST` | `/sendMessage`                  | Yes  | Persists a message, then pushes it to both sender (`self: true`) and receiver (`self: false`) via SSE. |
| `GET`  | `/messages?user=&otherUser=&n=` | Yes  | Fetches conversation history (default 50, max 200). Identity-checked.                                  |
| `POST` | `/register`                     | Yes  | Ensures a chat user record exists (upsert).                                                            |
| `POST` | `/markRead`                     | No   | Marks all messages from sender to receiver as read.                                                    |
| `POST` | `/sendGameInvite`               | Yes  | Persists a `GameInvite`, pushes to both parties via SSE. Returns `{ delivered: boolean }`.             |
| `POST` | `/acceptGameInvite`             | No   | Marks an invite as accepted (by `inviteId` or `roomId`).                                               |

Identity enforcement: on authenticated routes, the service compares the authenticated username against the request's `senderUsername` or `user` param (case-insensitive) to prevent impersonation.

### Real-Time Layer: Server-Sent Events (`routes/sse.ts`)

The chat service uses **SSE (not WebSocket)** for all real-time communication. Each authenticated user maintains a single long-lived SSE connection.

#### Connection Lifecycle (`GET /events/:username`)

1. **Auth:** Verifies session cookies via the users service.
2. **Reconnect:** If a previous connection exists for this user, it is closed gracefully.
3. **SSE headers:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no` (for Nginx compatibility).
4. **Initial payload:** Sends three events immediately:
   - `online_users` -- list of all currently connected users
   - `unread_summary` -- grouped unread messages (sender, count, last message) if any
   - `pending_game_invites` -- un-accepted game invites if any
5. **Broadcast:** Notifies all other users with `user_online`.
6. **Heartbeat:** 30-second interval sends SSE comments (`: heartbeat`) to prevent proxy/browser timeouts.
7. **Disconnect:** On socket close, removes from the connection map and broadcasts `user_offline`.

#### SSE Event Types

| Event                  | When             | Payload                                                      |
| ---------------------- | ---------------- | ------------------------------------------------------------ |
| `online_users`         | On connect       | `{ users: string[] }`                                        |
| `user_online`          | User connects    | `{ username }`                                               |
| `user_offline`         | User disconnects | `{ username }`                                               |
| `message`              | New message sent | `{ id, from, to, content, timestamp, self }`                 |
| `unread_summary`       | On connect       | `{ entries: [{ from, count, lastMessage, lastTimestamp }] }` |
| `game_invite`          | New invite       | `{ id, from, to, roomId, timestamp, self }`                  |
| `pending_game_invites` | On connect       | `{ invites: [{ id, from, to, roomId, timestamp }] }`         |

#### Architecture Note

The SSE connection registry is an **in-memory `Map<string, FastifyReply>`**. This means the service does not support horizontal scaling (multiple instances) without an external pub/sub mechanism.

---

## Game Service

**Responsible:** Tiago (3D graphics, game customization/spells) & Paulo (WebSocket networking, remote play, spectator mode)

**Stack:** Fastify 5 + Bun + WebSocket (`@fastify/websocket`) + `@gltf-transform/core`

### Constants Loading (`src/constants.js`)

At startup, the server loads game constants from **two sources**:

1. **Static constants** from `shared/constants.js` (physics values, spell stats).
2. **Dynamic constants** extracted from the `pong.glb` 3D model file using `@gltf-transform/core`. This parses the GLB and reads named node positions to derive:
   - `HEIGHT_LIMIT` and `WIDTH_LIMIT` (court boundaries)
   - `PLAYER1_Z` and `PLAYER2_Z` (paddle Z positions)
   - `PADDLE_SIZE` (paddle width from the `paddleEnd` node)
   - `BALL_Y` (vertical height of the playing surface)

This ensures server-side physics boundaries **always match** the 3D scene geometry -- there is a single source of truth (the Blender model).

### Physics Engine (`src/physics.js`)

Server-authoritative 2D physics running at **480 Hz** (one tick every ~2.08ms).

**Ball movement:**

- Position updated via `x += cos(angle) * speed * delta`, `z += sin(angle) * speed * delta`.
- Wall bounce: when `|x| > HEIGHT_LIMIT`, x is reflected and angle set to `PI - angle`.
- Paddle bounce: hit offset from paddle center normalized to [-1, 1], mapped to a bounce angle: `90 - offset * 60 degrees`. Ball speed increases by `0.025` per hit, capped at `0.6`.

**Paddle movement:**

- Paddles instantly reach max speed (`0.8`) on input, then decelerate via drag (`5 units/s^2`).
- Clamped to court boundaries (`HEIGHT_LIMIT - PADDLE_SIZE`).

**Goal detection:**

- When the ball passes a paddle's Z position without being hit, the opposing player scores.
- A `failed` flag prevents double-triggering collision checks.

### Game Room (`src/game.js`)

The `GameRoom` class manages a single match:

**State:** Ball (position, speed, angle), two player objects (position, speed, direction, score, spells, ready state), spectator set, chat buffer (max 50 messages).

**Room lifecycle:**

1. Players join as **spectators** first.
2. A spectator sends `PLAYER_READY` to take a player seat (promotion).
3. When both seats are filled, `GAME_READY` is sent.
4. Both players send `PLAYER_READY` again to start the round.
5. After a 2-second countdown (`ROUND_START_DELAY`), the round begins.
6. First to 5 points wins. On game over, the loser is demoted back to spectator.

**Perspective mirroring:** Player 2's coordinates are multiplied by `-1` in `getStateForPlayer()`, so both players always perceive themselves at the bottom of the screen.

**Broadcast throttling:** Physics runs at 480 Hz, but network state broadcasts are throttled:

- **Players:** ~60 Hz (every ~16.67ms)
- **Spectators:** ~20 Hz (every ~50ms)

#### Spell System

6 spells in two categories, with cooldowns and timed effects:

| Spell             | Type      | Effect                                                                                   | Duration | Cooldown |
| ----------------- | --------- | ---------------------------------------------------------------------------------------- | -------- | -------- |
| `ballAngleSwitch` | Offensive | Reflects ball angle (`PI - angle`)                                                       | 1s       | 5s       |
| `ballShot`        | Offensive | 1.3x speed boost, forces angle to 90/270 degrees                                         | 1s       | 4s       |
| `ballPortal`      | Offensive | Teleports ball to opposite wall on next bounce                                           | 0.75s    | 6s       |
| `ballStop`        | Counter   | Freezes ball at current position                                                         | 2s       | 5s       |
| `ballBack`        | Counter   | Reverses ball direction (`angle + PI`)                                                   | 1s       | 7s       |
| `ballIman`        | Counter   | Magnetically attracts ball toward caster (70 deg/s steering, min 20 deg from horizontal) | 1.2s     | 5s       |

Players cycle through spells within their category using `SWITCH_SPELL`. The offensive cycle is `ballAngleSwitch -> ballShot -> ballPortal`, the counter cycle is `ballStop -> ballBack -> ballIman`.

### WebSocket Protocol (`routes/pong/index.js`)

#### Game Connection (`GET /pong/`)

**On connect:**

- Resolves user identity by calling `USERS_BACKEND_URL/me/profile` and `/dashboard` with forwarded session cookies.
- Unauthenticated users get a procedurally generated guest name (e.g., "ShadowPhoenix42") and a deterministic SVG avatar.
- Detects duplicate sessions for the same authenticated user -- the old connection receives `SESSION_REPLACED` and is closed.

**Client -> Server Messages:**

| Type               | Fields               | Description                                                                                 |
| ------------------ | -------------------- | ------------------------------------------------------------------------------------------- |
| `JOIN_GAME`        | `playerData?`        | Join/create a room (always as spectator initially). Supports `?roomId=` for specific rooms. |
| `PLAYER_DIRECTION` | `direction: -1/0/1`  | Set paddle input (direction is inverted for player 2).                                      |
| `PLAYER_READY`     | --                   | If spectator: attempt promotion. If player: mark ready for round.                           |
| `USE_SPELL`        | `offensive: boolean` | Activate current offensive or counter spell.                                                |
| `SWITCH_SPELL`     | `offensive: boolean` | Cycle to next spell in category.                                                            |
| `BECOME_SPECTATOR` | --                   | Voluntarily give up player seat.                                                            |
| `CHAT_MESSAGE`     | `content`            | Send message to room chat.                                                                  |

**Server -> Client Messages:**

| Type               | When                     | Key Fields                                                     |
| ------------------ | ------------------------ | -------------------------------------------------------------- |
| `GAME_JOINED`      | On room assignment       | roomId, role, playerId, seatsAvailable                         |
| `GAME_STATE`       | Throttled (60/20 Hz)     | ball position, paddle positions, scores, spell states, running |
| `GAME_READY`       | Both seats filled        | --                                                             |
| `GAME_START`       | Both players readied     | --                                                             |
| `GAME_SCORE`       | Goal scored              | enemy (perspective-adjusted), scores                           |
| `GAME_OVER`        | Match ends               | won (perspective-adjusted), winner, scores                     |
| `COLLISION`        | Ball hits wall/paddle    | x, z, speed, angle (for client-side VFX)                       |
| `SPELL_USED`       | Spell activated          | enemy, offensive                                               |
| `SPELL_SWITCHED`   | Spell cycled             | enemy, offensive, spellName                                    |
| `PLAYER_PROMOTED`  | Spectator becomes player | playerId, playerName, opponentName                             |
| `ROOM_USERS`       | Roster changes           | users array with roles                                         |
| `SESSION_REPLACED` | Duplicate login          | --                                                             |

#### Lobby Connection (`GET /pong/rooms/ws`)

A separate WebSocket for real-time room list updates. Connected clients receive `ROOM_LIST` events whenever rooms are created, destroyed, or their `running` state changes.

#### REST Endpoints

| Method | Path                        | Description                                     |
| ------ | --------------------------- | ----------------------------------------------- |
| `GET`  | `/pong/stats`               | Active rooms count, total players, room details |
| `GET`  | `/pong/rooms`               | List all rooms                                  |
| `POST` | `/pong/rooms`               | Create a new empty room (returns `{ id }`)      |
| `GET`  | `/pong/rooms/:roomId/users` | List users in a room                            |
| `GET`  | `/pong/rooms/:roomId/chat`  | Chat history for a room                         |

### Match Reporting

On game over, the server POSTs match results to `USERS_BACKEND_URL/matches` with player IDs, scores, and the winner ID. Guest player IDs are sent as `null`.

### Room ID Generation

Room IDs are procedurally generated from adjective-noun-number combinations (e.g., "blazing-phoenix-42"). The `GameRoomManager` tracks all active rooms and handles duplicate user detection across rooms.

---

## Frontend

**Responsible:** Afonso (React/Next.js framework, shadcn components, providers) & Tiago (Babylon.js 3D game, game UI)

**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Babylon.js + Bun

### Project Structure

```
frontend/
  app/              # Next.js App Router pages
    layout.tsx       # Root layout (providers, navbar, footer, PWA)
    page.tsx         # Landing page (hero + CTA)
    auth/page.tsx    # Login/Signup/2FA
    pong/page.tsx    # Game entry (menu -> game)
    chat/page.tsx    # Real-time chat
    friends/page.tsx # Friend management
    settings/page.tsx# Avatar, password, 2FA
    users/[userId]/  # Player profiles
  components/
    providers/       # Auth, Chat, Theme context providers
    Pong/            # Babylon.js 3D game (15+ files)
    game/            # Game UI (menu, connected players, room chat, invites)
    ui/              # shadcn components
  lib/backend/       # API client modules (users, chat, friends, players)
  i18n/              # Locale resolution
  messages/          # Translation files (en, pt, cv, hi, he)
  public/
    sw.js            # Service worker (PWA installability)
    manifest.json    # PWA manifest
    models/          # GLB 3D model files
```

### Providers (`components/providers/`)

Three React Context providers, composed in order: `NextIntlClientProvider` -> `ThemeProvider` -> `AuthProvider` -> `ChatProvider`.

#### Auth Provider (`auth-provider.tsx`)

Manages global authentication state. On mount, calls `GET /dashboard` to check for an existing session (cookie-based auth). Exposes:

- `user`, `isLoading`, `isAuthenticated`
- `login(identifier, password)` -- calls `POST /auth/login`. If response includes `twoFactorRequired: true`, throws `Error("2FA_REQUIRED")` for the auth page to handle.
- `register(username, email, password, alias)` -- calls `POST /auth/register`.
- `logout()` -- clears state, redirects to `/auth`.
- `refreshUser()` -- re-fetches session data.

#### Chat Provider (`chat-provider.tsx`)

Manages the SSE connection and all real-time chat state. When the user is authenticated, connects to `GET /api/chat/events/<username>` with auto-reconnect (2-second backoff).

Handles SSE events:

- `online_users`, `user_online`, `user_offline` -> online presence tracking
- `message` -> deduplicates by ID, tracks unread counts per sender
- `unread_summary` -> restores offline unreads on reconnect
- `game_invite`, `pending_game_invites` -> game invite tracking

Exposes: `onlineUsers`, `messages`, `unreadCount`, `unreadEntries`, `clearUnread`, `sendMessage`, `sendGameInvite`, `gameInvites`, `clearGameInvite`, `activeChatUser`, `isConnected`.

### Pages

#### Auth Page (`app/auth/page.tsx`)

Unified login/signup page with:

- **Login form:** Email or username + password. On `2FA_REQUIRED`, opens a 2FA modal.
- **Signup form:** Username, email, alias, password, confirm password, terms acceptance.
- **Google OAuth button:** Redirects to the OAuth flow.
- **2FA modal:** 6-digit OTP input (`InputOTP` component) OR recovery code text input, togglable. Also triggered by `?2fa=true` URL param (after Google OAuth redirect with 2FA enabled).

#### Pong Page (`app/pong/page.tsx`)

State machine: `"menu"` | `"local"` | `"multiplayer"`. Reads `?room=<id>` from URL params for game invite deep-links. Renders `<GameMenu>` (mode selection with control/spell documentation) or `<GameScreen>` (the actual game).

The game is rendered via **Babylon.js** in `components/Pong/` -- 15+ files handling scene setup, camera, animations, audio, VFX, spell effects, gamepad support, and touch controls. The WebSocket connection to the game server is managed in the game components.

#### Chat Page (`app/chat/page.tsx`)

Responsive layout with a friend list sidebar and a conversation panel:

- Friend list shows online status (green/gray dot), unread badges, and game invite badges.
- Conversation view renders a timeline of messages and game invites sorted chronologically.
- Game invites render as clickable cards that navigate to `/pong?room=<roomId>`.
- Message history loaded via `GET /api/chat/messages`.
- URL updates to `/chat?with=<username>` when a friend is selected.

#### Friends Page (`app/friends/page.tsx`)

Three sections:

- **Player search:** Debounced (350ms) search with contextual action buttons (Add, Cancel, Accept, Already Friends).
- **Pending requests:** Incoming (accept/reject) and sent (cancel).
- **Friends list:** Chat, invite to game (only if online), remove.

Game invite flow: creates a room via `POST /api/game/pong/rooms`, sends invite via chat provider, navigates sender to `/pong?room=<id>`.

#### Settings Page (`app/settings/page.tsx`)

Three sections:

- **Avatar upload:** Image cropping and upload as base64.
- **Password change:** Current + new password (hidden for Google OAuth users who have no password).
- **2FA management:** Full lifecycle -- setup (QR code) -> confirm (TOTP token) -> recovery codes display, or disable (requires TOTP token).

### API Client Layer (`lib/backend/`)

Centralized API clients using Axios with `withCredentials: true` (cookie-based auth). All URLs are relative to the current host (resolved dynamically via `window.location`) and routed through Nginx:

- `users.ts` -- login, register, dashboard, logout, avatar, password, 2FA
- `chat.ts` -- messages, SSE URL, game invites, mark read
- `friends.ts` -- send/accept/reject/cancel requests, list, remove
- `players.ts` -- profiles, search, match history
- `config.ts` -- URL resolution (`/api/users`, `/api/game`, `/api/chat`, `/ws/pong`, `/ws/lobby`)

### Internationalization

5 locales: English, Portuguese, Cape Verdean Creole, Hindi, Hebrew. Locale resolution (in `i18n/request.ts`):

1. `locale` cookie
2. `Accept-Language` header
3. Default: `"en"`

Translation files are JSON in `messages/` and loaded server-side via `next-intl`.

### PWA

- `manifest.json` for installability metadata.
- `public/sw.js` -- minimal service worker with `skipWaiting` + `clients.claim`. No caching strategy -- all requests go to the network. Exists purely to satisfy PWA installability requirements.
- Service worker registered in the root layout.

### Notable Patterns

- **No client-side token storage** -- auth is entirely cookie-based via `withCredentials: true`.
- **Custom DOM events** (`pong:back-to-menu`) for cross-component communication in the game.
- **React Strict Mode disabled** to prevent double-mounting Babylon.js WebGL contexts.
- **Webpack polyfills** for `fs` and `path` (required by Babylon.js on the client).
- Custom no-cache headers for game assets (`/buttons/*`, `/models/*`) and aggressive caching for fonts.

---

## Nginx Proxy & Infrastructure

**Responsible:** Sergio & Paulo (Docker containerization, microservice orchestration)

### Nginx Configuration (`nginx/nginx.conf`, `nginx/nginx.dev.conf`)

Nginx 1.27 (Alpine) acts as the single entry point on port 3000. Route table:

| External Path        | Backend                   | Protocol   | Special Config                                                   |
| -------------------- | ------------------------- | ---------- | ---------------------------------------------------------------- |
| `/api/users/`        | `users:3000`              | HTTP       | 2MB upload limit for avatars                                     |
| `/api/game/`         | `game:3000`               | HTTP       | --                                                               |
| `/ws/pong`           | `game:3000/pong`          | WebSocket  | `Upgrade` + `Connection` headers                                 |
| `/ws/lobby`          | `game:3000/pong/rooms/ws` | WebSocket  | `Upgrade` + `Connection` headers                                 |
| `/api/chat/`         | `chat:3000`               | HTTP + SSE | `proxy_buffering off`, 24h read timeout, `X-Accel-Buffering: no` |
| `/_next/webpack-hmr` | `frontend:3000`           | WebSocket  | HMR passthrough (dev)                                            |
| `/sw.js`             | `frontend:3000/sw.js`     | HTTP       | `Service-Worker-Allowed: /`, no-cache                            |
| `/`                  | `frontend:3000`           | HTTP       | Aggressive no-cache on HTML                                      |

The dev config (`nginx.dev.conf`) is identical but routes to `-dev` suffixed service names and is bind-mounted (not baked into the image).

### Docker Compose (`docker-compose.yml`)

Two profiles: `dev` (hot-reload, bind mounts, `oven/bun:1` base) and `prod` (pre-built images from GHCR).

**Services:** proxy, frontend, users, game, chat (x2 for dev/prod = 10 total service definitions).

**Persistent volumes:**

- `users_db` (`/app/database`) -- SQLite for users
- `chat_db` (`/app/data`) -- Prisma/SQLite for chat
- `*_node_modules` -- isolated node_modules per service

**Dev bind mounts:** All source directories mounted with `:cached` for macOS performance. Shared constants mounted into both frontend and game services.

**Networking:** All services on the default Docker Compose network. Inter-service calls use Docker DNS (e.g., `http://users-dev:3000`). The proxy depends on all other services.

### Makefile

Key targets:

- `make dev` / `make prod` -- start the stack
- `make dev-logs-{service}` -- follow individual service logs
- `make prod-buildx` -- multi-arch build (amd64 + arm64) and push to GHCR
- `make fclean` -- nuclear clean (containers, volumes, images)
- `make status` -- show all container status

Production images are pushed to `ghcr.io/pvcordeiro/transcendence-*`.
