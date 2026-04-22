import { getTrendingMovies } from '@/lib/ml';
import { NextResponse } from 'next/server';

export async function GET() {
  const trending = getTrendingMovies();
  return NextResponse.json({ trending });
}
