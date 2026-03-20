import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstrument } from '@/contexts/InstrumentContext';
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
  | 'compare-pentatonics' | 'improvisation' | 'chord-generator' | 'progressions' | 'harmonic-field-view';

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

// Color variant palettes — each mode has multiple palettes that cycle on re-click
const DEGREE_PALETTES: string[][] = [
  // 0: Rainbow (espectro cromático)
  ['0 80% 50%', '30 90% 50%', '60 80% 45%', '120 65% 40%', '200 80% 50%', '260 70% 55%', '310 70% 50%'],
  // 1: Default (warm/cool mix)
  ['0 75% 55%', '210 75% 55%', '145 65% 42%', '220 12% 55%', '28 90% 55%', '270 60% 55%', '220 20% 25%'],
  // 2: Ocean (tons frios)
  ['190 80% 40%', '210 85% 50%', '230 75% 55%', '170 60% 42%', '250 65% 55%', '280 50% 50%', '200 30% 35%'],
  // 3: Sunset (tons quentes)
  ['0 85% 55%', '15 90% 52%', '35 95% 50%', '50 85% 48%', '350 75% 50%', '320 60% 50%', '280 45% 40%'],
  // 4: Neon (vibrante)
  ['340 100% 60%', '180 100% 45%', '60 100% 50%', '120 100% 40%', '280 100% 60%', '30 100% 55%', '200 100% 55%'],
  // 5: Pastel (suave)
  ['0 55% 70%', '210 55% 70%', '145 45% 60%', '40 50% 65%', '270 45% 70%', '170 45% 60%', '300 40% 68%'],
];

const NOTE_PALETTES: Record<string, string>[] = [
  // 0: Default vivid
  { C:'#e74c3c', 'C#':'#e67e22', Db:'#e67e22', D:'#f1c40f', 'D#':'#2ecc71', Eb:'#2ecc71', E:'#1abc9c', F:'#3498db', 'F#':'#9b59b6', Gb:'#9b59b6', G:'#e91e63', 'G#':'#ff5722', Ab:'#ff5722', A:'#00bcd4', 'A#':'#8bc34a', Bb:'#8bc34a', B:'#795548' },
  // 1: Chromatic rainbow (evenly spaced hue)
  { C:'hsl(0,75%,50%)', 'C#':'hsl(30,75%,50%)', Db:'hsl(30,75%,50%)', D:'hsl(60,75%,45%)', 'D#':'hsl(90,70%,40%)', Eb:'hsl(90,70%,40%)', E:'hsl(120,65%,40%)', F:'hsl(150,70%,42%)', 'F#':'hsl(180,70%,42%)', Gb:'hsl(180,70%,42%)', G:'hsl(210,75%,50%)', 'G#':'hsl(240,65%,55%)', Ab:'hsl(240,65%,55%)', A:'hsl(270,65%,50%)', 'A#':'hsl(300,65%,50%)', Bb:'hsl(300,65%,50%)', B:'hsl(330,70%,50%)' },
  // 2: Pastel chromatic
  { C:'hsl(0,50%,70%)', 'C#':'hsl(30,50%,68%)', Db:'hsl(30,50%,68%)', D:'hsl(60,50%,62%)', 'D#':'hsl(90,45%,58%)', Eb:'hsl(90,45%,58%)', E:'hsl(120,45%,55%)', F:'hsl(150,50%,58%)', 'F#':'hsl(180,50%,55%)', Gb:'hsl(180,50%,55%)', G:'hsl(210,55%,65%)', 'G#':'hsl(240,45%,65%)', Ab:'hsl(240,45%,65%)', A:'hsl(270,45%,62%)', 'A#':'hsl(300,45%,62%)', Bb:'hsl(300,45%,62%)', B:'hsl(330,50%,65%)' },
  // 3: Earth tones
  { C:'hsl(5,60%,45%)', 'C#':'hsl(20,55%,42%)', Db:'hsl(20,55%,42%)', D:'hsl(35,65%,45%)', 'D#':'hsl(50,55%,40%)', Eb:'hsl(50,55%,40%)', E:'hsl(80,40%,38%)', F:'hsl(140,35%,40%)', 'F#':'hsl(170,40%,38%)', Gb:'hsl(170,40%,38%)', G:'hsl(200,45%,42%)', 'G#':'hsl(220,40%,45%)', Ab:'hsl(220,40%,45%)', A:'hsl(250,35%,45%)', 'A#':'hsl(280,30%,42%)', Bb:'hsl(280,30%,42%)', B:'hsl(320,35%,40%)' },
];

const FUNCTION_PALETTES: { root: string; chord: string; default: string }[] = [
  // 0: Default
  { root: 'hsl(280, 40%, 35%)', chord: 'hsl(145, 65%, 42%)', default: 'hsl(210, 55%, 42%)' },
  // 1: Warm
  { root: 'hsl(0, 70%, 45%)', chord: 'hsl(35, 85%, 48%)', default: 'hsl(50, 50%, 42%)' },
  // 2: Cool
  { root: 'hsl(200, 80%, 40%)', chord: 'hsl(260, 60%, 50%)', default: 'hsl(180, 45%, 40%)' },
  // 3: High contrast
  { root: 'hsl(0, 90%, 50%)', chord: 'hsl(120, 80%, 35%)', default: 'hsl(220, 70%, 50%)' },
];

const COLOR_VARIANT_COUNTS: Record<string, number> = {
  degree: DEGREE_PALETTES.length,
  note: NOTE_PALETTES.length,
  function: FUNCTION_PALETTES.length,
};

export { DEGREE_PALETTES, NOTE_PALETTES, FUNCTION_PALETTES };


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
  const { instrument } = useInstrument();
  const isBass = instrument === 'bass';
  const instrumentLabel = instrument === 'bass' ? 'Bass Theory' : instrument === 'piano' ? 'Piano Theory' : 'Guitar Theory';
  const instrumentSubtitle = instrument === 'bass' ? 'Estudo de Baixo' : instrument === 'piano' ? 'Estudo de Piano' : 'Estudo Visual Interativo';

  return (
    <aside className="w-72 shrink-0 h-screen overflow-y-auto bg-card border-r border-border p-4 space-y-5 scrollbar-thin">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <span className="text-2xl font-bold">{instrument === 'bass' ? 'BT' : instrument === 'piano' ? 'PT' : 'GT'}</span>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">{instrumentLabel}</h1>
          <p className="text-xs text-muted-foreground">{instrumentSubtitle}</p>
        </div>
      </div>

      {/* Tonalidade */}
      <Section title="Tonalidade">
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



      <div>
  <button
    onClick={() => {
      playClick(500);
      setViewMode('full'); // ou criar 'scale' se quiser separar
    }}
    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
      !['chord-generator','progressions','harmonic-field-view'].includes(viewMode)
        ? 'bg-primary text-primary-foreground shadow-md'
        : 'bg-secondary text-foreground hover:bg-secondary/80'
    }`}
  >
    Gerador de escalas
  </button>
</div>

      {/* Gerador de Acordes — botão exclusivo (hidden for bass) */}
      {!isBass && (
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
        </div>
      )}


      {/* Progressões — botão exclusivo */}
      {!isBass && (
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
        </div>
      )}


      {/* Campo Harmônico — botão exclusivo */}
      {!isBass && (
        <div>
          <button
            onClick={() => { playClick(500); setViewMode('harmonic-field-view'); }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              viewMode === 'harmonic-field-view'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            Campo Harmônico
          </button>
        </div>
      )}

      {/* Visualização */}
      <Section title="Visualização" collapsible defaultOpen={false}>
        <div className="space-y-0.5">
          {VIEW_MODES.filter(m => {
            // For bass, hide chord-specific views
            if (isBass && ['chord', 'improvisation', 'chord-generator'].includes(m.value)) return false;
            return true;
          }).map(m => (
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
        {(['degree', 'note', 'function'] as const).map(c => {
          const variantCount = COLOR_VARIANT_COUNTS[c];
          const isActive = colorMode === c;
          return (
            <button
              key={c}
              onClick={() => {
                if (isActive) {
                  // Cycle variant
                  setColorVariant((colorVariant + 1) % variantCount);
                } else {
                  setColorMode(c);
                  setColorVariant(0);
                }
                playClick(650);
              }}
              className={`w-full text-left px-2 py-1 rounded text-xs transition-all flex items-center justify-between ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary'
              }`}
            >
              <span>{c === 'degree' ? 'Por Grau' : c === 'note' ? 'Por Nota' : 'Por Função'}</span>
              {isActive && variantCount > 1 && (
                <span className="text-[9px] opacity-75">
                  {colorVariant + 1}/{variantCount}
                </span>
              )}
            </button>
          );
        })}
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
      <Section title={instrument === 'piano' ? 'Teclado' : 'Braço'}>
  <Toggle
    label={instrument === 'piano' ? 'Dobrar Piano' : 'Mostrar até casa 24'}
    checked={show24Frets}
    onChange={setShow24Frets}
  />
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
