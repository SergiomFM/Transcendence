// Shared game constants between client and server
// This file is compatible with both TypeScript (frontend) and JavaScript (backend)

/**
 * @typedef {Object} GameConstants
 * @property {number} BALL_MAX_SPEED - Maximum speed the ball can reach
 * @property {number} BALL_INITIAL_SPEED - Starting speed of the ball
 * @property {number} BALL_SPEED_INCREMENT - Speed increase after each hit
 * @property {number} BALL_RADIUS - Radius of the ball
 * @property {number|null} BALL_Y - Y position of the ball (loaded from GLB)
 * @property {number} BALL_INITIAL_ANGLE_DEG - Initial angle in degrees
 * @property {number} PADDLE_MAX_SPEED - Maximum paddle movement speed
 * @property {number} PADDLE_DRAG - Paddle drag coefficient
 * @property {number} PADDLE_MAX_DEVIATION_ANGLE - Max angle deviation
 * @property {number} TICK_RATE - Physics tick rate in ms
 * @property {number|null} PLAYER1_Z - Player 1 Z position (loaded from GLB)
 * @property {number|null} PLAYER2_Z - Player 2 Z position (loaded from GLB)
 * @property {number|null} HEIGHT_LIMIT - Height boundary (loaded from GLB)
 * @property {number|null} WIDTH_LIMIT - Width boundary (loaded from GLB)
 * @property {number|null} PADDLE_SIZE - Paddle half-width (loaded from GLB)
 * @property {number} MAX_ROUNDS - Maximum rounds per match
 * @property {number} ROUND_START_DELAY - Delay before round starts in ms
 */

/** @type {GameConstants} */
const GAME_CONSTANTS = {
	// Ball properties
	BALL_MAX_SPEED: 1.0,
	BALL_INITIAL_SPEED: 0.4,
	BALL_SPEED_INCREMENT: 0.05,
	BALL_RADIUS: 0.015,
	BALL_Y: null, // Will be set from GLB at startup
	BALL_INITIAL_ANGLE_DEG: 90,

	// Paddle properties
	PADDLE_MAX_SPEED: 1,
	PADDLE_DRAG: 7.5,
	PADDLE_MAX_DEVIATION_ANGLE: 70,

	// Game physics
	TICK_RATE: 1000 / 480, // ms per tick

	// Player positions (from GLB - will be set dynamically at startup)
	PLAYER1_Z: null,
	PLAYER2_Z: null,

	// Game boundaries (from GLB - will be set dynamically at startup)
	HEIGHT_LIMIT: null, // X-axis limit (wall bounds)
	WIDTH_LIMIT: null, // Z-axis limit (goal line)
	PADDLE_SIZE: null, // Paddle half-width

	// Match settings
	MAX_ROUNDS: 5,
	ROUND_START_DELAY: 2000, // ms
};

const spellTypes = {
	ballAngleSwitch: { offensive: true },
	ballShot: { offensive: true },
	ballPortal: { offensive: true },
	ballStop: { offensive: false },
	ballBack: { offensive: false },
	ballIman: { offensive: false },
};

const spellCycles = {
	offensive: ["ballAngleSwitch", "ballShot", "ballPortal"],
	counter: ["ballStop", "ballBack", "ballIman"],
};

const SPELL_CONSTANTS = {
	ballAngleSwitch: 3000,
	ballAngleDuration: 500,

	ballShot: 4000,
	ballShotDuration: 500,
	ballShotSpeedBoost: 2,

	ballPortal: 5000,
	ballPortalDuration: 500,

	ballStop: 5000,
	ballStopDuration: 2000,

	ballBack: 4000,
	ballBackDuration: 500,

	ballIman: 1000,
	ballImanDuration: 1000,
};

// Helper functions
const degreesToRadians = (degrees) => degrees * (Math.PI / 180);
const radiansToDegrees = (radians) => radians * (180 / Math.PI);

// CommonJS export (for backend Node.js)
if (typeof module !== "undefined" && module.exports) {
	module.exports = {
		GAME_CONSTANTS,
		degreesToRadians,
		radiansToDegrees,
		spellTypes,
		spellCycles,
		SPELL_CONSTANTS,
	};
}

// ES Module export (for frontend TypeScript/Next.js)
// These will be tree-shaken out in CommonJS environments
export {
	GAME_CONSTANTS,
	degreesToRadians,
	radiansToDegrees,
	spellTypes,
	spellCycles,
	SPELL_CONSTANTS,
};
