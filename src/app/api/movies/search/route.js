import { searchMovies } from '@/lib/ml';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const movies = searchMovies(query);
  return NextResponse.json({ movies });
}
