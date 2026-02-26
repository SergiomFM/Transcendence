import { Vector3, Tools, Scene } from "@babylonjs/core";
import {
  splashEffect,
  COLLISION_VFX,
  spellReadyVFX,
  resetRoundColor,
} from "./pongVFX";
import { Ball, Player, Pong } from "./pong";
import { Spell, getNewSpell } from "./pongSpells";
import { GAME_CONSTANTS } from "@/shared/constants";
import { sfxPaddleHit, sfxWallHit, sfxScore, sfxLostRound, sfxSpellReady } from "./pongAudio";

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



  // Run spell effects BEFORE ball movement so that angle changes from spells
  // (especially BallIman) are applied before the collision check uses them.
  // This matches the server-side execution order in game.js.
  pong.player1.counterSpell.spellLoop(delta);
  pong.player2.counterSpell.spellLoop(delta);
  pong.player1.offensiveSpell.spellLoop(delta);
  pong.player2.offensiveSpell.spellLoop(delta);

  movePadle(pong, delta, pong.player2);
  movePadle(pong, delta, pong.player1);
  moveBall(pong, delta, pong.ball);
}

function onlineGameLogic(pong: Pong) {
  if (pong.serverGameState && !pong.serverGameStateApplied) {
    applyServerState(pong, pong.serverGameState);
    pong.serverGameStateApplied = true;
  }
}

function updateSpellFromServer(spell: Spell, serverSpellData: Record<string, unknown>, scene: Scene, pong: Pong, isLocalPlayer: boolean) {
  // When game is not running, reset cooldown so spell balls don't grow between rounds
  if (!pong.running) {
    spell.cooldownElapsed = 0;
    spell.ready = false;
    return;
  }
  spell.cooldownElapsed = serverSpellData.cooldownElapsed as number;
  if (serverSpellData.spellReady && !spell.ready) {
    spell.ready = true;
    spellReadyVFX(scene, spell);
    // Only play SFX for the local player's own spells
    if (isLocalPlayer && !pong.isSpectator) {
      sfxSpellReady();
    }
  } else if (!serverSpellData.spellReady) {
    spell.ready = false;
  }
}

function updatePlayerFromServer(
  player: Player,
  serverPlayerData: Record<string, unknown>,
  scene: Scene,
  pong: Pong,
  isLocalPlayer: boolean,
) {
  player.x = serverPlayerData.x as number;
  if (serverPlayerData.name !== undefined) {
    player.name = serverPlayerData.name as string;
  }

  // Reconcile spell types: if the server's spell doesn't match the client's, recreate it
  if (serverPlayerData.currentOffensiveSpell &&
      player.offensiveSpell.spellType !== serverPlayerData.currentOffensiveSpell) {
    player.offensiveSpell = getNewSpell(
      pong, player, player.offensiveSpell, serverPlayerData.currentOffensiveSpell as string,
    );
  }
  if (serverPlayerData.currentCounterSpell &&
      player.counterSpell.spellType !== serverPlayerData.currentCounterSpell) {
    player.counterSpell = getNewSpell(
      pong, player, player.counterSpell, serverPlayerData.currentCounterSpell as string,
    );
  }

  updateSpellFromServer(
    player.offensiveSpell,
    {
      cooldownElapsed: serverPlayerData.offensiveCooldownElapsed,
      spellReady: serverPlayerData.offensiveSpellReady,
    } as Record<string, unknown>,
    scene,
    pong,
    isLocalPlayer,
  );
  updateSpellFromServer(
    player.counterSpell,
    {
      cooldownElapsed: serverPlayerData.counterCooldownElapsed,
      spellReady: serverPlayerData.counterSpellReady,
    } as Record<string, unknown>,
    scene,
    pong,
    isLocalPlayer,
  );
}

function applyServerState(pong: Pong, serverState: Record<string, unknown>) {
  const ball = serverState.ball as Record<string, unknown>;
  const player1 = serverState.player1 as Record<string, unknown>;
  const player2 = serverState.player2 as Record<string, unknown>;

  pong.ball.x = ball.x as number;
  pong.ball.z = ball.z as number;
  pong.ball.setAngle(ball.angle as number);

  updatePlayerFromServer(pong.player1, player1, pong.scene, pong, true);
  updatePlayerFromServer(pong.player2, player2, pong.scene, pong, false);

  if (pong.GUI) {
    if (typeof player1.score === "number") {
      pong.player1.score = player1.score;
    }
    if (typeof player2.score === "number") {
      pong.player2.score = player2.score;
    }
    pong.GUI.updateScores(pong.player1.score, pong.player2.score);

    if (pong.isSpectator) {
      pong.GUI.updateSpectatorNames(pong.player1.name, pong.player2.name);
      pong.GUI.showSpectatorNames();
    }
  }

  pong.running = serverState.running as boolean;
}

// Paddle collision check
function paddleCollision(
  pong: Pong,
  paddle: Player,
  signal: number,
  oldX: number,
  oldZ: number,
) {
  const ball = pong.ball;

  // Interpolate the ball's actual X position at the paddle's Z line
  // using the real movement trajectory (oldX,oldZ -> ball.x,ball.z).
  // This is robust against spells that change the ball angle mid-flight
  // (e.g. BallIman), unlike the old back-projection via ball.cos/ball.sin.
  const moveZ = ball.z - oldZ;
  let collisionX: number;
  if (Math.abs(moveZ) > 1e-8) {
    const t = (paddle.z - oldZ) / moveZ;
    collisionX = oldX + (ball.x - oldX) * t;
  } else {
    collisionX = ball.x;
  }

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
    sfxPaddleHit();
  } else {
    paddle.failed = true;
  }
}

// Paddle movement function
function movePadle(pong: Pong, delta: number, player: Player) {
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
  const oldZ = ball.z;

  // Moving the ball
  let newX = oldX + ball.cos * ball.speed * delta;
  const newZ = oldZ + ball.sin * ball.speed * delta;
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
    sfxWallHit();

    // Changing the ball angle and x value to the amount it should reflect
    ball.x = Xlimit * sign - (newX - Xlimit * sign);
    ball.setAngle(Math.PI - ball.angle);
    
    // Update oldX and newX for paddle collision check (ball bounced from wall)
    oldX = Xlimit * sign;
    newX = ball.x;
  }

  // Paddle collisions (pass old position for trajectory interpolation)
  if (newZ >= pong.player1.z) {
    paddleCollision(pong, pong.player1, -1, oldX, oldZ);
  } else if (newZ <= pong.player2.z) {
    paddleCollision(pong, pong.player2, 1, oldX, oldZ);
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
    sfxLostRound();
  } else {
    // Player 1 scored
    pong.player1.score++;
    pong.GUI.roundWonUI(false, pong.player1.score, pong.player2.score);
    ball.setAngle(Tools.ToRadians(-90));
    sfxScore();
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
  resetRoundColor(pong);

  pong.running = false;
  pong.startingRound = false;
  //pong.loaded = true; // Need to set load as false and then to true when UI Done
}
