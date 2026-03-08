import React, { useState, useMemo, useCallback } from 'react';
import { getHarmonicField, ALL_ROOTS, type ChordInfo, DEGREE_LABELS, getScale, getNoteIndex, getNoteName, useFlats } from '@/lib/musicTheory';
import { generateChordVoicings } from '@/lib/chordGenerator';
import ChordDiagram from './ChordDiagram';
import { playChordFromFrets, playClick, noteNameToMidi, playChord } from '@/lib/audioEngine';

interface ProgressionGeneratorViewProps {
  root: string;
  setRoot: (r: string) => void;
}

// Common progressions as degree arrays (1-indexed)
const PRESET_PROGRESSIONS: { name: string; degrees: number[]; description: string }[] = [
  { name: 'I – V – vi – IV', degrees: [1, 5, 6, 4], description: 'Pop / Rock clássico' },
  { name: 'I – IV – V – I', degrees: [1, 4, 5, 1], description: 'Blues / Country básico' },
  { name: 'ii – V – I', degrees: [2, 5, 1], description: 'Jazz essencial' },
  { name: 'I – vi – IV – V', degrees: [1, 6, 4, 5], description: 'Anos 50 / Doo-wop' },
  { name: 'vi – IV – I – V', degrees: [6, 4, 1, 5], description: 'Pop moderno' },
  { name: 'I – V – vi – iii – IV', degrees: [1, 5, 6, 3, 4], description: 'Canon de Pachelbel' },
  { name: 'I – IV – vi – V', degrees: [1, 4, 6, 5], description: 'Pop alternativo' },
  { name: 'I – iii – IV – V', degrees: [1, 3, 4, 5], description: 'Rock / Pop suave' },
  { name: 'I – bVII – IV – I', degrees: [1, 7, 4, 1], description: 'Rock modal' },
  { name: 'ii – V – I – vi', degrees: [2, 5, 1, 6], description: 'Jazz turnaround' },
  { name: 'I – V – IV – V', degrees: [1, 5, 4, 5], description: 'Rock básico' },
  { name: 'vi – ii – V – I', degrees: [6, 2, 5, 1], description: 'Jazz circle' },
  { name: 'I – ii – iii – IV', degrees: [1, 2, 3, 4], description: 'Ascendente diatônico' },
  { name: 'IV – V – iii – vi', degrees: [4, 5, 3, 6], description: 'J-Pop / K-Pop' },
  { name: 'I – IV – I – V', degrees: [1, 4, 1, 5], description: '12-bar Blues (simplificado)' },
];

function generateRandomProgression(harmonicField: ChordInfo[], length = 4): { degrees: number[]; chords: ChordInfo[] } {
  const weights: Record<number, number[]> = {
    1: [4, 5, 6, 2, 3],
    2: [5, 1, 7],
    3: [6, 4, 2],
    4: [5, 1, 2, 7],
    5: [1, 6, 4],
    6: [4, 2, 5, 3],
    7: [1, 3, 6],
  };

  const degrees: number[] = [];
  // Start on I, IV, or vi
  const starts = [1, 1, 1, 4, 6];
  let current = starts[Math.floor(Math.random() * starts.length)];
  degrees.push(current);

  for (let i = 1; i < length; i++) {
    const options = weights[current] || [1, 4, 5];
    current = options[Math.floor(Math.random() * options.length)];
    degrees.push(current);
  }

  const chords = degrees.map(d => harmonicField[d - 1]);
  return { degrees, chords };
}

const ProgressionGeneratorView: React.FC<ProgressionGeneratorViewProps> = ({ root, setRoot }) => {
  const harmonicField = useMemo(() => getHarmonicField(root), [root]);
  const [currentProgression, setCurrentProgression] = useState<{ degrees: number[]; chords: ChordInfo[] } | null>(null);
  const [progressionLength, setProgressionLength] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChordIdx, setActiveChordIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ degrees: number[]; chords: ChordInfo[] }>>([]);
  // all12 mode: generate in random key
  const [displayMode, setDisplayMode] = useState<'full' | 'degrees' | 'hidden'>('full');
  const [allKeys, setAllKeys] = useState(false);

  const generateNew = useCallback(() => {
    let targetRoot = root;
    if (allKeys) {
      targetRoot = ALL_ROOTS[Math.floor(Math.random() * ALL_ROOTS.length)];
      setRoot(targetRoot);
    }
    const field = allKeys ? getHarmonicField(targetRoot) : harmonicField;
    const prog = generateRandomProgression(field, progressionLength);
    setCurrentProgression(prog);
    setHistory(prev => [prog, ...prev].slice(0, 10));
    setActiveChordIdx(null);
    playClick(600);
  }, [harmonicField, progressionLength, allKeys, root, setRoot]);

  const selectPreset = useCallback((degrees: number[]) => {
    const chords = degrees.map(d => harmonicField[d - 1]);
    const prog = { degrees, chords };
    setCurrentProgression(prog);
    setHistory(prev => [prog, ...prev].slice(0, 10));
    setActiveChordIdx(null);
    playClick(500);
  }, [harmonicField]);

  const playProgression = useCallback(async () => {
    if (!currentProgression || isPlaying) return;
    setIsPlaying(true);

    for (let i = 0; i < currentProgression.chords.length; i++) {
      const chord = currentProgression.chords[i];
      setActiveChordIdx(i);

      // Get a voicing and play it
      const qualityMap: Record<string, string> = {
        'Major': 'major', 'minor': 'minor', 'diminished': 'dim',
      };
      const typeKey = qualityMap[chord.quality] || 'major';
      const voicings = generateChordVoicings(chord.root, typeKey, 1);
      if (voicings.length > 0) {
        playChordFromFrets(voicings[0].frets);
      } else {
        // fallback: play triad notes
        const midiNotes = chord.notes.map(n => noteNameToMidi(n, 3));
        playChord(midiNotes, 1.0);
      }

      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    setIsPlaying(false);
    setActiveChordIdx(null);
  }, [currentProgression, isPlaying]);

  // Get best voicing for display
  const getVoicing = useCallback((chord: ChordInfo) => {
    const qualityMap: Record<string, string> = {
      'Major': 'major', 'minor': 'minor', 'diminished': 'dim',
    };
    const typeKey = qualityMap[chord.quality] || 'major';
    const voicings = generateChordVoicings(chord.root, typeKey, 1);
    return voicings[0] || null;
  }, []);

  const degreeColors: Record<number, string> = {
    1: 'border-blue-500/50 bg-blue-500/10',
    2: 'border-emerald-500/50 bg-emerald-500/10',
    3: 'border-teal-500/50 bg-teal-500/10',
    4: 'border-amber-500/50 bg-amber-500/10',
    5: 'border-orange-500/50 bg-orange-500/10',
    6: 'border-purple-500/50 bg-purple-500/10',
    7: 'border-red-500/50 bg-red-500/10',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Gerador de Progressões</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gere progressões harmônicas baseadas no campo de <span className="font-semibold text-foreground">{root} Maior</span>
        </p>
      </div>

      {/* Harmonic field overview */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">Campo Harmônico de {root}</p>
        <div className="flex flex-wrap gap-2">
          {harmonicField.map((ch, i) => (
            <div
              key={ch.name}
              className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all ${degreeColors[i + 1]}`}
            >
              <span className="text-[10px] text-muted-foreground font-mono">{ch.romanNumeral}</span>
              <span className="text-sm font-bold text-foreground">{ch.name}</span>
              <span className="text-[9px] text-muted-foreground">{ch.notes.join(' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Key scope toggle */}
        <button
          onClick={() => { setAllKeys(!allKeys); playClick(550); }}
          className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all border ${
            allKeys
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-secondary text-foreground'
          }`}
        >
          {allKeys ? '🌍 Todos os Tons' : `🎵 Tom de ${root}`}
        </button>

        <button
          onClick={generateNew}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95"
        >
          🎲 Gerar Aleatória
        </button>

        {/* Ear training display toggle */}
        <button
          onClick={() => {
            playClick(600);
            setDisplayMode(prev => prev === 'full' ? 'degrees' : prev === 'degrees' ? 'hidden' : 'full');
          }}
          className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all border ${
            displayMode === 'full'
              ? 'border-border bg-secondary text-foreground'
              : displayMode === 'degrees'
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
              : 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400'
          }`}
        >
          {displayMode === 'full' ? '👁️ Tudo Visível' : displayMode === 'degrees' ? '🎯 Só Graus' : '👂 Oculto (Treino)'}
        </button>

        {currentProgression && (
          <button
            onClick={playProgression}
            disabled={isPlaying}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              isPlaying
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-accent text-accent-foreground hover:shadow-md hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isPlaying ? '🔊 Tocando...' : '▶️ Tocar Progressão'}
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">Acordes:</span>
          {[3, 4, 5, 6, 8].map(len => (
            <button
              key={len}
              onClick={() => { setProgressionLength(len); playClick(650); }}
              className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${
                progressionLength === len
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {len}
            </button>
          ))}
        </div>
      </div>

      {/* Current progression display */}
      {currentProgression && (
        <div className="space-y-4 note-appear">
          {/* Progression title */}
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground">
              {displayMode === 'hidden'
                ? currentProgression.degrees.map(() => '?').join(' → ')
                : currentProgression.degrees.map(d => harmonicField[d - 1].romanNumeral).join(' → ')}
            </h3>
          </div>

          {/* Chord names row */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentProgression.chords.map((ch, i) => (
              <React.Fragment key={i}>
                <span className={`text-lg font-bold transition-all duration-300 ${
                  activeChordIdx === i ? 'text-primary scale-125' : 'text-foreground'
                }`}>
                  {displayMode === 'full' ? ch.name : displayMode === 'degrees' ? harmonicField[currentProgression.degrees[i] - 1].romanNumeral : '?'}
                </span>
                {i < currentProgression.chords.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Ear training hint */}
          {displayMode !== 'full' && (
            <p className="text-xs text-muted-foreground italic">
              🎧 {displayMode === 'degrees' ? 'Nomes dos acordes ocultos — ouça e tente identificar!' : 'Tudo oculto — treine seu ouvido!'}
            </p>
          )}

          {/* Chord diagrams */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {currentProgression.chords.map((ch, i) => {
              const voicing = getVoicing(ch);
              const degree = currentProgression.degrees[i];
              return (
                <div
                  key={i}
                  className={`border rounded-lg p-3 flex flex-col items-center transition-all duration-300 cursor-pointer hover:shadow-md ${
                    degreeColors[degree]
                  } ${activeChordIdx === i ? 'ring-2 ring-primary shadow-lg scale-105' : ''}`}
                  onClick={() => {
                    if (voicing) playChordFromFrets(voicing.frets);
                  }}
                >
                  {/* Labels based on display mode */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {displayMode === 'full' && (
                      <>
                        <span className="text-[10px] font-mono text-muted-foreground">{ch.romanNumeral}</span>
                        <span className="text-xs font-bold text-foreground">{ch.name}</span>
                      </>
                    )}
                    {displayMode === 'degrees' && (
                      <span className="text-xs font-bold text-foreground">{ch.romanNumeral}</span>
                    )}
                    {displayMode === 'hidden' && (
                      <span className="text-xs font-bold text-muted-foreground">?</span>
                    )}
                  </div>

                  {/* Diagram: show in full, blur in degrees, hide in hidden */}
                  {voicing && displayMode === 'full' && <ChordDiagram voicing={voicing} width={130} />}
                  {voicing && displayMode === 'degrees' && (
                    <div className="blur-md select-none pointer-events-none">
                      <ChordDiagram voicing={voicing} width={130} />
                    </div>
                  )}
                  {displayMode === 'hidden' && (
                    <div className="w-[130px] h-[180px] flex items-center justify-center">
                      <span className="text-3xl opacity-30">👂</span>
                    </div>
                  )}

                  {displayMode === 'full' && (
                    <span className="text-[9px] text-muted-foreground mt-1">
                      {ch.quality === 'Major' ? 'Maior' : ch.quality === 'minor' ? 'Menor' : 'Dim'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset progressions */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-bold text-foreground">Progressões Clássicas</h3>
        <p className="text-xs text-muted-foreground">Clique para carregar uma progressão famosa</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESET_PROGRESSIONS.map((preset, i) => {
            const chordNames = preset.degrees.map(d => harmonicField[d - 1].name).join(' → ');
            return (
              <button
                key={i}
                onClick={() => selectPreset(preset.degrees)}
                className="text-left px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary/60 transition-all group hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {preset.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {preset.description}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Em {root}: {chordNames}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* History */}
      {history.length > 1 && (
        <div className="space-y-2 pt-4 border-t border-border">
          <h3 className="text-sm font-bold text-foreground">Histórico</h3>
          <div className="space-y-1">
            {history.slice(1).map((prog, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentProgression(prog);
                  setActiveChordIdx(null);
                  playClick(500);
                }}
                className="w-full text-left px-3 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary transition-all"
              >
                {prog.chords.map(c => c.name).join(' → ')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressionGeneratorView;
