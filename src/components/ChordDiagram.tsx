import React from 'react';
import type { ChordVoicing, TriadVoicing } from '@/lib/chordEngine';

// ── Vertical chord diagram (book-style) ──

interface ChordDiagramProps {
  voicing: ChordVoicing;
  size?: number; // base unit
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ voicing, size = 1 }) => {
  const strCount = 6;
  const fretCount = 5;
  const strSpacing = 20 * size;
  const fretSpacing = 24 * size;
  const padLeft = 28 * size;
  const padTop = 38 * size;
  const padRight = 12 * size;
  const padBottom = 18 * size;
  const boardW = (strCount - 1) * strSpacing;
  const boardH = fretCount * fretSpacing;
  const svgW = padLeft + boardW + padRight;
  const svgH = padTop + boardH + padBottom;
  const dotR = 7 * size;

  // Determine display range
  const frettedPositions = voicing.frets.filter(f => f > 0);
  let displayStart = 1;
  if (frettedPositions.length > 0) {
    const minF = Math.min(...frettedPositions);
    if (minF > 5) {
      displayStart = minF;
    } else if (minF > 1) {
      displayStart = Math.max(1, minF - 1);
    }
  }
  const isOpenPosition = displayStart === 1;

  // String x position (0=low E on LEFT, 5=high E on RIGHT — standard diagram convention is reversed)
  // In standard diagrams: left=low E, right=high E
  const strX = (s: number) => padLeft + s * strSpacing;
  const fretY = (f: number) => padTop + f * fretSpacing;

  return (
    <div className="inline-block">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="select-none">
        {/* Chord name */}
        <text
          x={padLeft + boardW / 2}
          y={12 * size}
          textAnchor="middle"
          style={{ fontSize: 13 * size, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
          className="fill-foreground"
        >
          {voicing.chordName}
        </text>

        {/* Nut or position indicator */}
        {isOpenPosition ? (
          <line
            x1={padLeft - 1}
            y1={padTop}
            x2={padLeft + boardW + 1}
            y2={padTop}
            stroke="hsl(var(--foreground))"
            strokeWidth={3.5 * size}
            strokeLinecap="round"
          />
        ) : (
          <text
            x={padLeft - 14 * size}
            y={fretY(0.5) + 4 * size}
            textAnchor="middle"
            style={{ fontSize: 10 * size, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
            className="fill-muted-foreground"
          >
            {displayStart}fr
          </text>
        )}

        {/* Fret lines */}
        {Array.from({ length: fretCount + 1 }, (_, i) => (
          <line
            key={i}
            x1={padLeft}
            y1={fretY(i)}
            x2={padLeft + boardW}
            y2={fretY(i)}
            stroke="hsl(var(--foreground))"
            strokeWidth={i === 0 && !isOpenPosition ? 1 : 0.8}
            opacity={i === 0 ? 0.5 : 0.25}
          />
        ))}

        {/* String lines */}
        {Array.from({ length: strCount }, (_, i) => (
          <line
            key={i}
            x1={strX(i)}
            y1={padTop}
            x2={strX(i)}
            y2={padTop + boardH}
            stroke="hsl(var(--foreground))"
            strokeWidth={0.7 + (5 - i) * 0.12}
            opacity={0.35}
          />
        ))}

        {/* Barre */}
        {voicing.barre !== null && voicing.barreStrings && (() => {
          const barreDisplayFret = voicing.barre! - displayStart + 1;
          if (barreDisplayFret < 1 || barreDisplayFret > fretCount) return null;
          const y = fretY(barreDisplayFret - 0.5);
          const x1 = strX(voicing.barreStrings![0]);
          const x2 = strX(voicing.barreStrings![1]);
          return (
            <rect
              x={Math.min(x1, x2) - dotR}
              y={y - dotR * 0.7}
              width={Math.abs(x2 - x1) + dotR * 2}
              height={dotR * 1.4}
              rx={dotR * 0.7}
              fill="hsl(var(--foreground))"
              opacity={0.85}
            />
          );
        })()}

        {/* Muted (X) and Open (O) indicators */}
        {voicing.frets.map((f, s) => {
          const x = strX(s);
          const y = padTop - 10 * size;
          if (f === -1) {
            return (
              <text
                key={`x-${s}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontSize: 11 * size, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                className="fill-muted-foreground"
              >
                ✕
              </text>
            );
          }
          if (f === 0) {
            return (
              <circle
                key={`o-${s}`}
                cx={x}
                cy={y}
                r={5 * size}
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeWidth={1.5}
                opacity={0.5}
              />
            );
          }
          return null;
        })}

        {/* Finger dots */}
        {voicing.frets.map((f, s) => {
          if (f <= 0) return null;
          const displayFret = f - displayStart + 1;
          if (displayFret < 1 || displayFret > fretCount) return null;
          const x = strX(s);
          const y = fretY(displayFret - 0.5);
          const finger = voicing.fingers[s];

          return (
            <g key={`dot-${s}`} className="note-appear" style={{ animationDelay: `${s * 30}ms` }}>
              <circle cx={x} cy={y} r={dotR} fill="hsl(var(--foreground))" opacity={0.88} />
              {finger > 0 && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="hsl(var(--background))"
                  style={{ fontSize: 9 * size, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
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

// ── Triad Diagram (compact 3-string vertical) ──

interface TriadDiagramProps {
  triad: TriadVoicing;
  size?: number;
}

export const TriadDiagram: React.FC<TriadDiagramProps> = ({ triad, size = 1 }) => {
  const strCount = 3;
  const fretCount = 4;
  const strSpacing = 22 * size;
  const fretSpacing = 22 * size;
  const padLeft = 24 * size;
  const padTop = 48 * size;
  const padRight = 12 * size;
  const padBottom = 22 * size;
  const boardW = (strCount - 1) * strSpacing;
  const boardH = fretCount * fretSpacing;
  const svgW = padLeft + boardW + padRight;
  const svgH = padTop + boardH + padBottom;
  const dotR = 6.5 * size;

  const pressed = triad.frets.filter(f => f > 0);
  let displayStart = 1;
  if (pressed.length > 0) {
    const minF = Math.min(...pressed);
    if (minF > 4) displayStart = minF;
    else if (minF > 1) displayStart = Math.max(1, minF - 1);
  }
  const isOpen = displayStart === 1;

  const strX = (i: number) => padLeft + i * strSpacing;
  const fretY = (f: number) => padTop + f * fretSpacing;

  // String labels (the actual string names)
  const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

  return (
    <div className="inline-block">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="select-none">
        {/* Title */}
        <text
          x={padLeft + boardW / 2}
          y={10 * size}
          textAnchor="middle"
          style={{ fontSize: 10 * size, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
          className="fill-foreground"
        >
          {triad.root}{triad.type === 'minor' ? 'm' : triad.type === 'diminished' ? '°' : triad.type === 'augmented' ? '+' : ''}
        </text>
        <text
          x={padLeft + boardW / 2}
          y={22 * size}
          textAnchor="middle"
          style={{ fontSize: 8 * size, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
          className="fill-muted-foreground"
        >
          {triad.inversion === 'Root' ? 'Fund.' : triad.inversion === '1st' ? '1ª inv.' : '2ª inv.'}
        </text>
        <text
          x={padLeft + boardW / 2}
          y={33 * size}
          textAnchor="middle"
          style={{ fontSize: 7 * size, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}
          className="fill-muted-foreground"
        >
          CAGED: {triad.cagedShape}
        </text>

        {/* Nut */}
        {isOpen ? (
          <line
            x1={padLeft - 1}
            y1={padTop}
            x2={padLeft + boardW + 1}
            y2={padTop}
            stroke="hsl(var(--foreground))"
            strokeWidth={3 * size}
            strokeLinecap="round"
          />
        ) : (
          <text
            x={padLeft - 12 * size}
            y={fretY(0.5) + 3 * size}
            textAnchor="middle"
            style={{ fontSize: 8 * size, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
            className="fill-muted-foreground"
          >
            {displayStart}
          </text>
        )}

        {/* Frets */}
        {Array.from({ length: fretCount + 1 }, (_, i) => (
          <line
            key={i}
            x1={padLeft}
            y1={fretY(i)}
            x2={padLeft + boardW}
            y2={fretY(i)}
            stroke="hsl(var(--foreground))"
            strokeWidth={0.7}
            opacity={0.25}
          />
        ))}

        {/* Strings */}
        {Array.from({ length: strCount }, (_, i) => (
          <line
            key={i}
            x1={strX(i)}
            y1={padTop}
            x2={strX(i)}
            y2={padTop + boardH}
            stroke="hsl(var(--foreground))"
            strokeWidth={0.7}
            opacity={0.35}
          />
        ))}

        {/* String labels below */}
        {triad.strings.map((s, i) => (
          <text
            key={i}
            x={strX(i)}
            y={padTop + boardH + 14 * size}
            textAnchor="middle"
            style={{ fontSize: 8 * size, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}
            className="fill-muted-foreground"
          >
            {STRING_NAMES[s]}
          </text>
        ))}

        {/* Dots */}
        {triad.frets.map((f, i) => {
          if (f === 0) {
            return (
              <circle
                key={i}
                cx={strX(i)}
                cy={padTop - 8 * size}
                r={4 * size}
                fill="none"
                stroke="hsl(var(--foreground))"
                strokeWidth={1.2}
                opacity={0.5}
              />
            );
          }
          const displayFret = f - displayStart + 1;
          if (displayFret < 1 || displayFret > fretCount) return null;
          return (
            <g key={i} className="note-appear" style={{ animationDelay: `${i * 40}ms` }}>
              <circle
                cx={strX(i)}
                cy={fretY(displayFret - 0.5)}
                r={dotR}
                fill="hsl(var(--foreground))"
                opacity={0.88}
              />
              <text
                x={strX(i)}
                y={fretY(displayFret - 0.5)}
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(var(--background))"
                style={{ fontSize: 8 * size, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
              >
                {triad.notes[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ChordDiagram;
