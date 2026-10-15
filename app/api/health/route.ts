import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getProviderConfig } from '@/lib/ai/provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }
  const ai = getProviderConfig();
  return NextResponse.json({ status: db === 'ok' ? 'ok' : 'degraded', db, analysisProvider: ai.kind, time: new Date().toISOString() }, { status: db === 'ok' ? 200 : 503 });
}
