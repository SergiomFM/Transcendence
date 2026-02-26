import { Pong } from "./pong";
import { splashEffect, COLLISION_VFX, resetRoundColor } from "./pongVFX";
import { Vector3 } from "@babylonjs/core";
import { Events } from "./pongEvents";
import { getNewSpell } from "./pongSpells";
import { GAME_WS_URL } from "@/lib/backend/config";
import { switchPlayerHandsPosition } from "./pongAnimations";
import type { ChatMessage, RoomUser } from "@/components/game/types";
import {
  sfxCollision, sfxScore, sfxLostRound, sfxVictory, sfxDefeat,
  sfxConnect, sfxDisconnect, sfxPromoted, sfxSeatAvailable,
  sfxOpponentReady, sfxSpellSwitch,
} from "./pongAudio";

// --- Reconnection configuration ---
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000; // 1 second
const RECONNECT_MAX_DELAY = 15000; // 15 seconds

// Track whether the disconnect was intentional (user-initiated)
let intentionalClose = false;
// Track whether we should NOT reconnect (session replaced, room not found)
let suppressReconnect = false;
// Reconnection state
let reconnectAttempts = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function clearReconnectState() {
  reconnectAttempts = 0;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

export function connectToGameServer(
  pong: Pong,
  serverUrl: string = GAME_WS_URL,
  roomId?: string,
  onSessionReplaced?: () => void,
) {
  const wsUrl = roomId ? `${serverUrl}?roomId=${roomId}` : serverUrl;
  console.log("Connecting to game server:", wsUrl);

  // Reset flags for a fresh connection
  intentionalClose = false;
  suppressReconnect = false;

  pong.socket = new WebSocket(wsUrl);

  pong.socket.onopen = () => {
    console.log("Connected to game server");
    // Reset reconnection counter on successful connect
    clearReconnectState();

    pong.isSpectator = true;

    if (pong.GUI) {
      pong.GUI.textFadeIn("WELCOME", 1500);
    } else {
      pong.pendingWelcome = true;
    }

    // Join the game immediately upon connection
    pong.socket!.send(
      JSON.stringify({
        type: "JOIN_GAME",
        playerData: {
          timestamp: Date.now(),
        },
      }),
    );
  };

  pong.socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(pong, message, onSessionReplaced);
    } catch (error) {
      console.error("Error parsing server message:", error);
    }
  };

  pong.socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  pong.socket.onclose = () => {
    console.log("Disconnected from game server");
    pong.online = false;

    // Attempt reconnection if the close was not intentional
    if (!intentionalClose && !suppressReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(
        RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts),
        RECONNECT_MAX_DELAY,
      );
      reconnectAttempts++;
      console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

      if (pong.GUI) {
        pong.GUI.showDisconnectedUI();
      }

      reconnectTimeout = setTimeout(() => {
        // Only reconnect if we still have a valid pong instance and haven't been cleaned up
        if (!intentionalClose && !suppressReconnect) {
          connectToGameServer(pong, serverUrl, roomId, onSessionReplaced);
        }
      }, delay);
    }
  };
}

interface ServerMessage {
  type: string;
  [key: string]: unknown;
}

function handleServerMessage(
  pong: Pong,
  message: ServerMessage,
  onSessionReplaced?: () => void,
) {
  switch (message.type) {
    case "GAME_STATE":
      handleGameState(pong, message);
      break;

    case "GAME_JOINED":
      handleGameJoined(pong, message);
      break;

    case "GAME_READY":
      handleGameReady(pong);
      break;

    case "GAME_START":
      handleGameStart(pong);
      break;

    case "PLAYER_DISCONNECTED":
      handleGameDisconnection(pong);
      break;

    case "GAME_SCORE":
      handleGameScore(pong, message);
      break;

    case "GAME_OVER":
      handleGameOver(pong, message);
      break;

    case "PLAYER_SEAT_AVAILABLE":
      handleSeatAvailable(pong, message);
      break;

    case "PLAYER_PROMOTED":
      handlePlayerPromoted(pong, message);
      break;

    case "PLAYER_SEAT_UNAVAILABLE":
      handleSeatUnavailable(pong);
      break;

    case "PLAYER_READY_STATUS":
      handlePlayerReadyStatus(pong, message);
      break;

    case "SESSION_REPLACED":
      handleSessionReplaced(pong, onSessionReplaced);
      break;

    case "ROOM_NOT_FOUND":
      handleRoomNotFound(pong, message);
      break;

    case "SPELL_USED":
      handleSpellUsed(pong, message);
      break;

    case "SPELL_SWITCHED":
      handleSpellSwitched(pong, message);
      break;

    case "SPELL_ENDED":
      handleSpellEnded(pong);
      break;

    case "COLLISION":
      handleCollision(pong, message);
      break;

    case "CHAT_MESSAGE":
      if (pong.onChatMessage && message.message) {
        pong.onChatMessage(message.message as ChatMessage);
      }
      break;

    case "ROOM_USERS":
      if (pong.onRoomUsers && message.users) {
        pong.onRoomUsers(message.users as RoomUser[]);
      }
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
}

// Handlers for different message types

function handleGameState(pong: Pong, message: ServerMessage) {
  pong.serverGameState = message;
  pong.serverGameStateApplied = false;
}

function handleSpellUsed(pong: Pong, message: ServerMessage) {
  const player = message.enemy ? pong.player2 : pong.player1;

  if (message.offensive) {
    player.offensiveSpell.activateSpell();
  } else {
    player.counterSpell.activateSpell();
  }
}

function handleSpellSwitched(pong: Pong, message: ServerMessage) {
  const player = message.enemy ? pong.player2 : pong.player1;

  if (message.offensive) {
    player.offensiveSpell = getNewSpell(
      pong,
      player,
      player.offensiveSpell,
      message.spellName as string,
    );
  } else {
    player.counterSpell = getNewSpell(
      pong,
      player,
      player.counterSpell,
      message.spellName as string,
    );
  }

  // Only play SFX for the local player's own spell switch
  if (!pong.isSpectator && !message.enemy) {
    sfxSpellSwitch();
  }
}

function handleSpellEnded(pong: Pong) {
  resetRoundColor(pong);
}

function handleGameReady(pong: Pong) {
  console.log("Both Players connected to the game!");

  if (!pong.player2.connected) {
    pong.player2.connected = true;
    sfxConnect();

    if (pong.GUI) {
      if (pong.isSpectator) {
        pong.GUI.spectatorModeUI(pong.seatsAvailable);
      } else {
        pong.GUI.showReadyPrompt();
        if (pong.localReady) {
          pong.GUI.showOtherPlayerReady();
          pong.GUI.waitingForOpponentReadyUI();
        }
      }
    }
  }
}

function handleGameJoined(pong: Pong, message: ServerMessage) {
  console.log("Joined game room:", message.roomId);
  pong.online = true;
  pong.isSpectator = message.role === "spectator";
  pong.seatsAvailable = (message.seatsAvailable as number) ?? 0;
  pong.playerId = (message.playerId as string) ?? null;
  pong.localReady = false;

  // Reassigning the keys for online play
  Events.assignKeys(pong);

  pong.player1.connected = true;
  pong.player2.connected = !message.alone;
  if (message.playerName) {
    pong.player1.name = message.playerName as string;
  }
  if (message.opponentName) {
    pong.player2.name = message.opponentName as string;
  }

  if (pong.GUI) {
    pong.GUI.updatePlayerLabels(pong.player1.name, pong.player2.name);
    if (pong.isSpectator) {
      pong.GUI.spectatorModeUI(pong.seatsAvailable);
    } else if (message.alone) {
      pong.GUI.waitingForPlayersUI();
    } else {
      pong.GUI.pressReadyUI();
    }
    if (pong.isSpectator) {
      pong.GUI.textFadeIn("WELCOME", 1500);
    } else {
      pong.GUI.textFadeIn("WELCOME");
    }
  }

  if (pong.camera) {
    pong.camera.setView(pong.isSpectator, true);
    switchPlayerHandsPosition(pong, pong.camera.topView, false);
  }
}

function handleGameStart(pong: Pong) {
  console.log("Game starting!");

  // Start the match for all clients (players and spectators)
  pong.running = true;

  if (pong.GUI) {
    if (pong.isSpectator) {
      pong.GUI.spectatorModeUI(pong.seatsAvailable);
      pong.GUI.updateScores(pong.player1.score, pong.player2.score);
      pong.GUI.hideOtherPlayerReady();
    } else {
      pong.GUI.startRoundUI();
      pong.GUI.hideOtherPlayerReady();
      pong.GUI.textFadeOut("WAITING_FOR_READY");
    }
  }
}

function handleGameDisconnection(pong: Pong) {
  console.log("Opponent disconnected");

  pong.running = false;
  pong.localReady = false;
  sfxDisconnect();
  // Reset arena color so spell colors don't persist after disconnection
  resetRoundColor(pong);

  if (!pong.isSpectator) {
    pong.player2.connected = false;
  }

  if (pong.GUI) {
    if (pong.isSpectator) {
      pong.GUI.spectatorModeUI(pong.seatsAvailable);
    } else {
      pong.GUI.opponentLeftUI();
      pong.GUI.textFadeOut("WAITING_FOR_READY");
      pong.GUI.hideOtherPlayerReady();
    }
  }
}

function handleSeatAvailable(pong: Pong, message: ServerMessage) {
  pong.seatsAvailable = (message.seatsAvailable as number) ?? 0;
  // Skip spectator UI transition while "MATCH LOST!" is still being shown
  if (pong.matchLostPending) {
    return;
  }
  if (pong.isSpectator) {
    sfxSeatAvailable();
  }
  if (pong.isSpectator && pong.GUI) {
    pong.GUI.spectatorModeUI(pong.seatsAvailable);
  }
  if (pong.isSpectator && pong.camera) {
    pong.camera.setView(true, true);
    switchPlayerHandsPosition(pong, pong.camera.topView, false);
  }
}

function handlePlayerPromoted(pong: Pong, message: ServerMessage) {
  pong.isSpectator = false;
  pong.localReady = false;
  pong.playerId = (message.playerId as string) ?? pong.playerId;
  pong.player1.connected = true;
  pong.player2.connected = true;
  sfxPromoted();
  // Reset spell cooldowns so balls start small after promotion
  pong.player1.counterSpell.resetSpell();
  pong.player1.offensiveSpell.resetSpell();
  pong.player2.counterSpell.resetSpell();
  pong.player2.offensiveSpell.resetSpell();
  // Reset arena color to default so new player doesn't inherit stale spell colors
  resetRoundColor(pong);
  // Update names from server to fix perspective after promotion
  pong.player1.name = (message.playerName as string) ?? null;
  pong.player2.name = (message.opponentName as string) ?? null;
  if (pong.GUI) {
    pong.GUI.pressReadyUI();
    pong.GUI.hideOtherPlayerReady();
    pong.GUI.textFadeOut("WAITING_FOR_READY");
    pong.GUI.updatePlayerLabels(pong.player1.name, pong.player2.name);
  }
  if (pong.camera) {
    pong.camera.setView(false, true);
    switchPlayerHandsPosition(pong, pong.camera.topView, false);
  }
}

function handleSeatUnavailable(pong: Pong) {
  if (pong.isSpectator && pong.GUI) {
    pong.GUI.spectatorModeUI(pong.seatsAvailable);
  }
  if (pong.isSpectator && pong.camera) {
    pong.camera.setView(true, true);
    switchPlayerHandsPosition(pong, pong.camera.topView, false);
  }
}

function handlePlayerReadyStatus(pong: Pong, message: ServerMessage) {
  if (pong.isSpectator) {
    // Spectators hear ready SFX but don't show player-specific ready UI
    if (message.ready) {
      sfxOpponentReady();
    }
    return;
  }
  if (!pong.GUI) {
    return;
  }
  const isLocalPlayer = message.playerId === pong.playerId;
  if (isLocalPlayer) {
    pong.localReady = !!message.ready;
    if (pong.localReady) {
      pong.GUI.waitingForOpponentReadyUI();
    } else {
      pong.GUI.hideOtherPlayerReady();
      pong.GUI.textFadeOut("WAITING_FOR_READY");
      pong.GUI.pressReadyUI();
    }
  } else if (message.ready) {
    sfxOpponentReady();
    pong.GUI.showOtherPlayerReady();
  } else {
    pong.GUI.hideOtherPlayerReady();
    pong.GUI.textFadeOut("WAITING_FOR_READY");
    if (!pong.localReady) {
      pong.GUI.pressReadyUI();
    }
  }
}

function handleSessionReplaced(
  pong: Pong,
  onSessionReplaced?: () => void,
) {
  console.log("Session replaced by another tab");
  suppressReconnect = true;
  disconnectFromServer(pong);
  if (onSessionReplaced) {
    onSessionReplaced();
  }
}

function handleRoomNotFound(pong: Pong, message: ServerMessage) {
  suppressReconnect = true;
  disconnectFromServer(pong);
}

function handleGameScore(pong: Pong, message: ServerMessage) {
  console.log("Score!", message);

  if (typeof message.player1Score === "number") {
    pong.player1.score = message.player1Score;
  }
  if (typeof message.player2Score === "number") {
    pong.player2.score = message.player2Score;
  }

  if (pong.GUI) {
    if (pong.isSpectator) {
      pong.GUI.updateScores(pong.player1.score, pong.player2.score);
    } else if (message.enemy) {
      pong.GUI.roundLostUI(true, message.player1Score as number, message.player2Score as number);
      pong.localReady = false;
      pong.GUI.textFadeOut("WAITING_FOR_READY");
      sfxLostRound();
    } else {
      pong.GUI.roundWonUI(true, message.player1Score as number, message.player2Score as number);
      pong.localReady = false;
      pong.GUI.textFadeOut("WAITING_FOR_READY");
      sfxScore();
    }
    pong.GUI.updatePlayerLabels(pong.player1.name, pong.player2.name);
  }
  resetRoundColor(pong);
}

function handleGameOver(pong: Pong, message: ServerMessage) {
  console.log("Game Over!", message);

  if (typeof message.player1Score === "number") {
    pong.player1.score = message.player1Score;
  }
  if (typeof message.player2Score === "number") {
    pong.player2.score = message.player2Score;
  }

  pong.running = false;
  pong.localReady = false;

  if (pong.GUI) {
    if (pong.isSpectator) {
      pong.GUI.updateScores(pong.player1.score, pong.player2.score);
    } else if (message.won) {
      pong.GUI.matchWonUI(message.player1Score as number, message.player2Score as number);
      sfxVictory();
    } else {
      pong.GUI.matchLostUI(message.player1Score as number, message.player2Score as number);
      sfxDefeat();
    }
    pong.GUI.updatePlayerLabels(pong.player1.name, pong.player2.name);
  }

  // Loser gets demoted to spectator by the server — the PLAYER_SEAT_AVAILABLE
  // message will handle the spectator UI transition via handleSeatAvailable.
  // But if we lost, update local state immediately so inputs don't fire.
  if (!pong.isSpectator && message.won === false) {
    pong.isSpectator = true;
    // Delay the spectator UI so the player can see "MATCH LOST!" for a few seconds
    pong.matchLostPending = true;
    setTimeout(() => {
      pong.matchLostPending = false;
      if (pong.isSpectator && pong.GUI) {
        pong.GUI.spectatorModeUI(pong.seatsAvailable);
      }
      if (pong.isSpectator && pong.camera) {
        pong.camera.setView(true, true);
        switchPlayerHandsPosition(pong, pong.camera.topView, false);
      }
    }, 1500);
  }

  resetRoundColor(pong);
}

function handleCollision(pong: Pong, message: ServerMessage) {
  splashEffect(
    pong.scene,
    new Vector3(message.x as number, pong.ball.y, message.z as number),
    message.speed as number,
    message.angle as number,
    COLLISION_VFX,
  );
  sfxCollision();
}

// Functions to send messages to the server
export function sendUseSpell(pong: Pong, offensive: boolean) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "USE_SPELL",
        offensive: offensive,
      }),
    );
  }
}

export function sendSwitchSpell(pong: Pong, offensive: boolean) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "SWITCH_SPELL",
        offensive: offensive,
      }),
    );
  }
}

export function sendPlayerDirection(pong: Pong, direction: number) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "PLAYER_DIRECTION",
        direction: direction,
      }),
    );
  }
}

export function sendPlayerReady(pong: Pong) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "PLAYER_READY",
      }),
    );
  }
}

export function sendBecomePlayer(pong: Pong) {
  sendPlayerReady(pong);
}

export function sendBecomeSpectator(pong: Pong) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "BECOME_SPECTATOR",
      }),
    );
  }
}

export function disconnectFromServer(pong: Pong) {
  intentionalClose = true;
  clearReconnectState();
  if (pong.socket) {
    pong.socket.close();
    pong.socket = undefined;
    pong.online = false;
  }
}
