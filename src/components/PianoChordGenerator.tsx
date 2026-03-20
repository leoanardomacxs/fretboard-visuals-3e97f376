import React, { useMemo } from 'react'
import { ALL_ROOTS, spellChordNotes, getDegree } from '@/lib/musicTheory'
import { CHORD_TYPES } from '@/lib/chordGenerator'
import PianoKeyboard from '@/components/PianoKeyboard'
import { playChord, noteNameToMidi } from '@/lib/audioEngine'

interface Props {
  root: string
  setRoot: (r: string) => void
  colorMode?: 'degree' | 'note' | 'function'
  colorStage?: number
}

const TYPE_DISPLAY: Record<string, string> = {
  major: '',
  minor: 'm',
  dim: 'dim',
  aug: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  '7': '7',
  maj7: 'maj7',
  min7: 'm7',
  'min-maj7': 'm(Maj7)',
  dim7: 'dim7',
  'half-dim7': 'm7b5',
  aug7: '+7',
  '7sus4': '7sus4',
  add9: 'add9',
  madd9: 'madd9',
  '6': '6',
  m6: 'm6',
  '9': '9',
  maj9: 'maj9',
  m9: 'm9',
}

const CHORD_PRIORITY = [
  'major', 'minor',
  '7', 'maj7', 'min7',
  'sus2', 'sus4',
  'dim', 'aug',
  'half-dim7', 'dim7', 'min-maj7',
  'aug7', '7sus4',
  'add9', 'madd9',
  '6', 'm6',
  '9', 'maj9', 'm9',
]

const PianoChordGenerator: React.FC<Props> = ({
  root,
  setRoot,
  colorMode = 'degree',
  colorStage = 0
}) => {

  const chords = useMemo(() => {

    const result = []

    for (const [key, def] of Object.entries(CHORD_TYPES)) {

      if (!def?.intervals) continue

      const notes = spellChordNotes(root, def.intervals)

      const highlighted = notes.map((note, i) => ({
  note,
  degree: getDegree(note, root) ?? 1, // <== Se undefined, usa 1
  isRoot: i === 0
}))

      result.push({
        name: `${root}${TYPE_DISPLAY[key] ?? def.label ?? ''}`,
        notes,
        highlighted,
        type: key,
      })
    }

    result.sort((a, b) => {
      const aIndex = CHORD_PRIORITY.indexOf(a.type)
      const bIndex = CHORD_PRIORITY.indexOf(b.type)
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    })

    return result

  }, [root])

  const playChordSound = (notes: string[]) => {
    const midi = notes.map(n => noteNameToMidi(n, 4))
    playChord(midi)
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* HEADER */}
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          Piano Chord Engine
        </h2>
        <p className="text-sm text-muted-foreground">
          Visualização harmônica completa em <span className="font-semibold text-foreground">{root}</span>
        </p>
      </div>

      {/* ROOT SELECT */}
      <div className="flex flex-wrap gap-2">
        {ALL_ROOTS.map(n => (
          <button
            key={n}
            onClick={() => setRoot(n)}
            className={`
              px-3 py-2 rounded-lg text-sm font-semibold
              transition-all duration-200
              active:scale-90
              ${root === n
                ? 'bg-primary text-white shadow-lg scale-105'
                : 'bg-card hover:bg-secondary hover:scale-105'}
            `}
          >
            {n}
          </button>
        ))}
      </div>

      {/* GRID DE ACORDES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">

        {chords.map((chord, i) => (

          <div
            key={i}
            onClick={() => playChordSound(chord.notes)}
            className="
              group relative p-5 rounded-2xl
              bg-card/80 backdrop-blur
              border border-white/10
              shadow-md
              hover:shadow-2xl
              hover:-translate-y-1
              transition-all duration-300
              cursor-pointer
            "
          >

            {/* glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-primary/10 to-purple-500/10 blur-xl"></div>

            {/* nome */}
            <h3 className="relative font-bold text-sm mb-4 tracking-wide">
              {chord.name}
            </h3>

            {/* 🎹 PIANO REAL */}
            <PianoKeyboard
            highlightedNotes={chord.highlighted}
            octaves={2}
            startOctave={3}
            colorMode={colorMode}          // manter modo atual
            colorStage={colorStage + i}    // i = índice da variação
            compact
            themeClass="piano-theme"
          /> 

            {/* notas */}
            <div className="relative text-xs mt-4 text-muted-foreground tracking-wide">
              {chord.notes.join(' • ')}
            </div>

          </div>

        ))}

      </div>
    </div>
  )
}

export default PianoChordGenerator