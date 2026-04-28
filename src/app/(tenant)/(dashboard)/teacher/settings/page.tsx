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

  const [userData, subscription] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true, phone: true, pinHash: true },
    }),
    db.teacherSubscription.findUnique({
      where: { tenantId: tenant.id },
      select: { kashierApiKey: true, kashierMerId: true },
    }),
  ]);

  const hasKashierApi = !!(subscription?.kashierApiKey && subscription?.kashierMerId);

  return (
    <SettingsForm
      tenant={tenant}
      avatarUrl={userData?.avatarUrl}
      hasKashierApi={hasKashierApi}
      userPhone={userData?.phone}
      hasPin={!!userData?.pinHash}
    />
  );
}
