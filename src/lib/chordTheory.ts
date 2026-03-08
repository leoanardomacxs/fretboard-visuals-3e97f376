// ============================================================
// Chord Theory Engine
// Chord formulas, voicing generation, triad engine, CAGED
// ============================================================

// ---- Notes & Intervals ----

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const FLAT_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

function noteIndex(note: string): number {
  let idx = CHROMATIC.indexOf(note as any);
  if (idx >= 0) return idx;
  idx = CHROMATIC_FLAT.indexOf(note as any);
  return idx >= 0 ? idx : 0;
}

function noteName(index: number, flats = false): string {
  const i = ((index % 12) + 12) % 12;
  return flats ? CHROMATIC_FLAT[i] : CHROMATIC[i];
}

function useFlats(root: string): boolean {
  return FLAT_ROOTS.has(root) || root.includes('b');
}

// ---- Chord Formulas (semitones from root) ----

export const CHORD_FORMULAS: Record<string, number[]> = {
  // Triads
  'major':       [0, 4, 7],
  'minor':       [0, 3, 7],
  'dim':         [0, 3, 6],
  'aug':         [0, 4, 8],
  'sus2':        [0, 2, 7],
  'sus4':        [0, 5, 7],
  // Tetrads
  'maj7':        [0, 4, 7, 11],
  'm7':          [0, 3, 7, 10],
  '7':           [0, 4, 7, 10],
  'dim7':        [0, 3, 6, 9],
  'm7b5':        [0, 3, 6, 10],
  'maj7#5':      [0, 4, 8, 11],
  'maj7b5':      [0, 4, 6, 11],
  '7b5':         [0, 4, 6, 10],
  '7#5':         [0, 4, 8, 10],
  // Extended
  'add9':        [0, 2, 4, 7],
  '9':           [0, 2, 4, 7, 10],
  'maj9':        [0, 2, 4, 7, 11],
  'm9':          [0, 2, 3, 7, 10],
  '11':          [0, 2, 4, 5, 7, 10],
  'maj11':       [0, 2, 4, 5, 7, 11],
  'm11':         [0, 2, 3, 5, 7, 10],
  '13':          [0, 2, 4, 7, 9, 10],
  'maj13':       [0, 2, 4, 7, 9, 11],
  'm13':         [0, 2, 3, 7, 9, 10],
  // Altered
  '7b9':         [0, 1, 4, 7, 10],
  '7#9':         [0, 3, 4, 7, 10],
  '7b9#5':       [0, 1, 4, 8, 10],
  '7#9#5':       [0, 3, 4, 8, 10],
  '7b9b5':       [0, 1, 4, 6, 10],
  '7#9b5':       [0, 3, 4, 6, 10],
  // Tensions
  'add11':       [0, 4, 5, 7],
  'add13':       [0, 4, 7, 9],
  '6':           [0, 4, 7, 9],
  'm6':          [0, 3, 7, 9],
  '6/9':         [0, 2, 4, 7, 9],
};

export const CHORD_CATEGORIES: Record<string, string[]> = {
  'Tríades':     ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'],
  'Tétrades':    ['maj7', 'm7', '7', 'dim7', 'm7b5', 'maj7#5', 'maj7b5', '7b5', '7#5'],
  'Extendidos':  ['add9', '9', 'maj9', 'm9', '11', 'maj11', 'm11', '13', 'maj13', 'm13'],
  'Alterados':   ['7b9', '7#9', '7b5', '7#5', '7b9#5', '7#9#5', '7b9b5'],
  'Tensões':     ['add11', 'add13', '6', 'm6', '6/9'],
};

export function getChordNotes(root: string, chordType: string): string[] {
  const formula = CHORD_FORMULAS[chordType];
  if (!formula) return [];
  const ri = noteIndex(root);
  const flats = useFlats(root);
  return formula.map(interval => noteName(ri + interval, flats));
}

export function getChordLabel(root: string, chordType: string): string {
  return `${root}${chordType === 'major' ? '' : chordType === 'minor' ? 'm' : chordType}`;
}

// ---- Guitar Tuning ----

const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]; // E2-E4 MIDI

function fretboardNote(string: number, fret: number): number {
  return (STANDARD_TUNING[string] + fret) % 12;
}

// ---- Voicing Types ----

export interface ChordVoicing {
  root: string;
  chordType: string;
  label: string;
  frets: (number | 'X')[];  // per string, 6 values
  fingers: number[];
  barre: number | null;
  barreSpan: [number, number] | null; // [lowString, highString]
  startFret: number;
  notes: string[];
  region: string;
}

export interface TriadVoicing {
  root: string;
  type: 'major' | 'minor' | 'dim' | 'aug';
  inversion: 'Root' | '1st' | '2nd';
  cagedShape: string;
  strings: [number, number, number]; // 0-based string indices
  frets: [number, number, number];
  notes: [string, string, string];
  region: string;
}

// ---- Voicing Generator ----

const REGIONS = [
  { name: '0–4',  min: 0,  max: 4 },
  { name: '3–7',  min: 3,  max: 7 },
  { name: '5–9',  min: 5,  max: 9 },
  { name: '7–12', min: 7,  max: 12 },
  { name: '9–15', min: 9,  max: 15 },
];

const TRIAD_REGIONS = [
  { name: '0–4',  min: 0,  max: 4 },
  { name: '3–7',  min: 3,  max: 7 },
  { name: '5–9',  min: 5,  max: 9 },
  { name: '7–12', min: 7,  max: 12 },
];

const TRIAD_STRING_SETS: [number, number, number][] = [
  [3, 4, 5], // strings 4-5-6 (D-A-E low)
  [2, 3, 4], // strings 3-4-5 (G-D-A)
  [1, 2, 3], // strings 2-3-4 (B-G-D)
  [0, 1, 2], // strings 1-2-3 (E-B-G)
];

export function generateChordVoicings(root: string, chordType: string, maxResults = 12): ChordVoicing[] {
  const formula = CHORD_FORMULAS[chordType];
  if (!formula) return [];

  const rootIdx = noteIndex(root);
  const flats = useFlats(root);
  const targetNotes = new Set(formula.map(i => (rootIdx + i) % 12));
  const rootMod = rootIdx % 12;
  const results: ChordVoicing[] = [];

  for (const region of REGIONS) {
    // Try all combinations within region
    const stringFrets: number[][] = [];
    for (let s = 0; s < 6; s++) {
      const options: number[] = [-1]; // muted
      for (let f = (region.min === 0 ? 0 : region.min); f <= region.max; f++) {
        const n = fretboardNote(s, f);
        if (targetNotes.has(n)) {
          options.push(f);
        }
      }
      stringFrets.push(options);
    }

    // Generate voicings using DFS with pruning
    const voicings: (number | -1)[][] = [];
    
    function search(s: number, current: (number | -1)[]) {
      if (voicings.length >= 50) return; // limit per region
      if (s === 6) {
        if (isValidVoicing(current, targetNotes, rootMod, region)) {
          voicings.push([...current]);
        }
        return;
      }
      for (const f of stringFrets[s]) {
        current.push(f);
        search(s + 1, current);
        current.pop();
      }
    }
    
    search(0, []);

    // Score and pick best
    const scored = voicings.map(v => ({ v, score: scoreVoicing(v, rootMod, formula.length) }));
    scored.sort((a, b) => b.score - a.score);
    
    for (const { v } of scored.slice(0, 3)) {
      const voicing = buildVoicing(v, root, chordType, flats, region.name);
      if (voicing) results.push(voicing);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = results.filter(v => {
    const key = v.frets.join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, maxResults);
}

function isValidVoicing(frets: (number | -1)[], targetNotes: Set<number>, rootMod: number, region: { min: number; max: number }): boolean {
  const pressed = frets.filter(f => f >= 0);
  if (pressed.length < 3) return false;
  
  const pressedNonOpen = pressed.filter(f => f > 0);
  if (pressedNonOpen.length > 0) {
    const minF = Math.min(...pressedNonOpen);
    const maxF = Math.max(...pressedNonOpen);
    if (maxF - minF > 4) return false;
  }

  // Count distinct fingers needed (non-open, non-muted)
  const fingered = pressed.filter(f => f > 0);
  const uniqueFrets = new Set(fingered);
  // If all same fret, it's a barre (1 finger) + any additional
  let fingersNeeded: number;
  if (uniqueFrets.size <= 1) {
    fingersNeeded = 1;
  } else {
    const sorted = [...uniqueFrets].sort((a, b) => a - b);
    const minFret = sorted[0];
    // Count how many strings at min fret (potential barre)
    const atMin = fingered.filter(f => f === minFret).length;
    if (atMin >= 2) {
      fingersNeeded = 1 + (uniqueFrets.size - 1); // barre + others
    } else {
      fingersNeeded = uniqueFrets.size;
    }
  }
  if (fingersNeeded > 4) return false;

  // Root must be present
  const notesPlayed = new Set<number>();
  for (let s = 0; s < 6; s++) {
    if (frets[s] >= 0) {
      notesPlayed.add(fretboardNote(s, frets[s]));
    }
  }
  if (!notesPlayed.has(rootMod)) return false;

  // All played notes must be chord tones
  for (const n of notesPlayed) {
    if (!targetNotes.has(n)) return false;
  }

  // Must have at least 3 distinct chord tones
  if (notesPlayed.size < Math.min(3, targetNotes.size)) return false;

  // No leading muted strings between played strings
  let firstPlayed = -1, lastPlayed = -1;
  for (let s = 0; s < 6; s++) {
    if (frets[s] >= 0) {
      if (firstPlayed === -1) firstPlayed = s;
      lastPlayed = s;
    }
  }
  // Muted strings in the middle are bad
  let mutedInMiddle = 0;
  for (let s = firstPlayed; s <= lastPlayed; s++) {
    if (frets[s] === -1) mutedInMiddle++;
  }
  if (mutedInMiddle > 1) return false;

  return true;
}

function scoreVoicing(frets: (number | -1)[], rootMod: number, chordSize: number): number {
  let score = 0;
  const pressed = frets.filter(f => f >= 0);
  
  // Prefer more strings played (but not too many duplicates)
  score += pressed.length * 5;
  
  // Prefer root in bass
  for (let s = 5; s >= 0; s--) {
    if (frets[s] >= 0) {
      if (fretboardNote(s, frets[s]) === rootMod) score += 20;
      break;
    }
  }

  // Prefer open strings
  score += pressed.filter(f => f === 0).length * 3;

  // Prefer compact shapes
  const nonOpen = pressed.filter(f => f > 0);
  if (nonOpen.length > 0) {
    const span = Math.max(...nonOpen) - Math.min(...nonOpen);
    score -= span * 2;
  }

  // Penalize many muted strings
  const muted = frets.filter(f => f === -1).length;
  score -= muted * 3;

  // Count distinct notes
  const notes = new Set<number>();
  for (let s = 0; s < 6; s++) {
    if (frets[s] >= 0) notes.add(fretboardNote(s, frets[s]));
  }
  // Prefer having all chord tones
  score += notes.size * 8;

  return score;
}

function buildVoicing(frets: (number | -1)[], root: string, chordType: string, flats: boolean, region: string): ChordVoicing | null {
  const voicingFrets: (number | 'X')[] = frets.map(f => f === -1 ? 'X' : f) as (number | 'X')[];
  
  const pressed = frets.filter(f => f > 0);
  let barre: number | null = null;
  let barreSpan: [number, number] | null = null;
  
  if (pressed.length >= 2) {
    const minFret = Math.min(...pressed);
    const atMin = [];
    for (let s = 0; s < 6; s++) {
      if (frets[s] === minFret) atMin.push(s);
    }
    if (atMin.length >= 2) {
      barre = minFret;
      barreSpan = [Math.min(...atMin), Math.max(...atMin)];
    }
  }

  const notes: string[] = [];
  for (let s = 0; s < 6; s++) {
    if (frets[s] >= 0) {
      notes.push(noteName(fretboardNote(s, frets[s]), flats));
    }
  }

  // Simple finger assignment
  const fingers = assignFingers(frets, barre);

  const startFret = pressed.length > 0 ? Math.min(...pressed) : 0;

  return {
    root,
    chordType,
    label: getChordLabel(root, chordType),
    frets: voicingFrets,
    fingers,
    barre,
    barreSpan,
    startFret: startFret <= 1 ? 0 : startFret,
    notes,
    region,
  };
}

function assignFingers(frets: (number | -1)[], barre: number | null): number[] {
  const fingers = [0, 0, 0, 0, 0, 0];
  if (barre !== null) {
    for (let s = 0; s < 6; s++) {
      if (frets[s] === barre) fingers[s] = 1;
    }
  }
  
  const otherFrets: { s: number; f: number }[] = [];
  for (let s = 0; s < 6; s++) {
    if (frets[s] > 0 && frets[s] !== barre) {
      otherFrets.push({ s, f: frets[s] });
    }
  }
  otherFrets.sort((a, b) => a.f - b.f || a.s - b.s);
  
  let nextFinger = barre !== null ? 2 : 1;
  for (const { s } of otherFrets) {
    if (nextFinger <= 4) {
      fingers[s] = nextFinger++;
    }
  }
  
  return fingers;
}

// ---- Triad Generator ----

export function generateTriadVoicings(root: string, triadType: 'major' | 'minor' | 'dim' | 'aug'): TriadVoicing[] {
  const formula = CHORD_FORMULAS[triadType];
  if (!formula || formula.length !== 3) return [];
  
  const rootIdx = noteIndex(root);
  const flats = useFlats(root);
  const chordNotes = formula.map(i => (rootIdx + i) % 12);
  
  // 3 inversions: root, 1st (3rd in bass), 2nd (5th in bass)
  const inversions: { name: 'Root' | '1st' | '2nd'; order: number[] }[] = [
    { name: 'Root', order: [0, 1, 2] },
    { name: '1st',  order: [1, 2, 0] },
    { name: '2nd',  order: [2, 0, 1] },
  ];
  
  const results: TriadVoicing[] = [];
  
  for (const region of TRIAD_REGIONS) {
    for (const stringSet of TRIAD_STRING_SETS) {
      for (const inv of inversions) {
        // Target notes in order: bass → mid → high
        // stringSet is [high, mid, low] (0=high E)
        // We want bass on lowest string
        const targetByString = [
          { s: stringSet[2], note: chordNotes[inv.order[0]] }, // bass (lowest string)
          { s: stringSet[1], note: chordNotes[inv.order[1]] }, // mid
          { s: stringSet[0], note: chordNotes[inv.order[2]] }, // high
        ];
        
        const fretPositions: (number | null)[] = [null, null, null];
        let valid = true;
        
        for (let i = 0; i < 3; i++) {
          const { s, note } = targetByString[i];
          let found = false;
          for (let f = region.min; f <= region.max; f++) {
            if (fretboardNote(s, f) === note) {
              fretPositions[i] = f;
              found = true;
              break;
            }
          }
          if (!found) { valid = false; break; }
        }
        
        if (!valid) continue;
        
        const fretsArr = fretPositions as [number, number, number];
        const nonZero = fretsArr.filter(f => f > 0);
        if (nonZero.length > 0) {
          const span = Math.max(...nonZero) - Math.min(...nonZero);
          if (span > 3) continue;
        }
        
        const noteNames: [string, string, string] = [
          noteName(chordNotes[inv.order[0]], flats),
          noteName(chordNotes[inv.order[1]], flats),
          noteName(chordNotes[inv.order[2]], flats),
        ];
        
        const cagedShape = identifyCAGED(stringSet, fretsArr, triadType);
        
        results.push({
          root,
          type: triadType,
          inversion: inv.name,
          cagedShape,
          strings: [stringSet[2], stringSet[1], stringSet[0]],
          frets: fretsArr,
          notes: noteNames,
          region: region.name,
        });
      }
    }
  }
  
  // Deduplicate
  const seen = new Set<string>();
  return results.filter(v => {
    const key = `${v.strings.join(',')}-${v.frets.join(',')}-${v.inversion}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function identifyCAGED(strings: [number, number, number], frets: [number, number, number], type: string): string {
  // Simplified CAGED identification based on string group and shape
  const minFret = Math.min(...frets.filter(f => f > 0), 99);
  const [s1, s2, s3] = strings;
  
  // Rough heuristics based on common shapes
  if (s3 >= 3 && s3 <= 5) {
    // Low strings
    if (frets[0] === frets[1] && frets[1] === frets[2]) return 'E';
    if (minFret <= 3) return 'E';
    return 'A';
  }
  if (s1 <= 1) {
    // High strings
    if (minFret <= 2) return 'C';
    return 'D';
  }
  if (s1 <= 2 && s3 >= 3) {
    return 'G';
  }
  return 'A';
}

export const ALL_CHORD_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
