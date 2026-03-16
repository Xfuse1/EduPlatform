'use server';

import { revalidatePath } from "next/cache";

import { requireTenant } from "@/lib/tenant";
import { publicRegistrationSchema } from "@/modules/public-pages/validations";

type RegistrationResult = {
  success: boolean;
  message: string;
};

export async function registerStudent(formData: FormData): Promise<RegistrationResult> {
  await requireTenant();

  const parsed = publicRegistrationSchema.safeParse({
    studentName: formData.get("studentName"),
    parentName: formData.get("parentName"),
    parentPhone: formData.get("parentPhone"),
    grade: formData.get("grade"),
    groupId: formData.get("groupId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "بيانات التسجيل غير صحيحة",
    };
  }

  revalidatePath("/");
  revalidatePath("/register");

  return {
    success: true,
    message: "تم التسجيل بنجاح! ✅",
  };
}
