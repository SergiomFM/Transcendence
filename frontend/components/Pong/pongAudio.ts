/**
 * 8-bit synthesized audio system for the Pong game.
 * All sounds are generated at runtime using the Web Audio API — no external files.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicPlaying = false;
let musicNodes: { oscillators: OscillatorNode[]; timeout: ReturnType<typeof setTimeout> | null } | null = null;
let _muted = false;
let _musicMuted = false;
let _sfxVolume = 0.35;
let _musicVolume = 0.08;
let _musicWasPlayingBeforeHidden = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = _musicVolume;
    musicGain.connect(masterGain);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = _sfxVolume;
    sfxGain.connect(masterGain);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ── Primitive synth helpers ────────────────────────────

type WaveType = OscillatorType;

function playTone(
  freq: number,
  duration: number,
  type: WaveType = "square",
  volume = 0.3,
  destination?: GainNode,
  startTime?: number,
  detune = 0
): OscillatorNode {
  const ctx = getCtx();
  const t = startTime ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;

  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain);
  gain.connect(destination ?? sfxGain ?? ctx.destination);

  osc.start(t);
  osc.stop(t + duration + 0.05);
  return osc;
}

function playNoise(duration: number, volume = 0.15, destination?: GainNode, startTime?: number) {
  const ctx = getCtx();
  const t = startTime ?? ctx.currentTime;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 3000;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination ?? sfxGain ?? ctx.destination);

  noise.start(t);
  noise.stop(t + duration + 0.05);
}

// ── Sound effects ──────────────────────────────────────

/** Ball bouncing off a paddle */
export function sfxPaddleHit() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(440, 0.06, "square", 0.35, sfxGain!, t);
  playTone(660, 0.04, "square", 0.2, sfxGain!, t + 0.02);
}

/** Ball bouncing off a wall */
export function sfxWallHit() {
  if (_muted) return;
  playTone(220, 0.05, "square", 0.25);
}

/** Ball collision — generic (for online mode where wall/paddle isn't distinguished) */
export function sfxCollision() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(330, 0.05, "square", 0.3, sfxGain!, t);
  playTone(495, 0.03, "square", 0.15, sfxGain!, t + 0.015);
}

/** Player scored a point */
export function sfxScore() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(523, 0.1, "square", 0.3, sfxGain!, t);
  playTone(659, 0.1, "square", 0.3, sfxGain!, t + 0.1);
  playTone(784, 0.15, "square", 0.3, sfxGain!, t + 0.2);
}

/** Opponent scored / lost a round */
export function sfxLostRound() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(392, 0.12, "square", 0.3, sfxGain!, t);
  playTone(330, 0.12, "square", 0.3, sfxGain!, t + 0.12);
  playTone(262, 0.2, "sawtooth", 0.25, sfxGain!, t + 0.24);
}

/** Countdown "Get Ready" beep */
export function sfxCountdown() {
  if (_muted) return;
  playTone(440, 0.12, "square", 0.25);
}

/** "FIGHT!" / round start */
export function sfxFight() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(523, 0.08, "square", 0.35, sfxGain!, t);
  playTone(659, 0.08, "square", 0.35, sfxGain!, t + 0.06);
  playTone(784, 0.08, "square", 0.35, sfxGain!, t + 0.12);
  playTone(1047, 0.15, "square", 0.4, sfxGain!, t + 0.18);
}

/** Player pressed ready */
export function sfxReady() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(660, 0.06, "square", 0.25, sfxGain!, t);
  playTone(880, 0.08, "square", 0.3, sfxGain!, t + 0.06);
}

/** Opponent pressed ready */
export function sfxOpponentReady() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(550, 0.05, "triangle", 0.2, sfxGain!, t);
  playTone(733, 0.07, "triangle", 0.25, sfxGain!, t + 0.05);
}

/** Offensive spell cast (attack) */
export function sfxSpellOffensive() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(200, 0.15, "sawtooth", 0.3, sfxGain!, t);
  playTone(400, 0.1, "sawtooth", 0.25, sfxGain!, t + 0.05);
  playTone(800, 0.08, "sawtooth", 0.2, sfxGain!, t + 0.1);
  playNoise(0.12, 0.1, sfxGain!, t + 0.05);
}

/** Defensive / counter spell cast (shield) */
export function sfxSpellDefensive() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(600, 0.12, "triangle", 0.3, sfxGain!, t);
  playTone(800, 0.1, "triangle", 0.25, sfxGain!, t + 0.04);
  playTone(1000, 0.08, "sine", 0.2, sfxGain!, t + 0.08);
}

/** Spell cooldown finished — spell ready to use */
export function sfxSpellReady() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(880, 0.05, "triangle", 0.15, sfxGain!, t);
  playTone(1100, 0.05, "triangle", 0.15, sfxGain!, t + 0.06);
  playTone(1320, 0.08, "triangle", 0.2, sfxGain!, t + 0.12);
}

/** Spell switched / cycled */
export function sfxSpellSwitch() {
  if (_muted) return;
  playTone(500, 0.04, "square", 0.15);
  playTone(600, 0.04, "square", 0.15);
}

/** Match won — victory fanfare */
export function sfxVictory() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  // C-E-G-C arpeggio
  playTone(523, 0.12, "square", 0.35, sfxGain!, t);
  playTone(659, 0.12, "square", 0.35, sfxGain!, t + 0.12);
  playTone(784, 0.12, "square", 0.35, sfxGain!, t + 0.24);
  playTone(1047, 0.25, "square", 0.4, sfxGain!, t + 0.36);
  // Harmony
  playTone(523, 0.3, "triangle", 0.15, sfxGain!, t + 0.36);
  playTone(784, 0.3, "triangle", 0.15, sfxGain!, t + 0.36);
}

/** Match lost — defeat sound */
export function sfxDefeat() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(392, 0.15, "sawtooth", 0.3, sfxGain!, t);
  playTone(330, 0.15, "sawtooth", 0.3, sfxGain!, t + 0.15);
  playTone(262, 0.15, "sawtooth", 0.25, sfxGain!, t + 0.3);
  playTone(196, 0.35, "sawtooth", 0.3, sfxGain!, t + 0.45);
}

/** Opponent connected notification */
export function sfxConnect() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(440, 0.06, "triangle", 0.2, sfxGain!, t);
  playTone(660, 0.06, "triangle", 0.2, sfxGain!, t + 0.08);
  playTone(880, 0.1, "triangle", 0.25, sfxGain!, t + 0.16);
}

/** Opponent disconnected notification */
export function sfxDisconnect() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(600, 0.1, "square", 0.2, sfxGain!, t);
  playTone(400, 0.15, "square", 0.25, sfxGain!, t + 0.1);
}

/** Player promoted from spectator to player */
export function sfxPromoted() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(440, 0.08, "square", 0.25, sfxGain!, t);
  playTone(554, 0.08, "square", 0.25, sfxGain!, t + 0.08);
  playTone(660, 0.08, "square", 0.25, sfxGain!, t + 0.16);
  playTone(880, 0.12, "square", 0.3, sfxGain!, t + 0.24);
}

/** Seat available notification */
export function sfxSeatAvailable() {
  if (_muted) return;
  const ctx = getCtx();
  const t = ctx.currentTime;
  playTone(700, 0.06, "triangle", 0.15, sfxGain!, t);
  playTone(900, 0.08, "triangle", 0.2, sfxGain!, t + 0.08);
}

// ── Background music ───────────────────────────────────

/**
 * 8-bit background music loop — dark, arcadey, atmospheric.
 * 8 bars in Cm, ~17.5s per loop. Uses sustained note envelopes
 * and double-buffered Web Audio scheduling for seamless looping.
 */

// Musical notes (Hz)
const NOTE = {
  C2:  65.41, G2:  98.00, Ab2: 103.83, Bb2: 116.54,
  C3: 130.81, D3: 146.83, Eb3: 155.56, F3: 174.61, G3: 196.00, Ab3: 207.65, Bb3: 233.08,
  C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00, Ab4: 415.30, Bb4: 466.16,
  C5: 523.25, D5: 587.33, Eb5: 622.25, G5: 783.99, Ab5: 830.61, Bb5: 932.33,
  REST: 0,
};

const BPM = 110;
const BEAT = 60 / BPM;

/**
 * Play a sustained music note. Unlike playTone (which decays immediately),
 * this holds near-full volume for the note duration and fades gently at the end
 * for a legato feel. Returns the oscillator for cleanup.
 */
function playMusicNote(
  freq: number,
  duration: number,
  type: WaveType,
  volume: number,
  dest: GainNode,
  startTime: number,
): OscillatorNode {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  // Sustain at full volume, then short fade at the end for smoothness
  const fadeTime = Math.min(0.06, duration * 0.2);
  gain.gain.setValueAtTime(0.001, startTime);
  // Quick attack
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  // Hold
  gain.gain.setValueAtTime(volume, startTime + duration - fadeTime);
  // Gentle release
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(dest);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
  return osc;
}

// ─── Patterns: [freq, beats] ─── 8 bars = 32 beats ───

// Bass: driving pulse in Cm, steady 8th-note feel with octave drops
const bassPattern: [number, number][] = [
  // Bar 1: Cm
  [NOTE.C3, 0.5], [NOTE.C2, 0.25], [NOTE.C3, 0.25],
  [NOTE.C3, 0.5], [NOTE.Eb3, 0.25], [NOTE.G3, 0.25],
  [NOTE.C3, 0.5], [NOTE.C2, 0.25], [NOTE.C3, 0.25],
  [NOTE.G3, 0.25], [NOTE.Eb3, 0.25], [NOTE.C3, 0.5],
  // Bar 2: Ab
  [NOTE.Ab2, 0.5], [NOTE.Ab3, 0.25], [NOTE.Ab2, 0.25],
  [NOTE.Ab3, 0.5], [NOTE.C3, 0.25], [NOTE.Eb3, 0.25],
  [NOTE.Ab2, 0.5], [NOTE.Ab3, 0.25], [NOTE.Ab2, 0.25],
  [NOTE.Eb3, 0.25], [NOTE.C3, 0.25], [NOTE.Ab2, 0.5],
  // Bar 3: Bb
  [NOTE.Bb2, 0.5], [NOTE.Bb3, 0.25], [NOTE.Bb2, 0.25],
  [NOTE.Bb3, 0.5], [NOTE.D3, 0.25], [NOTE.F3, 0.25],
  [NOTE.Bb2, 0.5], [NOTE.F3, 0.25], [NOTE.Bb2, 0.25],
  [NOTE.D3, 0.25], [NOTE.F3, 0.25], [NOTE.Bb2, 0.5],
  // Bar 4: G (dominant, tension)
  [NOTE.G2, 0.5], [NOTE.G3, 0.25], [NOTE.G2, 0.25],
  [NOTE.G3, 0.5], [NOTE.Bb2, 0.25], [NOTE.D3, 0.25],
  [NOTE.G3, 0.5], [NOTE.D3, 0.25], [NOTE.G2, 0.25],
  [NOTE.G3, 0.25], [NOTE.REST, 0.25], [NOTE.G2, 0.5],
  // Bar 5: Cm (variation)
  [NOTE.C3, 0.5], [NOTE.G3, 0.25], [NOTE.C3, 0.25],
  [NOTE.Eb3, 0.5], [NOTE.C3, 0.25], [NOTE.G2, 0.25],
  [NOTE.C3, 0.5], [NOTE.C2, 0.25], [NOTE.C3, 0.25],
  [NOTE.Eb3, 0.5], [NOTE.G3, 0.5],
  // Bar 6: Fm
  [NOTE.F3, 0.5], [NOTE.C3, 0.25], [NOTE.F3, 0.25],
  [NOTE.Ab3, 0.5], [NOTE.F3, 0.25], [NOTE.C3, 0.25],
  [NOTE.F3, 0.5], [NOTE.Ab3, 0.25], [NOTE.F3, 0.25],
  [NOTE.C3, 0.25], [NOTE.F3, 0.25], [NOTE.Ab3, 0.5],
  // Bar 7: Ab → Bb
  [NOTE.Ab2, 0.5], [NOTE.Ab3, 0.25], [NOTE.Eb3, 0.25],
  [NOTE.Ab3, 0.5], [NOTE.Ab2, 0.5],
  [NOTE.Bb2, 0.5], [NOTE.Bb3, 0.25], [NOTE.F3, 0.25],
  [NOTE.Bb3, 0.5], [NOTE.Bb2, 0.5],
  // Bar 8: G → Cm resolve
  [NOTE.G2, 0.5], [NOTE.G3, 0.5],
  [NOTE.D3, 0.25], [NOTE.G3, 0.25], [NOTE.Bb3, 0.5],
  [NOTE.G3, 0.5], [NOTE.REST, 0.25], [NOTE.G2, 0.25],
  [NOTE.C3, 0.75], [NOTE.REST, 0.25],
];

// Melody: mysterious 8-bit lead with call-and-response phrasing
const melodyPattern: [number, number][] = [
  // Bar 1: opening motif
  [NOTE.REST, 0.5], [NOTE.G4, 0.25], [NOTE.Eb5, 0.5], [NOTE.D5, 0.25],
  [NOTE.C5, 0.75], [NOTE.Bb4, 0.25], [NOTE.G4, 0.5], [NOTE.Ab4, 1],
  // Bar 2: answer
  [NOTE.REST, 0.25], [NOTE.Ab4, 0.25], [NOTE.C5, 0.5], [NOTE.Eb5, 0.5], [NOTE.C5, 0.5],
  [NOTE.Ab4, 0.5], [NOTE.G4, 0.25], [NOTE.Ab4, 0.25], [NOTE.C5, 1],
  // Bar 3: rising phrase
  [NOTE.REST, 0.5], [NOTE.Bb4, 0.25], [NOTE.D5, 0.5], [NOTE.F4, 0.25],
  [NOTE.Bb4, 0.75], [NOTE.D5, 0.25], [NOTE.Eb5, 0.5], [NOTE.D5, 1],
  // Bar 4: tension / climax
  [NOTE.REST, 0.5], [NOTE.D5, 0.25], [NOTE.G5, 0.75],
  [NOTE.Eb5, 0.5], [NOTE.D5, 0.25], [NOTE.C5, 0.25], [NOTE.Bb4, 0.5],
  [NOTE.G4, 1],
  // Bar 5: echo of bar 1 (softer variation)
  [NOTE.REST, 1], [NOTE.Eb5, 0.25], [NOTE.D5, 0.5], [NOTE.C5, 0.25],
  [NOTE.Bb4, 0.5], [NOTE.C5, 0.5], [NOTE.G4, 1],
  // Bar 6: descending
  [NOTE.Ab4, 0.5], [NOTE.C5, 0.5], [NOTE.Ab5, 0.5], [NOTE.G5, 0.5],
  [NOTE.Eb5, 0.5], [NOTE.C5, 0.5], [NOTE.Ab4, 1],
  // Bar 7: building up
  [NOTE.REST, 0.25], [NOTE.Ab4, 0.25], [NOTE.Bb4, 0.5], [NOTE.C5, 0.5], [NOTE.Eb5, 0.5],
  [NOTE.D5, 0.5], [NOTE.Bb4, 0.25], [NOTE.D5, 0.25], [NOTE.Bb5, 0.5], [NOTE.Ab5, 0.5],
  // Bar 8: resolve back to root
  [NOTE.G5, 0.75], [NOTE.Eb5, 0.25], [NOTE.D5, 0.5], [NOTE.C5, 0.5],
  [NOTE.Bb4, 0.25], [NOTE.G4, 0.25], [NOTE.Eb4, 0.5], [NOTE.C5, 1],
];

// Arpeggio: continuous 16th-note shimmer, follows chord changes
const arpPattern: [number, number][] = [
  // Bar 1: Cm
  [NOTE.C4, 0.25], [NOTE.Eb4, 0.25], [NOTE.G4, 0.25], [NOTE.C5, 0.25],
  [NOTE.G4, 0.25], [NOTE.Eb4, 0.25], [NOTE.C4, 0.25], [NOTE.Eb4, 0.25],
  [NOTE.G4, 0.25], [NOTE.C5, 0.25], [NOTE.Eb4, 0.25], [NOTE.G4, 0.25],
  [NOTE.C4, 0.25], [NOTE.G4, 0.25], [NOTE.Eb4, 0.25], [NOTE.C4, 0.25],
  // Bar 2: Ab
  [NOTE.Ab3, 0.25], [NOTE.C4, 0.25], [NOTE.Eb4, 0.25], [NOTE.Ab4, 0.25],
  [NOTE.Eb4, 0.25], [NOTE.C4, 0.25], [NOTE.Ab3, 0.25], [NOTE.C4, 0.25],
  [NOTE.Eb4, 0.25], [NOTE.Ab4, 0.25], [NOTE.C4, 0.25], [NOTE.Eb4, 0.25],
  [NOTE.Ab3, 0.25], [NOTE.Eb4, 0.25], [NOTE.C4, 0.25], [NOTE.Ab3, 0.25],
  // Bar 3: Bb
  [NOTE.Bb3, 0.25], [NOTE.D4, 0.25], [NOTE.F4, 0.25], [NOTE.Bb4, 0.25],
  [NOTE.F4, 0.25], [NOTE.D4, 0.25], [NOTE.Bb3, 0.25], [NOTE.D4, 0.25],
  [NOTE.F4, 0.25], [NOTE.Bb4, 0.25], [NOTE.D4, 0.25], [NOTE.F4, 0.25],
  [NOTE.Bb3, 0.25], [NOTE.F4, 0.25], [NOTE.D4, 0.25], [NOTE.Bb3, 0.25],
  // Bar 4: Gm
  [NOTE.G3, 0.25], [NOTE.Bb3, 0.25], [NOTE.D4, 0.25], [NOTE.G4, 0.25],
  [NOTE.D4, 0.25], [NOTE.Bb3, 0.25], [NOTE.G3, 0.25], [NOTE.Bb3, 0.25],
  [NOTE.D4, 0.25], [NOTE.G4, 0.25], [NOTE.Bb3, 0.25], [NOTE.D4, 0.25],
  [NOTE.G3, 0.25], [NOTE.D4, 0.25], [NOTE.Bb3, 0.25], [NOTE.G3, 0.25],
  // Bar 5: Cm
  [NOTE.C4, 0.25], [NOTE.G4, 0.25], [NOTE.Eb4, 0.25], [NOTE.C5, 0.25],
  [NOTE.Eb4, 0.25], [NOTE.G4, 0.25], [NOTE.C4, 0.25], [NOTE.G4, 0.25],
  [NOTE.C5, 0.25], [NOTE.G4, 0.25], [NOTE.Eb4, 0.25], [NOTE.C4, 0.25],
  [NOTE.Eb4, 0.25], [NOTE.C5, 0.25], [NOTE.G4, 0.25], [NOTE.Eb4, 0.25],
  // Bar 6: Fm
  [NOTE.F4, 0.25], [NOTE.Ab4, 0.25], [NOTE.C5, 0.25], [NOTE.Ab4, 0.25],
  [NOTE.F4, 0.25], [NOTE.C4, 0.25], [NOTE.F4, 0.25], [NOTE.Ab4, 0.25],
  [NOTE.C5, 0.25], [NOTE.Ab4, 0.25], [NOTE.F4, 0.25], [NOTE.Ab4, 0.25],
  [NOTE.C5, 0.25], [NOTE.F4, 0.25], [NOTE.Ab4, 0.25], [NOTE.C4, 0.25],
  // Bar 7: Ab → Bb
  [NOTE.Ab3, 0.25], [NOTE.C4, 0.25], [NOTE.Eb4, 0.25], [NOTE.Ab4, 0.25],
  [NOTE.Eb4, 0.25], [NOTE.C4, 0.25], [NOTE.Ab3, 0.25], [NOTE.Eb4, 0.25],
  [NOTE.Bb3, 0.25], [NOTE.D4, 0.25], [NOTE.F4, 0.25], [NOTE.Bb4, 0.25],
  [NOTE.F4, 0.25], [NOTE.D4, 0.25], [NOTE.Bb3, 0.25], [NOTE.F4, 0.25],
  // Bar 8: G → Cm
  [NOTE.G3, 0.25], [NOTE.Bb3, 0.25], [NOTE.D4, 0.25], [NOTE.G4, 0.25],
  [NOTE.D4, 0.25], [NOTE.Bb3, 0.25], [NOTE.G3, 0.25], [NOTE.D4, 0.25],
  [NOTE.C4, 0.25], [NOTE.Eb4, 0.25], [NOTE.G4, 0.25], [NOTE.C5, 0.25],
  [NOTE.G4, 0.25], [NOTE.Eb4, 0.25], [NOTE.C4, 0.25], [NOTE.Eb4, 0.25],
];

// Pad: long sustained chords for harmonic bed (fills gaps, adds continuity)
const padPattern: [number, number][] = [
  // Bar 1-2: Cm → Ab
  [NOTE.C4, 4], [NOTE.Ab3, 4],
  // Bar 3-4: Bb → G
  [NOTE.Bb3, 4], [NOTE.G3, 4],
  // Bar 5-6: Cm → Fm
  [NOTE.C4, 4], [NOTE.F4, 4],
  // Bar 7-8: Ab → Bb → Cm
  [NOTE.Ab3, 2], [NOTE.Bb3, 2], [NOTE.G3, 2], [NOTE.C4, 2],
];

function scheduleMusicPattern(
  pattern: [number, number][],
  type: WaveType,
  volume: number,
  dest: GainNode,
  startTime: number,
): OscillatorNode[] {
  const oscs: OscillatorNode[] = [];
  let t = startTime;
  for (const [freq, beats] of pattern) {
    const dur = beats * BEAT;
    if (freq > 0) {
      oscs.push(playMusicNote(freq, dur, type, volume, dest, t));
    }
    t += dur;
  }
  return oscs;
}

function getPatternDuration(pattern: [number, number][]): number {
  return pattern.reduce((sum, [, beats]) => sum + beats * BEAT, 0);
}

function startMusicLoop() {
  if (musicPlaying) return;
  musicPlaying = true;

  const ctx = getCtx();
  const loopDuration = getPatternDuration(bassPattern); // all patterns same length (32 beats)
  let nextLoopTime = ctx.currentTime + 0.05;
  let allOscs: OscillatorNode[] = [];

  function scheduleNextIteration() {
    if (!musicPlaying) return;

    // Prune oscillators that have already finished to avoid unbounded growth.
    // An ended oscillator's playbackState isn't exposed, but we scheduled stop
    // times, so anything whose stop time is in the past is done. Since we don't
    // track individual stop times, just keep the most recent two loops' worth.
    if (allOscs.length > 500) {
      allOscs = allOscs.slice(-250);
    }

    const oscs: OscillatorNode[] = [];
    oscs.push(...scheduleMusicPattern(bassPattern, "square", 0.18, musicGain!, nextLoopTime));
    oscs.push(...scheduleMusicPattern(melodyPattern, "square", 0.1, musicGain!, nextLoopTime));
    oscs.push(...scheduleMusicPattern(arpPattern, "triangle", 0.05, musicGain!, nextLoopTime));
    oscs.push(...scheduleMusicPattern(padPattern, "triangle", 0.04, musicGain!, nextLoopTime));
    allOscs.push(...oscs);

    // Schedule the next iteration 2 seconds before this one ends,
    // so the Web Audio graph has the next loop queued with sample-accurate timing.
    const timeUntilEnd = (nextLoopTime + loopDuration) - ctx.currentTime;
    const rescheduleIn = Math.max(100, (timeUntilEnd - 2) * 1000);

    nextLoopTime += loopDuration;

    const timer = setTimeout(scheduleNextIteration, rescheduleIn);
    musicNodes = { oscillators: allOscs, timeout: timer };
  }

  scheduleNextIteration();
}

function stopMusicLoop() {
  musicPlaying = false;
  if (musicNodes) {
    if (musicNodes.timeout) clearTimeout(musicNodes.timeout);
    for (const osc of musicNodes.oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    musicNodes = null;
  }
}

// ── Public API ─────────────────────────────────────────

export type VolumeState = "unmuted" | "music-muted" | "all-muted";

// Store reference so we can remove it on dispose
let _visibilityHandler: (() => void) | null = null;

/** Initialize audio context (call on first user interaction) */
export function initAudio() {
  getCtx();
  // Pause all audio when app is minimized / screen locked, resume when visible
  if (typeof document !== "undefined" && !_visibilityHandler) {
    _visibilityHandler = () => {
      if (!audioCtx) return;
      if (document.hidden) {
        _musicWasPlayingBeforeHidden = musicPlaying;
        stopMusicLoop();
        audioCtx.suspend();
      } else {
        audioCtx.resume().then(() => {
          if (_musicWasPlayingBeforeHidden && !_musicMuted && !_muted) {
            startMusicLoop();
          }
        });
      }
    };
    document.addEventListener("visibilitychange", _visibilityHandler);
  }
}

/** Start background music */
export function startMusic() {
  if (_musicMuted) return;
  getCtx();
  startMusicLoop();
}

/** Stop background music */
export function stopMusic() {
  stopMusicLoop();
}

/**
 * Cycle through 3 volume states:
 *   unmuted → music-muted → all-muted → unmuted
 */
export function cycleVolume(): VolumeState {
  const current = getVolumeState();
  if (current === "unmuted") {
    // → music-muted: stop music, keep SFX
    _musicMuted = true;
    _muted = false;
    stopMusicLoop();
    if (masterGain) masterGain.gain.value = 1;
  } else if (current === "music-muted") {
    // → all-muted: mute everything
    _muted = true;
    _musicMuted = true;
    stopMusicLoop();
    if (masterGain) masterGain.gain.value = 0;
  } else {
    // → unmuted: restore everything
    _muted = false;
    _musicMuted = false;
    if (masterGain) masterGain.gain.value = 1;
    startMusicLoop();
  }
  return getVolumeState();
}

/** Get current volume state */
export function getVolumeState(): VolumeState {
  if (_muted) return "all-muted";
  if (_musicMuted) return "music-muted";
  return "unmuted";
}

/** Toggle mute all sounds */
export function toggleMute(): boolean {
  _muted = !_muted;
  if (_muted) {
    stopMusicLoop();
    if (masterGain) masterGain.gain.value = 0;
  } else {
    if (masterGain) masterGain.gain.value = 1;
    if (!_musicMuted) startMusicLoop();
  }
  return _muted;
}

/** Toggle mute music only */
export function toggleMusicMute(): boolean {
  _musicMuted = !_musicMuted;
  if (_musicMuted) {
    stopMusicLoop();
  } else if (!_muted) {
    startMusicLoop();
  }
  return _musicMuted;
}

/** Check if muted */
export function isMuted(): boolean {
  return _muted;
}

/** Check if music is muted */
export function isMusicMuted(): boolean {
  return _musicMuted;
}

/** Set SFX volume (0-1) */
export function setSfxVolume(v: number) {
  _sfxVolume = Math.max(0, Math.min(1, v));
  if (sfxGain) sfxGain.gain.value = _sfxVolume;
}

/** Set music volume (0-1) */
export function setMusicVolume(v: number) {
  _musicVolume = Math.max(0, Math.min(1, v));
  if (musicGain) musicGain.gain.value = _musicVolume;
}

/** Clean up audio resources */
export function disposeAudio() {
  stopMusicLoop();
  if (_visibilityHandler) {
    document.removeEventListener("visibilitychange", _visibilityHandler);
    _visibilityHandler = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
    masterGain = null;
    musicGain = null;
    sfxGain = null;
  }
}
