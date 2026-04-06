import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  cookieStore.delete('eduplatform-session');
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  cookieStore.delete('eduplatform-session');
  return NextResponse.json({ success: true });
}
