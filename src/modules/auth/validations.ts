import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^01\d{9}$/, "رقم الهاتف يجب أن يبدأ بـ ٠١ ويتكون من ١١ رقمًا");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "كود التحقق يجب أن يتكون من ٦ أرقام");
