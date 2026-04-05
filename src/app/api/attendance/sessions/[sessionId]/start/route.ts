import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const user = await requireAuth();

    if (!["TEACHER", "ASSISTANT"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { sessionId } = await params;

    // Generate a 10-character token
    const token = nanoid(10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const updatedSession = await db.session.update({
      where: { id: sessionId },
      data: {
        status: "IN_PROGRESS",
        qrToken: token,
        qrExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      token: updatedSession.qrToken,
      expiresAt: updatedSession.qrExpiresAt,
    });
  } catch (error) {
    console.error("Failed to start session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
