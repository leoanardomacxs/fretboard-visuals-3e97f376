import React, { useState, useMemo, useCallback } from 'react';
import {
  ALL_ROOTS,
  getHarmonicFieldForScale,
  type ChordInfo,
  getNoteIndex,
  getNoteName,
  useFlats,
  spellChordNotes,
  spellScale,
} from '@/lib/musicTheory';
import { generateChordVoicings } from '@/lib/chordGenerator';
import ChordDiagram from './ChordDiagram';
import { playChordFromFrets, playClick, noteNameToMidi, playChord } from '@/lib/audioEngine';

interface HarmonicFieldViewProps {
  root: string;
  setRoot: (r: string) => void;
}

const FIELD_SCALES = [
  { value: 'Maior', label: 'Maior' },
  { value: 'Menor Natural', label: 'Menor Natural' },
  { value: 'Menor Harmônica', label: 'Menor Harmônica' },
  { value: 'Menor Melódica', label: 'Menor Melódica' },
] as const;

const ROMAN_MAJOR = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const ROMAN_MINOR = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

const DEGREE_COLORS: Record<number, string> = {
  1: 'border-blue-500/50 bg-blue-500/10',
  2: 'border-yellow-500/50 bg-yellow-500/10',
  3: 'border-blue-500/50 bg-blue-500/10',
  4: 'border-yellow-500/50 bg-yellow-500/10',
  5: 'border-red-500/50 bg-red-500/10',
  6: 'border-blue-500/50 bg-blue-500/10',
  7: 'border-red-500/50 bg-red-500/10',
};

const FUNCTION_LABELS: Record<string, string> = {
  'Major': 'Tônica',
  'minor': 'Subdominante',
  'diminished': 'Dominante',
  'augmented': 'Tônica',
};

function getFunctionForDegree(degree: number, scaleType: string): string {
  if (scaleType === 'Maior') {
    if (degree === 1 || degree === 3 || degree === 6) return 'Tônica';
    if (degree === 2 || degree === 4) return 'Subdominante';
    if (degree === 5 || degree === 7) return 'Dominante';
  }
  if (scaleType === 'Menor Natural') {
    if (degree === 1 || degree === 3 || degree === 6) return 'Tônica';
    if (degree === 2 || degree === 4) return 'Subdominante';
    if (degree === 5 || degree === 7) return 'Dominante';
  }
  return '';
}

/** Build tetrad harmonic field (with 7ths) */
function getTetradField(root: string, scaleType: string): Array<ChordInfo & { seventhNote: string; tetradQuality: string }> {
  const scaleNotes = spellScale(root, scaleType);
  if (scaleNotes.length < 7) return [];

  return scaleNotes.map((note, i) => {
    const third = scaleNotes[(i + 2) % 7];
    const fifth = scaleNotes[(i + 4) % 7];
    const seventh = scaleNotes[(i + 6) % 7];

    const noteSemi = getNoteIndex(note);
    const thirdSemi = getNoteIndex(third);
    const fifthSemi = getNoteIndex(fifth);
    const seventhSemi = getNoteIndex(seventh);

    const thirdInterval = ((thirdSemi - noteSemi) % 12 + 12) % 12;
    const fifthInterval = ((fifthSemi - noteSemi) % 12 + 12) % 12;
    const seventhInterval = ((seventhSemi - noteSemi) % 12 + 12) % 12;

    let quality: string;
    let suffix: string;
    let tetradQuality: string;

    if (thirdInterval === 4 && fifthInterval === 7 && seventhInterval === 11) {
      quality = 'Major'; suffix = 'maj7'; tetradQuality = 'maj7';
    } else if (thirdInterval === 3 && fifthInterval === 7 && seventhInterval === 10) {
      quality = 'minor'; suffix = 'm7'; tetradQuality = 'm7';
    } else if (thirdInterval === 4 && fifthInterval === 7 && seventhInterval === 10) {
      quality = 'Major'; suffix = '7'; tetradQuality = '7';
    } else if (thirdInterval === 3 && fifthInterval === 6 && seventhInterval === 10) {
      quality = 'diminished'; suffix = 'ø7'; tetradQuality = 'half-dim7';
    } else if (thirdInterval === 3 && fifthInterval === 6 && seventhInterval === 9) {
      quality = 'diminished'; suffix = '°7'; tetradQuality = 'dim7';
    } else if (thirdInterval === 4 && fifthInterval === 8 && seventhInterval === 11) {
      quality = 'augmented'; suffix = 'maj7(#5)'; tetradQuality = 'aug-maj7';
    } else if (thirdInterval === 4 && fifthInterval === 8 && seventhInterval === 10) {
      quality = 'augmented'; suffix = '7(#5)'; tetradQuality = 'aug7';
    } else if (thirdInterval === 3 && fifthInterval === 7 && seventhInterval === 11) {
      quality = 'minor'; suffix = 'm(maj7)'; tetradQuality = 'min-maj7';
    } else {
      quality = 'Major'; suffix = '7'; tetradQuality = '7';
    }

    const romanBase = quality === 'minor' || quality === 'diminished'
      ? ROMAN_MINOR[i] : ROMAN_MAJOR[i];
    const romanSuffix = tetradQuality === 'maj7' ? 'maj7' :
      tetradQuality === 'm7' ? '7' :
      tetradQuality === '7' ? '7' :
      tetradQuality === 'half-dim7' ? 'ø7' :
      tetradQuality === 'dim7' ? '°7' : suffix;

    return {
      name: `${note}${suffix}`,
      root: note,
      quality,
      notes: [note, third, fifth, seventh],
      degree: i + 1,
      romanNumeral: `${romanBase}${romanSuffix !== suffix ? '' : ''}`,
      seventhNote: seventh,
      tetradQuality,
    };
  });
}

/** Get secondary dominant for a degree */
function getSecondaryDominant(targetRoot: string): { name: string; root: string; notes: string[]; chordType: string } {
  const targetSemi = getNoteIndex(targetRoot);
  // V7 of the target: root is a 5th above = 7 semitones
  const domSemi = (targetSemi + 7) % 12;
  const flats = useFlats(targetRoot);
  const domRoot = getNoteName(domSemi, flats);
  const notes = spellChordNotes(domRoot, [0, 4, 7, 10]);
  return {
    name: `${domRoot}7`,
    root: domRoot,
    notes,
    chordType: '7',
  };
}

/** Get ii-V-I for a target degree */
function getIIVI(targetRoot: string): Array<{ name: string; root: string; notes: string[]; chordType: string; label: string }> {
  const targetSemi = getNoteIndex(targetRoot);
  const flats = useFlats(targetRoot);
  
  // ii of the target key = 2 semitones above root
  const iiSemi = (targetSemi + 2) % 12;
  const iiRoot = getNoteName(iiSemi, flats);
  const iiNotes = spellChordNotes(iiRoot, [0, 3, 7, 10]);
  
  // V of the target key = 7 semitones above root
  const vSemi = (targetSemi + 7) % 12;
  const vRoot = getNoteName(vSemi, flats);
  const vNotes = spellChordNotes(vRoot, [0, 4, 7, 10]);
  
  // I of the target
  const iNotes = spellChordNotes(targetRoot, [0, 4, 7, 11]);
  
  return [
    { name: `${iiRoot}m7`, root: iiRoot, notes: iiNotes, chordType: 'min7', label: 'ii' },
    { name: `${vRoot}7`, root: vRoot, notes: vNotes, chordType: '7', label: 'V' },
    { name: `${targetRoot}maj7`, root: targetRoot, notes: iNotes, chordType: 'maj7', label: 'I' },
  ];
}

const HarmonicFieldView: React.FC<HarmonicFieldViewProps> = ({ root, setRoot }) => {
  const [scaleType, setScaleType] = useState('Maior');
  const [viewTab, setViewTab] = useState<'triads' | 'tetrads' | 'secondary' | 'ii-v-i'>('triads');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const triadField = useMemo(() => getHarmonicFieldForScale(root, scaleType), [root, scaleType]);
  const tetradField = useMemo(() => getTetradField(root, scaleType), [root, scaleType]);

  const getVoicing = useCallback((chordRoot: string, chordType: string) => {
    const voicings = generateChordVoicings(chordRoot, chordType, 1);
    return voicings[0] || null;
  }, []);

  const qualityToType = (quality: string): string => {
    const map: Record<string, string> = {
      'Major': 'major', 'minor': 'minor', 'diminished': 'dim', 'augmented': 'aug',
    };
    return map[quality] || 'major';
  };

  /** Play a single chord with a specific bass MIDI as reference for voicing */
  const playChordWithBass = useCallback((notes: string[], bassMidi: number) => {
    // Place all chord notes starting from bassMidi upward
    const rootMidi = bassMidi;
    const voiced: number[] = [rootMidi];
    for (let j = 1; j < notes.length; j++) {
      let noteMidi = noteNameToMidi(notes[j], 0); // get raw semitone class
      const semi = noteMidi % 12;
      // Place this note just above the root
      noteMidi = rootMidi - (rootMidi % 12) + semi;
      while (noteMidi <= rootMidi) noteMidi += 12;
      voiced.push(noteMidi);
    }
    const uniqueNotes = [...new Set(voiced)].sort((a, b) => a - b);
    playChord(uniqueNotes, 1.0);
  }, []);

  /** Play a chord for individual clicks (non-sequential) */
  const playChordNotes = useCallback((notes: string[], _keyRoot?: string, chordRoot?: string) => {
    const bassMidi = noteNameToMidi(notes[0], 3);
    playChordWithBass(notes, bassMidi);
  }, [playChordWithBass]);

  /** Play all chords sequentially with ascending pitch — each chord root is placed
   *  just above the previous chord's root, creating a natural ascending harmonic field */
  const playAllChords = useCallback(async (chords: Array<{ notes: string[]; root: string }>) => {
    if (isPlaying) return;
    setIsPlaying(true);

    // Start the first chord root at octave 3
    let currentBassMidi = noteNameToMidi(chords[0].root, 3);

    for (let i = 0; i < chords.length; i++) {
      setActiveIdx(i);

      if (i > 0) {
        // Place this chord's root just above the previous chord's root
        const semi = noteNameToMidi(chords[i].root, 0) % 12;
        let nextRoot = currentBassMidi - (currentBassMidi % 12) + semi;
        while (nextRoot <= currentBassMidi) nextRoot += 12;
        currentBassMidi = nextRoot;
      }

      playChordWithBass(chords[i].notes, currentBassMidi);
      await new Promise(r => setTimeout(r, 1200));
    }

    setIsPlaying(false);
    setActiveIdx(null);
  }, [isPlaying, playChordWithBass]);

  const renderChordCard = (
    chord: { name: string; root: string; notes: string[]; quality?: string },
    chordType: string,
    idx: number,
    degree?: number,
    romanNumeral?: string,
    extra?: React.ReactNode,
  ) => {
    const voicing = getVoicing(chord.root, chordType);
    const degreeColor = degree ? DEGREE_COLORS[degree] || '' : 'border-border bg-card';
    const isActive = activeIdx === idx;

    return (
      <div
        key={`${chord.name}-${idx}`}
        className={`border rounded-lg p-3 flex flex-col items-center transition-all duration-300 cursor-pointer hover:shadow-md note-appear ${degreeColor} ${isActive ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}
        style={{ animationDelay: `${idx * 40}ms` }}
        onClick={() => {
          if (voicing) playChordFromFrets(voicing.frets);
          else playChordNotes(chord.notes);
        }}
      >
        {romanNumeral && (
          <span className="text-[10px] font-mono text-muted-foreground mb-0.5">{romanNumeral}</span>
        )}
        <span className="text-sm font-bold text-foreground mb-1">{chord.name}</span>
        <span className="text-[9px] text-muted-foreground mb-2">{chord.notes.join(' · ')}</span>
        {voicing && <ChordDiagram voicing={voicing} width={130} />}
        {extra}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Campo Harmônico</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Campo harmônico completo de <span className="font-semibold text-foreground">{root} {scaleType}</span>
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1 italic">
          Explore tríades, tétrades, dominantes secundários e resoluções ii-V-I para cada grau.
        </p>
      </div>

      {/* Key + Scale selectors */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-1">
          {ALL_ROOTS.map(n => (
            <button
              key={n}
              onClick={() => { setRoot(n); playClick(600); }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                root === n ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FIELD_SCALES.map(fs => (
          <button
            key={fs.value}
            onClick={() => { setScaleType(fs.value); playClick(550); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              scaleType === fs.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {fs.label}
          </button>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {[
          { key: 'triads' as const, label: 'Tríades' },
          { key: 'tetrads' as const, label: 'Tétrades (7ª)' },
          { key: 'secondary' as const, label: 'Dom. Secundários' },
          { key: 'ii-v-i' as const, label: 'ii-V-I' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setViewTab(tab.key); playClick(650); }}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
              viewTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Play all button */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (viewTab === 'triads') playAllChords(triadField);
            else if (viewTab === 'tetrads') playAllChords(tetradField);
          }}
          disabled={isPlaying || viewTab === 'secondary' || viewTab === 'ii-v-i'}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            isPlaying
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-accent text-accent-foreground hover:shadow-md hover:scale-[1.02] active:scale-95'
          }`}
        >
          {isPlaying ? 'Tocando...' : '▶ Tocar Campo Completo'}
        </button>
      </div>

      {/* === TRIADS === */}
      {viewTab === 'triads' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3">
              Campo Harmônico em Tríades — {root} {scaleType}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {triadField.map((ch, i) =>
                renderChordCard(ch, qualityToType(ch.quality), i, ch.degree, ch.romanNumeral,
                  <span className="text-[8px] mt-1 px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {getFunctionForDegree(ch.degree, scaleType) || ch.quality}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Scale degrees summary */}
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Funções Harmônicas</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <span className="font-bold text-foreground">Tônica</span>
                <p className="text-muted-foreground mt-0.5">Repouso, estabilidade</p>
                <p className="font-mono text-foreground mt-1">
                  {triadField.filter((_, i) => [0, 2, 5].includes(i)).map(c => c.romanNumeral).join(', ')}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="font-bold text-foreground">Subdominante</span>
                <p className="text-muted-foreground mt-0.5">Preparação, movimento</p>
                <p className="font-mono text-foreground mt-1">
                  {triadField.filter((_, i) => [1, 3].includes(i)).map(c => c.romanNumeral).join(', ')}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                <span className="font-bold text-foreground">Dominante</span>
                <p className="text-muted-foreground mt-0.5">Tensão, resolução</p>
                <p className="font-mono text-foreground mt-1">
                  {triadField.filter((_, i) => [4, 6].includes(i)).map(c => c.romanNumeral).join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TETRADS === */}
      {viewTab === 'tetrads' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3">
              Campo Harmônico em Tétrades (com 7ª) — {root} {scaleType}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {tetradField.map((ch, i) => {
                const typeMap: Record<string, string> = {
                  'maj7': 'maj7', 'm7': 'min7', '7': '7', 'half-dim7': 'half-dim7',
                  'dim7': 'dim7', 'aug-maj7': 'maj7', 'aug7': 'aug7', 'min-maj7': 'min-maj7',
                };
                const chordType = typeMap[ch.tetradQuality] || 'maj7';
                return renderChordCard(ch, chordType, i, ch.degree, ch.romanNumeral,
                  <div className="flex flex-col items-center mt-1 gap-0.5">
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {ch.tetradQuality}
                    </span>
                    <span className="text-[8px] text-muted-foreground">
                      7ª: {ch.seventhNote}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison table */}
          <div className="bg-card border border-border rounded-lg p-4 overflow-x-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3">Comparação Tríade × Tétrade</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Grau</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Tríade</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Tétrade</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Notas</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Função</th>
                </tr>
              </thead>
              <tbody>
                {triadField.map((triad, i) => {
                  const tetrad = tetradField[i];
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-2 px-2 font-mono font-bold text-foreground">{triad.romanNumeral}</td>
                      <td className="py-2 px-2 font-semibold text-foreground">{triad.name}</td>
                      <td className="py-2 px-2 font-semibold text-foreground">{tetrad?.name || '—'}</td>
                      <td className="py-2 px-2 text-muted-foreground font-mono">{tetrad?.notes.join(' ') || '—'}</td>
                      <td className="py-2 px-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {getFunctionForDegree(i + 1, scaleType)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === SECONDARY DOMINANTS === */}
      {viewTab === 'secondary' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
              Dominantes Secundários — {root} {scaleType}
            </p>
            <p className="text-[9px] text-muted-foreground/60 italic mb-4">
              O dominante secundário (V7) é o acorde dominante que resolve em cada grau do campo harmônico. Usado para criar tensão antes de resolver em qualquer grau.
            </p>
            <div className="space-y-3">
              {triadField.map((ch, i) => {
                const secDom = getSecondaryDominant(ch.root);
                const voicing = getVoicing(secDom.root, '7');
                return (
                  <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border ${DEGREE_COLORS[i + 1]}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-foreground">V7/{ch.romanNumeral}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-sm font-semibold text-foreground">{secDom.name}</span>
                        <span className="text-xs text-muted-foreground">resolve em</span>
                        <span className="text-sm font-bold text-primary">{ch.name}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        Notas: {secDom.notes.join(' · ')} → {ch.notes.join(' · ')}
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {voicing && (
                        <div
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => playChordFromFrets(voicing.frets)}
                        >
                          <ChordDiagram voicing={voicing} width={100} />
                        </div>
                      )}
                      {(() => {
                        const targetVoicing = getVoicing(ch.root, qualityToType(ch.quality));
                        return targetVoicing ? (
                          <div
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => playChordFromFrets(targetVoicing.frets)}
                          >
                            <ChordDiagram voicing={targetVoicing} width={100} />
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === ii-V-I === */}
      {viewTab === 'ii-v-i' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
              ii-V-I para cada Grau — {root} {scaleType}
            </p>
            <p className="text-[9px] text-muted-foreground/60 italic mb-4">
              A progressão ii-V-I é a cadência mais importante do jazz e da música popular. Aqui você vê a resolução ii-V-I para cada grau do campo harmônico como se ele fosse o "I" temporário.
            </p>
            <div className="space-y-6">
              {triadField.map((ch, i) => {
                const iiVI = getIIVI(ch.root);
                return (
                  <div key={i} className={`p-4 rounded-lg border ${DEGREE_COLORS[i + 1]}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-bold text-foreground">ii-V-I → {ch.romanNumeral} ({ch.name})</span>
                      <button
                        onClick={async () => {
                          let curBase = noteNameToMidi(iiVI[0].root, 3);
                          for (let ci = 0; ci < iiVI.length; ci++) {
                            if (ci > 0) {
                              const s = noteNameToMidi(iiVI[ci].root, 0) % 12;
                              let nx = curBase - (curBase % 12) + s;
                              while (nx <= curBase) nx += 12;
                              curBase = nx;
                            }
                            playChordWithBass(iiVI[ci].notes, curBase);
                            await new Promise(r => setTimeout(r, 1200));
                          }
                        }}
                        className="ml-auto px-3 py-1 rounded-md text-[10px] font-semibold bg-accent text-accent-foreground hover:shadow-sm transition-all"
                      >
                        ▶ Tocar
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {iiVI.map((chord, j) => {
                        const voicing = getVoicing(chord.root, chord.chordType);
                        return (
                          <div
                            key={j}
                            className="flex flex-col items-center p-2 rounded-lg bg-background/50 cursor-pointer hover:shadow-md transition-all"
                            onClick={() => {
                              if (voicing) playChordFromFrets(voicing.frets);
                              else playChordNotes(chord.notes);
                            }}
                          >
                            <span className="text-[10px] font-mono text-muted-foreground">{chord.label}</span>
                            <span className="text-sm font-bold text-foreground">{chord.name}</span>
                            <span className="text-[9px] text-muted-foreground mb-2">{chord.notes.join(' · ')}</span>
                            {voicing && <ChordDiagram voicing={voicing} width={110} />}
                            {j < 2 && (
                              <span className="text-muted-foreground text-lg mt-1">→</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HarmonicFieldView;
