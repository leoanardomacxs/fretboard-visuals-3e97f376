import React from 'react';
import type { ChordVoicing } from '@/lib/chordEngine';

interface ChordDiagramProps {
  voicing: ChordVoicing;
  width?: number;
}

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'E'];

const ChordDiagram: React.FC<ChordDiagramProps> = ({ voicing, width = 140 }) => {
  const { frets, notes, barreFret, barreSpan, root } = voicing;

  const numStrings = 6;
  const numFrets = 5;

  // Calculate fret range to display
  const pressedFrets = frets.filter(f => f > 0);
  const minFret = pressedFrets.length > 0 ? Math.min(...pressedFrets) : 1;
  const startFret = pressedFrets.length === 0 ? 1 :
    (Math.max(...pressedFrets) <= 5 && minFret <= 3) ? 1 : minFret;

  const isOpenPosition = startFret === 1;

  // SVG dimensions
  const padLeft = 30;
  const padRight = 14;
  const padTop = 32;
  const padBottom = 24;
  const stringSpacing = (width - padLeft - padRight) / (numStrings - 1);
  const fretSpacing = 28;
  const svgW = width;
  const svgH = padTop + numFrets * fretSpacing + padBottom;

  const stringX = (s: number) => padLeft + s * stringSpacing;
  const fretY = (f: number) => padTop + f * fretSpacing;

  // Determine root note pitch class
  const rootPc = notes.findIndex(n => n === root);

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="block"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Fret position label */}
      {!isOpenPosition && (
        <text
          x={padLeft - 14}
          y={fretY(0) + fretSpacing / 2 + 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={10}
          fontWeight={600}
        >
          {startFret}
        </text>
      )}

      {/* Nut (thick line at top for open position) */}
      {isOpenPosition && (
        <line
          x1={stringX(0) - 1}
          y1={fretY(0)}
          x2={stringX(numStrings - 1) + 1}
          y2={fretY(0)}
          stroke="hsl(var(--fretboard-nut))"
          strokeWidth={4}
          strokeLinecap="round"
        />
      )}

      {/* Fret lines */}
      {Array.from({ length: numFrets + 1 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={stringX(0)}
          y1={fretY(i)}
          x2={stringX(numStrings - 1)}
          y2={fretY(i)}
          stroke="hsl(var(--fretboard-fret))"
          strokeWidth={i === 0 && !isOpenPosition ? 1.5 : 1}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: numStrings }, (_, i) => (
        <line
          key={`str-${i}`}
          x1={stringX(i)}
          y1={fretY(0)}
          x2={stringX(i)}
          y2={fretY(numFrets)}
          stroke="hsl(var(--fretboard-string))"
          strokeWidth={1 + i * 0.15}
        />
      ))}

      {/* Barre */}
      {barreFret > 0 && barreSpan[0] >= 0 && (
        <rect
          x={stringX(barreSpan[0]) - 5}
          y={fretY(barreFret - startFret) + fretSpacing / 2 - 5}
          width={stringX(barreSpan[1]) - stringX(barreSpan[0]) + 10}
          height={10}
          rx={5}
          fill="hsl(var(--foreground))"
          opacity={0.85}
        />
      )}

      {/* Open / Muted indicators and finger dots */}
      {frets.map((fret, s) => {
        if (fret < 0) {
          // Muted
          return (
            <text
              key={`m-${s}`}
              x={stringX(s)}
              y={fretY(0) - 10}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={12}
              fontWeight={500}
            >
              ✕
            </text>
          );
        }
        if (fret === 0) {
          // Open
          return (
            <circle
              key={`o-${s}`}
              cx={stringX(s)}
              cy={fretY(0) - 12}
              r={5}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth={1.5}
            />
          );
        }
        // Pressed
        const displayFret = fret - startFret;
        const isRoot = notes[s] === root;
        const cy = fretY(displayFret) + fretSpacing / 2;
        const r = isRoot ? 8 : 7;

        // Skip if barre covers this position
        if (barreFret === fret && barreSpan[0] >= 0 && s >= barreSpan[0] && s <= barreSpan[1] && !isRoot) {
          return null;
        }

        return (
          <g key={`f-${s}`} className="note-appear">
            <circle
              cx={stringX(s)}
              cy={cy}
              r={r}
              fill={isRoot ? 'hsl(var(--degree-1))' : 'hsl(var(--foreground))'}
            />
            <text
              x={stringX(s)}
              y={cy + 3.5}
              textAnchor="middle"
              fill={isRoot ? 'white' : 'hsl(var(--background))'}
              fontSize={8}
              fontWeight={700}
            >
              {notes[s]}
            </text>
          </g>
        );
      })}

      {/* Chord name */}
      <text
        x={svgW / 2}
        y={14}
        textAnchor="middle"
        className="fill-foreground"
        fontSize={13}
        fontWeight={700}
      >
        {voicing.name}
      </text>
    </svg>
  );
};

export default ChordDiagram;
