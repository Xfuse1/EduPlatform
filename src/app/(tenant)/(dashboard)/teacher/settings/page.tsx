export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { SettingsForm } from "@/modules/settings/components/SettingsForm";

export default async function TeacherSettingsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const userData = await db.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });

  return <SettingsForm tenant={tenant} avatarUrl={userData?.avatarUrl} />;
}
