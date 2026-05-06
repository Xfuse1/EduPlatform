import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;

function getImageExtension(fileType: string) {
  if (fileType === "image/png") return "png";
  if (fileType === "image/webp") return "webp";
  if (fileType === "image/gif") return "gif";
  return "jpg";
}

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

    // التحقق من نوع الملف
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "يجب أن يكون الملف صورة" }, { status: 400 });
    }

    // التحقق من حجم الملف (max 10MB)
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json({ error: "حجم الصورة يجب أن يكون أقل من 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = getImageExtension(file.type);
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
        contentType: file.type,
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
