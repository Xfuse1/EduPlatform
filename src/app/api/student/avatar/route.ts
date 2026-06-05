import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// Strict allowlist for stored avatar URLs: only a relative path under
// /uploads/ OR an absolute URL whose host matches the configured Supabase
// storage host / app host. Rejects data:, javascript:, and external hosts.
function isAllowedAvatarUrl(value: string) {
  const url = value.trim();

  // Relative path served from our own public/uploads directory.
  if (url.startsWith("/uploads/") && !url.startsWith("//")) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  const allowedHosts = new Set<string>();
  for (const candidate of [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]) {
    if (!candidate) continue;
    try {
      allowedHosts.add(new URL(candidate).host);
    } catch {
      // ignore malformed env values
    }
  }

  return allowedHosts.has(parsed.host);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { avatarUrl } = await req.json();

    if (!avatarUrl || typeof avatarUrl !== "string" || !isAllowedAvatarUrl(avatarUrl)) {
      return NextResponse.json({ error: "رابط الصورة غير صحيح" }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STUDENT_AVATAR_PATCH]", error);
    return NextResponse.json({ error: "فشل تحديث الصورة" }, { status: 500 });
  }
}
