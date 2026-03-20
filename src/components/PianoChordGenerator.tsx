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

// ✅ INFO CENTRALIZADA (agora única e limpa)
const getChordInfo = (type: string) => {
  const map: Record<string, unknown> = {
    major: { formula: '1 - 3 - 5', feeling: 'Feliz, estável, brilhante' },
    minor: { formula: '1 - b3 - 5', feeling: 'Triste, introspectivo, emocional' },
    dim: { formula: '1 - b3 - b5', feeling: 'Tenso, instável, dramático' },
    aug: { formula: '1 - 3 - #5', feeling: 'Suspenso, misterioso' },
    '7': { formula: '1 - 3 - 5 - b7', feeling: 'Bluesy, dominante' },
    maj7: { formula: '1 - 3 - 5 - 7', feeling: 'Suave, jazzístico' },
    min7: { formula: '1 - b3 - 5 - b7', feeling: 'Soul, relaxado' },
    sus2: { formula: '1 - 2 - 5', feeling: 'Aberto, flutuante' },
    sus4: { formula: '1 - 4 - 5', feeling: 'Suspenso, expectante' },
  }

  return map[type] || {
    formula: '—',
    feeling: 'Caráter harmônico complexo'
  }
}

const PianoChordGenerator: React.FC<Props> = ({
  root,
  setRoot,
  colorMode = 'degree',
  colorStage = 0
}) => {

  const [selectedType, setSelectedType] = useState('maj7')
  const [typeOpen, setTypeOpen] = useState(false)
  const [rootOpen, setRootOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const typeRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)


  // ✅ CLICK OUTSIDE
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

  // ✅ CHORDS
  const chords = useMemo(() => {

    if (showAll) {
      return Object.entries(CHORD_TYPES)
        .filter(([_, def]) => def?.intervals)
        .map(([key, def]) => {
          const notes = spellChordNotes(root, def.intervals)

          return {
            name: `${root}${TYPE_DISPLAY[key] ?? def.label ?? ''}`,
            notes,
            type: key,
            highlighted: notes.map((note, i) => ({
              note,
              degree: getDegree(note, root) ?? 1,
              isRoot: i === 0
            }))
          }
        })
        .sort((a, b) => {
          const ai = CHORD_PRIORITY.indexOf(a.type)
          const bi = CHORD_PRIORITY.indexOf(b.type)
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
        })
    }

    const def = CHORD_TYPES[selectedType]
    if (!def?.intervals) return []

    const notes = spellChordNotes(root, def.intervals)

    return [{
      name: `${root}${TYPE_DISPLAY[selectedType] ?? ''}`,
      notes,
      type: selectedType,
      highlighted: notes.map((note, i) => ({
        note,
        degree: getDegree(note, root) ?? 1,
        isRoot: i === 0
      }))
    }]

  }, [root, selectedType, showAll])

  const playChordSound = (notes: string[]) => {
  const midi = notes.map((n, i) =>
    noteNameToMidi(n, 3 + Math.floor(i / 2))
  );

  playChord(midi);
};

  return (
    <div className="space-y-8">

      {/* CONTROLES */}
      <div className="flex gap-3 flex-wrap">

        {/* ROOT */}
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
                    root === n ? 'bg-primary text-white' : 'hover:bg-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TYPE */}
        <div ref={typeRef} className="relative">
          <button
            onClick={() => setTypeOpen(!typeOpen)}
            className="px-4 py-2 rounded-lg border bg-card flex items-center gap-2"
          >
            <span className="text-xs text-muted-foreground">Tipo:</span>
            <span className="font-bold">
              {TYPE_DISPLAY[selectedType] || selectedType}
            </span>
          </button>

          {typeOpen && (
            <div className="absolute mt-2 w-80 bg-card border rounded-xl p-4 z-50 shadow-lg max-h-80 overflow-y-auto space-y-4">
              {Object.entries(CHORD_GROUPS).map(([group, types]) => (
                <div key={group}>
                  <div className="text-xs text-muted-foreground mb-2">{group}</div>
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

        {/* TOGGLE */}
        <div
          onClick={() => setShowAll(!showAll)}
          className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer ${
            showAll ? 'bg-primary/10 border-primary' : 'bg-card'
          }`}
        >
          <span className="text-sm">Mostrar todos</span>
          <div className={`w-10 h-5 flex items-center rounded-full p-1 ${showAll ? 'bg-primary' : 'bg-muted'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transform ${showAll ? 'translate-x-5' : ''}`} />
          </div>
        </div>

      </div>

      {/* GRID */}
      <div className={
        showAll
          ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
          : "w-full flex justify-start"
      }>
        {chords.map((chord, i) => {
          const info = getChordInfo(chord.type)

          return (
            <div
  key={i}
  onClick={() => {
    if (showAll) {
      playChordSound(chord.notes)
    }
  }}
  className={`cursor-pointer ${
                showAll
                  ? "p-4 rounded-xl border bg-card hover:shadow-md"
                  : "w-full max-w-[720px] flex flex-col items-center"
              }`}
            >

              <PianoKeyboard
  highlightedNotes={chord.highlighted}
  octaves={2}
  startOctave={2}
  colorMode={colorMode}
  colorStage={0}
  compact={showAll}
  onNoteClick={(note) => {
    
  }}
/>

              <div className="text-xs mt-2 text-muted-foreground">
  {`${chord.name} = ${chord.notes.join(' • ')}`}
</div>

              {/* ✅ CARD DE INFO */}
              {!showAll && (
                <div
  onClick={(e) => {
    e.stopPropagation() // evita conflito com o container
    playChordSound(chord.notes)
  }}
  className="mt-4 w-full p-4 rounded-xl border bg-card shadow-sm cursor-pointer hover:bg-secondary/40 transition"
>
                  
                  <div className="text-sm font-semibold mb-2">
                    {chord.name}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Fórmula:</span> {info.formula}
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">Sensação:</span> {info.feeling}
                  </div>

                </div>
              )}

            </div>
          )
        })}
      </div>

    </div>
  )
}

export default PianoChordGenerator