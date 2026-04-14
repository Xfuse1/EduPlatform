import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!["TEACHER", "ASSISTANT", "MANAGER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, groupId, dueDate, fileUrl, answerKeyUrl } = body;

    const assignment = await db.assignment.create({
      data: {
        tenantId: user.tenantId,
        title,
        description,
        groupId,
        dueDate: dueDate ? new Date(dueDate) : null,
        fileUrl,
        answerKeyUrl,
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
