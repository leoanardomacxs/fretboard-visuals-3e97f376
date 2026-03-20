import React, { useMemo, useState, useRef, useEffect } from 'react'
import { ALL_ROOTS, spellChordNotes, getDegree } from '@/lib/musicTheory'
import { CHORD_TYPES } from '@/lib/chordGenerator'
import PianoKeyboard from '@/components/PianoKeyboard'
import { playChord, noteNameToMidi } from '@/lib/audioEngine'
import { ChevronDown } from 'lucide-react'

interface Props {
  root: string
  setRoot: (r: string) => void
  colorMode?: 'degree' | 'note' | 'function'
  colorStage?: number
}

const CHORD_GROUPS = {
  'BÁSICOS': ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'],
  'POWER CHORD': ['5'],
  'COM SÉTIMA': ['7', 'maj7', 'min7', 'min-maj7', 'dim7', 'half-dim7', 'aug7', '7sus4'],
  'EXTENSÕES': ['6', '9', 'add9', 'madd9', 'm6', 'maj9', 'm9'],
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
  'major','minor','7','maj7','min7','sus2','sus4',
  'dim','aug','half-dim7','dim7','min-maj7',
  'aug7','7sus4','add9','madd9','6','m6','9','maj9','m9',
]

const PianoChordGenerator: React.FC<Props> = ({
  root,
  setRoot,
  colorMode = 'degree',
  colorStage = 0
}) => {

  const [selectedType, setSelectedType] = useState('maj7')
  const [typeOpen, setTypeOpen] = useState(false)
  const typeRef = useRef<HTMLDivElement>(null)
  const [showAll, setShowAll] = useState(false)

  // 🔽 dropdown
  const [rootOpen, setRootOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
      setRootOpen(false)
    }
    if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
      setTypeOpen(false)
    }
  }

  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [])

  const chords = useMemo(() => {

    // 🔘 SHOW ALL → todos os tipos da mesma raiz
    if (showAll) {
      const result = []

      for (const [key, def] of Object.entries(CHORD_TYPES)) {
        if (!def?.intervals) continue

        const notes = spellChordNotes(root, def.intervals)

        result.push({
          name: `${root}${TYPE_DISPLAY[key] ?? def.label ?? ''}`,
          notes,
          highlighted: notes.map((note, i) => ({
            note,
            degree: getDegree(note, root) ?? 1,
            isRoot: i === 0
          })),
          type: key,
        })
      }

      return result.sort((a, b) => {
        const aIndex = CHORD_PRIORITY.indexOf(a.type)
        const bIndex = CHORD_PRIORITY.indexOf(b.type)
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
      })
    }

    // 🔘 SINGLE CHORD
    const def = CHORD_TYPES[selectedType]
    if (!def?.intervals) return []

    const notes = spellChordNotes(root, def.intervals)

    return [{
      name: `${root}${TYPE_DISPLAY[selectedType] ?? ''}`,
      notes,
      highlighted: notes.map((note, i) => ({
        note,
        degree: getDegree(note, root) ?? 1,
        isRoot: i === 0
      })),
      type: selectedType
    }]

  }, [root, selectedType, showAll])

  const playChordSound = (notes: string[]) => {
    const baseOctave = 3
    const midi = notes.map((n, i) =>
      noteNameToMidi(n, baseOctave + Math.floor(i / 2))
    )
    playChord(midi)
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h2 className="text-xl font-bold">Piano Chord Engine</h2>
        <p className="text-sm text-muted-foreground">
          {showAll
            ? `Todos os acordes de ${root}`
            : `${root}${TYPE_DISPLAY[selectedType]}`}
        </p>
      </div>

      {/* CONTROLES */}
      <div className="flex gap-3 flex-wrap">

        {/* 🎼 ROOT DROPDOWN */}
        <div ref={rootRef} className="relative">
          <button
            onClick={() => setRootOpen(!rootOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card"
          >
            <span className="text-xs text-muted-foreground">Nota:</span>
            <span>{root}</span>
            <ChevronDown className={`w-4 h-4 ${rootOpen ? 'rotate-180' : ''}`} />
          </button>

          {rootOpen && (
            <div className="absolute mt-1 bg-card border rounded-lg p-2 grid grid-cols-4 gap-1 z-50">
              {ALL_ROOTS.map(n => (
                <button
                  key={n}
                  onClick={() => {
                    setRoot(n)
                    setRootOpen(false)
                  }}
                  className={`px-3 py-2 text-xs rounded ${
                    root === n
                      ? 'bg-primary text-white'
                      : 'hover:bg-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        
            
  <div ref={typeRef} className="relative">

    {/* BOTÃO */}
    <button
      onClick={() => setTypeOpen(!typeOpen)}
      className="px-4 py-2 rounded-lg border bg-card flex items-center gap-2"
    >
      <span className="text-xs text-muted-foreground">Tipo:</span>
      <span className="font-bold">
        {TYPE_DISPLAY[selectedType] || selectedType}
      </span>
    </button>

    {/* DROPDOWN */}
    {typeOpen && (
      <div className="absolute mt-2 w-80 bg-card border rounded-xl p-4 z-50 shadow-lg max-h-80 overflow-y-auto space-y-4">

        {Object.entries(CHORD_GROUPS).map(([group, types]) => (
          <div key={group}>

            {/* TÍTULO */}
            <div className="text-xs text-muted-foreground mb-2">
              {group}
            </div>

            {/* GRID */}
            <div className="grid grid-cols-3 gap-2">
              {types.map(t => (
                CHORD_TYPES[t] && (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedType(t)
                      setTypeOpen(false)
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      selectedType === t
                        ? 'bg-primary text-white'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    {TYPE_DISPLAY[t] || t}
                  </button>
                )
              ))}
            </div>

          </div>
        ))}

      </div>
    )}
  </div>

        {/* 🔘 TOGGLE */}
        <div
  onClick={() => setShowAll(!showAll)}
  className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer ${
    showAll ? 'bg-primary/10 border-primary' : 'bg-card'
  }`}
>
  {/* TEXTO */}
  <span className="text-sm">Mostrar todos</span>

  {/* SWITCH (a chavinha) */}
  <div
    className={`w-10 h-5 flex items-center rounded-full p-1 transition ${
      showAll ? 'bg-primary' : 'bg-muted'
    }`}
  >
    {/* BOLINHA */}
    <div
      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${
        showAll ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </div>
</div>

      </div>

      {/* GRID */}
      <div className={
  showAll
     ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
      : "w-full flex justify-center items-center"
}>

        {chords.map((chord, i) => (
          <div
  key={i}
  onClick={() => playChordSound(chord.notes)}
  className={`cursor-pointer ${
    showAll
      ? "p-4 rounded-xl border bg-card hover:shadow-md"
      : "w-full max-w-[720px] flex flex-col items-center"
  }`}
>
                    <h3 className={`font-bold mb-2 ${
          showAll ? "text-sm" : "text-xl"
        }`}>
          {chord.name}
        </h3>

                    <PianoKeyboard
          highlightedNotes={chord.highlighted}
          octaves={2} 
          startOctave={2}
          colorMode={colorMode}
          colorStage={0}
          compact={showAll}
        />

            <div className="text-xs mt-2 text-muted-foreground">
              {chord.notes.join(' • ')}
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}

export default PianoChordGenerator