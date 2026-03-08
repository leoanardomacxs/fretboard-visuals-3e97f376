import React, { useState, useMemo, useRef, useEffect } from 'react';
import ChordDiagram from './ChordDiagram';
import { generateChordVoicings, generateTriadInversions, getChordTypeCategories, CHORD_TYPES } from '@/lib/chordGenerator';
import type { TriadVoicing } from '@/lib/chordGenerator';
import { ALL_ROOTS } from '@/lib/musicTheory';
import { ChevronDown } from 'lucide-react';

interface ChordGeneratorViewProps {
  root: string;
  setRoot: (r: string) => void;
}

const TRIAD_TYPES = ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'];

const TYPE_DISPLAY: Record<string, string> = {
  'major': 'Maior', 'minor': 'Menor', 'dim': 'Dim', 'aug': 'Aum',
  'sus2': 'sus2', 'sus4': 'sus4', '7': '7', 'maj7': 'maj7',
  'min7': 'm7', 'min-maj7': 'm(maj7)', 'dim7': '°7', 'half-dim7': 'ø7',
  'aug7': '+7', '7sus4': '7sus4', 'add9': 'add9', 'madd9': 'madd9',
  '6': '6', 'm6': 'm6', '9': '9', 'maj9': 'maj9', 'm9': 'm9', '5': '5',
};

const ChordGeneratorView: React.FC<ChordGeneratorViewProps> = ({ root, setRoot }) => {
  const [selectedType, setSelectedType] = useState('major');
  const [rootOpen, setRootOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const categories = useMemo(() => getChordTypeCategories(), []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setRootOpen(false);
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const voicings = useMemo(
    () => generateChordVoicings(root, selectedType, 20),
    [root, selectedType]
  );

  const triadInversions = useMemo(
    () => generateTriadInversions(root, selectedType),
    [root, selectedType]
  );

  const typeDef = CHORD_TYPES[selectedType];
  const chordName = `${root}${typeDef?.label || ''}`;
  const isTriadType = TRIAD_TYPES.includes(selectedType);

  // Group triads by inversion type, sorted by fret position (closest to nut first)
  const groupedTriads = useMemo(() => {
    if (!isTriadType || triadInversions.length === 0) return [];
    const invOrder = ['Fundamental', '1ª Inversão', '2ª Inversão'];
    const byInversion = new Map<string, TriadVoicing[]>();
    for (const inv of invOrder) {
      byInversion.set(inv, []);
    }
    for (const t of triadInversions) {
      byInversion.get(t.inversion)?.push(t);
    }
    return Array.from(byInversion.entries())
      .filter(([, voicings]) => voicings.length > 0)
      .map(([inversion, voicings]) => ({
        inversion,
        voicings: voicings.sort((a, b) => a.startFret - b.startFret),
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
          Digitações mais comuns para <span className="font-semibold text-foreground">{chordName}</span>
        </p>
      </div>

      {/* Selectors row */}
      <div className="flex flex-wrap gap-3">
        {/* Root dropdown */}
        <div ref={rootRef} className="relative">
          <button
            onClick={() => { setRootOpen(!rootOpen); setTypeOpen(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary/60 transition-colors min-w-[100px]"
          >
            <span className="text-muted-foreground text-xs">Nota:</span>
            <span>{root}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${rootOpen ? 'rotate-180' : ''}`} />
          </button>
          {rootOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-50 bg-card border border-border rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 min-w-[180px] note-appear">
              {ALL_ROOTS.map(n => (
                <button
                  key={n}
                  onClick={() => { setRoot(n); setRootOpen(false); }}
                  className={`px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                    root === n
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type dropdown */}
        <div ref={typeRef} className="relative">
          <button
            onClick={() => { setTypeOpen(!typeOpen); setRootOpen(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-secondary/60 transition-colors min-w-[140px]"
          >
            <span className="text-muted-foreground text-xs">Tipo:</span>
            <span>{TYPE_DISPLAY[selectedType] || selectedType}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${typeOpen ? 'rotate-180' : ''}`} />
          </button>
          {typeOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-50 bg-card border border-border rounded-lg shadow-lg p-3 min-w-[240px] max-h-[360px] overflow-y-auto space-y-3 note-appear">
              {categories.map(cat => (
                <div key={cat.category}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">
                    {cat.category}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {cat.types.map(t => (
                      <button
                        key={t.key}
                        onClick={() => { setSelectedType(t.key); setTypeOpen(false); }}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                          selectedType === t.key
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground hover:bg-secondary'
                        }`}
                      >
                        {TYPE_DISPLAY[t.key] || t.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count + difficulty legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{chordName}</span>
          <span className="text-xs text-muted-foreground">
            — {voicings.length} digitação{voicings.length !== 1 ? 'ões' : ''} 
          </span>
        </div>
        {voicings.length > 0 && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
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
      </div>

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
            <h3 className="text-lg font-bold text-foreground">Tríades — Inversões</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Inversões de {chordName} ordenadas da mais próxima ao início do braço até a mais distante
            </p>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/30 border border-blue-500/50" /> Fundamental (Tônica no baixo)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/30 border border-purple-500/50" /> 1ª Inversão (Terça no baixo)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50" /> 2ª Inversão (Quinta no baixo)
              </span>
            </div>
          </div>

          {groupedTriads.map(({ inversion, voicings: triadVoicings }) => {
            const invColor = inversion === 'Fundamental' ? 'border-blue-500/40 bg-blue-500/5' :
              inversion === '1ª Inversão' ? 'border-purple-500/40 bg-purple-500/5' :
              'border-amber-500/40 bg-amber-500/5';
            const invDesc = inversion === 'Fundamental' ? 'Tônica é a nota mais grave' :
              inversion === '1ª Inversão' ? 'Terça é a nota mais grave' :
              'Quinta é a nota mais grave';
            return (
              <div key={inversion} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {inversion}
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    — {invDesc}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-auto">
                    {triadVoicings.length} formas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {triadVoicings.map((v, i) => (
                    <div
                      key={i}
                      className={`border rounded-lg p-2 flex flex-col items-center hover:shadow-md transition-shadow note-appear ${invColor}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <ChordDiagram voicing={v} width={140} />
                      <div className="mt-1.5 flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-muted-foreground">
                          Cordas {v.stringSet} • Casa {v.startFret || 'aberta'}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">
                          Forma {v.cagedShape}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChordGeneratorView;
