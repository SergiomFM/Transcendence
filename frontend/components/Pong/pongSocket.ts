import { Pong } from "./pong";
import { splashEffect, COLLISION_VFX } from "./pongVFX";
import { Vector3, Color4 } from "@babylonjs/core";
import { Events } from "./pongEvents";
import { GENERATE_SPELLS } from "./pongSpells";

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
    case "JOINED_GAME":
      handleJoinedGame(pong, message);
      break;

    case "WAITING":
      handleWaiting(pong, message);
      break;

    case "GAME_READY":
      handleGameReady(pong, message);
      break;

    case "GAME_START":
      handleGameStart(pong, message);
      break;

    case "STATE_UPDATE":
    case "GAME_STATE":
      handleGameState(pong, message);
      break;

    case "GAME_EVENT":
      handleGameEvent(pong, message);
      break;

    case "COLLISION":
      handleCollision(pong, message);
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

    case "PLAYER_DISCONNECTED":
      handlePlayerDisconnected(pong, message);
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
}

function handleJoinedGame(pong: Pong, message: any) {
  console.log("Joined game room:", message.roomId);
  console.log("You are player:", message.playerId);

  pong.playerId = message.playerId;
  pong.online = true;

  Events.assignKeys(pong);

  if (pong.GUI) {
    const playerTextName = message.playerId === 1 ? "PLAYER_1" : "PLAYER_2";
    pong.GUI.textFadeIn(playerTextName, 2000);
  }
}

function handleWaiting(pong: Pong, message: any) {
  console.log(message.message);

  if (pong.GUI) {
    // Waiting message persists until other player joins
    pong.GUI.textFadeIn("WAITING");
  }
}

function handleGameReady(pong: Pong, message: any) {
  console.log("Game ready:", message.message);

  if (pong.GUI) {
    pong.GUI.textFadeOut("WAITING");

    if (pong.playerId === 1) {
      pong.GUI.textFadeIn("PLAYER_2_CONNECTED", 2000);
    }

    pong.GUI.textFadeIn("START");
    pong.GUI.toggleTextBlink(pong.scene, "START");
  }
}

function handleGameStart(pong: Pong, message: any) {
  console.log("Game starting!");
  pong.running = true;

  if (pong.GUI) {
    pong.GUI.toggleTextBlink(pong.scene, "START");
  }
}

function handleGameState(pong: Pong, message: any) {
  pong.serverGameState = message.state;
  pong.serverGameStateApplied = false;
}

function handleGameEvent(pong: Pong, message: any) {
  const event = message.event;

  if (!event) return;

  switch (event.type) {
    case "GAME_READY":
      handleGameReady(pong, event);
      break;
    case "GAME_START":
      handleGameStart(pong, event);
      break;
    case "WALL_COLLISION":
    case "PADDLE_COLLISION":
      handleCollision(pong, { collision: event });
      break;
    case "GOAL":
      handleScore(pong, event);
      break;
    default:
      console.log("Unknown game event:", event.type);
  }
}

function handleCollision(pong: Pong, message: any) {
  if (!message.collision) return;

  const { position, speed, angle, type } = message.collision;

  let splashZ = position.z;
  let splashAngle = -angle;

  if (pong.playerId === 2) {
    splashZ = -position.z;
    splashAngle = angle;
  }

  splashEffect(
    pong.scene,
    new Vector3(position.x, position.y, splashZ),
    speed,
    splashAngle,
    COLLISION_VFX,
  );
}

function handleScore(pong: Pong, message: any) {
  console.log("Score!", message);

  const { winner, score } = message;

  if (pong.GUI) {
    if (winner === pong.playerId) {
      pong.GUI.textFadeIn("YOU_WON");
    } else {
      pong.GUI.textFadeIn("YOU_LOST");
    }
    pong.GUI.toggleTextBlink(pong.scene, "START");
  }
}

function handlePlayerDisconnected(pong: Pong, message: any) {
  console.log("Player disconnected:", message.message);

  pong.running = false;

  if (pong.GUI) {
    pong.GUI.textFadeIn("OPPONENT_LEFT");
  }
}

export function sendReady(pong: Pong) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "READY",
      }),
    );
  }
}

export function sendDash(pong: Pong) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "DASH",
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


// REVISED FUNCTIONS BELOW

function handleSpellUsed(pong: Pong, message: any) {
  console.log("Spell used:", message);

  let player;
  message.enemy ? player = pong.player2 : player = pong.player1;

  let spellHand;
  message.offensive ? spellHand = player.offensiveSpell : spellHand = player.counterSpell;

  spellHand.activateSpell();
}

function handleSpellSwitched(pong: Pong, message: any) {
  console.log("Spell switched:", message);

  let player;
  message.enemy ? player = pong.player2 : player = pong.player1;

  let spellHand;
  message.offensive ? spellHand = player.offensiveSpell : spellHand = player.counterSpell;

  const SpellConstructor = GENERATE_SPELLS[message.spellType as keyof typeof GENERATE_SPELLS];
  spellHand = new SpellConstructor(pong, player, spellHand.name);
}

export function sendUseSpell(pong: Pong, offensive: boolean) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "USE_SPELL",
        offensive: offensive
      }),
    );
  }
}

export function sendSwitchSpell(pong: Pong, offensive: boolean) {
  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "SWITCH_SPELL",
        offensive: offensive
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