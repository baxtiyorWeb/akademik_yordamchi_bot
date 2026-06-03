// =======================================================================
//  src/lib/gemini.js
//  Frontend Gemini Client — keys-free, Supabase Edge Function backed
//  Vite · React · ES Modules
// =======================================================================
//
//  SETUP (once):
//    npm i @supabase/supabase-js
//
//  .env (Vite project root):
//    VITE_SUPABASE_URL=https://xxxx.supabase.co
//    VITE_SUPABASE_ANON_KEY=<anon-public-key>
//
//  The Edge Function must be deployed as:
//    supabase functions deploy gemini-stream --no-verify-jwt
//
// =======================================================================

import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// 1.  SUPABASE CLIENT
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[gemini.js] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Edge Function name (must match the folder under supabase/functions/)
const EDGE_FN = "gemini-stream";

// ─────────────────────────────────────────────────────────────────────────────
// 2.  LOW-LEVEL: RAW FETCH TO THE EDGE FUNCTION (streaming)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens a raw `fetch` connection to the Edge Function and returns a
 * ReadableStream<string> of decoded SSE lines.
 *
 * We intentionally bypass `supabase.functions.invoke()` here because that
 * helper buffers the entire response; we need true streaming instead.
 */
async function openEdgeStream(payload) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    "Content-Type": "application/json",
    apikey: supabaseAnonKey,
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const url = `${supabaseUrl}/functions/v1/${EDGE_FN}`;

  const resp = await fetch(url, {
    method:  "POST",
    headers,
    body:    JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText);
    throw new Error(`Edge Function error ${resp.status}: ${errText}`);
  }

  return resp.body; // ReadableStream<Uint8Array>
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  LOW-LEVEL: NON-STREAMING INVOKE
// ─────────────────────────────────────────────────────────────────────────────

async function invokeEdgeFetch(payload) {
  const { data, error } = await supabase.functions.invoke(EDGE_FN, {
    body: { ...payload, stream: false },
  });

  if (error) throw new Error(error.message ?? "Edge Function error");
  if (data?.error) throw new Error(data.error);
  return data?.text ?? "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.  FILE ATTACHMENT HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a File/Blob to { mimeType, data } (base64, no prefix)
 * so it can be sent as JSON to the Edge Function.
 */
function fileToBase64Payload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      const data   = result.split(",")[1];
      resolve({ mimeType: file.type, data });
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  STREAM GEMINI RESPONSE  (primary public API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Streams a Gemini response through the Supabase Edge Function.
 *
 * @param {string}   prompt       – user message
 * @param {Array}    history      – prior messages [{ role, content }]
 * @param {File|null} attachment  – optional file attachment
 * @param {string}   mode        – TUTOR | KIDS | IELTS_SPEAKING | IELTS_LISTENING | IELTS_READING | IELTS_WRITING | CODER
 * @param {Function} onChunk     – called with (cumulativeText) on each new chunk
 * @param {Function} onDone      – called with (finalText) when stream ends
 * @returns {Promise<string>}    – resolves to the complete response text
 */
export async function streamGeminiResponse(
  prompt,
  history   = [],
  attachment = null,
  mode      = "TUTOR",
  onChunk,
  onDone,
) {
  // Build attachment payload if a file was provided
  let attachmentPayload = null;
  if (attachment instanceof File || attachment instanceof Blob) {
    attachmentPayload = await fileToBase64Payload(attachment);
  }

  const payload = {
    prompt,
    history,
    mode,
    stream:     true,
    attachment: attachmentPayload,
  };

  const rawStream = await openEdgeStream(payload);

  const reader  = rawStream.getReader();
  const decoder = new TextDecoder();
  let   buffer  = "";
  let   fullText = "";

  const STALL_TIMEOUT = 25_000;

  while (true) {
    let chunk;
    try {
      const readPromise = reader.read();
      const stall       = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Stream stall timeout")), STALL_TIMEOUT)
      );
      chunk = await Promise.race([readPromise, stall]);
    } catch (err) {
      console.error("[gemini.js] Stream error:", err);
      break;
    }

    const { value, done } = chunk;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // hold incomplete line

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json || json === "[DONE]") continue;

      try {
        const parsed = JSON.parse(json);

        if (parsed.error) {
          console.error("[gemini.js] Edge Function error:", parsed.error);
          onDone?.(fullText);
          return fullText;
        }

        if (parsed.done) {
          onDone?.(fullText);
          return fullText;
        }

        if (parsed.chunk) {
          fullText += parsed.chunk;
          try { onChunk?.(fullText); } catch { /* swallow handler errors */ }
        }
      } catch {
        // malformed SSE line — skip
      }
    }
  }

  onDone?.(fullText);
  return fullText;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.  FETCH GEMINI RESPONSE  (non-streaming, used internally)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Non-streaming request. Returns the full response text.
 *
 * @param {string}   prompt
 * @param {Array}    history
 * @param {File|null} attachment
 * @param {string}   mode
 * @returns {Promise<string>}
 */
export async function fetchGeminiResponse(
  prompt,
  history    = [],
  attachment = null,
  mode       = "TUTOR",
) {
  let attachmentPayload = null;
  if (attachment instanceof File || attachment instanceof Blob) {
    attachmentPayload = await fileToBase64Payload(attachment);
  }

  return invokeEdgeFetch({
    prompt,
    history,
    mode,
    attachment: attachmentPayload,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7.  NOTEBOOK LM UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a 5-question multiple-choice quiz from document content.
 * Returns a parsed JSON array of quiz objects.
 */
export async function generateNotebookQuiz(documentContent) {
  const prompt = `Quyidagi ma'lumotlar asosida talabani sinash uchun 5 ta qiziqarli test (A, B, C, D) yarating.
Faqat va faqat JSON array formatida qaytaring, hech qanday ortiqcha matn yozmang.

Format:
[
  {
    "question": "Savol matni",
    "options": ["A variant", "B variant", "C variant", "D variant"],
    "correctAnswerIndex": 0,
    "explanation": "Nima uchun bu to'g'ri?"
  }
]

Ma'lumot:
${documentContent}`;

  const response = await fetchGeminiResponse(prompt, [], null, "TUTOR");

  try {
    const clean = response.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("[gemini.js] Quiz JSON parse error:", e);
    throw new Error("Test yaratishda xatolik");
  }
}

/**
 * Generates a concise Cheat Sheet / Konspekt from document content.
 * Returns markdown-formatted text.
 */
export async function generateNotebookCheatSheet(documentContent) {
  const prompt = `Quyidagi ma'lumotlarning eng asosiy qoidalarini, formulalarini, atamalarini ajratib, 1 sahifalik juda qisqa "shporgalka" (Cheat Sheet / Konspekt) yarating.
Ortiqcha izohlarsiz faqat eng muhimlarini qoldiring. Markdown (jadvallar, bullet list, qalin yozuvlar) orqali juda chiroyli formatlang.

Ma'lumot:
${documentContent}`;

  return fetchGeminiResponse(prompt, [], null, "TUTOR");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.  STATUS  (replaces `getAntigravityStats`)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick connectivity check — calls the Edge Function with a tiny probe.
 * Returns an object with { status, latencyMs }.
 */
export async function getServiceStatus() {
  const t0 = Date.now();
  try {
    await fetchGeminiResponse("ping", [], null, "TUTOR");
    return { status: "Online", latencyMs: Date.now() - t0 };
  } catch {
    return { status: "Offline", latencyMs: Date.now() - t0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9.  DEFAULT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default {
  streamGeminiResponse,
  fetchGeminiResponse,
  generateNotebookQuiz,
  generateNotebookCheatSheet,
  getServiceStatus,
};