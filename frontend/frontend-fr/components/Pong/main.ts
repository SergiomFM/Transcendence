import { Pong, FPS } from "./pong";
import { gameLogic } from "./pongLogic";

export const startPong = async (canvas: HTMLCanvasElement) => {
  let pong = new Pong(canvas);
  await pong.initPong();

  let lastFrameTime = 0;
  let elapsedTime = 0;
  const frameDuration = 1000 / FPS;

  pong.engine.runRenderLoop(() => {
    const now = performance.now();
    elapsedTime = now - lastFrameTime;
    if (elapsedTime >= frameDuration) {
      gameLogic(pong, elapsedTime * 0.001);
      pong.scene.render();
      lastFrameTime = now - (elapsedTime % frameDuration);
    }
  });

  // Return cleanup function
  return () => {
    pong.scene.dispose();
    pong.engine.stopRenderLoop();
    pong.engine.dispose();
  };
};
