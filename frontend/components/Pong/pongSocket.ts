import { Player, Pong } from "./pong";
import { splashEffect, COLLISION_VFX } from "./pongVFX";
import { Vector3, Color4 } from "@babylonjs/core";
import { Events } from "./pongEvents";
import { GENERATE_SPELLS } from "./pongSpells";
import { platform } from "os";

export function connectToGameServer(
  pong: Pong,
  serverUrl: string = "ws://localhost:3002/pong",
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

    // Show disconnect message to player
    if (pong.GUI) {
      pong.GUI.textFadeIn("DISCONNECTED");
    }
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

    case "SCORE":
      handleScore(pong, message);
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
  console.log("Spell used:", message);

  let player;
  message.enemy ? (player = pong.player2) : (player = pong.player1);

  let spellHand;
  message.offensive
    ? (spellHand = player.offensiveSpell)
    : (spellHand = player.counterSpell);

  spellHand.activateSpell();
}

function handleSpellSwitched(pong: Pong, message: any) {
  console.log("Spell switched:", message);

  let player;
  message.enemy ? (player = pong.player2) : (player = pong.player1);

  let spellHand;
  message.offensive
    ? (spellHand = player.offensiveSpell)
    : (spellHand = player.counterSpell);

  const SpellConstructor =
    GENERATE_SPELLS[message.spellType as keyof typeof GENERATE_SPELLS];
  spellHand = new SpellConstructor(pong, player, spellHand.name);
}

function handleGameReady(pong: Pong) {
  console.log("Both Players connected to the game!");

  if (!pong.player2.connected) {
    pong.player2.connected = true;

    if (pong.GUI) {
      pong.GUI.textFadeOut("WAITING");
      pong.GUI.toggleTextBlink(pong.scene, "WAITING");
      pong.GUI.textFadeIn("START");
      pong.GUI.toggleTextBlink(pong.scene, "START");
    }
  }
}

function handleGameJoined(pong: Pong, message: any) {
  console.log("Joined game room:", message.roomId);
  pong.online = true;

  // Reassigning the keys for online play
  Events.assignKeys(pong);

  if (message.alone) {
    pong.player1.connected = true;
    pong.player2.connected = false;

    if (pong.GUI) {
      pong.GUI.textFadeIn("WELCOME WARLOCK", 2000);
      pong.GUI.textFadeIn("WAITING");
      pong.GUI.toggleTextBlink(pong.scene, "WAITING");
    }
  } else {
    pong.player1.connected = true;
    pong.player2.connected = true;

    if (pong.GUI) {
      pong.GUI.textFadeIn("WELCOME WARLOCK", 2000);
      pong.GUI.textFadeIn("START");
      pong.GUI.toggleTextBlink(pong.scene, "START");
    }
  }
}

function handleGameStart(pong: Pong) {
  console.log("Game starting!");
  pong.running = true;

  if (pong.GUI) {
    pong.GUI.textFadeOut("START");
    pong.GUI.toggleTextBlink(pong.scene, "START");
  }
}

function handleGameDisconnection(pong: Pong) {
  console.log("Opponent disconnected");

  pong.running = false;
  pong.player2.connected = false;

  if (pong.GUI) {
    pong.GUI.textFadeIn("OPPONENT_LEFT");
    pong.GUI.textFadeIn("WAITING");
    pong.GUI.toggleTextBlink(pong.scene, "WAITING");
  }
}

function handleScore(pong: Pong, message: any) {
  console.log("Score!", message);

  if (pong.GUI) {
    if (message.enemy) {
      pong.GUI.textFadeIn("YOU_LOST", 2000);
    } else {
      pong.GUI.textFadeIn("YOU_WON", 2000);
    }
    pong.GUI.toggleTextBlink(pong.scene, "START");
  }
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

export function disconnectFromServer(pong: Pong) {
  if (pong.socket) {
    pong.socket.close();
    pong.socket = undefined;
    pong.online = false;
  }
}
