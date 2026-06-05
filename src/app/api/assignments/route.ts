import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const createAssignmentSchema = z.object({
  title: z.string().trim().min(1, "عنوان الواجب مطلوب").max(200, "العنوان طويل جدًا"),
  description: z.string().trim().max(2000).optional().nullable(),
  groupId: z.string().trim().min(1, "المجموعة مطلوبة"),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
      message: "تاريخ غير صالح",
    }),
  fileUrl: z.string().trim().max(2000).optional().nullable(),
  answerKeyUrl: z.string().trim().max(2000).optional().nullable(),
  maxGrade: z.coerce.number().positive("الدرجة يجب أن تكون رقمًا موجبًا").max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!["TEACHER", "ASSISTANT", "MANAGER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "بيانات غير صحيحة", details: parsed.error.flatten() } },
        { status: 422 },
      );
    }
    const { title, description, groupId, dueDate, fileUrl, answerKeyUrl, maxGrade } = parsed.data;

    // Validate the target group belongs to this tenant (and to the teacher when scoped).
    const isTeacher = user.role === "TEACHER";
    const group = await db.group.findFirst({
      where: {
        id: groupId,
        tenantId: user.tenantId,
        ...(isTeacher ? { teacherId: user.id } : {}),
      },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignment = await db.assignment.create({
      data: {
        tenantId: user.tenantId,
        title,
        description,
        groupId,
        dueDate: dueDate ? new Date(dueDate) : null,
        fileUrl,
        answerKeyUrl,
        maxGrade: maxGrade || 100,
      },
      include: {
        group: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
    });

    const students = await db.groupStudent.findMany({
      where: { groupId, status: "ACTIVE" },
      select: { studentId: true },
    });

    if (students.length > 0) {
      await db.notification.createMany({
        data: students.map((s) => ({
          tenantId: user.tenantId,
          userId: s.studentId,
          type: "ASSIGNMENT_DUE" as const,
          message: `📚 تم إضافة واجب جديد: ${title} في مجموعة ${assignment.group.name}`,
          channel: "PUSH" as const,
          status: "QUEUED" as const,
          recipientPhone: "",
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error("Assignment error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
