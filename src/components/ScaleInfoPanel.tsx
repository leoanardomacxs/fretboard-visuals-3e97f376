import React from 'react';
import { getNoteIndex, getNoteName, useFlats, spellScale, SCALE_FORMULAS, SCALE_CATEGORIES } from '@/lib/musicTheory';

interface ScaleInfoPanelProps {
  root: string;
  scaleType: string;
  setScaleType: (s: string) => void;
}

const MODE_DEGREES: Record<string, { degree: number; label: string; ordinal: string; quality: string; feeling: string }> = {
  'Jônio':     { degree: 1, label: 'primeiro', ordinal: '1º', quality: 'Maior', feeling: 'Estável, feliz, natural.' },
  'Dórico':    { degree: 2, label: 'segundo',  ordinal: '2º', quality: 'Menor', feeling: 'Menor, mas com energia e esperança.' },
  'Frígio':    { degree: 3, label: 'terceiro', ordinal: '3º', quality: 'Menor', feeling: 'Som espanhol, tenso e sombrio.' },
  'Lídio':     { degree: 4, label: 'quarto',   ordinal: '4º', quality: 'Maior', feeling: 'Brilhante, aberto, meio "mágico".' },
  'Mixolídio': { degree: 5, label: 'quinto',   ordinal: '5º', quality: 'Maior', feeling: 'Bluesy, relaxado, típico do rock e blues.' },
  'Eólio':     { degree: 6, label: 'sexto',    ordinal: '6º', quality: 'Menor', feeling: 'Melancólico, triste, dramático.' },
  'Lócrio':    { degree: 7, label: 'sétimo',   ordinal: '7º', quality: 'Menor (instável)', feeling: 'Tenso, estranho, instável.' },
};

const SCALE_FEELINGS: Record<string, string> = {
  'Maior': 'Feliz, clara, estável, luminosa.',
  'Menor Natural': 'Triste, melancólica, introspectiva.',
  'Menor Harmônica': 'Dramática, intensa, exótica, meio oriental.',
  'Menor Melódica': 'Sofisticada, suave, levemente tensa, muito usada no jazz.',
};

const MAJOR_FORMULA = [0, 2, 4, 5, 7, 9, 11];

function getParentMajorKey(root: string, modeDegree: number): string {
  const rootSemi = getNoteIndex(root);
  const interval = MAJOR_FORMULA[modeDegree - 1];
  const parentSemi = ((rootSemi - interval) % 12 + 12) % 12;
  return getNoteName(parentSemi, true);
}

function getRelativeMinor(root: string): string {
  const semi = getNoteIndex(root);
  const minorSemi = ((semi + 9) % 12);
  return getNoteName(minorSemi, useFlats(root));
}

function getRelativeMajor(root: string): string {
  const semi = getNoteIndex(root);
  const majorSemi = ((semi + 3) % 12);
  return getNoteName(majorSemi, useFlats(root));
}

const FeelingBadge: React.FC<{ quality?: string; feeling: string }> = ({ quality, feeling }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {quality && (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
        {quality}
      </span>
    )}
    <span className="text-xs italic text-muted-foreground">Sensação: {feeling}</span>
  </div>
);

const ScaleInfoPanel: React.FC<ScaleInfoPanelProps> = ({ root, scaleType, setScaleType }) => {
  const [open, setOpen] = React.useState(false); // ✅ ADICIONADO

  const isGreekMode = !!MODE_DEGREES[scaleType];
  const isMajor = scaleType === 'Maior';
  const isMinorNatural = scaleType === 'Menor Natural';
  const isPentatonicMajor = scaleType === 'Pentatônica Maior';
  const isPentatonicMinor = scaleType === 'Pentatônica Menor';
  const isBlues = scaleType === 'Blues';
  const isHarmonicMinor = scaleType === 'Menor Harmônica';
  const isMelodicMinor = scaleType === 'Menor Melódica';

  // ✅ COMPONENTE REUTILIZÁVEL DO SELECTOR
  const ScaleSelector = () => (
    <div className="relative z-50">
      <button
  type="button"
  onClick={() => setOpen(prev => !prev)}
        className="w-full text-left px-3 py-2 rounded-lg bg-secondary text-foreground font-semibold flex justify-between items-center"
      >
        {scaleType}
        <span className="text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-card border border-border rounded-lg p-2 max-h-64 overflow-y-auto shadow-lg">
          {Object.entries(SCALE_CATEGORIES).map(([cat, scales]) => (
            <div key={cat} className="mb-2">
              <p className="text-[10px] uppercase text-muted-foreground mb-1 font-bold">
                {cat}
              </p>

              {scales.map(s => (
                <button
                key={s}
                onClick={() => {
  setScaleType(s);
  setOpen(false);
}}
                  className={`w-full text-left px-2 py-1 rounded text-xs ${
                    scaleType === s
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isGreekMode) {
    const { degree, label, ordinal, quality, feeling } = MODE_DEGREES[scaleType];
    const parentKey = getParentMajorKey(root, degree);
    const parentScale = spellScale(parentKey, 'Maior');
    const modeScale = spellScale(root, scaleType);

    return (
      <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
        <ScaleSelector /> {/* ✅ AQUI */}

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Modo Grego</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-sm font-bold text-foreground">{root} {scaleType}</span>
        </div>

        <FeelingBadge quality={quality} feeling={feeling} />

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

  if (isMajor || isMinorNatural || isHarmonicMinor || isMelodicMinor) {
    const isMajorType = isMajor;
    const relativeName = isMajorType ? getRelativeMinor(root) : getRelativeMajor(root);
    const relativeType = isMajorType ? 'Menor Natural' : 'Maior';
    const relativeLabel = isMajorType ? `${relativeName}m` : `${relativeName}`;
    const relativeScale = spellScale(relativeName, relativeType);
    const feeling = SCALE_FEELINGS[scaleType] || '';

    return (
      <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
        <ScaleSelector /> {/* ✅ AQUI */}

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Informações da Escala</span>
        </div>

        {feeling && <FeelingBadge feeling={feeling} />}

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Relativo {isMajorType ? 'menor' : 'maior'}:
          </span>
          <span className="text-sm font-bold text-foreground">{relativeLabel}</span>
        </div>

        <p className="text-xs text-muted-foreground">
          {isMajorType
            ? `${root} Maior e ${relativeName}m compartilham as mesmas notas.`
            : `${root}m e ${relativeName} Maior compartilham as mesmas notas.`
          }
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <p className="text-[10px] font-bold mb-1.5">{root} {scaleType}</p>
            {spellScale(root, scaleType).map((n, i) => (
              <span key={i}>{n} </span>
            ))}
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 border border-border">
            <p className="text-[10px] font-bold mb-1.5">{relativeName} {relativeType}</p>
            {relativeScale.map((n, i) => (
              <span key={i}>{n} </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isPentatonicMajor || isPentatonicMinor || isBlues) {
  const scale = spellScale(root, scaleType);

  const relative =
    isPentatonicMajor
      ? getRelativeMinor(root)
      : isPentatonicMinor
      ? getRelativeMajor(root)
      : null;

  return (
    <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
      <ScaleSelector />

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          {isBlues ? 'Escala Blues' : 'Escala Pentatônica'}
        </span>
        <span className="text-sm font-bold text-foreground">
          {root} {scaleType}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        {isBlues
          ? 'Escala com blue note, muito usada no blues e rock.'
          : 'Escala de 5 notas, muito usada para improvisação.'}
      </p>

      {relative && (
        <p className="text-xs text-muted-foreground">
          Relativa:{' '}
          <span className="font-bold text-foreground">
            {isPentatonicMajor ? `${relative}m` : relative}
          </span>
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {scale.map((note, i) => (
          <span
            key={i}
            className={`inline-flex items-center justify-center min-w-[2rem] h-8 rounded-full text-xs font-bold px-2 ${
              i === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {note}
          </span>
        ))}
      </div>
    </div>
  );
}
  return (
  <div className="bg-card border border-border rounded-lg p-4 mt-4 space-y-3">
    <ScaleSelector />

    <p className="text-sm text-muted-foreground">
      Escala {scaleType} não possui informações adicionais ainda.
    </p>
  </div>
);
};

export default ScaleInfoPanel;