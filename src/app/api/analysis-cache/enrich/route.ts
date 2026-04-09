import { NextRequest, NextResponse } from 'next/server';
import { repositories } from '@/repositories';

export async function POST(request: NextRequest) {
  const { videoId, beatModel, chordModel, enrichment } = await request.json();

  if (!videoId || !beatModel || !chordModel || !enrichment) {
    return NextResponse.json({ error: 'videoId, beatModel, chordModel, enrichment required' }, { status: 400 });
  }

  const updated = await repositories.transcriptions.updateEnrichment(videoId, beatModel, chordModel, enrichment);
  return NextResponse.json({ updated });
}
