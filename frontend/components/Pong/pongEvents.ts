import { ActionEvent, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { switchPlayerHandsPosition } from "./pongAnimations";
import { PongCamera } from "./pongCamera";
import { Pong } from "./pong";
import { sendReady, sendDash } from "./pongSocket";

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
  SWITCH_VIEW,
}

let menuKeys = [
  " ", // READY
  "c", // SWITCH_VIEW
];

export namespace Events {
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
      keyStatus[key] = true;
      if (pong.online) {
        //Send to Backend Info - TODO
        //console.log("sent: ", keyStatus[key]);
      }
    } else if (key == menuKeys[MENU_KEY.SWITCH_VIEW]) {
      // Changes the camera perspective and moves scene elements
      camera.switchCameraPOV();
      switchPlayerHandsPosition(pong, camera.topView);
    } else if (pong.loaded && !pong.running) waitingForStartEvents(key, pong);

    playerSpellsEvent(key, pong);
    playerDashEvent(key, pong);

    console.log(key);
  }

  function waitingForStartEvents(key: any, pong: Pong) {
    if (key == menuKeys[MENU_KEY.READY]) {
      if (pong.online) {
        // Send ready signal to server
        sendReady(pong);
        pong.player1.ready = true;
        pong.GUI.textFadeOut("YOU_WON");
        pong.GUI.textFadeOut("YOU_LOST");
      } else {
        pong.player1.ready = true;
        pong.player2.ready = true;
        pong.GUI.toggleTextBlink(pong.scene, "START");
        pong.GUI.textFadeOut("YOU_WON");
        pong.GUI.textFadeOut("YOU_LOST");
        pong.GUI.textFadeOut("PLAYER_1_WIN");
        pong.GUI.textFadeOut("PLAYER_2_WIN");
      }
    } else playerSwitchSpellEvent(key, pong);
  }

  function playerSwitchSpellEvent(key: any, pong: Pong) {
    if (key == player1Keys[PLAYER_KEYS.COUNTER_SPELL])
      pong.player1.counterSpell.switchSpell();
    else if (key == player1Keys[PLAYER_KEYS.OFFENSIVE_SPELL])
      pong.player1.offensiveSpell.switchSpell();
    if (key == player2Keys[PLAYER_KEYS.COUNTER_SPELL])
      pong.player2.counterSpell.switchSpell();
    else if (key == player2Keys[PLAYER_KEYS.OFFENSIVE_SPELL])
      pong.player2.offensiveSpell.switchSpell();
  }

  function playerSpellsEvent(key: any, pong: Pong) {
    if (key == player1Keys[PLAYER_KEYS.COUNTER_SPELL])
      pong.player1.counterSpell.useSpell();
    else if (key == player1Keys[PLAYER_KEYS.OFFENSIVE_SPELL])
      pong.player1.offensiveSpell.useSpell();
    if (key == player2Keys[PLAYER_KEYS.COUNTER_SPELL])
      pong.player2.counterSpell.useSpell();
    else if (key == player2Keys[PLAYER_KEYS.OFFENSIVE_SPELL])
      pong.player2.offensiveSpell.useSpell();
  }

  function playerDashEvent(key: any, pong: Pong) {
    if (key == player1Keys[PLAYER_KEYS.DASH]) {
      if (pong.player1.dashReady) {
        pong.player1.dashActive = true;
        // Send dash to server if online
        if (pong.online) {
          sendDash(pong);
        }
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
      keyStatus[key] = false;
      if (pong.online) {
        //Send to Backend Info - TODO
        //console.log(keyStatus[key]);
      }
    }
    //console.log(key);
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
    if (pong.online && pong.playerId) {
      console.log(`[assignKeys] Online mode, playerId: ${pong.playerId}`);
      if (pong.playerId === 1) {
        // Player 1: use WASD to control player1 paddle
        pong.player1.keys = player1Keys;
        pong.player2.keys = []; // Don't control player2
        console.log(`[assignKeys] Player 1: WASD controls player1`);
      } else if (pong.playerId === 2) {
        // Player 2: use WASD to control player2 paddle (more intuitive)
        pong.player2.keys = player1Keys; // Use WASD for their paddle
        pong.player1.keys = []; // Don't control player1
        console.log(`[assignKeys] Player 2: WASD controls player2`);
      }
    } else {
      pong.player1.keys = player1Keys;
      pong.player2.keys = player2Keys;
      console.log(`[assignKeys] Local mode or waiting for playerId`);
    }
  }
}
