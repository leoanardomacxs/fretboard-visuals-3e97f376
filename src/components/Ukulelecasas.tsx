import React, { useMemo, useState } from 'react';
import type { FretNote } from '@/lib/musicTheory';
import { playNote } from '@/lib/audioEngine';
import { NOTE_PALETTES, FUNCTION_PALETTES } from '@/components/ControlPanel';

interface UkuleleFretboardProps {
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

const STRING_NAMES = ['G', 'C', 'E', 'A'];

const INLAY_FRETS = [3, 5, 7, 10, 12, 15];
const DOUBLE_INLAY = [12];

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

const DEFAULT_NOTE_COLOR = 'hsl(210, 55%, 42%)';

const UkuleleFretboard: React.FC<UkuleleFretboardProps> = ({
  notes,
  maxFret = 12,
  startFret = 0,
  showNoteNames = true,
  showDegrees = false,
  colorMode = 'degree',
  compact = false,
  title,
  subtitle,
  noteRadius = 12,
  allowVertical = true,
  colorVariant = 0,
}) => {
  const [vertical, setVertical] = useState(false);
  const fretCount = maxFret - startFret;

  // ------------------ MAP ------------------
  const noteMap = useMemo(() => {
    const map = new Map<string, FretNote>();
    notes.forEach(n => {
      if (n.fret >= startFret && n.fret <= maxFret) {
        map.set(`${n.string}-${n.fret}`, n);
      }
    });
    return map;
  }, [notes, startFret, maxFret]);

  const UKULELE_STRING_OCTAVES = [67, 60, 64, 69]; 
// G4 = 67, C4 = 60, E4 = 64, A4 = 69 (MIDI numbers)

  // ------------------ PALETTES ------------------
  const noteColorMap = useMemo(
    () => NOTE_PALETTES[colorVariant] || NOTE_PALETTES[0],
    [colorVariant]
  );

  const funcPalette = useMemo(
    () => FUNCTION_PALETTES[colorVariant] || FUNCTION_PALETTES[0],
    [colorVariant]
  );

  // ------------------ COLOR ------------------
  const getNoteColor = (note: FretNote): string => {
    if (colorMode === 'note') {
      return noteColorMap[note.note] || DEFAULT_NOTE_COLOR;
    }

    if (colorMode === 'degree' && note.degree && note.degree > 0) {
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

  // ------------------ LABEL ------------------
  const getLabel = (note: FretNote): string => {
    if (showNoteNames && showDegrees && note.interval) {
      return `${note.note}\n${note.interval}`;
    }
    if (showDegrees && note.interval) return note.interval;
    return note.note;
  };

  // ------------------ DIMENSIONS ------------------
  const stringCount = 4;

  // Horizontal
  const hPaddingLeft = 44;
  const hPaddingRight = 24;
  const hPaddingTop = compact ? 16 : (title ? 50 : 24);
  const hPaddingBottom = 32;

  const hStringSpacing = compact ? 18 : 26;
  const hFretWidth = compact ? 42 : 60;

  const hBoardWidth = fretCount * hFretWidth;
  const hBoardHeight = (stringCount - 1) * hStringSpacing;

  const hSvgWidth = hPaddingLeft + hBoardWidth + hPaddingRight;
  const hSvgHeight = hPaddingTop + hBoardHeight + hPaddingBottom;

  // Vertical
  const vPaddingTop = compact ? 16 : (title ? 50 : 24);
  const vPaddingBottom = 24;
  const vPaddingLeft = 24;
  const vPaddingRight = 24;

  const vStringSpacing = compact ? 22 : 32;
  const vFretHeight = compact ? 36 : 48;

  const vBoardWidth = (stringCount - 1) * vStringSpacing;
  const vBoardHeight = fretCount * vFretHeight;

  const vSvgWidth = vPaddingLeft + vBoardWidth + vPaddingRight;
  const vSvgHeight = vPaddingTop + vBoardHeight + vPaddingBottom + 28;

  const svgWidth = vertical ? vSvgWidth : hSvgWidth;
  const svgHeight = vertical ? vSvgHeight : hSvgHeight;

  // ------------------ NOTE ------------------
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
        onClick={() => {
  // Calcula a nota MIDI real considerando a corda
  const stringBaseMidi = UKULELE_STRING_OCTAVES[note.string];
  const midi = stringBaseMidi + (note.fret ?? 0); 
  playNote(midi, 0.8, 0.35);
}}
      >
        <circle cx={x} cy={y} r={r} fill={color} opacity={0.92} />

        {hasTwo ? (
          <>
            <text
              x={x}
              y={y - 3}
              textAnchor="middle"
              fill="white"
              style={{ fontSize: fontSize - 1, fontWeight: 600 }}
            >
              {lines[0]}
            </text>
            <text
              x={x}
              y={y + 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.85)"
              style={{ fontSize: fontSize - 2, fontWeight: 500 }}
            >
              {lines[1]}
            </text>
          </>
        ) : (
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            style={{ fontSize, fontWeight: 600 }}
          >
            {label}
          </text>
        )}
      </g>
    );
  };

  // ------------------ HORIZONTAL ------------------
  const renderHorizontal = () => {
    return (
      <>
        {/* Title */}
        {title && (
          <>
            <text x={hPaddingLeft} y={16} className="fill-foreground"
              style={{ fontSize: compact ? 11 : 14, fontWeight: 600 }}>
              {title}
            </text>
            {subtitle && (
              <text x={hPaddingLeft} y={30} className="fill-muted-foreground"
                style={{ fontSize: compact ? 9 : 11 }}>
                {subtitle}
              </text>
            )}
          </>
        )}

        {/* Background */}
        <rect
          x={hPaddingLeft}
          y={hPaddingTop}
          width={hBoardWidth}
          height={hBoardHeight}
          fill="hsl(var(--fretboard-bg))"
          opacity={0.15}
          rx={2}
        />

        {/* Nut */}
        {startFret === 0 && (
          <line
            x1={hPaddingLeft}
            y1={hPaddingTop - 1}
            x2={hPaddingLeft}
            y2={hPaddingTop + hBoardHeight + 1}
            stroke="hsl(var(--foreground))"
            strokeWidth={3}
            opacity={0.7}
          />
        )}

        {/* Frets */}
        {Array.from({ length: fretCount + 1 }, (_, i) => {
          if (i === 0 && startFret === 0) return null;
          return (
            <line
              key={i}
              x1={hPaddingLeft + i * hFretWidth}
              y1={hPaddingTop}
              x2={hPaddingLeft + i * hFretWidth}
              y2={hPaddingTop + hBoardHeight}
              stroke="hsl(var(--foreground))"
              strokeWidth={0.8}
              opacity={0.25}
            />
          );
        })}

        {/* Strings */}
        {Array.from({ length: stringCount }, (_, i) => {
          const y = hPaddingTop + i * hStringSpacing;
          const thickness = 1 + i * 0.15;
          return (
            <line
              key={i}
              x1={hPaddingLeft}
              y1={y}
              x2={hPaddingLeft + hBoardWidth}
              y2={y}
              stroke="hsl(var(--foreground))"
              strokeWidth={thickness}
              opacity={0.35}
            />
          );
        })}

        {/* Inlays */}
        {INLAY_FRETS.filter(f => f > startFret && f <= maxFret).map(f => {
          const x = hPaddingLeft + (f - startFret - 0.5) * hFretWidth;
          const isDouble = DOUBLE_INLAY.includes(f);

          if (isDouble) {
            return (
              <g key={f}>
                <circle cx={x} cy={hPaddingTop + hBoardHeight * 0.3} r={3} opacity={0.12} fill="hsl(var(--foreground))"/>
                <circle cx={x} cy={hPaddingTop + hBoardHeight * 0.7} r={3} opacity={0.12} fill="hsl(var(--foreground))"/>
              </g>
            );
          }

          return (
            <circle
              key={f}
              cx={x}
              cy={hPaddingTop + hBoardHeight / 2}
              r={3}
              opacity={0.12}
              fill="hsl(var(--foreground))"
            />
          );
        })}

        {/* Notes */}
        {Array.from(noteMap.values()).map((note, idx) => {
          const x = note.fret === 0
            ? hPaddingLeft - 6
            : hPaddingLeft + (note.fret - startFret - 0.5) * hFretWidth;

          const y = hPaddingTop + (stringCount - 1 - note.string) * hStringSpacing;

          return renderNote(note, x, y, idx);
        })}
      </>
    );
  };

  // ------------------ VERTICAL ------------------
  const renderVertical = () => {
    return (
      <>
        {/* Background */}
        <rect
          x={vPaddingLeft}
          y={vPaddingTop}
          width={vBoardWidth}
          height={vBoardHeight}
          fill="hsl(var(--fretboard-bg))"
          opacity={0.15}
          rx={2}
        />

        {/* Nut */}
        {startFret === 0 && (
          <line
            x1={vPaddingLeft - 1}
            y1={vPaddingTop}
            x2={vPaddingLeft + vBoardWidth + 1}
            y2={vPaddingTop}
            stroke="hsl(var(--foreground))"
            strokeWidth={3}
            opacity={0.7}
          />
        )}

        {/* Frets */}
        {Array.from({ length: fretCount + 1 }, (_, i) => {
          if (i === 0 && startFret === 0) return null;
          return (
            <line
              key={i}
              x1={vPaddingLeft}
              y1={vPaddingTop + i * vFretHeight}
              x2={vPaddingLeft + vBoardWidth}
              y2={vPaddingTop + i * vFretHeight}
              stroke="hsl(var(--foreground))"
              strokeWidth={0.8}
              opacity={0.25}
            />
          );
        })}

        {/* Strings */}
        {Array.from({ length: stringCount }, (_, i) => {
          const x = vPaddingLeft + i * vStringSpacing;
          const thickness = 1 + (stringCount - i) * 0.12;

          return (
            <line
              key={i}
              x1={x}
              y1={vPaddingTop}
              x2={x}
              y2={vPaddingTop + vBoardHeight}
              stroke="hsl(var(--foreground))"
              strokeWidth={thickness}
              opacity={0.35}
            />
          );
        })}

        {/* Notes */}
        {Array.from(noteMap.values()).map((note, idx) => {
          const x = vPaddingLeft + note.string * vStringSpacing;

          const y = note.fret === 0
            ? vPaddingTop - 6
            : vPaddingTop + (note.fret - startFret - 0.5) * vFretHeight;

          return renderNote(note, x, y, idx);
        })}
      </>
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

      {allowVertical && (
        <button
          onClick={() => setVertical(!vertical)}
          className={`absolute bottom-1 right-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all border ${
            vertical
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
          }`}
        >
          {vertical ? '↔ Horizontal' : '↕ Vertical'}
        </button>
      )}
    </div>
  );
};

export default UkuleleFretboard;