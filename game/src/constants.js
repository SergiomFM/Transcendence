// Shared game constants between client and server
// These must match the client-side values for consistent physics

// Import the shared constants
const sharedConstants = require("../shared/constants.js");

// Script to extract game constants from the pong.glb model
const { NodeIO } = require("@gltf-transform/core");
const path = require("path");

// Flag to track if constants have been loaded from GLB
let constantsLoaded = false;

// Async function to load constants from GLB file
async function loadConstantsFromGLB() {
	if (constantsLoaded) {
		console.log("⚠️  Constants already loaded, skipping");
		return;
	}

	try {
		const io = new NodeIO();
		const glbPath = path.join(__dirname, "../public/models/pong.glb");

		// Read the GLB file
		const document = await io.read(glbPath);
		const root = document.getRoot();
		const scene = root.listScenes()[0];

		// Object to store extracted constants
		const extracted = {};

		// Helper function to find a node by name
		function findNodeByName(nodes, name) {
			for (const node of nodes) {
				if (node.getName() === name) {
					return node;
				}
				const children = node.listChildren();
				if (children.length > 0) {
					const found = findNodeByName(children, name);
					if (found) return found;
				}
			}
			return null;
		}

		// Get all nodes from the scene
		const allNodes = scene.listChildren();

		// Extract corner positions for calculating boundaries
		const frontRight = findNodeByName(allNodes, "frontRight");
		const frontLeft = findNodeByName(allNodes, "frontLeft");
		const backRight = findNodeByName(allNodes, "backRight");
		const backLeft = findNodeByName(allNodes, "backLeft");
		const paddle1 = findNodeByName(allNodes, "paddle1");
		const paddle2 = findNodeByName(allNodes, "paddle2");
		const paddleEnd = findNodeByName(allNodes, "paddleEnd");
		const ball = findNodeByName(allNodes, "ball");
		const references = findNodeByName(allNodes, "references");
		const paddles = findNodeByName(allNodes, "paddles");

		if (!frontRight || !frontLeft || !backRight) {
			throw new Error(
				"Could not find corner meshes (frontRight, frontLeft, backRight) in GLB file",
			);
		}

		if (!paddle1 || !paddle2) {
			throw new Error(
				"Could not find paddle meshes (paddle1, paddle2) in GLB file",
			);
		}

		// Extract positions
		const frontRightPos = frontRight.getTranslation();
		const frontLeftPos = frontLeft.getTranslation();
		const backRightPos = backRight.getTranslation();
		const backLeftPos = backLeft.getTranslation();
		const paddle1Pos = paddle1.getTranslation();
		const paddle2Pos = paddle2.getTranslation();

		// Calculate game boundaries from all four corners
		// Collect all X and Z coordinates from the four corners
		const xCoords = [
			frontRightPos[0],
			frontLeftPos[0],
			backRightPos[0],
			backLeftPos[0],
		];
		const zCoords = [
			frontRightPos[2],
			frontLeftPos[2],
			backRightPos[2],
			backLeftPos[2],
		];
		extracted.HEIGHT_LIMIT = Math.max(...xCoords.map(Math.abs));
		extracted.WIDTH_LIMIT = Math.max(...zCoords.map(Math.abs));
		extracted.PLAYER1_Z = paddle1Pos[2];
		extracted.PLAYER2_Z = paddle2Pos[2];

		if (references) {
			const referencesPos = references.getTranslation();
			extracted.BALL_Y = referencesPos[1];
		} else if (paddles) {
			const paddlesPos = paddles.getTranslation();
			extracted.BALL_Y = paddlesPos[1];
		} else if (ball) {
			const ballPos = ball.getTranslation();
			extracted.BALL_Y = ballPos[1];
		}

		const paddleEndPos = paddleEnd.getTranslation();
		const BALL_RADIUS = 0.015; // This is a physical constant of the ball
		extracted.PADDLE_SIZE = Math.abs(paddleEndPos[0]) + BALL_RADIUS;

		// Update shared GAME_CONSTANTS with extracted values from GLB
		sharedConstants.GAME_CONSTANTS.BALL_Y = extracted.BALL_Y;
		sharedConstants.GAME_CONSTANTS.HEIGHT_LIMIT = extracted.HEIGHT_LIMIT;
		sharedConstants.GAME_CONSTANTS.WIDTH_LIMIT = extracted.WIDTH_LIMIT;
		sharedConstants.GAME_CONSTANTS.PLAYER1_Z = extracted.PLAYER1_Z;
		sharedConstants.GAME_CONSTANTS.PLAYER2_Z = extracted.PLAYER2_Z;
		sharedConstants.GAME_CONSTANTS.PADDLE_SIZE = extracted.PADDLE_SIZE;

		constantsLoaded = true;
	} catch (error) {
		console.error("❌ Failed to load GLB constants:", error.message);
		throw new Error(
			"Cannot start server without GLB constants. Please ensure the file frontend/public/models/pong.glb exists",
		);
	}
}

// Re-export shared constants for backwards compatibility
const GAME_CONSTANTS = sharedConstants.GAME_CONSTANTS;
const spellTypes = sharedConstants.spellTypes;
const spellCycles = sharedConstants.spellCycles;
const SPELL_CONSTANTS = sharedConstants.SPELL_CONSTANTS;
const degreesToRadians = sharedConstants.degreesToRadians;
const radiansToDegrees = sharedConstants.radiansToDegrees;

module.exports = {
	GAME_CONSTANTS,
	degreesToRadians,
	radiansToDegrees,
	loadConstantsFromGLB,
	spellTypes,
	spellCycles,
	SPELL_CONSTANTS,
};
