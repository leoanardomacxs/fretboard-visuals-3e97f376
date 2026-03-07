import React, { useMemo } from 'react';
import type { FretNote } from '@/lib/musicTheory';

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
  return c ? `hsl(${c})` : 'hsl(220, 10%, 50%)';
}

// Color by note name
const NOTE_COLORS: Record<string, string> = {
  'C': '#e74c3c', 'C#': '#e67e22', 'Db': '#e67e22',
  'D': '#f1c40f', 'D#': '#2ecc71', 'Eb': '#2ecc71',
  'E': '#1abc9c', 'F': '#3498db', 'F#': '#9b59b6', 'Gb': '#9b59b6',
  'G': '#e91e63', 'G#': '#ff5722', 'Ab': '#ff5722',
  'A': '#00bcd4', 'A#': '#8bc34a', 'Bb': '#8bc34a',
  'B': '#795548',
};

const GuitarFretboard: React.FC<GuitarFretboardProps> = ({
  notes,
  maxFret = 24,
  startFret = 0,
  showNoteNames = true,
  showDegrees = false,
  colorMode = 'degree',
  compact = false,
  title,
  subtitle,
  noteRadius = 13,
}) => {
  const fretCount = maxFret - startFret;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = compact ? 20 : (title ? 55 : 30);
  const paddingBottom = 35;
  const stringSpacing = compact ? 16 : 22;
  const fretWidth = compact ? 38 : 52;
  
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
    if (colorMode === 'note') return NOTE_COLORS[note.note] || '#666';
    if (colorMode === 'degree' && note.degree && note.degree > 0) return getDegreeHSL(note.degree);
    if (note.isRoot) return getDegreeHSL(1);
    if (note.isChordTone) return getDegreeHSL(5);
    return 'hsl(220, 10%, 50%)';
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
        <defs>
          <filter id="noteShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
          </filter>
          <linearGradient id="fretboardGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--fretboard-bg))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--fretboard-bg))" />
          </linearGradient>
        </defs>

        {/* Title */}
        {title && (
          <>
            <text
              x={paddingLeft}
              y={18}
              className="fill-foreground"
              style={{ fontSize: compact ? 12 : 15, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
            >
              {title}
            </text>
            {subtitle && (
              <text
                x={paddingLeft}
                y={34}
                className="fill-muted-foreground"
                style={{ fontSize: compact ? 10 : 12, fontWeight: 400, fontFamily: 'Inter, sans-serif' }}
              >
                {subtitle}
              </text>
            )}
          </>
        )}

        {/* Fretboard background */}
        <rect
          x={paddingLeft}
          y={paddingTop}
          width={boardWidth}
          height={boardHeight}
          rx={4}
          fill="url(#fretboardGrad)"
        />

        {/* Nut */}
        {startFret === 0 && (
          <rect
            x={paddingLeft - 2}
            y={paddingTop - 2}
            width={5}
            height={boardHeight + 4}
            rx={2}
            fill="hsl(var(--fretboard-nut))"
          />
        )}

        {/* Inlay dots */}
        {INLAY_FRETS.filter(f => f > startFret && f <= maxFret).map(f => {
          const x = paddingLeft + (f - startFret - 0.5) * fretWidth;
          const isDouble = DOUBLE_INLAY.includes(f);
          if (isDouble) {
            return (
              <g key={`inlay-${f}`}>
                <circle cx={x} cy={paddingTop + boardHeight * 0.28} r={compact ? 3 : 4} fill="hsl(var(--fretboard-inlay))" opacity={0.6} />
                <circle cx={x} cy={paddingTop + boardHeight * 0.72} r={compact ? 3 : 4} fill="hsl(var(--fretboard-inlay))" opacity={0.6} />
              </g>
            );
          }
          return (
            <circle key={`inlay-${f}`} cx={x} cy={paddingTop + boardHeight / 2} r={compact ? 3 : 4} fill="hsl(var(--fretboard-inlay))" opacity={0.6} />
          );
        })}

        {/* Frets */}
        {Array.from({ length: fretCount + 1 }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1={paddingLeft + i * fretWidth}
            y1={paddingTop}
            x2={paddingLeft + i * fretWidth}
            y2={paddingTop + boardHeight}
            stroke="hsl(var(--fretboard-fret))"
            strokeWidth={i === 0 && startFret === 0 ? 0 : 1.5}
            opacity={0.7}
          />
        ))}

        {/* Strings */}
        {Array.from({ length: 6 }, (_, i) => {
          const y = paddingTop + i * stringSpacing;
          const thickness = 0.6 + (5 - i) * 0.2;
          return (
            <line
              key={`string-${i}`}
              x1={paddingLeft}
              y1={y}
              x2={paddingLeft + boardWidth}
              y2={y}
              stroke="hsl(var(--fretboard-string))"
              strokeWidth={thickness}
              opacity={0.8}
            />
          );
        })}

        {/* Fret numbers */}
        {Array.from({ length: fretCount }, (_, i) => {
          const fretNum = startFret + i + 1;
          if (INLAY_FRETS.includes(fretNum) || i === 0) {
            return (
              <text
                key={`fnum-${i}`}
                x={paddingLeft + (i + 0.5) * fretWidth}
                y={paddingTop + boardHeight + 18}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: compact ? 9 : 10, fontFamily: 'Inter, sans-serif' }}
              >
                {fretNum}
              </text>
            );
          }
          return null;
        })}

        {/* String labels */}
        {['E', 'A', 'D', 'G', 'B', 'E'].map((name, i) => (
          <text
            key={`sname-${i}`}
            x={paddingLeft - 15}
            y={paddingTop + i * stringSpacing + 4}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: compact ? 9 : 11, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
          >
            {name}
          </text>
        ))}

        {/* Notes */}
        {Array.from(noteMap.values()).map((note, idx) => {
          const x = note.fret === 0
            ? paddingLeft - 2
            : paddingLeft + (note.fret - startFret - 0.5) * fretWidth;
          const y = paddingTop + note.string * stringSpacing;
          const r = note.isRoot ? noteRadius * 1.2 : noteRadius;
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
                filter="url(#noteShadow)"
                stroke={note.isRoot ? 'rgba(255,255,255,0.5)' : 'none'}
                strokeWidth={note.isRoot ? 2 : 0}
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
                    fill="rgba(255,255,255,0.8)"
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
