// Type definitions for shared constants
// This provides TypeScript support for the shared/constants.js file

export interface GameConstants {
  BALL_MAX_SPEED: number;
  BALL_INITIAL_SPEED: number;
  BALL_SPEED_INCREMENT: number;
  BALL_RADIUS: number;
  BALL_Y: number | null;
  BALL_INITIAL_ANGLE_DEG: number;
  PADDLE_MAX_SPEED: number;
  PADDLE_DRAG: number;
  PADDLE_MAX_DEVIATION_ANGLE: number;
  DASH_COOLDOWN: number;
  DASH_DURATION: number;
  DASH_POWER: number;
  TICK_RATE: number;
  PLAYER1_Z: number | null;
  PLAYER2_Z: number | null;
  HEIGHT_LIMIT: number | null;
  WIDTH_LIMIT: number | null;
  PADDLE_SIZE: number | null;
  MAX_ROUNDS: number;
}

export interface SpellTypes {
  ballAngleSwitch: { offensive: boolean };
  ballShot: { offensive: boolean };
  ballPortal: { offensive: boolean };
  ballStop: { offensive: boolean };
  ballBack: { offensive: boolean };
  ballIman: { offensive: boolean };
}

export interface SpellCycles {
  offensive: string[];
  counter: string[];
}

export interface SpellConstants {
  ballAngleSwitch: number;
  ballAngleDuration: number;
  ballShot: number;
  ballShotDuration: number;
  ballShotSpeedBoost: number;
  ballPortal: number;
  ballPortalDuration: number;
  ballStop: number;
  ballStopDuration: number;
  ballBack: number;
  ballBackDuration: number;
  ballIman: number;
  ballImanDuration: number;
}

export const GAME_CONSTANTS: GameConstants;
export const spellTypes: SpellTypes;
export const spellCycles: SpellCycles;
export const SPELL_CONSTANTS: SpellConstants;

export function degreesToRadians(degrees: number): number;
export function radiansToDegrees(radians: number): number;
