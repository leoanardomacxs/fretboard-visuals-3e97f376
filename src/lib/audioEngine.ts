/**
 * Web Audio Engine with configurable timbres, volume, mute, and effects.
 */

let audioCtx: AudioContext | null = null;
let convolver: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let dryGain: GainNode | null = null;
let masterGainNode: GainNode | null = null;

// ─── Global Settings ───
export type TimbreType = 'guitar' | 'nylon' | 'bass' | 'piano' | 'electric' | 'synth' | 'organ' | 'bell';

export interface AudioSettings {
  volume: number;       // 0–1
  muted: boolean;
  timbre: TimbreType;
  reverb: number;       // 0–1
  delay: number;        // 0–1
  brightness: number;   // 0–1
}

const defaultSettings: AudioSettings = {
  volume: 0.7,
  muted: false,
  timbre: 'guitar',
  reverb: 0.2,
  delay: 0,
  brightness: 0.5,
};

let settings: AudioSettings = { ...defaultSettings };
let listeners: Array<(s: AudioSettings) => void> = [];

export function getAudioSettings(): AudioSettings {
  return { ...settings };
}

export function updateAudioSettings(partial: Partial<AudioSettings>): void {
  settings = { ...settings, ...partial };
  // Apply volume/reverb changes to live nodes
  if (masterGainNode) {
    masterGainNode.gain.setValueAtTime(settings.muted ? 0 : settings.volume, audioCtx?.currentTime ?? 0);
  }
  if (reverbGain && dryGain) {
    const ctx = audioCtx;
    if (ctx) {
      reverbGain.gain.setValueAtTime(settings.reverb, ctx.currentTime);
      dryGain.gain.setValueAtTime(1 - settings.reverb * 0.5, ctx.currentTime);
    }
  }
  listeners.forEach(fn => fn(getAudioSettings()));
}

export function subscribeAudioSettings(fn: (s: AudioSettings) => void): () => void {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

// ─── Timbre Definitions ───
export const TIMBRE_LIST: { key: TimbreType; label: string; icon: string }[] = [
  { key: 'guitar', label: 'Violão', icon: '🎸' },
  { key: 'nylon', label: 'Nylon', icon: '🎵' },
  { key: 'bass', label: 'Baixo', icon: '🎸' },
  { key: 'piano', label: 'Piano', icon: '🎹' },
  { key: 'electric', label: 'Guitarra Elétrica', icon: '⚡' },
  { key: 'synth', label: 'Sintetizador', icon: '🎛️' },
  { key: 'organ', label: 'Órgão', icon: '🎶' },
  { key: 'bell', label: 'Sino / Bell', icon: '🔔' },
];

interface TimbreDef {
  oscTypes: OscillatorType[];
  harmonicGains: number[];
  harmonicMultipliers: number[];
  decayMultipliers: number[];
  attackTime: number;
  sustainLevel: number;
}

function getTimbreDef(timbre: TimbreType, brightness: number): TimbreDef {
  const br = 0.3 + brightness * 0.7; // map 0-1 to 0.3-1.0
  switch (timbre) {
    case 'guitar':
      return {
        oscTypes: ['triangle', 'sine', 'sine'],
        harmonicGains: [0.6, 0.2 * br, 0.08 * br],
        harmonicMultipliers: [1, 2, 3],
        decayMultipliers: [1, 0.6, 0.3],
        attackTime: 0.002,
        sustainLevel: 0.001,
      };
    case 'nylon':
      return {
        oscTypes: ['sine', 'sine', 'sine'],
        harmonicGains: [0.7, 0.12 * br, 0.04 * br],
        harmonicMultipliers: [1, 2, 3],
        decayMultipliers: [1, 0.5, 0.2],
        attackTime: 0.005,
        sustainLevel: 0.001,
      };
    case 'bass':
      return {
        oscTypes: ['sine', 'triangle', 'sine'],
        harmonicGains: [0.8, 0.15 * br, 0.03],
        harmonicMultipliers: [1, 2, 3],
        decayMultipliers: [1.2, 0.6, 0.2],
        attackTime: 0.008,
        sustainLevel: 0.001,
      };
    case 'piano':
      return {
        oscTypes: ['triangle', 'sine', 'sine', 'sine'],
        harmonicGains: [0.5, 0.25 * br, 0.12 * br, 0.06 * br],
        harmonicMultipliers: [1, 2, 3, 4],
        decayMultipliers: [1, 0.8, 0.5, 0.3],
        attackTime: 0.001,
        sustainLevel: 0.001,
      };
    case 'electric':
      return {
        oscTypes: ['sawtooth', 'square', 'sine'],
        harmonicGains: [0.4, 0.2 * br, 0.15 * br],
        harmonicMultipliers: [1, 2, 3],
        decayMultipliers: [1.5, 1.0, 0.5],
        attackTime: 0.001,
        sustainLevel: 0.01,
      };
    case 'synth':
      return {
        oscTypes: ['sawtooth', 'square', 'sine', 'sine'],
        harmonicGains: [0.35, 0.2, 0.15 * br, 0.1 * br],
        harmonicMultipliers: [1, 1.005, 2, 3],
        decayMultipliers: [2, 2, 1, 0.5],
        attackTime: 0.01,
        sustainLevel: 0.05,
      };
    case 'organ':
      return {
        oscTypes: ['sine', 'sine', 'sine', 'sine'],
        harmonicGains: [0.4, 0.3, 0.2 * br, 0.1 * br],
        harmonicMultipliers: [1, 2, 3, 4],
        decayMultipliers: [3, 3, 2, 1.5],
        attackTime: 0.02,
        sustainLevel: 0.2,
      };
    case 'bell':
      return {
        oscTypes: ['sine', 'sine', 'sine', 'sine'],
        harmonicGains: [0.5, 0.3 * br, 0.2 * br, 0.15 * br],
        harmonicMultipliers: [1, 2.76, 5.4, 8.93],
        decayMultipliers: [1, 0.7, 0.4, 0.25],
        attackTime: 0.001,
        sustainLevel: 0.001,
      };
  }
}

// ─── Audio Context & Routing ───
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    // Build routing: source → dryGain → masterGain → destination
    //                source → convolver → reverbGain → masterGain → destination
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(settings.muted ? 0 : settings.volume, audioCtx.currentTime);
    masterGainNode.connect(audioCtx.destination);

    dryGain = audioCtx.createGain();
    dryGain.gain.setValueAtTime(1 - settings.reverb * 0.5, audioCtx.currentTime);
    dryGain.connect(masterGainNode);

    // Create reverb via convolver with generated impulse
    convolver = audioCtx.createConvolver();
    convolver.buffer = createReverbImpulse(audioCtx, 2, 2);
    reverbGain = audioCtx.createGain();
    reverbGain.gain.setValueAtTime(settings.reverb, audioCtx.currentTime);
    convolver.connect(reverbGain);
    reverbGain.connect(masterGainNode);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getOutputNode(): AudioNode {
  getAudioContext();
  return dryGain!;
}

function getReverbInput(): AudioNode {
  getAudioContext();
  return convolver!;
}

function createReverbImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NOTE_TO_SEMI: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
};

export function noteNameToMidi(name: string, octave = 4): number {
  const semi = NOTE_TO_SEMI[name];
  if (semi === undefined) return 60;
  return 12 * (octave + 1) + semi;
}

// ─── Play Functions ───

export function playNote(midi: number, duration = 0.8, volume = 0.3, startTime?: number): void {
  if (settings.muted) return;
  const ctx = getAudioContext();
  const t = startTime ?? ctx.currentTime;
  const freq = midiToFreq(midi);
  const timbreDef = getTimbreDef(settings.timbre, settings.brightness);
  const vol = volume * settings.volume;

  // Per-note gain envelope
  const noteGain = ctx.createGain();
  noteGain.gain.setValueAtTime(0, t);
  noteGain.gain.linearRampToValueAtTime(vol, t + timbreDef.attackTime);
  noteGain.gain.exponentialRampToValueAtTime(Math.max(timbreDef.sustainLevel * vol, 0.0001), t + duration);
  
  // Connect to dry + reverb
  noteGain.connect(getOutputNode());
  if (settings.reverb > 0.01) {
    noteGain.connect(getReverbInput());
  }

  // Create oscillators based on timbre
  const oscCount = timbreDef.oscTypes.length;
  for (let i = 0; i < oscCount; i++) {
    const osc = ctx.createOscillator();
    osc.type = timbreDef.oscTypes[i];
    osc.frequency.setValueAtTime(freq * timbreDef.harmonicMultipliers[i], t);

    const g = ctx.createGain();
    const harmGain = timbreDef.harmonicGains[i];
    const decayDur = duration * timbreDef.decayMultipliers[i];
    g.gain.setValueAtTime(harmGain, t + timbreDef.attackTime);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(decayDur, 0.05));

    osc.connect(g).connect(noteGain);
    osc.start(t);
    osc.stop(t + Math.max(decayDur, 0.05) + 0.01);
  }
}

export function playChord(midiNotes: number[], duration = 1.2): void {
  if (settings.muted) return;
  const ctx = getAudioContext();
  const vol = Math.min(0.25, 0.6 / midiNotes.length);
  const t = ctx.currentTime;
  midiNotes.forEach((midi, i) => {
    playNote(midi, duration, vol, t + i * 0.03);
  });
}

export function playScale(midiNotes: number[], interval = 0.25, duration = 0.5): void {
  if (settings.muted) return;
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  midiNotes.forEach((midi, i) => {
    playNote(midi, duration, 0.25, t + i * interval);
  });
}

export function playClick(pitch = 800, vol = 0.08): void {
  if (settings.muted) return;
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const effectiveVol = vol * settings.volume;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(effectiveVol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  gain.connect(getOutputNode());
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + 0.06);
}

// ─── Chord Helpers ───
const OPEN_STRINGS_MIDI = [40, 45, 50, 55, 59, 64];

export function chordFretsToMidi(frets: (number | null)[]): number[] {
  const result: number[] = [];
  frets.forEach((f, stringIdx) => {
    if (f !== null && f >= 0) {
      result.push(OPEN_STRINGS_MIDI[stringIdx] + f);
    }
  });
  return result;
}

export function playChordFromFrets(frets: (number | null)[]): void {
  const midiNotes = chordFretsToMidi(frets);
  if (midiNotes.length > 0) playChord(midiNotes);
}

export function getScaleMidiNotes(rootNote: string, intervals: number[]): number[] {
  const rootMidi = noteNameToMidi(rootNote, 4);
  return intervals.map(i => rootMidi + i);
}
