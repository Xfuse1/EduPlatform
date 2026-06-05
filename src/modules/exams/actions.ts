'use server';

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { requireRole, STAFF_ROLES } from "@/lib/permissions";
import { getTeacherScopeUserId } from "@/lib/teacher-access";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/modules/notifications/actions";

function normalizeTrueFalse(value: string | null | undefined) {
    const normalized = (value ?? "").trim().toLowerCase();
    if (["true", "صح", "صحيح", "yes", "1"].includes(normalized)) return "true";
    if (["false", "خطأ", "خطا", "غلط", "no", "0"].includes(normalized)) return "false";
    return normalized;
}

function isObjectiveAnswerCorrect(
    question: { type: string; correctAnswer: string | null },
    answer: unknown
) {
    const studentAnswer = String(answer ?? "").trim();
    const correctAnswer = String(question.correctAnswer ?? "").trim();

    if (!studentAnswer || !correctAnswer) return false;

    if (question.type === "TRUE_FALSE") {
        return normalizeTrueFalse(studentAnswer) === normalizeTrueFalse(correctAnswer);
    }

    return studentAnswer === correctAnswer;
}

function normalizeAnswerText(value: string | null | undefined) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function isModelAnswerMatch(
    question: { type: string; correctAnswer: string | null },
    answer: unknown
) {
    const correctAnswer = String(question.correctAnswer ?? "").trim();
    const studentAnswer = String(answer ?? "").trim();

    if (!correctAnswer || !studentAnswer) return false;

    if (question.type === "TRUE_FALSE") {
        return normalizeTrueFalse(correctAnswer) === normalizeTrueFalse(studentAnswer);
    }

    return normalizeAnswerText(correctAnswer) === normalizeAnswerText(studentAnswer);
}

export async function submitExamAction(examId: string, studentId: string, answers: Record<string, any>) {
    try {
        const user = await requireAuth();
        if (user.id !== studentId) {
            return { success: false, error: "غير مصرح لك بتسليم هذا الامتحان." };
        }

        const tenant = await requireTenant();

        const exam = await db.exam.findFirst({
            where: { id: examId, tenantId: tenant.id },
            include: { questions: true }
        });

        if (!exam) {
            return { success: false, error: "الامتحان غير موجود." };
        }

        // Ensure the student is actively enrolled in the exam's group.
        const enrollment = await db.groupStudent.findFirst({
            where: { groupId: exam.groupId, studentId, status: "ACTIVE" },
            select: { id: true },
        });
        if (!enrollment) {
            return { success: false, error: "غير مصرح لك بتسليم هذا الامتحان." };
        }

        // Enforce the exam window WITH a grace period. The client timer is
        // anchored to page-open time (not startAt) because the schema has no
        // per-student startedAt, so a student who legitimately opens the exam
        // partway through the window gets a full-duration timer that can expire
        // after startAt+duration. Without grace, that legitimate first (and only)
        // submission would be discarded. We add one extra duration of grace to
        // cover late opens + auto-submit/network latency, while still rejecting
        // clearly out-of-window attempts and submissions before the exam opens.
        const now = Date.now();
        const startMs = new Date(exam.startAt).getTime();
        const windowMs = exam.duration * 60 * 1000;
        const endMs = startMs + windowMs * 2; // duration + one duration of grace
        if (now < startMs || now > endMs) {
            return { success: false, error: "انتهى وقت تسليم هذا الامتحان أو لم يبدأ بعد." };
        }

        // Block duplicate submissions (relies on @@unique([examId, studentId])).
        const existingSubmission = await db.examSubmission.findFirst({
            where: { examId, studentId },
            select: { id: true },
        });
        if (existingSubmission) {
            return { success: false, error: "لقد قمت بتسليم هذا الامتحان بالفعل." };
        }

        // Calculate auto-grade for objective questions (MCQ + TRUE_FALSE)
        let earnedGrade = 0;
        const questionsMap = new Map(exam.questions.map(q => [q.id, q]));

        for (const [qId, answer] of Object.entries(answers)) {
            const question = questionsMap.get(qId);
            if (!question) continue;

            if (
                (question.type === "MCQ" || question.type === "TRUE_FALSE") &&
                isObjectiveAnswerCorrect(question, answer)
            ) {
                earnedGrade += question.grade;
            }
        }

        // Clamp grade to [0, exam.maxGrade].
        earnedGrade = Math.max(0, Math.min(earnedGrade, exam.maxGrade));

        // Save submission (unique constraint guards against race-condition duplicates).
        try {
            await db.examSubmission.create({
                data: {
                    examId,
                    studentId,
                    answers: answers as any,
                    totalGrade: earnedGrade,
                    submittedAt: new Date(),
                }
            });
        } catch (error: any) {
            if (error?.code === "P2002") {
                return { success: false, error: "لقد قمت بتسليم هذا الامتحان بالفعل." };
            }
            throw error;
        }

        revalidatePath('/student/exams');

        const examWithTeacher = await db.exam.findUnique({
            where: { id: examId },
            select: {
                title: true,
                group: {
                    select: { teacherId: true }
                }
            }
        });

        const studentInfo = await db.user.findUnique({
            where: { id: studentId },
            select: { name: true }
        });

        if (examWithTeacher?.group.teacherId) {
            await sendNotification({
                userId: examWithTeacher.group.teacherId,
                type: 'EXAM_PUBLISHED',
                channel: 'IN_APP',
                templateData: {
                    studentName: studentInfo?.name ?? "",
                    examTitle: examWithTeacher.title,
                }
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Error submitting exam:", error);
        return { success: false, error: "حدث خطأ أثناء تسليم الامتحان." };
    }
}

export async function updateExamSubmissionAction(submissionId: string, grade: number, comment: string) {
    try {
        const user = await requireAuth();
        requireRole(user.role, STAFF_ROLES);
        const tenant = await requireTenant();
        const teacherScopeUserId = getTeacherScopeUserId(tenant, user);

        const submission = await db.examSubmission.findUnique({
            where: { id: submissionId },
            include: { exam: { select: { tenantId: true, groupId: true, maxGrade: true, group: { select: { teacherId: true } } } } },
        });

        if (!submission || submission.exam.tenantId !== tenant.id) {
            return { success: false, error: "التسليم غير موجود." };
        }
        if (teacherScopeUserId && submission.exam.group.teacherId !== teacherScopeUserId) {
            return { success: false, error: "ليس لديك صلاحية." };
        }

        const clampedGrade = Math.max(0, Math.min(grade, submission.exam.maxGrade));

        await db.examSubmission.update({
            where: { id: submissionId },
            data: {
                totalGrade: clampedGrade,
                teacherComment: comment,
            }
        });
        revalidatePath(`/teacher/exams`);
        return { success: true };
    } catch (error) {
        console.error("Error updating exam submission:", error);
        return { success: false, error: "فشل تحديث الدرجة." };
    }
}

export async function approveAutoGradeByModelAnswerAction(examId: string, submissionId: string) {
    try {
        const user = await requireAuth();
        requireRole(user.role, STAFF_ROLES);
        const tenant = await requireTenant();
        const teacherScopeUserId = getTeacherScopeUserId(tenant, user);

        const [exam, submission] = await Promise.all([
            db.exam.findFirst({
                where: {
                    id: examId,
                    tenantId: tenant.id,
                    ...(teacherScopeUserId ? { group: { teacherId: teacherScopeUserId } } : {}),
                },
                include: { questions: true },
            }),
            db.examSubmission.findUnique({
                where: { id: submissionId },
            }),
        ]);

        if (!exam || !submission || submission.examId !== examId) {
            return { success: false, error: "بيانات الامتحان أو التسليم غير صحيحة." };
        }

        const answers = submission.answers as Record<string, unknown>;
        let autoGrade = 0;

        for (const question of exam.questions) {
            if (isModelAnswerMatch(question, answers[question.id])) {
                autoGrade += question.grade;
            }
        }

        // Clamp grade to [0, exam.maxGrade].
        autoGrade = Math.max(0, Math.min(autoGrade, exam.maxGrade));

        const teacherComment =
            submission.teacherComment ?? "تم اعتماد التصحيح التلقائي بمقارنة الإجابات بالنموذج.";

        const updatedSubmission = await db.examSubmission.update({
            where: { id: submissionId },
            data: {
                totalGrade: autoGrade,
                teacherComment,
                gradedByAi: false,
            },
            select: {
                totalGrade: true,
                teacherComment: true,
                gradedByAi: true,
            },
        });

        revalidatePath(`/teacher/exams/${examId}/results`);
        revalidatePath(`/teacher/exams`);

        return {
            success: true,
            data: {
                grade: updatedSubmission.totalGrade ?? 0,
                teacherComment: updatedSubmission.teacherComment ?? "",
                gradedByAi: updatedSubmission.gradedByAi,
            },
        };
    } catch (error) {
        console.error("Error approving model auto-grade:", error);
        return { success: false, error: "فشل اعتماد التصحيح التلقائي." };
    }
}

export async function aiGradeExamAction(examId: string, submissionId: string) {
    try {
        const user = await requireAuth();
        requireRole(user.role, STAFF_ROLES);
        const tenant = await requireTenant();
        const teacherScopeUserId = getTeacherScopeUserId(tenant, user);

        const exam = await db.exam.findFirst({
            where: {
                id: examId,
                tenantId: tenant.id,
                ...(teacherScopeUserId ? { group: { teacherId: teacherScopeUserId } } : {}),
            },
            include: { questions: true }
        });
        const submission = await db.examSubmission.findUnique({
            where: { id: submissionId },
        });

        if (!exam || !submission || submission.examId !== examId) return { success: false, error: "البيانات غير موجودة." };

        const answers = submission.answers as Record<string, string>;
        
        const questionsList = exam.questions.map(q => ({
            text: q.questionText,
            type: q.type,
            correctAnswer: q.correctAnswer,
            grade: q.grade,
            studentAnswer: answers[q.id] || ""
        }));

        const SYSTEM_PROMPT = `أنت مصحح امتحانات ذكي وعادل. مرجعك الأساسي هو نموذج الإجابة. اقبل الإجابات المقالية إذا كانت تحمل نفس المعنى حتى لو الصياغة مختلفة. تجاهل الأخطاء الإملائية البسيطة. كن عادلاً في الدرجات. الدرجة القصوى هي مجموع درجات الأسئلة المعطاة.`;

        const userPrompt = `
الأسئلة وإجابات الطالب:
${JSON.stringify(questionsList, null, 2)}

المطلوب:
تصحيح الأسئلة خاصة المقالية (MCQ تم تصحيحه بالفعل ولكن برحاء مراجعته).
يجب أن يكون ردك JSON صالح فقط بدون أي نص إضافي أو backticks أو أسطر جديدة داخل القيم.
{"grade": 85, "summary": "بناءً على إجاباتك، قمت بأداء جيد..."}`;

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
                    generationConfig: {
                        temperature: 0.0,
                        maxOutputTokens: 2048,
                        responseMimeType: "application/json",
                    },
                }),
            }
        );

        if (!geminiResponse.ok) {
            const err = await geminiResponse.json();
            console.error("Gemini AI error:", err);
            throw new Error("فشل الاتصال بـ Gemini AI");
        }

        const geminiData = await geminiResponse.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

        let result: { grade?: unknown; summary?: unknown } & Record<string, unknown>;
        try {
            result = JSON.parse(rawText);
        } catch {
            console.error("AI Grade Exam: failed to parse Gemini response");
            return { success: false, error: "تعذّر قراءة نتيجة التصحيح الآلي. حاول مرة أخرى." };
        }

        // Clamp the AI-suggested grade to [0, exam.maxGrade].
        if (typeof result?.grade === "number") {
            result.grade = Math.max(0, Math.min(result.grade, exam.maxGrade));
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("AI Grade Exam error:", error);
        return { success: false, error: "فشل التصحيح الآلي. حاول مرة أخرى بعد قليل." };
    }
}
