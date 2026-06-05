import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { clearTenantContextCookie } from '@/lib/tenant-context';

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  cookieStore.delete('eduplatform-session');
  clearTenantContextCookie(cookieStore);
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  cookieStore.delete('eduplatform-session');
  clearTenantContextCookie(cookieStore);
  return NextResponse.json({ success: true });
}
