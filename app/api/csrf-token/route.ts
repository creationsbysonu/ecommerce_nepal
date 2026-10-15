import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/utils/csrf';

export async function GET() {
  const token = await generateCSRFToken();
  return NextResponse.json({ token });
}