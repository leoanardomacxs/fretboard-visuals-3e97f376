import React, { useState, useMemo } from 'react';
import { CHORD_ROOTS, CHORD_CATEGORIES, CHORD_TYPES, generateChordVoicings, generateTriads } from '@/lib/chordEngine';
import ChordDiagram from '@/components/ChordDiagram';

type Tab = 'root' | 'type';

const ChordGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('root');
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedType, setSelectedType] = useState('maior');
  const [generated, setGenerated] = useState(false);

  const voicings = useMemo(() => {
    if (!generated) return [];
    return generateChordVoicings(selectedRoot, selectedType);
  }, [selectedRoot, selectedType, generated]);

  const triads = useMemo(() => {
    if (!generated) return [];
    const isTriad = ['maior', 'menor', 'diminuto', 'aumentado'].includes(selectedType);
    if (!isTriad) return [];
    return generateTriads(selectedRoot, selectedType as any);
  }, [selectedRoot, selectedType, generated]);

  const handleGenerate = () => setGenerated(true);
  const handleRootChange = (r: string) => { setSelectedRoot(r); setGenerated(false); };
  const handleTypeChange = (t: string) => { setSelectedType(t); setGenerated(false); };

  const displayName = `${selectedRoot}${selectedType === 'maior' ? '' : selectedType === 'menor' ? 'm' : selectedType}`;

  const isTriadType = ['maior', 'menor', 'diminuto', 'aumentado'].includes(selectedType);

  // Group triads by string set
  const triadGroups = useMemo(() => {
    const groups: Record<string, typeof triads> = {};
    for (const t of triads) {
      const key = t.strings.join('-');
      const label = ['E-A-D', 'A-D-G', 'D-G-B', 'G-B-E'][t.strings[0]] || key;
      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    }
    return groups;
  }, [triads]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">🎸 Gerador de Acordes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione nota e tipo para gerar todas as digitações tocáveis
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => setActiveTab('root')}
          className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
            activeTab === 'root'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          1. Nota (Root)
        </button>
        <button
          onClick={() => setActiveTab('type')}
          className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
            activeTab === 'type'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          2. Tipo de Acorde
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-xl p-5 transition-all duration-300">
        {activeTab === 'root' ? (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Selecione a Nota Fundamental
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {CHORD_ROOTS.map(r => (
                <button
                  key={r.value}
                  onClick={() => { handleRootChange(r.value); setActiveTab('type'); }}
                  className={`group relative px-3 py-4 rounded-xl text-sm font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    selectedRoot === r.value
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/30'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70 hover:shadow-md'
                  }`}
                >
                  <span className="block text-base">{r.label.split(' / ')[0]}</span>
                  {r.label.includes('/') && (
                    <span className="block text-[10px] opacity-60 mt-0.5">{r.label.split(' / ')[1]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Selecione o Tipo — <span className="text-primary">{selectedRoot}</span>
            </h3>
            <div className="space-y-4">
              {Object.entries(CHORD_CATEGORIES).map(([cat, types]) => (
                <div key={cat}>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 font-bold border-b border-border pb-1">
                    {cat}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {types.map(t => (
                      <button
                        key={t}
                        onClick={() => handleTypeChange(t)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                          selectedType === t
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/70 hover:shadow-sm'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase font-bold">Seleção:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
            {displayName}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {CHORD_TYPES[selectedType]?.intervals.map(i => {
            const names: Record<number, string> = {
              0:'1', 2:'2', 3:'b3', 4:'3', 5:'4', 6:'b5', 7:'5', 8:'#5',
              9:'6', 10:'b7', 11:'7', 13:'b9', 14:'9', 15:'#9', 17:'11',
              18:'#11', 20:'b13', 21:'13'
            };
            return names[i] || String(i);
          }).join(' – ')}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base
          hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20
          hover:shadow-xl hover:shadow-primary/30"
      >
        GERAR ACORDES — {displayName}
      </button>

      {/* Results */}
      {generated && (
        <div className="space-y-8 animate-fade-in">
          {/* Chord voicings */}
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <h3 className="text-xl font-bold text-foreground">{displayName}</h3>
              <span className="text-sm text-muted-foreground">
                {voicings.length} digitação{voicings.length !== 1 ? 'ões' : ''} encontrada{voicings.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase font-bold">
                Fácil → Difícil
              </span>
            </div>

            {voicings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-border rounded-xl">
                Nenhuma digitação tocável encontrada para este acorde.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {voicings.map((v, i) => (
                  <div
                    key={i}
                    className="group bg-card border border-border rounded-xl p-2 flex flex-col items-center
                      hover:shadow-lg hover:border-primary/20 hover:scale-[1.02] transition-all duration-200
                      note-appear cursor-default"
                    style={{ animationDelay: `${Math.min(i * 25, 600)}ms` }}
                  >
                    <ChordDiagram voicing={v} width={135} />
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {v.frets.map(f => f < 0 ? 'x' : f).join(' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CAGED Triads Section */}
          {isTriadType && triads.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  🎯 Tríades — Sistema CAGED
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Todas as tríades de <span className="font-bold text-primary">{displayName}</span> em cordas consecutivas
                </p>
              </div>

              {Object.entries(triadGroups).map(([groupLabel, groupTriads]) => (
                <div key={groupLabel} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Cordas {groupLabel}
                    </h4>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {groupTriads.length} posições
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {groupTriads.map((t, i) => (
                      <div
                        key={i}
                        className="bg-card border border-border rounded-xl p-2 flex flex-col items-center
                          hover:shadow-md hover:border-primary/20 hover:scale-[1.02] transition-all duration-200
                          note-appear"
                        style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
                      >
                        <ChordDiagram voicing={t} width={125} showName={false} />
                        <div className="mt-1 text-center space-y-0.5">
                          <span className="block text-[10px] font-bold text-foreground">
                            {t.inversion}
                          </span>
                          <div className="flex items-center gap-1 justify-center">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                              {t.cagedShape}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              Casa {t.position}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChordGenerator;
