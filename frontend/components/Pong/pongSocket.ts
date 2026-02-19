import { Player, Pong } from "./pong";
import { splashEffect, COLLISION_VFX, resetRoundColor } from "./pongVFX";
import { Vector3, Color4 } from "@babylonjs/core";
import { Events } from "./pongEvents";
import { getNewSpell } from "./pongSpells";
import { GAME_WS_URL } from "@/lib/backend/config";
import { switchPlayerHandsPosition } from "./pongAnimations";

export function connectToGameServer(
  pong: Pong,
  serverUrl: string = GAME_WS_URL,
  roomId?: string,
  onSessionReplaced?: () => void,
) {
  const wsUrl = roomId ? `${serverUrl}?roomId=${roomId}` : serverUrl;
  console.log("Connecting to game server:", wsUrl);

  pong.socket = new WebSocket(wsUrl);

  pong.socket.onopen = (event) => {
    console.log("✅ Connected to game server");

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
          name: "Player",
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

  pong.socket.onclose = (event) => {
    console.log("❌ Disconnected from game server");
    pong.online = false;
  };
}

function handleServerMessage(
  pong: Pong,
  message: any,
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

    case "COLLISION":
      handleCollision(pong, message);
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
}

// Handlers for different message types

function handleGameState(pong: Pong, message: any) {
  pong.serverGameState = message;
  pong.serverGameStateApplied = false;
}

function handleSpellUsed(pong: Pong, message: any) {

  let player;
  message.enemy ? (player = pong.player2) : (player = pong.player1);

  message.offensive
    ? player.offensiveSpell.activateSpell()
    : player.counterSpell.activateSpell();
}

function handleSpellSwitched(pong: Pong, message: any) {

  let player;
  message.enemy ? (player = pong.player2) : (player = pong.player1);

  message.offensive
    ? (player.offensiveSpell = getNewSpell(
        pong,
        player,
        player.offensiveSpell,
        message.spellName,
      ))
    : (player.counterSpell = getNewSpell(
        pong,
        player,
        player.counterSpell,
        message.spellName,
      ));
}

function handleGameReady(pong: Pong) {
  console.log("Both Players connected to the game!");

  if (pong.isSpectator) {
    return;
  }

  if (!pong.player2.connected) {
    pong.player2.connected = true;

    if (pong.GUI) {
      pong.GUI.showReadyPrompt();
      if (pong.localReady) {
        pong.GUI.showOtherPlayerReady();
        pong.GUI.waitingForOpponentReadyUI();
      }
    }
  }
}

function handleGameJoined(pong: Pong, message: any) {
  console.log("Joined game room:", message.roomId);
  pong.online = true;
  pong.isSpectator = message.role === "spectator";
  pong.seatsAvailable = message.seatsAvailable ?? 0;
  pong.playerId = message.playerId ?? null;
  pong.localReady = false;

  // Reassigning the keys for online play
  Events.assignKeys(pong);

  pong.player1.connected = true;
  pong.player2.connected = !message.alone;
  if (message.playerName) {
    pong.player1.name = message.playerName;
  }
  if (message.opponentName) {
    pong.player2.name = message.opponentName;
  }

  if (pong.GUI) {
    if (pong.isSpectator) {
      pong.GUI.spectatorModeUI(pong.seatsAvailable);
    } else if (message.alone) {
      pong.GUI.waitingForPlayersUI();
    } else {
      pong.GUI.pressReadyUI();
    }
    pong.GUI.updatePlayerLabels(pong.player1.name, pong.player2.name);
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
  Events.emitSpectatorState(pong);
  Events.emitReadyState(pong);
}

function handleGameStart(pong: Pong) {
  console.log("Game starting!");
  if (pong.isSpectator) {
    pong.running = false;
    if (pong.GUI) {
      pong.GUI.spectatorModeUI(pong.seatsAvailable);
      pong.GUI.updateScores(pong.player1.score, pong.player2.score);
      pong.GUI.hideOtherPlayerReady();
    }
    return;
  }

  pong.running = true;
  if (pong.GUI) {
    pong.GUI.startRoundUI();
    pong.GUI.hideOtherPlayerReady();
    pong.GUI.textFadeOut("WAITING_FOR_READY");
  }
}

function handleGameDisconnection(pong: Pong) {
  console.log("Opponent disconnected");

  pong.running = false;
  pong.player2.connected = false;
  pong.localReady = false;

  if (pong.GUI) {
    if (pong.isSpectator) {
      pong.GUI.spectatorModeUI(pong.seatsAvailable);
    } else {
      pong.GUI.opponentLeftUI();
      pong.GUI.textFadeOut("WAITING_FOR_READY");
      pong.GUI.hideOtherPlayerReady();
    }
  }
  Events.emitSpectatorState(pong);
  Events.emitReadyState(pong);
}

function handleSeatAvailable(pong: Pong, message: any) {
  pong.seatsAvailable = message.seatsAvailable ?? 0;
  if (pong.isSpectator && pong.GUI) {
    pong.GUI.spectatorModeUI(pong.seatsAvailable);
  }
  if (pong.isSpectator && pong.camera) {
    pong.camera.setView(true, true);
    switchPlayerHandsPosition(pong, pong.camera.topView, false);
  }
  Events.emitSpectatorState(pong);
}

function handlePlayerPromoted(pong: Pong, message: any) {
  pong.isSpectator = false;
  pong.localReady = false;
  pong.playerId = message.playerId ?? pong.playerId;
  pong.player1.connected = true;
  pong.player2.connected = true;
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
  Events.emitSpectatorState(pong);
  Events.emitReadyState(pong);
}

function handleSeatUnavailable(pong: Pong) {
  if (pong.isSpectator && pong.GUI) {
    pong.GUI.spectatorModeUI(pong.seatsAvailable);
  }
  if (pong.isSpectator && pong.camera) {
    pong.camera.setView(true, true);
    switchPlayerHandsPosition(pong, pong.camera.topView, false);
  }
  Events.emitSpectatorState(pong);
}

function handlePlayerReadyStatus(pong: Pong, message: any) {
  if (pong.isSpectator) {
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
    pong.GUI.showOtherPlayerReady();
  } else {
    pong.GUI.hideOtherPlayerReady();
    pong.GUI.textFadeOut("WAITING_FOR_READY");
    if (!pong.localReady) {
      pong.GUI.pressReadyUI();
    }
  }
  Events.emitReadyState(pong);
}

function handleSessionReplaced(
  pong: Pong,
  onSessionReplaced?: () => void,
) {
  console.log("Session replaced by another tab");
  disconnectFromServer(pong);
  if (onSessionReplaced) {
    onSessionReplaced();
  }
}

function handleRoomNotFound(pong: Pong, message: any) {
  console.warn("Room not found:", message.roomId);
  disconnectFromServer(pong);
}

function handleGameScore(pong: Pong, message: any) {
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
      pong.GUI.roundLostUI(true, message.player1Score, message.player2Score);
      pong.localReady = false;
      pong.GUI.textFadeOut("WAITING_FOR_READY");
    } else {
      pong.GUI.roundWonUI(true, message.player1Score, message.player2Score);
      pong.localReady = false;
      pong.GUI.textFadeOut("WAITING_FOR_READY");
    }
    pong.GUI.updatePlayerLabels(pong.player1.name, pong.player2.name);
  }
  Events.emitReadyState(pong);
  resetRoundColor(pong);
}

function handleCollision(pong: Pong, message: any) {
  splashEffect(
    pong.scene,
    new Vector3(message.x, pong.ball.y, message.z),
    message.speed,
    message.angle,
    COLLISION_VFX,
  );
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

export function sendUseDash(pong: Pong) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "USE_DASH",
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
  if (pong.socket) {
    pong.socket.close();
    pong.socket = undefined;
    pong.online = false;
  }
}
