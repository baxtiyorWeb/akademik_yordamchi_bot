// =======================================================================
//  supabase/functions/gemini-stream/index.ts
//  Senior+ Resilient Multi-Provider Load Balancer & SSE Streamer
//  Deno / TypeScript — Supabase Edge Functions Runtime
// =======================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOBAL STATE & CIRCUIT BREAKER ARXITEKTURASI
// ─────────────────────────────────────────────────────────────────────────────

/** * Circuit Breaker Map: muayyan kalit va model kombinatsiyasining bloklanish muddati.
 * Kalit ko'rinishi: "PROVIDER:KEY_INDEX:MODEL" -> Epoch MS Expiry
 */

declare const Deno: {

  env: {

    get(key: string): string | undefined;

  };

} | any;
const circuitBreaker = new Map<string, number>();
const BREAKER_TTL_MS = 60_000; // Xatolik bersa, 60 soniya qora ro'yxatga olinadi

/** Har bir model uchun Round-Robin kursori */
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
// 2. ULTRA-RESILIENT MODELLAR MATRITSAI
// ─────────────────────────────────────────────────────────────────────────────
const MODELS = {
  // Tezkor va kundalik muloqot uchun modellar
  LIGHT: [
    { provider: "MISTRAL", model: "ministral-3b-2512" }, // Super tez va katta limitli
    { provider: "GROQ", model: "llama-3.1-8b-instant" }, // Kunlik 14.4K so'rovlik tank
    { provider: "GEMINI", model: "gemini-3.1-flash-lite" }
  ],
  // Kuchliroq va muvozanatlashgan modellar
  MEDIUM: [
    { provider: "MISTRAL", model: "open-mistral-nemo" },
    { provider: "GROQ", model: "llama-3.3-70b-versatile" },
    { provider: "GEMINI", model: "gemini-2.5-flash" }
  ],
  // Og'ir vazifalar (IELTS Essay/Grammar Analysis) uchun eng aqllilari
  HEAVY: [
    { provider: "MISTRAL", model: "mistral-small-2506" }, // 2.25M dynamic token sig'imi
    { provider: "GROQ", model: "meta-llama/llama-4-scout-17b-16e-instruct" }, // Llama 4 Scout
    { provider: "GEMINI", model: "gemini-2.5-pro" }
  ]
} as any;

type Mode = "TUTOR" | "KIDS" | "IELTS_SPEAKING" | "IELTS_LISTENING" | "IELTS_READING" | "IELTS_WRITING" | "CODER";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  TUTOR: `Sen "Ovvox Ai Professional Education Tutor" san. Maqsading: foydalanuvchini individual mentorlik asosida o'qitish, murakkab mavzularni sodda qilish va ularni chuqurroq tushuntirishga yordam berish. Har bir javob professional, motivatsion, tushunarli va qiziqarli bo'lishi shart.

QOIDALAR:
- Ta'lim Mazmuni: Foydalanuvchining o'zlashtirish darajasiga moslash. Sodda analogiyalar va hayotiy misollardan foydalan. Sokrat uslubida yo'naltiruvchi savollar orqali xatosini o'zi topishiga yordam ber.
- MAVZU CHALG'ISHINI NAZORAT QILISH (Strict Focus): Agar foydalanuvchi har safar suhbat davomida fanni yoki mavzuni asossiz o'zgartiraversa, qattiqroq ustoz kabi uni tanqid qil (masalan: "Diqqatingizni jamlang! Biz hozirgina Matematika/Algebra ustida ishlayotgan edik. Nima uchun boshqa fanga chalg'iyapsiz? Avval buni oxiriga yetkazaylik!" deb). Agar chalg'ishda davom etaveradi, uni yanada qattiqroq tanbeh qil, darsdan chalg'imasligini va tartibga rioya qilishini talab qil.
- Vizualizatsiya va Kontent: Markdown JADVALLAR, bullet points, numbered lists, bold/italic matndan MAKSIMAL darajada foydalan. Matn zerikarli bo'lmasligi uchun strukturani yanada vizual qil.
- Baholash: Juda zarur bo'lsa, 0-5 shkala bo'yicha bahola ber lekin FAQAT jadval shaklida, qisqa izohlari bilan.
- Ketma-ketlik: Javoblar bosqichma-bosqich bo'lsin. Kamida bitta misol va uy vazifasi bo'lishi majburiydir.
- O'quv Rejasi va Tasdiqlash: Yangi dars/o'quv rejasi (Study Plan) tuzganingda, uning oxirida aniq qilib so'ra: "Ushbu reja sizga ma'qulmi? Agar ma'qul bo'lsa, 'Saqlash' tugmasini bosib saqlab qo'yishingiz mumkin." (Eslatma: bu tasdiqni faqat ilk bor yangi reja yaratganingizda so'rang, har bir oddiy suhbat xabarida emas).
- Emojis va Ranglar: Matn ichida emojilar ishlat 📚🎯💡⭐🚀 darsni zerikarli bo'lmasligi uchun. Har doim javob oxirida motivatsion xabar.`,

  KIDS: `Sen bolalar va o'smirlar uchun dunyodagi eng quvnoq, mehribon, sabrli va aqlli AI yordamchisan (Disney uslubidagi mentor)!

QOIDALAR:
- Til va Uslub: Har doim bolalarning yoshiga mos, nihoyatda sodda, ertaknamo va sehrli tilda tushuntir. Akademik va murakkab terminlarni umuman ishlatma (masalan, "fotosintez" o'rniga "gullarning quyosh nurini yeyishi" deb tushuntir).
- Vizualizatsiya va Emojilar: Matn ichida emojilardan juda ko'p foydalan 😊🚀🌟 keyingi qadamlarni raketalar va yulduzchalar bilan bezat. Dinga, zo'ravonlikka oid bo'lmagan qiziqarli metaforalar ishlat.
- Maqtov va Rag'bat: Har bir to'g'ri urinish yoki hatto qiziqish uchun bolani chin dildan ko'kka ko'tar ("Siz haqiqiy super qahramonsiz!", "Kosmik darajadagi aqlli fikr!"). Xatolarini aslo yuziga solma, "Ajoyib urinish, kel buni sehrli tayoqcha bilan tuzatamiz" deb yondash.
- Interaktiv O'yinlar: Har dars oxirida bolaning tasavvurini uyg'otadigan quvnoq mini-o'yin yoki topishmoq-savol ber.`,

  IELTS_SPEAKING: `Sen IELTS Speaking bo'yicha yuqori malakali, professional imtihonchi (Examiner) hamda instructor. Maqsad: talabani Band 5.0-9.0 gacha tayyorlash.
| Mezon | Band (0-9) | Izoh |
|-------|-----------|------|
| Fluency & Coherence | ? | |
| Lexical Resource | ? | |
| Grammatical Accuracy | ? | |
| Pronunciation | ? | |
| **Overall Band** | ? | |`,

  IELTS_LISTENING: `Sen IELTS Listening bo'yicha professional instructor. Maqsad: talabani haqiqiy test formatiga moslash va Band 5-9 gacha tayyorlash.`,
  IELTS_READING: `Sen IELTS Reading bo'yicha akademik ekspert va strategist. Maqsad: talabani tezlik, tushunish va Band 5-9 gacha tayyorlash.`,
  IELTS_WRITING: `Sen IELTS Writing (Academic) bo'yicha xalqaro darajadagi ekspert va redaktor. Maqsad: talabani Band 5-9 gacha tayyorlash.
BAHOLASH (4 ta mezon):
| Mezon | Band (0-9) | Izoh |
|-------|-----------|------|
| Task Achievement | ? | Savol to'liq javob berilganmi? |
| Coherence & Cohesion | ? | Matn strukturasi va bog'lanish |
| Lexical Resource | ? | So'z boyitagi va variantligi |
| Grammatical Range | ? | Grammatika va o'zgarish |
| **Overall** | ? | |`,
  CODER: `Sen dasturlash bo'yicha eng kuchli Senior Architecture Mentor hisoblanasan.`
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. FORD FORMAT MATRIX (Unified Formatter for OpenAI vs Gemini payloads)
// ─────────────────────────────────────────────────────────────────────────────
interface NeutralMessage {
  role: "user" | "assistant";
  text: string;
  attachment?: { mimeType: string; data: string } | null;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return ["429", "resource_exhausted", "quota", "rate limit", "500", "503", "overloaded", "unavailable", "timeout"].some(m => msg.includes(m));
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MULTI-PROVIDER ENGINE ADAPTERS (NATIVE STREAM CHUNKS)
// ─────────────────────────────────────────────────────────────────────────────

async function* streamGemini(apiKey: string, model: string, system: string, messages: NeutralMessage[]): AsyncGenerator<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: m.attachment ? [{ text: m.text }, { inlineData: { mimeType: m.attachment.mimeType, data: m.attachment.data } }] : [{ text: m.text }]
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generation_config: { temperature: 0.75, max_output_tokens: 20_000 }
    })
  });

  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}: ${await response.text()}`);

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
      if (jsonStr === "[DONE]") return;
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
    // OpenAI visual support can be expanded, standardizing text flow here
    openAIMessages.push({ role: m.role, content: m.text });
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages: openAIMessages, temperature: 0.75, stream: true })
  });

  if (!response.ok) throw new Error(`OpenAI-Compatible (${model}) HTTP ${response.status}: ${await response.text()}`);

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

    const systemPrompt = SYSTEM_PROMPTS[mode as Mode] ?? SYSTEM_PROMPTS["TUTOR"];
    const activeModelPool = [...(MODELS[mode as Mode] || MODELS["TUTOR"])];

    // Fayl eksport triggerini tayyorlash
    const isFileReq = !prompt.includes("JSON formati") && ["pdf", "fayl", "word", "slayd"].some(word => prompt.toLowerCase().includes(word));
    const finalPrompt = isFileReq 
      ? `[SYSTEM REMINDER: SENDA FAYL YARATISH QOBILIYATI BOR. JAVOB OXIRIDA [EXPORT_FILE: filename.ext] TEGINI QO'LLASHNI UNUTMA.]\n${prompt}` 
      : prompt;

    // Tarix matnini universal formatga keltirish
    const neutralHistory: NeutralMessage[] = history.map((h: any) => ({
      role: h.role === "ai" || h.role === "assistant" ? "assistant" : "user",
      text: h.content ?? ""
    }));
    neutralHistory.push({ role: "user", text: finalPrompt, attachment });

    // Provayderlar kalitlarini o'qish
    const geminiKeys = (Deno.env.get("GEMINI_KEYS") ?? "").split(",").map((k: any) => k.trim()).filter(Boolean);
    const groqKey = Deno.env.get("GROQ_KEY") ?? "";
    const mistralKey = Deno.env.get("MISTRAL_KEY") ?? "";

    // Execution Queue (Barcha mumkin bo'lgan ulanish kombinatsiyalarini yaratish)
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
              console.error(`[PIPELINE ERROR] Provider: ${target.provider}, Model: ${target.model} failed.`, error);
              if (isRetryableError(error)) {
                tripBreaker(target.provider, target.keyIdx, target.model);
              }
            }
          }

          // 🚨 ULTRA EMERGENCY FALLBACK: OPENROUTER
          const openRouterKey = Deno.env.get("OPENROUTER_KEY");
          if (openRouterKey) {
            try {
              console.log("[FALLBACK] Routing to OpenRouter emergency cluster...");
              const orGenerator = streamOpenAICompatible("https://api.openrouter.ai/v1", openRouterKey, "gpt-4o-mini", systemPrompt, neutralHistory);
              for await (const chunk of orGenerator) {
                sendEvent({ chunk });
              }
              sendEvent({ done: true });
              controller.close();
              return;
            } catch (orErr) {
              console.error("[CRITICAL] OpenRouter cluster isolated or exhausted.", orErr);
            }
          }

          sendEvent({ error: "Barcha AI provayderlari yuklama ostida qoldi. Iltimos bir ozdan so'ng urinib ko'ring." });
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
      } catch {
        if (isRetryableError(target)) tripBreaker(target.provider, target.keyIdx, target.model);
      }
    }

    throw new Error("All provider pools completely exhausted.");

  } catch (globalError) {
    const errorMsg = globalError instanceof Error ? globalError.message : "Internal system breakdown";
    return new Response(JSON.stringify({ error: errorMsg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});