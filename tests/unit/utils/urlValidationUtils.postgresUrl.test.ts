import { isFirebaseStorageUrl } from '@/utils/urlValidationUtils';

describe('isFirebaseStorageUrl for Postgres audio URLs', () => {
  it('should_return_false_for_api_audio_path', () => {
    expect(isFirebaseStorageUrl('/api/audio/some-video-id')).toBe(false);
  });

  it('should_return_true_for_firebase_storage_url', () => {
    expect(
      isFirebaseStorageUrl('https://firebasestorage.googleapis.com/v0/b/bucket/o/file')
    ).toBe(true);
  });
});
