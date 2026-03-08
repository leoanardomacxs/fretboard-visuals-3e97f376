/**
 * Web Audio Engine for guitar sounds.
 * Provides functions to play individual notes, chords, and scale sequences.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Convert MIDI note number to frequency in Hz.
 */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Note name + octave to MIDI. Default octave 4.
 * E.g. "C4" = 60, "A4" = 69
 */
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

/**
 * Play a single note with a guitar-like plucked sound.
 */
export function playNote(midi: number, duration = 0.8, volume = 0.3, startTime?: number): void {
  const ctx = getAudioContext();
  const t = startTime ?? ctx.currentTime;
  const freq = midiToFreq(midi);

  // Create a plucked string sound using multiple oscillators
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, t);
  masterGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  masterGain.connect(ctx.destination);

  // Fundamental
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, t);
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0.6, t);
  osc1.connect(g1).connect(masterGain);
  osc1.start(t);
  osc1.stop(t + duration);

  // 2nd harmonic
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, t);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.2, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.6);
  osc2.connect(g2).connect(masterGain);
  osc2.start(t);
  osc2.stop(t + duration);

  // 3rd harmonic (brightness)
  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(freq * 3, t);
  const g3 = ctx.createGain();
  g3.gain.setValueAtTime(0.08, t);
  g3.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.3);
  osc3.connect(g3).connect(masterGain);
  osc3.start(t);
  osc3.stop(t + duration);
}

/**
 * Play a chord (multiple notes simultaneously).
 * @param midiNotes Array of MIDI note numbers
 */
export function playChord(midiNotes: number[], duration = 1.2): void {
  const ctx = getAudioContext();
  const vol = Math.min(0.25, 0.6 / midiNotes.length);
  const t = ctx.currentTime;
  // Strum effect: slight delay between each string
  midiNotes.forEach((midi, i) => {
    playNote(midi, duration, vol, t + i * 0.03);
  });
}

/**
 * Play a sequence of notes (scale), one after another.
 * @param midiNotes Array of MIDI note numbers
 * @param interval Time between each note in seconds
 */
export function playScale(midiNotes: number[], interval = 0.25, duration = 0.5): void {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  midiNotes.forEach((midi, i) => {
    playNote(midi, duration, 0.25, t + i * interval);
  });
}

/**
 * Play a click/tap sound for UI feedback.
 */
export function playClick(pitch = 800, vol = 0.08): void {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

// Standard tuning MIDI: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const OPEN_STRINGS_MIDI = [40, 45, 50, 55, 59, 64];

/**
 * Get MIDI notes from a chord voicing fret array.
 * frets: [null, 0, 2, 2, 2, 0] — null = muted
 */
export function chordFretsToMidi(frets: (number | null)[]): number[] {
  const result: number[] = [];
  frets.forEach((f, stringIdx) => {
    if (f !== null && f >= 0) {
      result.push(OPEN_STRINGS_MIDI[stringIdx] + f);
    }
  });
  return result;
}

/**
 * Play a chord from fret positions.
 */
export function playChordFromFrets(frets: (number | null)[]): void {
  const midiNotes = chordFretsToMidi(frets);
  if (midiNotes.length > 0) {
    playChord(midiNotes);
  }
}

/**
 * Get scale notes in a single octave starting from a given root, at octave 4.
 */
export function getScaleMidiNotes(rootNote: string, intervals: number[]): number[] {
  const rootMidi = noteNameToMidi(rootNote, 4);
  return intervals.map(i => rootMidi + i);
}
