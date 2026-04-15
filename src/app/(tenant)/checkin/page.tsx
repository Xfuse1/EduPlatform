export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { QrCheckinCard } from "@/modules/attendance/components/QrCheckinCard";

export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-center text-lg font-bold text-rose-600">رمز QR غير صالح.</p>
      </div>
    );
  }

  const user = await getCurrentUser();
  const nextPath = `/checkin?token=${encodeURIComponent(token)}`;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  return <QrCheckinCard token={token} studentName={user.name} />;
}
