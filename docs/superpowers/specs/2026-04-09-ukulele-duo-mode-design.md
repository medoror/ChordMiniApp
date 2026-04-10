# Ukulele Duo Mode — Design Spec

## Overview

Add standard ukulele (GCEA) chord diagrams alongside the existing guitar and baritone ukulele support, including a "Duo" mode that shows both baritone and standard uke diagrams stacked per chord — designed for two players (e.g., parent on baritone, child on standard uke) following the same song together.

## Background

ChordMini currently supports two instrument modes: Guitar (6-string) and Baritone Ukulele (DGBE, 4-string). The baritone lookup transposes chord roots up 5 semitones to reuse the `@tombatossals/chords-db` ukulele.json database (GCEA tuning). Standard ukulele uses GCEA natively — the same database with no transposition.

## Modes

The instrument selector expands from two toggle buttons to a `<select>` dropdown with four options:

| Value | Label | Instrument |
|---|---|---|
| `guitar` | Guitar | 6-string EADGBE |
| `baritoneukulele` | Baritone Uke | 4-string DGBE |
| `ukulele` | Standard Uke | 4-string GCEA |
| `duo` | Duo | Baritone + Standard stacked |

## Data Layer

### New method: `ChordMappingService.getUkuleleChordDataSync`

Direct lookup in `ukulele.json` (GCEA). No transposition. Slash chords stripped to root. Null cases (`N.C.`, empty string) return `null`. Follows the exact pattern of `getBaritonUkeChordDataSync` minus the `transposeRootToBaritonUkeKey()` call.

### Cache

The existing `chordDataCache` Map in `GuitarChordsTab` component state handles all single-instrument modes unchanged. For duo mode, a second `ukuleleCacheMap` is added to component state alongside it. In duo mode, the chord loading loop populates both caches — `chordDataCache` for baritone data and `ukuleleCacheMap` for standard uke data. Both are cleared when the mode changes. Keys remain the chord name (e.g., `"C"`).

## Components

### `GuitarChordDiagram`

- New instrument config added (matches the structure of the existing configs, including `keys: []`):
  ```ts
  const STANDARD_UKE_INSTRUMENT = {
    strings: 4,
    fretsOnChord: 4,
    name: 'Ukulele',
    keys: [],
    tunings: { standard: ['G', 'C', 'E', 'A'] }
  };
  ```
- `instrument` prop widens to `'guitar' | 'baritoneukulele' | 'ukulele'`
- The instrument selection conditional must be updated to handle the new value. Currently it is a binary `baritoneukulele ? BARITONE_UKE_INSTRUMENT : GUITAR_INSTRUMENT`; it becomes a three-way branch that returns `STANDARD_UKE_INSTRUMENT` when `instrument === 'ukulele'`.

### `GuitarChordsTab`

**Dropdown:** Replaces the existing `<button>` toggle pair. A `<select>` element with the four mode options listed above.

**Chord card rendering in Duo mode:** When `instrumentMode === 'duo'`, each chord card renders two `GuitarChordDiagram` components stacked vertically:
- Top: baritone diagram with "Baritone" label (`instrument='baritoneukulele'`)
- Bottom: standard uke diagram with "Standard" label (`instrument='ukulele'`)

Single-instrument modes render exactly as they do today.

**Position selector in Duo mode:** The per-chord position selector (voicing picker) is hidden in Duo mode. Both diagrams render position 0 (the default voicing). This keeps the Duo card compact and avoids the complexity of two independent position selectors per chord. The rendering path for duo simply never renders the position selector UI — no prop change to `GuitarChordDiagram` is needed for this.

**Instrument prop in Duo mode:** Each `GuitarChordDiagram` in a duo card receives its own concrete instrument value — `instrument='baritoneukulele'` for the top diagram and `instrument='ukulele'` for the bottom. The value `'duo'` is never passed to `GuitarChordDiagram`.

**`instrumentMode` type:**
```ts
// Before
'guitar' | 'baritoneukulele'

// After
'guitar' | 'baritoneukulele' | 'ukulele' | 'duo'
```

## Testing

### New: `chordMappingService.ukulele.test.ts`

Mirrors the existing baritone test file. Covers:
- Direct lookups return 4-string chord data in GCEA tuning
- Slash chord resolution (`C/G` → `C`)
- Null cases (`N.C.`, empty string)
- All 12 roots return valid data for common suffixes
- Verifies no transposition occurs (`C` returns a C shape, not an F shape)

### Additions to existing `GuitarChordsTab` tests

- Dropdown renders with all 4 options
- Selecting `'duo'` renders two diagrams per chord card
- Switching mode clears both cache maps
- In duo mode, both baritone and standard uke data are loaded per chord

### Additions to existing `GuitarChordDiagram` tests

- `instrument='ukulele'` renders a 4-string diagram with GCEA tuning label

## Out of Scope

- Chord playback is unchanged — the chord is the same regardless of instrument
- No new E2E tests — visual behavior is fully covered by unit and component tests
- No "Guitar + Uke" duo variant — the duo is specifically baritone + standard uke
