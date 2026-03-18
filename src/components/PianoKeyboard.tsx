import React, { useMemo } from 'react';
import { playNote, noteNameToMidi } from '@/lib/audioEngine';
import { getNoteIndex } from '@/lib/musicTheory';

interface PianoKeyboardProps {
  highlightedNotes?: Array<{ note: string; degree?: number; interval?: string; isRoot?: boolean }>;
  startOctave?: number;
  octaves?: number;
  colorMode?: 'degree' | 'note' | 'function';
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NOTE_POSITIONS: Record<number, number> = {
  1: 0, // C#: between C and D
  3: 1, // D#: between D and E
  6: 3, // F#: between F and G
  8: 4, // G#: between G and A
  10: 5, // A#: between A and B
};

const DEGREE_COLORS: Record<number, string> = {
  1: 'var(--degree-1)', 2: 'var(--degree-2)', 3: 'var(--degree-3)',
  4: 'var(--degree-4)', 5: 'var(--degree-5)', 6: 'var(--degree-6)', 7: 'var(--degree-7)',
};

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  highlightedNotes = [],
  startOctave = 3,
  octaves = 2,
  colorMode = 'degree',
  title,
  subtitle,
  compact = false,
}) => {
  const noteMap = useMemo(() => {
    const map = new Map<number, typeof highlightedNotes[0]>();
    highlightedNotes.forEach(n => {
      map.set(getNoteIndex(n.note), n);
    });
    return map;
  }, [highlightedNotes]);

  const whiteKeyWidth = compact ? 32 : 40;
  const whiteKeyHeight = compact ? 120 : 160;
  const blackKeyWidth = compact ? 20 : 26;
  const blackKeyHeight = compact ? 75 : 100;
  const totalWhiteKeys = octaves * 7;
  const svgWidth = totalWhiteKeys * whiteKeyWidth + 2;
  const headerHeight = title ? 50 : 10;
  const svgHeight = whiteKeyHeight + headerHeight + 30;

  const getColor = (noteInfo: typeof highlightedNotes[0]): string => {
    if (colorMode === 'degree' && noteInfo.degree && noteInfo.degree > 0) {
      const c = DEGREE_COLORS[noteInfo.degree];
      return c ? `hsl(${c})` : 'hsl(220, 70%, 50%)';
    }
    if (noteInfo.isRoot) return 'hsl(var(--degree-1))';
    return 'hsl(220, 70%, 50%)';
  };

  const keys: React.ReactNode[] = [];
  const blackKeys: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];

  for (let oct = 0; oct < octaves; oct++) {
    const currentOctave = startOctave + oct;
    for (let w = 0; w < 7; w++) {
      const keyIdx = oct * 7 + w;
      const x = keyIdx * whiteKeyWidth + 1;
      const noteName = WHITE_NOTES[w];
      const semi = getNoteIndex(noteName);
      const noteInfo = noteMap.get(semi);
      const midi = noteNameToMidi(noteName, currentOctave);
      const isHighlighted = !!noteInfo;

      keys.push(
        <g key={`white-${keyIdx}`} className="cursor-pointer" onClick={() => playNote(midi, 0.8, 0.35)}>
          <rect x={x} y={headerHeight} width={whiteKeyWidth - 1} height={whiteKeyHeight}
            rx={3}
            fill={isHighlighted ? getColor(noteInfo!) : 'hsl(var(--background))'}
            stroke="hsl(var(--border))" strokeWidth={1}
            className="hover:opacity-80 transition-opacity"
          />
          {isHighlighted && (
            <>
              <text x={x + whiteKeyWidth / 2} y={headerHeight + whiteKeyHeight - 20}
                textAnchor="middle" fill={isHighlighted ? 'white' : 'hsl(var(--foreground))'}
                style={{ fontSize: compact ? 9 : 11, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                {noteInfo?.note || noteName}
              </text>
              {noteInfo?.interval && (
                <text x={x + whiteKeyWidth / 2} y={headerHeight + whiteKeyHeight - 8}
                  textAnchor="middle" fill="rgba(255,255,255,0.8)"
                  style={{ fontSize: compact ? 7 : 9, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                  {noteInfo.interval}
                </text>
              )}
            </>
          )}
        </g>
      );
    }

    // Black keys
    for (const [semiStr, whiteIdx] of Object.entries(BLACK_NOTE_POSITIONS)) {
      const semi = Number(semiStr);
      const keyIdx = oct * 7 + whiteIdx;
      const x = (keyIdx + 1) * whiteKeyWidth - blackKeyWidth / 2 + 1;
      const noteInfo = noteMap.get(semi);
      const isHighlighted = !!noteInfo;
      const midi = 12 * (currentOctave + 1) + semi;

      blackKeys.push(
        <g key={`black-${oct}-${semi}`} className="cursor-pointer" onClick={() => playNote(midi, 0.8, 0.35)}>
          <rect x={x} y={headerHeight} width={blackKeyWidth} height={blackKeyHeight}
            rx={2}
            fill={isHighlighted ? getColor(noteInfo!) : 'hsl(var(--foreground))'}
            stroke="hsl(var(--foreground))" strokeWidth={0.5}
            opacity={isHighlighted ? 0.95 : 0.85}
            className="hover:opacity-70 transition-opacity"
          />
          {isHighlighted && (
            <text x={x + blackKeyWidth / 2} y={headerHeight + blackKeyHeight - 8}
              textAnchor="middle" fill="white"
              style={{ fontSize: compact ? 7 : 8, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
              {noteInfo?.note}
            </text>
          )}
        </g>
      );
    }
  }

  return (
    <div className="inline-block">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="select-none" style={{ maxWidth: '100%', height: 'auto' }}>
        {title && (
          <>
            <text x={4} y={16} className="fill-foreground"
              style={{ fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{title}</text>
            {subtitle && (
              <text x={4} y={32} className="fill-muted-foreground"
                style={{ fontSize: 11, fontWeight: 400, fontFamily: 'Inter, sans-serif' }}>{subtitle}</text>
            )}
          </>
        )}
        {keys}
        {blackKeys}
      </svg>
    </div>
  );
};

export default PianoKeyboard;
