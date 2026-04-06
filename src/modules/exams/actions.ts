'use server';

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitExamAction(examId: string, studentId: string, answers: Record<string, any>) {
    try {
        const user = await requireAuth();
        if (user.id !== studentId) {
            return { success: false, error: "غير مصرح لك بتسليم هذا الامتحان." };
        }

        const exam = await db.exam.findUnique({
            where: { id: examId },
            include: { questions: true }
        });

        if (!exam) {
            return { success: false, error: "الامتحان غير موجود." };
        }

        // Calculate auto-grade for MCQ
        let earnedGrade = 0;
        const questionsMap = new Map(exam.questions.map(q => [q.id, q]));

        for (const [qId, answer] of Object.entries(answers)) {
            const question = questionsMap.get(qId);
            if (question && question.type === 'MCQ' && question.correctAnswer === answer) {
                earnedGrade += question.grade;
            }
        }

        // Save submission
        await db.examSubmission.create({
            data: {
                examId,
                studentId,
                answers: answers as any,
                totalGrade: earnedGrade,
                submittedAt: new Date(),
            }
        });

        revalidatePath('/student/exams');
        return { success: true };
    } catch (error) {
        console.error("Error submitting exam:", error);
        return { success: false, error: "حدث خطأ أثناء تسليم الامتحان." };
    }
}

export async function updateExamSubmissionAction(submissionId: string, grade: number, comment: string) {
    try {
        await requireAuth();
        await db.examSubmission.update({
            where: { id: submissionId },
            data: {
                totalGrade: grade,
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

export async function aiGradeExamAction(examId: string, submissionId: string) {
    try {
        await requireAuth();
        const exam = await db.exam.findUnique({
            where: { id: examId },
            include: { questions: true }
        });
        const submission = await db.examSubmission.findUnique({
            where: { id: submissionId },
        });

        if (!exam || !submission) return { success: false, error: "البيانات غير موجودة." };

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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
        const result = JSON.parse(rawText);

        return { success: true, data: result };
    } catch (error) {
        console.error("AI Grade Exam error:", error);
        return { success: false, error: String(error) };
    }
}
