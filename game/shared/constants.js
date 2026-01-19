// Shared game constants between client and server
// These must match the client-side values for consistent physics

// Flag to track if constants have been loaded from GLB
let constantsLoaded = false;

// Async function to load constants from GLB file
async function loadConstantsFromGLB() {
  if (constantsLoaded) {
    console.log("⚠️  Constants already loaded, skipping");
    return;
  }

  try {
    const { extractConstantsFromGLB } = require("./extractConstants");
    const extracted = await extractConstantsFromGLB();

    // Update GAME_CONSTANTS with extracted values from GLB
    GAME_CONSTANTS.BALL_Y = extracted.BALL_Y;
    GAME_CONSTANTS.HEIGHT_LIMIT = extracted.HEIGHT_LIMIT;
    GAME_CONSTANTS.WIDTH_LIMIT = extracted.WIDTH_LIMIT;
    GAME_CONSTANTS.PLAYER1_Z = extracted.PLAYER1_Z;
    GAME_CONSTANTS.PLAYER2_Z = extracted.PLAYER2_Z;
    GAME_CONSTANTS.PADDLE_SIZE = extracted.PADDLE_SIZE;

    constantsLoaded = true;
  } catch (error) {
    console.error("❌ Failed to load GLB constants:", error.message);
    throw new Error(
      "Cannot start server without GLB constants. Please ensure the file frontend/public/models/pong.glb exists",
    );
  }
}

const GAME_CONSTANTS = {
  // Ball properties
  BALL_INITIAL_SPEED: 0.5,
  BALL_SPEED_INCREMENT: 0.1,
  BALL_RADIUS: 0.015,
  BALL_Y: null, // Will be set from GLB at startup
  BALL_INITIAL_ANGLE_DEG: 90,

  // Paddle properties
  PADDLE_MAX_SPEED: 1,
  PADDLE_DRAG: 7.5,
  PADDLE_MAX_DEVIATION_ANGLE: 60,

  // Dash properties
  DASH_COOLDOWN: 1000, // ms
  DASH_DURATION: 200, // ms
  DASH_POWER: 2,

  // Game physics
  FPS: 60,
  TICK_RATE: 1000 / 240, // ms per tick

  // State update frequency (send to clients less frequently than game ticks)
  STATE_UPDATE_RATE: 1000 / 120, // 240 updates per second

  // Player positions (from GLB - will be set dynamically at startup)
  PLAYER1_Z: null,
  PLAYER2_Z: null,

  // Game boundaries (from GLB - will be set dynamically at startup)
  HEIGHT_LIMIT: null, // X-axis limit (wall bounds)
  WIDTH_LIMIT: null, // Z-axis limit (goal line)
  PADDLE_SIZE: null, // Paddle half-width

  // Match settings
  MAX_ROUNDS: 5,
};

// Helper functions
const degreesToRadians = (degrees) => degrees * (Math.PI / 180);
const radiansToDegrees = (radians) => radians * (180 / Math.PI);

module.exports = {
  GAME_CONSTANTS,
  degreesToRadians,
  radiansToDegrees,
  loadConstantsFromGLB,
};
