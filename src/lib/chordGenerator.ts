import { getNoteIndex, getNoteName, useFlats } from './musicTheory';

// Standard tuning MIDI: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

// Chord type definitions: intervals from root in semitones
export const CHORD_TYPES: Record<string, { intervals: number[]; label: string; category: string }> = {
  // Tríades básicas
  'major':       { intervals: [0, 4, 7],       label: '',      category: 'Básicos' },
  'minor':       { intervals: [0, 3, 7],       label: 'm',     category: 'Básicos' },
  'dim':         { intervals: [0, 3, 6],       label: '°',     category: 'Básicos' },
  'aug':         { intervals: [0, 4, 8],       label: '+',     category: 'Básicos' },
  'sus2':        { intervals: [0, 2, 7],       label: 'sus2',  category: 'Básicos' },
  'sus4':        { intervals: [0, 5, 7],       label: 'sus4',  category: 'Básicos' },
  // Power chord
  '5':           { intervals: [0, 7],           label: '5',     category: 'Power Chord' },
  // Acordes com sétima
  '7':           { intervals: [0, 4, 7, 10],   label: '7',     category: 'Com Sétima' },
  'maj7':        { intervals: [0, 4, 7, 11],   label: 'maj7',  category: 'Com Sétima' },
  'min7':        { intervals: [0, 3, 7, 10],   label: 'm7',    category: 'Com Sétima' },
  'min-maj7':    { intervals: [0, 3, 7, 11],   label: 'm(maj7)', category: 'Com Sétima' },
  'dim7':        { intervals: [0, 3, 6, 9],    label: '°7',    category: 'Com Sétima' },
  'half-dim7':   { intervals: [0, 3, 6, 10],   label: 'ø7',    category: 'Com Sétima' },
  'aug7':        { intervals: [0, 4, 8, 10],   label: '+7',    category: 'Com Sétima' },
  '7sus4':       { intervals: [0, 5, 7, 10],   label: '7sus4', category: 'Com Sétima' },
  // Extensões
  'add9':        { intervals: [0, 4, 7, 14],   label: 'add9',  category: 'Extensões' },
  'madd9':       { intervals: [0, 3, 7, 14],   label: 'madd9', category: 'Extensões' },
  '6':           { intervals: [0, 4, 7, 9],    label: '6',     category: 'Extensões' },
  'm6':          { intervals: [0, 3, 7, 9],    label: 'm6',    category: 'Extensões' },
  '9':           { intervals: [0, 4, 7, 10, 14], label: '9',   category: 'Extensões' },
  'maj9':        { intervals: [0, 4, 7, 11, 14], label: 'maj9', category: 'Extensões' },
  'maj9no5':     { intervals: [0, 4, 11, 14],    label: 'maj9(no5)', category: 'Extensões' },
  'm9':          { intervals: [0, 3, 7, 10, 14], label: 'm9',  category: 'Extensões' },
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

export interface TriadVoicing extends ChordVoicing {
  inversion: string; // 'Root', '1st Inv', '2nd Inv'
  stringSet: string; // e.g. '1-2-3', '2-3-4'
  cagedShape: string; // C, A, G, E, D
}

const TRIAD_TYPES = ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'];

/**
 * Generate all playable voicings for a given root + chord type.
 */
export function generateChordVoicings(root: string, chordType: string, maxResults = 30): ChordVoicing[] {
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

  const current: (number | null)[] = new Array(6).fill(null);
  
  function enumerate(stringIdx: number) {
    if (stringIdx === 6) {
      const voicing = validateAndScore(current, rootIdx, chordPitchClasses, typeDef.intervals.length, root, chordType, typeDef.label);
      if (voicing) voicings.push(voicing);
      return;
    }
    for (const opt of stringOptions[stringIdx]) {
      current[stringIdx] = opt;
      if (canStillComplete(current, stringIdx, stringOptions, chordPitchClasses, rootIdx)) {
        enumerate(stringIdx + 1);
      }
    }
    current[stringIdx] = null;
  }

  enumerate(0);

  // Deduplicate with similarity check (80%+ similar = keep only best)
  const deduped = deduplicateVoicings(voicings);

  // Sort by position (closest to nut first), then by score as tiebreaker
  deduped.sort((a, b) => a.startFret - b.startFret || a.score - b.score);

  return deduped.slice(0, maxResults);
}

/**
 * Generate CAGED triad inversions (only for triad chord types).
 */
export function generateTriadInversions(root: string, chordType: string): TriadVoicing[] {
  if (!TRIAD_TYPES.includes(chordType)) return [];
  
  const typeDef = CHORD_TYPES[chordType];
  if (!typeDef || typeDef.intervals.length !== 3) return [];

  const rootIdx = getNoteIndex(root);
  const intervals = typeDef.intervals;
  
  // String sets for triads (guitar string indices, 0=low E, 5=high E)
  const stringSets: { strings: [number, number, number]; label: string }[] = [
    { strings: [3, 4, 5], label: '1-2-3' },  // G, B, E (treble)
    { strings: [2, 3, 4], label: '2-3-4' },  // D, G, B
    { strings: [1, 2, 3], label: '3-4-5' },  // A, D, G
    { strings: [0, 1, 2], label: '4-5-6' },  // E, A, D (bass)
  ];

  // Three inversions based on which note is in the bass (lowest string)
  // Root position: Root is the lowest note (e.g. C E G from low to high)
  // 1st inversion: 3rd is the lowest note (e.g. E G C from low to high)  
  // 2nd inversion: 5th is the lowest note (e.g. G C E from low to high)
  const inversions = [
    { name: 'Fundamental', bassInterval: 0, order: [0, 1, 2] },  // R(bass) 3 5
    { name: '1ª Inversão', bassInterval: 1, order: [1, 2, 0] },   // 3(bass) 5 R
    { name: '2ª Inversão', bassInterval: 2, order: [2, 0, 1] },   // 5(bass) R 3
  ];

  const results: TriadVoicing[] = [];

  for (const ss of stringSets) {
    for (const inv of inversions) {
      // Assign each note of the inversion to the 3 strings (low to high)
      const targetNotes = inv.order.map(i => (rootIdx + intervals[i]) % 12);
      
      // Find fret positions for each string
      const fretOptions: number[][] = [];
      for (let i = 0; i < 3; i++) {
        const stringIdx = ss.strings[i];
        const openPitch = OPEN_STRINGS[stringIdx] % 12;
        const options: number[] = [];
        for (let f = 0; f <= 12; f++) {
          if ((openPitch + f) % 12 === targetNotes[i]) {
            options.push(f);
          }
        }
        fretOptions.push(options);
      }

      // Try all combinations
      for (const f0 of fretOptions[0]) {
        for (const f1 of fretOptions[1]) {
          for (const f2 of fretOptions[2]) {
            const fretted = [f0, f1, f2].filter(f => f > 0);
            if (fretted.length === 0) {
              // All open - valid
            } else {
              const minF = Math.min(...fretted);
              const maxF = Math.max(...fretted);
              if (maxF - minF > 4) continue; // Too wide
            }

            // Build full 6-string voicing (mute others)
            const fullFrets: (number | null)[] = [null, null, null, null, null, null];
            fullFrets[ss.strings[0]] = f0;
            fullFrets[ss.strings[1]] = f1;
            fullFrets[ss.strings[2]] = f2;

            const frettedAll = [f0, f1, f2].filter(f => f > 0);
            const minFret = frettedAll.length > 0 ? Math.min(...frettedAll) : 0;
            const maxFret = frettedAll.length > 0 ? Math.max(...frettedAll) : 0;
            const span = maxFret - minFret;

            const { fingers, barre, fingerCount } = assignFingers(fullFrets, frettedAll, minFret);
            if (fingerCount > 4 || !fingers) continue;

            const score =
              span * 10 +
              (minFret > 0 ? minFret * 2 : 0) +
              fingerCount * 3;

            const cagedShape = identifyCAGEDShape(fullFrets, ss.strings, rootIdx);

            results.push({
              root,
              typeName: chordType,
              typeLabel: typeDef.label,
              frets: fullFrets,
              fingers,
              barreInfo: barre,
              startFret: frettedAll.length > 0 ? minFret : 0,
              score,
              inversion: inv.name,
              stringSet: ss.label,
              cagedShape,
            });
          }
        }
      }
    }
  }

  // Deduplicate triads
  const seen = new Set<string>();
  const unique: TriadVoicing[] = [];
  for (const v of results) {
    const key = v.frets.map(f => f === null ? 'x' : String(f)).join('-');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(v);
    }
  }

  // Sort by: inversion order first, then by startFret (closer to nut = first)
  const invOrder = ['Fundamental', '1ª Inversão', '2ª Inversão'];
  unique.sort((a, b) => {
    const invA = invOrder.indexOf(a.inversion);
    const invB = invOrder.indexOf(b.inversion);
    if (invA !== invB) return invA - invB;
    return a.startFret - b.startFret;
  });
  return unique;
}

function identifyCAGEDShape(frets: (number | null)[], usedStrings: number[], rootIdx: number): string {
  // Determine CAGED shape based on string set and root position relative to open shapes
  const minString = Math.min(...usedStrings);
  const maxString = Math.max(...usedStrings);
  
  // Find the root note position
  let rootFret = -1;
  for (const s of usedStrings) {
    if (frets[s] !== null) {
      const pitch = (OPEN_STRINGS[s] + frets[s]!) % 12;
      if (pitch === rootIdx) {
        rootFret = frets[s]!;
        break;
      }
    }
  }

  // Simple heuristic based on string set and general shape
  if (maxString === 5 && minString >= 3) {
    // Treble strings - likely E or C shape
    return rootFret <= 3 ? 'C' : 'E';
  } else if (maxString === 4 && minString >= 2) {
    // Middle-high - likely A or D shape
    return rootFret <= 3 ? 'D' : 'A';
  } else if (maxString === 3 && minString >= 1) {
    // Middle - G or A shape
    return rootFret <= 3 ? 'G' : 'A';
  } else {
    // Bass strings - E shape
    return 'E';
  }
}

function canStillComplete(
  current: (number | null)[],
  filledUpTo: number,
  stringOptions: (number | null)[][],
  chordPitchClasses: Set<number>,
  rootIdx: number
): boolean {
  const fretted = current.slice(0, filledUpTo + 1).filter(f => f !== null && f > 0) as number[];
  if (fretted.length > 0) {
    const minF = Math.min(...fretted);
    const maxF = Math.max(...fretted);
    if (maxF - minF > 4) return false;
  }

  const covered = new Set<number>();
  for (let i = 0; i <= filledUpTo; i++) {
    if (current[i] !== null) {
      covered.add((OPEN_STRINGS[i] + current[i]!) % 12);
    }
  }
  const potentiallyCoverable = new Set(covered);
  for (let i = filledUpTo + 1; i < 6; i++) {
    for (const opt of stringOptions[i]) {
      if (opt !== null) {
        potentiallyCoverable.add((OPEN_STRINGS[i] + opt) % 12);
      }
    }
  }
  for (const pc of chordPitchClasses) {
    if (!potentiallyCoverable.has(pc)) return false;
  }

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

  const sounding = voicing.filter(f => f !== null);
  // Prefer fuller chords: at least 3 sounding strings for extended chords, 4 for standard, 2 for power
  const isExtended = requiredTones >= 5;
  const minSounding = requiredTones <= 2 ? 2 : isExtended ? 3 : Math.min(requiredTones + 1, 4);
  if (sounding.length < minSounding) return null;

  const presentPCs = new Set<number>();
  for (let s = 0; s < 6; s++) {
    if (voicing[s] !== null) {
      presentPCs.add((OPEN_STRINGS[s] + voicing[s]!) % 12);
    }
  }
  // For extended chords (5+ notes), allow omitting the 5th (interval 7)
  if (isExtended) {
    const rootPitch = rootIdx;
    const fifthPitch = (rootIdx + 7) % 12;
    for (const pc of chordPitchClasses) {
      if (pc === fifthPitch && !presentPCs.has(pc)) continue; // allow missing 5th
      if (!presentPCs.has(pc)) return null;
    }
  } else {
    for (const pc of chordPitchClasses) {
      if (!presentPCs.has(pc)) return null;
    }
  }

  if (!presentPCs.has(rootIdx)) return null;

  // Root should be in the bass (lowest sounding string) for common voicings — bonus if true
  let lowestSoundingString = -1;
  for (let s = 0; s < 6; s++) {
    if (voicing[s] !== null) { lowestSoundingString = s; break; }
  }
  const rootInBass = lowestSoundingString >= 0 && ((OPEN_STRINGS[lowestSoundingString] + voicing[lowestSoundingString]!) % 12) === rootIdx;

  // No muted strings between sounding strings
  let firstSounding = -1, lastSounding = -1;
  for (let s = 0; s < 6; s++) {
    if (voicing[s] !== null) {
      if (firstSounding === -1) firstSounding = s;
      lastSounding = s;
    }
  }
  for (let s = firstSounding; s <= lastSounding; s++) {
    if (voicing[s] === null) return null;
  }

  const fretted = sounding.filter(f => f! > 0) as number[];
  let minFret = 0, maxFret = 0, span = 0;
  if (fretted.length > 0) {
    minFret = Math.min(...fretted);
    maxFret = Math.max(...fretted);
    span = maxFret - minFret;
    if (span > 4) return null; // Allow up to 4-fret span (standard for tetrads/extensions)
  }

  const { fingers, barre, fingerCount } = assignFingers(voicing, fretted, minFret);
  if (fingerCount > 4) return null;
  if (!fingers) return null;

  const mutedCount = voicing.filter(f => f === null).length;
  const soundingCount = 6 - mutedCount;

  // Reject chords with too many muted strings
  const maxMuted = isExtended ? 3 : 2;
  if (mutedCount > maxMuted && requiredTones > 2) return null;

  // --- Improved scoring ---

  // Stretch: bigger span between fingers = harder
  const stretchPenalty = span <= 1 ? 0 : span === 2 ? 6 : span === 3 ? 16 : span === 4 ? 30 : 50;

  // Barre chords are harder
  const barreWidth = barre ? (barre.toString - barre.fromString + 1) : 0;
  const barrePenalty = barre ? 15 + barreWidth * 3 : 0;

  // Position on neck: open/low positions are easier
  const positionPenalty = minFret === 0 ? 0 : minFret <= 3 ? 3 : minFret <= 5 ? 6 : minFret <= 7 ? 10 : 16;

  // Muted strings
  const mutedPenalty = mutedCount * 8;

  // Fuller chords are nicer
  const fullnessBonus = soundingCount >= 5 ? -8 : soundingCount >= 4 ? -4 : 0;

  // Root in bass sounds better and is more standard
  const rootBassBonus = rootInBass ? -12 : 8;

  // Number of fingers: 4 fingers is harder than 2-3
  const fingerPenalty = fingerCount <= 2 ? 0 : fingerCount === 3 ? 5 : 15;

  // Finger distance: measure how far apart fingers are on the fretboard
  let fingerDistancePenalty = 0;
  const fingerPositions: { s: number; f: number }[] = [];
  for (let s = 0; s < 6; s++) {
    if (voicing[s] !== null && voicing[s]! > 0) {
      fingerPositions.push({ s, f: voicing[s]! });
    }
  }
  // Pairwise distance between pressed frets (closer = easier)
  for (let i = 0; i < fingerPositions.length - 1; i++) {
    const a = fingerPositions[i];
    const b = fingerPositions[i + 1];
    const stringDist = Math.abs(b.s - a.s);
    const fretDist = Math.abs(b.f - a.f);
    // Adjacent strings with same or neighboring fret = easy
    if (stringDist === 1 && fretDist <= 1) {
      fingerDistancePenalty += 0;
    } else if (fretDist >= 3) {
      fingerDistancePenalty += 12;
    } else if (fretDist === 2) {
      fingerDistancePenalty += 5;
    }
  }

  // Awkward cross-overs (lower string has higher fret than upper string by a lot)
  let awkwardPenalty = 0;
  for (let i = 0; i < fingerPositions.length - 1; i++) {
    for (let j = i + 1; j < fingerPositions.length; j++) {
      if (fingerPositions[i].s < fingerPositions[j].s && fingerPositions[i].f > fingerPositions[j].f + 2) {
        awkwardPenalty += 12;
      }
    }
  }

  // Open string bonus: open strings make chords easier
  const openStringCount = sounding.filter(f => f === 0).length;
  const openBonus = openStringCount >= 2 ? -8 : openStringCount === 1 ? -4 : 0;

  const score =
    stretchPenalty +
    mutedPenalty +
    fullnessBonus +
    positionPenalty +
    fingerPenalty +
    barrePenalty +
    fingerDistancePenalty +
    awkwardPenalty +
    rootBassBonus +
    openBonus;

  // Filter out uncomfortable voicings
  if (score > 110) return null;

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
    return { fingers, barre: null, fingerCount: 0 };
  }

  const onMinFret: number[] = [];
  for (let s = 0; s < 6; s++) {
    if (voicing[s] === minFret && minFret > 0) {
      onMinFret.push(s);
    }
  }

  let barre: ChordVoicing['barreInfo'] = null;
  let fingerIdx = 1;

  if (onMinFret.length >= 2 && minFret > 0) {
    const fromS = Math.min(...onMinFret);
    const toS = Math.max(...onMinFret);
    barre = { fret: minFret, fromString: fromS, toString: toS };
    for (let s = fromS; s <= toS; s++) {
      if (voicing[s] !== null && voicing[s]! <= minFret) {
        fingers[s] = 1;
      }
    }
    fingerIdx = 2;
  }

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

/**
 * Similarity-based deduplication.
 * Two voicings are "similar" if >=80% of their fret positions match.
 * Keep the one with the lower score.
 */
function deduplicateVoicings(voicings: ChordVoicing[]): ChordVoicing[] {
  // First: exact dedup
  const exactSeen = new Set<string>();
  const exactDeduped: ChordVoicing[] = [];
  for (const v of voicings) {
    const key = v.frets.map(f => f === null ? 'x' : String(f)).join('-');
    if (!exactSeen.has(key)) {
      exactSeen.add(key);
      exactDeduped.push(v);
    }
  }

  // Sort by score so we keep the better (easier) voicing when similar
  exactDeduped.sort((a, b) => a.score - b.score);

  // Similarity-based dedup
  const result: ChordVoicing[] = [];
  
  for (const v of exactDeduped) {
    let isTooSimilar = false;
    for (const kept of result) {
      if (areSimilar(v.frets, kept.frets, 0.7)) {
        isTooSimilar = true;
        break;
      }
    }
    if (!isTooSimilar) {
      result.push(v);
    }
  }

  return result;
}

/**
 * Check if two voicings are similar above a threshold.
 * Compares string-by-string: matching frets or both muted = match.
 */
function areSimilar(a: (number | null)[], b: (number | null)[], threshold: number): boolean {
  let matches = 0;
  for (let i = 0; i < 6; i++) {
    if (a[i] === b[i]) {
      matches++;
    } else if (a[i] !== null && b[i] !== null && Math.abs(a[i]! - b[i]!) <= 0) {
      // Same fret = match (already covered above)
    } else if (
      // One is open/low and other is muted or vice versa - minor difference
      (a[i] === null && b[i] === 0) || (a[i] === 0 && b[i] === null)
    ) {
      matches += 0.8; // Partial match — muted vs open is a small difference
    }
  }
  return (matches / 6) >= threshold;
}

export function getChordTypeCategories(): { category: string; types: { key: string; label: string }[] }[] {
  const ORDER = ['Básicos', 'Power Chord', 'Com Sétima', 'Extensões'];
  const HIDDEN_TYPES = new Set(['maj9no5']); // variants shown automatically
  const catMap = new Map<string, { key: string; label: string }[]>();
  for (const [key, val] of Object.entries(CHORD_TYPES)) {
    if (HIDDEN_TYPES.has(key)) continue;
    if (!catMap.has(val.category)) catMap.set(val.category, []);
    catMap.get(val.category)!.push({ key, label: val.label || key });
  }
  return ORDER.filter(c => catMap.has(c)).map(c => ({ category: c, types: catMap.get(c)! }));
}

export function getChordDisplayName(root: string, typeLabel: string): string {
  return `${root}${typeLabel}`;
}
