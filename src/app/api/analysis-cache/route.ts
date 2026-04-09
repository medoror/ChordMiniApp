import { NextRequest, NextResponse } from 'next/server';
import { repositories } from '@/repositories';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const beatModel = searchParams.get('beatModel');
  const chordModel = searchParams.get('chordModel');

  if (!videoId || !beatModel || !chordModel) {
    return NextResponse.json({ error: 'videoId, beatModel, chordModel required' }, { status: 400 });
  }

  const data = await repositories.transcriptions.get(videoId, beatModel, chordModel);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  await repositories.transcriptions.set(body);
  return NextResponse.json({ success: true });
}
