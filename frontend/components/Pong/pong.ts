import { Scene, Engine, Color4, Vector3, Tools, Mesh } from "@babylonjs/core";
import { PongCamera } from "./pongCamera";
import { createScene } from "./pongScene";
import { Events } from "./pongEvents";
import { Spell, BallAngleSwitch, BallStop } from "./pongSpells";
import { GUI } from "./pongUI";
import { ANIMATION_FPS } from "./pongAnimations";
import { GAME_CONSTANTS } from "@/shared/constants";

export const FPS = 60;

const BALL_Y = 0.25;

export class Ball extends Vector3 {

  readonly initalSpeed = GAME_CONSTANTS.BALL_INITIAL_SPEED;
  readonly speedIncrement = GAME_CONSTANTS.BALL_SPEED_INCREMENT;
  readonly maxSpeed = GAME_CONSTANTS.BALL_MAX_SPEED;

  speed = GAME_CONSTANTS.BALL_INITIAL_SPEED;
  angle = Tools.ToRadians(GAME_CONSTANTS.BALL_INITIAL_ANGLE_DEG);
  cos = 0;
  sin = 1;
  
  readonly radius = GAME_CONSTANTS.BALL_RADIUS;

  constructor(x: number, y: number, z: number) {
    super(x, y, z);
  }

  setAngle(angleRad: number) {
    this.angle = angleRad % (2 * Math.PI);
    this.cos = Math.cos(this.angle);
    this.sin = Math.sin(this.angle);
  }
}

export class Player {
  public vector: Vector3;
  currSpeed = 0;
  currDirection = 0;
  readonly maxSpeed = GAME_CONSTANTS.PADDLE_MAX_SPEED;
  readonly drag = GAME_CONSTANTS.PADDLE_DRAG;

  leftHand!: Mesh;
  leftHandPos: Vector3;
  readonly initialLeftHandPos: Vector3;

  rightHand!: Mesh;
  rightHandPos: Vector3;
  readonly initialRightHandPos: Vector3;

  handMovementMultiplier = 0.2;

  counterSpell!: Spell;
  offensiveSpell!: Spell;

  keys!: Array<string>;
  direction = 0;
  failed = false;
  ready = false;
  readonly maxDeviationAngle = GAME_CONSTANTS.PADDLE_MAX_DEVIATION_ANGLE;
  readonly size: number;

  dashActive = false;
  dashReady = false;

  readonly dashCooldown = GAME_CONSTANTS.DASH_COOLDOWN;
  readonly dashDuration = GAME_CONSTANTS.DASH_DURATION;
  readonly dashPower = GAME_CONSTANTS.DASH_POWER;
  dashElapsedCooldown = 0;
  dashElapsedActive = 0;
  originalMaxSpeed = this.maxSpeed;

  connected = false;

  get x() {
    return this.vector.x;
  }
  set x(value: number) {
    this.vector.x = value;
  }

  get y() {
    return this.vector.y;
  }
  set y(value: number) {
    this.vector.y = value;
  }

  get z() {
    return this.vector.z;
  }
  set z(value: number) {
    this.vector.z = value;
  }

  constructor(scene: Scene, pong: Pong, meshName: string) {
    // Getting a paddle mesh to use its vector
    const mesh = scene.getMeshByName(meshName)!;
    this.vector = mesh.position;
    console.log(this.vector.z);

    // Associating a paddle with the correct Player
    if (meshName == "paddle1") {
      this.leftHand = scene.getNodeByName("leftPlayerArm")! as Mesh;
      this.rightHand = scene.getNodeByName("rightPlayerArm")! as Mesh;
    } else if (meshName == "paddle2") {
      this.leftHand = scene.getNodeByName("leftMageArm")! as Mesh;
      this.rightHand = scene.getNodeByName("rightMageArm")! as Mesh;
    } else {
      throw new Error("Invalid mesh name for Player paddle");
    }

    this.initialLeftHandPos = this.leftHand.absolutePosition.clone();
    this.initialRightHandPos = this.rightHand.absolutePosition.clone();

    this.leftHandPos = this.leftHand.position.clone();
    this.rightHandPos = this.rightHand.position.clone();

    // Getting the paddle meshes size (Assuming meshes are the same size)
    this.size =
      Math.abs(scene.getMeshByName("paddleEnd")!.position.x) + pong.ball.radius;

    // Making the hand always follow the paddle
    let lastUpdate = 0;
    const frameDuration = 1000 / ANIMATION_FPS;
    scene.registerBeforeRender(() => {
      const now = performance.now();
      if (now - lastUpdate >= frameDuration) {
        // Moving the hand meshes in relation with a "true" fixed position
        this.leftHand!.position.x =
          this.leftHandPos.x + this.x * this.handMovementMultiplier;

        lastUpdate = now;
      }
    });
  }

  playerDashLogic(timeElapsed: number, direction: number) {
    // Updating cooldown timer
    if (!this.dashReady) {
      this.dashElapsedCooldown += timeElapsed;
      if (this.dashElapsedCooldown > this.dashCooldown) this.dashReady = true;
    }

    if (direction == 0) {
      this.dashActive = false;
      this.dashElapsedActive = 0;
      this.maxSpeed = this.originalMaxSpeed;
      return;
    }

    if (this.dashActive) {
      this.dashElapsedActive += timeElapsed;
      this.maxSpeed = this.originalMaxSpeed * this.dashPower;

      if (this.dashElapsedActive > this.dashDuration) {
        this.maxSpeed = this.originalMaxSpeed;
        this.dashActive = false;
        this.dashElapsedCooldown = 0;
        this.dashElapsedActive = 0;
        this.dashReady = false;
      }
    }
  }
}

export class Pong {
  widthLimit!: number;
  heightLimit!: number;
  _lastArenaColor?: { r: number; g: number; b: number; a: number };

  ball: Ball;
  player1!: Player;
  player2!: Player;

  readonly canvas: HTMLCanvasElement;
  engine: Engine;
  scene!: Scene;
  camera!: PongCamera;
  server!: WebSocket;
  GUI!: GUI;

  running = false;
  loaded = false;
  online = false;

  // Multiplayer properties
  socket?: WebSocket;
  serverGameState?: any;
  serverGameStateApplied = false;

  // Store bound resize handler for cleanup
  private boundResizeHandler: (() => void) | null = null;

  constructor(canvasElement: HTMLCanvasElement) {
    // Creating a Ball
    this.ball = new Ball(0, BALL_Y, 0);

    // Configuring the Game Canvas
    this.canvas = canvasElement;
    this.canvas.focus();

    // Creating an Engine with proper configuration
    // antialias set to FALSE for pixel art / low poly aesthetic
    this.engine = new Engine(this.canvas, false, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
      powerPreference: "high-performance",
      // Prevent context loss issues
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    });
    this.engine.setSize(this.canvas.width, this.canvas.height);

    // Disable any WebGL-level texture smoothing
    const gl = this.engine._gl;
    if (gl) {
      // Disable LINEAR filtering at WebGL level
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
  }

  // Initialization of the core game components
  async initPong() {
    // Instantiating a Scene
    this.scene = await createScene(this);

    // Instantiating a Camera
    this.camera = new PongCamera(this.scene);

    // Instantiating the game Paddles
    this.player1 = new Player(this.scene, this, "paddle1");
    this.player1.offensiveSpell = new BallAngleSwitch(
      this,
      this.player1,
      "rightPlayer",
    );
    this.player1.counterSpell = new BallStop(this, this.player1, "leftPlayer");
    this.player2 = new Player(this.scene, this, "paddle2");
    this.player2.offensiveSpell = new BallAngleSwitch(
      this,
      this.player2,
      "rightMage",
    );
    this.player2.counterSpell = new BallStop(this, this.player2, "leftMage");

    // Setting the background Color
    this.scene.clearColor = new Color4(0, 0, 0, 1);

    // Creating the Game UI elements
    this.GUI = new GUI();
    this.GUI.setUpTextBlocks(this.scene, this.online);

    // Registering Key inputs
    Events.registerEvents(this);
    Events.assignKeys(this);

    // Bind and store resize handler for cleanup
    // The game is ready to be started
    this.loaded = true;
  }

  // Cleanup method to remove event listeners
  public dispose() {
    if (this.boundResizeHandler) {
      window.removeEventListener("resize", this.boundResizeHandler);
      window.removeEventListener("DOMContentLoaded", this.boundResizeHandler);
      this.boundResizeHandler = null;
    }
  }
}
