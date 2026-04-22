import { getRecommendations } from '@/lib/ml';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '';
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  const recommendations = getRecommendations(title);
  
  // Return the recommendations (comment added to trigger cache invalidation)
  return NextResponse.json({ recommendations });
}
