/**
 * TDD tests for baritone ukulele chord lookup in ChordMappingService.
 *
 * Baritone uke is tuned DGBE — 5 semitones below standard uke GCEA.
 * To get a baritone chord diagram, we look up the standard uke chord
 * that is 5 semitones higher (e.g., baritone E → look up standard uke A).
 *
 * The ukulele DB uses flat spellings for accidentals: Db, Eb, Gb, Ab, Bb.
 */

import { ChordMappingService } from '@/services/chord-analysis/chordMappingService';

// Access the singleton for testing
const service = ChordMappingService.getInstance();

describe('ChordMappingService — getBaritonUkeChordDataSync', () => {
  describe('transposing roots up 5 semitones', () => {
    it('should_return_A_major_chord_when_given_baritone_E_major', () => {
      const result = service.getBaritonUkeChordDataSync('E');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('A');
      expect(result!.suffix).toBe('major');
      expect(result!.positions.length).toBeGreaterThan(0);
      expect(result!.positions[0].frets).toHaveLength(4);
    });

    it('should_return_F_major_chord_when_given_baritone_C_major', () => {
      const result = service.getBaritonUkeChordDataSync('C');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('F');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_G_major_chord_when_given_baritone_D_major', () => {
      const result = service.getBaritonUkeChordDataSync('D');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('G');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_C_major_chord_when_given_baritone_G_major', () => {
      const result = service.getBaritonUkeChordDataSync('G');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('C');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_D_major_chord_when_given_baritone_A_major', () => {
      const result = service.getBaritonUkeChordDataSync('A');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('D');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_Gb_minor_chord_when_given_baritone_Csharp_minor', () => {
      const result = service.getBaritonUkeChordDataSync('C#m');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('Gb');
      expect(result!.suffix).toBe('minor');
    });

    it('should_return_same_result_for_enharmonic_Db_minor_as_Csharp_minor', () => {
      const csharpResult = service.getBaritonUkeChordDataSync('C#m');
      const dbResult = service.getBaritonUkeChordDataSync('Dbm');
      expect(csharpResult).not.toBeNull();
      expect(dbResult).not.toBeNull();
      expect(csharpResult!.key).toBe(dbResult!.key);
      expect(csharpResult!.suffix).toBe(dbResult!.suffix);
    });

    it('should_return_Ab_major_chord_when_given_baritone_Eb_major', () => {
      const result = service.getBaritonUkeChordDataSync('Eb');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('Ab');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_Db_major_chord_when_given_baritone_Ab_major', () => {
      const result = service.getBaritonUkeChordDataSync('Ab');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('Db');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_Bb_major_chord_when_given_baritone_F_major', () => {
      const result = service.getBaritonUkeChordDataSync('F');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('Bb');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_B_major_chord_when_given_baritone_Fsharp_major', () => {
      const result = service.getBaritonUkeChordDataSync('F#');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('B');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_Eb_major_chord_when_given_baritone_Bb_major', () => {
      const result = service.getBaritonUkeChordDataSync('Bb');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('Eb');
      expect(result!.suffix).toBe('major');
    });

    it('should_return_E_major_chord_when_given_baritone_B_major', () => {
      const result = service.getBaritonUkeChordDataSync('B');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('E');
      expect(result!.suffix).toBe('major');
    });
  });

  describe('chord suffixes', () => {
    it('should_return_m7_chord_when_given_baritone_minor7', () => {
      const result = service.getBaritonUkeChordDataSync('E:min7');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('A');
      expect(result!.suffix).toBe('m7');
    });

    it('should_return_maj7_chord_when_given_baritone_maj7', () => {
      const result = service.getBaritonUkeChordDataSync('D:maj7');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('G');
      expect(result!.suffix).toBe('maj7');
    });

    it('should_return_7_chord_when_given_baritone_dominant7', () => {
      const result = service.getBaritonUkeChordDataSync('A7');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('D');
      expect(result!.suffix).toBe('7');
    });

    it('should_return_9_chord_when_given_baritone_9th', () => {
      const result = service.getBaritonUkeChordDataSync('E9');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('A');
      expect(result!.suffix).toBe('9');
    });

    it('should_return_dim_chord_when_given_baritone_diminished', () => {
      const result = service.getBaritonUkeChordDataSync('Edim');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('A');
      expect(result!.suffix).toBe('dim');
    });

    it('should_return_chord_for_triangle_notation_maj7', () => {
      // △7 notation for major 7th
      const result = service.getBaritonUkeChordDataSync('D△7');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('G');
      expect(result!.suffix).toBe('maj7');
    });

    it('should_return_minor_chord_when_given_baritone_minor', () => {
      const result = service.getBaritonUkeChordDataSync('C#:minor');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('Gb');
      expect(result!.suffix).toBe('minor');
    });
  });

  describe('slash chords', () => {
    it('should_return_root_chord_when_given_slash_chord', () => {
      // A7/B baritone → look up D7 (A+5=D) ignoring the slash
      const result = service.getBaritonUkeChordDataSync('A7/B');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('D');
      expect(result!.suffix).toBe('7');
    });

    it('should_return_root_chord_when_given_maj7_slash_chord', () => {
      const result = service.getBaritonUkeChordDataSync('D△7/E');
      expect(result).not.toBeNull();
      expect(result!.key).toBe('G');
      expect(result!.suffix).toBe('maj7');
    });
  });

  describe('no chord / null cases', () => {
    it('should_return_null_when_given_NC', () => {
      expect(service.getBaritonUkeChordDataSync('N.C.')).toBeNull();
    });

    it('should_return_null_when_given_N', () => {
      expect(service.getBaritonUkeChordDataSync('N')).toBeNull();
    });

    it('should_return_null_when_given_empty_string', () => {
      expect(service.getBaritonUkeChordDataSync('')).toBeNull();
    });
  });

  describe('returned chord data structure', () => {
    it('should_return_4_string_positions_not_6_string', () => {
      const result = service.getBaritonUkeChordDataSync('E');
      expect(result).not.toBeNull();
      result!.positions.forEach(position => {
        expect(position.frets).toHaveLength(4);
        expect(position.fingers).toHaveLength(4);
      });
    });

    it('should_return_multiple_voicings_for_common_chords', () => {
      const result = service.getBaritonUkeChordDataSync('E');
      expect(result).not.toBeNull();
      expect(result!.positions.length).toBeGreaterThan(1);
    });
  });
});
