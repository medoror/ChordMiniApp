import { GET } from '@/app/api/audio/[videoId]/route';
import { NextRequest } from 'next/server';

jest.mock('@/repositories', () => ({
  repositories: {
    audio: {
      getAudio: jest.fn(),
    },
  },
}));

import { repositories } from '@/repositories';
const mockGetAudio = repositories.audio.getAudio as jest.MockedFunction<typeof repositories.audio.getAudio>;

function makeRequest(videoId: string): NextRequest {
  return new NextRequest(`http://localhost/api/audio/${videoId}`);
}

describe('GET /api/audio/[videoId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should_return_404_when_audio_not_found', async () => {
    mockGetAudio.mockResolvedValueOnce(null);
    const response = await GET(makeRequest('v1'), { params: Promise.resolve({ videoId: 'v1' }) });
    expect(response.status).toBe(404);
  });

  it('should_return_audio_bytes_with_correct_content_type', async () => {
    const fakeAudio = Buffer.from([0xFF, 0xFB, 0x90]);
    mockGetAudio.mockResolvedValueOnce(fakeAudio);
    const response = await GET(makeRequest('v1'), { params: Promise.resolve({ videoId: 'v1' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    const body = await response.arrayBuffer();
    expect(Buffer.from(body)).toEqual(fakeAudio);
  });

  it('should_return_500_when_repository_throws', async () => {
    mockGetAudio.mockRejectedValueOnce(new Error('db error'));
    const response = await GET(makeRequest('v1'), { params: Promise.resolve({ videoId: 'v1' }) });
    expect(response.status).toBe(500);
  });
});
