import { db } from "@/lib/db";
import { parseTimeToMinutes } from "@/lib/schedule";

const SESSION_TIMEZONE = "Africa/Cairo";

/**
 * Returns the UTC offset (in minutes) of the given timezone at a specific
 * instant. Positive values are ahead of UTC (Cairo is +120/+180).
 */
function getTimezoneOffsetMinutes(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second"),
  );

  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * Builds the absolute (UTC) timestamp for a Cairo wall-clock time on the
 * calendar day stored in `date`. `date` is persisted at UTC midnight, so the
 * calendar day is read from its UTC components, and the Cairo offset for that
 * day is applied — making the result correct regardless of the server's TZ.
 */
function buildCairoSessionTimestamp(date: Date, timeValue: string) {
  const minutes = parseTimeToMinutes(timeValue);

  if (minutes === null) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  // First approximation using the offset at UTC midnight of that day.
  const provisionalUtc = Date.UTC(year, month, day, Math.floor(minutes / 60), minutes % 60, 0, 0);
  const offsetMinutes = getTimezoneOffsetMinutes(new Date(provisionalUtc), SESSION_TIMEZONE);

  return new Date(provisionalUtc - offsetMinutes * 60000);
}

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

export function getSessionStartDate(session: { date: Date; timeStart: string }) {
  return buildCairoSessionTimestamp(session.date, session.timeStart);
}

export function getSessionEndDate(session: Pick<SessionTiming, "date" | "timeEnd">) {
  return buildCairoSessionTimestamp(session.date, session.timeEnd);
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
