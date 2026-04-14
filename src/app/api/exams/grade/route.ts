import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

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

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { examId, submissionId } = body;

    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { questions: true }
    });

    const submission = await db.examSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!exam || !submission) {
      return NextResponse.json({ error: "البيانات غير موجودة." }, { status: 404 });
    }

    const answers = submission.answers as Record<string, string>;

    const SYSTEM_PROMPT = `أنت مصحح امتحانات ذكي وعادل. مرجعك الأساسي هو نموذج الإجابة. اقبل الإجابات المقالية إذا كانت تحمل نفس المعنى حتى لو الصياغة مختلفة. تجاهل الأخطاء الإملائية البسيطة. كن عادلاً في الدرجات. الدرجة القصوى هي مجموع درجات الأسئلة المعطاة.`;

    // 1. صحّح الأسئلة الموضوعية برمجياً (MCQ + TRUE_FALSE)
    let objectiveTotal = 0;
    const objectiveFeedback: string[] = [];

    for (const q of exam.questions) {
      if (q.type === "MCQ" || q.type === "TRUE_FALSE") {
        const isCorrect = isObjectiveAnswerCorrect(q, answers[q.id]);
        objectiveTotal += isCorrect ? q.grade : 0;
        objectiveFeedback.push(
          `س: ${q.questionText} — ${isCorrect ? `✅ صحيح (${q.grade} درجة)` : `❌ خاطئ — الصحيحة: ${q.correctAnswer}`}`
        );
      }
    }

    // 2. ابعت ESSAY فقط للـ AI
    const essayQuestions = exam.questions
      .filter(q => q.type === 'ESSAY')
      .map(q => ({
        text: q.questionText,
        correctAnswer: q.correctAnswer,
        grade: q.grade,
        studentAnswer: answers[q.id] || ""
      }));

    let essayGrade = 0;
    let essaySummary = "";

    if (essayQuestions.length > 0) {
      const userPrompt = `
أسئلة المقال فقط:
${JSON.stringify(essayQuestions, null, 2)}

رد بـ JSON فقط بدون أي نص إضافي:
{"grade": 0, "summary": "..."}
`;

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
            generationConfig: { temperature: 0.0, maxOutputTokens: 8192, responseMimeType: "application/json" },
          }),
        }
      );

      const geminiData = await geminiResponse.json();
      if (!geminiResponse.ok) {
        return NextResponse.json({ error: "فشل الاتصال بـ Gemini AI", details: geminiData }, { status: 500 });
      }

      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const aiResult = JSON.parse(rawText);
      essayGrade = aiResult.grade ?? 0;
      essaySummary = aiResult.summary ?? "";
    }

    // 3. اجمع النتيجة النهائية
    const totalGrade = objectiveTotal + essayGrade;
    const fullSummary = [
      objectiveFeedback.join('\n'),
      essaySummary
    ].filter(Boolean).join('\n\n');

    return NextResponse.json({ grade: totalGrade, summary: fullSummary });

  } catch (error) {
    console.error("Exam AI Grade error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
