import type { DayOfWeek } from "@/types";

export const GROUP_DAY_VALUES = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const satisfies readonly DayOfWeek[];

export type GroupScheduleInput = {
  day: DayOfWeek;
  timeStart: string;
  timeEnd: string;
};

type LegacyScheduleFields = {
  days?: string[] | null;
  timeStart?: string | null;
  timeEnd?: string | null;
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isDayOfWeek(value: string): value is DayOfWeek {
  return GROUP_DAY_VALUES.includes(value as DayOfWeek);
}

export function getArabicDayLabel(day: string) {
  return isDayOfWeek(day) ? DAY_LABELS[day] : day;
}

export function getMinutesFromTime(value: string) {
  const normalizedValue = value.trim();

  if (!timePattern.test(normalizedValue)) {
    return null;
  }

  const [hours, minutes] = normalizedValue.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isValidTimeValue(value: string) {
  return getMinutesFromTime(value) !== null;
}

function normalizeScheduleEntry(value: unknown): GroupScheduleInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawDay =
    typeof value.day === "string"
      ? value.day
      : typeof value.dayOfWeek === "string"
        ? value.dayOfWeek
        : "";
  const day = rawDay.trim().toLowerCase();
  const timeStart = typeof value.timeStart === "string" ? value.timeStart.trim() : "";
  const timeEnd = typeof value.timeEnd === "string" ? value.timeEnd.trim() : "";

  if (!isDayOfWeek(day) || !isValidTimeValue(timeStart) || !isValidTimeValue(timeEnd)) {
    return null;
  }

  return {
    day,
    timeStart,
    timeEnd,
  };
}

export function getFallbackGroupSchedule(fallback: LegacyScheduleFields = {}) {
  const timeStart = fallback.timeStart?.trim() ?? "";
  const timeEnd = fallback.timeEnd?.trim() ?? "";

  if (!isValidTimeValue(timeStart) || !isValidTimeValue(timeEnd)) {
    return [];
  }

  return (fallback.days ?? [])
    .map((day) => day.trim().toLowerCase())
    .filter(isDayOfWeek)
    .map((day) => ({
      day,
      timeStart,
      timeEnd,
    }));
}

export function parseStoredGroupSchedule(rawValue: unknown, fallback: LegacyScheduleFields = {}) {
  let parsedValue = rawValue;

  if (typeof rawValue === "string") {
    try {
      parsedValue = JSON.parse(rawValue);
    } catch {
      return getFallbackGroupSchedule(fallback);
    }
  }

  if (!Array.isArray(parsedValue)) {
    return getFallbackGroupSchedule(fallback);
  }

  const normalizedSchedule = parsedValue
    .map(normalizeScheduleEntry)
    .filter((entry): entry is GroupScheduleInput => entry !== null);

  return normalizedSchedule.length > 0 ? normalizedSchedule : getFallbackGroupSchedule(fallback);
}

export function getLegacyGroupScheduleFields(schedule: GroupScheduleInput[]) {
  const normalizedSchedule = schedule.filter(
    (entry) => isDayOfWeek(entry.day) && isValidTimeValue(entry.timeStart) && isValidTimeValue(entry.timeEnd),
  );
  const firstEntry = normalizedSchedule[0];

  return {
    days: [...new Set(normalizedSchedule.map((entry) => entry.day))],
    timeStart: firstEntry?.timeStart ?? "",
    timeEnd: firstEntry?.timeEnd ?? "",
  };
}

export function getTimeMeridiemLabel(value: string) {
  const minutes = getMinutesFromTime(value);

  if (minutes === null) {
    return null;
  }

  return minutes < 12 * 60 ? "صباحا" : "مساء";
}

export function formatTimeLabel(value: string) {
  const minutes = getMinutesFromTime(value);

  if (minutes === null) {
    return value;
  }

  const hours24 = Math.floor(minutes / 60);
  const minutesValue = minutes % 60;
  const hour12 = hours24 % 12 || 12;
  const suffix = hours24 >= 12 ? "م" : "ص";

  return `${pad(hour12)}:${pad(minutesValue)} ${suffix}`;
}

export function formatGroupScheduleEntry(entry: GroupScheduleInput) {
  return `${getArabicDayLabel(entry.day)} • ${formatTimeLabel(entry.timeStart)} - ${formatTimeLabel(entry.timeEnd)}`;
}
