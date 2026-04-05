import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function toArabicDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => arabicDigits[Number(digit)] ?? digit);
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
