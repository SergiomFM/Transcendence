import { Vector3, Tools, Color4 } from "@babylonjs/core";
import { Events } from "./pongEvents";
import { splashEffect, COLLISION_VFX, updateArena } from "./pongVFX";
import { Ball, Player, Pong } from "./pong";

enum key {
  UP,
  LEFT,
  DOWN,
  RIGHT,
}

export function gameLogic(pong: Pong, delta: number) {
  if (pong.online) {
    onlineGameLogic(pong, delta);
  } else {
    localGameLogic(pong, delta);
  }
}

function localGameLogic(pong: Pong, delta: number) {
  if (!pong.running) {
    if (!pong.loaded) {
      return;
    }
    if (!pong.player1.ready && !pong.player2.ready) {
      return;
    } else {
      pong.running = true;
    }
  }

  movePadle(pong, delta, getPlayerDirection(pong.player2), pong.player2);
  movePadle(pong, delta, getPlayerDirection(pong.player1), pong.player1);
  moveBall(pong, delta, pong.ball);

  pong.player1.counterSpell.spellLoop(delta);
  pong.player2.counterSpell.spellLoop(delta);
  pong.player1.offensiveSpell.spellLoop(delta);
  pong.player2.offensiveSpell.spellLoop(delta);
}

function onlineGameLogic(pong: Pong, delta: number) {
  const localPlayer = pong.playerId === 1 ? pong.player1 : pong.player2;
  const playerDirection = getPlayerDirection(localPlayer);

  if (pong.socket && pong.socket.readyState === WebSocket.OPEN) {
    pong.socket.send(
      JSON.stringify({
        type: "INPUT",
        input: {
          direction: playerDirection,
        },
      })
    );
  }

  if (pong.serverGameState) {
    applyServerState(pong, pong.serverGameState);
  }

  pong.player1.counterSpell.spellLoop(delta);
  pong.player2.counterSpell.spellLoop(delta);
  pong.player1.offensiveSpell.spellLoop(delta);
  pong.player2.offensiveSpell.spellLoop(delta);
}

function applyServerState(pong: Pong, serverState: any) {
  if (serverState.ball) {
    (pong.ball as any).x = serverState.ball.x;
    (pong.ball as any).y = serverState.ball.y;

    if (pong.playerId === 2) {
      (pong.ball as any).z = -serverState.ball.z;
      pong.ball.setAngle(-serverState.ball.angle);
    } else {
      (pong.ball as any).z = serverState.ball.z;
      pong.ball.setAngle(serverState.ball.angle);
    }

    pong.ball.speed = serverState.ball.speed;

    if (serverState.ball.color && pong.online) {
      const c = serverState.ball.color;
      if (!pong._lastArenaColor)
        pong._lastArenaColor = { r: 1, g: 1, b: 1, a: 1 };
      const last = pong._lastArenaColor;
      if (
        c.r !== last.r ||
        c.g !== last.g ||
        c.b !== last.b ||
        c.a !== last.a
      ) {
        updateArena(pong.scene, new Color4(c.r, c.g, c.b, c.a), pong.ball);
        pong._lastArenaColor = { r: c.r, g: c.g, b: c.b, a: c.a };
      }
    }
  }

  if (pong.playerId === 2) {
    if (serverState.player2) {
      pong.player1.x = serverState.player2.x;
      pong.player1.currSpeed = serverState.player2.currSpeed;
      pong.player1.ready = serverState.player2.ready;
      pong.player1.failed = serverState.player2.failed;
    }

    if (serverState.player1) {
      pong.player2.x = serverState.player1.x;
      pong.player2.currSpeed = serverState.player1.currSpeed;
      pong.player2.ready = serverState.player1.ready;
      pong.player2.failed = serverState.player1.failed;
    }
  } else {
    if (serverState.player1) {
      pong.player1.x = serverState.player1.x;
      pong.player1.currSpeed = serverState.player1.currSpeed;
      pong.player1.ready = serverState.player1.ready;
      pong.player1.failed = serverState.player1.failed;
    }

    if (serverState.player2) {
      pong.player2.x = serverState.player2.x;
      pong.player2.currSpeed = serverState.player2.currSpeed;
      pong.player2.ready = serverState.player2.ready;
      pong.player2.failed = serverState.player2.failed;
    }
  }

  // Update game running state
  if (serverState.running !== undefined) {
    pong.running = serverState.running;
  }
}

// Detecting the player inputs
function getPlayerDirection(player: Player) {
  if (
    Events.keyStatus[player.keys[key.DOWN]] ||
    Events.keyStatus[player.keys[key.RIGHT]]
  )
    return 1;
  if (
    Events.keyStatus[player.keys[key.UP]] ||
    Events.keyStatus[player.keys[key.LEFT]]
  )
    return -1;

  return 0;
}

// Paddle collision check
function paddleCollision(pong: Pong, paddle: Player, signal: number) {
  let ball = pong.ball;

  if (
    ball.x <= paddle.x + paddle.size &&
    ball.x >= paddle.x - paddle.size &&
    !paddle.failed
  ) {
    const maxBounceAngle = paddle.maxDeviationAngle;
    const hitOffset = (ball.x - paddle.x) / paddle.size;
    const deviation = Math.max(-1, Math.min(1, hitOffset));
    const bounceAngle = 90 - deviation * maxBounceAngle;
    ball.setAngle(Tools.ToRadians(bounceAngle) * signal);

    ball.z = paddle.z - (-ball.z + paddle.z);
    ball.speed += ball.speedIncrement;

    splashEffect(
      pong.scene,
      new Vector3(ball.x, ball.y, paddle.z),
      ball.speed,
      -ball.angle,
      COLLISION_VFX
    );
  } else {
    paddle.failed = true;
  }
}

// Paddle movement function
function movePadle(
  pong: Pong,
  delta: number,
  direction: number,
  player: Player
) {
  player.playerDashLogic(delta * 1000, direction);

  // Refreshing the paddle movement when there is input
  if (direction) {
    player.currSpeed = player.maxSpeed;
    player.direction = direction;
  }

  // Moving the paddle if it wants to move
  player.x += player.currSpeed * delta * player.direction;

  // Smoothly stop the paddle
  player.currSpeed -= player.drag * delta;
  if (player.currSpeed < 0) {
    player.currSpeed = 0;
  }

  // Checking if the paddle has hit the wall
  const limit = pong.heightLimit - player.size;
  if (player.x > limit) {
    player.x = limit;
  } else if (player.x < -limit) {
    player.x = -limit;
  }
}

// Ball movement function
function moveBall(pong: Pong, delta: number, ball: Ball) {
  // Locals to avoid property access
  const Xlimit = pong.heightLimit;

  let oldX = ball.x;
  let oldZ = ball.z;

  // Moving the ball
  let newX = oldX + ball.cos * ball.speed * delta;
  let newZ = oldZ + ball.sin * ball.speed * delta;
  ball.z = newZ;
  ball.x = newX;

  // In case of collision it changes the angle and bounces the ball back
  if (Math.abs(newX) > Xlimit) {
    // Determine which side collided
    const sign = newX > 0 ? 1 : -1;

    // Bounce Effect
    splashEffect(
      pong.scene,
      new Vector3(Xlimit * sign, ball.y, (newZ + oldZ) * 0.5),
      ball.speed,
      Tools.ToRadians(0 + 180 * Number(newX > 0)),
      COLLISION_VFX
    );

    // Changing the ball angle and x value to the amount it should reflect
    ball.x = Xlimit * sign - (newX - Xlimit * sign);
    ball.setAngle(Math.PI - ball.angle);
  }

  // Paddle collisions
  if (newZ >= pong.player1.z) {
    paddleCollision(pong, pong.player1, -1);
  } else if (newZ <= pong.player2.z) {
    paddleCollision(pong, pong.player2, 1);
  }

  // Goal scoring condidion
  if (Math.abs(newZ) >= pong.widthLimit) {
    playerScore(pong, ball);
  }
}

// Player scoring
function playerScore(pong: Pong, ball: Ball) {
  if (ball.z > 0) {
    if (pong.online) pong.GUI.textFadeIn("ROUND_LOST");
    else pong.GUI.textFadeIn("PLAYER_2_WIN");
    pong.GUI.toggleTextBlink(pong.scene, "START");
    ball.setAngle(Tools.ToRadians(90));
  } else {
    if (pong.online) {
      pong.GUI.textFadeIn("ROUND_WON");
    } else {
      pong.GUI.textFadeIn("PLAYER_1_WIN");
    }
    pong.GUI.toggleTextBlink(pong.scene, "START");
    ball.setAngle(Tools.ToRadians(-90));
  }

  // Reseting attributes
  ball.x = 0;
  ball.z = 0;
  ball.speed = ball.initalSpeed;

  pong.player1.x = 0;
  pong.player1.currSpeed = 0;
  pong.player1.failed = false;
  pong.player1.ready = false;

  pong.player2.x = 0;
  pong.player2.currSpeed = 0;
  pong.player2.failed = false;
  pong.player2.ready = false;

  pong.player1.counterSpell.resetSpell();
  pong.player1.offensiveSpell.resetSpell();

  pong.player2.counterSpell.resetSpell();
  pong.player2.offensiveSpell.resetSpell();

  // Reset arena color to white
  const defaultColor = new Color4(1, 1, 1, 1);
  updateArena(pong.scene, defaultColor, ball);
  let light = pong.scene.getLightById("ball")!;
  if (light) {
    light.diffuse.set(1, 1, 1);
  }

  pong.running = false;
  //pong.loaded = true; // Need to set load as false and then to true when UI Done
}
