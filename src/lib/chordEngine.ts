/**
 * Chord Generator Engine
 * Generates all physically playable guitar voicings for any chord type.
 */

// Standard tuning MIDI: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const TUNING = [40, 45, 50, 55, 59, 64];
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const FLAT_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

// ── Chord interval definitions (semitones from root) ──
export const CHORD_TYPES: Record<string, { intervals: number[]; category: string; minNotes: number }> = {
  // Triads
  'maior': { intervals: [0, 4, 7], category: 'Tríades', minNotes: 3 },
  'menor': { intervals: [0, 3, 7], category: 'Tríades', minNotes: 3 },
  'diminuto': { intervals: [0, 3, 6], category: 'Tríades', minNotes: 3 },
  'aumentado': { intervals: [0, 4, 8], category: 'Tríades', minNotes: 3 },
  'sus2': { intervals: [0, 2, 7], category: 'Tríades', minNotes: 3 },
  'sus4': { intervals: [0, 5, 7], category: 'Tríades', minNotes: 3 },
  '5': { intervals: [0, 7], category: 'Tríades', minNotes: 2 },

  // Sixths
  '6': { intervals: [0, 4, 7, 9], category: 'Sextas', minNotes: 4 },
  'm6': { intervals: [0, 3, 7, 9], category: 'Sextas', minNotes: 4 },

  // Sevenths
  '7': { intervals: [0, 4, 7, 10], category: 'Sétimas', minNotes: 4 },
  'maj7': { intervals: [0, 4, 7, 11], category: 'Sétimas', minNotes: 4 },
  'm7': { intervals: [0, 3, 7, 10], category: 'Sétimas', minNotes: 4 },
  'm(maj7)': { intervals: [0, 3, 7, 11], category: 'Sétimas', minNotes: 4 },
  'dim7': { intervals: [0, 3, 6, 9], category: 'Sétimas', minNotes: 4 },
  'm7b5': { intervals: [0, 3, 6, 10], category: 'Sétimas', minNotes: 4 },

  // Add
  'add9': { intervals: [0, 4, 7, 14], category: 'Add', minNotes: 4 },
  'add11': { intervals: [0, 4, 7, 17], category: 'Add', minNotes: 4 },
  'add13': { intervals: [0, 4, 7, 21], category: 'Add', minNotes: 4 },

  // Extensions
  '9': { intervals: [0, 4, 7, 10, 14], category: 'Extensões', minNotes: 4 },
  'maj9': { intervals: [0, 4, 7, 11, 14], category: 'Extensões', minNotes: 4 },
  'm9': { intervals: [0, 3, 7, 10, 14], category: 'Extensões', minNotes: 4 },
  '11': { intervals: [0, 4, 7, 10, 14, 17], category: 'Extensões', minNotes: 4 },
  'maj11': { intervals: [0, 4, 7, 11, 14, 17], category: 'Extensões', minNotes: 4 },
  'm11': { intervals: [0, 3, 7, 10, 14, 17], category: 'Extensões', minNotes: 4 },
  '13': { intervals: [0, 4, 7, 10, 14, 17, 21], category: 'Extensões', minNotes: 4 },
  'maj13': { intervals: [0, 4, 7, 11, 14, 17, 21], category: 'Extensões', minNotes: 4 },
  'm13': { intervals: [0, 3, 7, 10, 14, 17, 21], category: 'Extensões', minNotes: 4 },

  // Altered
  '7b5': { intervals: [0, 4, 6, 10], category: 'Alterados', minNotes: 4 },
  '7#5': { intervals: [0, 4, 8, 10], category: 'Alterados', minNotes: 4 },
  '7b9': { intervals: [0, 4, 7, 10, 13], category: 'Alterados', minNotes: 4 },
  '7#9': { intervals: [0, 4, 7, 10, 15], category: 'Alterados', minNotes: 4 },
  '7b9#5': { intervals: [0, 4, 8, 10, 13], category: 'Alterados', minNotes: 4 },
  '7#9#5': { intervals: [0, 4, 8, 10, 15], category: 'Alterados', minNotes: 4 },
  '7b9b5': { intervals: [0, 4, 6, 10, 13], category: 'Alterados', minNotes: 4 },
  '7#9b5': { intervals: [0, 4, 6, 10, 15], category: 'Alterados', minNotes: 4 },
  '7#11': { intervals: [0, 4, 7, 10, 18], category: 'Alterados', minNotes: 4 },
  '7b13': { intervals: [0, 4, 7, 10, 20], category: 'Alterados', minNotes: 4 },
  '7alt': { intervals: [0, 4, 6, 10, 13], category: 'Alterados', minNotes: 4 },
};

export const CHORD_CATEGORIES: Record<string, string[]> = {};
for (const [name, info] of Object.entries(CHORD_TYPES)) {
  if (!CHORD_CATEGORIES[info.category]) CHORD_CATEGORIES[info.category] = [];
  CHORD_CATEGORIES[info.category].push(name);
}

export const CHORD_ROOTS = [
  { label: 'C', value: 'C' },
  { label: 'C# / Db', value: 'C#' },
  { label: 'D', value: 'D' },
  { label: 'D# / Eb', value: 'D#' },
  { label: 'E', value: 'E' },
  { label: 'F', value: 'F' },
  { label: 'F# / Gb', value: 'F#' },
  { label: 'G', value: 'G' },
  { label: 'G# / Ab', value: 'G#' },
  { label: 'A', value: 'A' },
  { label: 'A# / Bb', value: 'A#' },
  { label: 'B', value: 'B' },
];

// ── Types ──

export interface ChordVoicing {
  /** Fret per string, -1 = muted */
  frets: number[];
  /** Note name per string, '' = muted */
  notes: string[];
  /** Which fret is the barre, -1 if none */
  barreFret: number;
  /** How many strings the barre covers */
  barreSpan: [number, number]; // [lowString, highString]
  /** Root note name */
  root: string;
  /** Chord type key */
  type: string;
  /** Position on neck (lowest pressed fret) */
  position: number;
  /** Display name */
  name: string;
}

// ── Helpers ──

function noteIndex(name: string): number {
  let idx = NOTE_NAMES.indexOf(name);
  if (idx >= 0) return idx;
  idx = NOTE_NAMES_FLAT.indexOf(name);
  return idx >= 0 ? idx : 0;
}

function noteName(midi: number, useFlats: boolean): string {
  const i = ((midi % 12) + 12) % 12;
  return useFlats ? NOTE_NAMES_FLAT[i] : NOTE_NAMES[i];
}

function getChordPitchClasses(root: string, intervals: number[]): Set<number> {
  const rootPc = noteIndex(root);
  return new Set(intervals.map(i => (rootPc + i) % 12));
}

function getChordNoteNames(root: string, intervals: number[], useFlats: boolean): string[] {
  const rootPc = noteIndex(root);
  return intervals.map(i => noteName(rootPc + i, useFlats));
}

// ── Core generation ──

export function generateChordVoicings(root: string, chordType: string, maxFret = 15): ChordVoicing[] {
  const info = CHORD_TYPES[chordType];
  if (!info) return [];

  const useFlats = FLAT_ROOTS.has(root) || root.includes('b');
  const pitchClasses = getChordPitchClasses(root, info.intervals);
  const rootPc = noteIndex(root);
  const chordNoteNames = getChordNoteNames(root, info.intervals, useFlats);
  const requiredPcs = new Set(info.intervals.map(i => (rootPc + i) % 12));
  const displayName = `${useFlats && root.includes('#') ? NOTE_NAMES_FLAT[noteIndex(root)] : root}${chordType === 'maior' ? '' : chordType === 'menor' ? 'm' : chordType}`;

  // For each string, find which frets produce chord tones (including open & muted)
  const stringOptions: number[][] = [];
  for (let s = 0; s < 6; s++) {
    const options: number[] = [-1]; // muted
    for (let f = 0; f <= maxFret; f++) {
      const midi = TUNING[s] + f;
      const pc = ((midi % 12) + 12) % 12;
      if (pitchClasses.has(pc)) {
        options.push(f);
      }
    }
    stringOptions.push(options);
  }

  const voicings: ChordVoicing[] = [];
  const seen = new Set<string>();

  // Generate combinations using recursive backtracking
  const combo: number[] = new Array(6).fill(-1);

  function backtrack(stringIdx: number) {
    if (stringIdx === 6) {
      evaluateCombo();
      return;
    }
    for (const fret of stringOptions[stringIdx]) {
      combo[stringIdx] = fret;
      // Prune: check span so far
      if (canContinue(stringIdx)) {
        backtrack(stringIdx + 1);
      }
    }
    combo[stringIdx] = -1;
  }

  function canContinue(upTo: number): boolean {
    const pressed: number[] = [];
    for (let i = 0; i <= upTo; i++) {
      if (combo[i] > 0) pressed.push(combo[i]);
    }
    if (pressed.length === 0) return true;
    const span = Math.max(...pressed) - Math.min(...pressed);
    return span <= 4;
  }

  function evaluateCombo() {
    const frets = [...combo];
    
    // Count active strings
    const activeStrings = frets.filter(f => f >= 0).length;
    if (activeStrings < 3) return;

    // No gaps in active strings (muted strings only on edges)
    let firstActive = -1, lastActive = -1;
    for (let i = 0; i < 6; i++) {
      if (frets[i] >= 0) {
        if (firstActive === -1) firstActive = i;
        lastActive = i;
      }
    }
    for (let i = firstActive; i <= lastActive; i++) {
      if (frets[i] < 0) return; // gap
    }

    // Collect pitch classes present
    const presentPcs = new Set<number>();
    const notesByString: string[] = [];
    for (let s = 0; s < 6; s++) {
      if (frets[s] < 0) {
        notesByString.push('');
        continue;
      }
      const midi = TUNING[s] + frets[s];
      const pc = ((midi % 12) + 12) % 12;
      presentPcs.add(pc);
      notesByString.push(noteName(midi, useFlats));
    }

    // Must have root
    if (!presentPcs.has(rootPc)) return;

    // Must have minimum distinct pitch classes
    const distinctPcs = presentPcs.size;
    if (distinctPcs < info.minNotes) return;

    // For chords with many intervals, allow omitting some non-essential notes
    // but always require root + at least quality-defining intervals
    // Check all required notes are present (for triads/tetrads)
    if (info.intervals.length <= 4) {
      for (const pc of requiredPcs) {
        if (!presentPcs.has(pc)) return;
      }
    }

    // Check physical constraints
    const pressed = frets.filter(f => f > 0);
    if (pressed.length === 0) {
      // All open or muted — valid
    } else {
      const minFret = Math.min(...pressed);
      const maxFretVal = Math.max(...pressed);
      const span = maxFretVal - minFret;
      if (span > 4) return;

      // Max 4 fingers (non-barre unique frets)
      const uniqueFrets = [...new Set(pressed)];
      // Check if barre is possible
      const barreCandidate = minFret;
      const barreStrings = [];
      for (let s = firstActive; s <= lastActive; s++) {
        if (frets[s] === barreCandidate || frets[s] === 0) {
          if (frets[s] === barreCandidate) barreStrings.push(s);
        }
      }
      const hasBarre = barreStrings.length >= 2;
      const fingersNeeded = hasBarre
        ? uniqueFrets.filter(f => f !== barreCandidate).length + 1
        : uniqueFrets.length;
      if (fingersNeeded > 4) return;
    }

    // Avoid excessive repetition of same note
    const noteCounts: Record<string, number> = {};
    for (const n of notesByString) {
      if (n) noteCounts[n] = (noteCounts[n] || 0) + 1;
    }
    for (const count of Object.values(noteCounts)) {
      if (count > 3) return;
    }

    // Dedup by fret pattern
    const key = frets.join(',');
    if (seen.has(key)) return;
    seen.add(key);

    // Detect barre
    let barreFret = -1;
    let barreSpan: [number, number] = [-1, -1];
    const pressedFrets = frets.filter(f => f > 0);
    if (pressedFrets.length > 0) {
      const minF = Math.min(...pressedFrets);
      const barreS: number[] = [];
      for (let s = firstActive; s <= lastActive; s++) {
        if (frets[s] === minF) barreS.push(s);
      }
      if (barreS.length >= 2) {
        // Check if barre is at the lowest fret and contiguous or spanning
        barreFret = minF;
        barreSpan = [barreS[0], barreS[barreS.length - 1]];
      }
    }

    const position = pressedFrets.length > 0 ? Math.min(...pressedFrets) : 0;

    voicings.push({
      frets: [...frets],
      notes: [...notesByString],
      barreFret,
      barreSpan,
      root,
      type: chordType,
      position,
      name: displayName,
    });
  }

  backtrack(0);

  // Sort by position, then by number of active strings (more is better)
  voicings.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    const aActive = a.frets.filter(f => f >= 0).length;
    const bActive = b.frets.filter(f => f >= 0).length;
    return bActive - aActive;
  });

  // Limit to reasonable number
  return voicings.slice(0, 60);
}

export { STRING_NAMES, NOTE_NAMES, NOTE_NAMES_FLAT };
