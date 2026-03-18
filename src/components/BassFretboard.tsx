import React, { useMemo, useState } from 'react';
import type { FretNote } from '@/lib/musicTheory';
import { playNote } from '@/lib/audioEngine';
import { NOTE_PALETTES, FUNCTION_PALETTES } from '@/components/ControlPanel';

interface BassFretboardProps {
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
  colorVariant?: number;
}

const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAY = [12, 24];

const DEGREE_COLORS: Record<number, string> = {
  1: 'var(--degree-1)', 2: 'var(--degree-2)', 3: 'var(--degree-3)',
  4: 'var(--degree-4)', 5: 'var(--degree-5)', 6: 'var(--degree-6)', 7: 'var(--degree-7)',
};

function getDegreeHSL(degree: number): string {
  const c = DEGREE_COLORS[degree];
  return c ? `hsl(${c})` : 'hsl(210, 50%, 45%)';
}

const DEFAULT_NOTE_COLOR = 'hsl(210, 55%, 42%)';
const STRING_NAMES = ['G', 'D', 'A', 'E']; // high to low display

const BassFretboard: React.FC<BassFretboardProps> = ({
  notes, maxFret = 12, startFret = 0, showNoteNames = true, showDegrees = false,
  colorMode = 'degree', compact = false, title, subtitle, noteRadius = 16, colorVariant = 0,
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
      return note.isRoot ? getDegreeHSL(1) : getDegreeHSL(note.degree);
    }
    if (colorMode === 'function') {
      if (note.isRoot) return funcPalette.root;
      if (note.isChordTone) return funcPalette.chord;
      return funcPalette.default;
    }
    if (note.isRoot) return funcPalette.root;
    return DEFAULT_NOTE_COLOR;
  };

  const getLabel = (note: FretNote): string => {
    if (showNoteNames && showDegrees && note.interval) return `${note.note}\n${note.interval}`;
    if (showDegrees && note.interval) return note.interval;
    return note.note;
  };

  const paddingLeft = 44;
  const paddingRight = 24;
  const paddingTop = compact ? 16 : (title ? 50 : 24);
  const paddingBottom = 32;
  const stringSpacing = compact ? 24 : 32;
  const fretWidth = compact ? 46 : 64;
  const boardWidth = fretCount * fretWidth;
  const boardHeight = 3 * stringSpacing; // 4 strings = 3 gaps
  const svgWidth = paddingLeft + boardWidth + paddingRight;
  const svgHeight = paddingTop + boardHeight + paddingBottom;

  const renderNote = (note: FretNote, x: number, y: number, idx: number) => {
    const r = note.isRoot ? noteRadius * 1.15 : noteRadius;
    const color = getNoteColor(note);
    const label = getLabel(note);
    const hasTwo = label.includes('\n');
    const lines = label.split('\n');
    const fontSize = compact ? 9 : (hasTwo ? 9 : (r < 14 ? 9 : 11));

    return (
      <g key={`note-${note.string}-${note.fret}`} className="note-appear cursor-pointer"
        style={{ animationDelay: `${idx * 8}ms` }}
        onClick={() => playNote(note.midi, 1.0, 0.4)}
      >
        <circle cx={x} cy={y} r={r} fill={color} opacity={0.92} />
        {hasTwo ? (
          <>
            <text x={x} y={y - 4} textAnchor="middle" dominantBaseline="middle" fill="white"
              style={{ fontSize: fontSize - 1, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{lines[0]}</text>
            <text x={x} y={y + 7} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)"
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
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="select-none" style={{ maxWidth: '100%', height: 'auto' }}
      >
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
            stroke="hsl(var(--foreground))" strokeWidth={3.5} opacity={0.7} />
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

        {/* Strings — thicker for bass */}
        {Array.from({ length: 4 }, (_, i) => {
          const y = paddingTop + i * stringSpacing;
          const thickness = 1.0 + i * 0.35;
          return (
            <line key={`string-${i}`}
              x1={paddingLeft} y1={y} x2={paddingLeft + boardWidth} y2={y}
              stroke="hsl(var(--foreground))" strokeWidth={thickness} opacity={0.4} />
          );
        })}

        {/* Inlays */}
        {INLAY_FRETS.filter(f => f > startFret && f <= maxFret).map(f => {
          const x = paddingLeft + (f - startFret - 0.5) * fretWidth;
          const isDouble = DOUBLE_INLAY.includes(f);
          const dotR = compact ? 3 : 3.5;
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
            style={{ fontSize: compact ? 9 : 11, fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
            {startFret + i + 1}
          </text>
        ))}

        {/* String labels */}
        {STRING_NAMES.map((name, i) => (
          <text key={`sname-${i}`}
            x={paddingLeft - 14} y={paddingTop + i * stringSpacing + 4}
            textAnchor="middle" className="fill-muted-foreground"
            style={{ fontSize: compact ? 10 : 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
            {name}
          </text>
        ))}

        {/* Notes */}
        {Array.from(noteMap.values()).map((note, idx) => {
          const x = note.fret === 0 ? paddingLeft - 6 : paddingLeft + (note.fret - startFret - 0.5) * fretWidth;
          const y = paddingTop + (3 - note.string) * stringSpacing;
          return renderNote(note, x, y, idx);
        })}
      </svg>
    </div>
  );
};

export default BassFretboard;
