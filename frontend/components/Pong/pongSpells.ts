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
import { Pong, Player, FPS } from "./pong";
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
import { sendUseSpell, sendSwitchSpell } from "./pongSocket";
import {
  useSpellAnimation,
  OFFENSIVE_CASTING,
  COUNTER_CASTING,
  ANIMATION_FPS,
} from "./pongAnimations";
import { SPELL_CONSTANTS } from "@/shared/constants";


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
  spellType: string;

  castingAnimation!: any;
  castingVFX!: any;
  castingAngle: number;

  particle!: ParticleSystem;
  hemisphericEmitter: HemisphericParticleEmitter;

  nextSpell!: Spell;

  private sizeUpdateObserver: any = null;
  private lastSizeUpdate: number = 0;

  abstract switchSpell(): any;
  abstract useSpell(offensive: boolean): any;
  abstract loopAddon(elapsedTime: number): any;

  constructor(pong: Pong, player: Player, name: string, spellType: string) {
    this.cooldownElapsed = 0;
    this.ready = false;
    this.active = false;
    this.pong = pong;
    this.player = player;
    this.initialSize = 0.01; // Size of the spell (only visual)
    this.name = name;
    this.spellType = spellType;

    // Getting the secondary arm mesh to animate the spell casting idependently from other animations
    this.arm = (this.pong.scene.getNodeByName(name + "Arm2") as Mesh).position;

    // Finding out the correct hand to assign the spell
    if (player.rightHand.name == name + "Arm") {
      this.particle = createSpellParticles(
        this.pong.scene,
        this,
        OFFENSIVE_SPELL_VFX,
      );
      this.castingAnimation = OFFENSIVE_CASTING;
      this.castingVFX = OFFENSIVE_CAST_VFX;
      this.hand = player.rightHand;
      this.maxSize = 0.1;
    } else if (player.leftHand.name == name + "Arm") {
      this.particle = createSpellParticles(
        this.pong.scene,
        this,
        COUNTER_SPELL_VFX,
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

    // Register the size update callback once
    this.sizeUpdateObserver = this.pong.scene.registerBeforeRender(() => {
      this.updateSpellSize();
    });
  }

  stopParticles() {
    if (this.sizeUpdateObserver) {
      this.pong.scene.unregisterBeforeRender(this.sizeUpdateObserver);
      this.sizeUpdateObserver = null;
    }
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
      this.color.a,
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
        this.castingVFX,
      );
    }, this.castingAnimation[3]);

    this.changeArenaColor();
    this.resetSpell();

    if (this.pong.online) {
      return;
    }

    this.active = true;
    this.activeElapsed = 0;
  }

  // Function to monitor and animate the Power
  spellLoop(delta: number) {
    let elapsedTime = delta * 1000;
    if (!this.ready) {
      this.cooldownElapsed += elapsedTime;

      if (this.cooldownElapsed >= this.cooldown) {
        this.ready = true;
        spellReadyVFX(this.pong.scene, this);
      }
    }

    if (this.active && !this.pong.online) {
      this.loopAddon(elapsedTime);
    }
  }

  updateSpellSize() {
    const frameDuration = 1000 / FPS;
    const now = performance.now();

    if (now - this.lastSizeUpdate < frameDuration) {
      return;
    }

    const t = Math.min(this.cooldownElapsed / this.cooldown, 1);

    this.hemisphericEmitter.radius =
      this.initialSize + (this.maxSize - this.initialSize) * t;

    this.lastSizeUpdate = now;
  }

  resetArenaColor() {
    const defaultColor = new Color4(0, 0, 0, 0);
    updateArena(this.pong.scene, defaultColor, this.pong.ball);
    let light = this.pong.scene.getLightById("ball")!;
    light.diffuse.set(0, 0, 0);
  }

  changeArenaColor() {
    // Changing the ball Particle to change every element of the arena
    updateArena(this.pong.scene, this.color, this.pong.ball);

    // Changing the light Object of the Ball and Walls
    let light = this.pong.scene.getLightById("ball")!;
    light.diffuse.set(this.color.r, this.color.g, this.color.b);
  }
}

/////////////////////////////////////////////////
//        OFFENSIVE SPELLS (Right Hand)        //
/////////////////////////////////////////////////

// Mirrors the Ball angle
export class BallAngleSwitch extends Spell {
  readonly cooldown = SPELL_CONSTANTS.ballAngleSwitch;
  readonly duration = SPELL_CONSTANTS.ballAngleDuration;
  color = new Color4(0, 0, 1, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand, "ballAngleSwitch");
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallShot(this.pong, this.player, this.name);
    this.player.offensiveSpell = nextSpell;
  }

  useSpell(offensive: boolean) {
    if (!this.ready) return;
    this.activateSpell();
    if (this.pong.online) {
      sendUseSpell(this.pong, offensive);
      return;
    }
    this.pong.ball.setAngle(Math.PI - this.pong.ball.angle);
  }

  loopAddon(elapsedTime: number) {
    this.activeElapsed += elapsedTime;
    if (this.activeElapsed >= this.duration) {
      this.active = false;
    }
  }
}

// Increases speed and changes the Ball angle to a straight shot
class BallShot extends Spell {
  readonly cooldown = SPELL_CONSTANTS.ballShot;
  readonly duration = SPELL_CONSTANTS.ballShotDuration;
  readonly speedBoost = SPELL_CONSTANTS.ballShotSpeedBoost;
  originalSpeed!: number;
  color = new Color4(0, 1, 0, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand, "ballShot");
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallPortal(this.pong, this.player, this.name);
    this.player.offensiveSpell = nextSpell;
  }

  useSpell(offensive: boolean) {
    if (!this.ready) return;
    this.activateSpell();
    if (this.pong.online) {
      sendUseSpell(this.pong, offensive);
      return;
    }
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
  readonly cooldown = SPELL_CONSTANTS.ballPortal;
  readonly duration = SPELL_CONSTANTS.ballPortalDuration;
  lastXDir!: number;
  lastZDir!: number;

  color = new Color4(1, 0, 0, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand, "ballPortal");
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallAngleSwitch(this.pong, this.player, this.name);
    this.player.offensiveSpell = nextSpell;
  }

  useSpell(offensive: boolean) {
    if (!this.ready) return;
    this.activateSpell();
    if (this.pong.online) {
      sendUseSpell(this.pong, offensive);
      return;
    }
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
  readonly cooldown = SPELL_CONSTANTS.ballStop;
  readonly duration = SPELL_CONSTANTS.ballStopDuration;
  originalPosition!: Vector3;

  readonly color = new Color4(0, 1, 1, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand, "ballStop");
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallBack(this.pong, this.player, this.name);
    this.player.counterSpell = nextSpell;
  }

  useSpell(offensive: boolean) {
    if (!this.ready) return;
    this.activateSpell();
    if (this.pong.online) {
      sendUseSpell(this.pong, offensive);
      return;
    }
    this.originalPosition = this.pong.ball.clone();
  }

  loopAddon(elapsedTime: number) {
    this.pong.ball.set(
      this.originalPosition.x,
      this.originalPosition.y,
      this.originalPosition.z,
    );

    this.activeElapsed += elapsedTime;
    if (this.activeElapsed >= this.duration) this.active = false;
  }
}

// Makes the Ball go backwards
class BallBack extends Spell {
  readonly cooldown = SPELL_CONSTANTS.ballBack;
  readonly color = new Color4(1, 1, 0, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand, "ballBack");
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallIman(this.pong, this.player, this.name);
    this.player.counterSpell = nextSpell;
  }

  useSpell(offensive: boolean) {
    if (!this.ready) return;
    this.activateSpell();
    if (this.pong.online) {
      sendUseSpell(this.pong, offensive);
      return;
    }
    this.pong.ball.setAngle(this.pong.ball.angle + Math.PI);
  }

  loopAddon(elapsedTime: number) {
  }
}

// Makes the ball angle go towards the player paddle
class BallIman extends Spell {
  readonly cooldown = SPELL_CONSTANTS.ballIman;
  readonly duration = SPELL_CONSTANTS.ballImanDuration;
  readonly strenght = Tools.ToRadians(90); // Radians changed per second
  readonly color = new Color4(1, 0, 1, 1);

  constructor(pong: Pong, player: Player, hand: string) {
    super(pong, player, hand, "ballIman");
    this.setSpellColor();
  }

  switchSpell() {
    this.stopParticles();
    let nextSpell = new BallStop(this.pong, this.player, this.name);
    this.player.counterSpell = nextSpell;
  }

  useSpell(offensive: boolean) {
    if (!this.ready) return;
    this.activateSpell();
    if (this.pong.online) {
      sendUseSpell(this.pong, offensive);
      return;
    }
  }

  loopAddon(elapsedTime: number) {
    let delta = elapsedTime * 0.001;
    let ballToPaddleAngle = Math.atan2(
      this.player.z - this.pong.ball.z,
      this.player.x - this.pong.ball.x,
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

export function getNewSpell(
  pong: Pong,
  player: Player,
  spell: Spell,
  newSpellName: String,
): Spell {
  spell.stopParticles();
  switch (newSpellName) {
    case "ballAngleSwitch":
      return new BallAngleSwitch(pong, player, spell.name);
    case "ballShot":
      return new BallShot(pong, player, spell.name);
    case "ballPortal":
      return new BallPortal(pong, player, spell.name);
    case "ballStop":
      return new BallStop(pong, player, spell.name);
    case "ballBack":
      return new BallBack(pong, player, spell.name);
    case "ballIman":
      return new BallIman(pong, player, spell.name);
    default:
      throw new Error(`Unknown spell type: ${newSpellName}`);
  }
}
