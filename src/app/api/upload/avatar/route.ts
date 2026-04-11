import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Supabase client بصلاحيات الـ service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // التحقق من حجم الملف (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "حجم الصورة يجب أن يكون أقل من 2MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    // رفع الصورة لـ Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true, // استبدال الصورة القديمة
      });

    if (uploadError) {
      throw uploadError;
    }

    // جيب الـ URL العام
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("[UPLOAD_AVATAR]", error);
    return NextResponse.json({ error: "فشل رفع الصورة" }, { status: 500 });
  }
}
