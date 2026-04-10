/**
 * Tests for the instrument selector dropdown and duo rendering in GuitarChordsTab.
 * These tests mount the component in isolation using a minimal prop set and
 * assert on the rendered UI — not on internal state.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/dynamic to return the actual component synchronously
jest.mock('next/dynamic', () => (fn: () => Promise<{ default: React.ComponentType<unknown> }>) => {
  let Comp: React.ComponentType<unknown> | null = null;
  fn().then((m) => { Comp = m.default; });
  // eslint-disable-next-line react/display-name
  const DynamicComponent = (props: unknown) => Comp ? React.createElement(Comp as React.ComponentType<object>, props as object) : null;
  DynamicComponent.displayName = 'DynamicComponent';
  return DynamicComponent;
});

// GuitarChordsTab imports many things — mock the heavy ones
jest.mock('@/services/chord-analysis/chordMappingService', () => ({
  chordMappingService: {
    getChordData: jest.fn().mockResolvedValue(null),
    getBaritonUkeChordDataSync: jest.fn().mockReturnValue(null),
    getUkuleleChordDataSync: jest.fn().mockReturnValue(null),
    getPreferredDiagramChordName: jest.fn((name: string) => name),
  },
}));

jest.mock('@/components/chord-playback/GuitarChordDiagram', () => ({
  __esModule: true,
  default: ({ instrument }: { instrument: string }) => (
    <div data-testid="chord-diagram" data-instrument={instrument} />
  ),
}));

jest.mock('@/components/chord-analysis/ChordGridContainer', () => ({
  ChordGridContainer: () => <div data-testid="chord-grid-container" />,
}));

// Mock all Zustand stores used by the component
jest.mock('@/stores/analysisStore', () => ({
  useAnalysisResults: () => null,
  useShowCorrectedChords: () => false,
  useChordCorrections: () => ({}),
}));
jest.mock('@/stores/playbackStore', () => ({
  useCurrentBeatIndex: () => 0,
}));
jest.mock('@/stores/uiStore', () => ({
  useGuitarCapoFret: () => 0,
  useGuitarSelectedPositions: () => ({}),
  useIsPitchShiftEnabled: () => false,
  usePitchShiftSemitones: () => 0,
  useSetGuitarCapoFret: () => jest.fn(),
  useSetGuitarSelectedPosition: () => jest.fn(),
  useTargetKey: () => null,
}));
jest.mock('@/contexts/selectors', () => ({
  useSegmentationSelector: () => ({ showSegmentation: false }),
}));

import GuitarChordsTab from '@/components/chord-analysis/GuitarChordsTab';

// Minimal chord grid props that render at least one chord card
const minimalProps = {
  analysisResults: {
    chords: [{ chord: 'C', timestamp: 0, end_timestamp: 1 }],
    beats: [{ time: 0, beatNum: 1 }],
    synchronizedChords: [{ chord: 'C', beatIndex: 0 }],
  },
  chordGridData: {
    chords: ['C'],
    beats: [0],
    hasPadding: false,
    paddingCount: 0,
    shiftCount: 0,
  },
};

describe('GuitarChordsTab — instrument selector', () => {
  it('should_render_a_select_element_for_instrument_mode', () => {
    render(<GuitarChordsTab {...minimalProps} />);
    expect(screen.getByRole('combobox', { name: /instrument/i })).toBeInTheDocument();
  });

  it('should_have_four_options_guitar_baritone_standard_duo', () => {
    render(<GuitarChordsTab {...minimalProps} />);
    const select = screen.getByRole('combobox', { name: /instrument/i });
    const options = Array.from((select as HTMLSelectElement).options).map(o => o.value);
    expect(options).toEqual(['guitar', 'baritoneukulele', 'ukulele', 'duo']);
  });

  it('should_default_to_guitar_mode', () => {
    render(<GuitarChordsTab {...minimalProps} />);
    const select = screen.getByRole('combobox', { name: /instrument/i }) as HTMLSelectElement;
    expect(select.value).toBe('guitar');
  });

  it('should_update_selected_mode_when_changed', () => {
    render(<GuitarChordsTab {...minimalProps} />);
    const select = screen.getByRole('combobox', { name: /instrument/i });
    fireEvent.change(select, { target: { value: 'duo' } });
    expect((select as HTMLSelectElement).value).toBe('duo');
  });
});

describe('GuitarChordsTab — duo rendering', () => {
  it('should_render_two_diagrams_per_chord_in_duo_mode', async () => {
    render(<GuitarChordsTab {...minimalProps} />);
    const select = screen.getByRole('combobox', { name: /instrument/i });
    fireEvent.change(select, { target: { value: 'duo' } });

    const diagrams = await screen.findAllByTestId('chord-diagram');
    // One chord (C) → two diagrams (baritone + standard)
    expect(diagrams.length).toBeGreaterThanOrEqual(2);
  });

  it('should_render_baritone_label_in_duo_mode', async () => {
    render(<GuitarChordsTab {...minimalProps} />);
    fireEvent.change(
      screen.getByRole('combobox', { name: /instrument/i }),
      { target: { value: 'duo' } }
    );
    expect(await screen.findByText(/baritone/i)).toBeInTheDocument();
  });

  it('should_render_standard_label_in_duo_mode', async () => {
    render(<GuitarChordsTab {...minimalProps} />);
    fireEvent.change(
      screen.getByRole('combobox', { name: /instrument/i }),
      { target: { value: 'duo' } }
    );
    expect(await screen.findByText(/standard/i)).toBeInTheDocument();
  });
});
