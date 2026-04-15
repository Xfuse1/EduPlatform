export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { formatTimeRange12Hour } from "@/lib/utils";
import { getSessionWithStudents } from "@/modules/attendance/queries";
import { SessionManagement } from "@/modules/attendance/components/SessionManagement";

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireAuth();
  const { sessionId } = await params;

  if (!["TEACHER", "ASSISTANT", "MANAGER", "ADMIN"].includes(user.role)) {
    redirect("/attendance");
  }

  const session = await getSessionWithStudents(sessionId);

  if (!session) {
    notFound();
  }

  // Common UI Wrapper
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">إدارة الحضور</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {session.title} — {formatTimeRange12Hour(session.timeStart, session.timeEnd, " : ")}
          </p>
        </div>
      </div>

      <SessionManagement initialSession={session as any} />
    </div>
  );
}
