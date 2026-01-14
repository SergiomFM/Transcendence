// Physics engine for server-side Pong game
const {
  GAME_CONSTANTS,
  degreesToRadians,
  radiansToDegrees,
} = require("./constants");

class Physics {
  constructor(gameState) {
    this.gameState = gameState;
    this.heightLimit = GAME_CONSTANTS.HEIGHT_LIMIT; // X-axis limit (wall bounds)
    this.widthLimit = GAME_CONSTANTS.WIDTH_LIMIT; // Z-axis limit (goal line)
  }

  // Update ball position and handle collisions
  updateBall(delta) {
    const ball = this.gameState.ball;

    // Store old position
    const oldX = ball.x;
    const oldZ = ball.z;

    // Calculate new position
    const newX = oldX + ball.cos * ball.speed * delta;
    const newZ = oldZ + ball.sin * ball.speed * delta;

    ball.x = newX;
    ball.z = newZ;

    // Wall collision (X-axis)
    if (Math.abs(newX) > this.heightLimit) {
      const sign = newX > 0 ? 1 : -1;
      ball.x = this.heightLimit * sign - (newX - this.heightLimit * sign);
      this.setBallAngle(Math.PI - ball.angle);

      // Return collision event for client VFX
      return {
        type: "WALL_COLLISION",
        position: {
          x: this.heightLimit * sign,
          y: ball.y,
          z: (newZ + oldZ) * 0.5,
        },
        speed: ball.speed,
        angle: ball.angle,
      };
    }

    // Paddle collision check
    const player1Collision = this.checkPaddleCollision(
      this.gameState.player1,
      -1
    );
    if (player1Collision) return player1Collision;

    const player2Collision = this.checkPaddleCollision(
      this.gameState.player2,
      1
    );
    if (player2Collision) return player2Collision;

    // Goal scoring
    if (Math.abs(newZ) >= this.widthLimit) {
      return this.handleGoal();
    }

    return null;
  }

  checkPaddleCollision(paddle, signal) {
    const ball = this.gameState.ball;

    // Check if ball is at paddle's Z position
    // Player1 (z=1.5, signal=-1): ball moving toward positive Z hits when ball.z >= paddle.z
    // Player2 (z=-1.5, signal=1): ball moving toward negative Z hits when ball.z <= paddle.z
    const atPaddleZ = signal < 0 ? ball.z >= paddle.z : ball.z <= paddle.z;

    if (!atPaddleZ) return null;

    // Check if ball is within paddle width
    if (
      ball.x <= paddle.x + paddle.size &&
      ball.x >= paddle.x - paddle.size &&
      !paddle.failed
    ) {
      // Calculate bounce angle based on hit position
      const hitOffset = (ball.x - paddle.x) / paddle.size;
      const deviation = Math.max(-1, Math.min(1, hitOffset));
      const bounceAngle =
        90 - deviation * GAME_CONSTANTS.PADDLE_MAX_DEVIATION_ANGLE;

      this.setBallAngle(degreesToRadians(bounceAngle) * signal);

      // Reflect ball position
      ball.z = paddle.z - (-ball.z + paddle.z);

      // Increase ball speed
      ball.speed += GAME_CONSTANTS.BALL_SPEED_INCREMENT;

      return {
        type: "PADDLE_COLLISION",
        playerId: paddle.id,
        position: { x: ball.x, y: ball.y, z: paddle.z },
        speed: ball.speed,
        angle: ball.angle,
      };
    } else {
      paddle.failed = true;
    }

    return null;
  }

  handleGoal() {
    const ball = this.gameState.ball;
    let winner;

    if (ball.z > 0) {
      // Player 2 scored
      this.gameState.player2.score++;
      winner = 2;
      this.setBallAngle(degreesToRadians(-90));
    } else {
      // Player 1 scored
      this.gameState.player1.score++;
      winner = 1;
      this.setBallAngle(degreesToRadians(90));
    }

    // Reset ball and paddles
    this.resetRound();

    return {
      type: "GOAL",
      winner: winner,
      score: {
        player1: this.gameState.player1.score,
        player2: this.gameState.player2.score,
      },
    };
  }

  resetRound() {
    const ball = this.gameState.ball;
    const p1 = this.gameState.player1;
    const p2 = this.gameState.player2;

    // Reset ball
    ball.x = 0;
    ball.z = 0;
    ball.speed = GAME_CONSTANTS.BALL_INITIAL_SPEED;

    // Reset players
    p1.x = 0;
    p1.currSpeed = 0;
    p1.failed = false;
    p1.ready = false;

    p2.x = 0;
    p2.currSpeed = 0;
    p2.failed = false;
    p2.ready = false;

    this.gameState.running = false;
  }

  setBallAngle(angleRad) {
    const ball = this.gameState.ball;
    ball.angle = angleRad % (2 * Math.PI);
    ball.cos = Math.cos(ball.angle);
    ball.sin = Math.sin(ball.angle);
  }

  // Update paddle position based on input
  updatePaddle(paddle, delta) {
    const direction = paddle.inputDirection;

    // Dash logic
    this.updateDash(paddle, delta * 1000, direction);

    // Update speed based on input
    if (direction) {
      paddle.currSpeed = paddle.maxSpeed;
      paddle.direction = direction;
    }

    // Move paddle
    paddle.x += paddle.currSpeed * delta * paddle.direction;

    // Apply drag
    paddle.currSpeed -= GAME_CONSTANTS.PADDLE_DRAG * delta;
    if (paddle.currSpeed < 0) {
      paddle.currSpeed = 0;
    }

    // Boundary check
    const limit = this.heightLimit - paddle.size;
    if (paddle.x > limit) {
      paddle.x = limit;
    } else if (paddle.x < -limit) {
      paddle.x = -limit;
    }
  }

  updateDash(paddle, timeElapsed, direction) {
    // Update cooldown
    if (!paddle.dashReady) {
      paddle.dashElapsedCooldown += timeElapsed;
      if (paddle.dashElapsedCooldown > GAME_CONSTANTS.DASH_COOLDOWN) {
        paddle.dashReady = true;
      }
    }

    if (direction === 0) {
      paddle.dashActive = false;
      paddle.dashElapsedActive = 0;
      paddle.maxSpeed = paddle.originalMaxSpeed;
      return;
    }

    if (paddle.dashActive) {
      paddle.dashElapsedActive += timeElapsed;
      paddle.maxSpeed = paddle.originalMaxSpeed * GAME_CONSTANTS.DASH_POWER;

      if (paddle.dashElapsedActive > GAME_CONSTANTS.DASH_DURATION) {
        paddle.maxSpeed = paddle.originalMaxSpeed;
        paddle.dashActive = false;
        paddle.dashElapsedCooldown = 0;
        paddle.dashElapsedActive = 0;
        paddle.dashReady = false;
      }
    }
  }
}

module.exports = Physics;
