/**
 * Chord Generator Engine v2
 * Complete chord voicing generator with CAGED triad system.
 */

const TUNING = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

export const CHORD_TYPES: Record<string, { intervals: number[]; category: string; minNotes: number }> = {
  'maior':     { intervals: [0, 4, 7], category: 'Tríades', minNotes: 3 },
  'menor':     { intervals: [0, 3, 7], category: 'Tríades', minNotes: 3 },
  'diminuto':  { intervals: [0, 3, 6], category: 'Tríades', minNotes: 3 },
  'aumentado': { intervals: [0, 4, 8], category: 'Tríades', minNotes: 3 },
  'sus2':      { intervals: [0, 2, 7], category: 'Tríades', minNotes: 3 },
  'sus4':      { intervals: [0, 5, 7], category: 'Tríades', minNotes: 3 },
  '6':         { intervals: [0, 4, 7, 9], category: 'Sextas', minNotes: 4 },
  'm6':        { intervals: [0, 3, 7, 9], category: 'Sextas', minNotes: 4 },
  '7':         { intervals: [0, 4, 7, 10], category: 'Sétimas', minNotes: 4 },
  'maj7':      { intervals: [0, 4, 7, 11], category: 'Sétimas', minNotes: 4 },
  'm7':        { intervals: [0, 3, 7, 10], category: 'Sétimas', minNotes: 4 },
  'dim7':      { intervals: [0, 3, 6, 9], category: 'Sétimas', minNotes: 4 },
  'm7b5':      { intervals: [0, 3, 6, 10], category: 'Sétimas', minNotes: 4 },
  '9':         { intervals: [0, 4, 7, 10, 14], category: 'Extensões', minNotes: 4 },
  'm9':        { intervals: [0, 3, 7, 10, 14], category: 'Extensões', minNotes: 4 },
  'maj9':      { intervals: [0, 4, 7, 11, 14], category: 'Extensões', minNotes: 4 },
  '11':        { intervals: [0, 4, 7, 10, 14, 17], category: 'Extensões', minNotes: 4 },
  'm11':       { intervals: [0, 3, 7, 10, 14, 17], category: 'Extensões', minNotes: 4 },
  'maj11':     { intervals: [0, 4, 7, 11, 14, 17], category: 'Extensões', minNotes: 4 },
  '13':        { intervals: [0, 4, 7, 10, 14, 17, 21], category: 'Extensões', minNotes: 4 },
  'm13':       { intervals: [0, 3, 7, 10, 14, 17, 21], category: 'Extensões', minNotes: 4 },
  'maj13':     { intervals: [0, 4, 7, 11, 14, 17, 21], category: 'Extensões', minNotes: 4 },
  'add9':      { intervals: [0, 4, 7, 14], category: 'Add', minNotes: 4 },
  'add11':     { intervals: [0, 4, 7, 17], category: 'Add', minNotes: 4 },
  'add13':     { intervals: [0, 4, 7, 21], category: 'Add', minNotes: 4 },
  '7b5':       { intervals: [0, 4, 6, 10], category: 'Alterados', minNotes: 4 },
  '7#5':       { intervals: [0, 4, 8, 10], category: 'Alterados', minNotes: 4 },
  '7b9':       { intervals: [0, 4, 7, 10, 13], category: 'Alterados', minNotes: 4 },
  '7#9':       { intervals: [0, 4, 7, 10, 15], category: 'Alterados', minNotes: 4 },
  '7b9#5':     { intervals: [0, 4, 8, 10, 13], category: 'Alterados', minNotes: 4 },
  '7#9#5':     { intervals: [0, 4, 8, 10, 15], category: 'Alterados', minNotes: 4 },
  '7b9b5':     { intervals: [0, 4, 6, 10, 13], category: 'Alterados', minNotes: 4 },
  '7#11':      { intervals: [0, 4, 7, 10, 18], category: 'Alterados', minNotes: 4 },
  '7b13':      { intervals: [0, 4, 7, 10, 20], category: 'Alterados', minNotes: 4 },
  '7alt':      { intervals: [0, 4, 6, 10, 13], category: 'Alterados', minNotes: 4 },
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

export interface ChordVoicing {
  frets: number[];
  notes: string[];
  barreFret: number;
  barreSpan: [number, number];
  root: string;
  type: string;
  position: number;
  name: string;
  /** Difficulty score (lower = easier) */
  difficulty: number;
}

export interface TriadVoicing {
  frets: number[]; // length 6, -1 = not used
  notes: string[];
  strings: [number, number, number]; // 0-indexed string indices
  inversion: string; // 'Root', '1st', '2nd'
  cagedShape: string;
  root: string;
  position: number;
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

function getDisplayName(root: string, chordType: string, useFlats: boolean): string {
  const displayRoot = useFlats && root.includes('#') ? NOTE_NAMES_FLAT[noteIndex(root)] : root;
  if (chordType === 'maior') return displayRoot;
  if (chordType === 'menor') return displayRoot + 'm';
  return displayRoot + chordType;
}

// ── Difficulty scoring ──

function scoreDifficulty(frets: number[], barreFret: number): number {
  let score = 0;
  const pressed = frets.filter(f => f > 0);
  const hasOpen = frets.some(f => f === 0);
  const muted = frets.filter(f => f < 0).length;
  const activeCount = frets.filter(f => f >= 0).length;

  // Open chords are easiest
  if (hasOpen && pressed.length > 0 && Math.max(...pressed) <= 4) score += 0;
  else if (pressed.length === 0) score += 0;
  else score += 10;

  // Hand span
  if (pressed.length >= 2) {
    score += (Math.max(...pressed) - Math.min(...pressed)) * 3;
  }

  // Muted strings penalty
  score += muted * 4;

  // Fewer active strings = worse
  score += (6 - activeCount) * 2;

  // Finger count
  const uniqueFrets = new Set(pressed);
  score += uniqueFrets.size * 2;

  // Barre penalty
  if (barreFret > 0) score += 8;

  // Position on neck (higher = harder for beginners)
  if (pressed.length > 0) score += Math.min(...pressed);

  return score;
}

// ── Core voicing generation ──

export function generateChordVoicings(root: string, chordType: string, maxFret = 12): ChordVoicing[] {
  const info = CHORD_TYPES[chordType];
  if (!info) return [];

  const useFlats = FLAT_ROOTS.has(root) || root.includes('b');
  const rootPc = noteIndex(root);
  const pitchClasses = new Set(info.intervals.map(i => (rootPc + i) % 12));
  const requiredPcs = new Set(info.intervals.map(i => (rootPc + i) % 12));
  const displayName = getDisplayName(root, chordType, useFlats);

  // For each string, valid frets
  const stringOptions: number[][] = [];
  for (let s = 0; s < 6; s++) {
    const options: number[] = [-1];
    for (let f = 0; f <= maxFret; f++) {
      const pc = ((TUNING[s] + f) % 12 + 12) % 12;
      if (pitchClasses.has(pc)) options.push(f);
    }
    stringOptions.push(options);
  }

  const voicings: ChordVoicing[] = [];
  const seen = new Set<string>();
  const combo = new Array(6).fill(-1);

  function canContinue(upTo: number): boolean {
    const pressed: number[] = [];
    for (let i = 0; i <= upTo; i++) {
      if (combo[i] > 0) pressed.push(combo[i]);
    }
    if (pressed.length === 0) return true;
    return Math.max(...pressed) - Math.min(...pressed) <= 4;
  }

  function evaluateCombo() {
    const frets = [...combo];
    const activeStrings = frets.filter(f => f >= 0).length;
    if (activeStrings < 3) return;

    // No internal gaps
    let firstActive = -1, lastActive = -1;
    for (let i = 0; i < 6; i++) {
      if (frets[i] >= 0) {
        if (firstActive === -1) firstActive = i;
        lastActive = i;
      }
    }
    for (let i = firstActive; i <= lastActive; i++) {
      if (frets[i] < 0) return;
    }

    // Collect pitch classes
    const presentPcs = new Set<number>();
    const notesByString: string[] = [];
    for (let s = 0; s < 6; s++) {
      if (frets[s] < 0) { notesByString.push(''); continue; }
      const midi = TUNING[s] + frets[s];
      const pc = ((midi % 12) + 12) % 12;
      presentPcs.add(pc);
      notesByString.push(noteName(midi, useFlats));
    }

    if (!presentPcs.has(rootPc)) return;
    if (presentPcs.size < info.minNotes) return;

    // For triads/tetrads require all notes
    if (info.intervals.length <= 4) {
      for (const pc of requiredPcs) {
        if (!presentPcs.has(pc)) return;
      }
    }

    // Physical constraints
    const pressed = frets.filter(f => f > 0);
    if (pressed.length > 0) {
      const minF = Math.min(...pressed);
      const maxF = Math.max(...pressed);
      if (maxF - minF > 4) return;

      const uniqueFrets = [...new Set(pressed)];
      const barreCandidate = minF;
      const barreStrings: number[] = [];
      for (let s = firstActive; s <= lastActive; s++) {
        if (frets[s] === barreCandidate) barreStrings.push(s);
      }
      const hasBarre = barreStrings.length >= 2;
      const fingersNeeded = hasBarre
        ? uniqueFrets.filter(f => f !== barreCandidate).length + 1
        : uniqueFrets.length;
      if (fingersNeeded > 4) return;
    }

    // Excessive repetition
    const noteCounts: Record<string, number> = {};
    for (const n of notesByString) {
      if (n) noteCounts[n] = (noteCounts[n] || 0) + 1;
    }
    for (const count of Object.values(noteCounts)) {
      if (count > 3) return;
    }

    // Dedup
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
        barreFret = minF;
        barreSpan = [barreS[0], barreS[barreS.length - 1]];
      }
    }

    const position = pressedFrets.length > 0 ? Math.min(...pressedFrets) : 0;
    const difficulty = scoreDifficulty(frets, barreFret);

    voicings.push({
      frets: [...frets],
      notes: [...notesByString],
      barreFret,
      barreSpan,
      root,
      type: chordType,
      position,
      name: displayName,
      difficulty,
    });
  }

  function backtrack(stringIdx: number) {
    if (stringIdx === 6) { evaluateCombo(); return; }
    for (const fret of stringOptions[stringIdx]) {
      combo[stringIdx] = fret;
      if (canContinue(stringIdx)) backtrack(stringIdx + 1);
    }
    combo[stringIdx] = -1;
  }

  backtrack(0);

  // Sort by difficulty (easy → hard)
  voicings.sort((a, b) => a.difficulty - b.difficulty);

  // Dedup similar voicings (differ by only 1 fret on non-essential string)
  const filtered: ChordVoicing[] = [];
  for (const v of voicings) {
    let isDup = false;
    for (const existing of filtered) {
      let diffCount = 0;
      for (let s = 0; s < 6; s++) {
        if (v.frets[s] !== existing.frets[s]) diffCount++;
      }
      if (diffCount <= 1 && v.position === existing.position) {
        isDup = true;
        break;
      }
    }
    if (!isDup) filtered.push(v);
  }

  return filtered.slice(0, 80);
}

// ── CAGED Triad Generation ──

const TRIAD_STRING_SETS: [number, number, number][] = [
  [3, 4, 5], // strings 4-5-6 (D-B-E) — indices reversed: low=0
  [2, 3, 4], // G-B-E → actually strings G,B,e
  [1, 2, 3], // A-D-G
  [0, 1, 2], // E-A-D
];

// Actually let's use string indices where 0=low E, 5=high E
// Consecutive string sets for triads
const TRIAD_GROUPS: { strings: [number, number, number]; label: string }[] = [
  { strings: [0, 1, 2], label: 'E-A-D' },
  { strings: [1, 2, 3], label: 'A-D-G' },
  { strings: [2, 3, 4], label: 'D-G-B' },
  { strings: [3, 4, 5], label: 'G-B-E' },
];

function getInversionName(intervals: number[]): string {
  // intervals relative to root (0=root, 4=3rd, 7=5th for major)
  // Root position: root is lowest
  // 1st inversion: 3rd is lowest
  // 2nd inversion: 5th is lowest
  const lowest = intervals[0];
  if (lowest === 0) return 'Fundamental';
  if (lowest === 3 || lowest === 4) return '1ª Inversão';
  return '2ª Inversão';
}

function identifyCAGEDShape(strings: [number, number, number], frets: number[], rootPc: number): string {
  // Simplified CAGED identification based on position patterns
  const pressed = frets.filter(f => f > 0);
  if (pressed.length === 0) return 'Open';
  const minFret = Math.min(...pressed);
  
  // Based on string group and relative positions, assign CAGED shape
  if (strings[0] === 0) { // E-A-D strings
    if (minFret <= 2) return 'E';
    if (minFret <= 5) return 'D';
    if (minFret <= 8) return 'C';
    return 'A';
  }
  if (strings[0] === 1) { // A-D-G
    if (minFret <= 2) return 'A';
    if (minFret <= 5) return 'G';
    if (minFret <= 8) return 'E';
    return 'D';
  }
  if (strings[0] === 2) { // D-G-B
    if (minFret <= 2) return 'D';
    if (minFret <= 5) return 'C';
    if (minFret <= 8) return 'A';
    return 'G';
  }
  // G-B-E
  if (minFret <= 2) return 'G';
  if (minFret <= 5) return 'E';
  if (minFret <= 8) return 'D';
  return 'C';
}

export function generateTriads(root: string, quality: 'maior' | 'menor' | 'diminuto' | 'aumentado' = 'maior'): TriadVoicing[] {
  const useFlats = FLAT_ROOTS.has(root) || root.includes('b');
  const rootPc = noteIndex(root);
  const info = CHORD_TYPES[quality];
  if (!info) return [];

  const chordPcs = info.intervals.map(i => (rootPc + i) % 12);
  const triads: TriadVoicing[] = [];
  const seen = new Set<string>();

  for (const group of TRIAD_GROUPS) {
    const [s0, s1, s2] = group.strings;

    // Find valid frets for each string (0-12)
    const options0: number[] = [];
    const options1: number[] = [];
    const options2: number[] = [];

    for (let f = 0; f <= 14; f++) {
      const pc0 = ((TUNING[s0] + f) % 12 + 12) % 12;
      const pc1 = ((TUNING[s1] + f) % 12 + 12) % 12;
      const pc2 = ((TUNING[s2] + f) % 12 + 12) % 12;
      if (chordPcs.includes(pc0)) options0.push(f);
      if (chordPcs.includes(pc1)) options1.push(f);
      if (chordPcs.includes(pc2)) options2.push(f);
    }

    // Try all combos within 4 fret span
    for (const f0 of options0) {
      for (const f1 of options1) {
        for (const f2 of options2) {
          const pressed = [f0, f1, f2].filter(f => f > 0);
          if (pressed.length >= 2) {
            const span = Math.max(...pressed) - Math.min(...pressed);
            if (span > 4) continue;
          }

          // Check all 3 chord tones present
          const pcs = [
            ((TUNING[s0] + f0) % 12 + 12) % 12,
            ((TUNING[s1] + f1) % 12 + 12) % 12,
            ((TUNING[s2] + f2) % 12 + 12) % 12,
          ];
          const uniquePcs = new Set(pcs);
          if (uniquePcs.size < 3) continue;

          // All 3 chord tones must be present
          let allPresent = true;
          for (const cp of chordPcs) {
            if (!uniquePcs.has(cp)) { allPresent = false; break; }
          }
          if (!allPresent) continue;

          const key = `${s0}-${f0}-${f1}-${f2}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const frets = new Array(6).fill(-1);
          frets[s0] = f0;
          frets[s1] = f1;
          frets[s2] = f2;

          const notes = new Array(6).fill('');
          notes[s0] = noteName(TUNING[s0] + f0, useFlats);
          notes[s1] = noteName(TUNING[s1] + f1, useFlats);
          notes[s2] = noteName(TUNING[s2] + f2, useFlats);

          // Determine inversion based on lowest note
          const lowestPc = pcs[0];
          const lowestInterval = ((lowestPc - rootPc) + 12) % 12;
          let inversion = 'Fundamental';
          if (lowestInterval === info.intervals[1] || lowestInterval === info.intervals[1] % 12) {
            inversion = '1ª Inversão';
          } else if (lowestInterval === info.intervals[2] || lowestInterval === info.intervals[2] % 12) {
            inversion = '2ª Inversão';
          }

          const position = pressed.length > 0 ? Math.min(...pressed) : 0;
          const cagedShape = identifyCAGEDShape(group.strings, frets, rootPc);

          triads.push({
            frets,
            notes,
            strings: group.strings,
            inversion,
            cagedShape,
            root,
            position,
          });
        }
      }
    }
  }

  triads.sort((a, b) => {
    if (a.strings[0] !== b.strings[0]) return a.strings[0] - b.strings[0];
    return a.position - b.position;
  });

  return triads;
}

export { NOTE_NAMES, NOTE_NAMES_FLAT };
