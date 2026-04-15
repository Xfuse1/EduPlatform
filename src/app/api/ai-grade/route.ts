import { NextRequest, NextResponse } from "next/server";
console.log("Loading /api/ai-grade module...");
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
}): Promise<{ response: Response; data: any }> {
  const { model, apiKey, prompt } = params;
  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          topP: 0.1,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
        },
      }),
    },
    { retries: 2, timeoutMs: 45000, retryDelayMs: 1500 },
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

const SYSTEM_PROMPT = `أنت مصحح واجبات ذكي وعادل.

قواعد التصحيح:
1. مرجعك الأساسي هو نموذج إجابة المعلم.
2. اقبل الإجابة كصحيحة إذا كانت تحمل نفس المعنى أو المفهوم حتى لو الصياغة مختلفة.
3. اقبل المرادفات والتعبيرات المختلفة التي تؤدي نفس المعنى.
4. تجاهل الأخطاء الإملائية البسيطة التي لا تغير المعنى.
5. لا تشترط التطابق الحرفي مع نموذج الإجابة.
6. لا تستخدم معرفتك الخارجية لإضافة درجات غير مستحقة.
7. كن عادلاً — الإجابة الصحيحة بمعناها تستحق الدرجة الكاملة.`;

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

    const [questionsText, answerKeyText, studentAnswerText] = await Promise.all([
      extractTextFromFileUrl(assignmentFileUrl),
      extractTextFromFileUrl(answerKeyUrl),
      extractTextFromFileUrl(submissionFileUrl),
    ]);

    const userPrompt = `## الأسئلة:
${questionsText}

## نموذج إجابة المعلم (للفهم والمعنى فقط، ليس للمطابقة الحرفية):
${answerKeyText}

## إجابة الطالب:
${studentAnswerText}

## تعليمات التصحيح:
- تحقق أولاً: هل الملف يحتوي على إجابات للأسئلة المطروحة؟
- إذا كان الملف لا علاقة له بالأسئلة (CV، موضوع مختلف، فارغ)، أعطِ درجة 0 واكتب سبباً واضحاً
- إذا كانت إجابة الطالب تعطي نفس المعنى الصحيح بأسلوبه الخاص، أعطِه الدرجة كاملة
- لا تخصم درجات بسبب اختلاف الصياغة أو الأسلوب إذا كان المعنى صحيحاً

## الدرجة النهائية للواجب: ${maxGrade || 100} درجة
- وزّع الدرجات على الأسئلة بحيث يكون مجموعها ${maxGrade || 100} درجة كحد أقصى

يجب أن يكون ردك JSON صالح فقط:
{"grade":${maxGrade || 100},"feedback":[{"question":1,"score":${Math.round((maxGrade || 100) / 4)},"maxScore":${Math.round((maxGrade || 100) / 4)},"comment":"تعليق"}],"summary":"ملخص"}`;

    const models = getGeminiModels();
    const prompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

    let successfulModel: string | null = null;
    let successfulData: any = null;
    let finalStatus = 500;
    let finalMessage = "فشل الاتصال بخدمة Gemini. حاول مرة أخرى بعد قليل.";
    let finalDetails: any = null;

    for (const model of models) {
      try {
        const { response, data } = await callGeminiModel({
          model,
          apiKey: process.env.GEMINI_API_KEY,
          prompt,
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
    console.log(`Gemini model success: ${successfulModel}`);
    console.log("Finish reason:", successfulData.candidates?.[0]?.finishReason);
    console.log("Raw:", String(rawText).substring(0, 200));

    const jsonText = extractJsonObjectText(rawText);
    if (!jsonText) {
      throw new Error(`Gemini returned non-JSON content from model ${successfulModel}`);
    }

    const result = JSON.parse(jsonText);

    // احسب الدرجة من مجموع الـ scores بدل ما نثق في الـ AI
    if (result.feedback && Array.isArray(result.feedback)) {
      const totalScore = result.feedback.reduce((sum: number, item: any) => sum + (item.score || 0), 0);
      result.grade = Math.min(totalScore, maxGrade || 100);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Grade error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
