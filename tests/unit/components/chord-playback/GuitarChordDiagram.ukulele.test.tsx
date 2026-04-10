import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GuitarChordDiagram from '@/components/chord-playback/GuitarChordDiagram';

// Mock @tombatossals/react-chords to avoid SVG rendering issues in Jest
jest.mock('@tombatossals/react-chords/lib/Chord', () => {
  return function MockChord({ instrument }: { instrument: { tunings: { standard: string[] }; strings: number } }) {
    return (
      <div
        data-testid="chord-diagram"
        data-strings={instrument.strings}
        data-tuning={instrument.tunings.standard.join(',')}
      />
    );
  };
});

const mockChordData = {
  key: 'C',
  suffix: 'major',
  positions: [
    { frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], baseFret: 1, barres: [] }
  ]
};

describe('GuitarChordDiagram — ukulele instrument', () => {
  it('should_render_4_string_diagram_when_instrument_is_ukulele', () => {
    render(<GuitarChordDiagram chordData={mockChordData} instrument="ukulele" />);
    const diagram = screen.getByTestId('chord-diagram');
    expect(diagram).toHaveAttribute('data-strings', '4');
  });

  it('should_use_GCEA_tuning_when_instrument_is_ukulele', () => {
    render(<GuitarChordDiagram chordData={mockChordData} instrument="ukulele" />);
    const diagram = screen.getByTestId('chord-diagram');
    expect(diagram).toHaveAttribute('data-tuning', 'G,C,E,A');
  });

  it('should_use_DGBE_tuning_when_instrument_is_baritoneukulele', () => {
    render(<GuitarChordDiagram chordData={mockChordData} instrument="baritoneukulele" />);
    const diagram = screen.getByTestId('chord-diagram');
    expect(diagram).toHaveAttribute('data-tuning', 'D,G,B,E');
  });

  it('should_render_6_string_diagram_when_instrument_is_guitar', () => {
    render(<GuitarChordDiagram chordData={mockChordData} />);
    const diagram = screen.getByTestId('chord-diagram');
    expect(diagram).toHaveAttribute('data-strings', '6');
  });
});
