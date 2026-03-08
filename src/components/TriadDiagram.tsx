import React from 'react';
import type { TriadVoicing } from '@/lib/chordTheory';

interface TriadDiagramProps {
  voicing: TriadVoicing;
  size?: number;
}

const TriadDiagram: React.FC<TriadDiagramProps> = ({ voicing, size = 140 }) => {
  const { strings, frets: triadFrets, notes, inversion, cagedShape, root, type } = voicing;

  const numFrets = 4;
  const numStrings = 6;
  const padding = { top: 48, bottom: 16, left: 20, right: 12 };
  const stringSpacing = (size - padding.left - padding.right) / (numStrings - 1);
  const fretSpacing = (size * 0.9 - padding.top - padding.bottom) / numFrets;
  const svgW = size;
  const svgH = size * 0.9 + 28;
  const dotR = stringSpacing * 0.34;

  // Determine display range
  const allFrets = triadFrets.filter(f => f > 0);
  const minFret = allFrets.length > 0 ? Math.min(...allFrets) : 0;
  const displayStartFret = minFret <= 1 ? 0 : minFret;
  const showNut = displayStartFret === 0;

  const typeLabel = type === 'major' ? '' : type === 'minor' ? 'm' : type === 'dim' ? '°' : '+';
  const title = `${root}${typeLabel}`;

  // Map string indices to positions (strings: [bass, mid, high] as 0-based)
  const activeStrings = new Set(strings);

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
          y={14}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
        >
          {title} — {inversion}
        </text>
        <text
          x={svgW / 2}
          y={28}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          style={{ fontSize: 9, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
        >
          CAGED: {cagedShape} • {notes.join('–')}
        </text>

        {/* Nut */}
        {showNut && (
          <rect
            x={padding.left - 1}
            y={padding.top - 2}
            width={stringSpacing * (numStrings - 1) + 2}
            height={3}
            fill="hsl(var(--foreground))"
            rx={1}
            opacity={0.7}
          />
        )}

        {!showNut && (
          <text
            x={padding.left - 10}
            y={padding.top + fretSpacing * 0.5 + 3}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            style={{ fontSize: 8, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
          >
            {displayStartFret}
          </text>
        )}

        {/* Fret lines */}
        {Array.from({ length: numFrets + 1 }, (_, i) => (
          <line
            key={`f-${i}`}
            x1={padding.left}
            y1={padding.top + i * fretSpacing}
            x2={padding.left + stringSpacing * (numStrings - 1)}
            y2={padding.top + i * fretSpacing}
            stroke="hsl(var(--foreground))"
            strokeWidth={0.7}
            opacity={0.25}
          />
        ))}

        {/* String lines */}
        {Array.from({ length: numStrings }, (_, i) => (
          <line
            key={`s-${i}`}
            x1={padding.left + i * stringSpacing}
            y1={padding.top}
            x2={padding.left + i * stringSpacing}
            y2={padding.top + numFrets * fretSpacing}
            stroke="hsl(var(--foreground))"
            strokeWidth={activeStrings.has(5 - i) ? 0.8 : 0.4}
            opacity={activeStrings.has(5 - i) ? 0.5 : 0.15}
          />
        ))}

        {/* Muted / inactive strings */}
        {Array.from({ length: numStrings }, (_, i) => {
          const stringIdx = 5 - i;
          if (activeStrings.has(stringIdx)) return null;
          const x = padding.left + i * stringSpacing;
          return (
            <text
              key={`m-${i}`}
              x={x}
              y={padding.top - 8}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              style={{ fontSize: 9, fontWeight: 500 }}
            >
              ✕
            </text>
          );
        })}

        {/* Dots */}
        {strings.map((stringIdx, noteIdx) => {
          const x = padding.left + (5 - stringIdx) * stringSpacing;
          const fret = triadFrets[noteIdx];
          
          if (fret === 0) {
            return (
              <circle
                key={`o-${noteIdx}`}
                cx={x}
                cy={padding.top - 8}
                r={dotR * 0.7}
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeWidth={1.2}
                opacity={0.5}
              />
            );
          }
          
          const displayFret = fret - displayStartFret;
          if (displayFret < 1 || displayFret > numFrets) return null;
          const y = padding.top + (displayFret - 0.5) * fretSpacing;
          
          // Color: root note gets accent
          const isRoot = notes[noteIdx] === root;
          
          return (
            <g key={`d-${noteIdx}`}>
              <circle
                cx={x}
                cy={y}
                r={dotR}
                fill={isRoot ? 'hsl(var(--degree-1))' : 'hsl(var(--foreground))'}
                opacity={0.9}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                style={{ fontSize: dotR * 1.1, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
              >
                {notes[noteIdx]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default TriadDiagram;
