import React, { useState, useMemo } from 'react';
import ChordDiagram from './ChordDiagram';
import { generateChordVoicings, getChordTypeCategories, CHORD_TYPES } from '@/lib/chordGenerator';
import { ALL_ROOTS } from '@/lib/musicTheory';

interface ChordGeneratorViewProps {
  root: string;
  setRoot: (r: string) => void;
}

const ChordGeneratorView: React.FC<ChordGeneratorViewProps> = ({ root, setRoot }) => {
  const [selectedType, setSelectedType] = useState('major');
  const categories = useMemo(() => getChordTypeCategories(), []);

  const voicings = useMemo(
    () => generateChordVoicings(root, selectedType, 30),
    [root, selectedType]
  );

  const typeDef = CHORD_TYPES[selectedType];
  const chordName = `${root}${typeDef?.label || ''}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Gerador de Acordes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Todas as digitações possíveis para {chordName}
        </p>
      </div>

      {/* Root selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nota Raiz</label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ROOTS.map(n => (
            <button
              key={n}
              onClick={() => setRoot(n)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                root === n
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Chord type selector — all in one, no tabs */}
      <div className="space-y-3">
        {categories.map(cat => (
          <div key={cat.category}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">
              {cat.category}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cat.types.map(t => {
                const displayLabel = t.label === '' ? 'Maior' :
                  t.key === 'minor' ? 'Menor' :
                  t.key === 'dim' ? 'Dim' :
                  t.key === 'aug' ? 'Aum' :
                  t.label;
                return (
                  <button
                    key={t.key}
                    onClick={() => setSelectedType(t.key)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      selectedType === t.key
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{chordName}</span>
        <span className="text-xs text-muted-foreground">
          — {voicings.length} digitação{voicings.length !== 1 ? 'ões' : ''} encontrada{voicings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Voicing cards grid */}
      {voicings.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {voicings.map((v, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-2 flex flex-col items-center hover:shadow-md transition-shadow note-appear"
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <ChordDiagram voicing={v} width={140} />
              <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                {v.frets.map(f => f === null ? 'X' : String(f)).join(' ')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nenhuma digitação encontrada</p>
          <p className="text-sm mt-1">Tente outro tipo de acorde ou nota raiz</p>
        </div>
      )}
    </div>
  );
};

export default ChordGeneratorView;
