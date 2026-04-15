export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { ParentSettingsPage } from "@/modules/parent/components/ParentSettingsPage";

export default async function ParentSettingsRoutePage() {
  const [user, tenant] = await Promise.all([requireAuth(), requireTenant()]);
  if (user.role !== "PARENT") {
    redirect(user.role === "STUDENT" ? "/student" : "/teacher");
  }

  const userData = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      avatarUrl: true,
      email: true,
      settings: true,
      parentStudents: {
        where: {
          student: { tenantId: tenant.id },
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              gradeLevel: true,
            }
          }
        }
      }
    },
  });

  if (!userData) redirect("/parent");

  return <ParentSettingsPage initialData={userData} />;
}
