import { Pong, FPS } from "./pong";
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
  options?: { online?: boolean; serverUrl?: string; gameServerUrl?: string }
) => {
  let pong = new Pong(canvas);
  await pong.initPong();

  // Only fetch constants from backend if online mode is enabled
  if (options?.online) {
    const gameServerUrl = options?.gameServerUrl || "http://localhost:3002";
    const constants = await fetchGameConstants(gameServerUrl);

    console.log("Game constants loaded:", constants);

    // Apply constants to game objects
    if (constants) {
      pong.ball.initalSpeed = constants.BALL_INITIAL_SPEED;
      pong.ball.speed = constants.BALL_INITIAL_SPEED;
      pong.ball.speedIncrement = constants.BALL_SPEED_INCREMENT;

      pong.player1.maxSpeed = constants.PADDLE_MAX_SPEED;
      pong.player1.originalMaxSpeed = constants.PADDLE_MAX_SPEED;
      pong.player1.drag = constants.PADDLE_DRAG;
      pong.player1.dashCooldown = constants.DASH_COOLDOWN;
      pong.player1.dashDuration = constants.DASH_DURATION;
      pong.player1.dashPower = constants.DASH_POWER;

      pong.player2.maxSpeed = constants.PADDLE_MAX_SPEED;
      pong.player2.originalMaxSpeed = constants.PADDLE_MAX_SPEED;
      pong.player2.drag = constants.PADDLE_DRAG;
      pong.player2.dashCooldown = constants.DASH_COOLDOWN;
      pong.player2.dashDuration = constants.DASH_DURATION;
      pong.player2.dashPower = constants.DASH_POWER;
      pong.heightLimit = constants.HEIGHT_LIMIT;
      pong.widthLimit = constants.WIDTH_LIMIT;
    }
  }

  // Connect to multiplayer server if online mode
  if (options?.online) {
    pong.online = true;
    connectToGameServer(pong, options.serverUrl);
  }

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
