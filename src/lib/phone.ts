function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeEgyptPhone(value: string) {
  const digits = digitsOnly(value);

  if (!digits) {
    return "";
  }

  if (/^01\d{9}$/.test(digits)) {
    return digits;
  }

  if (/^20\d{10}$/.test(digits)) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

export function isEgyptPhone(value: string) {
  return /^01\d{9}$/.test(normalizeEgyptPhone(value));
}

export function toEgyptE164(value: string) {
  const normalized = normalizeEgyptPhone(value);

  if (!/^01\d{9}$/.test(normalized)) {
    throw new Error("invalid-egypt-phone");
  }

  return `+20${normalized.slice(1)}`;
}

export function toWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";

  let normalized = digits;
  // 01XXXXXXXXX → 201XXXXXXXXX
  if (/^0\d{10}$/.test(digits)) normalized = `20${digits.slice(1)}`;
  // 1XXXXXXXXX (10 digits, Egyptian mobile) → 201XXXXXXXXX
  else if (/^1[0-9]\d{8}$/.test(digits)) normalized = `20${digits}`;

  return `https://wa.me/${normalized}`;
}
