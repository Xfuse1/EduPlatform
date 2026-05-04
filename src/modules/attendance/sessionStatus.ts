import { db } from "@/lib/db";
import { buildDateTime } from "@/lib/schedule";

type SessionTiming = {
  id: string;
  date: Date;
  timeEnd: string;
  status: string;
  notes?: string | null;
};

const autoEndMarkerPattern = /\[attendance:autoEnd=(true|false)\]/;

export function getSessionAutoEndEnabled(session: { notes?: string | null }) {
  const match = session.notes?.match(autoEndMarkerPattern);
  return match ? match[1] !== "false" : true;
}

export function setSessionAutoEndNote(notes: string | null | undefined, enabled: boolean) {
  const marker = `[attendance:autoEnd=${enabled ? "true" : "false"}]`;
  const currentNotes = notes ?? "";

  if (autoEndMarkerPattern.test(currentNotes)) {
    return currentNotes.replace(autoEndMarkerPattern, marker);
  }

  return currentNotes.trim() ? `${currentNotes.trimEnd()}\n${marker}` : marker;
}

export function getSessionEndDate(session: Pick<SessionTiming, "date" | "timeEnd">) {
  return buildDateTime(session.date, session.timeEnd);
}

export function isSessionPastEnd(session: Pick<SessionTiming, "date" | "timeEnd">, now = new Date()) {
  const endDate = getSessionEndDate(session);
  return Boolean(endDate && endDate <= now);
}

export async function completeExpiredSession<T extends SessionTiming>(session: T, now = new Date()) {
  if (!getSessionAutoEndEnabled(session) || session.status !== "IN_PROGRESS" || !isSessionPastEnd(session, now)) {
    return session;
  }

  await db.session.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      qrToken: null,
      qrExpiresAt: now,
    },
  });

  return {
    ...session,
    status: "COMPLETED",
    qrToken: null,
    qrExpiresAt: now,
  };
}
