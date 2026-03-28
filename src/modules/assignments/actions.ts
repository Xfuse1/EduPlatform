"use server"

import { getSubmissionsByAssignment } from "./queries";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function fetchSubmissions(assignmentId: string) {
    return await getSubmissionsByAssignment(assignmentId);
}

export async function gradeSubmission(submissionId: string, grade: number) {
    try {
        await db.assignmentSubmission.update({
            where: { id: submissionId },
            data: { grade }
        });
        revalidatePath('/teacher/assignments');
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}
