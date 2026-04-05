"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";

export async function addAssistantAction(data: { name: string, phone: string }) {
  try {
    const tenant = await requireTenant();
    
    // Check if phone number is already registered in this tenant
    const existing = await db.user.findFirst({
      where: { phone: data.phone, tenantId: tenant.id }
    });
    
    if (existing) {
      if (existing.role === "ASSISTANT") {
        return { success: false, error: "المساعد مسجل بالفعل بهذا الرقم." };
      } else {
        return { success: false, error: "هذا الرقم مسجل مسبقاً بطالب أو ولي أمر." };
      }
    }
    
    const newUser = await db.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        role: "ASSISTANT",
        tenantId: tenant.id
      }
    });
    
    revalidatePath("/teacher/assistants");
    return { success: true, user: newUser };
  } catch (error: any) {
    console.error("Add Assistant Error:", error);
    return { success: false, error: "حدث خطأ أثناء إضافة المساعد." };
  }
}
