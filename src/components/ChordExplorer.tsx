import React, { useState, useMemo } from 'react';
import {
  generateChordVoicings,
  generateTriadVoicings,
  getChordLabel,
  getChordNotes,
  CHORD_CATEGORIES,
  ALL_CHORD_ROOTS,
  type ChordVoicing,
  type TriadVoicing,
} from '@/lib/chordTheory';
import ChordDiagram from '@/components/ChordDiagram';
import TriadDiagram from '@/components/TriadDiagram';

const TRIAD_TYPES = ['major', 'minor', 'dim', 'aug'] as const;
const INVERSION_LABELS = { Root: 'Fundamental', '1st': '1ª Inversão', '2nd': '2ª Inversão' };

const ChordExplorer: React.FC = () => {
  const [root, setRoot] = useState('C');
  const [chordType, setChordType] = useState('major');
  const [activeTab, setActiveTab] = useState<'chords' | 'triads'>('chords');
  const [triadType, setTriadType] = useState<'major' | 'minor' | 'dim' | 'aug'>('major');
  const [inversionFilter, setInversionFilter] = useState<'all' | 'Root' | '1st' | '2nd'>('all');

  const voicings = useMemo(
    () => (activeTab === 'chords' ? generateChordVoicings(root, chordType) : []),
    [root, chordType, activeTab]
  );

  const triads = useMemo(() => {
    if (activeTab !== 'triads') return [];
    const all = generateTriadVoicings(root, triadType);
    if (inversionFilter === 'all') return all;
    return all.filter(t => t.inversion === inversionFilter);
  }, [root, triadType, activeTab, inversionFilter]);

  const chordLabel = getChordLabel(root, chordType);
  const chordNotes = getChordNotes(root, chordType);

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex gap-2">
        <TabBtn active={activeTab === 'chords'} onClick={() => setActiveTab('chords')}>
          🎶 Acordes
        </TabBtn>
        <TabBtn active={activeTab === 'triads'} onClick={() => setActiveTab('triads')}>
          🔺 Tríades (CAGED)
        </TabBtn>
      </div>

      {/* Root selector */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Nota Fundamental</label>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
          {ALL_CHORD_ROOTS.map(n => (
            <button
              key={n}
              onClick={() => setRoot(n)}
              className={`px-2 py-1.5 rounded text-xs font-semibold transition-all ${
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

      {activeTab === 'chords' ? (
        <>
          {/* Chord type selector */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Tipo de Acorde</label>
            <div className="space-y-3">
              {Object.entries(CHORD_CATEGORIES).map(([cat, types]) => (
                <div key={cat}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">{cat}</p>
                  <div className="flex flex-wrap gap-1">
                    {types.map(t => (
                      <button
                        key={t}
                        onClick={() => setChordType(t)}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          chordType === t
                            ? 'bg-primary text-primary-foreground'
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

          {/* Info */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-sm font-bold text-foreground">{chordLabel}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Notas: <span className="font-mono font-semibold">{chordNotes.join(' – ')}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {voicings.length} voicing{voicings.length !== 1 ? 's' : ''} encontrado{voicings.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Diagrams */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {voicings.map((v, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-2 flex flex-col items-center">
                <ChordDiagram voicing={v} size={160} />
                <span className="text-[9px] text-muted-foreground mt-1">Região {v.region}</span>
              </div>
            ))}
          </div>
          {voicings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum voicing encontrado para este acorde.</p>
          )}
        </>
      ) : (
        <>
          {/* Triad type */}
          <div className="flex flex-wrap gap-2">
            {TRIAD_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setTriadType(t)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  triadType === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Inversion filter */}
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'Root', '1st', '2nd'] as const).map(inv => (
              <button
                key={inv}
                onClick={() => setInversionFilter(inv)}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  inversionFilter === inv
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {inv === 'all' ? 'Todas' : INVERSION_LABELS[inv]}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {triads.length} tríade{triads.length !== 1 ? 's' : ''} encontrada{triads.length !== 1 ? 's' : ''}
          </p>

          {/* Triad diagrams */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {triads.map((t, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-2 flex flex-col items-center">
                <TriadDiagram voicing={t} size={140} />
              </div>
            ))}
          </div>
          {triads.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tríade encontrada.</p>
          )}
        </>
      )}
    </div>
  );
};

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      }`}
    >
      {children}
    </button>
  );
}

export default ChordExplorer;
