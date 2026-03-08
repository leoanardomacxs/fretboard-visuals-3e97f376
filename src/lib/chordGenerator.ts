import { getNoteIndex, getNoteName, useFlats } from './musicTheory';

// Standard tuning MIDI: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

// Chord type definitions: intervals from root in semitones
export const CHORD_TYPES: Record<string, { intervals: number[]; label: string; category: string }> = {
  // Triads
  'major':       { intervals: [0, 4, 7],       label: '',      category: 'Tríades' },
  'minor':       { intervals: [0, 3, 7],       label: 'm',     category: 'Tríades' },
  'dim':         { intervals: [0, 3, 6],       label: '°',     category: 'Tríades' },
  'aug':         { intervals: [0, 4, 8],       label: '+',     category: 'Tríades' },
  'sus2':        { intervals: [0, 2, 7],       label: 'sus2',  category: 'Tríades' },
  'sus4':        { intervals: [0, 5, 7],       label: 'sus4',  category: 'Tríades' },
  // Tetrads
  '7':           { intervals: [0, 4, 7, 10],   label: '7',     category: 'Tétrades' },
  'maj7':        { intervals: [0, 4, 7, 11],   label: 'maj7',  category: 'Tétrades' },
  'min7':        { intervals: [0, 3, 7, 10],   label: 'm7',    category: 'Tétrades' },
  'min-maj7':    { intervals: [0, 3, 7, 11],   label: 'm(maj7)', category: 'Tétrades' },
  'dim7':        { intervals: [0, 3, 6, 9],    label: '°7',    category: 'Tétrades' },
  'half-dim7':   { intervals: [0, 3, 6, 10],   label: 'ø7',    category: 'Tétrades' },
  'aug7':        { intervals: [0, 4, 8, 10],   label: '+7',    category: 'Tétrades' },
  '7sus4':       { intervals: [0, 5, 7, 10],   label: '7sus4', category: 'Tétrades' },
  // Extensions
  'add9':        { intervals: [0, 4, 7, 14],   label: 'add9',  category: 'Extensões' },
  'madd9':       { intervals: [0, 3, 7, 14],   label: 'madd9', category: 'Extensões' },
  '6':           { intervals: [0, 4, 7, 9],    label: '6',     category: 'Extensões' },
  'm6':          { intervals: [0, 3, 7, 9],    label: 'm6',    category: 'Extensões' },
  '9':           { intervals: [0, 4, 7, 10, 14], label: '9',   category: 'Extensões' },
  'maj9':        { intervals: [0, 4, 7, 11, 14], label: 'maj9', category: 'Extensões' },
  'm9':          { intervals: [0, 3, 7, 10, 14], label: 'm9',  category: 'Extensões' },
  // Power
  '5':           { intervals: [0, 7],           label: '5',     category: 'Power' },
};

export interface ChordVoicing {
  root: string;
  typeName: string;
  typeLabel: string;
  frets: (number | null)[]; // null = muted (X), length 6 for each string
  fingers: (number | null)[]; // finger number 1-4 or null
  barreInfo: { fret: number; fromString: number; toString: number } | null;
  startFret: number; // lowest fretted position (for diagram offset)
  score: number; // lower = easier
}

/**
 * Generate all playable voicings for a given root + chord type.
 */
export function generateChordVoicings(root: string, chordType: string, maxResults = 24): ChordVoicing[] {
  const typeDef = CHORD_TYPES[chordType];
  if (!typeDef) return [];

  const rootIdx = getNoteIndex(root);
  const chordPitchClasses = new Set(typeDef.intervals.map(i => (rootIdx + i) % 12));

  const voicings: ChordVoicing[] = [];

  // For each string, compute valid frets (0-12) that produce a chord tone
  const stringOptions: (number | null)[][] = [];
  for (let s = 0; s < 6; s++) {
    const options: (number | null)[] = [null]; // muted is always an option
    for (let f = 0; f <= 12; f++) {
      const pitch = (OPEN_STRINGS[s] + f) % 12;
      if (chordPitchClasses.has(pitch)) {
        options.push(f);
      }
    }
    stringOptions.push(options);
  }

  // Enumerate combinations using recursive approach with pruning
  const current: (number | null)[] = new Array(6).fill(null);
  
  function enumerate(stringIdx: number) {
    if (stringIdx === 6) {
      const voicing = validateAndScore(current, rootIdx, chordPitchClasses, typeDef.intervals.length, root, chordType, typeDef.label);
      if (voicing) voicings.push(voicing);
      return;
    }
    for (const opt of stringOptions[stringIdx]) {
      current[stringIdx] = opt;
      // Early pruning: check if remaining strings can still complete chord
      if (canStillComplete(current, stringIdx, stringOptions, chordPitchClasses, rootIdx)) {
        enumerate(stringIdx + 1);
      }
    }
    current[stringIdx] = null;
  }

  enumerate(0);

  // Deduplicate
  const deduped = deduplicateVoicings(voicings);

  // Sort by score (ease)
  deduped.sort((a, b) => a.score - b.score);

  return deduped.slice(0, maxResults);
}

function canStillComplete(
  current: (number | null)[],
  filledUpTo: number,
  stringOptions: (number | null)[][],
  chordPitchClasses: Set<number>,
  rootIdx: number
): boolean {
  // Check that fretted notes so far don't violate span
  const fretted = current.slice(0, filledUpTo + 1).filter(f => f !== null && f > 0) as number[];
  if (fretted.length > 0) {
    const minF = Math.min(...fretted);
    const maxF = Math.max(...fretted);
    if (maxF - minF > 4) return false;
  }

  // Check pitch classes covered so far + potentially coverable
  const covered = new Set<number>();
  for (let i = 0; i <= filledUpTo; i++) {
    if (current[i] !== null) {
      covered.add((OPEN_STRINGS[i] + current[i]!) % 12);
    }
  }
  // Remaining strings can potentially cover
  const potentiallyCoverable = new Set(covered);
  for (let i = filledUpTo + 1; i < 6; i++) {
    for (const opt of stringOptions[i]) {
      if (opt !== null) {
        potentiallyCoverable.add((OPEN_STRINGS[i] + opt) % 12);
      }
    }
  }
  // Must be able to cover all chord tones
  for (const pc of chordPitchClasses) {
    if (!potentiallyCoverable.has(pc)) return false;
  }

  // Must have root somewhere
  const hasRoot = covered.has(rootIdx);
  let canHaveRoot = hasRoot;
  if (!hasRoot) {
    for (let i = filledUpTo + 1; i < 6; i++) {
      for (const opt of stringOptions[i]) {
        if (opt !== null && (OPEN_STRINGS[i] + opt) % 12 === rootIdx) {
          canHaveRoot = true;
          break;
        }
      }
      if (canHaveRoot) break;
    }
  }
  if (!canHaveRoot) return false;

  return true;
}

function validateAndScore(
  frets: (number | null)[],
  rootIdx: number,
  chordPitchClasses: Set<number>,
  requiredTones: number,
  root: string,
  chordType: string,
  typeLabel: string
): ChordVoicing | null {
  const voicing = [...frets] as (number | null)[];

  // Must have at least 3 sounding strings (or 2 for power chords)
  const sounding = voicing.filter(f => f !== null);
  const minSounding = requiredTones <= 2 ? 2 : 3;
  if (sounding.length < minSounding) return null;

  // All chord pitch classes must be present
  const presentPCs = new Set<number>();
  for (let s = 0; s < 6; s++) {
    if (voicing[s] !== null) {
      presentPCs.add((OPEN_STRINGS[s] + voicing[s]!) % 12);
    }
  }
  for (const pc of chordPitchClasses) {
    if (!presentPCs.has(pc)) return null;
  }

  // Must contain root
  if (!presentPCs.has(rootIdx)) return null;

  // No muted strings between sounding strings (allows muted on edges only)
  let firstSounding = -1, lastSounding = -1;
  for (let s = 0; s < 6; s++) {
    if (voicing[s] !== null) {
      if (firstSounding === -1) firstSounding = s;
      lastSounding = s;
    }
  }
  for (let s = firstSounding; s <= lastSounding; s++) {
    if (voicing[s] === null) return null; // muted in the middle
  }

  // Fret span check
  const fretted = sounding.filter(f => f! > 0) as number[];
  let minFret = 0, maxFret = 0, span = 0;
  if (fretted.length > 0) {
    minFret = Math.min(...fretted);
    maxFret = Math.max(...fretted);
    span = maxFret - minFret;
    if (span > 4) return null;
  }

  // Finger assignment and barre detection
  const { fingers, barre, fingerCount } = assignFingers(voicing, fretted, minFret);
  if (fingerCount > 4) return null;
  if (!fingers) return null;

  // Score: lower = easier
  const mutedCount = voicing.filter(f => f === null).length;
  const score =
    span * 10 +
    mutedCount * 8 +
    (6 - sounding.length) * 5 +
    (minFret > 0 ? minFret * 2 : 0) +
    fingerCount * 3 +
    (barre ? 5 : 0);

  return {
    root,
    typeName: chordType,
    typeLabel,
    frets: voicing,
    fingers,
    barreInfo: barre,
    startFret: fretted.length > 0 ? minFret : 0,
    score,
  };
}

function assignFingers(
  voicing: (number | null)[],
  fretted: number[],
  minFret: number
): { fingers: (number | null)[] | null; barre: ChordVoicing['barreInfo']; fingerCount: number } {
  const fingers: (number | null)[] = new Array(6).fill(null);

  if (fretted.length === 0) {
    // All open/muted
    return { fingers, barre: null, fingerCount: 0 };
  }

  // Detect barre: if multiple strings are pressed on the same (lowest) fret
  const onMinFret: number[] = [];
  for (let s = 0; s < 6; s++) {
    if (voicing[s] === minFret && minFret > 0) {
      onMinFret.push(s);
    }
  }

  let barre: ChordVoicing['barreInfo'] = null;
  let fingerIdx = 1;

  if (onMinFret.length >= 2 && minFret > 0) {
    // Barre on minFret
    const fromS = Math.min(...onMinFret);
    const toS = Math.max(...onMinFret);
    barre = { fret: minFret, fromString: fromS, toString: toS };
    // All strings on minFret get finger 1
    for (let s = fromS; s <= toS; s++) {
      if (voicing[s] !== null && voicing[s]! <= minFret) {
        fingers[s] = 1;
      }
    }
    fingerIdx = 2;
  }

  // Assign remaining fingers to other fretted notes, sorted by fret then string
  const remaining: { s: number; f: number }[] = [];
  for (let s = 0; s < 6; s++) {
    if (voicing[s] !== null && voicing[s]! > 0 && fingers[s] === null) {
      remaining.push({ s, f: voicing[s]! });
    }
  }
  remaining.sort((a, b) => a.f - b.f || a.s - b.s);

  for (const r of remaining) {
    if (fingerIdx > 4) return { fingers: null, barre, fingerCount: 5 };
    fingers[r.s] = fingerIdx;
    fingerIdx++;
  }

  const totalFingers = barre ? 1 + remaining.length : remaining.length;
  return { fingers, barre, fingerCount: totalFingers };
}

function deduplicateVoicings(voicings: ChordVoicing[]): ChordVoicing[] {
  const seen = new Set<string>();
  const result: ChordVoicing[] = [];

  for (const v of voicings) {
    const key = v.frets.map(f => f === null ? 'x' : String(f)).join('-');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(v);
  }

  return result;
}

export function getChordTypeCategories(): { category: string; types: { key: string; label: string }[] }[] {
  const catMap = new Map<string, { key: string; label: string }[]>();
  for (const [key, val] of Object.entries(CHORD_TYPES)) {
    if (!catMap.has(val.category)) catMap.set(val.category, []);
    catMap.get(val.category)!.push({ key, label: val.label || key });
  }
  return Array.from(catMap.entries()).map(([category, types]) => ({ category, types }));
}

export function getChordDisplayName(root: string, typeLabel: string): string {
  return `${root}${typeLabel}`;
}
