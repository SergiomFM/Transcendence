import { Pong, FPS } from "./pong";
import { PongTranslations } from "./pongUI";
import { switchPlayerHandsPosition } from "./pongAnimations";
import { gameLogic } from "./pongLogic";
import { connectToGameServer, disconnectFromServer } from "./pongSocket";
import { initAudio, startMusic, stopMusic, disposeAudio } from "./pongAudio";
import { GamepadManager } from "./pongGamepad";

// Fetch game constants from backend
async function _fetchGameConstants(gameServerUrl: string) {
  try {
    const response = await fetch(`${gameServerUrl}/constants`);
    if (!response.ok) {
      throw new Error(`Failed to fetch constants: ${response.statusText}`);
    }
    const data = await response.json();
    return data.constants;
  } catch (error) {
    console.error("Error fetching game constants:", error);
  }
}

export const startPong = async (
  canvas: HTMLCanvasElement,
  options?: {
    online?: boolean;
    aiMode?: boolean;
    serverUrl?: string;
    gameServerUrl?: string;
    roomId?: string;
    onSessionReplaced?: () => void;
    translations?: PongTranslations;
    onPongReady?: (pong: Pong) => void;
  },
) => {
  const defaultTranslations: PongTranslations = {
    welcomeWarlock: "Welcome Warlock",
    pressSpaceReady: "(Press space when ready)",
    pressAReady: "(Press A when ready)",
    pressReadyTouch: "(Press ready)",
    pressPlayClaimSeat: "Press play to claim a seat",
    pressClaimSeat: "Press C to claim a seat",
    pressBClaimSeat: "Press B to claim a seat",
    youWon: "You Won!",
    player1Wins: "Player 1 Wins!",
    youLost: "You Lost!",
    player2Wins: "Player 2 Wins!",
    matchWon: "MATCH WON!",
    matchLost: "MATCH LOST!",
    waitingForOpponent: "Waiting for opponent...",
    getReady: "Get Ready...",
    fight: "FIGHT!",
    opponentDisconnected: "Opponent Disconnected",
    disconnectedFromServer: "Disconnected from Server",
    opponentConnected: "Opponent connected",
    waitingForOpponentReady: "Waiting for opponent ready",
    spectating: "Spectating",
    otherPlayerReady: "Other player ready",
    labelYou: "(YOU)",
    labelOpponent: "(HIM)",
  };
  const pong = new Pong(canvas, options?.translations ?? defaultTranslations);
  await pong.initPong();

  // Connect to multiplayer server if online mode
  if (options?.online) {
    pong.online = true;
    connectToGameServer(
      pong,
      options.serverUrl,
      options.roomId,
      options.onSessionReplaced,
    );
    pong.camera.instantSwitchCameraPOV();
  }

  // Set AI mode flag
  if (options?.aiMode) {
    pong.aiMode = true;
  }
  switchPlayerHandsPosition(pong, pong.camera.topView, true);

  // Notify React that the pong instance is ready
  if (options?.onPongReady) {
    options.onPongReady(pong);
  }

  // Initialize audio system and start background music
  initAudio();
  startMusic();

  // Start gamepad polling
  GamepadManager.startPolling();

  let lastFrameTime = 0;
  let elapsedTime = 0;
  const frameDuration = 1000 / FPS;
  let isDisposed = false;

  const renderLoop = () => {
    if (isDisposed) return;

    // Poll gamepads every frame (before game logic processes direction)
    GamepadManager.pollGamepads(pong);

    const now = performance.now();
    elapsedTime = now - lastFrameTime;
    if (elapsedTime >= frameDuration) {
      gameLogic(pong, elapsedTime * 0.001);
      pong.scene.render();
      lastFrameTime = now - (elapsedTime % frameDuration);
    }
  };

  pong.engine.runRenderLoop(renderLoop);

  // Return cleanup function
  return () => {
    isDisposed = true;

    // Stop music and dispose audio
    stopMusic();
    disposeAudio();

    // Stop gamepad polling
    GamepadManager.dispose();

    // Disconnect from server if online
    if (pong.online) {
      disconnectFromServer(pong);
    }

    // Stop render loop
    pong.engine.stopRenderLoop(renderLoop);

    // Dispose Pong resources (event listeners, etc)
    if (pong && pong.dispose) {
      pong.dispose();
    }

    // Dispose scene and all its resources
    if (pong.scene) {
      pong.scene.dispose();
    }

    // Dispose engine
    if (pong.engine) {
      pong.engine.dispose();
    }
  };
};
