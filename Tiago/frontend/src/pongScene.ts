import { Scene, Vector3, PointLight, Material, MeshBuilder, TransformNode, Color3, Texture, ShadowGenerator, GlowLayer, StandardMaterial, DynamicTexture, RectAreaLight, Tools, Mesh, PBRMaterial} from "@babylonjs/core";
import { AppendSceneAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/inspector";
import { createCandleParticles, createWallParticles, createBallParticles, WALL_VFX } from "./pongVFX"
import { animateAttribute, animateMeshes } from "./pongAnimations"
import "@babylonjs/loaders/glTF/2.0";
import { Pong, FPS } from "./pong";


// Light Properties
const MAX_LIGHTS = 10;
const CANDLE_LIGHT_INTENSITY = 0.1;
const CANDLE_COLOR = new Color3(2, 0.35, 0);
const CANDLE_FLICKER = 0.15;
const CANDLE_FLICKER_DURATION = 300; // time in ms

// Creates and populates a Scene
export async function createScene(pong: Pong) : Promise<Scene>
{
	// Instantiating a scene
	let scene = new Scene(pong.engine);

	// Linking the scene to the entire window instead of only the canva
	scene.attachControl(true, true, true);
	
	// Creating a solid 1x1 white texture to be used by the particles
	const blankTexture = new DynamicTexture("blankTexture", 1, scene, false);
	blankTexture.getContext().fillStyle = "#ffffff";
	blankTexture.getContext().fillRect(0, 0, 1, 1);
	blankTexture.update();
	
	// Creating all the compotents that compose the game scene
	await populateScene(scene, pong);

	scene.debugLayer.show({
    overlay: true,      // no overlay, uses a side panel
});

	return (scene);
}

// Changes the maximum number of lights in a scene (default = 4)
function setMaxSimultaneousLights(scene: Scene)
{
	scene.materials.forEach(function (material: StandardMaterial)
	{
		material.maxSimultaneousLights = MAX_LIGHTS;
	});
}

// See all imported meshe's information
function importInfo(scene: Scene)
{
	scene.meshes.forEach(m => console.log("Mesh:", m.name));
	scene.transformNodes.forEach(t => console.log("TransformNode:", t.name));
	scene.rootNodes.forEach(r => console.log("RootNode:", r.name));
}

// Create a persistent clandle light flickering
function candleFlicker(scene: Scene, light: PointLight)
{
	let lastUpdate = 0;
	scene.registerBeforeRender(() => {
		const now = performance.now();
		if (now - lastUpdate >= CANDLE_FLICKER_DURATION)
		{
			lastUpdate = now;
			const flicker = CANDLE_LIGHT_INTENSITY *
				(1 - CANDLE_FLICKER + Math.random() * (CANDLE_FLICKER * 2));
			animateAttribute(light, flicker, "intensity", CANDLE_FLICKER_DURATION, FPS)
		}
	})
}

// Lights and adds particles to all candles present in the mesh
function litCandles(scene: Scene)
{
	// Iterating all "candle" meshes to create a fire particle
	for (let i = 1; i <= 100; i++)
	{
		let candleMesh = scene.getMeshByName("candle" + i);
		if (!candleMesh)
			break;

		// Creating and starting a fire particles for the candles
		let newFireParticle = createCandleParticles(scene, candleMesh.absolutePosition);
		newFireParticle.emitter = candleMesh.absolutePosition;
		newFireParticle.start();
	}

	// Iterating all "candleBase" meshes to create a light source
	for (let i = 1; i <= 100; i++)
	{
		let candleBaseMesh = scene.getMeshByName("candleBase" + i);
		if (!candleBaseMesh)
			break;

		// Creating a light source
		let candleLight = new PointLight("candle", candleBaseMesh.absolutePosition, scene);
		candleLight.intensity = CANDLE_LIGHT_INTENSITY;
		candleLight.diffuse = CANDLE_COLOR;

		// Creates an animation simulate a fire light
		candleFlicker(scene, candleLight);
	}
}

let vector = new Vector3;

// Adds particles to the walls
function createWalls(scene: Scene, pong: Pong)
{
	// Getting the corner positions
	let frontRight = scene.getMeshByName("frontRight").position;
	let frontLeft = scene.getMeshByName("frontLeft").position;
	let backRight = scene.getMeshByName("backRight").position;
	let backLeft = scene.getMeshByName("backLeft").position;

	// Getting the mesh's reference to the map limits
	pong.heightLimit = frontRight.x;
	pong.widthLimit = frontRight.z;

	// Creating particles for each wall
	createWallParticles(scene, frontLeft, frontRight, 1);
	createWallParticles(scene, backRight, backLeft, 2);
	createWallParticles(scene, backRight, frontRight, 3);
	createWallParticles(scene, frontLeft, backLeft, 4);

	// Creating lights for the walls
	lightWall(scene, "frontWall", 0, frontRight.z, frontRight.x * 2, false);
	lightWall(scene, "backWall", 0, backRight.z, frontRight.x * 2, false);
	lightWall(scene, "leftWall", frontLeft.x, 0, frontRight.z * 2, true);
	lightWall(scene, "rightWall", frontRight.x, 0, frontRight.z * 2, true);
}

// Illumination of the Walls 
function lightWall(scene: Scene, name: string, x: number, z: number, width: number, side: boolean)
{
	// Creating a thin line of light
	let light = new RectAreaLight(name, Vector3.Zero(), width, 0.01, scene);
	light.intensity = 3.5;
	light.diffuse = scene.getLightByName("ball").diffuse;

	// Rotating the light to face downwards
	const lightNode = new TransformNode(name + "Node", scene);
	light.parent = lightNode;
	lightNode.position = new Vector3(x, 0.25, z);
	if (side)
		lightNode.rotation = new Vector3(Tools.ToRadians(-90), Tools.ToRadians(90) * Math.sign(x), 0);
	else
		lightNode.rotation = new Vector3(Tools.ToRadians(-90), 0, 0);
}

// Creating all ball special effects
function createBall(scene: Scene, position: Vector3)
{
	createBallParticles(scene, position);
	let ballLight = new PointLight("ball", position, scene);
	ballLight.intensity = 0.03;
	ballLight.diffuse = new Color3(0, 0, 0);
}

// Creation of the players visual "pieces"
function createPlayers(scene: Scene)
{
	// Animating all players meshes
	animateMeshes(scene);

	// Making a mesh not affectable by lights (always lit)
	const eyes = scene.getMeshByName("leftEye");
	(eyes.material as PBRMaterial).unlit = true;
	const paddles = scene.getMeshByName("paddle1");
	(paddles.material as PBRMaterial).unlit = true;
}

// Populating a scene
async function populateScene(scene: Scene, pong: Pong) : Promise<Scene>
{
	scene.useRightHandedSystem = true;

	// Importing the game scene
	await AppendSceneAsync("/models/pong.glb", scene);

	// Setting the maximum number of lights
	setMaxSimultaneousLights(scene);

	// Debugging meshes
	//importInfo(scene);

	// Creating Candle and light effects
	litCandles(scene);

	// Creating the Ball particles and light
	createBall(scene, pong.ball);

	// Creating Wall particles and effects 
	createWalls(scene, pong);

	// Animating the player meshes
	createPlayers(scene);

	return (scene);
}
