import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import GuitarFretboard from '@/components/GuitarFretboard';
import ControlPanel, { type ViewMode } from '@/components/ControlPanel';
import ChordGeneratorView from '@/components/ChordGeneratorView';
import ProgressionGeneratorView from '@/components/ProgressionGeneratorView';
import {
  getScale,
  getHarmonicField,
  getHarmonicFieldForScale,
  getFretboardNotes,
  filterByScale,
  filterByNotes,
  getArpeggio,
  getRelatedPentatonic,
  useFlats,
  type ChordInfo,
  type FretNote,
  SCALE_FORMULAS,
  getNoteIndex,
  getNoteName,
} from '@/lib/musicTheory';

const allFretNotes = getFretboardNotes(24);

const Index: React.FC = () => {
  const [root, setRoot] = useState('C');
  const [scaleType, setScaleType] = useState('Maior');
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [selectedChord, setSelectedChord] = useState<ChordInfo | null>(null);
  const [showArpeggio, setShowArpeggio] = useState(true);
  const [showPentatonic, setShowPentatonic] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [colorMode, setColorMode] = useState<'degree' | 'note' | 'function'>('degree');
  const [noteSize, setNoteSize] = useState(14);
  const [show24Frets, setShow24Frets] = useState(false);

  const currentMaxFret = show24Frets ? 24 : 12;

  const harmonicField = useMemo(() => getHarmonicField(root), [root]);
  const scaleHarmonicField = useMemo(() => getHarmonicFieldForScale(root, scaleType), [root, scaleType]);

  // Auto-select first chord when switching to chord mode
  useEffect(() => {
    if ((viewMode === 'chord' || viewMode === 'improvisation') && !selectedChord) {
      setSelectedChord(harmonicField[0]);
    }
  }, [viewMode, harmonicField, selectedChord]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const scaleNotes = useMemo(() => filterByScale(allFretNotes, root, scaleType), [root, scaleType]);

  const getShowNotes = (): boolean => ['full', 'notes', 'notes-degrees', 'chord', 'improvisation', 'tensions'].includes(viewMode);
  const getShowDegrees = (): boolean => ['degrees', 'notes-degrees', 'intervals', 'tensions'].includes(viewMode);

  const renderMainView = () => {
    switch (viewMode) {
      case 'full':
      case 'notes':
      case 'degrees':
      case 'notes-degrees':
      case 'tensions':
        return (
          <div className="space-y-4">
            <ViewHeader title={`${root} ${scaleType}`} subtitle={`${getScale(root, scaleType).join(' – ')}`} />
            <div className="overflow-x-auto pb-4">
              <GuitarFretboard
                notes={scaleNotes}
                maxFret={currentMaxFret}
                showNoteNames={getShowNotes()}
                showDegrees={getShowDegrees()}
                colorMode={colorMode}
                noteRadius={noteSize}
                title={`${root} ${scaleType}`}
                subtitle={viewMode === 'tensions' ? 'Tensões destacadas' : undefined}
              />
            </div>
            {viewMode === 'tensions' && (
              <TensionLegend />
            )}
            <DegreeLegend />
          </div>
        );

      case 'intervals':
        return (
          <div className="space-y-4">
            <ViewHeader title={`Intervalos — ${root} ${scaleType}`} />
            <div className="overflow-x-auto pb-4">
              <GuitarFretboard
                notes={scaleNotes}
                maxFret={currentMaxFret}
                showNoteNames={false}
                showDegrees={true}
                colorMode={colorMode}
                noteRadius={noteSize}
                title={`Intervalos de ${root} ${scaleType}`}
              />
            </div>
            <IntervalLegend root={root} scaleType={scaleType} />
          </div>
        );

      case 'chord':
        return renderChordView();

      case 'harmonic-field':
        return renderHarmonicFieldView();

      case 'harmonic-matrix':
        return renderHarmonicMatrixView();

      case 'compare-pentatonics':
        return renderComparePentatonicsView();

      case 'improvisation':
        return renderImprovisationView();

      case 'chord-generator':
        return <ChordGeneratorView root={root} setRoot={setRoot} />;

      case 'progressions':
        return <ProgressionGeneratorView root={root} setRoot={setRoot} />;

      default:
        return (
          <div className="space-y-4">
            <ViewHeader title={`${root} ${scaleType}`} />
            <div className="overflow-x-auto pb-4">
              <GuitarFretboard
                notes={scaleNotes}
                maxFret={currentMaxFret}
                showNoteNames={true}
                colorMode={colorMode}
                noteRadius={noteSize}
              />
            </div>
          </div>
        );
    }
  };

  const renderChordView = () => {
    if (!selectedChord) return null;
    const flats = useFlats(root);
    const chordNotes = filterByNotes(allFretNotes, selectedChord.notes, selectedChord.root);
    const arpNotes = showArpeggio
      ? filterByNotes(allFretNotes, getArpeggio(selectedChord.root, selectedChord.quality, flats), selectedChord.root)
      : [];
    const pentNotes = showPentatonic
      ? filterByScale(allFretNotes, selectedChord.root, selectedChord.quality === 'minor' || selectedChord.quality === 'diminished' ? 'Pentatônica Menor' : 'Pentatônica Maior')
      : [];

    return (
      <div className="space-y-6">
        <ViewHeader
          title={`${selectedChord.romanNumeral} — ${selectedChord.name}`}
          subtitle={`Notas: ${selectedChord.notes.join(' – ')}`}
        />
        <div className="overflow-x-auto pb-2">
          <GuitarFretboard
            notes={chordNotes}
            maxFret={currentMaxFret}
            showNoteNames={true}
            colorMode={colorMode}
            noteRadius={noteSize}
            title={`Acorde ${selectedChord.name}`}
            subtitle={`Notas: ${selectedChord.notes.join(' ')}`}
          />
        </div>
        {showArpeggio && (
          <div className="overflow-x-auto pb-2">
            <GuitarFretboard
              notes={arpNotes}
              maxFret={currentMaxFret}
              showNoteNames={true}
              colorMode={colorMode}
              noteRadius={noteSize}
              title={`Arpejo de ${selectedChord.name}`}
            />
          </div>
        )}
        {showPentatonic && (
          <div className="overflow-x-auto pb-2">
            <GuitarFretboard
              notes={pentNotes}
              maxFret={currentMaxFret}
              showNoteNames={true}
              showDegrees={true}
              colorMode={colorMode}
              noteRadius={noteSize}
              title={`Pentatônica de ${selectedChord.root}`}
            />
          </div>
        )}
        <div className="overflow-x-auto pb-2">
          <GuitarFretboard
            notes={scaleNotes}
            maxFret={currentMaxFret}
            showNoteNames={true}
            colorMode={colorMode}
            noteRadius={noteSize * 0.85}
            title={`Escala do Tom (${root} ${scaleType})`}
          />
        </div>
      </div>
    );
  };

  const renderHarmonicFieldView = () => {
    const isPentatonic = scaleType === 'Pentatônica Maior' || scaleType === 'Pentatônica Menor';
    const isMinorFamily = ['Menor Natural', 'Menor Harmônica', 'Menor Melódica', 'Pentatônica Menor', 'Eólio', 'Dórico', 'Frígio', 'Lócrio'].includes(scaleType);
    const field = scaleHarmonicField;

    const getScaleLabel = () => {
      if (isPentatonic) return `Pentatônicas do Campo Harmônico de ${root}`;
      if (isMinorFamily) return `Campo Harmônico de ${root} (${scaleType})`;
      return `Campo Harmônico de ${root}`;
    };

    return (
      <div className="space-y-6">
        <ViewHeader 
          title={getScaleLabel()} 
          subtitle={isPentatonic ? "Pentatônicas de cada grau da tonalidade" : "Todos os graus com diagramas individuais"} 
        />
        {field.map(ch => {
          let scType: string;
          if (isPentatonic) {
            scType = (ch.quality === 'minor' || ch.quality === 'diminished') ? 'Pentatônica Menor' : 'Pentatônica Maior';
          } else {
            // Use the scale that matches the chord quality from the harmonic field
            if (ch.quality === 'Major') scType = 'Maior';
            else if (ch.quality === 'minor') scType = 'Menor Natural';
            else if (ch.quality === 'diminished') scType = 'Lócrio';
            else if (ch.quality === 'augmented') scType = 'Maior';
            else scType = 'Maior';
          }
          const notes = filterByScale(allFretNotes, ch.root, scType);
          const displayLabel = isPentatonic ? scType : `${ch.name} (${ch.quality})`;
          return (
            <div key={ch.name} className="overflow-x-auto pb-2">
              <GuitarFretboard
                notes={notes}
                maxFret={currentMaxFret}
                showNoteNames={true}
                showDegrees={true}
                colorMode={colorMode}
                noteRadius={noteSize * 0.9}
                title={`${ch.romanNumeral} — ${isPentatonic ? `${ch.root} ${scType}` : ch.name}`}
                subtitle={`Notas: ${getScale(ch.root, scType).join(' – ')}`}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const renderHarmonicMatrixView = () => (
    <div className="space-y-4">
      <ViewHeader title={`Matriz Harmônica — ${root}`} subtitle="Comparação lado a lado" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {harmonicField.map(ch => {
          const scType = ch.quality === 'Major' ? 'Maior' : ch.quality === 'minor' ? 'Menor Natural' : 'Lócrio';
          const notes = filterByScale(allFretNotes, ch.root, scType);
          return (
            <div key={ch.name} className="bg-card rounded-lg border border-border p-3 panel-shadow overflow-x-auto">
              <GuitarFretboard
                notes={notes}
                maxFret={12}
                showNoteNames={true}
                colorMode={colorMode}
                compact={true}
                noteRadius={noteSize * 0.7}
                title={`${ch.romanNumeral} — ${ch.name}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderComparePentatonicsView = () => {
    const scale = getScale(root, 'Maior');
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#1abc9c', '#e91e63'];
    return (
      <div className="space-y-4">
        <ViewHeader title={`Pentatônicas do Campo de ${root}`} subtitle="Comparação visual" />
        {scale.map((note, i) => {
          const quality = [0, 3, 4].includes(i) ? 'Pentatônica Maior' : 'Pentatônica Menor';
          const notes = filterByScale(allFretNotes, note, quality);
          return (
            <div key={note} className="overflow-x-auto pb-2">
              <GuitarFretboard
                notes={notes}
                maxFret={currentMaxFret}
                showNoteNames={true}
                showDegrees={true}
                colorMode={colorMode}
                noteRadius={noteSize * 0.9}
                title={`${note} ${quality}`}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const renderImprovisationView = () => {
    if (!selectedChord) return null;
    const chordNotes = filterByNotes(allFretNotes, selectedChord.notes, selectedChord.root);
    const pentNotes = filterByScale(
      allFretNotes,
      selectedChord.root,
      selectedChord.quality === 'minor' || selectedChord.quality === 'diminished' ? 'Pentatônica Menor' : 'Pentatônica Maior'
    );
    return (
      <div className="space-y-6">
        <ViewHeader
          title={`Improvisação sobre ${selectedChord.name}`}
          subtitle="Notas alvo, acorde e escala recomendada"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard title="Notas do Acorde" items={selectedChord.notes} color="hsl(var(--degree-1))" />
          <InfoCard title="Escala Recomendada" items={getScale(root, scaleType)} color="hsl(var(--degree-5))" />
        </div>
        <div className="overflow-x-auto pb-2">
          <GuitarFretboard
            notes={chordNotes}
            maxFret={currentMaxFret}
            showNoteNames={true}
            colorMode={colorMode}
            noteRadius={noteSize}
            title={`Notas Alvo — ${selectedChord.name}`}
            subtitle="Chord tones"
          />
        </div>
        <div className="overflow-x-auto pb-2">
          <GuitarFretboard
            notes={pentNotes}
            maxFret={currentMaxFret}
            showNoteNames={true}
            showDegrees={true}
            colorMode={colorMode}
            noteRadius={noteSize}
            title={`Pentatônica — ${selectedChord.root}`}
          />
        </div>
        <div className="overflow-x-auto pb-2">
          <GuitarFretboard
            notes={scaleNotes}
            maxFret={currentMaxFret}
            showNoteNames={true}
            colorMode={colorMode}
            noteRadius={noteSize * 0.85}
            title={`Escala Completa — ${root} ${scaleType}`}
          />
        </div>
      </div>
    );
  };

  const mainRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback((format: 'svg' | 'png') => {
    const svgEl = mainRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    if (format === 'svg') {
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      downloadBlob(blob, `guitar-${root}-${scaleType}.svg`);
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          if (blob) downloadBlob(blob, `guitar-${root}-${scaleType}.png`);
        });
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
    }
  }, [root, scaleType]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ControlPanel
        root={root} setRoot={setRoot}
        scaleType={scaleType} setScaleType={setScaleType}
        viewMode={viewMode} setViewMode={setViewMode}
        selectedChord={selectedChord} setSelectedChord={setSelectedChord}
        harmonicField={harmonicField}
        showArpeggio={showArpeggio} setShowArpeggio={setShowArpeggio}
        showPentatonic={showPentatonic} setShowPentatonic={setShowPentatonic}
        darkMode={darkMode} setDarkMode={setDarkMode}
        colorMode={colorMode} setColorMode={setColorMode}
        noteSize={noteSize} setNoteSize={setNoteSize}
        show24Frets={show24Frets} setShow24Frets={setShow24Frets}
      />
      <main ref={mainRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {/* Export buttons */}
        <div className="flex items-center gap-2 mb-4 justify-end">
          <span className="text-[9px] text-muted-foreground/60 italic mr-auto">Clique nas notas no braço para ouvir. Use os controles na barra lateral para explorar escalas, acordes e mais.</span>
          <button
            onClick={() => handleExport('svg')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            📥 SVG
          </button>
          <button
            onClick={() => handleExport('png')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            📥 PNG
          </button>
        </div>
        {renderMainView()}
      </main>
    </div>
  );
};

function ViewHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function DegreeLegend() {
  const degrees = [
    { num: 1, label: 'Tônica', color: 'var(--degree-1)' },
    { num: 2, label: '2ª', color: 'var(--degree-2)' },
    { num: 3, label: '3ª', color: 'var(--degree-3)' },
    { num: 4, label: '4ª', color: 'var(--degree-4)' },
    { num: 5, label: '5ª', color: 'var(--degree-5)' },
    { num: 6, label: '6ª', color: 'var(--degree-6)' },
    { num: 7, label: '7ª', color: 'var(--degree-7)' },
  ];
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {degrees.map(d => (
        <div key={d.num} className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${d.color})` }} />
          <span className="text-xs text-foreground font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function TensionLegend() {
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground mb-1">Tensões Harmônicas</p>
      <p>9ª, 11ª e 13ª são extensões que adicionam cor ao acorde. As tensões disponíveis dependem do grau e do modo.</p>
    </div>
  );
}

function IntervalLegend({ root, scaleType }: { root: string; scaleType: string }) {
  const formula = SCALE_FORMULAS[scaleType] || [];
  const intervalNames: Record<number, string> = {
    0: 'Tônica (1)', 1: '2ª menor (b2)', 2: '2ª maior (2)',
    3: '3ª menor (b3)', 4: '3ª maior (3)', 5: '4ª justa (4)',
    6: 'Trítono (b5)', 7: '5ª justa (5)', 8: '6ª menor (b6)',
    9: '6ª maior (6)', 10: '7ª menor (b7)', 11: '7ª maior (7)',
  };
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-2">Fórmula: {scaleType}</p>
      <div className="flex flex-wrap gap-2">
        {formula.map((interval, i) => (
          <span key={i} className="px-2 py-0.5 bg-secondary rounded text-secondary-foreground font-mono">
            {intervalNames[interval] || interval}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h4 className="text-sm font-bold text-foreground mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span
            key={item}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
            style={{ backgroundColor: color, color: 'white' }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default Index;
