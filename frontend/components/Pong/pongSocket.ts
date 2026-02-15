import { Player, Pong } from "./pong";
import { splashEffect, COLLISION_VFX, resetRoundColor } from "./pongVFX";
import { Vector3, Color4 } from "@babylonjs/core";
import { Events } from "./pongEvents";
import { getNewSpell } from "./pongSpells";
import { platform } from "os";
import { GAME_WS_URL } from "@/lib/backend/config";

export function connectToGameServer(
  pong: Pong,
  serverUrl: string = GAME_WS_URL,
) {
  console.log("Connecting to game server:", serverUrl);

  pong.socket = new WebSocket(serverUrl);

  pong.socket.onopen = (event) => {
    console.log("✅ Connected to game server");

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
      handleServerMessage(pong, message);
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

function handleServerMessage(pong: Pong, message: any) {
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

    case "SPELL_USED":
      handleSpellUsed(pong, message);
      break;

    case "SPELL_SWITCHED":
      handleSpellSwitched(pong, message);
      break;

    case "COLLISION":
      handleCollision(pong, message);
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
  console.log("Spell used:", message);

  let player;
  message.enemy ? (player = pong.player2) : (player = pong.player1);

  message.offensive
    ? player.offensiveSpell.activateSpell()
    : player.counterSpell.activateSpell();
}

function handleSpellSwitched(pong: Pong, message: any) {
  console.log("Spell switched:", message);

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

  if (!pong.player2.connected) {
    pong.player2.connected = true;

    if (pong.GUI) {
      pong.GUI.pressReadyUI();
    }
  }
}

function handleGameJoined(pong: Pong, message: any) {
  console.log("Joined game room:", message.roomId);
  pong.online = true;
  
  // Set spectating status
  pong.spectating = message.role === "spectator" || message.spectating || false;

  if (pong.spectating) {
    console.log("Joined as spectator");
    if (pong.GUI) {
      pong.GUI.spectatorWaitingUI();
    }
    return;
  }

  // Reassigning the keys for online play
  Events.assignKeys(pong);

  if (message.alone) {
    pong.player1.connected = true;
    pong.player2.connected = false;

    if (pong.GUI) {
      pong.GUI.waitingForPlayersUI();
      pong.GUI.textFadeIn("WELCOME");
    }
  } else {
    pong.player1.connected = true;
    pong.player2.connected = true;

    if (pong.GUI) {
      pong.GUI.pressReadyUI();
      pong.GUI.textFadeIn("WELCOME");
    }
  }
}

function handleGameStart(pong: Pong) {
  console.log("Game starting!");
  pong.running = true;

  if (pong.GUI) {
    pong.GUI.startRoundUI();
  }
}

function handleGameDisconnection(pong: Pong) {
  console.log("Player disconnected");

  pong.running = false;
  
  if (!pong.spectating) {
    pong.player2.connected = false;
    if (pong.GUI) {
      pong.GUI.opponentLeftUI();
    }
  } else {
    // Spectators might see seat availability change
    // The server should send PLAYER_SEAT_AVAILABLE separately
    if (pong.GUI) {
      pong.GUI.spectatorWaitingUI();
    }
  }
}

function handleGameScore(pong: Pong, message: any) {
  console.log("Score!", message);

  if (pong.GUI) {
    if (message.enemy) {
      pong.GUI.roundLostUI(true, message.player1Score, message.player2Score);
    } else {
      pong.GUI.roundWonUI(true, message.player1Score, message.player2Score);
    }
  }
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

function handleSeatAvailable(pong: Pong, message: any) {
  console.log("Seat available!");
  
  if (pong.spectating && pong.GUI) {
    pong.GUI.pressReadyUI();
  }
}

function handlePlayerPromoted(pong: Pong, message: any) {
  console.log("Promoted to player!");
  pong.spectating = false;
  
  // Reassign keys for player mode
  Events.assignKeys(pong);
  
  if (pong.GUI) {
    pong.GUI.pressReadyUI();
  }
}

function handleSeatUnavailable(pong: Pong) {
  console.log("No seats available");
  
  if (pong.spectating && pong.GUI) {
    pong.GUI.spectatorWaitingUI();
  }
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
