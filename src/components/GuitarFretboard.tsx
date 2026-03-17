import React, { useMemo, useState } from 'react';
import type { FretNote } from '@/lib/musicTheory';
import { playNote } from '@/lib/audioEngine';
import { NOTE_PALETTES, FUNCTION_PALETTES } from '@/components/ControlPanel';

interface GuitarFretboardProps {
  notes: FretNote[];
  maxFret?: number;
  startFret?: number;
  showNoteNames?: boolean;
  showDegrees?: boolean;
  colorMode?: 'degree' | 'note' | 'function';
  compact?: boolean;
  title?: string;
  subtitle?: string;
  noteRadius?: number;
  allowVertical?: boolean;
  colorVariant?: number;
}

const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAY = [12, 24];

const DEGREE_COLORS: Record<number, string> = {
  1: 'var(--degree-1)',
  2: 'var(--degree-2)',
  3: 'var(--degree-3)',
  4: 'var(--degree-4)',
  5: 'var(--degree-5)',
  6: 'var(--degree-6)',
  7: 'var(--degree-7)',
};

function getDegreeHSL(degree: number): string {
  const c = DEGREE_COLORS[degree];
  return c ? `hsl(${c})` : 'hsl(210, 50%, 45%)';
}

const NOTE_COLORS: Record<string, string> = {
  'C': '#e74c3c', 'C#': '#e67e22', 'Db': '#e67e22',
  'D': '#f1c40f', 'D#': '#2ecc71', 'Eb': '#2ecc71',
  'E': '#1abc9c', 'F': '#3498db', 'F#': '#9b59b6', 'Gb': '#9b59b6',
  'G': '#e91e63', 'G#': '#ff5722', 'Ab': '#ff5722',
  'A': '#00bcd4', 'A#': '#8bc34a', 'Bb': '#8bc34a',
  'B': '#795548',
};

const DEFAULT_NOTE_COLOR = 'hsl(210, 55%, 42%)';
const ROOT_NOTE_COLOR = 'hsl(280, 40%, 35%)';

const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'];

const GuitarFretboard: React.FC<GuitarFretboardProps> = ({
  notes,
  maxFret = 12,
  startFret = 0,
  showNoteNames = true,
  showDegrees = false,
  colorMode = 'degree',
  compact = false,
  title,
  subtitle,
  noteRadius = 14,
  allowVertical = true,
  colorVariant = 0,
}) => {
  const [vertical, setVertical] = useState(false);
  const fretCount = maxFret - startFret;

  const noteMap = useMemo(() => {
    const map = new Map<string, FretNote>();
    notes.forEach(n => {
      if (n.fret >= startFret && n.fret <= maxFret) {
        map.set(`${n.string}-${n.fret}`, n);
      }
    });
    return map;
  }, [notes, startFret, maxFret]);

  const noteColorMap = useMemo(() => NOTE_PALETTES[colorVariant] || NOTE_PALETTES[0], [colorVariant]);
  const funcPalette = useMemo(() => FUNCTION_PALETTES[colorVariant] || FUNCTION_PALETTES[0], [colorVariant]);

  const getNoteColor = (note: FretNote): string => {
    if (colorMode === 'note') return noteColorMap[note.note] || DEFAULT_NOTE_COLOR;
    if (colorMode === 'degree' && note.degree && note.degree > 0) {
      // Degree colors come from CSS vars (set dynamically by Index.tsx)
      if (note.isRoot) return getDegreeHSL(1);
      return getDegreeHSL(note.degree);
    }
    if (colorMode === 'function') {
      if (note.isRoot) return funcPalette.root;
      if (note.isChordTone) return funcPalette.chord;
      return funcPalette.default;
    }
    if (note.isRoot) return funcPalette.root;
    if (note.isChordTone) return getDegreeHSL(5);
    return DEFAULT_NOTE_COLOR;
  };

  const getLabel = (note: FretNote): string => {
    if (showNoteNames && showDegrees && note.interval) return `${note.note}\n${note.interval}`;
    if (showDegrees && note.interval) return note.interval;
    return note.note;
  };

  // ---- Horizontal layout (default) ----
  const hPaddingLeft = 44;
  const hPaddingRight = 24;
  const hPaddingTop = compact ? 16 : (title ? 50 : 24);
  const hPaddingBottom = 32;
  const hStringSpacing = compact ? 18 : 26;
  const hFretWidth = compact ? 42 : 60;
  const hBoardWidth = fretCount * hFretWidth;
  const hBoardHeight = 5 * hStringSpacing;
  const hSvgWidth = hPaddingLeft + hBoardWidth + hPaddingRight;
  const hSvgHeight = hPaddingTop + hBoardHeight + hPaddingBottom;

  // ---- Vertical layout ----
  const vPaddingTop = compact ? 16 : (title ? 50 : 24);
  const vPaddingBottom = 24;
  const vPaddingLeft = 24;
  const vPaddingRight = 24;
  const vStringSpacing = compact ? 22 : 32;
  const vFretHeight = compact ? 36 : 48;
  const vBoardWidth = 5 * vStringSpacing;
  const vBoardHeight = fretCount * vFretHeight;
  const vSvgWidth = vPaddingLeft + vBoardWidth + vPaddingRight;
  const vSvgHeight = vPaddingTop + vBoardHeight + vPaddingBottom + 28; // extra for fret labels at bottom

  const svgWidth = vertical ? vSvgWidth : hSvgWidth;
  const svgHeight = vertical ? vSvgHeight : hSvgHeight;

  const renderHorizontal = () => {
    const paddingLeft = hPaddingLeft;
    const paddingTop = hPaddingTop;
    const stringSpacing = hStringSpacing;
    const fretWidth = hFretWidth;
    const boardWidth = hBoardWidth;
    const boardHeight = hBoardHeight;

    return (
      <>
        {/* Title */}
        {title && (
          <>
            <text x={paddingLeft} y={16} className="fill-foreground"
              style={{ fontSize: compact ? 11 : 14, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{title}</text>
            {subtitle && (
              <text x={paddingLeft} y={30} className="fill-muted-foreground"
                style={{ fontSize: compact ? 9 : 11, fontWeight: 400, fontFamily: 'Inter, sans-serif' }}>{subtitle}</text>
            )}
          </>
        )}

        {/* Fretboard background */}
        <rect x={paddingLeft} y={paddingTop} width={boardWidth} height={boardHeight}
          fill="hsl(var(--fretboard-bg))" opacity={0.15} rx={2} />

        {/* Nut */}
        {startFret === 0 && (
          <line x1={paddingLeft} y1={paddingTop - 1} x2={paddingLeft} y2={paddingTop + boardHeight + 1}
            stroke="hsl(var(--foreground))" strokeWidth={3} opacity={0.7} />
        )}

        {/* Fret lines */}
        {Array.from({ length: fretCount + 1 }, (_, i) => {
          if (i === 0 && startFret === 0) return null;
          return (
            <line key={`fret-${i}`}
              x1={paddingLeft + i * fretWidth} y1={paddingTop}
              x2={paddingLeft + i * fretWidth} y2={paddingTop + boardHeight}
              stroke="hsl(var(--foreground))" strokeWidth={0.8} opacity={0.25} />
          );
        })}

        {/* Strings */}
        {Array.from({ length: 6 }, (_, i) => {
          const y = paddingTop + i * stringSpacing;
          const thickness = 0.7 + i * 0.15;
          return (
            <line key={`string-${i}`}
              x1={paddingLeft} y1={y} x2={paddingLeft + boardWidth} y2={y}
              stroke="hsl(var(--foreground))" strokeWidth={thickness} opacity={0.35} />
          );
        })}

        {/* Inlays */}
        {INLAY_FRETS.filter(f => f > startFret && f <= maxFret).map(f => {
          const x = paddingLeft + (f - startFret - 0.5) * fretWidth;
          const isDouble = DOUBLE_INLAY.includes(f);
          const dotR = compact ? 2.5 : 3;
          if (isDouble) {
            return (
              <g key={`inlay-${f}`}>
                <circle cx={x} cy={paddingTop + boardHeight * 0.3} r={dotR} fill="hsl(var(--foreground))" opacity={0.12} />
                <circle cx={x} cy={paddingTop + boardHeight * 0.7} r={dotR} fill="hsl(var(--foreground))" opacity={0.12} />
              </g>
            );
          }
          return <circle key={`inlay-${f}`} cx={x} cy={paddingTop + boardHeight / 2} r={dotR} fill="hsl(var(--foreground))" opacity={0.12} />;
        })}

        {/* Fret numbers */}
        {Array.from({ length: fretCount }, (_, i) => (
          <text key={`fnum-${i}`}
            x={paddingLeft + (i + 0.5) * fretWidth} y={paddingTop + boardHeight + 18}
            textAnchor="middle" className="fill-muted-foreground"
            style={{ fontSize: compact ? 8 : 10, fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
            {startFret + i + 1}
          </text>
        ))}

        {/* String labels */}
        {STRING_NAMES.map((name, i) => (
          <text key={`sname-${i}`}
            x={paddingLeft - 14} y={paddingTop + i * stringSpacing + 4}
            textAnchor="middle" className="fill-muted-foreground"
            style={{ fontSize: compact ? 9 : 11, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
            {name}
          </text>
        ))}

        {/* Notes */}
        {Array.from(noteMap.values()).map((note, idx) => {
          const x = note.fret === 0 ? paddingLeft - 6 : paddingLeft + (note.fret - startFret - 0.5) * fretWidth;
          const y = paddingTop + (5 - note.string) * stringSpacing;
          return renderNote(note, x, y, idx);
        })}
      </>
    );
  };

  const renderVertical = () => {
    const paddingTop = vPaddingTop;
    const paddingLeft = vPaddingLeft;
    const stringSpacing = vStringSpacing;
    const fretHeight = vFretHeight;
    const boardWidth = vBoardWidth;
    const boardHeight = vBoardHeight;

    return (
      <>
        {/* Title */}
        {title && (
          <>
            <text x={paddingLeft} y={16} className="fill-foreground"
              style={{ fontSize: compact ? 11 : 14, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{title}</text>
            {subtitle && (
              <text x={paddingLeft} y={30} className="fill-muted-foreground"
                style={{ fontSize: compact ? 9 : 11, fontWeight: 400, fontFamily: 'Inter, sans-serif' }}>{subtitle}</text>
            )}
          </>
        )}

        {/* Fretboard background */}
        <rect x={paddingLeft} y={paddingTop} width={boardWidth} height={boardHeight}
          fill="hsl(var(--fretboard-bg))" opacity={0.15} rx={2} />

        {/* Nut — thick top edge */}
        {startFret === 0 && (
          <line x1={paddingLeft - 1} y1={paddingTop} x2={paddingLeft + boardWidth + 1} y2={paddingTop}
            stroke="hsl(var(--foreground))" strokeWidth={3} opacity={0.7} />
        )}

        {/* Fret lines — horizontal */}
        {Array.from({ length: fretCount + 1 }, (_, i) => {
          if (i === 0 && startFret === 0) return null;
          return (
            <line key={`fret-${i}`}
              x1={paddingLeft} y1={paddingTop + i * fretHeight}
              x2={paddingLeft + boardWidth} y2={paddingTop + i * fretHeight}
              stroke="hsl(var(--foreground))" strokeWidth={0.8} opacity={0.25} />
          );
        })}

        {/* Strings — vertical lines */}
        {/* In vertical mode: string 0 (low E) on the left, string 5 (high E) on the right */}
        {Array.from({ length: 6 }, (_, i) => {
          const x = paddingLeft + i * stringSpacing;
          // i=0 is left (low E, thick), i=5 is right (high E, thin)
          const thickness = 0.7 + (5 - i) * 0.15;
          return (
            <line key={`string-${i}`}
              x1={x} y1={paddingTop} x2={x} y2={paddingTop + boardHeight}
              stroke="hsl(var(--foreground))" strokeWidth={thickness} opacity={0.35} />
          );
        })}

        {/* Inlays */}
        {INLAY_FRETS.filter(f => f > startFret && f <= maxFret).map(f => {
          const y = paddingTop + (f - startFret - 0.5) * fretHeight;
          const isDouble = DOUBLE_INLAY.includes(f);
          const dotR = compact ? 2.5 : 3;
          if (isDouble) {
            return (
              <g key={`inlay-${f}`}>
                <circle cx={paddingLeft + boardWidth * 0.3} cy={y} r={dotR} fill="hsl(var(--foreground))" opacity={0.12} />
                <circle cx={paddingLeft + boardWidth * 0.7} cy={y} r={dotR} fill="hsl(var(--foreground))" opacity={0.12} />
              </g>
            );
          }
          return <circle key={`inlay-${f}`} cx={paddingLeft + boardWidth / 2} cy={y} r={dotR} fill="hsl(var(--foreground))" opacity={0.12} />;
        })}

        {/* Fret numbers — on the right side */}
        {Array.from({ length: fretCount }, (_, i) => (
          <text key={`fnum-${i}`}
            x={paddingLeft + boardWidth + 14} y={paddingTop + (i + 0.5) * fretHeight + 4}
            textAnchor="middle" className="fill-muted-foreground"
            style={{ fontSize: compact ? 8 : 10, fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
            {startFret + i + 1}
          </text>
        ))}

        {/* String labels at top */}
        {/* Reversed: low E on left, high E on right */}
        {[...STRING_NAMES].reverse().map((name, i) => (
          <text key={`sname-${i}`}
            x={paddingLeft + i * stringSpacing} y={paddingTop - 8}
            textAnchor="middle" className="fill-muted-foreground"
            style={{ fontSize: compact ? 9 : 11, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
            {name}
          </text>
        ))}

        {/* Notes */}
        {Array.from(noteMap.values()).map((note, idx) => {
          // In vertical: string maps to X (low E = left = index 0), fret maps to Y
          const x = note.fret === 0
            ? paddingLeft + note.string * stringSpacing
            : paddingLeft + note.string * stringSpacing;
          const y = note.fret === 0
            ? paddingTop - 6
            : paddingTop + (note.fret - startFret - 0.5) * fretHeight;
          return renderNote(note, x, y, idx);
        })}
      </>
    );
  };

  const renderNote = (note: FretNote, x: number, y: number, idx: number) => {
    const r = note.isRoot ? noteRadius * 1.15 : noteRadius;
    const color = getNoteColor(note);
    const label = getLabel(note);
    const hasTwo = label.includes('\n');
    const lines = label.split('\n');
    const fontSize = compact ? 8 : (hasTwo ? 8 : (r < 12 ? 8 : 10));

    return (
      <g
        key={`note-${note.string}-${note.fret}`}
        className="note-appear cursor-pointer"
        style={{ animationDelay: `${idx * 8}ms` }}
        onClick={() => playNote(note.midi, 0.8, 0.35)}
      >
        <circle cx={x} cy={y} r={r} fill={color} opacity={0.92} />
        {hasTwo ? (
          <>
            <text x={x} y={y - 3} textAnchor="middle" dominantBaseline="middle" fill="white"
              style={{ fontSize: fontSize - 1, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{lines[0]}</text>
            <text x={x} y={y + 6} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)"
              style={{ fontSize: fontSize - 2, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>{lines[1]}</text>
          </>
        ) : (
          <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="white"
            style={{ fontSize, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{label}</text>
        )}
      </g>
    );
  };

  return (
    <div className="inline-block relative">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="select-none"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {vertical ? renderVertical() : renderHorizontal()}
      </svg>

      {/* Vertical toggle button */}
      {allowVertical && (
        <button
          onClick={() => setVertical(!vertical)}
          className={`absolute bottom-1 right-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all border ${
            vertical
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
          }`}
          title={vertical ? 'Ver na horizontal' : 'Ver na vertical'}
        >
          {vertical ? '↔ Horizontal' : '↕ Vertical'}
        </button>
      )}
    </div>
  );
};

export default GuitarFretboard;
