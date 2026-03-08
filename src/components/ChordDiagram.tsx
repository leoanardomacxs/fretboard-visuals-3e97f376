import React from 'react';
import type { ChordVoicing, TriadVoicing } from '@/lib/chordEngine';

interface ChordDiagramProps {
  voicing: ChordVoicing | TriadVoicing;
  width?: number;
  showName?: boolean;
  label?: string;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ voicing, width = 150, showName = true, label }) => {
  const { frets, notes, root } = voicing;
  const barreFret = 'barreFret' in voicing ? (voicing as ChordVoicing).barreFret : -1;
  const barreSpan = 'barreSpan' in voicing ? (voicing as ChordVoicing).barreSpan : [-1, -1] as [number, number];
  const name = 'name' in voicing ? (voicing as ChordVoicing).name : '';

  const numStrings = 6;
  const numFrets = 5;

  const pressedFrets = frets.filter(f => f > 0);
  const minFret = pressedFrets.length > 0 ? Math.min(...pressedFrets) : 1;
  const startFret = pressedFrets.length === 0 ? 1 :
    (Math.max(...pressedFrets) <= 5 && minFret <= 3) ? 1 : minFret;
  const isOpenPosition = startFret === 1;

  const padLeft = 32;
  const padRight = 16;
  const padTop = showName ? 36 : 24;
  const padBottom = 12;
  const stringSpacing = (width - padLeft - padRight) / (numStrings - 1);
  const fretSpacing = 30;
  const svgW = width;
  const svgH = padTop + numFrets * fretSpacing + padBottom;

  const stringX = (s: number) => padLeft + s * stringSpacing;
  const fretY = (f: number) => padTop + f * fretSpacing;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="block"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Title */}
      {showName && name && (
        <text x={svgW / 2} y={14} textAnchor="middle" className="fill-foreground" fontSize={14} fontWeight={700}>
          {name}
        </text>
      )}
      {label && (
        <text x={svgW / 2} y={showName && name ? 14 : 12} textAnchor="middle" className="fill-muted-foreground" fontSize={10} fontWeight={600}>
          {label}
        </text>
      )}

      {/* Fret position label */}
      {!isOpenPosition && (
        <text
          x={padLeft - 16}
          y={fretY(0) + fretSpacing / 2 + 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={10}
          fontWeight={600}
        >
          {startFret}
        </text>
      )}

      {/* Nut */}
      {isOpenPosition && (
        <line
          x1={stringX(0) - 1} y1={fretY(0)}
          x2={stringX(numStrings - 1) + 1} y2={fretY(0)}
          stroke="hsl(var(--fretboard-nut))" strokeWidth={4} strokeLinecap="round"
        />
      )}

      {/* Fret lines */}
      {Array.from({ length: numFrets + 1 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={stringX(0)} y1={fretY(i)}
          x2={stringX(numStrings - 1)} y2={fretY(i)}
          stroke="hsl(var(--fretboard-fret))"
          strokeWidth={i === 0 && !isOpenPosition ? 1.5 : 0.8}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: numStrings }, (_, i) => (
        <line
          key={`str-${i}`}
          x1={stringX(i)} y1={fretY(0)}
          x2={stringX(i)} y2={fretY(numFrets)}
          stroke="hsl(var(--fretboard-string))"
          strokeWidth={0.8 + i * 0.12}
        />
      ))}

      {/* Barre */}
      {barreFret > 0 && barreSpan[0] >= 0 && (
        <rect
          x={stringX(barreSpan[0]) - 6}
          y={fretY(barreFret - startFret) + fretSpacing / 2 - 6}
          width={stringX(barreSpan[1]) - stringX(barreSpan[0]) + 12}
          height={12}
          rx={6}
          fill="hsl(var(--foreground))"
          opacity={0.8}
        />
      )}

      {/* Notes */}
      {frets.map((fret, s) => {
        if (fret < 0) {
          return (
            <text key={`m-${s}`} x={stringX(s)} y={fretY(0) - 8}
              textAnchor="middle" className="fill-muted-foreground" fontSize={11} fontWeight={500}>
              ✕
            </text>
          );
        }
        if (fret === 0) {
          return (
            <circle key={`o-${s}`} cx={stringX(s)} cy={fretY(0) - 10}
              r={5} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.5}
            />
          );
        }

        const displayFret = fret - startFret;
        const isRoot = notes[s] === root;
        const cy = fretY(displayFret) + fretSpacing / 2;
        const r = isRoot ? 9 : 7.5;

        if (barreFret === fret && barreSpan[0] >= 0 && s >= barreSpan[0] && s <= barreSpan[1] && !isRoot) {
          return null;
        }

        return (
          <g key={`f-${s}`} className="note-appear">
            <circle
              cx={stringX(s)} cy={cy} r={r}
              fill={isRoot ? 'hsl(var(--degree-1))' : 'hsl(var(--foreground))'}
            />
            <text
              x={stringX(s)} y={cy + 3.5}
              textAnchor="middle"
              fill={isRoot ? 'white' : 'hsl(var(--background))'}
              fontSize={8} fontWeight={700}
            >
              {notes[s]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default ChordDiagram;
