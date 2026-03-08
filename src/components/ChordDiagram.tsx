import React from 'react';
import type { ChordVoicing } from '@/lib/chordGenerator';
import { useFlats, getNoteName as getMusicNoteName } from '@/lib/musicTheory';

const OPEN_STRINGS_SEMI = [4, 9, 2, 7, 11, 4]; // E A D G B E in semitones from C

interface ChordDiagramProps {
  voicing: ChordVoicing;
  width?: number;
  showNotes?: boolean;
}

const NUM_FRETS_SHOWN = 5;

const ChordDiagram: React.FC<ChordDiagramProps> = ({ voicing, width = 160, showNotes = false }) => {
  const { frets, fingers, barreInfo, startFret } = voicing;

  const padding = { top: 48, bottom: 20, left: 28, right: 16 };
  const nutHeight = 4;
  const stringCount = 6;
  const stringSpacing = (width - padding.left - padding.right) / (stringCount - 1);
  const fretSpacing = 28;
  const totalFretHeight = NUM_FRETS_SHOWN * fretSpacing;
  const showNut = startFret <= 1;
  const diagramStartFret = showNut ? 1 : startFret;
  const svgHeight = padding.top + totalFretHeight + padding.bottom + (showNut ? nutHeight : 0);
  const topY = padding.top + (showNut ? nutHeight : 0);
  const dotRadius = stringSpacing * 0.34;

  const getX = (stringIdx: number) => padding.left + stringIdx * stringSpacing;
  const getY = (fretNum: number) => {
    const relative = fretNum - diagramStartFret;
    return topY + relative * fretSpacing + fretSpacing / 2;
  };

  const flats = useFlats(voicing.root);
  const getChordNoteName = (stringIdx: number, fret: number): string => {
    const semitone = (OPEN_STRINGS_SEMI[stringIdx] + fret) % 12;
    return getMusicNoteName(semitone, flats);
  };

  return (
    <svg
      width={width}
      height={svgHeight}
      viewBox={`0 0 ${width} ${svgHeight}`}
      className="select-none"
    >
      {/* Chord name */}
      <text
        x={width / 2}
        y={18}
        textAnchor="middle"
        className="fill-foreground"
        style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
      >
        {voicing.root}{voicing.typeLabel}
      </text>

      {/* Fret position indicator (when not at nut) */}
      {!showNut && (
        <text
          x={padding.left - 16}
          y={topY + fretSpacing / 2 + 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
        >
          {diagramStartFret}fr
        </text>
      )}

      {/* Open / Muted string indicators */}
      {frets.map((f, s) => {
        const x = getX(s);
        const y = padding.top - 8;
        if (f === null) {
          return (
            <text
              key={`mute-${s}`}
              x={x}
              y={y}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
            >
              ✕
            </text>
          );
        }
        if (f === 0) {
          if (showNotes) {
            // Show note name for open strings
            return (
              <text
                key={`open-${s}`}
                x={x}
                y={y - 1}
                textAnchor="middle"
                className="fill-primary"
                style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
              >
                {getNoteName(s, 0)}
              </text>
            );
          }
          return (
            <circle
              key={`open-${s}`}
              cx={x}
              cy={y - 4}
              r={dotRadius * 0.75}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeWidth={1.5}
              opacity={0.6}
            />
          );
        }
        return null;
      })}

      {/* Nut */}
      {showNut && (
        <rect
          x={padding.left - 1}
          y={padding.top}
          width={(stringCount - 1) * stringSpacing + 2}
          height={nutHeight}
          fill="hsl(var(--foreground))"
          opacity={0.75}
          rx={1}
        />
      )}

      {/* Fret lines */}
      {Array.from({ length: NUM_FRETS_SHOWN + 1 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={padding.left}
          y1={topY + i * fretSpacing}
          x2={padding.left + (stringCount - 1) * stringSpacing}
          y2={topY + i * fretSpacing}
          stroke="hsl(var(--foreground))"
          strokeWidth={i === 0 && !showNut ? 1 : 0.7}
          opacity={0.25}
        />
      ))}

      {/* Strings */}
      {Array.from({ length: stringCount }, (_, s) => (
        <line
          key={`string-${s}`}
          x1={getX(s)}
          y1={topY}
          x2={getX(s)}
          y2={topY + totalFretHeight}
          stroke="hsl(var(--foreground))"
          strokeWidth={0.6 + (5 - s) * 0.1}
          opacity={0.35}
        />
      ))}

      {/* Barre */}
      {barreInfo && (
        <rect
          x={getX(barreInfo.fromString) - dotRadius}
          y={getY(barreInfo.fret) - dotRadius * 0.65}
          width={getX(barreInfo.toString) - getX(barreInfo.fromString) + dotRadius * 2}
          height={dotRadius * 1.3}
          rx={dotRadius * 0.65}
          fill="hsl(var(--foreground))"
          opacity={0.82}
        />
      )}

      {/* Finger dots */}
      {frets.map((f, s) => {
        if (f === null || f === 0) return null;
        const x = getX(s);
        const y = getY(f);
        const isBarreFret = barreInfo && f === barreInfo.fret && s >= barreInfo.fromString && s <= barreInfo.toString;
        const noteName = getNoteName(s, f);

        return (
          <g key={`dot-${s}`} className="note-appear" style={{ animationDelay: `${s * 30}ms` }}>
            {!isBarreFret && (
              <circle
                cx={x}
                cy={y}
                r={dotRadius}
                fill="hsl(var(--foreground))"
                opacity={0.85}
              />
            )}
            <text
              x={x}
              y={y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="hsl(var(--background))"
              style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
            >
              {showNotes ? noteName : (fingers[s] || '')}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default ChordDiagram;
