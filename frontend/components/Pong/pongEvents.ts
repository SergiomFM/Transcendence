import { ActionEvent, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { switchPlayerHandsPosition } from "./pongAnimations";
import { PongCamera } from "./pongCamera";
import { Ball, Player, Pong } from "./pong";
import {
  sendPlayerReady,
  sendBecomePlayer,
  sendUseDash,
  sendSwitchSpell,
  sendUseSpell,
  sendPlayerDirection,
  sendBecomeSpectator,
} from "./pongSocket";

enum PLAYER_KEYS {
  UP,
  LEFT,
  DOWN,
  RIGHT,
  COUNTER_SPELL,
  OFFENSIVE_SPELL,
  DASH,
}

let player1Keys = [
  "w", // UP
  "a", // LEFT
  "s", // DOWN
  "d", // RIGHT
  "q", // COUNTER SPELL
  "e", // OFFENSIVE SPELL
  "Shift", // DASH
];

let player2Keys = [
  "arrowup", // UP
  "arrowleft", // LEFT
  "arrowdown", // DOWN
  "arrowright", // RIGHT
  "k", // COUNTER SPELL
  "l", // OFFENSIVE SPELL
  ".", // DASH
];

enum MENU_KEY {
  READY,
  ACTION,
}

let menuKeys = [
  " ", // READY
  "c", // ACTION
];

export namespace Events {
  function dispatchUiEvent(name: string, detail: Record<string, unknown>) {
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  export function emitSpectatorState(pong: Pong) {
    dispatchUiEvent("pong:spectator", { isSpectator: pong.isSpectator });
  }

  export function emitReadyState(pong: Pong) {
    const isReady = pong.online ? pong.localReady : pong.player1.ready;
    dispatchUiEvent("pong:ready", { isReady });
  }
  // Key status
  export let keyStatus: { [key: string]: boolean } = {
    [player1Keys[0]]: false,
    [player1Keys[1]]: false,
    [player1Keys[2]]: false,
    [player1Keys[3]]: false,
    [player2Keys[0]]: false,
    [player2Keys[1]]: false,
    [player2Keys[2]]: false,
    [player2Keys[3]]: false,
  };
  const player1KeysSlice = Object.keys(keyStatus).slice(0, 4);
  const player2KeysSlice = Object.keys(keyStatus).slice(4, 8);

  // Key press input
  export function keyPressEvent(
    pong: Pong,
    camera: PongCamera,
    event: ActionEvent,
  ) {
    let key = event.sourceEvent.key;
    if (key !== "Shift") {
      key = key.toLowerCase();
    }
    if (key in keyStatus && keyStatus[key] != true) {
      PlayerDirectionEvent(key, pong, true);
    } else if (key == menuKeys[MENU_KEY.ACTION]) {
      if (pong.online) {
        if (pong.isSpectator) {
          if (pong.seatsAvailable > 0) {
            sendBecomePlayer(pong);
          }
        } else {
          sendBecomeSpectator(pong);
          pong.isSpectator = true;
          pong.playerId = null;
          pong.player1.score = 0;
          pong.player2.score = 0;
          if (pong.GUI) {
            pong.GUI.spectatorModeUI(pong.seatsAvailable);
            pong.GUI.updateScores(pong.player1.score, pong.player2.score);
            pong.GUI.hideOtherPlayerReady();
          }
          if (pong.camera) {
            pong.camera.setView(true, true);
            switchPlayerHandsPosition(pong, pong.camera.topView, false);
          }
          emitSpectatorState(pong);
        }
      } else {
        // Changes the camera perspective and moves scene elements
        camera.switchCameraPOV();
        switchPlayerHandsPosition(pong, camera.topView, false);
      }
    } else if (key == menuKeys[MENU_KEY.READY]) {
      if (pong.online && !pong.isSpectator) {
        if (pong.running || pong.localReady) {
          return;
        }
        pong.localReady = true;
        if (pong.GUI) {
          pong.GUI.hideOtherPlayerReady();
          pong.GUI.waitingForOpponentReadyUI();
        }
        sendPlayerReady(pong);
        emitReadyState(pong);
      } else if (pong.online && pong.isSpectator) {
        return;
      } else if (!pong.online) {
        pong.player1.ready = true;
        pong.player2.ready = true;
        emitReadyState(pong);
      }
    } else if (pong.loaded && !pong.running) {
      waitingForStartEvents(key, pong);
    } else if (pong.loaded && pong.running) {
      playerUseSpellEvent(key, pong);
      playerDashEvent(key, pong);
    }
    console.log(key);
  }

  function waitingForStartEvents(key: any, pong: Pong) {
    if (key == menuKeys[MENU_KEY.READY]) {
      if (pong.online) {
        if (pong.running || pong.localReady) {
          return;
        }
        pong.localReady = true;
        sendPlayerReady(pong);
        emitReadyState(pong);
      } else {
        pong.player1.ready = true;
        pong.player2.ready = true;
        emitReadyState(pong);
      }
    } else {
      playerSwitchSpellEvent(key, pong);
    }
  }

  // Detecting the player inputs
  function getPlayerDirection(player: Player) {
    let direction = 0;
    if (
      Events.keyStatus[player.keys[PLAYER_KEYS.DOWN]] ||
      Events.keyStatus[player.keys[PLAYER_KEYS.RIGHT]]
    )
      direction += 1;
    if (
      Events.keyStatus[player.keys[PLAYER_KEYS.UP]] ||
      Events.keyStatus[player.keys[PLAYER_KEYS.LEFT]]
    )
      direction -= 1;

    return direction;
  }

  function PlayerDirectionEvent(key: any, pong: Pong, isKeyDown: boolean) {
    keyStatus[key] = isKeyDown;
    console.log(keyStatus);

    if (player1KeysSlice.includes(key)) {
      if (pong.online && pong.isSpectator) {
        return;
      }
      const direction = getPlayerDirection(pong.player1);
      pong.player1.direction = direction;
      if (pong.online) {
        sendPlayerDirection(pong, direction);
      }
    }
    if (player2KeysSlice.includes(key)) {
      pong.player2.direction = getPlayerDirection(pong.player2);
    }
  }

  function playerSwitchSpellEvent(key: any, pong: Pong) {
    if (pong.online && pong.isSpectator) {
      return;
    }
    if (key == player1Keys[PLAYER_KEYS.COUNTER_SPELL]) {
      pong.online
        ? sendSwitchSpell(pong, false)
        : pong.player1.counterSpell.switchSpell();
    } else if (key == player1Keys[PLAYER_KEYS.OFFENSIVE_SPELL]) {
      pong.online
        ? sendSwitchSpell(pong, true)
        : pong.player1.offensiveSpell.switchSpell();
    }

    // Dont check for player 2 inputs if the game is online
    if (!pong.online) {
      if (key == player2Keys[PLAYER_KEYS.COUNTER_SPELL]) {
        pong.player2.counterSpell.switchSpell();
      } else if (key == player2Keys[PLAYER_KEYS.OFFENSIVE_SPELL]) {
        pong.player2.offensiveSpell.switchSpell();
      }
    }
  }

  function playerUseSpellEvent(key: any, pong: Pong) {
    if (pong.online && pong.isSpectator) {
      return;
    }
    if (key == player1Keys[PLAYER_KEYS.COUNTER_SPELL]) {
      pong.online
        ? sendUseSpell(pong, false)
        : pong.player1.counterSpell.useSpell(false);
    } else if (key == player1Keys[PLAYER_KEYS.OFFENSIVE_SPELL]) {
      pong.online
        ? sendUseSpell(pong, true)
        : pong.player1.offensiveSpell.useSpell(true);
    }

    if (!pong.online) {
      if (key == player2Keys[PLAYER_KEYS.COUNTER_SPELL])
        pong.player2.counterSpell.useSpell(false);
      else if (key == player2Keys[PLAYER_KEYS.OFFENSIVE_SPELL])
        pong.player2.offensiveSpell.useSpell(true);
    }
  }

  function playerDashEvent(key: any, pong: Pong) {
    if (pong.online && pong.isSpectator) {
      return;
    }
    if (key == player1Keys[PLAYER_KEYS.DASH]) {
      if (pong.player1.dashReady) {
        pong.player1.dashActive = true;
      }
      if (pong.online) {
        sendUseDash(pong);
      }
    }
    if (key == player2Keys[PLAYER_KEYS.DASH]) {
      if (pong.player2.dashReady) pong.player2.dashActive = true;
    }
  }

  // Key release input
  export function keyReleaseEvent(pong: Pong, event: ActionEvent) {
    let key = event.sourceEvent.key;
    if (key !== "Shift") {
      key = key.toLowerCase();
    }
    if (key in keyStatus && keyStatus[key] != false) {
      PlayerDirectionEvent(key, pong, false);
    }
  }

  // Registering events
  export function registerEvents(pong: Pong) {
    // Instantiating an Action Manager
    pong.scene.actionManager = new ActionManager(pong.scene);

    // Registering Key Pressing
    pong.scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (event) =>
        keyPressEvent(pong, pong.camera, event),
      ),
    );

    // Registering Key Releasing
    pong.scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (event) =>
        keyReleaseEvent(pong, event),
      ),
    );
  }

  // Assigning keys to each player
  export function assignKeys(pong: Pong) {
    if (pong.online) {
      pong.player1.keys = player1Keys;
      pong.player2.keys = []; // No keys for player 2 in online mode
    } else {
      pong.player1.keys = player1Keys;
      pong.player2.keys = player2Keys;
    }
  }
}
