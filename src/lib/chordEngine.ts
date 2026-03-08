// Chord Engine — professional voicing generator for guitar

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

// Standard tuning MIDI: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];
const STRING_OPEN_NOTES = [4, 9, 2, 7, 11, 4]; // E A D G B E as semitone indices

const FLAT_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

function noteIndex(note: string): number {
  let idx = CHROMATIC.indexOf(note as any);
  if (idx >= 0) return idx;
  idx = CHROMATIC_FLAT.indexOf(note as any);
  return idx >= 0 ? idx : 0;
}

function noteName(idx: number, useFlats = false): string {
  const i = ((idx % 12) + 12) % 12;
  return useFlats ? CHROMATIC_FLAT[i] : CHROMATIC[i];
}

// ── Chord type definitions (intervals from root) ──

export const CHORD_TYPES: Record<string, { intervals: number[]; label: string; category: string }> = {
  // Triads
  'major':       { intervals: [0, 4, 7],       label: '',      category: 'Tríades' },
  'minor':       { intervals: [0, 3, 7],       label: 'm',     category: 'Tríades' },
  'diminished':  { intervals: [0, 3, 6],       label: '°',     category: 'Tríades' },
  'augmented':   { intervals: [0, 4, 8],       label: '+',     category: 'Tríades' },
  'sus2':        { intervals: [0, 2, 7],       label: 'sus2',  category: 'Tríades' },
  'sus4':        { intervals: [0, 5, 7],       label: 'sus4',  category: 'Tríades' },
  // Tetrads
  'maj7':        { intervals: [0, 4, 7, 11],   label: 'maj7',  category: 'Tétrades' },
  'm7':          { intervals: [0, 3, 7, 10],   label: 'm7',    category: 'Tétrades' },
  '7':           { intervals: [0, 4, 7, 10],   label: '7',     category: 'Tétrades' },
  'dim7':        { intervals: [0, 3, 6, 9],    label: '°7',    category: 'Tétrades' },
  'm7b5':        { intervals: [0, 3, 6, 10],   label: 'm7♭5',  category: 'Tétrades' },
  'maj7#5':      { intervals: [0, 4, 8, 11],   label: 'maj7♯5', category: 'Tétrades' },
  'maj7b5':      { intervals: [0, 4, 6, 11],   label: 'maj7♭5', category: 'Tétrades' },
  '7b5':         { intervals: [0, 4, 6, 10],   label: '7♭5',   category: 'Tétrades' },
  '7#5':         { intervals: [0, 4, 8, 10],   label: '7♯5',   category: 'Tétrades' },
  // Extended
  'add9':        { intervals: [0, 4, 7, 14],   label: 'add9',  category: 'Extendidos' },
  '9':           { intervals: [0, 4, 7, 10, 14], label: '9',   category: 'Extendidos' },
  'maj9':        { intervals: [0, 4, 7, 11, 14], label: 'maj9', category: 'Extendidos' },
  'm9':          { intervals: [0, 3, 7, 10, 14], label: 'm9',  category: 'Extendidos' },
  '11':          { intervals: [0, 4, 7, 10, 14, 17], label: '11', category: 'Extendidos' },
  'maj11':       { intervals: [0, 4, 7, 11, 14, 17], label: 'maj11', category: 'Extendidos' },
  'm11':         { intervals: [0, 3, 7, 10, 14, 17], label: 'm11', category: 'Extendidos' },
  '13':          { intervals: [0, 4, 7, 10, 14, 21], label: '13', category: 'Extendidos' },
  'maj13':       { intervals: [0, 4, 7, 11, 14, 21], label: 'maj13', category: 'Extendidos' },
  'm13':         { intervals: [0, 3, 7, 10, 14, 21], label: 'm13', category: 'Extendidos' },
  // Altered
  '7b9':         { intervals: [0, 4, 7, 10, 13], label: '7♭9', category: 'Alterados' },
  '7#9':         { intervals: [0, 4, 7, 10, 15], label: '7♯9', category: 'Alterados' },
  '7b9#5':       { intervals: [0, 4, 8, 10, 13], label: '7♭9♯5', category: 'Alterados' },
  '7#9#5':       { intervals: [0, 4, 8, 10, 15], label: '7♯9♯5', category: 'Alterados' },
  '7b9b5':       { intervals: [0, 4, 6, 10, 13], label: '7♭9♭5', category: 'Alterados' },
  // Tensions
  'add11':       { intervals: [0, 4, 7, 17],   label: 'add11', category: 'Tensões' },
  'add13':       { intervals: [0, 4, 7, 21],   label: 'add13', category: 'Tensões' },
  '6':           { intervals: [0, 4, 7, 9],    label: '6',     category: 'Tensões' },
  'm6':          { intervals: [0, 3, 7, 9],    label: 'm6',    category: 'Tensões' },
  '6/9':         { intervals: [0, 4, 7, 9, 14], label: '6/9',  category: 'Tensões' },
};

export const CHORD_CATEGORIES = Object.entries(
  Object.entries(CHORD_TYPES).reduce<Record<string, string[]>>((acc, [key, val]) => {
    (acc[val.category] ??= []).push(key);
    return acc;
  }, {})
);

// Get the notes (as semitone classes 0-11) for a chord
export function getChordNotes(root: string, chordType: string): number[] {
  const def = CHORD_TYPES[chordType];
  if (!def) return [];
  const r = noteIndex(root);
  return def.intervals.map(i => (r + i) % 12);
}

export function getChordNoteNames(root: string, chordType: string): string[] {
  const flats = FLAT_ROOTS.has(root) || root.includes('b');
  return getChordNotes(root, chordType).map(n => noteName(n, flats));
}

export function getChordLabel(root: string, chordType: string): string {
  const def = CHORD_TYPES[chordType];
  return def ? `${root}${def.label}` : root;
}

// ── Voicing representation ──

export interface ChordVoicing {
  frets: (number | -1)[];   // -1 = muted, 0 = open
  fingers: number[];         // 0 = open/muted, 1-4 = finger
  barre: number | null;      // fret of barre, or null
  barreStrings: [number, number] | null; // [from, to] string indices
  notes: string[];
  score: number;
  startFret: number;
  chordName: string;
  root: string;
  type: string;
}

// ── Voicing search regions ──
const REGIONS = [
  [0, 4], [3, 7], [5, 9], [7, 12], [9, 15]
];

// ── Main voicing generator ──

export function generateChordVoicings(root: string, chordType: string, maxResults = 12): ChordVoicing[] {
  const chordPCs = getChordNotes(root, chordType);
  if (chordPCs.length === 0) return [];
  
  const flats = FLAT_ROOTS.has(root) || root.includes('b');
  const rootPC = noteIndex(root);
  const def = CHORD_TYPES[chordType];
  
  // Required: root + 3rd (or 2nd/4th for sus)
  const thirdInterval = def.intervals.find(i => i === 3 || i === 4 || i === 2 || i === 5) ?? def.intervals[1];
  const thirdPC = (rootPC + thirdInterval) % 12;
  
  const allVoicings: ChordVoicing[] = [];
  
  for (const [regionMin, regionMax] of REGIONS) {
    generateInRegion(regionMin, regionMax, chordPCs, rootPC, thirdPC, flats, root, chordType, allVoicings);
  }
  
  // Sort by score descending
  allVoicings.sort((a, b) => b.score - a.score);
  
  // Deduplicate by fret pattern
  const seen = new Set<string>();
  const unique: ChordVoicing[] = [];
  for (const v of allVoicings) {
    const key = v.frets.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
    if (unique.length >= maxResults) break;
  }
  
  return unique;
}

function generateInRegion(
  minFret: number, maxFret: number,
  chordPCs: number[], rootPC: number, thirdPC: number,
  flats: boolean, root: string, chordType: string,
  results: ChordVoicing[]
) {
  // For each string, find candidate frets
  const candidates: (number | -1)[][] = [];
  
  for (let s = 0; s < 6; s++) {
    const openNote = STRING_OPEN_NOTES[s];
    const opts: (number | -1)[] = [-1]; // muted is always an option
    
    // Check open string
    if (chordPCs.includes(openNote) && minFret <= 3) {
      opts.push(0);
    }
    
    // Check frets in region
    for (let f = Math.max(1, minFret); f <= maxFret; f++) {
      const pc = (openNote + f) % 12;
      if (chordPCs.includes(pc)) {
        opts.push(f);
      }
    }
    
    candidates.push(opts);
  }
  
  // Generate combinations — limit depth to avoid explosion
  // Use recursive with pruning
  const combo: (number | -1)[] = new Array(6).fill(-1);
  
  function recurse(stringIdx: number) {
    if (stringIdx === 6) {
      evaluateVoicing(combo, chordPCs, rootPC, thirdPC, flats, root, chordType, results);
      return;
    }
    
    for (const fret of candidates[stringIdx]) {
      combo[stringIdx] = fret;
      
      // Early pruning: check span so far
      const pressedSoFar = combo.slice(0, stringIdx + 1).filter(f => f > 0) as number[];
      if (pressedSoFar.length > 0) {
        const span = Math.max(...pressedSoFar) - Math.min(...pressedSoFar);
        if (span > 4) { continue; }
      }
      
      // Check muted count — don't mute more than 2 strings
      const mutedSoFar = combo.slice(0, stringIdx + 1).filter(f => f === -1).length;
      if (mutedSoFar > 2) { continue; }
      
      recurse(stringIdx + 1);
    }
  }
  
  recurse(0);
}

function evaluateVoicing(
  frets: (number | -1)[], chordPCs: number[], rootPC: number, thirdPC: number,
  flats: boolean, root: string, chordType: string,
  results: ChordVoicing[]
) {
  const playedStrings = frets.map((f, i) => ({ fret: f, string: i })).filter(x => x.fret >= 0);
  
  // Must use at least 3 strings
  if (playedStrings.length < 3) return;
  // Max 6
  if (playedStrings.length > 6) return;
  
  // Check string skipping — max 1 consecutive muted string between played strings
  const firstPlayed = playedStrings[0].string;
  const lastPlayed = playedStrings[playedStrings.length - 1].string;
  let consecutiveMuted = 0;
  for (let s = firstPlayed; s <= lastPlayed; s++) {
    if (frets[s] === -1) {
      consecutiveMuted++;
      if (consecutiveMuted > 1) return;
    } else {
      consecutiveMuted = 0;
    }
  }
  
  // Only allow muted strings at the edges (low strings mostly)
  // Actually allow 1 internal skip as already checked above
  
  // Get played notes
  const playedNotes = playedStrings.map(x => (STRING_OPEN_NOTES[x.string] + (x.fret)) % 12);
  const uniqueNotes = new Set(playedNotes);
  
  // Must contain root
  if (!uniqueNotes.has(rootPC)) return;
  
  // Must contain third (or equivalent)
  if (!uniqueNotes.has(thirdPC)) return;
  
  // Fretted notes (non-open, non-muted)
  const frettedPositions = playedStrings.filter(x => x.fret > 0).map(x => x.fret);
  
  if (frettedPositions.length > 0) {
    const minF = Math.min(...frettedPositions);
    const maxF = Math.max(...frettedPositions);
    const span = maxF - minF;
    if (span > 4) return;
    
    // Count distinct fret positions (for finger count)
    const distinctFrets = new Set(frettedPositions);
    // Check if barre is needed
    const fretCounts: Record<number, number> = {};
    for (const f of frettedPositions) {
      fretCounts[f] = (fretCounts[f] || 0) + 1;
    }
    
    // Find potential barre fret (lowest fret pressed on multiple strings)
    let barreFret: number | null = null;
    for (const [fStr, count] of Object.entries(fretCounts)) {
      if (count >= 2) {
        const f = Number(fStr);
        if (barreFret === null || f < barreFret) barreFret = f;
      }
    }
    
    // Finger count: distinct positions minus barre savings
    let fingersNeeded = distinctFrets.size;
    if (barreFret !== null) {
      // Barre covers all strings at that fret, counts as 1 finger
      // Already counted as 1 in distinctFrets
    }
    if (fingersNeeded > 4) return;
    
    // Check note repetitions — max 2 of same note
    for (const pc of uniqueNotes) {
      const count = playedNotes.filter(n => n === pc).length;
      if (count > 2) return;
    }
  }
  
  // ── Score the voicing ──
  let score = 50;
  
  // Prefer root in bass
  const bassNote = playedNotes[0];
  if (bassNote === rootPC) score += 15;
  
  // Prefer smaller span
  if (frettedPositions.length > 0) {
    const span = Math.max(...frettedPositions) - Math.min(...frettedPositions);
    score -= span * 3;
  }
  
  // Prefer more strings played
  score += playedStrings.length * 2;
  
  // Prefer positions near nut
  if (frettedPositions.length > 0) {
    const avgFret = frettedPositions.reduce((a, b) => a + b, 0) / frettedPositions.length;
    if (avgFret <= 3) score += 5;
  }
  
  // Prefer open strings
  const openCount = playedStrings.filter(x => x.fret === 0).length;
  score += openCount * 2;
  
  // Penalize skipped strings
  score -= consecutiveMuted * 5;
  
  // Build voicing
  const voicingFrets = [...frets];
  const noteNames = voicingFrets.map((f, s) => {
    if (f < 0) return 'X';
    return noteName((STRING_OPEN_NOTES[s] + f) % 12, flats);
  });
  
  // Assign fingers
  const fingers = assignFingers(voicingFrets);
  
  // Detect barre
  let barre: number | null = null;
  let barreStrings: [number, number] | null = null;
  const frettedOnly = voicingFrets.map((f, i) => ({ fret: f, string: i })).filter(x => x.fret > 0);
  if (frettedOnly.length > 0) {
    const fretCounts: Record<number, number[]> = {};
    for (const x of frettedOnly) {
      (fretCounts[x.fret] ??= []).push(x.string);
    }
    for (const [fStr, strings] of Object.entries(fretCounts)) {
      if (strings.length >= 2) {
        const f = Number(fStr);
        if (barre === null || f < barre) {
          barre = f;
          barreStrings = [Math.min(...strings), Math.max(...strings)];
        }
      }
    }
  }
  
  const startFret = frettedPositions.length > 0 ? Math.min(...frettedPositions) : 0;
  
  results.push({
    frets: voicingFrets,
    fingers,
    barre,
    barreStrings,
    notes: noteNames,
    score,
    startFret,
    chordName: getChordLabel(root, chordType),
    root,
    type: chordType,
  });
}

function assignFingers(frets: (number | -1)[]): number[] {
  const fingers = new Array(6).fill(0);
  const fretted = frets
    .map((f, i) => ({ fret: f, string: i }))
    .filter(x => x.fret > 0)
    .sort((a, b) => a.fret - b.fret || a.string - b.string);
  
  if (fretted.length === 0) return fingers;
  
  // Check for barre (lowest fret with multiple strings)
  const fretGroups: Record<number, number[]> = {};
  for (const x of fretted) {
    (fretGroups[x.fret] ??= []).push(x.string);
  }
  
  let barreF: number | null = null;
  for (const [fStr, strings] of Object.entries(fretGroups)) {
    if (strings.length >= 2) {
      const f = Number(fStr);
      if (barreF === null || f < barreF) barreF = f;
    }
  }
  
  let nextFinger = 1;
  
  if (barreF !== null) {
    // Barre gets finger 1
    for (const x of fretted) {
      if (x.fret === barreF) fingers[x.string] = 1;
    }
    nextFinger = 2;
    
    // Assign remaining
    const remaining = fretted.filter(x => x.fret !== barreF).sort((a, b) => a.fret - b.fret || a.string - b.string);
    for (const x of remaining) {
      if (nextFinger <= 4) {
        fingers[x.string] = nextFinger++;
      }
    }
  } else {
    for (const x of fretted) {
      if (nextFinger <= 4) {
        fingers[x.string] = nextFinger++;
      }
    }
  }
  
  return fingers;
}

// ── Triad Engine ──

export interface TriadVoicing {
  type: string;          // major, minor, diminished, augmented
  root: string;
  inversion: string;     // 'Root', '1st', '2nd'
  cagedShape: string;
  strings: [number, number, number]; // string indices (0-based, 0=low E)
  frets: [number, number, number];
  notes: [string, string, string];
  region: string;
}

const TRIAD_TYPES: Record<string, number[]> = {
  'major':      [0, 4, 7],
  'minor':      [0, 3, 7],
  'diminished': [0, 3, 6],
  'augmented':  [0, 4, 8],
};

const TRIAD_STRING_SETS: [number, number, number][] = [
  [3, 4, 5], // strings 4-5-6 (D-B-E) → index 3,4,5
  [2, 3, 4], // strings 3-4-5 (G-D-B) → wait, strings are 0=low E
  // Let me redefine: string 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E
  // Classic triad sets on adjacent strings:
  // Set 1: strings 1-2-3 (high E, B, G) = indices 5,4,3
  // Set 2: strings 2-3-4 (B, G, D) = indices 4,3,2
  // Set 3: strings 3-4-5 (G, D, A) = indices 3,2,1
  // Set 4: strings 4-5-6 (D, A, low E) = indices 2,1,0
];

// Re-do: classic guitar triad sets (high to low)
const TRIAD_SETS: [number, number, number][] = [
  [5, 4, 3], // strings 1-2-3 (highE, B, G)
  [4, 3, 2], // strings 2-3-4 (B, G, D)
  [3, 2, 1], // strings 3-4-5 (G, D, A)
  [2, 1, 0], // strings 4-5-6 (D, A, lowE)
];

const TRIAD_REGIONS = [[0, 4], [3, 7], [5, 9], [7, 12]];

// CAGED shape detection based on position on the neck
function detectCAGEDShape(root: string, frets: number[], strings: number[]): string {
  const rootPC = noteIndex(root);
  // Find where the root sits on the lowest string used
  const lowestString = Math.min(...strings);
  const openNote = STRING_OPEN_NOTES[lowestString];
  const rootFretOnLowest = ((rootPC - openNote) + 12) % 12;
  
  // Map position to CAGED
  if (rootFretOnLowest === 0 || rootFretOnLowest === 12) {
    if (lowestString <= 1) return 'E';
    if (lowestString === 2) return 'D';
    return 'C';
  }
  if (rootFretOnLowest <= 2) return 'D';
  if (rootFretOnLowest <= 4) return 'C';
  if (rootFretOnLowest <= 5) return 'A';
  if (rootFretOnLowest <= 7) return 'G';
  if (rootFretOnLowest <= 9) return 'E';
  if (rootFretOnLowest <= 10) return 'D';
  return 'C';
}

export function generateTriadVoicings(root: string, triadType: string = 'major'): TriadVoicing[] {
  const intervals = TRIAD_TYPES[triadType];
  if (!intervals) return [];
  
  const rootPC = noteIndex(root);
  const flats = FLAT_ROOTS.has(root) || root.includes('b');
  const chordPCs = intervals.map(i => (rootPC + i) % 12);
  
  // Generate all 3 inversions
  const inversions: { name: string; pcs: number[] }[] = [
    { name: 'Root', pcs: [chordPCs[0], chordPCs[1], chordPCs[2]] },
    { name: '1st', pcs: [chordPCs[1], chordPCs[2], chordPCs[0]] },
    { name: '2nd', pcs: [chordPCs[2], chordPCs[0], chordPCs[1]] },
  ];
  
  const results: TriadVoicing[] = [];
  
  for (const stringSet of TRIAD_SETS) {
    for (const [regMin, regMax] of TRIAD_REGIONS) {
      for (const inv of inversions) {
        // Try to find frets for each string matching the inversion order
        // String order: stringSet[0] = highest, [1] = mid, [2] = lowest
        // Bass note = stringSet[2], mid = stringSet[1], high = stringSet[0]
        // Inversion pcs: [bass, mid, high] — wait, inv.pcs is [lowest note, mid, highest]
        // For guitar: stringSet[2] is the lowest string, stringSet[0] is highest
        const targetPCs = [inv.pcs[2], inv.pcs[1], inv.pcs[0]]; // [highString, midString, lowString]
        
        const fretOptions: number[][] = [];
        let valid = true;
        
        for (let si = 0; si < 3; si++) {
          const s = stringSet[si]; // string index
          const openNote = STRING_OPEN_NOTES[s];
          const targetPC = targetPCs[si];
          const opts: number[] = [];
          
          // Check open
          if (openNote === targetPC && regMin <= 3) opts.push(0);
          
          // Check frets in region
          for (let f = Math.max(1, regMin); f <= regMax; f++) {
            if ((openNote + f) % 12 === targetPC) opts.push(f);
          }
          
          if (opts.length === 0) { valid = false; break; }
          fretOptions.push(opts);
        }
        
        if (!valid) continue;
        
        // Generate all combos for this triad
        for (const f0 of fretOptions[0]) {
          for (const f1 of fretOptions[1]) {
            for (const f2 of fretOptions[2]) {
              const triadFrets: [number, number, number] = [f0, f1, f2];
              const pressed = triadFrets.filter(f => f > 0);
              
              if (pressed.length > 0) {
                const span = Math.max(...pressed) - Math.min(...pressed);
                if (span > 3) continue;
              }
              
              const noteNamesArr: [string, string, string] = [
                noteName((STRING_OPEN_NOTES[stringSet[0]] + f0) % 12, flats),
                noteName((STRING_OPEN_NOTES[stringSet[1]] + f1) % 12, flats),
                noteName((STRING_OPEN_NOTES[stringSet[2]] + f2) % 12, flats),
              ];
              
              const caged = detectCAGEDShape(root, triadFrets, stringSet as unknown as number[]);
              
              results.push({
                type: triadType,
                root,
                inversion: inv.name,
                cagedShape: caged,
                strings: stringSet,
                frets: triadFrets,
                notes: noteNamesArr,
                region: `${regMin}–${regMax}`,
              });
            }
          }
        }
      }
    }
  }
  
  // Deduplicate
  const seen = new Set<string>();
  return results.filter(t => {
    const key = `${t.strings.join(',')}-${t.frets.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const ALL_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
