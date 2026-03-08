import React from 'react';
import type { ChordVoicing } from '@/lib/chordTheory';

interface ChordDiagramProps {
  voicing: ChordVoicing;
  size?: number;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ voicing, size = 180 }) => {
  const { frets, fingers, barre, barreSpan, label, startFret } = voicing;

  const numFrets = 5;
  const numStrings = 6;
  const padding = { top: 42, bottom: 20, left: 24, right: 16 };
  const stringSpacing = (size - padding.left - padding.right) / (numStrings - 1);
  const fretSpacing = (size * 1.1 - padding.top - padding.bottom) / numFrets;
  const svgW = size;
  const svgH = size * 1.1 + 10;
  const dotR = stringSpacing * 0.32;

  // Determine display offset
  const displayStartFret = startFret <= 1 ? 0 : startFret;
  const showNut = displayStartFret === 0;

  return (
    <div className="inline-flex flex-col items-center note-appear">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="select-none"
      >
        {/* Title */}
        <text
          x={svgW / 2}
          y={18}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {label}
        </text>

        {/* Nut or position indicator */}
        {showNut ? (
          <rect
            x={padding.left - 1}
            y={padding.top - 3}
            width={stringSpacing * (numStrings - 1) + 2}
            height={4}
            fill="hsl(var(--foreground))"
            rx={1}
            opacity={0.8}
          />
        ) : (
          <text
            x={padding.left - 14}
            y={padding.top + fretSpacing * 0.5 + 4}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            style={{ fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
          >
            {displayStartFret}fr
          </text>
        )}

        {/* Fret lines */}
        {Array.from({ length: numFrets + 1 }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1={padding.left}
            y1={padding.top + i * fretSpacing}
            x2={padding.left + stringSpacing * (numStrings - 1)}
            y2={padding.top + i * fretSpacing}
            stroke="hsl(var(--foreground))"
            strokeWidth={i === 0 && !showNut ? 1 : 0.8}
            opacity={0.3}
          />
        ))}

        {/* String lines */}
        {Array.from({ length: numStrings }, (_, i) => (
          <line
            key={`string-${i}`}
            x1={padding.left + i * stringSpacing}
            y1={padding.top}
            x2={padding.left + i * stringSpacing}
            y2={padding.top + numFrets * fretSpacing}
            stroke="hsl(var(--foreground))"
            strokeWidth={0.6 + (5 - i) * 0.12}
            opacity={0.4}
          />
        ))}

        {/* Barre */}
        {barre !== null && barreSpan && (() => {
          const barreFretDisplay = barre - displayStartFret;
          if (barreFretDisplay < 1 || barreFretDisplay > numFrets) return null;
          const y = padding.top + (barreFretDisplay - 0.5) * fretSpacing;
          const x1 = padding.left + (5 - barreSpan[1]) * stringSpacing;
          const x2 = padding.left + (5 - barreSpan[0]) * stringSpacing;
          return (
            <rect
              x={x1 - dotR}
              y={y - dotR}
              width={x2 - x1 + dotR * 2}
              height={dotR * 2}
              rx={dotR}
              fill="hsl(var(--foreground))"
              opacity={0.85}
            />
          );
        })()}

        {/* Open / Muted indicators + finger dots */}
        {frets.map((fret, stringIdx) => {
          // stringIdx 0=low E, 5=high E
          // In vertical diagram: left=high E (5), right=low E (0)
          // Actually standard: left=low E
          const x = padding.left + (5 - stringIdx) * stringSpacing;

          if (fret === 'X') {
            return (
              <text
                key={`x-${stringIdx}`}
                x={x}
                y={padding.top - 10}
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
              >
                ✕
              </text>
            );
          }

          if (fret === 0) {
            return (
              <circle
                key={`o-${stringIdx}`}
                cx={x}
                cy={padding.top - 10}
                r={dotR * 0.8}
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeWidth={1.5}
                opacity={0.6}
              />
            );
          }

          const displayFret = fret - displayStartFret;
          if (displayFret < 1 || displayFret > numFrets) return null;
          const y = padding.top + (displayFret - 0.5) * fretSpacing;
          const finger = fingers[stringIdx];

          return (
            <g key={`dot-${stringIdx}`}>
              <circle
                cx={x}
                cy={y}
                r={dotR}
                fill="hsl(var(--foreground))"
                opacity={0.9}
              />
              {finger > 0 && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="hsl(var(--background))"
                  style={{ fontSize: dotR * 1.2, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
                >
                  {finger}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ChordDiagram;
