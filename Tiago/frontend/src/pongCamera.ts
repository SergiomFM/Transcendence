import { ArcRotateCamera, Vector3, Scene, Tools } from "@babylonjs/core";
import { animateAttribute } from "./pongAnimations"
import { FPS } from "./pong"

// Time it takes for the camera to be animated
export const CAMERA_ANIMATION_TIME = 500;

// Tools to ease the camera animations
//enum cameraTarget { ALPHA, BETA, FOV, RADIUS };
const ALPHA = 0;
const BETA = 1;
const FOV = 2; 
const RADIUS = 3;

// Top camera attributes
const topAlpha = Tools.ToRadians(0);
const topBeta = Tools.ToRadians(0);
const topFOV = Tools.ToRadians(20);
const topDistance = 5;

// Side camera attributes 75
const sideAlpha = Tools.ToRadians(90);
const sideBeta = Tools.ToRadians(70);
const sideFOV = Tools.ToRadians(70);
const sideDistance = 1.8;

// Position of the point the camera is looking at 
const cameraPivot = new Vector3(0,0.35,0);

export class PongCamera extends ArcRotateCamera
{
	// Camera targets when switching view modes [BETA, FOV]
	topTarget = [topAlpha, topBeta, topFOV, topDistance];
	sideTarget = [sideAlpha, sideBeta, sideFOV, sideDistance];
	topView = false;

	// Camera constructor
	constructor(scene : Scene) 
	{
		// Instantiating "ArcRotateCamera"
		super("camera", sideAlpha, sideBeta,
			sideDistance, cameraPivot, scene);

		// Changing the FOV and camera collision to none
		this.fov = sideFOV;
		this.minZ = 0;
	}

	// Switches the camera POV
	public switchCameraPOV()
	{
		this.topView = !this.topView;

		let target: number[];
		if (this.topView)
			target = this.topTarget;
		else
			target = this.sideTarget;

		// Animating all the needed camera attributes
		animateAttribute(this, target[ALPHA], "alpha", CAMERA_ANIMATION_TIME, FPS * 1000);
		animateAttribute(this, target[BETA], "beta", CAMERA_ANIMATION_TIME, FPS * 1000);
		animateAttribute(this, target[FOV], "fov", CAMERA_ANIMATION_TIME, FPS * 1000);
		animateAttribute(this, target[RADIUS], "radius", CAMERA_ANIMATION_TIME, FPS * 1000);
	}
}