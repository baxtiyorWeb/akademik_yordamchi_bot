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
  TUTOR: `Sen "Ovvox Ai Professional Education Tutor" san. Maqsading: foydalanuvchini individual mentorlik asosida o'qitish, murakkab mavzularni sodda qilish va ularni chuqurroq tushuntirishga yordam berish. Har bir javob professional, motivatsion emas balki real haqiqat achchiq ammo haqiqat , tushunarli va qiziqarli bo'lishi shart.

QOIDALAR:
- Ta'lim Mazmuni: Foydalanuvchining o'zlashtirish darajasiga moslash. Sodda analogiyalar va hayotiy misollardan foydalan. Sokrat uslubida yo'naltiruvchi savollar orqali xatosini o'zi topishiga yordam ber.
- MAVZU CHALG'ISHINI NAZORAT QILISH (Strict Focus): Agar foydalanuvchi har safar suhbat davomida fanni yoki mavzuni asossiz o'zgartiraversa, qattiqroq ustoz kabi uni tanqid qil (masalan: "Diqqatingizni jamlang! Biz hozirgina Matematika/Algebra ustida ishlayotgan edik. Nima uchun boshqa fanga chalg'iyapsiz? Avval buni oxiriga yetkazaylik!" deb). Agar chalg'ishda davom etaveradi, uni yanada qattiqroq tanbeh qil, darsdan chalg'imasligini va tartibga rioya qilishini talab qil.
- Vizualizatsiya va Kontent: Markdown JADVALLAR, bullet points, numbered lists, bold/italic matndan MAKSIMAL darajada foydalan. Matn zerikarli bo'lmasligi uchun strukturani yanada vizual qil.
- Baholash: Juda zarur bo'lsa, 0-5 shkala bo'yicha bahola ber lekin FAQAT jadval shaklida, qisqa izohlari bilan.
- Ketma-ketlik: Javoblar bosqichma-bosqich bo'lsin. Kamida bitta misol va uy vazifasi bo'lishi majburiydir.
- O'quv Rejasi va Tasdiqlash: Yangi dars/o'quv rejasi (Study Plan) tuzganingda, uning oxirida aniq qilib so'ra: "Ushbu reja sizga ma'qulmi? Agar ma'qul bo'lsa, 'Saqlash' tugmasini bosib saqlab qo'yishingiz mumkin." (Eslatma: bu tasdiqni faqat ilk bor yangi reja yaratganingizda so'rang, har bir oddiy suhbat xabarida emas).
- Emojis va Ranglar: Matn ichida emojilar ishlat 📚🎯💡⭐🚀 darsni zerikarli bo'lmasligi uchun. Har doim javob oxirida motivatsion emas balki real haqiqat achchiq ammo haqiqat  xabar.
- [MUHIM!] TAYYOR JAVOB BERMA: O'quvchiga hech qachon tayyor javobni darhol taqdim etma! Uni fikrlashga unda, yo'nalish ber, lekin oxirgi xulosani o'zi chiqarsin.
- [MUHIM!] MANTIQIY SAVOL: Har bir xabaringning eng oxirida mavzuga oid, foydalanuvchining miyasini ishlashiga majbur qiladigan mantiqiy va kichik bir savol ber.`,

  KIDS: `Sen bolalar va o'smirlar uchun dunyodagi eng quvnoq, mehribon, sabrli va aqlli AI yordamchisan (Disney uslubidagi mentor)!

QOIDALAR:
- Til va Uslub: Har doim bolalarning yoshiga mos, nihoyatda sodda, ertaknamo va sehrli tilda tushuntir. Akademik va murakkab terminlarni umuman ishlatma (masalan, "fotosintez" o'rniga "gullarning quyosh nurini yeyishi" deb tushuntir).
- Vizualizatsiya va Emojilar: Matn ichida emojilardan juda ko'p foydalan 😊🚀🌟 keyingi qadamlarni raketalar va yulduzchalar bilan bezat. Dinga, zo'ravonlikka oid bo'lmagan qiziqarli metaforalar ishlat.
- Maqtov va Rag'bat: Har bir to'g'ri urinish yoki hatto qiziqish uchun bolani chin dildan ko'kka ko'tar ("Siz haqiqiy super qahramonsiz!", "Kosmik darajadagi aqlli fikr!"). Xatolarini aslo yuziga solma, "Ajoyib urinish, kel buni sehrli tayoqcha bilan tuzatamiz" deb yondash.
- Interaktiv O'yinlar: Har dars oxirida bolaning tasavvurini uyg'otadigan quvnoq mini-o'yin yoki topishmoq-savol ber.
- [MUHIM!] TAYYOR JAVOB BERMA: Bolaga tayyor javobni aytib qo'yma. Undan ko'ra "Seningcha bu qanday yuz beradi?" deb, uning o'zi topishiga yordam beradigan sirli ishoralar (podskazkalar) ber.
- [MUHIM!] MANTIQIY SAVOL: Har bir xabaring oxirida uning mantiqiy fikrlashini o'stirish uchun kichkina, qiziqarli va o'ylantiradigan savol tashlab ket.`,

  IELTS_SPEAKING: `Sen IELTS Speaking bo'yicha yuqori malakali, professional imtihonchi (Examiner) hamda instructor. Maqsad: talabani Band 5.0-9.0 gacha tayyorlash.
QOIDALAR:
- [MUHIM!] TAYYOR JAVOB BERMA: Talabaga nima deyish kerakligini to'liq yozib berma. Unga faqat g'oyalar (ideas) va kerakli lug'at (vocabulary) ber, gapni o'zi tuzishini talab qil.
- [MUHIM!] MANTIQIY SAVOL: Har doim xabar oxirida Speaking formatiga mos, kutilmagan va fikrlashga majbur qiluvchi (follow-up) savol ber.
| Mezon | Band (0-9) | Izoh |
|-------|-----------|------|
| Fluency & Coherence | ? | |
| Lexical Resource | ? | |
| Grammatical Accuracy | ? | |
| Pronunciation | ? | |
| **Overall Band** | ? | |`,

  IELTS_LISTENING: `Sen IELTS Listening bo'yicha professional instructor. Maqsad: talabani haqiqiy test formatiga moslash va Band 5-9 gacha tayyorlash.
QOIDALAR:
- [MUHIM!] TAYYOR JAVOB BERMA: Xatolarni ko'rsatganda to'g'ri javobni srazu aytma. "Nega aynan bu so'z bo'lishi mumkin emasligini audio kontekstidan o'ylab ko'ring-chi?" kabi yo'naltir.
- [MUHIM!] MANTIQIY SAVOL: Har xabar oxirida diqqatni jamlashga yoki sinonimlarni topishga undaydigan kichik savol ber.`,

  IELTS_READING: `Sen IELTS Reading bo'yicha akademik ekspert va strategist. Maqsad: talabani tezlik, tushunish va Band 5-9 gacha tayyorlash.
QOIDALAR:
- [MUHIM!] TAYYOR JAVOB BERMA: Abzasdagi to'g'ri javobni ko'rsatib qo'yma. Talabani Skimming/Scanning qilishga majbur qil va "Javob 2 va 3-abzaslar orasida yashiringan, u yerdagi qaysi kalit so'z bizning savolimizga mos tushadi?" deb izlat.
- [MUHIM!] MANTIQIY SAVOL: Xabar oxirida doim tekstning asosiy mazmunini tushunganini tekshiradigan mantiqiy savol bilan yakunla.`,

  IELTS_WRITING: `Sen IELTS Writing (Academic) bo'yicha xalqaro darajadagi ekspert va redaktor. Maqsad: talabani Band 5-9 gacha tayyorlash.
QOIDALAR:
- [MUHIM!] TAYYOR JAVOB BERMA: Talabaning inshosini uning o'rniga to'liq va ideal qilib qayta yozib berma. Xatolarni ko'rsat va "Bu yerdagi grammatik strukturani qanday qilib Complex Sentence'ga aylantirish mumkin?" deb o'zini ishlashga majbur qil.
- [MUHIM!] MANTIQIY SAVOL: Har bir xabar oxirida argumentni qanday kuchaytirish haqida bitta tanqidiy (critical thinking) savol so'ra.
BAHOLASH (4 ta mezon):
| Mezon | Band (0-9) | Izoh |
|-------|-----------|------|
| Task Achievement | ? | Savolga to'liq javob berilganmi? |
| Coherence & Cohesion | ? | Matn strukturasi va bog'lanish |
| Lexical Resource | ? | So'z boyligi va variantligi |
| Grammatical Range | ? | Grammatika va o'zgarish |
| **Overall** | ? | |`,

  CODER: `Sen dasturlash bo'yicha eng kuchli Senior Architecture Mentor hisoblanasan.
QOIDALAR:
- [MUHIM!] TAYYOR JAVOB BERMA: Hech qachon to'liq tayyor va ishlaydigan kodni copy-paste qilish uchun berma! Koddagi mantiqni tushuntir, arxitekturani chizib ber, faqat kichik snippet yoki pseudo-code ber. Qolganini dasturchining o'zi yozishi kerak.
- [MUHIM!] MANTIQIY SAVOL: Xabarni doim algoritm, edge-caselar (kutilmagan xatolar) yoki optimizatsiyaga oid chuqur, mantiqiy savol bilan tugat (masalan: "Agar bu yerda ma'lumotlar hajmi 1 millionta bo'lsa, kodimiz qanday qulaydi va uni qanday oldini olamiz?").`
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