import React from 'react';
import { useInstrument, type InstrumentType } from '@/contexts/InstrumentContext';
import { Guitar, Piano } from 'lucide-react';
import { playClick } from '@/lib/audioEngine';

const BassIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 4v8.5a2.5 2.5 0 0 1-5 0V7a2.5 2.5 0 0 0-5 0v8.5a2.5 2.5 0 0 1-5 0V4" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const INSTRUMENT_CONFIG: Record<InstrumentType, { label: string; icon: React.ReactNode; color: string }> = {
  guitar: {
    label: 'Guitarra',
    icon: <Guitar size={20} />,
    color: 'from-orange-500 to-amber-500',
  },
  bass: {
    label: 'Baixo',
    icon: <BassIcon size={20} />,
    color: 'from-indigo-500 to-purple-500',
  },
  piano: {
    label: 'Piano',
    icon: <Piano size={20} />,
    color: 'from-emerald-500 to-teal-500',
  },
};

const InstrumentSwitcher: React.FC = () => {
  const { instrument, cycleInstrument } = useInstrument();
  const config = INSTRUMENT_CONFIG[instrument];

  return (
    <button
      onClick={() => {
        playClick(800);
        cycleInstrument();
      }}
      className={`
        relative group flex items-center gap-2 px-3 py-2 rounded-xl
        bg-gradient-to-r ${config.color}
        text-white font-semibold text-xs
        shadow-lg hover:shadow-xl hover:scale-105
        active:scale-95 transition-all duration-200
        ring-2 ring-white/20
      `}
      title={`Instrumento: ${config.label} — Clique para trocar`}
    >
      <span className="transition-transform duration-300 group-hover:rotate-12">
        {config.icon}
      </span>
      <span className="hidden sm:inline">{config.label}</span>
    </button>
  );
};

export default InstrumentSwitcher;
