import React, { useState, useMemo } from 'react';
import ChordDiagram from './ChordDiagram';
import { generateChordVoicings, generateTriadInversions, getChordTypeCategories, CHORD_TYPES } from '@/lib/chordGenerator';
import type { TriadVoicing } from '@/lib/chordGenerator';
import { ALL_ROOTS } from '@/lib/musicTheory';

interface ChordGeneratorViewProps {
  root: string;
  setRoot: (r: string) => void;
}

const TRIAD_TYPES = ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'];

const ChordGeneratorView: React.FC<ChordGeneratorViewProps> = ({ root, setRoot }) => {
  const [selectedType, setSelectedType] = useState('major');
  const categories = useMemo(() => getChordTypeCategories(), []);

  const voicings = useMemo(
    () => generateChordVoicings(root, selectedType, 30),
    [root, selectedType]
  );

  const triadInversions = useMemo(
    () => generateTriadInversions(root, selectedType),
    [root, selectedType]
  );

  const typeDef = CHORD_TYPES[selectedType];
  const chordName = `${root}${typeDef?.label || ''}`;
  const isTriadType = TRIAD_TYPES.includes(selectedType);

  // Group triad inversions by string set, then by inversion
  const groupedTriads = useMemo(() => {
    if (!isTriadType || triadInversions.length === 0) return [];

    const byStringSet = new Map<string, TriadVoicing[]>();
    for (const t of triadInversions) {
      if (!byStringSet.has(t.stringSet)) byStringSet.set(t.stringSet, []);
      byStringSet.get(t.stringSet)!.push(t);
    }

    return Array.from(byStringSet.entries()).map(([stringSet, voicings]) => ({
      stringSet,
      voicings: voicings.sort((a, b) => {
        const invOrder = ['Fundamental', '1ª Inversão', '2ª Inversão'];
        return invOrder.indexOf(a.inversion) - invOrder.indexOf(b.inversion) || a.score - b.score;
      }),
    }));
  }, [triadInversions, isTriadType]);

  const stringSetLabels: Record<string, string> = {
    '1-2-3': 'Cordas 1-2-3 (E B G)',
    '2-3-4': 'Cordas 2-3-4 (B G D)',
    '3-4-5': 'Cordas 3-4-5 (G D A)',
    '4-5-6': 'Cordas 4-5-6 (D A E)',
  };

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

      {/* Chord type selector */}
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

      {/* Difficulty indicator */}
      {voicings.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Fácil
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Médio
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Difícil
          </span>
        </div>
      )}

      {/* Voicing cards grid */}
      {voicings.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {voicings.map((v, i) => {
            const difficultyColor = v.score < 30 ? 'border-green-500/40' :
              v.score < 60 ? 'border-yellow-500/40' : 'border-red-500/40';
            const difficultyBg = v.score < 30 ? 'bg-green-500/5' :
              v.score < 60 ? 'bg-yellow-500/5' : 'bg-red-500/5';
            return (
              <div
                key={i}
                className={`border rounded-lg p-2 flex flex-col items-center hover:shadow-md transition-shadow note-appear ${difficultyColor} ${difficultyBg}`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <ChordDiagram voicing={v} width={140} />
                <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                  {v.frets.map(f => f === null ? 'X' : String(f)).join(' ')}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nenhuma digitação encontrada</p>
          <p className="text-sm mt-1">Tente outro tipo de acorde ou nota raiz</p>
        </div>
      )}

      {/* CAGED Triad Inversions Section */}
      {isTriadType && groupedTriads.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">Tríades — Inversões CAGED</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Todas as inversões de {chordName} organizadas por grupo de cordas
            </p>
          </div>

          {groupedTriads.map(({ stringSet, voicings: triadVoicings }) => (
            <div key={stringSet} className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {stringSetLabels[stringSet] || stringSet}
                </h4>
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {triadVoicings.length} formas
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {triadVoicings.map((v, i) => {
                  const invColor = v.inversion === 'Fundamental' ? 'border-blue-500/40 bg-blue-500/5' :
                    v.inversion === '1ª Inversão' ? 'border-purple-500/40 bg-purple-500/5' :
                    'border-amber-500/40 bg-amber-500/5';
                  return (
                    <div
                      key={i}
                      className={`border rounded-lg p-2 flex flex-col items-center hover:shadow-md transition-shadow note-appear ${invColor}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <ChordDiagram voicing={v} width={140} />
                      <div className="mt-1.5 flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-semibold text-foreground">
                          {v.inversion}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          Forma {v.cagedShape}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChordGeneratorView;
