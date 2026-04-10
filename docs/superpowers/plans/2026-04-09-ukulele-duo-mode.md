# Ukulele Duo Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standard ukulele (GCEA) chord diagrams and a Duo mode that stacks baritone + standard uke diagrams per chord, triggered by a new dropdown instrument selector.

**Architecture:** Extend `ChordMappingService` with a direct GCEA lookup method, widen the `GuitarChordDiagram` instrument prop to accept `'ukulele'`, and update `GuitarChordsTab` to support four instrument modes — replacing the button pair with a `<select>` dropdown and rendering stacked diagrams in Duo mode.

**Tech Stack:** TypeScript, React 19, Jest + React Testing Library, `@tombatossals/chords-db` (ukulele.json already bundled), `@tombatossals/react-chords`

---

## File Map

| File | Change |
|------|--------|
| `src/services/chord-analysis/chordMappingService.ts` | Add `getUkuleleChordDataSync` method after `getBaritonUkeChordDataSync` (~line 571) |
| `src/components/chord-playback/GuitarChordDiagram.tsx` | Add `STANDARD_UKE_INSTRUMENT` config; widen `instrument` prop; update conditional at line 273 |
| `src/components/chord-analysis/GuitarChordsTab.tsx` | Widen `instrumentMode` type; add `ukuleleCacheMap` state; update cache-clearing effect; update chord loading effect; replace button pair with `<select>`; add Duo card rendering |
| `tests/unit/services/chord-analysis/chordMappingService.ukulele.test.ts` | New — unit tests for `getUkuleleChordDataSync` |
| `tests/unit/components/chord-playback/GuitarChordDiagram.ukulele.test.tsx` | New — render test for `instrument='ukulele'` |

---

## Task 1: `getUkuleleChordDataSync` in ChordMappingService

**Files:**
- Create: `tests/unit/services/chord-analysis/chordMappingService.ukulele.test.ts`
- Modify: `src/services/chord-analysis/chordMappingService.ts` (add method after line 571)

- [ ] **Step 1: Create the test file with failing tests**

```typescript
// tests/unit/services/chord-analysis/chordMappingService.ukulele.test.ts
/**
 * TDD tests for standard ukulele chord lookup in ChordMappingService.
 *
 * Standard uke is tuned GCEA. The ukulele DB in @tombatossals/chords-db
 * is GCEA — so lookups are direct with no transposition.
 * The DB uses flat spellings for accidentals: Db, Eb, Gb, Ab, Bb.
 */

import { ChordMappingService } from '@/services/chord-analysis/chordMappingService';

const service = ChordMappingService.getInstance();

describe('ChordMappingService — getUkuleleChordDataSync', () => {
  describe('direct root lookups (no transposition)', () => {
    it('should_return_C_major_chord_when_given_C', () => {
      const result = service.getUkuleleChordDataSync('C');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('C');
      expect(result!.suffix).toBe('major');
      expect(result!.positions[0].frets).toHaveLength(4);
    });

    it('should_return_G_major_chord_when_given_G', () => {
      const result = service.getUkuleleChordDataSync('G');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('G');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_D_major_chord_when_given_D', () => {
      const result = service.getUkuleleChordDataSync('D');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('D');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_A_major_chord_when_given_A', () => {
      const result = service.getUkuleleChordDataSync('A');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('A');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_E_major_chord_when_given_E', () => {
      const result = service.getUkuleleChordDataSync('E');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('E');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_F_major_chord_when_given_F', () => {
      const result = service.getUkuleleChordDataSync('F');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('F');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_Bb_major_chord_when_given_Bb', () => {
      const result = service.getUkuleleChordDataSync('Bb');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('Bb');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_Db_major_chord_when_given_Csharp', () => {
      // C# maps to semitone 1; ukulele DB uses flat spelling Db
      const result = service.getUkuleleChordDataSync('C#');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('Db');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_same_result_for_enharmonic_Db_and_Csharp', () => {
      const sharpResult = service.getUkuleleChordDataSync('C#');
      const flatResult  = service.getUkuleleChordDataSync('Db');
      expect(sharpResult).not.toBeNull();
      expect(flatResult).not.toBeNull();
      expect(sharpResult!.key).toBe(flatResult!.key);
      expect(sharpResult!.suffix).toBe(flatResult!.suffix);
    });

    // Verify NO transposition — baritone C returns F, standard uke C returns C
    it('should_NOT_transpose_root_unlike_baritone_lookup', () => {
      const ukeResult  = service.getUkuleleChordDataSync('C');
      const bariResult = service.getBaritonUkeChordDataSync('C');
      expect(ukeResult!.key).toBe('C');   // direct
      expect(bariResult!.key).toBe('F'); // transposed +5 semitones
    });
  });

  describe('chord suffixes', () => {
    it('should_return_minor_chord_when_given_Am', () => {
      const result = service.getUkuleleChordDataSync('Am');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('A');
      expect(result!.suffix).toBe('minor');
    });

    it('should_return_m7_chord_when_given_Am7', () => {
      const result = service.getUkuleleChordDataSync('Am7');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('A');
      expect(result!.suffix).toBe('m7');
    });

    it('should_return_maj7_chord_when_given_Cmaj7', () => {
      const result = service.getUkuleleChordDataSync('Cmaj7');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('C');
      expect(result!.suffix).toBe('maj7');
    });

    it('should_return_7_chord_when_given_G7', () => {
      const result = service.getUkuleleChordDataSync('G7');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('G');
      expect(result!.suffix).toBe('7');
    });

    it('should_return_dim_chord_when_given_diminished', () => {
      const result = service.getUkuleleChordDataSync('Edim');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('E');
      expect(result!.suffix).toBe('dim');
    });

    it('should_fallback_to_major_when_suffix_not_in_uke_db', () => {
      // Use a suffix unlikely to exist in the uke DB
      const result = service.getUkuleleChordDataSync('C:add#11');
      expect(result).not.toBeNull();
      expect(result!.suffix).toBe('major');
    });
  });

  describe('slash chords and null cases', () => {
    it('should_resolve_slash_chord_to_root', () => {
      const result = service.getUkuleleChordDataSync('C/G');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('C');
    });

    it('should_return_null_for_NC', () => {
      expect(service.getUkuleleChordDataSync('N.C.')).toBeNull();
    });

    it('should_return_null_for_empty_string', () => {
      expect(service.getUkuleleChordDataSync('')).toBeNull();
    });

    it('should_return_null_for_N', () => {
      expect(service.getUkuleleChordDataSync('N')).toBeNull();
    });
  });

  describe('4-string data structure', () => {
    it('should_return_4_fret_values_per_position', () => {
      const result = service.getUkuleleChordDataSync('C');
      expect(result!.positions[0].frets).toHaveLength(4);
      expect(result!.positions[0].fingers).toHaveLength(4);
    });

    it('should_return_multiple_voicings', () => {
      const result = service.getUkuleleChordDataSync('C');
      expect(result!.positions.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/unit/services/chord-analysis/chordMappingService.ukulele.test.ts --no-coverage | cat
```

Expected: `TypeError: service.getUkuleleChordDataSync is not a function`

- [ ] **Step 3: Add `getUkuleleChordDataSync` to `ChordMappingService`**

Open `src/services/chord-analysis/chordMappingService.ts`. After the closing `}` of `getBaritonUkeChordDataSync` (~line 571), add:

```typescript
  /**
   * Look up standard ukulele chord data (GCEA tuning).
   * Direct lookup in the ukulele DB — no transposition needed because
   * the DB is already in GCEA tuning.
   *
   * Slash chords are resolved to their root chord.
   */
  public getUkuleleChordDataSync(chordName: string): ChordData | null {
    const parsed = this.parseChordName(chordName);
    if (!parsed) return null;

    const semitone = this.rootToSemitone[parsed.root];
    if (semitone === undefined) return null;
    // Direct index into semitoneToUkeKey — no +5 offset like getBaritonUkeChordDataSync uses.
    // semitoneToUkeKey[0]='C', [1]='Db', ..., [11]='B' (flat spellings matching the ukulele DB).
    const ukeKey = this.semitoneToUkeKey[semitone];

    const normalizedSuffix = this.normalizeUkeSuffix(parsed.suffix);
    const ukeDb = getUkeDatabaseSync();
    const rootChords = ukeDb.chords[ukeKey];
    if (!rootChords) return null;

    return (
      rootChords.find(chord => chord.suffix === normalizedSuffix) ||
      rootChords.find(chord => chord.suffix === 'major') ||
      null
    );
  }
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest tests/unit/services/chord-analysis/chordMappingService.ukulele.test.ts --no-coverage | cat
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/chord-analysis/chordMappingService.ts \
        tests/unit/services/chord-analysis/chordMappingService.ukulele.test.ts
git commit -m "Add getUkuleleChordDataSync to ChordMappingService"
```

---

## Task 2: Standard Uke Support in `GuitarChordDiagram`

**Files:**
- Create: `tests/unit/components/chord-playback/GuitarChordDiagram.ukulele.test.tsx`
- Modify: `src/components/chord-playback/GuitarChordDiagram.tsx`

- [ ] **Step 1: Create the test directory and test file with a failing test**

```bash
mkdir -p tests/unit/components/chord-playback
```

```typescript
// tests/unit/components/chord-playback/GuitarChordDiagram.ukulele.test.tsx
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

  it('should_use_EADGBE_6_string_tuning_when_instrument_is_guitar', () => {
    render(<GuitarChordDiagram chordData={mockChordData} />);
    const diagram = screen.getByTestId('chord-diagram');
    expect(diagram).toHaveAttribute('data-strings', '6');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx jest tests/unit/components/chord-playback/GuitarChordDiagram.ukulele.test.tsx --no-coverage | cat
```

Expected: TypeScript error — `'ukulele'` is not assignable to `'guitar' | 'baritoneukulele'`

- [ ] **Step 3: Update `GuitarChordDiagram.tsx`**

**3a.** Add `STANDARD_UKE_INSTRUMENT` config after `BARITONE_UKE_INSTRUMENT` (~line 68):

```typescript
// Standard ukulele instrument configuration (tuned G-C-E-A)
const STANDARD_UKE_INSTRUMENT = {
  strings: 4,
  fretsOnChord: 4,
  name: 'Ukulele',
  keys: [],
  tunings: {
    standard: ['G', 'C', 'E', 'A']
  }
};
```

**3b.** In the `GuitarChordDiagramProps` interface, widen the `instrument` prop (line 45):

```typescript
// Before:
instrument?: 'guitar' | 'baritoneukulele';

// After:
instrument?: 'guitar' | 'baritoneukulele' | 'ukulele';
```

**3c.** Update the instrument conditional in the `<Chord />` render call (~line 273). Replace the binary conditional with a three-way branch:

```typescript
// Before:
instrument={instrument === 'baritoneukulele' ? BARITONE_UKE_INSTRUMENT : GUITAR_INSTRUMENT}

// After:
instrument={
  instrument === 'baritoneukulele' ? BARITONE_UKE_INSTRUMENT :
  instrument === 'ukulele'         ? STANDARD_UKE_INSTRUMENT :
                                     GUITAR_INSTRUMENT
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npx jest tests/unit/components/chord-playback/GuitarChordDiagram.ukulele.test.tsx --no-coverage | cat
```

Expected: all 4 tests PASS

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm run test:unit -- --no-coverage | cat
```

Expected: all existing tests still PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/chord-playback/GuitarChordDiagram.tsx \
        tests/unit/components/chord-playback/GuitarChordDiagram.ukulele.test.tsx
git commit -m "Add standard ukulele instrument support to GuitarChordDiagram"
```

---

## Task 3: `GuitarChordsTab` — State and Data Loading

**Files:**
- Modify: `src/components/chord-analysis/GuitarChordsTab.tsx`

This task widens `instrumentMode`, adds the second cache, and updates the chord-loading effect to handle `'ukulele'` and `'duo'` modes. No UI changes yet.

- [ ] **Step 1: Widen `instrumentMode` type (line 123)**

```typescript
// Before:
const [instrumentMode, setInstrumentMode] = useState<'guitar' | 'baritoneukulele'>('guitar');

// After:
const [instrumentMode, setInstrumentMode] = useState<'guitar' | 'baritoneukulele' | 'ukulele' | 'duo'>('guitar');
```

- [ ] **Step 2: Add `ukuleleCacheMap` state after `chordDataCache` (line 124)**

```typescript
const [chordDataCache, setChordDataCache] = useState<Map<string, ChordData | null>>(new Map());
const [ukuleleCacheMap, setUkuleleCacheMap] = useState<Map<string, ChordData | null>>(new Map());
```

- [ ] **Step 3: Update the cache-clearing effect to clear both caches (lines 216–218)**

```typescript
// Before:
useEffect(() => {
  setChordDataCache(new Map());
}, [instrumentMode]);

// After:
useEffect(() => {
  setChordDataCache(new Map());
  setUkuleleCacheMap(new Map());
}, [instrumentMode]);
```

- [ ] **Step 4: Replace the chord loading effect (lines 354–384)**

Replace the entire `loadChordData` effect with:

```typescript
useEffect(() => {
  const loadChordData = async () => {
    const chordsToLoad = new Set<string>();

    // Chords missing from primary cache
    uniqueChordsForGuitarDiagrams.forEach(chord => {
      if (!chordDataCache.has(chord)) chordsToLoad.add(chord);
    });
    if (currentChordNameForCache && !chordDataCache.has(currentChordNameForCache)) {
      chordsToLoad.add(currentChordNameForCache);
    }

    // In duo mode also check the ukulele cache
    if (instrumentMode === 'duo') {
      uniqueChordsForGuitarDiagrams.forEach(chord => {
        if (!ukuleleCacheMap.has(chord)) chordsToLoad.add(chord);
      });
      if (currentChordNameForCache && !ukuleleCacheMap.has(currentChordNameForCache)) {
        chordsToLoad.add(currentChordNameForCache);
      }
    }

    if (chordsToLoad.size > 0) {
      setIsLoadingChords(true);
      try {
        const results = await Promise.all(
          Array.from(chordsToLoad).map(async (chord) => {
            let primaryData: ChordData | null;
            let ukeData: ChordData | null = null;

            if (instrumentMode === 'baritoneukulele' || instrumentMode === 'duo') {
              primaryData = chordMappingService.getBaritonUkeChordDataSync(chord);
            } else if (instrumentMode === 'ukulele') {
              primaryData = chordMappingService.getUkuleleChordDataSync(chord);
            } else {
              primaryData = await chordMappingService.getChordData(chord);
            }

            if (instrumentMode === 'duo') {
              ukeData = chordMappingService.getUkuleleChordDataSync(chord);
            }

            return { chord, primaryData, ukeData };
          })
        );

        setChordDataCache(cache => {
          const updated = new Map(cache);
          results.forEach(({ chord, primaryData }) => updated.set(chord, primaryData));
          return updated;
        });

        if (instrumentMode === 'duo') {
          setUkuleleCacheMap(cache => {
            const updated = new Map(cache);
            results.forEach(({ chord, ukeData }) => updated.set(chord, ukeData ?? null));
            return updated;
          });
        }
      } catch (error) {
        console.error('Failed to load chord data:', error);
      }
      setIsLoadingChords(false);
    }
  };
  loadChordData();
}, [uniqueChordsForGuitarDiagrams, currentChordNameForCache, chordDataCache, ukuleleCacheMap, instrumentMode]);
```

- [ ] **Step 5: Run the full test suite**

```bash
npm run test:unit -- --no-coverage | cat
```

Expected: all existing tests still PASS (no component tests for GuitarChordsTab yet, so no failures expected from this step)

- [ ] **Step 6: Commit**

```bash
git add src/components/chord-analysis/GuitarChordsTab.tsx
git commit -m "Add ukulele and duo mode support to GuitarChordsTab data layer"
```

---

## Task 4: `GuitarChordsTab` — Dropdown and Duo Rendering

**Files:**
- Modify: `src/components/chord-analysis/GuitarChordsTab.tsx`
- Create: `tests/unit/components/chord-analysis/GuitarChordsTab.instrumentSelector.test.tsx`

- [ ] **Step 1: Create the test file with failing tests**

```typescript
// tests/unit/components/chord-analysis/GuitarChordsTab.instrumentSelector.test.tsx
/**
 * Tests for the instrument selector dropdown and duo rendering in GuitarChordsTab.
 * These tests mount the component in isolation using a minimal prop set and
 * assert on the rendered UI — not on internal state.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// GuitarChordsTab imports many things — mock the heavy ones
jest.mock('@/services/chord-analysis/chordMappingService', () => ({
  ChordMappingService: {
    getInstance: () => ({
      getChordData: jest.fn().mockResolvedValue(null),
      getBaritonUkeChordDataSync: jest.fn().mockReturnValue(null),
      getUkuleleChordDataSync: jest.fn().mockReturnValue(null),
      getPreferredDiagramChordName: jest.fn((name: string) => name),
    }),
  },
}));

jest.mock('@/components/chord-playback/GuitarChordDiagram', () => ({
  __esModule: true,
  default: ({ instrument }: { instrument: string }) => (
    <div data-testid="chord-diagram" data-instrument={instrument} />
  ),
}));

// Mock all Zustand stores used by the component
jest.mock('@/stores/analysisStore', () => ({
  useAnalysisResults: () => null,
  useShowCorrectedChords: () => false,
  useChordCorrections: () => ({}),
  useCurrentBeatIndex: () => 0,
  useIsPitchShiftEnabled: () => false,
  usePitchShiftSemitones: () => 0,
  useTargetKey: () => null,
}));
jest.mock('@/stores/uiStore', () => ({
  useSegmentationSelector: () => ({ showSegmentation: false }),
}));
jest.mock('@/stores/guitarStore', () => ({
  useGuitarCapoFret: () => 0,
  useGuitarSelectedPositions: () => ({}),
  useSetGuitarCapoFret: () => jest.fn(),
  useSetGuitarSelectedPosition: () => jest.fn(),
}));

import GuitarChordsTab from '@/components/chord-analysis/GuitarChordsTab';

// Minimal chord grid props that render at least one chord card
const minimalProps = {
  chordGridData: {
    entries: [{ shape: 'C', beatIndex: 0, startTime: 0, endTime: 1 }],
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest tests/unit/components/chord-analysis/GuitarChordsTab.instrumentSelector.test.tsx --no-coverage | cat
```

Expected: failures — no `<select>` found; no "Baritone"/"Standard" labels

- [ ] **Step 3: Replace the instrument selector buttons with a `<select>` dropdown**

In `GuitarChordsTab.tsx`, find the instrument selector section (~lines 548–565):

```tsx
{/* Before — two buttons */}
<span className="text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm">Instrument:</span>
<div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
  <button
    onClick={() => setInstrumentMode('guitar')}
    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${instrumentMode === 'guitar' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
    title="Guitar chord diagrams (6-string, EADGBE)"
  >
    Guitar
  </button>
  <button
    onClick={() => setInstrumentMode('baritoneukulele')}
    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${instrumentMode === 'baritoneukulele' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
    title="Baritone ukulele chord diagrams (4-string, DGBE)"
  >
    Baritone Uke
  </button>
</div>
```

Replace with:

```tsx
{/* After — dropdown */}
<label
  htmlFor="instrument-mode-select"
  className="text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm"
>
  Instrument:
</label>
<select
  id="instrument-mode-select"
  value={instrumentMode}
  onChange={(e) => setInstrumentMode(e.target.value as 'guitar' | 'baritoneukulele' | 'ukulele' | 'duo')}
  className="rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 sm:px-3 sm:py-1.5 sm:text-sm border-none outline-none cursor-pointer"
>
  <option value="guitar">Guitar</option>
  <option value="baritoneukulele">Baritone Uke</option>
  <option value="ukulele">Standard Uke</option>
  <option value="duo">Duo</option>
</select>
```

- [ ] **Step 4: Add duo stacked rendering to chord cards**

Locate where chord cards render a single `GuitarChordDiagram`. This is typically inside a `.map()` over `uniqueChordDataForGuitarDiagrams` or similar. 

Find the `<GuitarChordDiagram>` render calls inside the chord grid. Wrap the existing single diagram with a conditional — when `instrumentMode === 'duo'`, render two diagrams stacked with labels:

```tsx
{instrumentMode === 'duo' ? (
  <div className="flex flex-col items-center gap-1">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-400">Baritone</span>
    <GuitarChordDiagram
      chordData={chordDataCache.get(chordName) ?? null}
      instrument="baritoneukulele"
      // ...copy all other props from the existing <GuitarChordDiagram /> call here...
    />
    <span className="text-[10px] font-semibold uppercase tracking-wide text-pink-400">Standard</span>
    <GuitarChordDiagram
      chordData={ukuleleCacheMap.get(chordName) ?? null}
      instrument="ukulele"
      // ...copy all other props from the existing <GuitarChordDiagram /> call here...
    />
  </div>
) : (
  // existing <GuitarChordDiagram ... /> unchanged
)}
```

> **Note:** `GuitarChordsTab` has two chord card render paths. Run `grep -n "<GuitarChordDiagram" src/components/chord-analysis/GuitarChordsTab.tsx | cat` to find both callsites. Apply this duo wrapper to each one. The `showPositionSelector` prop already defaults to `false` in the component, so you do not need to pass it explicitly in the duo branches.

- [ ] **Step 5: Run the new tests**

```bash
npx jest tests/unit/components/chord-analysis/GuitarChordsTab.instrumentSelector.test.tsx --no-coverage | cat
```

Expected: all tests PASS

- [ ] **Step 6: Run the full test suite**

```bash
npm run test:unit -- --no-coverage | cat
```

Expected: all tests PASS

- [ ] **Step 7: Manually verify in the browser**

```bash
npm run dev
```

1. Open http://localhost:3000, analyze a song
2. Navigate to the chord diagrams tab
3. Confirm the instrument selector is now a dropdown with 4 options
4. Select "Standard Uke" — diagrams should be 4-string GCEA shapes
5. Select "Duo" — each chord card should show two stacked diagrams with "Baritone" and "Standard" labels
6. Switch back to "Guitar" — diagrams should return to 6-string

- [ ] **Step 8: Commit**

```bash
git add src/components/chord-analysis/GuitarChordsTab.tsx \
        tests/unit/components/chord-analysis/GuitarChordsTab.instrumentSelector.test.tsx
git commit -m "Add dropdown selector and Duo mode rendering to GuitarChordsTab"
```
