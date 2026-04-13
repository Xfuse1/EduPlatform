import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { normalizeEgyptPhone, toEgyptE164 } from "@/lib/phone";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => arabicDigits[Number(digit)] ?? digit);
}

export function normalizeArabicText(value: string) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/ـ/g, "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

export function formatCurrency(amount: number) {
  return `${toArabicDigits(amount)} جنيه`;
}

export function formatCapacity(current: number, max: number) {
  return `${toArabicDigits(current)} / ${toArabicDigits(max)}`;
}

export function formatArabicDate(value: string | Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function normalizeEgyptianPhone(value: string) {
  const normalized = normalizeEgyptPhone(value);

  if (!normalized) {
    return "";
  }

  try {
    return toEgyptE164(normalized);
  } catch {
    return "";
  }
}

export function formatPhone(value: string | null | undefined) {
  if (!value) {
    return "غير متاح";
  }

  if (/^\+201\d{9}$/.test(value)) {
    const local = `0${value.slice(3)}`;
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }

  const normalized = normalizeEgyptPhone(value);

  if (/^01\d{9}$/.test(normalized)) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
  }

  return value;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
}

export function getSessionStatusLabel(status: string) {
  if (status === "IN_PROGRESS") return "جارية الآن";
  if (status === "SCHEDULED") return "مجدولة";
  if (status === "COMPLETED") return "منتهية";
  return status;
}
