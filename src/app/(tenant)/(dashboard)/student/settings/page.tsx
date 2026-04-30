export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentSettingsPage } from "@/modules/student/components/StudentSettingsPage";

export default async function StudentSettingsRoutePage() {
  const user = await requireAuth();
  if (user.role !== "STUDENT") {
    redirect(user.role === "PARENT" ? "/parent" : "/teacher");
  }

  const userData = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      avatarUrl: true,
      email: true,
      gradeLevel: true,
      parentPhone: true,
      pinHash: true,
    },
  });

  if (!userData) redirect("/student");

  const { pinHash, ...safeUserData } = userData;

  return <StudentSettingsPage initialData={{ ...safeUserData, hasPin: !!pinHash }} />;
}
