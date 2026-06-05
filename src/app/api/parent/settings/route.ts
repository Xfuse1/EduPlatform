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

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PARENT") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const data = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, phone: true, avatarUrl: true, email: true, settings: true },
  });

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "PARENT") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { name, email, avatarUrl, settings } = await req.json();

    if (name && (typeof name !== "string" || name.trim().length < 2)) {
      return NextResponse.json({ error: "الاسم يجب أن يكون حرفين على الأقل" }, { status: 400 });
    }

    // Validate avatarUrl against the strict allowlist before persisting. Allow
    // null/empty to clear the avatar, but reject any unsafe/external URL.
    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== "") {
      if (typeof avatarUrl !== "string" || !isAllowedAvatarUrl(avatarUrl)) {
        return NextResponse.json({ error: "رابط الصورة غير صحيح" }, { status: 400 });
      }
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { 
        ...(name && { name: name.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(settings !== undefined && { settings }),
      },
      select: { id: true, name: true, phone: true, avatarUrl: true, email: true, settings: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PARENT_SETTINGS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
