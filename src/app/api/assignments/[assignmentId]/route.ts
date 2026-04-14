import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

const allowedRoles = ["TEACHER", "ASSISTANT", "MANAGER", "ADMIN"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل هذا الواجب" }, { status: 403 });
    }

    const { assignmentId } = await params;
    const body = await req.json();
    const { title, description, groupId, dueDate, fileUrl, answerKeyUrl, maxGrade } = body;

    const assignment = await db.assignment.findFirst({
      where: {
        id: assignmentId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        group: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "الواجب غير موجود" }, { status: 404 });
    }

    if (user.role === "TEACHER" && assignment.group.teacherId && assignment.group.teacherId !== user.id) {
      return NextResponse.json({ error: "لا يمكنك تعديل واجب لا يتبعك" }, { status: 403 });
    }

    const updatedAssignment = await db.assignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        title,
        description,
        groupId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        fileUrl: fileUrl || undefined,
        answerKeyUrl: answerKeyUrl || undefined,
        maxGrade: maxGrade !== undefined ? maxGrade : undefined,
      },
      include: {
        group: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json({ assignment: updatedAssignment });
  } catch (error) {
    console.error("[ASSIGNMENT_PATCH]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعديل الواجب" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "غير مصرح لك بحذف هذا الواجب" }, { status: 403 });
    }

    const { assignmentId } = await params;

    const assignment = await db.assignment.findFirst({
      where: {
        id: assignmentId,
        tenantId: tenant.id,
      },
      select: {
        id: true,
        group: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "الواجب غير موجود" }, { status: 404 });
    }

    if (user.role === "TEACHER" && assignment.group.teacherId && assignment.group.teacherId !== user.id) {
      return NextResponse.json({ error: "لا يمكنك حذف واجب لا يتبعك" }, { status: 403 });
    }

    await db.assignment.delete({
      where: {
        id: assignment.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[ASSIGNMENT_DELETE]", error);
    return NextResponse.json({ error: "حدث خطأ أثناء حذف الواجب" }, { status: 500 });
  }
}
