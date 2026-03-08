import React, { useState, useMemo } from 'react';
import { CHORD_ROOTS, CHORD_CATEGORIES, CHORD_TYPES, generateChordVoicings } from '@/lib/chordEngine';
import ChordDiagram from '@/components/ChordDiagram';

const ChordGenerator: React.FC = () => {
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedType, setSelectedType] = useState('maior');
  const [generated, setGenerated] = useState(false);

  const voicings = useMemo(() => {
    if (!generated) return [];
    return generateChordVoicings(selectedRoot, selectedType);
  }, [selectedRoot, selectedType, generated]);

  const handleGenerate = () => setGenerated(true);

  // Reset when changing selections
  const handleRootChange = (r: string) => { setSelectedRoot(r); setGenerated(false); };
  const handleTypeChange = (t: string) => { setSelectedType(t); setGenerated(false); };

  const displayName = `${selectedRoot}${selectedType === 'maior' ? '' : selectedType === 'menor' ? 'm' : selectedType}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">🎸 Gerador de Acordes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Selecione uma nota raiz e um tipo de acorde para gerar todas as digitações tocáveis.
        </p>
      </div>

      {/* Root selection */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Nota (Root)</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {CHORD_ROOTS.map(r => (
            <button
              key={r.value}
              onClick={() => handleRootChange(r.value)}
              className={`px-2 py-2 rounded-md text-xs font-semibold transition-all ${
                selectedRoot === r.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type selection */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Tipo de Acorde</h3>
        <div className="space-y-3">
          {Object.entries(CHORD_CATEGORIES).map(([cat, types]) => (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {types.map(t => (
                  <button
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      selectedType === t
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
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

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm"
      >
        GERAR ACORDES — {displayName}
      </button>

      {/* Results */}
      {generated && (
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-foreground">{displayName}</h3>
            <span className="text-sm text-muted-foreground">
              {voicings.length} digitação{voicings.length !== 1 ? 'ões' : ''} encontrada{voicings.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Chord notes info */}
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Intervalos:</span>{' '}
              {CHORD_TYPES[selectedType]?.intervals.map(i => {
                const names: Record<number, string> = {
                  0:'1', 2:'2', 3:'b3', 4:'3', 5:'4', 6:'b5', 7:'5', 8:'#5',
                  9:'6', 10:'b7', 11:'7', 13:'b9', 14:'9', 15:'#9', 17:'11',
                  18:'#11', 20:'b13', 21:'13'
                };
                return names[i] || i;
              }).join(' – ')}
            </p>
          </div>

          {voicings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma digitação tocável encontrada para este acorde.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {voicings.map((v, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-lg p-2 flex justify-center items-start hover:shadow-md transition-shadow note-appear"
                  style={{ animationDelay: `${Math.min(i * 30, 500)}ms` }}
                >
                  <ChordDiagram voicing={v} width={130} />
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
