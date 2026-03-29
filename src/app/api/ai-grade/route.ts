import { NextRequest, NextResponse } from "next/server";
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

async function extractTextFromPdfUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`فشل تحميل الملف: ${url}`);
  const buffer = await response.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));
  return data.text.trim();
}

const SYSTEM_PROMPT = `أنت مصحح واجبات آلي صارم ودقيق.
قواعد صارمة لا تخالفها أبداً:
1. مصدرك الوحيد للتصحيح هو نموذج إجابة المعلم المُقدَّم لك.
2. لا تستخدم معرفتك الخارجية أو الموسوعية أبداً.
3. إذا أجاب الطالب بإجابة صحيحة علمياً لكن غير موجودة في نموذج الإجابة، اعتبرها خاطئة.
4. لا تتساهل ولا تُكمّل إجابات الطالب من عندك.
5. قيّم فقط ما كتبه الطالب مقارنةً بنموذج الإجابة حرفياً.`;

export async function POST(req: NextRequest) {
  console.log("POST /api/ai-grade hit");
  try {
    const body = await req.json();
    const { assignmentFileUrl, answerKeyUrl, submissionFileUrl } = body;

    const [questionsText, answerKeyText, studentAnswerText] = await Promise.all([
      extractTextFromPdfUrl(assignmentFileUrl),
      extractTextFromPdfUrl(answerKeyUrl),
      extractTextFromPdfUrl(submissionFileUrl),
    ]);

    const userPrompt = `## نموذج إجابة المعلم (مرجعك الوحيد للتصحيح):
${answerKeyText}

## الأسئلة:
${questionsText}

## إجابة الطالب:
${studentAnswerText}

## المطلوب:
قارن إجابة الطالب بنموذج الإجابة فقط وأعطِ النتيجة.
يجب أن يكون ردك JSON صالح فقط بدون أي نص إضافي أو backticks أو أسطر جديدة داخل القيم.
{"grade":75,"feedback":[{"question":1,"score":15,"maxScore":20,"comment":"تعليق قصير"}],"summary":"ملخص قصير"}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
          generationConfig: {
            temperature: 0.0,
            topP: 0.1,
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini error:", JSON.stringify(geminiData));
      return NextResponse.json({ error: JSON.stringify(geminiData) }, { status: 500 });
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("Finish reason:", geminiData.candidates?.[0]?.finishReason);
    console.log("Raw:", rawText.substring(0, 200));

    const result = JSON.parse(rawText);
    return NextResponse.json(result);

  } catch (error) {
    console.error("AI Grade error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
