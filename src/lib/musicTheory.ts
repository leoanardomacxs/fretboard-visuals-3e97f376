// All 12 chromatic notes
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export type NoteName = string;

// Standard tuning E A D G B E (low to high)
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]; // MIDI numbers E2-E4
export const TUNING_NOTES = ['E', 'A', 'D', 'G', 'B', 'E'];

// Bass standard tuning E A D G (low to high)
export const BASS_TUNING = [28, 33, 38, 43]; // MIDI numbers E1-G2
export const BASS_TUNING_NOTES = ['E', 'A', 'D', 'G'];

// Scale formulas as semitone intervals from root
export const SCALE_FORMULAS: Record<string, number[]> = {
  'Maior': [0, 2, 4, 5, 7, 9, 11],
  'Menor Natural': [0, 2, 3, 5, 7, 8, 10],
  'Menor Harmônica': [0, 2, 3, 5, 7, 8, 11],
  'Menor Melódica': [0, 2, 3, 5, 7, 9, 11],
  'Pentatônica Maior': [0, 2, 4, 7, 9],
  'Pentatônica Menor': [0, 3, 5, 7, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
  // Greek modes
  'Jônio': [0, 2, 4, 5, 7, 9, 11],
  'Dórico': [0, 2, 3, 5, 7, 9, 10],
  'Frígio': [0, 1, 3, 5, 7, 8, 10],
  'Lídio': [0, 2, 4, 6, 7, 9, 11],
  'Mixolídio': [0, 2, 4, 5, 7, 9, 10],
  'Eólio': [0, 2, 3, 5, 7, 8, 10],
  'Lócrio': [0, 1, 3, 5, 6, 8, 10],
};

export const SCALE_CATEGORIES = {
  'Escalas Básicas': ['Maior', 'Menor Natural', 'Menor Harmônica', 'Menor Melódica'],
  'Pentatônicas': ['Pentatônica Maior', 'Pentatônica Menor', 'Blues'],
  'Modos Gregos': ['Jônio', 'Dórico', 'Frígio', 'Lídio', 'Mixolídio', 'Eólio', 'Lócrio'],
};

export const INTERVAL_NAMES: Record<number, string> = {
  0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4',
  6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7',
};

export const DEGREE_LABELS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

export const CHORD_QUALITIES = ['Major', 'minor', 'minor', 'Major', 'Major', 'minor', 'diminished'];

// ============================================================
// Enharmonic spelling engine — proper music theory note naming
// ============================================================

const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Get the letter index (0-6) for a note name */
function getLetterIndex(note: string): number {
  return LETTER_NAMES.indexOf(note[0] as any);
}

/** Convert any note name (e.g. "Eb", "F#", "C") to its semitone (0-11) */
function noteToSemitone(note: string): number {
  const base = LETTER_SEMITONES[note[0]];
  if (base === undefined) return 0;
  let s = base;
  for (let i = 1; i < note.length; i++) {
    if (note[i] === '#') s++;
    else if (note[i] === 'b') s--;
  }
  return ((s % 12) + 12) % 12;
}

/** Spell a semitone on a specific letter (e.g. semitone 3 on letter E → "Eb") */
function spellNoteOnLetter(semitone: number, letterIdx: number): string {
  const natural = LETTER_SEMITONES[LETTER_NAMES[letterIdx]];
  const diff = ((semitone - natural) % 12 + 12) % 12;
  const letter = LETTER_NAMES[letterIdx];
  if (diff === 0) return letter;
  if (diff === 1) return letter + '#';
  if (diff === 11) return letter + 'b';
  if (diff === 2) return letter + '##';
  if (diff === 10) return letter + 'bb';
  // Fallback (shouldn't happen in standard music)
  return letter;
}

// Pentatonic degree mappings (indices into parent 7-note scale)
const PENT_MAJOR_DEGREES = [0, 1, 2, 4, 5]; // 1, 2, 3, 5, 6
const PENT_MINOR_DEGREES = [0, 2, 3, 4, 6]; // 1, b3, 4, 5, b7

/**
 * Spell a scale with correct enharmonic names.
 * 7-note scales: each degree uses a unique letter (A-G).
 * Pentatonic/Blues: derived from parent 7-note scale.
 */
export function spellScale(root: string, scaleType: string): string[] {
  const formula = SCALE_FORMULAS[scaleType];
  if (!formula) return [];

  const rootSemitone = noteToSemitone(root);
  const rootLetter = getLetterIndex(root);

  // 7-note scales: each degree gets the next consecutive letter
  if (formula.length === 7) {
    return formula.map((interval, i) => {
      const target = (rootSemitone + interval) % 12;
      const letterIdx = (rootLetter + i) % 7;
      return spellNoteOnLetter(target, letterIdx);
    });
  }

  // Pentatonic Major → subset of Major scale
  if (scaleType === 'Pentatônica Maior') {
    const parent = spellScale(root, 'Maior');
    return PENT_MAJOR_DEGREES.map(d => parent[d]);
  }

  // Pentatonic Minor → subset of Natural Minor
  if (scaleType === 'Pentatônica Menor') {
    const parent = spellScale(root, 'Menor Natural');
    return PENT_MINOR_DEGREES.map(d => parent[d]);
  }

  // Blues → Minor Pentatonic + b5
  if (scaleType === 'Blues') {
    const parent = spellScale(root, 'Menor Natural');
    const b5semitone = (rootSemitone + 6) % 12;
    const fifthLetterIdx = (rootLetter + 4) % 7; // letter of the 5th degree
    const b5note = spellNoteOnLetter(b5semitone, fifthLetterIdx);
    return [parent[0], parent[2], parent[3], b5note, parent[4], parent[6]];
  }

  // Fallback
  const flats = useFlats(root);
  return formula.map(interval => getNoteName(rootSemitone + interval, flats));
}

/**
 * Spell chord notes with correct enharmonic names.
 */
export function spellChordNotes(root: string, intervals: number[]): string[] {
  const rootSemitone = noteToSemitone(root);
  const rootLetter = getLetterIndex(root);

  const intervalToLetterOffset = (interval: number): number => {
    const normalized = interval % 12;
    if (normalized <= 1) return 0;
    if (normalized <= 2) return 1;
    if (normalized <= 4) return 2;
    if (normalized <= 5) return 3;
    if (normalized <= 8) return 4;
    if (normalized <= 9) return 5;
    return 6;
  };

  return intervals.map(interval => {
    const target = (rootSemitone + interval) % 12;
    const letterOffset = intervalToLetterOffset(interval);
    const letterIdx = (rootLetter + letterOffset) % 7;
    return spellNoteOnLetter(target, letterIdx);
  });
}

export function getChordSpellingMap(root: string, intervals: number[]): Map<number, string> {
  const notes = spellChordNotes(root, intervals);
  const map = new Map<number, string>();
  for (const note of notes) {
    map.set(noteToSemitone(note), note);
  }
  return map;
}

/**
 * Build a lookup: semitone → properly spelled note name for a given scale.
 */
export function getScaleSpellingMap(root: string, scaleType: string): Map<number, string> {
  const notes = spellScale(root, scaleType);
  const map = new Map<number, string>();
  for (const note of notes) {
    map.set(noteToSemitone(note), note);
  }
  return map;
}

// ============================================================
// Legacy helpers (still used for index lookups)
// ============================================================

// Use flats for these keys
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

export function useFlats(root: string): boolean {
  return FLAT_KEYS.has(root) || root.includes('b');
}

export function getNoteIndex(note: string): number {
  // Use the proper semitone parser
  return noteToSemitone(note);
}

export function getNoteName(index: number, flats = false): string {
  const i = ((index % 12) + 12) % 12;
  return flats ? NOTES_FLAT[i] : NOTES[i];
}

// ============================================================
// Scale / degree / interval functions
// ============================================================

export function getScale(root: string, scaleType: string): string[] {
  return spellScale(root, scaleType);
}

export function getDegree(note: string, root: string): number {
  const rootIdx = noteToSemitone(root);
  const noteIdx = noteToSemitone(note);
  const interval = ((noteIdx - rootIdx) + 12) % 12;
  const majorFormula = SCALE_FORMULAS['Maior'];
  const degreeIdx = majorFormula.indexOf(interval);
  return degreeIdx >= 0 ? degreeIdx + 1 : -1;
}

export function getScaleDegree(note: string, root: string, scaleType: string): number {
  const formula = SCALE_FORMULAS[scaleType];
  if (!formula) return -1;
  const rootIdx = noteToSemitone(root);
  const noteIdx = noteToSemitone(note);
  const interval = ((noteIdx - rootIdx) + 12) % 12;
  const idx = formula.indexOf(interval);
  return idx >= 0 ? idx + 1 : -1;
}

export function getIntervalName(note: string, root: string): string {
  const rootIdx = noteToSemitone(root);
  const noteIdx = noteToSemitone(note);
  const interval = ((noteIdx - rootIdx) + 12) % 12;
  return INTERVAL_NAMES[interval] || '?';
}

// ============================================================
// Harmonic field
// ============================================================

export interface ChordInfo {
  name: string;
  root: string;
  quality: string;
  notes: string[];
  degree: number;
  romanNumeral: string;
}

export function getHarmonicField(root: string): ChordInfo[] {
  return getHarmonicFieldForScale(root, 'Maior');
}

export function getHarmonicFieldForScale(root: string, scaleType: string): ChordInfo[] {
  const formula = SCALE_FORMULAS[scaleType];
  if (!formula || formula.length < 7) {
    // For pentatonic/blues (less than 7 notes), fall back to parent scale
    if (scaleType === 'Pentatônica Menor' || scaleType === 'Eólio') return getHarmonicFieldForScale(root, 'Menor Natural');
    if (scaleType === 'Pentatônica Maior' || scaleType === 'Jônio') return getHarmonicFieldForScale(root, 'Maior');
    if (scaleType === 'Blues') return getHarmonicFieldForScale(root, 'Menor Natural');
    if (scaleType === 'Dórico') return getHarmonicFieldForScale(root, 'Menor Natural');
    if (scaleType === 'Frígio') return getHarmonicFieldForScale(root, 'Menor Natural');
    if (scaleType === 'Lídio') return getHarmonicFieldForScale(root, 'Maior');
    if (scaleType === 'Mixolídio') return getHarmonicFieldForScale(root, 'Maior');
    if (scaleType === 'Lócrio') return getHarmonicFieldForScale(root, 'Menor Natural');
    return getHarmonicFieldForScale(root, 'Maior');
  }

  // Get properly spelled scale notes
  const scaleNotes = spellScale(root, scaleType);

  return scaleNotes.map((note, i) => {
    // Stack thirds from the scale (every other note)
    const thirdNote = scaleNotes[(i + 2) % 7];
    const fifthNote = scaleNotes[(i + 4) % 7];

    const noteSemi = noteToSemitone(note);
    const thirdSemi = noteToSemitone(thirdNote);
    const fifthSemi = noteToSemitone(fifthNote);

    const third = ((thirdSemi - noteSemi) % 12 + 12) % 12;
    const fifth = ((fifthSemi - noteSemi) % 12 + 12) % 12;

    let quality: string;
    let suffix: string;
    let romanBase: string;

    if (third === 4 && fifth === 7) {
      quality = 'Major'; suffix = ''; romanBase = ['I','II','III','IV','V','VI','VII'][i];
    } else if (third === 3 && fifth === 7) {
      quality = 'minor'; suffix = 'm'; romanBase = ['i','ii','iii','iv','v','vi','vii'][i];
    } else if (third === 3 && fifth === 6) {
      quality = 'diminished'; suffix = '°'; romanBase = ['i°','ii°','iii°','iv°','v°','vi°','vii°'][i];
    } else if (third === 4 && fifth === 8) {
      quality = 'augmented'; suffix = '+'; romanBase = ['I+','II+','III+','IV+','V+','VI+','VII+'][i];
    } else {
      quality = 'Major'; suffix = ''; romanBase = ['I','II','III','IV','V','VI','VII'][i];
    }

    return {
      name: `${note}${suffix}`,
      root: note,
      quality,
      notes: [note, thirdNote, fifthNote],
      degree: i + 1,
      romanNumeral: romanBase,
    };
  });
}

// ============================================================
// Arpeggio & Pentatonic helpers
// ============================================================

export function getArpeggio(root: string, quality: string, _flats = false): string[] {
  const rootLetter = getLetterIndex(root);
  const rootSemi = noteToSemitone(root);
  const thirdLetter = (rootLetter + 2) % 7; // 3rd is always 2 letters up
  const fifthLetter = (rootLetter + 4) % 7; // 5th is always 4 letters up

  if (quality === 'Major') {
    return [
      root,
      spellNoteOnLetter((rootSemi + 4) % 12, thirdLetter),
      spellNoteOnLetter((rootSemi + 7) % 12, fifthLetter),
    ];
  }
  if (quality === 'minor') {
    return [
      root,
      spellNoteOnLetter((rootSemi + 3) % 12, thirdLetter),
      spellNoteOnLetter((rootSemi + 7) % 12, fifthLetter),
    ];
  }
  if (quality === 'diminished') {
    return [
      root,
      spellNoteOnLetter((rootSemi + 3) % 12, thirdLetter),
      spellNoteOnLetter((rootSemi + 6) % 12, fifthLetter),
    ];
  }
  if (quality === 'augmented') {
    return [
      root,
      spellNoteOnLetter((rootSemi + 4) % 12, thirdLetter),
      spellNoteOnLetter((rootSemi + 8) % 12, fifthLetter),
    ];
  }
  return [root];
}

export function getRelatedPentatonic(root: string, quality: string): string[] {
  if (quality === 'minor' || quality === 'diminished') {
    return getScale(root, 'Pentatônica Menor');
  }
  return getScale(root, 'Pentatônica Maior');
}

// ============================================================
// Fretboard
// ============================================================

export interface FretNote {
  string: number; // 0-5 (low E to high E)
  fret: number;   // 0-24
  note: string;
  midi: number;
  degree?: number;
  interval?: string;
  isRoot?: boolean;
  isChordTone?: boolean;
  isTension?: boolean;
}

export function getFretboardNotes(maxFret = 24): FretNote[] {
  const notes: FretNote[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= maxFret; f++) {
      const midi = STANDARD_TUNING[s] + f;
      const note = getNoteName(midi, false);
      notes.push({ string: s, fret: f, note, midi });
    }
  }
  return notes;
}

export function getBassFretboardNotes(maxFret = 24): FretNote[] {
  const notes: FretNote[] = [];
  for (let s = 0; s < 4; s++) {
    for (let f = 0; f <= maxFret; f++) {
      const midi = BASS_TUNING[s] + f;
      const note = getNoteName(midi, false);
      notes.push({ string: s, fret: f, note, midi });
    }
  }
  return notes;
}

export function filterByScale(allNotes: FretNote[], root: string, scaleType: string): FretNote[] {
  const spellingMap = getScaleSpellingMap(root, scaleType);

  return allNotes
    .filter(n => {
      const semi = ((n.midi % 12) + 12) % 12;
      return spellingMap.has(semi);
    })
    .map(n => {
      const semi = ((n.midi % 12) + 12) % 12;
      const noteName = spellingMap.get(semi)!;
      const degree = getScaleDegree(noteName, root, scaleType);
      const interval = getIntervalName(noteName, root);
      return {
        ...n,
        note: noteName,
        degree,
        interval,
        isRoot: noteToSemitone(noteName) === noteToSemitone(root),
      };
    });
}

export function filterByNotes(allNotes: FretNote[], targetNotes: string[], root: string): FretNote[] {
  // Build semitone → spelled name map from the target notes
  const targetMap = new Map<number, string>();
  for (const tn of targetNotes) {
    targetMap.set(noteToSemitone(tn), tn);
  }

  return allNotes
    .filter(n => {
      const semi = ((n.midi % 12) + 12) % 12;
      return targetMap.has(semi);
    })
    .map(n => {
      const semi = ((n.midi % 12) + 12) % 12;
      const noteName = targetMap.get(semi)!;
      return {
        ...n,
        note: noteName,
        isRoot: noteToSemitone(noteName) === noteToSemitone(root),
        isChordTone: true,
      };
    });
}

export const ALL_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Enharmonic equivalents for all 12 notes */
export const ENHARMONIC_MAP: Record<string, string> = {
  'C': 'B#', 'B#': 'C',
  'C#': 'Db', 'Db': 'C#',
  'D': 'Ebb', 'Ebb': 'D',
  'D#': 'Eb', 'Eb': 'D#',
  'E': 'Fb', 'Fb': 'E',
  'F': 'E#', 'E#': 'F',
  'F#': 'Gb', 'Gb': 'F#',
  'G': 'F##', 'F##': 'G',
  'G#': 'Ab', 'Ab': 'G#',
  'A': 'Bbb', 'Bbb': 'A',
  'A#': 'Bb', 'Bb': 'A#',
  'B': 'Cb', 'Cb': 'B',
};
