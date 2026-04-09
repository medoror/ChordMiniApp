import { NextRequest, NextResponse } from 'next/server';
import { repositories } from '@/repositories';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  const metadata = await repositories.audio.getMetadata(videoId);
  return NextResponse.json({ metadata });
}
