import {
  SphereParticleEmitter,
  Color4,
  Tools,
  Scalar,
  ParticleSystem,
  HemisphericParticleEmitter,
  Vector3,
  Mesh,
} from "@babylonjs/core";
//import { createSpell } from "./pongVFX";
import { Pong, Player } from "./pong";
import {
  createSpellParticles,
  splashEffect,
  updateArena,
  COLOR_DIFFERENCE,
  OFFENSIVE_SPELL_VFX,
  COUNTER_SPELL_VFX,
  OFFENSIVE_CAST_VFX,
  COUNTER_CAST_VFX,
  diskExplosion,
  spellReadyVFX,
} from "./pongVFX";
import {
  useSpellAnimation,
  OFFENSIVE_CASTING,
  COUNTER_CASTING,
} from "./pongAnimations";

export abstract class Spell {
  abstract color: Color4;

  abstract readonly cooldown: number;
  cooldownElapsed: number;

  duration!: number;
  activeElapsed!: number;

  readonly maxSize!: number;
  readonly initialSize: number;

  active: boolean;
  ready: boolean;

  pong: Pong;
  player: Player;
  name: string;
  hand!: Mesh;
  arm: Vector3;

  castingAnimation!: any;
  castingVFX!: any;
  castingAngle: number;

  particle!: ParticleSystem;
  hemisphericEmitter: HemisphericParticleEmitter;

  nextSpell!: Spell;

  abstract switchSpell(): any;
  abstract useSpell(): any;
  abstract loopAddon(elapsedTime: number): any;

  constructor(pong: Pong, player: Player, name: string) {
    this.cooldownElapsed = 0;
    this.ready = false;
    this.active = false;
    this.pong = pong;
    this.player = player;
    this.initialSize = 0.01;
    this.name = name;

    // Getting the secondary arm mesh to animate the spell casting idependently from other animations
    this.arm = (this.pong.scene.getNodeByName(name + "Arm2") as Mesh).position;

    // Finding out the correct hand to assign the spell
    if (player.rightHand.name == name + "Arm") {
      this.particle = createSpellParticles(
        this.pong.scene,
        this,
        OFFENSIVE_SPELL_VFX
      );
      this.castingAnimation = OFFENSIVE_CASTING;
      this.castingVFX = OFFENSIVE_CAST_VFX;
      this.hand = player.rightHand;
      this.maxSize = 0.1;
    } else if (player.leftHand.name == name + "Arm") {
      this.particle = createSpellParticles(
        this.pong.scene,
        this,
        COUNTER_SPELL_VFX
      );
      this.castingAnimation = COUNTER_CASTING;
      this.castingVFX = COUNTER_CAST_VFX;
      this.hand = player.leftHand;
      this.maxSize = 0.05;
    }
    this.hemisphericEmitter = this.particle
      .particleEmitterType as HemisphericParticleEmitter;

    // Figuring out the spell effects direction
    if (name.includes("Player")) this.castingAngle = Math.PI * 0.5;
    else this.castingAngle = -Math.PI * 0.5;
  }

  stopParticles() {
    this.particle.stop();
    this.particle.dispose(false);
  }

  setSpellColor() {
    this.particle.color1 = this.color;
    this.particle.color2 = this.color.clone();
    this.particle.color2.set(
      this.color.r + COLOR_DIFFERENCE,
      this.color.g + COLOR_DIFFERENCE,
      this.color.b + COLOR_DIFFERENCE,
      this.color.a
    );
  }

  resetSpell() {
    this.ready = false;
    this.active = false;
    this.cooldownElapsed = 0;
    (this.particle.particleEmitterType as SphereParticleEmitter).radius =
      this.initialSize;
  }

  activateSpell() {
    useSpellAnimation(this.arm, this.castingAnimation);
    setTimeout(() => {
      splashEffect(
        this.pong.scene,
        this.hand.absolutePosition,
        1,
        this.castingAngle,
        this.castingVFX
      );
    }, this.castingAnimation[3]);
    this.changeArenaColor();
    this.resetSpell();
    this.active = true;
    this.activeElapsed = 0;
  }

  changeArenaColor() {
    // Changing the ball Particle to change every element of the arena
    updateArena(this.pong.scene, this.color, this.pong.ball);

    // Changing the light Object of the Ball and Walls
    let light = this.pong.scene.getLightById("ball")!;
    light.diffuse.set(this.color.r, this.color.g, this.color.b);
  }

  // Function to monitor and animate the Power
  spellLoop(delta: number) {
    let elapsedTime = delta * 1000;
    if (!this.ready) {
      this.cooldownElapsed += elapsedTime;

      // Particles size growth
      const t = Math.min(this.cooldownElapsed / this.cooldown, 1);

      this.hemisphericEmitter.radius =
        this.initialSize + (this.maxSize - this.initialSize) * t;

      if (this.cooldownElapsed >= this.cooldown) {
        this.ready = true;
        spellReadyVFX(this.pong.scene, this);
      }
    }

    // Spell loop
    if (this.active) this.loopAddon(elapsedTime);
  }
}

/////////////////////////////////////////////////
//        OFFENSIVE SPELLS (Right Hand)        //
/////////////////////////////////////////////////

// Mirrors the Ball angle
export class BallAngleSwitch extends Spell {
  readonly cooldown = 3000;
  color = new Color4(1, 0, 1, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand);
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallShot(this.pong, this.player, this.name);
    this.player.offensiveSpell = nextSpell;
  }

  useSpell() {
    if (!this.ready) return;

    this.activateSpell();
    this.pong.ball.setAngle(Math.PI - this.pong.ball.angle);
  }

  loopAddon(elapsedTime: number) {
    elapsedTime;
  }
}

// Increases speed and changes the Ball angle to a straight shot
class BallShot extends Spell {
  readonly cooldown = 4000;
  readonly duration = 500;
  readonly speedBoost = 2;
  originalSpeed!: number;
  color = new Color4(0, 1, 0, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand);
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallPortal(this.pong, this.player, this.name);
    this.player.offensiveSpell = nextSpell;
  }

  useSpell() {
    if (!this.ready) return;

    this.activateSpell();
    this.originalSpeed = this.pong.ball.speed;
    this.pong.ball.speed *= this.speedBoost;
    if (this.pong.ball.angle > 0 && this.pong.ball.angle < Math.PI)
      this.pong.ball.setAngle(Tools.ToRadians(90));
    else this.pong.ball.setAngle(Tools.ToRadians(270));
  }

  loopAddon(elapsedTime: number) {
    this.activeElapsed += elapsedTime;
    if (this.activeElapsed >= this.duration) {
      this.active = false;
      this.pong.ball.speed = this.originalSpeed;
    }
  }
}

// Makes the Ball teleport to the opposite wall instead of colliding
class BallPortal extends Spell {
  readonly cooldown = 5000;
  readonly duration = 500;
  lastXDir!: number;
  lastZDir!: number;

  color = new Color4(1, 0, 0, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand);
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallAngleSwitch(this.pong, this.player, this.name);
    this.player.offensiveSpell = nextSpell;
  }

  useSpell() {
    if (!this.ready) return;

    this.activateSpell();
    this.lastXDir = Math.sign(this.pong.ball.cos);
    this.lastZDir = Math.sign(this.pong.ball.sin);
  }

  loopAddon(elapsedTime: number) {
    // Checking if the ball bounced with the wall after the last loop call
    if (
      this.lastZDir == Math.sign(this.pong.ball.sin) &&
      this.lastXDir != Math.sign(this.pong.ball.cos)
    ) {
      this.pong.ball.x *= -1;
      this.pong.ball.setAngle(Math.PI - this.pong.ball.angle);
      this.active = false;
    }
    this.lastXDir = Math.sign(this.pong.ball.cos);
    this.lastZDir = Math.sign(this.pong.ball.sin);

    // Making the spell available for a time window
    this.activeElapsed += elapsedTime;
    if (this.activeElapsed >= this.duration) this.active = false;
  }
}

/////////////////////////////////////////////////
//        COUNTER SPELLS (Right Hand)        //
/////////////////////////////////////////////////

// Makes the Ball stop for a set time
export class BallStop extends Spell {
  readonly cooldown = 5000;
  readonly duration = 2000;
  originalPosition!: Vector3;

  readonly color = new Color4(0, 0, 1, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand);
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallBack(this.pong, this.player, this.name);
    this.player.counterSpell = nextSpell;
  }

  useSpell() {
    if (!this.ready) return;

    this.activateSpell();
    this.originalPosition = this.pong.ball.clone();
  }

  loopAddon(elapsedTime: number) {
    this.pong.ball.set(
      this.originalPosition.x,
      this.originalPosition.y,
      this.originalPosition.z
    );

    this.activeElapsed += elapsedTime;
    if (this.activeElapsed >= this.duration) this.active = false;
  }
}

// Makes the Ball go backwards
class BallBack extends Spell {
  readonly cooldown = 4000;
  readonly color = new Color4(1, 1, 0, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand);
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallIman(this.pong, this.player, this.name);
    this.player.counterSpell = nextSpell;
  }

  useSpell() {
    if (!this.ready) return;
    this.activateSpell();
    this.pong.ball.setAngle(this.pong.ball.angle + Math.PI);
  }

  loopAddon(elapsedTime: number) {
    this.activeElapsed += elapsedTime;
    if (this.activeElapsed >= this.duration) this.active = false;
  }
}

// Makes the ball angle go towards the player paddle
class BallIman extends Spell {
  readonly cooldown = 1000;
  readonly duration = 1000;
  readonly strenght = Tools.ToRadians(90); // Radians changet per second
  readonly color = new Color4(1, 0, 1, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand);
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallStop(this.pong, this.player, this.name);
    this.player.counterSpell = nextSpell;
  }

  useSpell() {
    if (!this.ready) return;
    this.activateSpell();
  }

  loopAddon(elapsedTime: number) {
    let delta = elapsedTime * 0.001;
    let ballToPaddleAngle = Math.atan2(
      this.player.z - this.pong.ball.z,
      this.player.x - this.pong.ball.x
    );

    let direction = -1;
    if (
      this.pong.ball.angle - ballToPaddleAngle <
      ballToPaddleAngle - this.pong.ball.angle
    )
      direction = 1;

    let deviation = this.strenght * delta * direction;

    this.pong.ball.setAngle(this.pong.ball.angle + deviation);

    this.activeElapsed += elapsedTime;
    if (this.activeElapsed >= this.duration) this.active = false;
  }
}
