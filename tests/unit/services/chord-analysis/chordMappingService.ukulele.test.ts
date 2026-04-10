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
      // 'add#11' is an exotic suffix not in the uke DB.
      // The service should fall back to major rather than returning
      // a chord with an unsupported suffix like '11'.
      const result = service.getUkuleleChordDataSync('C:add#11');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('C');
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
