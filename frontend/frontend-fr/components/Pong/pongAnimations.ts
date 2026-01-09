import { Mesh, Scene, Vector3 } from "@babylonjs/core";
import { TextBlock } from "@babylonjs/gui";
import { Pong, FPS } from "./pong";
import { CAMERA_ANIMATION_TIME } from "./pongCamera";

export const ANIMATION_FPS = 24;

// "ENUMS"
const X = 0;
const Y = 1;
const Z = 2;
const TIME = 3;
const STOP_TIME = 4;

const EYES = [
  0.01, // X Sway
  0.04, // Y Sway
  0.01, // Z Sway
  2000, // Sway time
];

const MAGE = [
  0.02, // X Sway
  0.07, // Y Sway
  0.02, // Z Sway
  2000, // Sway time
];

const SLEEVE = [
  0.03, // X Sway
  0.1, // Y Sway
  0.03, // Z Sway
  1500, // Sway time
];

const HAND = [
  0.02, // X Sway
  0.08, // Y Sway
  0.02, // Z Sway
  1500, // Sway time
];

const PLAYER = [
  0.02, // X Sway
  0.08, // Y Sway
  0.02, // Z Sway
  1500, // Sway time
];

// SPELL CASTING
export const OFFENSIVE_CASTING = [0.05, 0.1, 0.2, 250, 500];

export const COUNTER_CASTING = [0.1, 0.25, 0.1, 250, 500];

// Animates an attribute from an object to a target in a given time in miliseconds
export function animateAttribute(
  object: any,
  target: number,
  attribute: string,
  time: number,
  frameRate: number
) {
  const from = object[attribute];
  const start = performance.now();
  const frameInterval = 1000 / frameRate;

  function animate() {
    const now = performance.now();
    const elapsed = now - start;

    // Clamping from 0 to 1 to interpolate the values
    const t = Math.min(elapsed / time, 1);
    object[attribute] = from + (target - from) * t;

    // Creating all animation frames
    if (t < 1) {
      setTimeout(() => {
        requestAnimationFrame(animate);
      }, frameInterval);
    }
  }
  requestAnimationFrame(animate);
}

export function animateMeshes(scene: Scene) {
  // Adding sway to each desired mesh of the mage
  addSwayAnimation(scene, scene.getMeshByName("hood") as Mesh, MAGE);
  addSwayAnimation(scene, scene.getNodeByName("eyes") as Mesh, EYES);
  addSwayAnimation(
    scene,
    scene.getMeshByName("leftMageSleeve") as Mesh,
    SLEEVE
  );
  addSwayAnimation(
    scene,
    scene.getMeshByName("rightMageSleeve") as Mesh,
    SLEEVE
  );
  addSwayAnimation(scene, scene.getMeshByName("leftMageHand") as Mesh, HAND);
  addSwayAnimation(scene, scene.getNodeByName("rightMageHand") as Mesh, HAND);

  // Adding sway to each desired mesh of the player
  addSwayAnimation(
    scene,
    scene.getMeshByName("leftPlayerHand") as Mesh,
    PLAYER
  );
  addSwayAnimation(
    scene,
    scene.getNodeByName("rightPlayerHand") as Mesh,
    PLAYER
  );
}

// Sway animation for a mesh
export function addSwayAnimation(scene: Scene, mesh: Mesh, sway: any) {
  let lastUpdate = 0;

  let direction = 1;

  let lastYSway = 0;
  let lastXSway = 0;
  let lastZSway = 0;

  let currSway = 0;

  let meshPos = mesh.position;

  scene.registerBeforeRender(() => {
    const now = performance.now();
    if (now - lastUpdate >= sway[TIME]) {
      lastUpdate = now;

      currSway = Math.random() * sway[X];
      animateAttribute(
        meshPos,
        meshPos.x - lastXSway + currSway,
        "x",
        sway[TIME],
        ANIMATION_FPS
      );
      lastXSway = currSway;

      currSway = Math.random() * sway[Y] * direction;
      direction *= -1;
      animateAttribute(
        meshPos,
        meshPos.y - lastYSway + currSway,
        "y",
        sway[TIME],
        ANIMATION_FPS
      );
      lastYSway = currSway;

      currSway = Math.random() * sway[Z];
      animateAttribute(
        meshPos,
        meshPos.z - lastZSway + currSway,
        "z",
        sway[TIME],
        ANIMATION_FPS
      );
      lastZSway = currSway;
    }
  });
}

export function switchPlayerHandsPosition(pong: Pong, topView: boolean) {
  let player = pong.player1;
  let target = player;
  if (topView) {
    target = pong.player2;
  }

  let leftX =
    Math.abs(player.initialLeftHandPos.x) -
    Math.abs(target.initialLeftHandPos.x);
  let leftY =
    Math.abs(target.initialLeftHandPos.y) -
    Math.abs(player.initialLeftHandPos.y);
  let leftZ =
    Math.abs(target.initialLeftHandPos.z) -
    Math.abs(player.initialLeftHandPos.z);

  let rightX =
    Math.abs(target.initialRightHandPos.x) -
    Math.abs(player.initialRightHandPos.x);
  let rightY =
    Math.abs(target.initialRightHandPos.y) -
    Math.abs(player.initialRightHandPos.y);
  let rightZ =
    Math.abs(target.initialRightHandPos.z) -
    Math.abs(player.initialRightHandPos.z);

  // Animating X, Y, Z in both hands (in order)

  // Left
  animateAttribute(
    player.leftHandPos,
    leftX,
    "x",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.leftHandPos,
    leftY,
    "y",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.leftHandPos,
    leftZ,
    "z",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.leftHand.position,
    leftX,
    "x",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.leftHand.position,
    leftY,
    "y",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.leftHand.position,
    leftZ,
    "z",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );

  // Right
  animateAttribute(
    player.rightHandPos,
    rightX,
    "x",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.rightHandPos,
    rightY,
    "y",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.rightHandPos,
    rightZ,
    "z",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.rightHand.position,
    rightX,
    "x",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.rightHand.position,
    rightY,
    "y",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
  animateAttribute(
    player.rightHand.position,
    rightZ,
    "z",
    CAMERA_ANIMATION_TIME,
    ANIMATION_FPS
  );
}

export function useSpellAnimation(arm: Vector3, ANIMATION: any) {
  const initialPosition = [arm.x, arm.y, arm.z];

  let nextX = arm.x + ANIMATION[X];
  if (arm.x > 0) nextX = arm.x - ANIMATION[X];
  let nextZ = arm.z + ANIMATION[Z];
  if (arm.z > 0) nextZ = arm.z - ANIMATION[Z];

  // Queueing an animation to recall the arm to the original position
  setTimeout(() => {
    animateAttribute(
      arm,
      initialPosition[X],
      "x",
      ANIMATION[TIME],
      ANIMATION_FPS
    );
    animateAttribute(
      arm,
      initialPosition[Y],
      "y",
      ANIMATION[TIME],
      ANIMATION_FPS
    );
    animateAttribute(
      arm,
      initialPosition[Z],
      "z",
      ANIMATION[TIME],
      ANIMATION_FPS
    );
  }, ANIMATION[TIME] + ANIMATION[STOP_TIME]);

  // Animating the spell cast
  animateAttribute(arm, nextX, "x", ANIMATION[TIME], ANIMATION_FPS);
  animateAttribute(
    arm,
    arm.y + ANIMATION[Y],
    "y",
    ANIMATION[TIME],
    ANIMATION_FPS
  );
  animateAttribute(arm, nextZ, "z", ANIMATION[TIME], ANIMATION_FPS);
}
