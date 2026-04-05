import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await db.group.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            groupStudents: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const mappedGroups = groups.map((group) => {
      const enrolledCount = group._count.groupStudents;
      const remainingCapacity = Math.max(group.maxCapacity - enrolledCount, 0);

      return {
        id: group.id,
        name: group.name,
        subject: group.subject,
        gradeLevel: group.gradeLevel,
        days: group.days,
        timeStart: group.timeStart,
        timeEnd: group.timeEnd,
        monthlyFee: group.monthlyFee,
        maxCapacity: group.maxCapacity,
        enrolledCount,
        remainingCapacity,
        color: group.color,
        isFull: remainingCapacity === 0,
      };
    });

    return NextResponse.json(mappedGroups);
  } catch (error) {
    console.error("API GET /api/groups failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, subject, gradeLevel, days, timeStart, timeEnd, monthlyFee, maxCapacity } = body;

    const group = await db.group.create({
      data: {
        tenantId: tenant.id,
        name,
        subject,
        gradeLevel: gradeLevel || "غير محدد",
        days: Array.isArray(days) ? days : (days || "").split("-").map((d: string) => d.trim()).filter(Boolean),
        timeStart,
        timeEnd,
        monthlyFee: parseInt(String(monthlyFee)),
        maxCapacity: parseInt(String(maxCapacity)),
        isActive: true,
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("API POST /api/groups failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
