import React from 'react';
import { getNoteIndex, getNoteName, useFlats, spellScale, SCALE_FORMULAS } from '@/lib/musicTheory';

interface ScaleInfoPanelProps {
  root: string;
  scaleType: string;
}

// Mode degree positions (which degree of the major scale each mode starts on)
const MODE_DEGREES: Record<string, { degree: number; label: string; ordinal: string }> = {
  'Jônio':     { degree: 1, label: 'primeiro', ordinal: '1º' },
  'Dórico':    { degree: 2, label: 'segundo',  ordinal: '2º' },
  'Frígio':    { degree: 3, label: 'terceiro', ordinal: '3º' },
  'Lídio':     { degree: 4, label: 'quarto',   ordinal: '4º' },
  'Mixolídio': { degree: 5, label: 'quinto',   ordinal: '5º' },
  'Eólio':     { degree: 6, label: 'sexto',    ordinal: '6º' },
  'Lócrio':    { degree: 7, label: 'sétimo',   ordinal: '7º' },
};

// Semitones to go back from the mode root to find the parent major key
// If mode starts on degree N of major scale, parent root = root - MAJOR_FORMULA[N-1] semitones
const MAJOR_FORMULA = [0, 2, 4, 5, 7, 9, 11];

function getParentMajorKey(root: string, modeDegree: number): string {
  const rootSemi = getNoteIndex(root);
  const interval = MAJOR_FORMULA[modeDegree - 1];
  const parentSemi = ((rootSemi - interval) % 12 + 12) % 12;
  const flats = useFlats(root);
  return getNoteName(parentSemi, flats);
}

function getRelativeMinor(root: string): string {
  const semi = getNoteIndex(root);
  const minorSemi = ((semi + 9) % 12); // 6th degree = -3 semitones
  const flats = useFlats(root);
  return getNoteName(minorSemi, flats);
}

function getRelativeMajor(root: string): string {
  const semi = getNoteIndex(root);
  const majorSemi = ((semi + 3) % 12);
  const flats = useFlats(root);
  return getNoteName(majorSemi, flats);
}

const ScaleInfoPanel: React.FC<ScaleInfoPanelProps> = ({ root, scaleType }) => {
  const isGreekMode = !!MODE_DEGREES[scaleType];
  const isMajor = scaleType === 'Maior';
  const isMinorNatural = scaleType === 'Menor Natural';
  const isPentatonicMajor = scaleType === 'Pentatônica Maior';
  const isPentatonicMinor = scaleType === 'Pentatônica Menor';
  const isBlues = scaleType === 'Blues';
  const isHarmonicMinor = scaleType === 'Menor Harmônica';
  const isMelodicMinor = scaleType === 'Menor Melódica';

  // Greek modes info
  if (isGreekMode) {
    const { degree, label, ordinal } = MODE_DEGREES[scaleType];
    const parentKey = getParentMajorKey(root, degree);
    const parentScale = spellScale(parentKey, 'Maior');
    const modeScale = spellScale(root, scaleType);

    return (
      <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Modo Grego</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-sm font-bold text-foreground">{root} {scaleType}</span>
        </div>

        <p className="text-sm text-muted-foreground">
          É a escala maior onde <span className="font-bold text-foreground">{root}</span> é o{' '}
          <span className="font-bold text-foreground">{ordinal} grau</span> ({label}).
        </p>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Resultado:</span>
          <span className="text-sm font-bold text-primary">{parentKey} Maior</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {modeScale.map((note, i) => {
            const isRoot = i === 0;
            return (
              <span
                key={i}
                className={`inline-flex items-center justify-center min-w-[2rem] h-8 rounded-full text-xs font-bold px-2 ${
                  isRoot
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {note}
              </span>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            Escala mãe: <span className="font-semibold text-foreground">{parentKey} Maior</span> → {parentScale.join(' – ')}
          </p>
        </div>
      </div>
    );
  }

  // Major and minor relative keys
  if (isMajor || isMinorNatural || isHarmonicMinor || isMelodicMinor) {
    const isMajorType = isMajor;
    const relativeName = isMajorType ? getRelativeMinor(root) : getRelativeMajor(root);
    const relativeType = isMajorType ? 'Menor Natural' : 'Maior';
    const relativeLabel = isMajorType ? `${relativeName}m` : `${relativeName}`;
    const relativeScale = spellScale(relativeName, relativeType);

    return (
      <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Informações da Escala</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Relativo {isMajorType ? 'menor' : 'maior'}:</span>
            <span className="text-sm font-bold text-foreground">{relativeLabel}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {isMajorType
            ? `${root} Maior e ${relativeName}m compartilham as mesmas notas. ${relativeName}m começa no 6º grau de ${root} Maior.`
            : `${root}m e ${relativeName} Maior compartilham as mesmas notas. ${relativeName} Maior começa no 3º grau de ${root} Menor.`
          }
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
              {root} {scaleType}
            </p>
            <div className="flex flex-wrap gap-1">
              {spellScale(root, scaleType).map((note, i) => (
                <span key={i} className={`text-xs font-mono font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
                  {note}{i < 6 ? ' ' : ''}
                </span>
              ))}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
              {relativeName} {relativeType}
            </p>
            <div className="flex flex-wrap gap-1">
              {relativeScale.map((note, i) => (
                <span key={i} className={`text-xs font-mono font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
                  {note}{i < 6 ? ' ' : ''}
                </span>
              ))}
            </div>
          </div>
        </div>

        {(isHarmonicMinor || isMelodicMinor) && (
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground italic">
              {isHarmonicMinor
                ? `A escala Menor Harmônica é derivada da Menor Natural com o 7º grau elevado em meio tom, criando um intervalo de 2ª aumentada entre o 6º e 7º grau.`
                : `A escala Menor Melódica é derivada da Menor Natural com o 6º e 7º graus elevados, eliminando o intervalo de 2ª aumentada.`
              }
            </p>
          </div>
        )}
      </div>
    );
  }

  // Pentatonic info
  if (isPentatonicMajor || isPentatonicMinor) {
    const parentType = isPentatonicMajor ? 'Maior' : 'Menor Natural';
    const relativePentRoot = isPentatonicMajor ? getRelativeMinor(root) : getRelativeMajor(root);
    const relativePentType = isPentatonicMajor ? 'Pentatônica Menor' : 'Pentatônica Maior';

    return (
      <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Informações da Escala</span>
        </div>

        <p className="text-xs text-muted-foreground">
          {isPentatonicMajor
            ? `${root} Pentatônica Maior é derivada de ${root} Maior, removendo o 4º e 7º graus.`
            : `${root} Pentatônica Menor é derivada de ${root} Menor Natural, removendo o 2º e 6º graus.`
          }
        </p>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Relativa:</span>
          <span className="text-sm font-bold text-foreground">{relativePentRoot} {relativePentType}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
              {root} {scaleType}
            </p>
            <div className="flex flex-wrap gap-1">
              {spellScale(root, scaleType).map((note, i) => (
                <span key={i} className="text-xs font-mono font-bold text-foreground">{note}</span>
              ))}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
              {relativePentRoot} {relativePentType}
            </p>
            <div className="flex flex-wrap gap-1">
              {spellScale(relativePentRoot, relativePentType).map((note, i) => (
                <span key={i} className="text-xs font-mono font-bold text-foreground">{note}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Blues
  if (isBlues) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Informações da Escala</span>
        </div>
        <p className="text-xs text-muted-foreground">
          A escala Blues de <span className="font-bold text-foreground">{root}</span> é a Pentatônica Menor com a adição da <span className="font-bold text-foreground">blue note</span> (b5/trítono), que cria a sonoridade característica do blues.
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
              {root} Blues
            </p>
            <div className="flex flex-wrap gap-1">
              {spellScale(root, 'Blues').map((note, i) => (
                <span key={i} className={`text-xs font-mono font-bold ${i === 3 ? 'text-primary' : 'text-foreground'}`}>
                  {note}
                </span>
              ))}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
              {root} Pentatônica Menor
            </p>
            <div className="flex flex-wrap gap-1">
              {spellScale(root, 'Pentatônica Menor').map((note, i) => (
                <span key={i} className="text-xs font-mono font-bold text-foreground">{note}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ScaleInfoPanel;
