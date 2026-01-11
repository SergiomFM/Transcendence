import {
  Scene,
  Vector3,
  Scalar,
  ParticleSystem,
  Color4,
  DynamicTexture,
  Matrix,
  BoxParticleEmitter,
  HemisphericParticleEmitter,
} from "@babylonjs/core";
import { Spell } from "./pongSpells";

export const COLOR_DIFFERENCE = 1;
const PARTICLE_FPS = 24;

// Ball
const BALL_VFX = {
  NAME: "ball",
  COLOR_1: new Color4(1, 1, 1, 1),
  COLOR_2: new Color4(0, 0, 0, 0.7),
  MIN_SIZE: 0.01,
  MAX_SIZE: 0.03,
  MIN_TIME: 0.03,
  MAX_TIME: 0.05,
  EMIT_RATE: 500,
  MIN_POWER: 0.01,
  MAX_POWER: 0.03,
  RADIUS: 0.01,
};

// Splash
export const COLLISION_VFX = {
  NAME: "collision",
  COLOR_1: BALL_VFX["COLOR_1"],
  COLOR_2: BALL_VFX["COLOR_2"],
  MIN_SIZE: 0.005,
  MAX_SIZE: 0.01,
  MIN_TIME: 0.1,
  MAX_TIME: 0.3,
  EMIT_RATE: 100,
  MIN_POWER: 0.5,
  MAX_POWER: 1.5,
  SPREAD: 50,
  PARTICLE_NUMBER: 100,
};

// Disk Explosion
const DISK_EXPLOSION_VFX = {
  NAME: "diskExplosion",
  COLOR_1: BALL_VFX["COLOR_1"],
  COLOR_2: BALL_VFX["COLOR_2"],
  MIN_SIZE: 0.004,
  MAX_SIZE: 0.006,
  MIN_TIME: 0.1,
  MAX_TIME: 0.6,
  EMIT_RATE: 100,
  MIN_POWER: 1.8,
  MAX_POWER: 2.7,
  PARTICLE_NUMBER: 200,
};

// Wall Explosion
const WALL_EXPLOSION_VFX = {
  NAME: "wallExplosion",
  COLOR_1: BALL_VFX["COLOR_1"],
  COLOR_2: BALL_VFX["COLOR_2"],
  MIN_SIZE: 0.01,
  MAX_SIZE: 0.02,
  MIN_TIME: 0.2,
  MAX_TIME: 0.4,
  EMIT_RATE: 100,
  MIN_POWER: 1.8,
  MAX_POWER: 2.7,
  PARTICLE_NUMBER: 200,
};

// Walls
export const WALL_VFX = {
  NAME: "wall",
  COLOR_1: BALL_VFX["COLOR_1"],
  COLOR_2: BALL_VFX["COLOR_2"],
  MIN_SIZE: 0.005,
  MAX_SIZE: 0.01,
  MIN_TIME: 3,
  MAX_TIME: 4,
  EMIT_RATE: 200,
  MIN_POWER: 0.1,
  MAX_POWER: 0.15,
  HEIGHT: 0.5,
};

// Candles
const CANDLE_VFX = {
  NAME: "Candle",
  COLOR_1: new Color4(1, 0.27, 0),
  COLOR_2: new Color4(0.1, 0.08, 0.08),
  MIN_SIZE: 0.005,
  MAX_SIZE: 0.01,
  MIN_TIME: 1,
  MAX_TIME: 2,
  EMIT_RATE: 100,
  MIN_POWER: 0.01,
  MAX_POWER: 0.03,
};

// Offensive Spell VFX
export const OFFENSIVE_SPELL_VFX = {
  NAME: "offensiveSpell",
  COLOR_1: null,
  COLOR_2: null,
  MIN_SIZE: 0.006,
  MAX_SIZE: 0.018,
  MIN_TIME: 0.3,
  MAX_TIME: 0.05,
  EMIT_RATE: 1000,
  MIN_POWER: 0.01,
  MAX_POWER: 0.03,
  RADIUS: 0.01,
};

// Counter Spell VFX
export const COUNTER_SPELL_VFX = {
  NAME: "counterSpell",
  COLOR_1: null,
  COLOR_2: null,
  MIN_SIZE: 0.006,
  MAX_SIZE: 0.018,
  MIN_TIME: 0.03,
  MAX_TIME: 0.05,
  EMIT_RATE: 1000,
  MIN_POWER: 0.01,
  MAX_POWER: 0.03,
  RADIUS: 0.01,
};

// Spell casting VFX
export const OFFENSIVE_CAST_VFX = {
  NAME: "offensiveCast",
  COLOR_1: BALL_VFX["COLOR_1"],
  COLOR_2: BALL_VFX["COLOR_2"],
  MIN_SIZE: 0.015,
  MAX_SIZE: 0.03,
  MIN_TIME: 0.1,
  MAX_TIME: 0.3,
  EMIT_RATE: 100,
  MIN_POWER: 1,
  MAX_POWER: 3,
  SPREAD: 70,
  PARTICLE_NUMBER: 100,
};

export const COUNTER_CAST_VFX = {
  NAME: "counterCast",
  COLOR_1: BALL_VFX["COLOR_1"],
  COLOR_2: BALL_VFX["COLOR_2"],
  MIN_SIZE: 0.015,
  MAX_SIZE: 0.03,
  MIN_TIME: 0.2,
  MAX_TIME: 0.6,
  EMIT_RATE: 100,
  MIN_POWER: 0.5,
  MAX_POWER: 1.5,
  SPREAD: 90,
  PARTICLE_NUMBER: 100,
};

// Creates a blank texture
export function createBlankTexture(scene: Scene) {
  // Creating a solid 1x1 white texture
  const blankTexture = new DynamicTexture("blankTexture", 1, scene, false);
  blankTexture.getContext().fillStyle = "#ffffff";
  blankTexture.getContext().fillRect(0, 0, 1, 1);
  blankTexture.update();
}

function startParticle(scene: Scene, particle: ParticleSystem) {
  // Starting the particle
  particle.start();

  // Creating a Limitation for the partice update frequency
  const updateInterval = 1000 / PARTICLE_FPS;
  let lastUpdate = performance.now();

  let particleObserver = scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const delta = now - lastUpdate;

    if (delta >= updateInterval) {
      // Only updating values
      particle.animate(true);
      lastUpdate = now;

      // Deleting the observer and the particle in case it stops
      if (!particle.isAlive() && particle.getActiveCount() === 0) {
        console.log("DELETEI");
        scene.onBeforeRenderObservable.remove(particleObserver);
        particle.stop();
        particle.dispose(false);
      }
    }
  });
}

// Creates the base attributes of a particle
function createBaseParticle(scene: Scene, VFX: any) {
  const particle = new ParticleSystem(VFX["NAME"], 1000, scene);

  // Coloring a blank texture to use as particle
  particle.particleTexture = scene.getTextureByName("blankTexture");
  particle.color1 = VFX["COLOR_1"];
  particle.color2 = VFX["COLOR_2"];

  // Size of the particles
  particle.minSize = VFX["MIN_SIZE"];
  particle.maxSize = VFX["MAX_SIZE"];

  // Time a particle takes to disapear
  particle.minLifeTime = VFX["MIN_TIME"];
  particle.maxLifeTime = VFX["MAX_TIME"];

  // Rate and velocity of the particles
  particle.emitRate = VFX["EMIT_RATE"];
  particle.minEmitPower = VFX["MIN_POWER"];
  particle.maxEmitPower = VFX["MAX_POWER"];

  return particle;
}

// Creates Ball particles
export function createBallParticles(scene: Scene, position: Vector3) {
  const particle = createBaseParticle(scene, BALL_VFX);

  // Creating a Sphere to emit the particles
  particle.createSphereEmitter(BALL_VFX["RADIUS"], 0.01);
  particle.emitter = position;

  startParticle(scene, particle);
  return particle;
}

// Creates Wall particles
export function createWallParticles(
  scene: Scene,
  begin: Vector3,
  end: Vector3,
  wallNum: number
) {
  const particle = createBaseParticle(scene, WALL_VFX);
  particle.id += wallNum;

  // Creating a plane to emit the particles upwards
  particle.createBoxEmitter(
    new Vector3(0, 0, 0),
    new Vector3(0, WALL_VFX["HEIGHT"], 0),
    new Vector3(begin.x, 0.2, begin.z),
    new Vector3(end.x, 0.2, end.z)
  );

  startParticle(scene, particle);
  return particle;
}

// Creates a fire particle effect for the candles
export function createCandleParticles(scene: Scene, position: Vector3) {
  const particle = createBaseParticle(scene, CANDLE_VFX);

  // Creating a narrow cone to emit the particles
  particle.createConeEmitter(0.0001);
  particle.emitter = position;

  startParticle(scene, particle);
  return particle;
}

// Creates a splash effect in a given location with an angle in radians and a multiplier for the power
export function splashEffect(
  scene: Scene,
  position: Vector3,
  splashPower: number,
  angle: number,
  VFX: any
) {
  const particle = createBaseParticle(scene, VFX);

  // Rate and velocity of the particles
  particle.manualEmitCount = VFX["PARTICLE_NUMBER"];
  particle.minEmitPower *= splashPower;
  particle.maxEmitPower *= splashPower;

  const spread = (VFX["SPREAD"] * Math.PI) / 180;
  let cone = particle.createDirectedConeEmitter(0, 0);
  cone.direction1 = new Vector3(
    Math.cos(spread),
    -Math.sin(spread),
    -Math.sin(spread)
  ).normalize();
  cone.direction2 = new Vector3(
    Math.cos(spread),
    Math.sin(spread),
    Math.sin(spread)
  ).normalize();

  console.log(angle);
  // Rotating the particles direction
  const matrix = Matrix.RotationY(angle);
  cone.direction1 = Vector3.TransformCoordinates(cone.direction1, matrix);
  cone.direction2 = Vector3.TransformCoordinates(cone.direction2, matrix);

  cone.emitFromSpawnPointOnly = true;
  particle.emitter = position;

  startParticle(scene, particle);
  return particle;
}

export function diskExplosion(scene: Scene, position: Vector3) {
  let particle = createBaseParticle(scene, DISK_EXPLOSION_VFX);

  // Rate and velocity of the particles
  particle.manualEmitCount = DISK_EXPLOSION_VFX["PARTICLE_NUMBER"];

  // Creating a cone to emit the particles
  particle.createCylinderEmitter(0.01, 0);
  particle.emitter = position.clone();

  startParticle(scene, particle);
  return particle;
}

export function spellReadyVFX(scene: Scene, spell: Spell) {
  let particle = createBaseParticle(scene, DISK_EXPLOSION_VFX);

  particle.color1 = spell.particle.color1.clone();
  particle.color2 = spell.particle.color2.clone();

  // Rate and velocity of the particles
  particle.manualEmitCount = DISK_EXPLOSION_VFX["PARTICLE_NUMBER"];

  // Creating a cone to emit the particles
  particle.createCylinderEmitter(0.01, 0);
  particle.emitter = spell.hand.absolutePosition.clone();

  startParticle(scene, particle);
  return particle;
}

function updateOldParticles(scene: Scene, name: string, newColor: Color4) {
  let particle = scene.getParticleSystemById(name) as ParticleSystem;
  const originalUpdate = particle.updateFunction;
  particle.updateFunction = (particles) => {
    for (let p of particles) {
      // Force all active particles to use the new color
      let ratio = Scalar.RandomRange(0.01, 1);
      p.color.r = newColor.r + COLOR_DIFFERENCE * ratio;
      p.color.g = newColor.g + COLOR_DIFFERENCE * ratio;
      p.color.b = newColor.b + COLOR_DIFFERENCE * ratio;
    }
    particle.updateFunction = originalUpdate;
  };
}

function wallExplosion(scene: Scene, wallName: string) {
  let particle = createBaseParticle(scene, WALL_EXPLOSION_VFX);

  particle.particleEmitterType =
    scene.getParticleSystemById(wallName)!.particleEmitterType!;

  // Rate and velocity of the particles
  particle.manualEmitCount = WALL_EXPLOSION_VFX["PARTICLE_NUMBER"];

  startParticle(scene, particle);
  return particle;
}

export function updateArena(scene: Scene, newColor: Color4, ballPos: Vector3) {
  // Changing the ball Particle to change every element of the arena
  let particle = scene.getParticleSystemById("ball") as ParticleSystem;
  particle.color1.set(newColor.r, newColor.g, newColor.b, 1);
  particle.color2.set(
    newColor.r + COLOR_DIFFERENCE,
    newColor.g + COLOR_DIFFERENCE,
    newColor.b + COLOR_DIFFERENCE,
    0.7
  );

  // Updating the old particles and creating a visual effect
  const walls = ["wall1", "wall2", "wall3", "wall4"];
  walls.forEach((id) => {
    updateOldParticles(scene, id, newColor), wallExplosion(scene, id);
  });

  // Creating a visual effect for the Arena update
  diskExplosion(scene, ballPos);
}

function cooldownReadyVFX(scene: Scene, spell: Spell) {
  //const particle = createBaseParticle(scene, VFX);
}

export function createSpellParticles(scene: Scene, spell: Spell, VFX: object) {
  const particle = createBaseParticle(scene, VFX);

  // Creating a Sphere to emit the particles
  let hemisphericEmitter = new HemisphericParticleEmitter(
    spell.initialSize,
    0,
    1
  );

  // Called for each particle to set its initial velocity
  const originalPositionFunction =
    hemisphericEmitter.startPositionFunction.bind(hemisphericEmitter);
  hemisphericEmitter.startPositionFunction = function (
    worldMatrix,
    position,
    particle,
    isLocal
  ) {
    originalPositionFunction(worldMatrix, position, particle, true);

    // Flip half the particles downward
    if (Math.random() < 0.5) position.y = -position.y;

    // Transform into the world space
    Vector3.TransformCoordinatesToRef(position, worldMatrix, position);
  };

  // Called for each particle to set its initial velocity
  const originalDirectionFunction =
    hemisphericEmitter.startDirectionFunction.bind(hemisphericEmitter);
  hemisphericEmitter.startDirectionFunction = function (
    worldMatrix,
    direction,
    particle,
    isLocal
  ) {
    originalDirectionFunction(worldMatrix, direction, particle, isLocal);

    // Flip half the particles downward
    if (Math.random() < 0.5) direction.y *= -1; // invert Y to go down
  };

  //particle.emitter = spell.player.rightHand.position;
  particle.emitter = scene.getMeshByName(spell.name + "Hand");
  particle.particleEmitterType = hemisphericEmitter;

  startParticle(scene, particle);
  return particle;
}
