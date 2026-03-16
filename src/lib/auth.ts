import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getMockUserByToken } from "@/lib/mock-data";

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
  return getMockUserByToken(token);
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user as SessionUser;
}
