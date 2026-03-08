import React, { useState, useEffect } from 'react';
import {
  ALL_ROOTS,
  SCALE_CATEGORIES,
  SCALE_FORMULAS,
  type ChordInfo,
} from '@/lib/musicTheory';
import {
  playClick, playScale, getScaleMidiNotes,
  getAudioSettings, updateAudioSettings, subscribeAudioSettings,
  TIMBRE_LIST,
  type AudioSettings, type TimbreType,
} from '@/lib/audioEngine';

export type ViewMode = 
  | 'full' | 'position' | 'caged' | 'intervals' | 'notes' 
  | 'degrees' | 'notes-degrees' | 'tensions'
  | 'chord' | 'harmonic-field' | 'harmonic-matrix'
  | 'compare-pentatonics' | 'improvisation' | 'chord-generator' | 'progressions';

interface ControlPanelProps {
  root: string;
  setRoot: (r: string) => void;
  scaleType: string;
  setScaleType: (s: string) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  selectedChord: ChordInfo | null;
  setSelectedChord: (c: ChordInfo | null) => void;
  harmonicField: ChordInfo[];
  showArpeggio: boolean;
  setShowArpeggio: (b: boolean) => void;
  showPentatonic: boolean;
  setShowPentatonic: (b: boolean) => void;
  darkMode: boolean;
  setDarkMode: (b: boolean) => void;
  colorMode: 'degree' | 'note' | 'function';
  setColorMode: (c: 'degree' | 'note' | 'function') => void;
  noteSize: number;
  setNoteSize: (n: number) => void;
  show24Frets: boolean;
  setShow24Frets: (b: boolean) => void;
}

const VIEW_MODES: { value: ViewMode; label: string; icon: string }[] = [
  { value: 'full', label: 'Escala Completa', icon: '' },
  { value: 'intervals', label: 'Intervalos', icon: '' },
  { value: 'notes', label: 'Notas', icon: '' },
  { value: 'degrees', label: 'Graus', icon: '' },
  { value: 'notes-degrees', label: 'Notas + Graus', icon: '' },
  { value: 'tensions', label: 'Tensões', icon: '' },
  { value: 'chord', label: 'Acorde', icon: '' },
  { value: 'harmonic-field', label: 'Campo Harmônico', icon: '' },
  { value: 'harmonic-matrix', label: 'Matriz Harmônica', icon: '' },
  { value: 'compare-pentatonics', label: 'Comparar Pentatônicas', icon: '' },
  { value: 'improvisation', label: 'Improvisação', icon: '' },
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  root, setRoot,
  scaleType, setScaleType,
  viewMode, setViewMode,
  selectedChord, setSelectedChord,
  harmonicField,
  showArpeggio, setShowArpeggio,
  showPentatonic, setShowPentatonic,
  darkMode, setDarkMode,
  colorMode, setColorMode,
  noteSize, setNoteSize,
  show24Frets, setShow24Frets,
}) => {
  return (
    <aside className="w-72 shrink-0 h-screen overflow-y-auto bg-card border-r border-border p-4 space-y-5 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <span className="text-2xl font-bold">GT</span>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">Guitar Theory</h1>
          <p className="text-xs text-muted-foreground">Estudo Visual Interativo</p>
        </div>
      </div>

      {/* Tonalidade */}
      <Section title="Tonalidade">
        <div className="grid grid-cols-6 gap-1">
          {ALL_ROOTS.map(n => (
            <button
              key={n}
              onClick={() => {
                setRoot(n);
                const formula = SCALE_FORMULAS[scaleType];
                if (formula) {
                  playScale(getScaleMidiNotes(n, formula), 0.2, 0.4);
                }
              }}
              className={`px-1 py-1.5 rounded text-xs font-semibold transition-all ${
                root === n
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Section>

      {/* Gerador de Acordes — botão exclusivo */}
      <button
        onClick={() => { playClick(500); setViewMode('chord-generator'); }}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
          viewMode === 'chord-generator'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-secondary text-foreground hover:bg-secondary/80'
        }`}
      >
        Gerador de Acordes
      </button>

      {/* Progressões — botão exclusivo */}
      <button
        onClick={() => { playClick(500); setViewMode('progressions'); }}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
          viewMode === 'progressions'
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-secondary text-foreground hover:bg-secondary/80'
        }`}
      >
        Progressões
      </button>

      {/* Escala */}
      <Section title="Escala" collapsible defaultOpen={false}>
        {Object.entries(SCALE_CATEGORIES).map(([cat, scales]) => (
          <div key={cat} className="mb-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">{cat}</p>
            <div className="space-y-0.5">
              {scales.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setScaleType(s);
                    if (viewMode === 'chord-generator') setViewMode('full');
                    const formula = SCALE_FORMULAS[s];
                    if (formula) {
                      playScale(getScaleMidiNotes(root, formula), 0.2, 0.4);
                    }
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-all ${
                    scaleType === s
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {/* Visualização */}
      <Section title="Visualização" collapsible defaultOpen={false}>
        <div className="space-y-0.5">
          {VIEW_MODES.map(m => (
            <button
              key={m.value}
              onClick={() => { playClick(700); setViewMode(m.value); }}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all flex items-center gap-2 ${
                viewMode === m.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Campo Harmônico - Acordes */}
      {(viewMode === 'chord' || viewMode === 'improvisation') && (
        <Section title="Acordes">
          <div className="space-y-0.5">
            {harmonicField.map(ch => (
              <button
                key={ch.name}
                onClick={() => { playClick(550); setSelectedChord(ch); }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                  selectedChord?.name === ch.name
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <span className="font-mono text-muted-foreground mr-2">{ch.romanNumeral}</span>
                <span className="font-semibold">{ch.name}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Opções */}
      {(viewMode === 'chord' || viewMode === 'improvisation') && (
        <Section title="Mostrar">
          <Toggle label="Arpejo" checked={showArpeggio} onChange={setShowArpeggio} />
          <Toggle label="Pentatônica" checked={showPentatonic} onChange={setShowPentatonic} />
        </Section>
      )}

      {/* Cores */}
      <Section title="Cores" collapsible defaultOpen={false}>
        {(['degree', 'note', 'function'] as const).map(c => (
          <button
            key={c}
            onClick={() => { playClick(650); setColorMode(c); }}
            className={`w-full text-left px-2 py-1 rounded text-xs transition-all ${
              colorMode === c ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
            }`}
          >
            {c === 'degree' ? 'Por Grau' : c === 'note' ? 'Por Nota' : 'Por Função'}
          </button>
        ))}
      </Section>

      {/* Áudio */}
      <Section title="Áudio" collapsible defaultOpen={false}>
        <AudioSettingsPanel />
      </Section>

      {/* Tamanho */}
      <Section title="Tamanho das Notas">
        <input
          type="range"
          min={8}
          max={20}
          value={noteSize}
          onChange={e => setNoteSize(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </Section>

      {/* Braço */}
      <Section title="Braço">
        <Toggle label="Mostrar até casa 24" checked={show24Frets} onChange={setShow24Frets} />
      </Section>

      {/* Dark mode */}
      <Section title="Tema">
        <Toggle label="Modo Noturno" checked={darkMode} onChange={setDarkMode} />
      </Section>
    </aside>
  );
};

function AudioSettingsPanel() {
  const [audio, setAudio] = useState<AudioSettings>(getAudioSettings());

  useEffect(() => {
    return subscribeAudioSettings(setAudio);
  }, []);

  const set = (partial: Partial<AudioSettings>) => updateAudioSettings(partial);

  return (
    <div className="space-y-3">
      {/* Volume + Mute */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Volume</span>
          <button
            onClick={() => set({ muted: !audio.muted })}
            className={`text-xs px-2 py-0.5 rounded transition-all font-semibold ${
              audio.muted
                ? 'bg-destructive/20 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {audio.muted ? 'Mudo' : 'On'}
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(audio.volume * 100)}
          onChange={e => set({ volume: Number(e.target.value) / 100 })}
          className="w-full accent-primary"
          disabled={audio.muted}
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>0%</span>
          <span className="font-semibold text-foreground">{Math.round(audio.volume * 100)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Timbre */}
      <div className="space-y-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Timbre</span>
        <div className="grid grid-cols-2 gap-1">
          {TIMBRE_LIST.map(t => (
            <button
              key={t.key}
              onClick={() => { set({ timbre: t.key }); playClick(600); }}
              className={`text-left px-2 py-1.5 rounded text-[11px] transition-all flex items-center gap-1.5 ${
                audio.timbre === t.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground hover:bg-secondary'
              }`}
            >
              <span>{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brightness */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Brilho</span>
          <span className="text-[9px] text-foreground font-semibold">{Math.round(audio.brightness * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(audio.brightness * 100)}
          onChange={e => set({ brightness: Number(e.target.value) / 100 })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>Suave</span>
          <span>Brilhante</span>
        </div>
      </div>

      {/* Reverb */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reverb</span>
          <span className="text-[9px] text-foreground font-semibold">{Math.round(audio.reverb * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(audio.reverb * 100)}
          onChange={e => set({ reverb: Number(e.target.value) / 100 })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>Seco</span>
          <span>Ambiente</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, collapsible = false, defaultOpen = true }: { title: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      {collapsible ? (
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between text-[11px] uppercase tracking-wider mb-2 font-bold transition-colors duration-200 rounded px-2 py-1.5 ${
            open
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
          }`}
        >
          <span>{title}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">{title}</h3>
      )}
      {collapsible ? (
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-secondary'}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-primary-foreground shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-xs text-foreground">{label}</span>
    </label>
  );
}

export default ControlPanel;
