// =======================================================================
//  supabase/functions/gemini-stream/index.ts
//  Senior+ Resilient Multi-Provider Load Balancer & SSE Streamer
//  Deno / TypeScript — Supabase Edge Functions Runtime
// =======================================================================

// @ts-ignore: Deno is provided globally by the Supabase Edge Runtime
declare const Deno: any;

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOBAL STATE & CIRCUIT BREAKER ARXITEKTURASI
// ─────────────────────────────────────────────────────────────────────────────

const circuitBreaker = new Map<string, number>();
const BREAKER_TTL_MS = 60_000; // Xatolik bersa, 60 soniya qora ro'yxatga olinadi
const rrCursor = new Map<string, number>();

function getBreakerKey(provider: string, keyIdx: number, model: string): string {
  return `${provider}:${keyIdx}:${model}`;
}

function isAvailable(provider: string, keyIdx: number, model: string): boolean {
  const cbKey = getBreakerKey(provider, keyIdx, model);
  const blockedUntil = circuitBreaker.get(cbKey);
  if (!blockedUntil) return true;

  if (Date.now() > blockedUntil) {
    circuitBreaker.delete(cbKey);
    return true;
  }
  return false;
}

function tripBreaker(provider: string, keyIdx: number, model: string): void {
  const cbKey = getBreakerKey(provider, keyIdx, model);
  circuitBreaker.set(cbKey, Date.now() + BREAKER_TTL_MS);
  console.warn(`[CIRCUIT BREAKER] Tripped! ${cbKey} is isolated for ${BREAKER_TTL_MS / 1000}s`);
}

function getNextIndex(listHash: string, total: number): number {
  const cur = (rrCursor.get(listHash) ?? -1) + 1;
  const next = cur % total;
  rrCursor.set(listHash, next);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FETCH WITH TIMEOUT (408 TIMEOUT'DAN HIMOYA)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REJIMLAR VA MODELLAR MATRITSASI (MAPPING TO'G'RILANDI)
// ─────────────────────────────────────────────────────────────────────────────
type Mode = "TUTOR" | "KIDS" | "IELTS_SPEAKING" | "IELTS_LISTENING" | "IELTS_READING" | "IELTS_WRITING" | "CODER";

const MODELS: Record<Mode, Array<{ provider: "GEMINI" | "GROQ" | "MISTRAL"; model: string }>> = {
  TUTOR: [
    { provider: "GEMINI", model: "gemini-2.5-flash" },
    { provider: "GROQ", model: "llama-3.3-70b-versatile" },
    { provider: "MISTRAL", model: "open-mistral-nemo" }
  ],
  KIDS: [
    { provider: "GEMINI", model: "gemini-3.1-flash-lite" },
    { provider: "GROQ", model: "llama-3.1-8b-instant" },
    { provider: "MISTRAL", model: "ministral-3b-2512" }
  ],
  IELTS_SPEAKING: [
    { provider: "GEMINI", model: "gemini-2.5-flash" },
    { provider: "GROQ", model: "llama-3.3-70b-versatile" },
    { provider: "MISTRAL", model: "open-mistral-nemo" }
  ],
  IELTS_LISTENING: [
    { provider: "GEMINI", model: "gemini-2.5-flash" },
    { provider: "GROQ", model: "llama-3.3-70b-versatile" },
    { provider: "MISTRAL", model: "open-mistral-nemo" }
  ],
  IELTS_READING: [
    { provider: "GEMINI", model: "gemini-2.5-flash" },
    { provider: "GROQ", model: "llama-3.3-70b-versatile" },
    { provider: "MISTRAL", model: "open-mistral-nemo" }
  ],
  IELTS_WRITING: [
    { provider: "GEMINI", model: "gemini-2.5-pro" },
    { provider: "GROQ", model: "meta-llama/llama-4-scout-17b-16e-instruct" },
    { provider: "MISTRAL", model: "mistral-small-2506" }
  ],
  CODER: [
    { provider: "GEMINI", model: "gemini-2.5-pro" },
    { provider: "GROQ", model: "meta-llama/llama-4-scout-17b-16e-instruct" },
    { provider: "MISTRAL", model: "mistral-small-2506" }
  ]
};

const SYSTEM_PROMPTS: Record<Mode, string> = {
  TUTOR: `Sen "Ovvox Ai Professional Education Tutor" san. Maqsading: foydalanuvchini individual mentorlik asosida o'qitish, murakkab mavzularni sodda qilish va ularni chuqurroq tushuntirishga yordam berish. Har bir javob professional, motivatsion, tushunarli va qiziqarli bo'lishi shart.`,
  KIDS: `Sen bolalar va o'smirlar uchun dunyodagi eng quvnoq, mehribon, sabrli va aqlli AI yordamchisan (Disney uslubidagi mentor)!`,
  IELTS_SPEAKING: `Sen IELTS Speaking bo'yicha yuqori malakali, professional imtihonchi.`,
  IELTS_LISTENING: `Sen IELTS Listening bo'yicha professional instructor.`,
  IELTS_READING: `Sen IELTS Reading bo'yicha akademik ekspert va strategist.`,
  IELTS_WRITING: `Sen IELTS Writing (Academic) bo'yicha xalqaro darajadagi ekspert va redaktor.`,
  CODER: `Sen dasturlash bo'yicha eng kuchli Senior Architecture Mentor hisoblanasan.`
};

interface NeutralMessage {
  role: "user" | "assistant";
  text: string;
  attachment?: { mimeType: string; data: string } | null;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return ["429", "resource_exhausted", "quota", "rate limit", "500", "503", "overloaded", "unavailable", "timeout", "abort"].some(m => msg.includes(m));
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MULTI-PROVIDER ENGINE ADAPTERS (NATIVE STREAM CHUNKS WITH TIMEOUT)
// ─────────────────────────────────────────────────────────────────────────────

async function* streamGemini(apiKey: string, model: string, system: string, messages: NeutralMessage[]): AsyncGenerator<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: m.attachment ? [{ text: m.text }, { inlineData: { mimeType: m.attachment.mimeType, data: m.attachment.data } }] : [{ text: m.text }]
  }));

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generation_config: { temperature: 0.75 }
    })
  }, 8000);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch { /* skip */ }
    }
  }
}

async function* streamOpenAICompatible(baseUrl: string, apiKey: string, model: string, system: string, messages: NeutralMessage[]): AsyncGenerator<string> {
  const openAIMessages = [{ role: "system", content: system }];
  for (const m of messages) {
    openAIMessages.push({ role: m.role, content: m.text });
  }

  const response = await fetchWithTimeout(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: openAIMessages, temperature: 0.75, stream: true })
  }, 8000);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine.startsWith("data:")) continue;
      const dataStr = cleanLine.slice(5).trim();
      if (dataStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(dataStr);
        const text = parsed?.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch { /* skip */ }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. UNIFIED ROUTING & PIPELINE CONTROL
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin === "*" ? "*" : origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, history = [], mode = "TUTOR", stream = true, attachment = null } = body;

    if (!prompt) return new Response(JSON.stringify({ error: "`prompt` is required." }), { status: 400, headers: corsHeaders });

    // Rejim xavfsiz tanlab olinadi
    const selectedMode = (mode && MODELS[mode as Mode]) ? (mode as Mode) : "TUTOR";
    const systemPrompt = SYSTEM_PROMPTS[selectedMode];
    const activeModelPool = [...MODELS[selectedMode]];

    const neutralHistory: NeutralMessage[] = history.map((h: any) => ({
      role: h.role === "ai" || h.role === "assistant" ? "assistant" : "user",
      text: h.content ?? ""
    }));
    neutralHistory.push({ role: "user", text: prompt, attachment });

    const geminiKeys = (Deno.env.get("GEMINI_KEYS") ?? "").split(",").map((k: any) => k.trim()).filter(Boolean);
    const groqKey = Deno.env.get("GROQ_KEY") ?? "";
    const mistralKey = Deno.env.get("MISTRAL_KEY") ?? "";

    const executionQueue: Array<{ provider: string; apiKey: string; keyIdx: number; model: string }> = [];

    for (const entry of activeModelPool) {
      if (entry.provider === "GEMINI" && geminiKeys.length > 0) {
        const startIdx = getNextIndex(`gemini:${entry.model}`, geminiKeys.length);
        for (let i = 0; i < geminiKeys.length; i++) {
          const idx = (startIdx + i) % geminiKeys.length;
          executionQueue.push({ provider: "GEMINI", apiKey: geminiKeys[idx], keyIdx: idx, model: entry.model });
        }
      } else if (entry.provider === "GROQ" && groqKey) {
        executionQueue.push({ provider: "GROQ", apiKey: groqKey, keyIdx: 0, model: entry.model });
      } else if (entry.provider === "MISTRAL" && mistralKey) {
        executionQueue.push({ provider: "MISTRAL", apiKey: mistralKey, keyIdx: 0, model: entry.model });
      }
    }

    // ─── STREAMING RESPONSE REJIM ───
    if (stream) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const sendEvent = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

          for (const target of executionQueue) {
            if (!isAvailable(target.provider, target.keyIdx, target.model)) continue;

            try {
              let generator;
              if (target.provider === "GEMINI") {
                generator = streamGemini(target.apiKey, target.model, systemPrompt, neutralHistory);
              } else if (target.provider === "GROQ") {
                generator = streamOpenAICompatible("https://api.groq.com/openai", target.apiKey, target.model, systemPrompt, neutralHistory);
              } else {
                generator = streamOpenAICompatible("https://api.mistral.ai", target.apiKey, target.model, systemPrompt, neutralHistory);
              }

              for await (const chunk of generator) {
                sendEvent({ chunk });
              }
              sendEvent({ done: true });
              controller.close();
              return;

            } catch (error) {
              console.error(`[PIPELINE ERROR] ${target.provider}:${target.model} failed.`, error);
              if (isRetryableError(error)) {
                tripBreaker(target.provider, target.keyIdx, target.model);
              }
            }
          }

          // EMERGENCY FALLBACK (OPENROUTER)
          const openRouterKey = Deno.env.get("OPENROUTER_KEY");
          if (openRouterKey) {
            try {
              const orGenerator = streamOpenAICompatible("https://api.openrouter.ai/v1", openRouterKey, "gpt-4o-mini", systemPrompt, neutralHistory);
              for await (const chunk of orGenerator) sendEvent({ chunk });
              sendEvent({ done: true });
              controller.close();
              return;
            } catch { /* skip fallback fail */ }
          }

          sendEvent({ error: "Xizmatda vaqtinchalik uzilish. Iltimos qayta urinib ko'ring." });
          controller.close();
        }
      });

      return new Response(responseStream, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no"
        }
      });
    }

    // ─── NON-STREAMING RESPONSE REJIM ───
    for (const target of executionQueue) {
      if (!isAvailable(target.provider, target.keyIdx, target.model)) continue;
      try {
        let generator;
        if (target.provider === "GEMINI") generator = streamGemini(target.apiKey, target.model, systemPrompt, neutralHistory);
        else if (target.provider === "GROQ") generator = streamOpenAICompatible("https://api.groq.com/openai", target.apiKey, target.model, systemPrompt, neutralHistory);
        else generator = streamOpenAICompatible("https://api.mistral.ai", target.apiKey, target.model, systemPrompt, neutralHistory);

        let fullText = "";
        for await (const chunk of generator) fullText += chunk;

        return new Response(JSON.stringify({ text: fullText }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        if (isRetryableError(err)) tripBreaker(target.provider, target.keyIdx, target.model);
      }
    }

    throw new Error("All provider pools completely exhausted.");

  } catch (globalError) {
    const errorMsg = globalError instanceof Error ? globalError.message : "Internal system breakdown";
    return new Response(JSON.stringify({ error: errorMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});