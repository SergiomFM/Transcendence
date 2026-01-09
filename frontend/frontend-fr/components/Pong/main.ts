import { Pong, FPS } from "./pong";
import { gameLogic } from "./pongLogic";

export const startPong = async (canvas: HTMLCanvasElement) => {
  let pong = new Pong(canvas);
  await pong.initPong();

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
