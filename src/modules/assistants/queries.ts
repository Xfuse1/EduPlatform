import { db } from "@/lib/db";
import { cache } from "react";

export const getAssistants = cache(async (tenantId: string) => {
  return await db.user.findMany({
    where: {
      tenantId,
      role: "ASSISTANT",
    },
    orderBy: { createdAt: "desc" },
  });
});
