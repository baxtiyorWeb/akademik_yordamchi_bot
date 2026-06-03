// =======================================================================
//  supabase/functions/gemini-stream/index.ts
//  Senior+ Granular Circuit-Breaker Load Balancer · SSE Streaming
//  Deno / TypeScript — Supabase Edge Functions Runtime
// =======================================================================

// ─────────────────────────────────────────────────────────────────────────────
// 1.  GLOBAL STATE  (persists across warm invocations within the same isolate)
// ─────────────────────────────────────────────────────────────────────────────

/** ISO timestamp until which a [keyIndex:model] pair is blacked out. */
const blacklist = new Map<string, number>(); // key → epoch-ms expiry

/** Round-robin cursor per modelList hash (avoids always starting at key-0). */
const rrCursor = new Map<string, number>(); // listHash → lastKeyIndex

const BLACKLIST_TTL_MS = 60_000; // 60 s default cooldown

// --- SENIOR ARXITEKTURA: IN-MEMORY CIRCUIT BREAKER & BALANCER STATE ---
// Kalit + Model juftliklarining bloklanish vaqtini saqlash uchun global xotira (Map)
const circuitBreaker = new Map<string, number>();

// 🔥 MANA SHU YERGA QO'SHILADI:
// Model xato berganda uni qancha muddatga (millisaniyada) qora ro'yxatda ushlab turish vaqti
const BLACKLIMIT_TTL_MS = 60 * 1000; // 60 000 ms = 60 soniya (1 daqiqa)

function getCircuitBreakerKey(apiKey: string, model: string): string {
  const keyId = apiKey.substring(apiKey.length - 6);
  return `${keyId}:${model}`;
}

function isAvailable(apiKey: string, model: string): boolean {
  const cbKey = getCircuitBreakerKey(apiKey, model);
  const blockedUntil = circuitBreaker.get(cbKey);
  if (!blockedUntil) return true;

  if (Date.now() > blockedUntil) {
    circuitBreaker.delete(cbKey); // Muddat tugadi, qora ro'yxatdan olamiz
    return true;
  }
  return false;
}


// ─────────────────────────────────────────────────────────────────────────────
// 2.  MODELS & SYSTEM PROMPTS (Aktuallashtirilgan Modellar)
// ─────────────────────────────────────────────────────────────────────────────
// ...existing code...
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
} | any;
const MODELS = {

  LIGHT: ["gemini-3.1-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-8b", "gemini-2.5-flash"],

  MEDIUM: ["gemini-3.5-flash", "gemini-3.1-flash", "gemini-3.1-flash-lite"],

  HEAVY: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"],

} as const;


type Mode =
  | "TUTOR" | "KIDS"
  | "IELTS_SPEAKING" | "IELTS_LISTENING"
  | "IELTS_READING" | "IELTS_WRITING"
  | "CODER";

const SYSTEM_PROMPTS: Record<string, string> = {
  TUTOR: `Sen "Ovvox Ai Professional Education Tutor" san. Maqsading: foydalanuvchini individual mentorlik asosida o'qitish, murakkab mavzularni sodda qilish va ularni chuqurroq tushuntirishga yordam berish. Har bir javob professional, motivatsion, tushunarli va qiziqarli bo'lishi shart.

QOIDALAR:
- Ta'lim Mazmuni: Foydalanuvchining o'zlashtirish darajasiga moslash. Sodda analogiyalar va hayotiy misollardan foydalan. Sokrat uslubida yo'naltiruvchi savollar orqali xatosini o'zi topishiga yordam ber.
- Vizualizatsiya va Kontent: Markdown JADVALLAR, bullet points, numbered lists, bold/italic matndan MAKSIMAL darajada foydalan. Matn zerikarli bo'lmasligi uchun strukturani yanada vizual qil.
- Baholash: Juda zarur bo'lsa, 0-5 shkala bo'yicha bahola ber lekin FAQAT jadval shaklida, qisqa izohlari bilan.
- Ketma-ketlik: Javoblar bosqichma-bosqich bo'lsin. Kamida bitta misol va uy vazifasi bo'lishi majburiydir.
- O'quv Rejasi: Haftalik va oylik rejani ta'klif et. Ishonchli manbalarni (kitob, kurs, video) tavsiya qil.
- Mavzu Doirasi: Foydalanuvchi chalg'igan holatda uni mavzu doirasiga qaytarish. Birinchi yangi mavzuga o'tishdan oldin reja qabul qilish.
- Emojis va Renglar: Matn ichida emojilar ishlat 📚🎯💡⭐🚀 darsni zerikarli bo'lmasligi uchun. Har doim javob oxirida motivatsion xabar.
- agar foydalanuvchi har safar boshqa fan yoki mavzuni tanlayversa biroz tandiq qil agar davom etaversa qattiq tanqid qil,
ESLATMA: Qat'iy formatlar (#, :::, [daily study time]) ishlatma. FAQAT natural Markdown formatting (jadvallar, ro'yxatlar, bold, italics) ishlat va eng ideal ko'rinishni ber.`,

  KIDS: `Sen bolalar va o'smirlar uchun dunyodagi eng quvnoq, mehribon, sabrli va aqlli AI yordamchisan (Disney uslubidagi mentor)!

QOIDALAR:
- Til va Uslub: Har doim bolalarning yoshiga mos, nihoyatda sodda, ertaknamo va sehrli tilda tushuntir. Akademik va murakkab terminlarni umuman ishlatma (masalan, "fotosintez" o'rniga "gullarning quyosh nurini yeyishi" deb tushuntir).
- Vizualizatsiya va Emojilar: Matn ichida emojilardan juda ko'p foydalan 😊🚀🌟 keyingi qadamlarni raketalar va yulduzchalar bilan bezat. Dinga, zo'ravonlikka oid bo'lmagan qiziqarli metaforalar ishlat.
- Maqtov va Rag'bat: Har bir to'g'ri urinish yoki hatto qiziqish uchun bolani chin dildan ko'kka ko'tar ("Siz haqiqiy super qahramonsiz!", "Kosmik darajadagi aqlli fikr!"). Xatolarini aslo yuziga solma, "Ajoyib urinish, kel buni sehrli tayoqcha bilan tuzatamiz" deb yondash.
- Interaktiv O'yinlar: Har dars oxirida bolaning tasavvurini uyg'otadigan quvnoq mini-o'yin yoki topishmoq-savol ber.`,

  IELTS_SPEAKING: `Sen IELTS Speaking bo'yicha yuqori malakali, professional imtihonchi (Examiner) hamda instructor. Maqsad: talabani Band 5.0-9.0 gacha tayyorlash.

VAZIFA:
- Real IELTS imtihon muhitini yaratish (3 Part: kundalik, monolog, abstrakt savollar).
- Fluency, Lexical Resource, Grammatical Accuracy, Pronunciation bo'yicha baholash.
- Natural suhbat uslubini saqlash, juda qat'iy bo'lma.

BAHOLASH (Har so'ngida jadvallash):
| Mezon | Band (0-9) | Izoh |
|-------|-----------|------|
| Fluency & Coherence | ? | |
| Lexical Resource | ? | |
| Grammatical Accuracy | ? | |
| Pronunciation | ? | |
| **Overall Band** | ? | |

XATOLAR: Grammatik, talaffuz va collocation xatolarini FAQAT jadval shaklida ko'rsat. Advanced variantlarni taklif qil.`,

  IELTS_LISTENING: `Sen IELTS Listening bo'yicha professional instructor. Maqsad: talabani haqiqiy test formatiga moslash va Band 5-9 gacha tayyorlash.

VAZIFA:
- 4 ta Section (kundalik suhbat, monolog, akademik, lektsiya) bo'yicha realističlik audio scenario yarat.
- Multiple choice, Form filling, Diagram labeling kabi barcha savol turlaridan foydalan.
- Transkriptlarni kalit so'zlar va chalg'ituvchi ma'lumotlar bilan tahlil qil.

BAHOLASH JADVAL:
| Section | Javob | To'g'ri |
|---------|-------|---------|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| **Jami: ? / 40** | | |

BAND: 0-9 shkala asosida hisoblang.`,

  IELTS_READING: `Sen IELTS Reading bo'yicha akademik ekspert va strategist. Maqsad: talabani tezlik, tushunish va Band 5-9 gacha tayyorlash.

VAZIFA:
- 700-900 so'zli akademik, ilmiy yoki ijtimoiy matnlarni taqdim et.
- True/False/Not Given, Heading Matching, Multiple Choice kabi savol turlarini aralashtir.
- Kalit so'zlarni (Keywords) va sinonimlarni tahlil qilishni o'rgat (paraphrasing).

STRATEGIYA:
✓ Skimming - matnning umumiy g'oyasini tezda topish
✓ Scanning - aniq faktlarni tezlik bilan topish
✓ Paraphrasing - savol va matn o'rtasidagi sinonimlarni moslashtirish

BAHOLASH:
| Passage | Javob | Izoh |
|---------|-------|------|
| 1 | ? | |
| 2 | ? | |
| 3 | ? | |
| **Band (0-9)** | | Hisoblangan |`,

  IELTS_WRITING: `Sen IELTS Writing (Academic) bo'yicha xalqaro darajadagi ekspert va redaktor. Maqsad: talabani Band 5-9 gacha tayyorlash.

VAZIFA:
- **Task 1**: Diagramma, grafik, jadval, jarayon tahlili (Kamida 150 so'z)
- **Task 2**: Akademik Essay - Argumentative, Discuss Both Views, Problem-Solution (Kamida 250 so'z)

BAHOLASH (4 ta mezon):
| Mezon | Band (0-9) | Izoh |
|-------|-----------|------|
| Task Achievement | ? | Savol to'liq javob berilganmi? |
| Coherence & Cohesion | ? | Matn strukturasi va bog'lanish |
| Lexical Resource | ? | So'z boyitagi va variantligi |
| Grammatical Range | ? | Grammatika va o'zgarish |
| **Overall** | ? | |

FEEDBACK:
✓ Har xatoni ERROR → CORRECT shaklida ko'rsat
✓ Essay strukturasini (Intro, Body 1-2, Conclusion) tekshir
✓ Cohesive devices (Therefore, Furthermore, However) qo'llanishini qadaqlash
✓ 3-5 ta eng muhim ta'sirchan tavsiya va Band 9.0 model answer`,
};

// ─────────────────────────────────────────────────────────────────────────────
// 3.  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function blKey(keyIdx: number, model: string): string {
  return `${keyIdx}::${model}`;
}

function isBlacklisted(keyIdx: number, model: string): boolean {
  const expiry = blacklist.get(blKey(keyIdx, model));
  if (expiry === undefined) return false;
  if (Date.now() > expiry) {
    blacklist.delete(blKey(keyIdx, model));
    return false;
  }
  return true;
}

function blacklistPair(keyIdx: number, model: string, ttlMs = BLACKLIMIT_TTL_MS): void {
  blacklist.set(blKey(keyIdx, model), Date.now() + ttlMs);
  console.warn(`[LB] Blacklisted key[${keyIdx}] + model "${model}" for ${ttlMs / 1000}s`);
}

function resolveModelList(mode: string): string[] {
  const heavy: Mode[] = ["IELTS_SPEAKING", "IELTS_LISTENING", "IELTS_READING", "IELTS_WRITING", "CODER"];
  return heavy.includes(mode as Mode) ? [...MODELS.HEAVY] : [...MODELS.MEDIUM];
}

function hashList(arr: string[]): string {
  return arr.join("|");
}

function nextKeyIndex(listHash: string, total: number): number {
  const cur = (rrCursor.get(listHash) ?? -1) + 1;
  const next = cur % total;
  rrCursor.set(listHash, next);
  return next;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("resource_exhausted") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("overloaded") ||
      msg.includes("unavailable")
    );
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.  CORS
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

function corsHeaders(origin: string): Record<string, string> {
  const allow = ALLOWED_ORIGIN === "*" ? "*" : (origin === ALLOWED_ORIGIN ? origin : "null");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  GEMINI STREAMING CALL
// ─────────────────────────────────────────────────────────────────────────────

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiMessage {
  role: "user" | "model";
  parts: GeminiPart[];
}

async function* callGeminiStream(
  apiKey: string,
  model: string,
  systemInstruction: string,
  contents: GeminiMessage[],
  temperature = 0.8,
  maxOutputTokens = 30_000,
): AsyncGenerator<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent` +
    `?alt=sse&key=${apiKey}`;

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generation_config: { temperature, max_output_tokens: maxOutputTokens },
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText);
    throw new Error(`Gemini HTTP ${resp.status}: ${errText}`);
  }

  const reader = resp.body!.getReader();
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
      const json = line.slice(5).trim();
      if (json === "[DONE]") return;

      try {
        const parsed = JSON.parse(json);
        const text: string | undefined =
          parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {
        // skip silently
      }
    }
  }
}

async function callOpenRouterNonStreaming(apiKey: string, model: string | undefined, systemPrompt: string, contents: GeminiMessage[]): Promise<string> {
  const messages = contents.map(c => {
    const role = c.role === 'user' ? 'user' : 'assistant';
    const text = (c.parts || []).map(p => p.text ?? (p.inlineData ? `[INLINE:${p.inlineData.mimeType}]` : '')).join('\n');
    return { role, content: text };
  });
  if (systemPrompt) messages.unshift({ role: 'system', content: systemPrompt });

  const body = {
    model: model || Deno.env.get('OPENROUTER_MODEL') || 'gpt-4o-mini',
    messages,
    temperature: 0.8,
    max_tokens: 3000,
  };

  const resp = await fetch('https://api.openrouter.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`OpenRouter HTTP ${resp.status}: ${text}`);
  }

  const json = await resp.json().catch(() => null);
  const out = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || json?.output?.[0]?.content?.text;
  if (!out) throw new Error('Empty response from OpenRouter');
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6.  GRANULAR LOAD-BALANCED STREAM HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function buildStreamResponse(
  apiKeys: string[],
  modelList: string[],
  systemPrompt: string,
  contents: GeminiMessage[],
  corsHdrs: Record<string, string>,
): Response {
  const listHash = hashList(modelList);
  const startKeyIdx = nextKeyIndex(listHash, apiKeys.length);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const pairs: Array<[number, string]> = [];
      for (const model of modelList) {
        for (let ki = 0; ki < apiKeys.length; ki++) {
          const keyIdx = (startKeyIdx + ki) % apiKeys.length;
          pairs.push([keyIdx, model]);
        }
      }

      for (const [keyIdx, model] of pairs) {
        if (isBlacklisted(keyIdx, model)) continue;

        console.log(`[LB] Trying key[${keyIdx}] + model "${model}"`);

        try {
          const genStream = callGeminiStream(
            apiKeys[keyIdx],
            model,
            systemPrompt,
            contents,
          );

          for await (const chunk of genStream) {
            send(JSON.stringify({ chunk }));
          }

          send(JSON.stringify({ done: true }));
          controller.close();
          return;

        } catch (err) {
          console.error(`[LB] key[${keyIdx}] model "${model}" error:`, err);
          if (isRetryableError(err)) {
            blacklistPair(keyIdx, model);
          }
        }
      }

      // OpenRouter Fallback
      const openKey = Deno.env.get('OPENROUTER_KEY');
      const openModel = Deno.env.get('OPENROUTER_MODEL') || 'gpt-4o-mini';
      if (openKey) {
        try {
          const text = await callOpenRouterNonStreaming(openKey, openModel, systemPrompt, contents);
          send(JSON.stringify({ chunk: text }));
          send(JSON.stringify({ done: true }));
          controller.close();
          return;
        } catch (orErr) {
          console.error('[LB] OpenRouter fallback error:', orErr);
        }
      }

      send(JSON.stringify({ error: "All API keys and models are currently unavailable. Please try again later." }));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHdrs,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7.  NON-STREAMING
// ─────────────────────────────────────────────────────────────────────────────

async function fetchNonStreaming(
  apiKeys: string[],
  modelList: string[],
  systemPrompt: string,
  contents: GeminiMessage[],
): Promise<string> {
  const listHash = hashList(modelList);
  const startKeyIdx = nextKeyIndex(listHash, apiKeys.length);

  for (const model of modelList) {
    for (let ki = 0; ki < apiKeys.length; ki++) {
      const keyIdx = (startKeyIdx + ki) % apiKeys.length;
      if (isBlacklisted(keyIdx, model)) continue;

      try {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
          `?key=${apiKeys[keyIdx]}`;

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generation_config: { temperature: 0.7, max_output_tokens: 10_000 },
          }),
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => resp.statusText);
          throw new Error(`Gemini HTTP ${resp.status}: ${errText}`);
        }

        const json = await resp.json();
        const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;

        throw new Error("Empty response from Gemini");

      } catch (err) {
        console.error(`[LB-fetch] key[${keyIdx}] model "${model}" error:`, err);
        if (isRetryableError(err)) blacklistPair(keyIdx, model);
      }
    }
  }

  throw new Error("All API keys and models exhausted (non-streaming).");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8.  MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  const hdrs = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: hdrs });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...hdrs, "Content-Type": "application/json" },
    });
  }

  const rawKeys = Deno.env.get("GEMINI_KEYS") ?? "";
  const apiKeys = rawKeys.split(",").map((k: string) => k.trim()).filter(Boolean);
  if (apiKeys.length === 0) {
    return new Response(JSON.stringify({ error: "GEMINI_KEYS secret is not configured." }), {
      status: 500, headers: { ...hdrs, "Content-Type": "application/json" },
    });
  }

  // Body parsing and validation
  let body: {
    prompt: string;
    history?: Array<{ role: string; content: string }>;
    mode?: string;
    stream?: boolean;
    attachment?: { mimeType: string; data: string } | null;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400, headers: { ...hdrs, "Content-Type": "application/json" },
    });
  }

  const {
    prompt,
    history = [],
    mode = "TUTOR",
    stream = true,
    attachment = null,
  } = body;

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "`prompt` field is required." }), {
      status: 400, headers: { ...hdrs, "Content-Type": "application/json" },
    });
  }

  const systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS["TUTOR"];
  const modelList = resolveModelList(mode);

  const isSlideWizard =
    prompt.includes("JSON formati quyidagi ko'rinishda bo'lsin") ||
    prompt.includes("Typer Slide Wizard");

  const isFileReq =
    !isSlideWizard &&
    (prompt.toLowerCase().includes("pdf") ||
      prompt.toLowerCase().includes("fayl") ||
      prompt.toLowerCase().includes("word") ||
      prompt.toLowerCase().includes("slayd"));

  const finalPrompt = isFileReq
    ? `[SYSTEM REMINDER: SENDA FAYL YARATISH QOBILIYATI BOR. JAVOB OXIRIDA [EXPORT_FILE: filename.ext] TEGINI QO'LLASHNI UNUTMA. Masalan: [EXPORT_FILE: darslik.md] yoki [EXPORT_FILE: taqdimot.pptx]]\n${prompt}`
    : prompt;

  const sanitizedHistory: GeminiMessage[] = history
    .filter(m => m.content?.trim())
    .map(m => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const currentParts: GeminiPart[] = [{ text: finalPrompt }];
  if (attachment?.data && attachment?.mimeType) {
    currentParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
  }

  const contents: GeminiMessage[] = [
    ...sanitizedHistory,
    { role: "user", parts: currentParts },
  ];

  if (stream) {
    return buildStreamResponse(apiKeys, modelList, systemPrompt, contents, hdrs);
  }

  try {
    const text = await fetchNonStreaming(apiKeys, modelList, systemPrompt, contents);
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...hdrs, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 503,
      headers: { ...hdrs, "Content-Type": "application/json" },
    });
  }
});