import { Pong, FPS } from "./pong";
import { PongTranslations } from "./pongUI";
import { switchPlayerHandsPosition } from "./pongAnimations";
import { gameLogic } from "./pongLogic";
import { connectToGameServer, disconnectFromServer } from "./pongSocket";

// Fetch game constants from backend
async function fetchGameConstants(gameServerUrl: string) {
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
    serverUrl?: string;
    gameServerUrl?: string;
    roomId?: string;
    onSessionReplaced?: () => void;
    translations?: PongTranslations;
  },
) => {
  const defaultTranslations: PongTranslations = {
    welcomeWarlock: "Welcome Warlock",
    pressSpaceReady: "(Press space when ready)",
    youWon: "You Won!",
    player1Wins: "Player 1 Wins!",
    youLost: "You Lost!",
    player2Wins: "Player 2 Wins!",
    waitingForOpponent: "Waiting for opponent...",
    getReady: "Get Ready...",
    fight: "FIGHT!",
    opponentDisconnected: "Opponent Disconnected",
    disconnectedFromServer: "Disconnected from Server",
    opponentConnected: "Opponent connected",
    waitingForOpponentReady: "Waiting for opponent ready",
    spectating: "Spectating",
    pressClaimSeat: "Press C to claim a seat",
    otherPlayerReady: "Other player ready",
    labelYou: "(YOU)",
    labelOpponent: "(HIM)",
  };
  let pong = new Pong(canvas, options?.translations ?? defaultTranslations);
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
  switchPlayerHandsPosition(pong, pong.camera.topView, true);

  let lastFrameTime = 0;
  let elapsedTime = 0;
  const frameDuration = 1000 / FPS;
  let isDisposed = false;

  const renderLoop = () => {
    if (isDisposed) return;

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
