import { Scene, Engine, Color4, Vector3, Tools, Mesh } from "@babylonjs/core";
import { PongCamera } from "./pongCamera";
import { createScene } from "./pongScene";
import { Events } from "./pongEvents";
import { Spell, BallAngleSwitch, BallStop } from "./pongSpells";
import { GUI } from "./pongUI";
import { ANIMATION_FPS } from "./pongAnimations";

// Delta time not working properly!!! TO FIX

export const FPS = 60;
export const WIDTH = 854;
export const HEIGHT = 480;

const BALL_Y = 0.25;

export class Ball extends Vector3
{
	initalSpeed = 0.5;
	speed = 0.5;
	speedIncrement = 0.1;
	angle = Tools.ToRadians(90);
	cos = 0;
	sin = 1;

	readonly radius = 0.015;

	constructor(x: number, y: number, z: number)
	{
		super(x, y, z);
	}

	setAngle(angleRad: number)
	{
		this.angle = angleRad % (2 * Math.PI);
		this.cos = Math.cos(this.angle);
		this.sin = Math.sin(this.angle);
	}
}


export class Player
{
	public vector: Vector3;
	currSpeed = 0;
	maxSpeed = 1;
	drag = 7.5;

	leftHand: Mesh;
	leftHandPos: Vector3;
	readonly initialLeftHandPos: Vector3;

	rightHand: Mesh;
	rightHandPos: Vector3;
	readonly initialRightHandPos: Vector3;

	handMovementMultiplier = 0.2;

	counterSpell: Spell; 
	offensiveSpell: Spell;

	keys: Array<string>;
	direction = 0;
	failed = false;
	ready = false;
	readonly maxDeviationAngle = 60;
	readonly size: number;

	dashActive = false;
	dashReady = false;

	dashCooldown = 1000;
	dashElapsedCooldown = 0;
	dashDuration = 200;
	dashElapsedActive = 0;
	dashPower = 2;
	originalMaxSpeed = this.maxSpeed;

	get x() { return this.vector.x; }
	set x(value: number) { this.vector.x = value; }

	get y() { return this.vector.y; }
	set y(value: number) { this.vector.y = value; }

	get z() { return this.vector.z; }
	set z(value: number) { this.vector.z = value; }

	constructor(scene: Scene, pong: Pong, meshName: string)
	{
		// Getting a paddle mesh to use its vector
		const mesh = scene.getMeshByName(meshName);
		this.vector = mesh.position;

 		//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
		
		// Associating a paddle with the correct Player
		if (meshName == "paddle1")
		{
			this.leftHand = scene.getNodeByName("leftPlayerArm") as Mesh;
			this.rightHand = scene.getNodeByName("rightPlayerArm") as Mesh;
		}
		else if (meshName == "paddle2")
		{
			this.leftHand = scene.getNodeByName("leftMageArm") as Mesh;
			this.rightHand = scene.getNodeByName("rightMageArm") as Mesh;
		}

		this.initialLeftHandPos = this.leftHand.absolutePosition.clone();
		this.initialRightHandPos = this.rightHand.absolutePosition.clone();

		this.leftHandPos = this.leftHand.position.clone();
		this.rightHandPos = this.rightHand.position.clone();

		// Getting the paddle meshes size (Assuming meshes are the same size)
		this.size = Math.abs(scene.getMeshByName("paddleEnd").position.x)
			+ pong.ball.radius;

		// Making the hand always follow the paddle
		let lastUpdate = 0;
		const frameDuration = 1000 / ANIMATION_FPS;
		scene.registerBeforeRender(() =>
		{
			const now = performance.now();
			if (now - lastUpdate >= frameDuration)
			{
				// Moving the hand meshes in relation with a "true" fixed position
				this.leftHand.position.x = this.leftHandPos.x
				+ this.x * this.handMovementMultiplier;
				
				lastUpdate = now;
			}
		});
	}

	playerDashLogic(timeElapsed: number, direction: number)
	{
		// Updating cooldown timer
		if (!this.dashReady)
		{
			this.dashElapsedCooldown += timeElapsed;
			if (this.dashElapsedCooldown > this.dashCooldown)
				this.dashReady = true;
		}

		if (direction == 0)
		{
			this.dashActive = false;
			this.dashElapsedActive = 0;
			this.maxSpeed = this.originalMaxSpeed;
			return ;
		}

		if(this.dashActive)
		{
			this.dashElapsedActive += timeElapsed;
			this.maxSpeed = this.originalMaxSpeed * this.dashPower;

			if(this.dashElapsedActive > this.dashDuration)
			{
				this.maxSpeed = this.originalMaxSpeed;
				this.dashActive = false;
				this.dashElapsedCooldown = 0;
				this.dashElapsedActive = 0;
				this.dashReady = false;
			}
		}
	}
}

export class Pong
{
	widthLimit: number;
	heightLimit: number;

	ball: Ball;
	player1: Player;
	player2: Player;

	readonly canvas: HTMLCanvasElement;
	engine: Engine;
	scene: Scene;
	camera: PongCamera;
	server: WebSocket;
	GUI: GUI;

	running = false;
	loaded = false;
	online = false;

	constructor()
	{
		// Creating a Ball
		this.ball = new Ball(0, BALL_Y, 0);

		// Configuring the Game Canvas
		this.canvas = document.getElementById('PongCanvas') as any;
		this.canvas.style.outline = "none";
		this.canvas.style.border = "none";
		this.canvas.style.imageRendering = "pixelated";
		this.canvas.focus();
		this.resizeCanvas();

		// Creating an Engine
		this.engine = new Engine(this.canvas, false);
		this.engine.setSize(WIDTH, HEIGHT);
	}

	// Initialization of the core game components
	async initPong()
	{
		// Instantiating a Scene
		this.scene = await createScene(this);

		// Instantiating a Camera
		this.camera = new PongCamera(this.scene);

		// Instantiating the game Paddles
		this.player1 = new Player(this.scene, this, "paddle1");
		this.player1.offensiveSpell = new BallAngleSwitch(this, this.player1, "rightPlayer");
		this.player1.counterSpell = new BallStop(this, this.player1, "leftPlayer");
		this.player2 = new Player(this.scene, this, "paddle2");
		this.player2.offensiveSpell = new BallAngleSwitch(this, this.player2, "rightMage");
		this.player2.counterSpell = new BallStop(this, this.player2, "leftMage");

		// Setting the background Color
		this.scene.clearColor = new Color4(0, 0, 0, 0);

		// Creating the Game UI elements
		this.GUI = new GUI();
		this.GUI.setUpTextBlocks(this.scene);

		// Registering Key inputs
		Events.registerEvents(this);
		Events.assignKeys(this)

		// Updating the window to fit all screens with the desired size and porpotion
		window.addEventListener('resize', this.resizeCanvas.bind(this));
		window.addEventListener('DOMContentLoaded', this.resizeCanvas.bind(this));

		// The game is ready to be started
		this.loaded = true;
	}

	// Resizes the canvas to fit all screens with a setted size and porpotion
	public resizeCanvas()
	{
		// Figuring out if the Window is taller or wider than the intended ratio 
		const scale = Math.min(
			window.innerWidth / WIDTH,
			window.innerHeight / HEIGHT);

		// Calculating the ammount of pixels to render
		const displayWidth = Math.floor(WIDTH * scale);
		const displayHeight = Math.floor(HEIGHT * scale);

		// Setting the canvas to the desired resolution
		this.canvas.width = WIDTH;
		this.canvas.height = HEIGHT;

		// Stretching the already rendered canvas to a higher resolution without losing the original pixel placement 
		this.canvas.style.width = displayWidth + "px";
		this.canvas.style.height = displayHeight + "px";
	}
}