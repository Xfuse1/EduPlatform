import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: "TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT";
};

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("eduplatform-session")?.value;

  if (!token) {
    return null;
  }

  const session = await db.authSession.findFirst({
    where: {
      token,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      user: {
        select: {
          id: true,
          tenantId: true,
          name: true,
          phone: true,
          role: true,
        },
      },
    },
  });

  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user as SessionUser;
}
