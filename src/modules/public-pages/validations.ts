import { z } from "zod";

export const publicRegistrationSchema = z.object({
  studentName: z.string().trim().min(2, "اسم الطالب مطلوب"),
  parentName: z.string().trim().min(2, "اسم ولي الأمر مطلوب"),
  parentPhone: z
    .string()
    .trim()
    .regex(/^01\d{9}$/, "رقم ولي الأمر يجب أن يبدأ بـ ٠١ ويتكون من ١١ رقمًا"),
  grade: z.string().trim().min(1, "الصف الدراسي مطلوب"),
  groupId: z.string().trim().min(1, "يرجى اختيار المجموعة"),
});
