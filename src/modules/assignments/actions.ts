"use server";

import { db } from "@/lib/db";

/**
 * Fetch a single assignment with all its submissions (including student info).
 */
export async function fetchSubmissions(assignmentId: string) {
    const assignment = await db.assignment.findUnique({
        where: { id: assignmentId },
        include: {
            submissions: {
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                },
                orderBy: { submittedAt: "desc" },
            },
        },
    });

    return assignment;
}

/**
 * Grade a submission manually or via AI.
 */
export async function gradeSubmission(
    submissionId: string,
    grade: number,
    aiData?: {
        aiGrade: number;
        aiFeedback: string;
        gradedByAi: boolean;
    }
) {
    try {
        await db.assignmentSubmission.update({
            where: { id: submissionId },
            data: {
                grade,
                ...(aiData ?? {}),
            },
        });

        return { success: true };
    } catch (error) {
        console.error("gradeSubmission error:", error);
        return { success: false, error: String(error) };
    }
}
