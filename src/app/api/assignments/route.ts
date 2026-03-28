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
    const { title, description, groupId, dueDate, sessionId } = body;

    const assignment = await db.assignment.create({
      data: {
        title,
        description,
        groupId,
        dueDate: new Date(dueDate),
        sessionId: sessionId || null,
      },
      include: {
        group: { select: { name: true } },
        _count: { select: { submissions: true } },
      },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
