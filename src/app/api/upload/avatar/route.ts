import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

// Fixed allowlist of safe raster image types. SVG (image/svg+xml) and any other
// type are rejected because SVG can carry embedded scripts.
const ALLOWED_AVATAR_TYPES: Record<string, { ext: string; contentType: string }> = {
  "image/png": { ext: "png", contentType: "image/png" },
  "image/jpeg": { ext: "jpg", contentType: "image/jpeg" },
  "image/webp": { ext: "webp", contentType: "image/webp" },
};

// Supabase client بصلاحيات الـ service role — lazy init to avoid build-time crash
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY
  )?.trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "لم يتم إرسال ملف" }, { status: 400 });
    }

    // التحقق من نوع الملف — قائمة مسموح بها صارمة للصور النقطية فقط (لا SVG)
    const allowedType = ALLOWED_AVATAR_TYPES[file.type];
    if (!allowedType) {
      return NextResponse.json({ error: "يجب أن يكون الملف صورة بصيغة PNG أو JPEG أو WebP" }, { status: 400 });
    }

    // التحقق من حجم الملف (max 2MB)
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json({ error: "حجم الصورة يجب أن يكون أقل من 2MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = allowedType.ext;
    const contentType = allowedType.contentType;
    const storagePath = `${user.id}/avatar.${ext}`;

    const supabase = getSupabase();
    if (!supabase) {
      const uploadDirectory = path.join(process.cwd(), "public", "uploads", "avatars", user.id);
      await mkdir(uploadDirectory, { recursive: true });

      const fileName = `avatar.${ext}`;
      await writeFile(path.join(uploadDirectory, fileName), buffer);

      return NextResponse.json({ url: `/uploads/avatars/${user.id}/${fileName}` });
    }

    // رفع الصورة لـ Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, buffer, {
        contentType, // نوع آمن مُجبر من القائمة المسموح بها، لا نثق بـ file.type المخزَّن
        upsert: true, // استبدال الصورة القديمة
      });

    if (uploadError) {
      throw uploadError;
    }

    // جيب الـ URL العام
    const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("[UPLOAD_AVATAR]", error);
    return NextResponse.json({ error: "فشل رفع الصورة" }, { status: 500 });
  }
}
