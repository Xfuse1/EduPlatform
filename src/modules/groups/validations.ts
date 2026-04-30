import { z } from "zod";

import {
  GROUP_DAY_VALUES,
  getMinutesFromTime,
  parseStoredGroupSchedule,
  type GroupScheduleInput,
} from "@/modules/groups/schedule";

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue === "" ? undefined : normalizedValue;
}

function normalizeSchedule(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsedValue = JSON.parse(value);
      return Array.isArray(parsedValue) ? parsedValue : value;
    } catch {
      return value;
    }
  }

  return value;
}

export const groupScheduleSchema = z
  .object({
    day: z.enum(GROUP_DAY_VALUES),
    timeStart: z.string().trim().regex(timePattern, "وقت البداية يجب أن يكون بصيغة HH:mm"),
    timeEnd: z.string().trim().regex(timePattern, "وقت النهاية يجب أن يكون بصيغة HH:mm"),
  })
  .superRefine((value, ctx) => {
    const startMinutes = getMinutesFromTime(value.timeStart);
    const endMinutes = getMinutesFromTime(value.timeEnd);

    if (startMinutes === null || endMinutes === null) {
      return;
    }

    if (endMinutes <= startMinutes) {
      ctx.addIssue({
        code: "custom",
        message: "وقت النهاية يجب أن يكون بعد وقت البداية",
        path: ["timeEnd"],
      });
    }
  });

export const groupCreateSchema = z
  .object({
    name: z.string().trim().min(3, "اسم المجموعة يجب أن يكون 3 أحرف على الأقل"),
    subject: z.string().trim().min(1, "المادة مطلوبة"),
    gradeLevel: z.string().trim().min(1, "الصف الدراسي مطلوب"),
    schedule: z.preprocess(
      normalizeSchedule,
      z.array(groupScheduleSchema).min(1, "يجب إضافة حصة واحدة على الأقل").max(4, "الحد الأقصى للحصص الأسبوعية هو 4"),
    ),
    maxCapacity: z.coerce
      .number({
        invalid_type_error: "يجب إدخال رقم صحيح",
        required_error: "عدد الطلاب مطلوب",
      })
      .int("يجب أن يكون العدد رقمًا صحيحًا")
      .min(1, "يجب أن يكون عدد الطلاب 1 على الأقل")
      .max(200, "الحد الأقصى للطلاب 200 طالب"),
    monthlyFee: z.coerce
      .number({
        invalid_type_error: "يجب إدخال رقم صحيح للمصاريف",
        required_error: "المصاريف مطلوبة",
      })
      .int("يجب أن يكون المبلغ رقمًا صحيحًا بدون كسور")
      .min(0, "المبلغ لا يمكن أن يكون سالبًا")
      .max(10000, "المبلغ كبير جدًا — الحد الأقصى 10,000 جنيه"),
    color: z.string().trim().regex(hexColorPattern, "اللون يجب أن يكون بصيغة hex مثل #1A5276"),
    billingType: z.enum(["MONTHLY", "PER_SESSION", "FULL_COURSE"]).default("MONTHLY"),
    room: z.preprocess(
      normalizeOptionalText,
      z.string().trim().max(100, "اسم القاعة طويل جدًا").optional(),
    ),
  })
  .superRefine((value, ctx) => {
    const seenDays = new Map<string, number>();

    value.schedule.forEach((entry, index) => {
      const previousIndex = seenDays.get(entry.day);

      if (previousIndex !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "لا يمكن تكرار نفس اليوم داخل المجموعة الواحدة",
          path: ["schedule", index, "day"],
        });
        return;
      }

      seenDays.set(entry.day, index);
    });
  });

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;
export type GroupScheduleFormInput = GroupScheduleInput;
export { GROUP_DAY_VALUES };

export function normalizeGroupFormData(input: FormData | Record<string, unknown>) {
  if (input instanceof FormData) {
    const rawEntries = Object.fromEntries(input.entries());
    const legacySchedule = parseStoredGroupSchedule(undefined, {
      days: typeof rawEntries.days === "string" ? rawEntries.days.split(",") : undefined,
      timeStart: typeof rawEntries.timeStart === "string" ? rawEntries.timeStart : undefined,
      timeEnd: typeof rawEntries.timeEnd === "string" ? rawEntries.timeEnd : undefined,
    });

    return {
      ...rawEntries,
      schedule: rawEntries.schedule ?? legacySchedule,
      room: normalizeOptionalText(rawEntries.room),
    };
  }

  return {
    ...input,
    schedule:
      input.schedule ??
      parseStoredGroupSchedule(undefined, {
        days: Array.isArray(input.days) ? input.days.map(String) : typeof input.days === "string" ? input.days.split(",") : undefined,
        timeStart: typeof input.timeStart === "string" ? input.timeStart : undefined,
        timeEnd: typeof input.timeEnd === "string" ? input.timeEnd : undefined,
      }),
    room: normalizeOptionalText(input.room),
  };
}

export function parseGroupFormData(input: FormData | Record<string, unknown>) {
  return groupCreateSchema.parse(normalizeGroupFormData(input));
}
