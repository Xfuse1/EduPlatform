import { parseStoredGroupSchedule } from "@/modules/groups/schedule";

const orderedArabicDays = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

const normalizedDayMap: Record<string, (typeof orderedArabicDays)[number]> = {
  السبت: "السبت",
  الاحد: "الأحد",
  الأحد: "الأحد",
  الاحد: "الأحد",
  الاثنين: "الاثنين",
  الإثنين: "الاثنين",
  الثلاثاء: "الثلاثاء",
  الاربعاء: "الأربعاء",
  الأربعاء: "الأربعاء",
  الخميس: "الخميس",
  الجمعه: "الجمعة",
  الجمعة: "الجمعة",
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function normalizeArabicDay(value: string) {
  return normalizedDayMap[value.trim().toLowerCase()] ?? normalizedDayMap[value.trim()] ?? value.trim();
}

export function getArabicDaysOrder() {
  return orderedArabicDays;
}

export function getArabicWeekday(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(date);
  return normalizeArabicDay(weekday);
}

export function getDayOrder(day: string) {
  return orderedArabicDays.indexOf(normalizeArabicDay(day) as (typeof orderedArabicDays)[number]);
}

export function formatDisplayTime(value: string) {
  const normalized = value.trim();

  if (/^\d{1,2}:\d{2}$/.test(normalized)) {
    const [hourValue, minuteValue] = normalized.split(":").map(Number);
    const suffix = hourValue >= 12 ? "PM" : "AM";
    const hour12 = hourValue % 12 || 12;
    return `${pad(hour12)}:${pad(minuteValue)} ${suffix}`;
  }

  const twelveHourMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (twelveHourMatch) {
    const [, hourPart, minutePart, suffix] = twelveHourMatch;
    return `${pad(Number(hourPart))}:${minutePart} ${suffix.toUpperCase()}`;
  }

  return normalized;
}

export function parseTimeToMinutes(value: string) {
  const normalized = value.trim();

  if (/^\d{1,2}:\d{2}$/.test(normalized)) {
    const [hours, minutes] = normalized.split(":").map(Number);
    return hours * 60 + minutes;
  }

  const twelveHourMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!twelveHourMatch) {
    return null;
  }

  const [, hourPart, minutePart, suffixValue] = twelveHourMatch;
  const suffix = suffixValue.toUpperCase();
  let hours = Number(hourPart) % 12;

  if (suffix === "PM") {
    hours += 12;
  }

  return hours * 60 + Number(minutePart);
}

export function getNextOccurrenceDate(day: string, fromDate = new Date()) {
  const normalizedDay = normalizeArabicDay(day);
  const targetIndex = getDayOrder(normalizedDay);
  const currentIndex = getDayOrder(getArabicWeekday(fromDate));

  if (targetIndex === -1 || currentIndex === -1) {
    return null;
  }

  const nextDate = new Date(fromDate);
  nextDate.setHours(0, 0, 0, 0);

  const dayDifference = (targetIndex - currentIndex + 7) % 7;
  nextDate.setDate(nextDate.getDate() + dayDifference);

  return nextDate;
}

export function buildDateTime(date: Date, timeValue: string) {
  const minutes = parseTimeToMinutes(timeValue);

  if (minutes === null) {
    return null;
  }

  const nextDate = new Date(date);
  nextDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return nextDate;
}

type SchedulableGroup = {
  id: string;
  name: string;
  subject?: string | null;
  gradeLevel?: string | null;
  days: string[];
  timeStart: string;
  timeEnd: string;
  room?: string | null;
  color?: string | null;
  schedule?: unknown;
};

function getGroupScheduleEntries(group: SchedulableGroup) {
  return parseStoredGroupSchedule(group.schedule, {
    days: group.days,
    timeStart: group.timeStart,
    timeEnd: group.timeEnd,
  }).map((entry) => ({
    day: normalizeArabicDay(entry.day),
    timeStart: entry.timeStart,
    timeEnd: entry.timeEnd,
  }));
}

export function getNextRecurringSession(groups: SchedulableGroup[], fromDate = new Date()) {
  let nextSession:
    | {
        date: Date;
        timeStart: string;
        timeEnd: string;
        group: {
          id: string;
          name: string;
        };
      }
    | null = null;

  for (const group of groups) {
    for (const entry of getGroupScheduleEntries(group)) {
      const occurrenceDate = getNextOccurrenceDate(entry.day, fromDate);

      if (!occurrenceDate) {
        continue;
      }

      let sessionDate = buildDateTime(occurrenceDate, entry.timeStart);

      if (!sessionDate) {
        continue;
      }

      const sessionEnd = buildDateTime(occurrenceDate, entry.timeEnd);

      if (sessionEnd && sessionEnd <= fromDate) {
        occurrenceDate.setDate(occurrenceDate.getDate() + 7);
        sessionDate = buildDateTime(occurrenceDate, entry.timeStart);

        if (!sessionDate) {
          continue;
        }
      }

      if (!nextSession || sessionDate < nextSession.date) {
        nextSession = {
          date: sessionDate,
          timeStart: formatDisplayTime(entry.timeStart),
          timeEnd: formatDisplayTime(entry.timeEnd),
          group: {
            id: group.id,
            name: group.name,
          },
        };
      }
    }
  }

  return nextSession;
}

export function buildWeeklyScheduleItems(groups: SchedulableGroup[], today = getArabicWeekday()) {
  return groups
    .flatMap((group) =>
      getGroupScheduleEntries(group).map((entry, index) => ({
        id: `${group.id}-${normalizeArabicDay(entry.day)}-${index}`,
        subject: group.subject ? `${group.subject} - ${group.name}` : group.name,
        day: normalizeArabicDay(entry.day),
        timeStart: formatDisplayTime(entry.timeStart),
        timeEnd: formatDisplayTime(entry.timeEnd),
        room: group.room?.trim() || "القاعة غير محددة",
        color: group.color?.trim() || "#1A5276",
        isToday: normalizeArabicDay(entry.day) === today,
      })),
    )
    .sort((first, second) => {
      if (first.isToday !== second.isToday) {
        return first.isToday ? -1 : 1;
      }

      const dayOrderDifference = getDayOrder(first.day) - getDayOrder(second.day);

      if (dayOrderDifference !== 0) {
        return dayOrderDifference;
      }

      return (parseTimeToMinutes(first.timeStart) ?? 0) - (parseTimeToMinutes(second.timeStart) ?? 0);
    });
}
