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
