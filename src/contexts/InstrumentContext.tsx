import React, { createContext, useContext, useState, useCallback } from 'react';

export type InstrumentType = 'guitar' | 'bass' | 'piano';

interface InstrumentContextType {
  instrument: InstrumentType;
  setInstrument: (i: InstrumentType) => void;
  cycleInstrument: () => void;
}

const InstrumentContext = createContext<InstrumentContextType>({
  instrument: 'guitar',
  setInstrument: () => {},
  cycleInstrument: () => {},
});

const INSTRUMENT_ORDER: InstrumentType[] = ['guitar', 'bass', 'piano'];

export const InstrumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [instrument, setInstrument] = useState<InstrumentType>('guitar');

  const cycleInstrument = useCallback(() => {
    setInstrument(prev => {
      const idx = INSTRUMENT_ORDER.indexOf(prev);
      return INSTRUMENT_ORDER[(idx + 1) % INSTRUMENT_ORDER.length];
    });
  }, []);

  return (
    <InstrumentContext.Provider value={{ instrument, setInstrument, cycleInstrument }}>
      {children}
    </InstrumentContext.Provider>
  );
};

export const useInstrument = () => useContext(InstrumentContext);
