import { Vector3, Tools, Color4 } from "@babylonjs/core";
import { Events } from "./pongEvents";
import {
  splashEffect,
  COLLISION_VFX,
  updateArena,
  spellReadyVFX,
  resetRoundColor,
} from "./pongVFX";
import { Ball, Player, Pong } from "./pong";
import { Spell } from "./pongSpells";
import { GAME_CONSTANTS } from "@/shared/constants";

export function gameLogic(pong: Pong, delta: number) {
  if (pong.online) {
    onlineGameLogic(pong);
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
    } else if (!pong.startingRound) {
      pong.startingRound = true;
      pong.GUI.startRoundUI();
      setTimeout(() => {
        pong.running = true;
        pong.startingRound = false;
      }, GAME_CONSTANTS.ROUND_START_DELAY);
    }
    return;
  }

  movePadle(pong, delta, pong.player2);
  movePadle(pong, delta, pong.player1);
  moveBall(pong, delta, pong.ball);

  pong.player1.counterSpell.spellLoop(delta);
  pong.player2.counterSpell.spellLoop(delta);
  pong.player1.offensiveSpell.spellLoop(delta);
  pong.player2.offensiveSpell.spellLoop(delta);
}

function onlineGameLogic(pong: Pong) {
  if (pong.serverGameState && !pong.serverGameStateApplied) {
    applyServerState(pong, pong.serverGameState);
    pong.serverGameStateApplied = true;
  }
}

function updateSpellFromServer(spell: Spell, serverSpellData: any, scene: any) {
  spell.cooldownElapsed = serverSpellData.cooldownElapsed;
  if (serverSpellData.spellReady && !spell.ready) {
    spell.ready = true;
    spellReadyVFX(scene, spell);
  } else if (!serverSpellData.spellReady) {
    spell.ready = false;
  }
}

function updatePlayerFromServer(
  player: Player,
  serverPlayerData: any,
  scene: any,
) {
  player.x = serverPlayerData.x;
  if (serverPlayerData.name) {
    player.name = serverPlayerData.name;
  }
  updateSpellFromServer(
    player.offensiveSpell,
    {
      cooldownElapsed: serverPlayerData.offensiveCooldownElapsed,
      spellReady: serverPlayerData.offensiveSpellReady,
    },
    scene,
  );
  updateSpellFromServer(
    player.counterSpell,
    {
      cooldownElapsed: serverPlayerData.counterCooldownElapsed,
      spellReady: serverPlayerData.counterSpellReady,
    },
    scene,
  );
}

function applyServerState(pong: Pong, serverState: any) {
  pong.ball.x = serverState.ball.x;
  pong.ball.z = serverState.ball.z;
  pong.ball.setAngle(serverState.ball.angle);

  updatePlayerFromServer(pong.player1, serverState.player1, pong.scene);
  updatePlayerFromServer(pong.player2, serverState.player2, pong.scene);

  if (pong.GUI) {
    if (typeof serverState.player1.score === "number") {
      pong.player1.score = serverState.player1.score;
    }
    if (typeof serverState.player2.score === "number") {
      pong.player2.score = serverState.player2.score;
    }
    pong.GUI.updateScores(pong.player1.score, pong.player2.score);
  }

  pong.running = serverState.running;
}

// Paddle collision check
function paddleCollision(
  pong: Pong,
  paddle: Player,
  signal: number,
) {
  let ball = pong.ball;

  // Calculating the collision point using the ball angle
  const deltaZ = ball.z - paddle.z;
  const deltaX = deltaZ * (ball.cos / ball.sin);
  const collisionX = ball.x - deltaX;

  if (
    collisionX <= paddle.x + paddle.size &&
    collisionX >= paddle.x - paddle.size &&
    !paddle.failed
  ) {
    const maxBounceAngle = paddle.maxDeviationAngle;
    const hitOffset = (collisionX - paddle.x) / paddle.size;
    const deviation = Math.max(-1, Math.min(1, hitOffset));
    const bounceAngle = 90 - deviation * maxBounceAngle;
    ball.setAngle(Tools.ToRadians(bounceAngle) * signal);

    ball.z = paddle.z - (-ball.z + paddle.z);
    
    if (ball.speed < ball.maxSpeed){
      ball.speed += ball.speedIncrement;
      if (ball.speed > ball.maxSpeed) {
        ball.speed = ball.maxSpeed;
      }
    }
  
    splashEffect(
      pong.scene,
      new Vector3(collisionX, ball.y, paddle.z),
      ball.speed,
      -ball.angle,
      COLLISION_VFX,
    );
  } else {
    paddle.failed = true;
  }
}

// Paddle movement function
function movePadle(pong: Pong, delta: number, player: Player) {
  player.playerDashLogic(delta * 1000, player.direction);

  // Refreshing the paddle movement when there is input
  if (player.direction) {
    player.currSpeed = player.maxSpeed;
    player.currDirection = player.direction;
  }

  // Moving the paddle if it wants to move
  player.x += player.currSpeed * delta * player.currDirection;

  // Smoothly stop the paddle
  player.currSpeed -= player.drag * delta;
  if (player.currSpeed < 0) {
    player.currSpeed = 0;
    player.currDirection = 0;
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

    // Calculate the actual collision point Z position
    const t = (Xlimit * sign - oldX) / (newX - oldX); // fraction of movement when collision occurred
    const collisionZ = oldZ + (newZ - oldZ) * t;

    // Bounce Effect
    splashEffect(
      pong.scene,
      new Vector3(Xlimit * sign, ball.y, collisionZ),
      ball.speed,
      Tools.ToRadians(0 + 180 * Number(newX > 0)),
      COLLISION_VFX,
    );

    // Changing the ball angle and x value to the amount it should reflect
    ball.x = Xlimit * sign - (newX - Xlimit * sign);
    ball.setAngle(Math.PI - ball.angle);
    
    // Update oldX and newX for paddle collision check (ball bounced from wall)
    oldX = Xlimit * sign;
    newX = ball.x;
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
    // Player 2 scored
    pong.player2.score++;
    pong.GUI.roundLostUI(false, pong.player1.score, pong.player2.score);
    ball.setAngle(Tools.ToRadians(90));
  } else {
    // Player 1 scored
    pong.player1.score++;
    pong.GUI.roundWonUI(false, pong.player1.score, pong.player2.score);
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

  Events.emitReadyState(pong);

  pong.player1.counterSpell.resetSpell();
  pong.player1.offensiveSpell.resetSpell();

  pong.player2.counterSpell.resetSpell();
  pong.player2.offensiveSpell.resetSpell();

  // Reset arena color to white
  resetRoundColor(pong);

  pong.running = false;
  pong.startingRound = false;
  //pong.loaded = true; // Need to set load as false and then to true when UI Done
}
