import React, { useMemo, useCallback } from 'react';
import type { FretNote } from '@/lib/musicTheory';
import { playNote } from '@/lib/audioEngine';

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

// Default note color — a calm steel blue for the minimalist look
const DEFAULT_NOTE_COLOR = 'hsl(210, 55%, 42%)';
const ROOT_NOTE_COLOR = 'hsl(280, 40%, 35%)';

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
}) => {
  const fretCount = maxFret - startFret;
  const paddingLeft = 44;
  const paddingRight = 24;
  const paddingTop = compact ? 16 : (title ? 50 : 24);
  const paddingBottom = 32;
  const stringSpacing = compact ? 18 : 26;
  const fretWidth = compact ? 42 : 60;

  const boardWidth = fretCount * fretWidth;
  const boardHeight = 5 * stringSpacing;
  const svgWidth = paddingLeft + boardWidth + paddingRight;
  const svgHeight = paddingTop + boardHeight + paddingBottom;

  const noteMap = useMemo(() => {
    const map = new Map<string, FretNote>();
    notes.forEach(n => {
      if (n.fret >= startFret && n.fret <= maxFret) {
        map.set(`${n.string}-${n.fret}`, n);
      }
    });
    return map;
  }, [notes, startFret, maxFret]);

  const getNoteColor = (note: FretNote): string => {
    if (colorMode === 'note') return NOTE_COLORS[note.note] || DEFAULT_NOTE_COLOR;
    if (colorMode === 'degree' && note.degree && note.degree > 0) {
      if (note.isRoot) return getDegreeHSL(1);
      return getDegreeHSL(note.degree);
    }
    if (note.isRoot) return ROOT_NOTE_COLOR;
    if (note.isChordTone) return getDegreeHSL(5);
    return DEFAULT_NOTE_COLOR;
  };

  const getLabel = (note: FretNote): string => {
    if (showNoteNames && showDegrees && note.degree) return `${note.note}\n${note.degree}`;
    if (showDegrees && note.degree) return `${note.degree}`;
    if (showDegrees && note.interval) return note.interval;
    return note.note;
  };

  return (
    <div className="inline-block">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="select-none"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Title */}
        {title && (
          <>
            <text
              x={paddingLeft}
              y={16}
              className="fill-foreground"
              style={{ fontSize: compact ? 11 : 14, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
            >
              {title}
            </text>
            {subtitle && (
              <text
                x={paddingLeft}
                y={30}
                className="fill-muted-foreground"
                style={{ fontSize: compact ? 9 : 11, fontWeight: 400, fontFamily: 'Inter, sans-serif' }}
              >
                {subtitle}
              </text>
            )}
          </>
        )}

        {/* Light fretboard background */}
        <rect
          x={paddingLeft}
          y={paddingTop}
          width={boardWidth}
          height={boardHeight}
          fill="hsl(var(--fretboard-bg))"
          opacity={0.15}
          rx={2}
        />

        {/* Nut — thick left edge */}
        {startFret === 0 && (
          <line
            x1={paddingLeft}
            y1={paddingTop - 1}
            x2={paddingLeft}
            y2={paddingTop + boardHeight + 1}
            stroke="hsl(var(--foreground))"
            strokeWidth={3}
            opacity={0.7}
          />
        )}

        {/* Fret lines — thin vertical */}
        {Array.from({ length: fretCount + 1 }, (_, i) => {
          if (i === 0 && startFret === 0) return null; // nut already drawn
          return (
            <line
              key={`fret-${i}`}
              x1={paddingLeft + i * fretWidth}
              y1={paddingTop}
              x2={paddingLeft + i * fretWidth}
              y2={paddingTop + boardHeight}
              stroke="hsl(var(--foreground))"
              strokeWidth={0.8}
              opacity={0.25}
            />
          );
        })}

        {/* Strings — horizontal lines with slight thickness variation */}
        {/* String 0 = low E at bottom, string 5 = high E at top */}
        {Array.from({ length: 6 }, (_, i) => {
          const y = paddingTop + i * stringSpacing;
          // i=0 is top (high E, thin), i=5 is bottom (low E, thick)
          const thickness = 0.7 + i * 0.15;
          return (
            <line
              key={`string-${i}`}
              x1={paddingLeft}
              y1={y}
              x2={paddingLeft + boardWidth}
              y2={y}
              stroke="hsl(var(--foreground))"
              strokeWidth={thickness}
              opacity={0.35}
            />
          );
        })}

        {/* Inlay dots — small subtle circles */}
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
          return (
            <circle key={`inlay-${f}`} cx={x} cy={paddingTop + boardHeight / 2} r={dotR} fill="hsl(var(--foreground))" opacity={0.12} />
          );
        })}

        {/* Fret numbers — all frets shown */}
        {Array.from({ length: fretCount }, (_, i) => {
          const fretNum = startFret + i + 1;
          return (
            <text
              key={`fnum-${i}`}
              x={paddingLeft + (i + 0.5) * fretWidth}
              y={paddingTop + boardHeight + 18}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: compact ? 8 : 10, fontFamily: 'Inter, sans-serif', fontWeight: 400 }}
            >
              {fretNum}
            </text>
          );
        })}

        {/* String labels on the left */}
        {['E', 'B', 'G', 'D', 'A', 'E'].map((name, i) => (
          <text
            key={`sname-${i}`}
            x={paddingLeft - 14}
            y={paddingTop + i * stringSpacing + 4}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: compact ? 9 : 11, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
          >
            {name}
          </text>
        ))}

        {/* Notes — clean solid circles */}
        {Array.from(noteMap.values()).map((note, idx) => {
          const x = note.fret === 0
            ? paddingLeft - 6
            : paddingLeft + (note.fret - startFret - 0.5) * fretWidth;
          const y = paddingTop + (5 - note.string) * stringSpacing;
          const r = note.isRoot ? noteRadius * 1.15 : noteRadius;
          const color = getNoteColor(note);
          const label = getLabel(note);
          const hasTwo = label.includes('\n');
          const lines = label.split('\n');
          const fontSize = compact ? 8 : (hasTwo ? 8 : (r < 12 ? 8 : 10));

          return (
            <g
              key={`note-${note.string}-${note.fret}`}
              className="note-appear"
              style={{ animationDelay: `${idx * 8}ms` }}
            >
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={color}
                opacity={0.92}
              />
              {hasTwo ? (
                <>
                  <text
                    x={x}
                    y={y - 3}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    style={{ fontSize: fontSize - 1, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                  >
                    {lines[0]}
                  </text>
                  <text
                    x={x}
                    y={y + 6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.85)"
                    style={{ fontSize: fontSize - 2, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
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
                  style={{ fontSize, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default GuitarFretboard;
