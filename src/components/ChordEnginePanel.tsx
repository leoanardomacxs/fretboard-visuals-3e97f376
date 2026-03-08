import React, { useState, useMemo } from 'react';
import {
  ALL_ROOTS,
  CHORD_CATEGORIES,
  CHORD_TYPES,
  generateChordVoicings,
  generateTriadVoicings,
  getChordLabel,
  getChordNoteNames,
  type ChordVoicing,
  type TriadVoicing,
} from '@/lib/chordEngine';
import ChordDiagram, { TriadDiagram } from './ChordDiagram';

const TRIAD_TYPES = ['major', 'minor', 'diminished', 'augmented'];

const ChordEnginePanel: React.FC = () => {
  const [root, setRoot] = useState('C');
  const [chordType, setChordType] = useState('major');
  const [triadType, setTriadType] = useState('major');
  const [activeTab, setActiveTab] = useState<'voicings' | 'triads'>('voicings');
  const [inversionFilter, setInversionFilter] = useState<string | null>(null);
  const [stringSetFilter, setStringSetFilter] = useState<string | null>(null);

  const voicings = useMemo(() => generateChordVoicings(root, chordType, 16), [root, chordType]);
  const triads = useMemo(() => generateTriadVoicings(root, triadType), [root, triadType]);

  const filteredTriads = useMemo(() => {
    let t = triads;
    if (inversionFilter) t = t.filter(x => x.inversion === inversionFilter);
    if (stringSetFilter) t = t.filter(x => x.strings.join('-') === stringSetFilter);
    return t;
  }, [triads, inversionFilter, stringSetFilter]);

  const chordNotes = useMemo(() => getChordNoteNames(root, chordType), [root, chordType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Chord Engine</h2>
        <p className="text-sm text-muted-foreground">Gerador profissional de voicings e tríades</p>
      </div>

      {/* Root selector */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-2">Nota Fundamental</label>
        <div className="grid grid-cols-6 gap-1.5">
          {ALL_ROOTS.map(n => (
            <button
              key={n}
              onClick={() => setRoot(n)}
              className={`px-2 py-2 rounded-md text-xs font-semibold transition-all ${
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

      {/* Tab switcher */}
      <div className="flex rounded-lg bg-secondary p-1 gap-1">
        <button
          onClick={() => setActiveTab('voicings')}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'voicings' ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Chord Voicings
        </button>
        <button
          onClick={() => setActiveTab('triads')}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'triads' ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Triads (CAGED)
        </button>
      </div>

      {activeTab === 'voicings' ? (
        <>
          {/* Chord type selector */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-2">Tipo de Acorde</label>
            {CHORD_CATEGORIES.map(([category, types]) => (
              <div key={category} className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">{category}</p>
                <div className="flex flex-wrap gap-1">
                  {types.map(t => (
                    <button
                      key={t}
                      onClick={() => setChordType(t)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        chordType === t
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {CHORD_TYPES[t].label || t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Chord info */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-sm font-bold text-foreground mb-1">{getChordLabel(root, chordType)}</h3>
            <div className="flex gap-1.5 flex-wrap">
              {chordNotes.map(n => (
                <span key={n} className="px-2 py-0.5 bg-primary/15 text-primary rounded text-xs font-semibold">
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* Voicings grid */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">
              Voicings ({voicings.length})
            </h3>
            {voicings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum voicing encontrado para este acorde.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {voicings.map((v, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-2 flex flex-col items-center panel-shadow">
                    <ChordDiagram voicing={v} />
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {v.frets.map(f => f === -1 ? 'X' : f).join(' ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Triad type selector */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block mb-2">Tipo de Tríade</label>
            <div className="flex gap-1.5">
              {TRIAD_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTriadType(t)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all capitalize ${
                    triadType === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">Inversão</label>
              <div className="flex gap-1">
                {[null, 'Root', '1st', '2nd'].map(inv => (
                  <button
                    key={inv ?? 'all'}
                    onClick={() => setInversionFilter(inv)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      inversionFilter === inv
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {inv === null ? 'Todas' : inv === 'Root' ? 'Fund.' : inv === '1st' ? '1ª' : '2ª'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">Cordas</label>
              <div className="flex gap-1">
                {[null, '5-4-3', '4-3-2', '3-2-1', '2-1-0'].map((set, idx) => {
                  const labels = ['Todas', '①②③', '②③④', '③④⑤', '④⑤⑥'];
                  const setValues = [null, '5,4,3', '4,3,2', '3,2,1', '2,1,0'];
                  return (
                    <button
                      key={idx}
                      onClick={() => setStringSetFilter(setValues[idx])}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                        stringSetFilter === setValues[idx]
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {labels[idx]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Triads grid */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">
              Tríades ({filteredTriads.length})
            </h3>
            {filteredTriads.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tríade encontrada com esses filtros.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {filteredTriads.map((t, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-1.5 flex flex-col items-center panel-shadow">
                    <TriadDiagram triad={t} size={0.9} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChordEnginePanel;
