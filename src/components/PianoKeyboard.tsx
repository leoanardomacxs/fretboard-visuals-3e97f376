import React, { useMemo, useState, useCallback } from 'react'
import { playNote, noteNameToMidi } from '@/lib/audioEngine'
import { getNoteIndex } from '@/lib/musicTheory'

interface PianoKeyboardProps {
  highlightedNotes?: Array<{
    note: string
    degree?: number
    interval?: string
    function?: "root" | "chord"
    isRoot?: boolean
  }>
  startOctave?: number
  octaves?: number
  colorMode?: 'degree' | 'note' | 'function'
  colorStage?: number
  compact?: boolean
  themeClass?: string
}

const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

const BLACK_NOTE_POSITIONS: Record<number, number> = {
  1: 0,
  3: 1,
  6: 3,
  8: 4,
  10: 5,
}

/* 🎯 BASE HSL (SEM string pronta → performance melhor) */
const NOTE_HUES: Record<string, number> = {
  C: 0,
  "C#": 15,
  D: 30,
  "D#": 45,
  E: 60,
  F: 120,
  "F#": 170,
  G: 210,
  "G#": 240,
  A: 270,
  "A#": 300,
  B: 330,
}

const FUNCTION_HUES = {
  root: 280,
  chord: 145,
}

const STAGE_LIGHTNESS = [55, 68, 40] // 3 estágios reais

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  highlightedNotes = [],
  startOctave = 3,
  octaves = 2,
  colorMode = "degree",
  colorStage = 0,
  compact = false,
  themeClass = "",
}) => {

  const [pressedKey, setPressedKey] = useState<number | null>(null)

  const noteMap = useMemo(() => {
    const map = new Map<number, typeof highlightedNotes[0]>()

    highlightedNotes.forEach(n => {
      const semi = getNoteIndex(n.note)

      for (let o = 0; o < octaves; o++) {
        const midi = 12 * (startOctave + o + 1) + semi
        map.set(midi, n)
      }
    })

    return map
  }, [highlightedNotes, startOctave, octaves])

  const whiteKeyWidth = compact ? 34 : 48
  const whiteKeyHeight = compact ? 130 : 180

  const blackKeyWidth = whiteKeyWidth * 0.6
  const blackKeyHeight = whiteKeyHeight * 0.62

  const headerHeight = 10

  const getColor = useCallback((noteInfo?: typeof highlightedNotes[0]) => {

    if (!noteInfo) return ""

    if (noteInfo.isRoot) return `hsl(var(--degree-1))`

    const stage = STAGE_LIGHTNESS[colorStage % STAGE_LIGHTNESS.length]

    /* 🎯 DEGREE */
    if (colorMode === "degree" && noteInfo.degree) {
      return `hsl(var(--degree-${noteInfo.degree}) / ${stage / 100 + .2})`
    }

    /* 🎯 NOTE */
    if (colorMode === "note") {
      const hue = NOTE_HUES[noteInfo.note]
      if (hue !== undefined)
        return `hsl(${hue} 75% ${stage}%)`
    }

    /* 🎯 FUNCTION */
    if (colorMode === "function" && noteInfo.function) {
      const hue = FUNCTION_HUES[noteInfo.function]
      return `hsl(${hue} 75% ${stage}%)`
    }

    return "hsl(220 70% 55%)"

  }, [colorMode, colorStage])

  const press = (midi: number) => {
    setPressedKey(midi)
    playNote(midi, 0.9, 0.45)
    setTimeout(() => setPressedKey(null), 120)
  }

  const whiteKeys: React.ReactNode[] = []
  const blackKeys: React.ReactNode[] = []

  for (let oct = 0; oct < octaves; oct++) {

    const currentOctave = startOctave + oct

    for (let w = 0; w < 7; w++) {

      const keyIdx = oct * 7 + w
      const x = keyIdx * whiteKeyWidth + 2
      const noteName = WHITE_NOTES[w]
      const midi = noteNameToMidi(noteName, currentOctave)

      const noteInfo = noteMap.get(midi)
      const isHighlighted = !!noteInfo
      const isPressed = pressedKey === midi
      const color = getColor(noteInfo)

      whiteKeys.push(
        <g key={`white-${keyIdx}`} onMouseDown={() => press(midi)} className="cursor-pointer">

          <rect
            x={x}
            y={headerHeight}
            width={whiteKeyWidth - 2}
            height={whiteKeyHeight}
            rx={6}
            fill={isHighlighted ? color : "url(#whiteGrad)"}
            stroke="rgba(0,0,0,.25)"
            strokeWidth={1.2}
            style={{
              filter: isHighlighted
                ? `drop-shadow(0 0 2.6px ${color})`
                : "drop-shadow(0 4px 6px rgba(0,0,0,.25))",
              transform: isPressed ? "translateY(4px)" : "translateY(0px)",
              transition: "all .12s ease"
            }}
          />

          {isHighlighted && (
            <text
              x={x + whiteKeyWidth / 2}
              y={headerHeight + whiteKeyHeight - 26}
              textAnchor="middle"
              fill="white"
              style={{ fontSize: 13, fontWeight: 800 }}
            >
              {noteInfo?.note}
            </text>
          )}

        </g>
      )
    }

    for (const [semiStr, whiteIdx] of Object.entries(BLACK_NOTE_POSITIONS)) {

      const semi = Number(semiStr)
      const keyIdx = oct * 7 + whiteIdx
      const x = (keyIdx + 1) * whiteKeyWidth - blackKeyWidth / 2 + 2
      const midi = 12 * (currentOctave + 1) + semi

      const noteInfo = noteMap.get(midi)
      const isHighlighted = !!noteInfo
      const isPressed = pressedKey === midi
      const color = getColor(noteInfo)

      blackKeys.push(
        <g key={`black-${oct}-${semi}`} onMouseDown={() => press(midi)} className="cursor-pointer">

          <rect
            x={x}
            y={headerHeight}
            width={blackKeyWidth}
            height={blackKeyHeight}
            rx={5}
            fill={isHighlighted ? color : "url(#blackGrad)"}
            style={{
              filter: isHighlighted
                ? `drop-shadow(0 0 16px ${color})`
                : "drop-shadow(0 10px 12px rgba(0,0,0,.7))",
              transform: isPressed ? "translateY(3px) scale(.96)" : "translateY(0)",
              transition: "all .12s ease"
            }}
          />

          {isHighlighted && (
            <text
              x={x + blackKeyWidth / 2}
              y={headerHeight + blackKeyHeight - 18}
              textAnchor="middle"
              fill="white"
              style={{ fontSize: 11, fontWeight: 800 }}
            >
              {noteInfo?.note}
            </text>
          )}

        </g>
      )
    }
  }

  return (
    <div className={`${themeClass} inline-block`}>
      <svg
  width={compact ? "100%" : "auto"}
  height={compact ? "auto" : whiteKeyHeight + 30}
  viewBox={`0 0 ${octaves * 7 * whiteKeyWidth + 4} ${whiteKeyHeight + 30}`}
>
        <defs>
          <linearGradient id="whiteGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="100%" stopColor="#e5e7eb"/>
          </linearGradient>

          <linearGradient id="blackGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#222"/>
            <stop offset="100%" stopColor="#000"/>
          </linearGradient>
        </defs>

        {whiteKeys}
        {blackKeys}
      </svg>
    </div>
  )
}



export default PianoKeyboard