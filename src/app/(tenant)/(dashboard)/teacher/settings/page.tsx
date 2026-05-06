export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { getKashierApiCredentials, verifyActiveSubscription } from "@/modules/payments/providers/subscription";
import { SettingsForm } from "@/modules/settings/components/SettingsForm";

export default async function TeacherSettingsPage() {
  const tenant = await requireTenant();
  const user = await requireAuth();

  if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
    redirect(user.role === "STUDENT" ? "/student" : "/parent");
  }

  const [userData, subscription, hasSubscription] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true, phone: true, pinHash: true },
    }),
    db.teacherSubscription.findUnique({
      where: { tenantId: tenant.id },
      select: { kashierApiKey: true, kashierMerId: true },
    }),
    verifyActiveSubscription(),
  ]);

  const hasKashierApi = !!(subscription?.kashierApiKey && subscription?.kashierMerId);

  let kashierCredentials: { apiKey: string; merId: string } | null = null;
  if (hasKashierApi) {
    try {
      const creds = await getKashierApiCredentials();
      kashierCredentials = { apiKey: creds.apiKey, merId: creds.merId };
    } catch {
      // ENCRYPTION_KEY missing or data corrupt — show empty fields
    }
  }

  return (
    <SettingsForm
      tenant={tenant}
      avatarUrl={userData?.avatarUrl}
      hasKashierApi={hasKashierApi}
      kashierApiKey={kashierCredentials?.apiKey ?? ""}
      kashierMerId={kashierCredentials?.merId ?? ""}
      userPhone={userData?.phone}
      hasPin={!!userData?.pinHash}
      hasSubscription={hasSubscription}
    />
  );
}
