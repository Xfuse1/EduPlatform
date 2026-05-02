import { NextRequest, NextResponse } from "next/server";
// const pdfParse = require("pdf-parse/lib/pdf-parse.js");
// const mammoth = require("mammoth");

const NETWORK_RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MODEL_FALLBACK_STATUS_CODES = new Set([404, 408, 429, 500, 502, 503, 504]);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const causeCode = (error as any)?.cause?.code;
    return causeCode ? `${error.message} (${causeCode})` : error.message;
  }
  return String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options?: {
    retries?: number;
    timeoutMs?: number;
    retryDelayMs?: number;
  },
): Promise<Response> {
  const retries = options?.retries ?? 2;
  const timeoutMs = options?.timeoutMs ?? 30000;
  const retryDelayMs = options?.retryDelayMs ?? 1200;

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      const shouldRetry = NETWORK_RETRYABLE_STATUS_CODES.has(response.status) && attempt <= retries;
      if (!shouldRetry) {
        return response;
      }

      await sleep(retryDelayMs * attempt);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt > retries) {
        throw error;
      }

      await sleep(retryDelayMs * attempt);
    }
  }

  throw new Error(getErrorMessage(lastError));
}

function getFileExtension(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = decodeURIComponent(parsed.pathname).toLowerCase();
    const dotIndex = pathname.lastIndexOf(".");
    return dotIndex >= 0 ? pathname.slice(dotIndex + 1) : "";
  } catch {
    return "";
  }
}

function isPdfFile(extension: string, contentType: string): boolean {
  return extension === "pdf" || contentType.includes("application/pdf");
}

function isDocxFile(extension: string, contentType: string): boolean {
  return (
    extension === "docx" ||
    contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  );
}

async function extractTextFromFileUrl(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetchWithRetry(
      url,
      { method: "GET" },
      { retries: 2, timeoutMs: 30000, retryDelayMs: 1500 },
    );
  } catch (error) {
    throw new Error(`Failed to download file: ${url}. ${getErrorMessage(error)}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to download file: ${url} (status ${response.status})`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const extension = getFileExtension(url);
  const mammoth = require("mammoth");
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const buffer = Buffer.from(await response.arrayBuffer());

  if (isPdfFile(extension, contentType)) {
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  if (isDocxFile(extension, contentType)) {
    const data = await mammoth.extractRawText({ buffer });
    return (data?.value ?? "").trim();
  }

  throw new Error(`Unsupported file type for AI grading (supported: PDF, DOCX): ${url}`);
}

function getGeminiModels(): string[] {
  const modelsFromList = (process.env.GEMINI_MODELS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (modelsFromList.length > 0) {
    return Array.from(new Set(modelsFromList));
  }

  const modelFromSingle = process.env.GEMINI_MODEL?.trim();
  if (modelFromSingle) {
    return [modelFromSingle];
  }

  return ["gemini-2.5-flash-lite"];
}

async function callGeminiModel(params: {
  model: string;
  apiKey: string;
  prompt: string;
  fileBuffer?: Buffer;
  mimeType?: string;
}): Promise<{ response: Response; data: any }> {
  const { model, apiKey, prompt, fileBuffer, mimeType } = params;

  const parts: any[] = [{ text: prompt }];
  if (fileBuffer && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: fileBuffer.toString("base64"),
      },
    });
  }

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.0,
          topP: 0.1,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
        },
      }),
    },
    { retries: 2, timeoutMs: 60000, retryDelayMs: 1500 },
  );

  const raw = await response.text();
  let data: any = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  return { response, data };
}

function extractJsonObjectText(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return "";

  const withoutCodeFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (withoutCodeFence.startsWith("{") && withoutCodeFence.endsWith("}")) {
    return withoutCodeFence;
  }

  const firstBrace = withoutCodeFence.indexOf("{");
  const lastBrace = withoutCodeFence.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutCodeFence.slice(firstBrace, lastBrace + 1);
  }

  return "";
}

export async function POST(req: NextRequest) {
  console.log("POST /api/ai-grade hit");

  try {
    const body = await req.json();
    const { assignmentFileUrl, answerKeyUrl, submissionFileUrl, maxGrade } = body ?? {};

    if (!assignmentFileUrl || !answerKeyUrl || !submissionFileUrl) {
      return NextResponse.json({ error: "Missing required file URLs" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
    }

    // استخراج النصوص وتحميل الملف للطالب (Vision)
    const [questionsText, answerKeyText, studentAnswerText, submissionFileResponse] = await Promise.all([
      extractTextFromFileUrl(assignmentFileUrl),
      extractTextFromFileUrl(answerKeyUrl),
      extractTextFromFileUrl(submissionFileUrl).catch(() => ""), // استخراج النص كاحتياطي
      fetch(submissionFileUrl).then((res) => res.arrayBuffer()),
    ]);

    const submissionBuffer = Buffer.from(submissionFileResponse);
    const extension = getFileExtension(submissionFileUrl);
    let mimeType = "application/pdf";
    if (["jpg", "jpeg"].includes(extension)) mimeType = "image/jpeg";
    else if (extension === "png") mimeType = "image/png";

    const systemPrompt = `أنت مصحح واجبات دقيق ومتخصص. اتبع هذه القواعد بصرامة:

1. صحح كل سؤال بشكل مستقل ومنفصل تماماً.
2. لكل سؤال: قارن إجابة الطالب بنموذج المعلم من حيث المعنى والمحتوى.
3. سلّم الدرجة الكاملة إذا كان المعنى صحيحاً حتى لو الصياغة مختلفة.
4. سلّم صفراً إذا كانت الإجابة خاطئة أو غائبة تماماً.
5. سلّم درجة جزئية فقط إذا كانت الإجابة صحيحة جزئياً بشكل واضح.
6. لا تضف معلومات من خارج إجابة الطالب.
7. لا تتأثر بأسلوب الكتابة أو الإملاء.
8. مجموع الدرجات يجب أن يساوي بالضبط ما يستحقه الطالب وليس أكثر من ${maxGrade || 100}.`;

    const userPrompt = `## الأسئلة:
${questionsText}

## نموذج إجابة المعلم:
${answerKeyText}

${studentAnswerText ? `## نص إجابة الطالب (تم استخراجه آلياً): \n${studentAnswerText}` : ""}

## تعليمات إضافية:
- لقد تم تزويدك بملف إجابة الطالب المرفق (صورة أو PDF). يرجى قراءته مباشرة وتصحيحه بدقة، خاصة إذا كان مكتوباً بخط اليد.
- مجموع الدرجات القصوى هو ${maxGrade || 100}.

## مطلوب منك:
صحح كل سؤال بشكل مستقل والتزم بهذا التنسيق JSON فقط بدون أي نص إضافي:

{
  "totalScore": <المجموع الفعلي>,
  "maxScore": ${maxGrade || 100},
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "<نص السؤال>",
      "maxScore": <درجة السؤال>,
      "studentScore": <درجة الطالب>,
      "studentAnswer": "<ملخص إجابة الطالب من الملف>",
      "correctAnswer": "<ملخص الإجابة الصحيحة>",
      "feedback": "<سبب الدرجة في جملة واحدة>"
    }
  ],
  "generalFeedback": "<تعليق عام على أداء الطالب>"
}`;

    const models = getGeminiModels();
    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    let successfulModel: string | null = null;
    let successfulData: any = null;
    let finalStatus = 500;
    let finalMessage = "فشل الاتصال بخدمة Gemini. حاول مرة أخرى بعد قليل.";
    let finalDetails: any = null;

    for (const model of models) {
      try {
        // نستخدم الموديل مع إرسال الملف (Vision)
        const { response, data } = await callGeminiModel({
          model,
          apiKey: process.env.GEMINI_API_KEY,
          prompt,
          fileBuffer: submissionBuffer,
          mimeType: mimeType,
        });

        if (response.ok) {
          successfulModel = model;
          successfulData = data;
          break;
        }

        const message = data?.error?.message || data?.message || `Gemini model failed: ${model}`;
        console.error(`Gemini error [${model}]:`, JSON.stringify(data));

        finalStatus = response.status || 500;
        finalMessage = message;
        finalDetails = data;

        if (!MODEL_FALLBACK_STATUS_CODES.has(response.status)) {
          break;
        }
      } catch (error) {
        console.error(`Gemini request error [${model}]:`, error);
        finalStatus = 503;
        finalMessage = getErrorMessage(error);
        finalDetails = { model, message: finalMessage };
      }
    }

    if (!successfulModel || !successfulData) {
      return NextResponse.json(
        {
          error: finalMessage,
          details: finalDetails,
          modelsTried: models,
        },
        { status: finalStatus || 500 },
      );
    }

    const rawText = successfulData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonText = extractJsonObjectText(rawText);
    if (!jsonText) {
      throw new Error(`Gemini returned non-JSON content from model ${successfulModel}`);
    }

    const aiResult = JSON.parse(jsonText);

    // تحويل التنسيق الجديد إلى التنسيق الذي تتوقعه الواجهة الأمامية
    const result = {
      grade: aiResult.totalScore ?? 0,
      summary: aiResult.generalFeedback ?? "",
      feedback: (aiResult.questions || []).map((q: any) => ({
        question: q.questionNumber || q.questionText,
        score: q.studentScore ?? 0,
        comment: q.feedback || "",
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Grade error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

