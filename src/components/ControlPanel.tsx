import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ALL_ROOTS,
  ENHARMONIC_MAP,
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
  colorVariant: number;
  setColorVariant: (n: number) => void;
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
  colorVariant, setColorVariant,
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
      <Section title="Tonalidade" hint="Escolha a nota base do tom. Clique duplo troca para enarmônico (ex: C# ↔ Db).">
        <div className="grid grid-cols-6 gap-1">
          {ALL_ROOTS.map(n => {
            const isActive = root === n || ENHARMONIC_MAP[root] === n;
            return (
              <button
                key={n}
                onClick={() => {
                  if (isActive && root !== n) {
                    // Already on enharmonic of this note, just switch to standard
                    setRoot(n);
                  } else {
                    setRoot(n);
                  }
                  const formula = SCALE_FORMULAS[scaleType];
                  if (formula) {
                    playScale(getScaleMidiNotes(n, formula), 0.2, 0.4);
                  }
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  const currentNote = isActive ? (root === n ? n : root) : n;
                  const enharmonic = ENHARMONIC_MAP[currentNote];
                  if (enharmonic) {
                    setRoot(enharmonic);
                    playClick(800);
                  }
                }}
                className={`px-1 py-1.5 rounded text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {isActive && root !== n ? root : n}
              </button>
            );
          })}
        </div>
        {/* Show current root if it's an enharmonic variant */}
        {!ALL_ROOTS.includes(root) && (
          <div className="mt-1.5 text-center">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
              {root}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">
              (clique duplo para voltar)
            </span>
          </div>
        )}
      </Section>

      {/* Gerador de Acordes — botão exclusivo */}
      <div>
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
        <p className="text-[9px] text-muted-foreground/70 mt-1 px-1 italic">Todas as digitações possíveis para qualquer acorde. Clique para ouvir.</p>
      </div>

      {/* Progressões — botão exclusivo */}
      <div>
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
        <p className="text-[9px] text-muted-foreground/70 mt-1 px-1 italic">Gere e toque sequências de acordes usadas em músicas reais.</p>
      </div>

      {/* Escala */}
      <Section title="Escala" hint="Tipo de escala para visualizar. Define quais notas pertencem ao tom." collapsible defaultOpen={false}>
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
      <Section title="Visualização" hint="Escolha o que exibir: notas, graus, intervalos, campo harmônico ou ferramentas de improvisação." collapsible defaultOpen={false}>
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
        <Section title="Acordes" hint="Acordes do campo harmônico. Clique para ver no braço.">
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
        <Section title="Mostrar" hint="Camadas extras: arpejo (notas do acorde) e pentatônica associada.">
          <Toggle label="Arpejo" checked={showArpeggio} onChange={setShowArpeggio} />
          <Toggle label="Pentatônica" checked={showPentatonic} onChange={setShowPentatonic} />
        </Section>
      )}

      {/* Cores */}
      <Section title="Cores" hint="Mude como as notas são coloridas no braço." collapsible defaultOpen={false}>
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
      <Section title="Áudio" hint="Timbre, volume e efeitos. Clique nas notas no braço para ouvir." collapsible defaultOpen={false}>
        <AudioSettingsPanel />
      </Section>

      {/* Tamanho */}
      <Section title="Tamanho das Notas" hint="Ajuste o tamanho dos círculos no braço.">
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
      <Section title="Braço" hint="Ative para ver o braço completo com 24 casas.">
        <Toggle label="Mostrar até casa 24" checked={show24Frets} onChange={setShow24Frets} />
      </Section>

      {/* Dark mode */}
      <Section title="Tema">
        <Toggle label="Modo Noturno" checked={darkMode} onChange={setDarkMode} />
      </Section>

      {/* User info */}
      <UserFooter />
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

      {/* Octave */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Oitava</span>
          <span className="text-[9px] text-foreground font-semibold">{audio.octave > 0 ? `+${audio.octave}` : audio.octave}</span>
        </div>
        <div className="flex gap-1">
          {[-2, -1, 0, 1, 2].map(o => (
            <button
              key={o}
              onClick={() => set({ octave: o })}
              className={`flex-1 py-1 rounded text-[10px] font-semibold transition-all ${
                audio.octave === o
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {o > 0 ? `+${o}` : o}
            </button>
          ))}
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

      {/* Delay */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Delay</span>
          <span className="text-[9px] text-foreground font-semibold">{Math.round(audio.delay * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(audio.delay * 100)}
          onChange={e => set({ delay: Number(e.target.value) / 100 })}
          className="w-full accent-primary"
        />
        {audio.delay > 0.01 && (
          <div className="space-y-1 pl-2 border-l-2 border-primary/20 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Tempo</span>
              <span className="text-[9px] text-foreground font-semibold">{Math.round(audio.delayTime * 1000)}ms</span>
            </div>
            <input
              type="range"
              min={50}
              max={1000}
              value={Math.round(audio.delayTime * 1000)}
              onChange={e => set({ delayTime: Number(e.target.value) / 1000 })}
              className="w-full accent-primary"
            />
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Feedback</span>
              <span className="text-[9px] text-foreground font-semibold">{Math.round(audio.delayFeedback * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={85}
              value={Math.round(audio.delayFeedback * 100)}
              onChange={e => set({ delayFeedback: Number(e.target.value) / 100 })}
              className="w-full accent-primary"
            />
          </div>
        )}
      </div>

      {/* Distortion */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Distorção</span>
          <span className="text-[9px] text-foreground font-semibold">{Math.round(audio.distortion * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(audio.distortion * 100)}
          onChange={e => set({ distortion: Number(e.target.value) / 100 })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>Limpo</span>
          <span>Pesado</span>
        </div>
      </div>

      {/* Vibrato */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Vibrato</span>
          <span className="text-[9px] text-foreground font-semibold">{Math.round(audio.vibrato * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(audio.vibrato * 100)}
          onChange={e => set({ vibrato: Number(e.target.value) / 100 })}
          className="w-full accent-primary"
        />
        {audio.vibrato > 0.01 && (
          <div className="space-y-1 pl-2 border-l-2 border-primary/20 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">Velocidade</span>
              <span className="text-[9px] text-foreground font-semibold">{audio.vibratoSpeed.toFixed(1)} Hz</span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              value={Math.round(audio.vibratoSpeed * 10)}
              onChange={e => set({ vibratoSpeed: Number(e.target.value) / 10 })}
              className="w-full accent-primary"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, children, collapsible = false, defaultOpen = true }: { title: string; hint?: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      {collapsible ? (
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center justify-between text-[11px] uppercase tracking-wider mb-1 font-bold transition-colors duration-200 rounded px-2 py-1.5 ${
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
        <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-bold">{title}</h3>
      )}
      {hint && (!collapsible || open) && (
        <p className="text-[9px] text-muted-foreground/70 mb-2 px-1 leading-relaxed italic">{hint}</p>
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

function UserFooter() {
  const { displayName, signOut } = useAuth();
  return (
    <div className="mt-auto pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-xs font-medium text-foreground truncate">{displayName || 'Usuário'}</span>
        </div>
        <button
          onClick={signOut}
          className="text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all shrink-0"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

export default ControlPanel;
