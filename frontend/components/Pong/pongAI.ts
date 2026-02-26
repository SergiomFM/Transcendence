import { Pong, Player } from "./pong";
import { SPELL_CONSTANTS } from "@/shared/constants";


// --- Difficulty tuning ---
// Movement
const AI_MAX_SPEED_FACTOR = 0.72; // AI paddle speed as fraction of player max speed
const AI_DEAD_ZONE = 0.12; // distance within which AI considers "close enough" and stops
const AI_REACTION_DELAY = 250; // ms before AI reacts to ball direction changes

// Prediction imperfection
const AI_PREDICTION_ERROR = 0.25; // max random offset added to predicted X (in world units)
const AI_ERROR_UPDATE_INTERVAL = 800; // ms between re-rolling the prediction error
const AI_MISS_CHANCE = 0.08; // probability per error update that AI picks a wildly wrong target
const AI_MISS_ERROR = 0.6; // how far off the miss target is

// "Return to center" behavior when ball goes away
const AI_RETURN_SPEED_FACTOR = 0.5; // how aggressively AI returns to center (fraction of max speed)
const AI_CENTER_DEAD_ZONE = 0.15; // dead zone when drifting back to center

// Spell usage
const AI_SPELL_CHECK_INTERVAL = 1500; // ms between spell usage checks
const AI_DEFENSIVE_SPELL_CHANCE = 0.30; // chance to use defensive spell when conditions are right
const AI_OFFENSIVE_SPELL_CHANCE = 0.25; // chance to use offensive spell when conditions are right
const AI_PORTAL_SPELL_CHANCE = 0.4; // portal is strong but conditions are narrow, so chance needs to be reasonable
const AI_DEFENSIVE_PROXIMITY = 0.4; // ball must be within this fraction of field distance to AI before defensive spell
const AI_SWITCH_SPELL_INTERVAL = 10000; // ms between considering spell switches
const AI_SWITCH_SPELL_CHANCE = 0.25; // chance to switch spell type

// --- State ---
let lastSpellCheck = 0;
let lastSwitchCheck = 0;
let currentTargetX = 0;
let predictionError = 0;
let lastErrorUpdate = 0;
let reactionTimer = 0;
let lastBallDirection = 0;
let originalMaxSpeed = 0;
let aiSpeedApplied = false;

/**
 * Predict where the ball will intersect the AI paddle's Z line,
 * accounting for wall bounces.
 */
function predictBallX(pong: Pong): number {
  const ball = pong.ball;
  const targetZ = pong.player2.z;
  const heightLimit = pong.heightLimit;

  // If ball is moving away from AI (toward player 1), return center
  if (ball.sin >= 0) {
    return 0;
  }

  // Ray-march prediction with wall bounces
  let simX = ball.x;
  let simZ = ball.z;
  let simCos = ball.cos;
  let simSin = ball.sin;

  const maxIterations = 30;
  for (let i = 0; i < maxIterations; i++) {
    if (simSin === 0) break;

    const tZ = (targetZ - simZ) / simSin;
    if (tZ <= 0) break;

    let tWall = Infinity;
    if (simCos > 0) {
      tWall = (heightLimit - simX) / simCos;
    } else if (simCos < 0) {
      tWall = (-heightLimit - simX) / simCos;
    }

    if (tWall > 0 && tWall < tZ) {
      simX += simCos * tWall;
      simZ += simSin * tWall;
      simCos = -simCos;
    } else {
      simX += simCos * tZ;
      return simX;
    }
  }

  return simX;
}

/**
 * Called every frame to update AI player 2's direction and spells.
 */
export function updateAI(pong: Pong, deltaMs: number): void {
  const player2 = pong.player2;
  const ball = pong.ball;
  const now = performance.now();

  // Apply AI speed cap once (after player is initialized with full speed)
  if (!aiSpeedApplied && player2.maxSpeed > 0) {
    originalMaxSpeed = player2.maxSpeed;
    player2.maxSpeed = originalMaxSpeed * AI_MAX_SPEED_FACTOR;
    aiSpeedApplied = true;
  }

  // --- Reaction delay on direction changes ---
  const ballDir = Math.sign(ball.sin);
  if (ballDir !== lastBallDirection) {
    reactionTimer = AI_REACTION_DELAY;
    lastBallDirection = ballDir;
  }

  if (reactionTimer > 0) {
    reactionTimer -= deltaMs;
    // During reaction delay, keep moving in current direction (momentum)
    // but don't update the target — simulates slow reaction
    return;
  }

  // --- Update prediction error periodically ---
  if (now - lastErrorUpdate > AI_ERROR_UPDATE_INTERVAL) {
    if (Math.random() < AI_MISS_CHANCE) {
      // Occasional big miss — AI reads the ball wrong
      predictionError = (Math.random() - 0.5) * 2 * AI_MISS_ERROR;
    } else {
      predictionError = (Math.random() - 0.5) * 2 * AI_PREDICTION_ERROR;
    }
    lastErrorUpdate = now;
  }

  // --- Determine target position ---
  if (ball.sin < 0) {
    // Ball heading toward AI — predict where it will arrive
    const rawPrediction = predictBallX(pong);
    currentTargetX = rawPrediction + predictionError;
  } else {
    // Ball heading away — lazily drift back toward center
    currentTargetX = 0;
  }

  // --- Move paddle toward target ---
  const diff = currentTargetX - player2.x;
  const deadZone = ball.sin < 0 ? AI_DEAD_ZONE : AI_CENTER_DEAD_ZONE;

  if (Math.abs(diff) < deadZone) {
    // Close enough — stop moving (prevents jitter)
    player2.direction = 0;
  } else if (diff > 0) {
    player2.direction = 1;
  } else {
    player2.direction = -1;
  }

  // When returning to center, use slower speed by temporarily reducing further
  // (The speed cap is already applied, this just makes the return less urgent)
  if (ball.sin >= 0 && Math.abs(diff) > AI_CENTER_DEAD_ZONE) {
    // We don't change maxSpeed here since it's already capped.
    // The natural drag in movePadle() handles deceleration.
  }

  // --- Spell usage ---
  handleAISpells(pong, player2, now);
}

/**
 * Contextual spell usage — not spamming, but reacting to game state.
 */
function handleAISpells(pong: Pong, player2: Player, now: number): void {
  if (now - lastSpellCheck < AI_SPELL_CHECK_INTERVAL) {
    return;
  }
  lastSpellCheck = now;

  const ball = pong.ball;
  const fieldLength = Math.abs(pong.player1.z - pong.player2.z);

  // --- Defensive spell ---
  // Only use when ball is heading toward AI AND is close enough to be threatening
  if (player2.counterSpell.ready && ball.sin < 0) {
    const distanceToAI = Math.abs(ball.z - player2.z);
    const proximityRatio = distanceToAI / fieldLength;

    // Only consider defensive spell when ball is in the AI's half and getting close
    if (proximityRatio < AI_DEFENSIVE_PROXIMITY) {
      // Higher chance when ball is very close, lower when further
      const urgencyBonus = (AI_DEFENSIVE_PROXIMITY - proximityRatio) / AI_DEFENSIVE_PROXIMITY * 0.2;
      if (Math.random() < AI_DEFENSIVE_SPELL_CHANCE + urgencyBonus) {
        player2.counterSpell.useSpell(false);
      }
    }
  }

  // --- Offensive spell ---
  // Only use when ball is heading toward opponent AND has crossed past midfield
  if (player2.offensiveSpell.ready && ball.sin > 0) {
    const isPortal = player2.offensiveSpell.spellType === "ballPortal";

    if (isPortal) {
      const movingTowardWall = (ball.x > 0 && ball.cos > 0) || (ball.x < 0 && ball.cos < 0);
      const horizontalSpeed = Math.abs(ball.cos) * ball.speed;

      if (movingTowardWall && horizontalSpeed > 0.01) {
        const distToWall = pong.heightLimit - Math.abs(ball.x);
        const timeToWall = distToWall / horizontalSpeed; // seconds
        const portalWindow = SPELL_CONSTANTS.ballPortalDuration / 1000; // 0.75s

        // Only use if the ball will hit the wall within the portal duration
        if (timeToWall <= portalWindow) {
          if (Math.random() < AI_PORTAL_SPELL_CHANCE) {
            player2.offensiveSpell.useSpell(true);
          }
        }
      }
    } else {
      // Non-portal offensive spells: use when ball is in opponent's half
      const distanceToPlayer1 = Math.abs(ball.z - pong.player1.z);
      const proximityRatio = distanceToPlayer1 / fieldLength;

      if (proximityRatio < 0.5) {
        if (Math.random() < AI_OFFENSIVE_SPELL_CHANCE) {
          player2.offensiveSpell.useSpell(true);
        }
      }
    }
  }

  // --- Spell switching (very occasional, for variety) ---
  if (now - lastSwitchCheck > AI_SWITCH_SPELL_INTERVAL) {
    lastSwitchCheck = now;

    // Only switch if the spell is NOT ready (don't waste a ready spell)
    if (!player2.counterSpell.ready && Math.random() < AI_SWITCH_SPELL_CHANCE) {
      player2.counterSpell.switchSpell();
    }
    if (!player2.offensiveSpell.ready && Math.random() < AI_SWITCH_SPELL_CHANCE) {
      player2.offensiveSpell.switchSpell();
    }
  }
}

/**
 * Reset AI state (call when a new round starts or game resets).
 */
export function resetAI(): void {
  currentTargetX = 0;
  predictionError = 0;
  lastErrorUpdate = 0;
  lastSpellCheck = 0;
  lastSwitchCheck = 0;
  reactionTimer = 0;
  lastBallDirection = 0;
  // Don't reset aiSpeedApplied — the speed cap persists for the whole game
}
