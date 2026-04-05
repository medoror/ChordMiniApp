import { NextRequest, NextResponse } from 'next/server';
import { repositories } from '@/repositories';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
): Promise<NextResponse> {
  const { videoId } = await params;

  try {
    const audioBuffer = await repositories.audio.getAudio(videoId);

    if (!audioBuffer) {
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }

    return new NextResponse(audioBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error(`Error serving audio for videoId=${videoId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
