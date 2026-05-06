// ============================================================
//  gemini.js — Ko'p toifali, ko'p modellik, Antigravity tizim
// ============================================================

const ENV_KEYS = import.meta.env.VITE_GEMINI_KEYS
  ? import.meta.env.VITE_GEMINI_KEYS.split(',').map(k => k.trim()).filter(Boolean)
  : [];

// ─── Har bir toifa uchun modellar ro'yxati (tartibda sinab ko'riladi) ────────
const MODELS = {
  // Oddiy savollar, salomlashish, qisqa tarjimalar
  LIGHT: [
    "gemini-2.5-flash",         // Barqaror zaxira
    "gemini-3.1-flash-lite-preview", // Eng tez va arzon
  ],

  // O'rta murakkablik: grammatika, insho, tarjima
  MEDIUM: [
    "gemini-2.5-flash",              // Asosiy ishchi ot
    "gemini-3.1-flash",
    "gemini-3.1-flash-lite-preview"  // Oxirgi chora
  ],

  // Murakkab: kod, matematik, chuqur tahlil
  HEAVY: [
    "gemini-3.1-pro",                // Birinchi navbatda eng og'ir mantiq ishlasin
    "gemini-2.5-pro",                // Kuchli barqaror zaxira
    "gemini-2.5-flash"               // Yiqilmaslik uchun oxirgi chora
  ],
};

// ─── Antigravity State ───────────────────────────────────────────────────────
// { keyIndex: { "model-name": unblockTimestamp } }
const antigravity = {};
ENV_KEYS.forEach((_, i) => {
  antigravity[i] = {};
  Object.values(MODELS).flat().forEach(m => { antigravity[i][m] = 0; });
});

// ─── Retry vaqtini xabardan olish ───────────────────────────────────────────
const parseRetryMs = (msg = "") => {
  const match = msg.match(/retry in ([\d.]+)s/i);
  return match ? (parseFloat(match[1]) + 2) * 1000 : 12000;
};

// ─── Eng yaxshi (kalit + model) juftini tanlash ─────────────────────────────
const pickBestPair = (modelList) => {
  const now = Date.now();

  // Muddati o'tgan bloklanishlarni ochish
  ENV_KEYS.forEach((_, i) => {
    modelList.forEach(m => {
      if (antigravity[i][m] && antigravity[i][m] <= now) {
        antigravity[i][m] = 0;
      }
    });
  });

  // Barcha faol juftlarni top
  const available = [];
  modelList.forEach(model => {
    ENV_KEYS.forEach((_, keyIdx) => {
      if (!antigravity[keyIdx][model] || antigravity[keyIdx][model] <= now) {
        available.push({ keyIdx, model });
      }
    });
  });

  if (available.length === 0) return null;

  // Tasodifiy tanlash (load balancing)
  return available[Math.floor(Math.random() * available.length)];
};

// ─── API chaqiruv funksiyasi ─────────────────────────────────────────────────
async function callAPI(modelList, payload, isClassifier = false) {
  const maxAttempts = ENV_KEYS.length * modelList.length;
  let totalWaits = 0; // Cheksiz sikldan himoya qilish uchun taymer hisoblagichi

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pair = pickBestPair(modelList);

    if (!pair) {
      // Agar barcha juftlar band bo'lsa va 3 marta kutgan bo'lsak, sikldan chiqamiz
      if (totalWaits > 3) break;

      // Eng yaqin ochiladigan vaqtni topish
      const earliest = Math.min(
        ...ENV_KEYS.map((_, i) =>
          Math.min(...modelList.map(m => antigravity[i][m] || Infinity))
        )
      );

      const waitMs = earliest !== Infinity ? Math.max(0, earliest - Date.now()) : 5000;
      console.log(`⏳ Barcha juftlar band. ${(waitMs / 1000).toFixed(1)}s kutilmoqda...`);
      await new Promise(r => setTimeout(r, waitMs + 500));
      totalWaits++;
      attempt--; // Kutganimiz uchun ushbu urinishni hisobga olmaymiz
      continue;
    }

    const { keyIdx, model } = pair;
    const apiKey = ENV_KEYS[keyIdx];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      const data = await response.json();
      
      if (data.error) {
        const code = data.error.code;
        const msg = data.error.message || "";
        // ... (xatolik qismi o'zgarmaydi)

        if (code === 429 || code === 403) {
          const retryMs = parseRetryMs(msg);
          antigravity[keyIdx][model] = Date.now() + retryMs;
          console.warn(`🔴 Key${keyIdx}/${model}: ${code} — ${(retryMs / 1000).toFixed(0)}s blok`);
          continue;
        }

        if (code === 404) {
          // Model eskirgan yoki o'chirilgan bo'lsa — 24 soatlik doimiy blok
          antigravity[keyIdx][model] = Date.now() + 24 * 60 * 60 * 1000;
          console.warn(`⚠️ Model topilmadi yoki yopilgan: ${model}`);
          continue;
        }

        if (code === 400) {
          console.error(`❌ 400 xato:`, msg);
          return isClassifier ? "MEDIUM" : "So'rovda xatolik yuz berdi. Qaytadan urinib ko'ring.";
        }

        console.warn(`⚠️ Key${keyIdx}/${model}: ${code}`);
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`✅ Key${keyIdx}/${model} — muvaffaqiyat`);
        return isClassifier ? text : fixDuplicatedNumbers(text);
      }

      return isClassifier ? "MEDIUM" : "Kechirasiz, javob olinmadi.";

    } catch (err) {
      const isTimeout = err.name === 'TimeoutError';
      console.warn(`${isTimeout ? '⏱️' : '🌐'} Key${keyIdx}/${model}: ${err.message}`);
      // Tarmoq uzilishi yoki timeout bo'lsa, ushbu juftlikni 8 soniyaga muzlatamiz
      antigravity[keyIdx][model] = Date.now() + 8000;
      continue;
    }
  }

  return isClassifier
    ? "MEDIUM"
    : "Hozirda barcha tizimlar band. 15-30 soniyadan so'ng qaytadan urinib ko'ring.";
}

// ─── Raqam ikkilanishini va takrorlanishini tuzatuvchi postprocessor ────────
function fixDuplicatedNumbers(text) {
  if (!text) return text;
  let result = text;

  // 1) Uzun iboralarning takrorlanishi (masalan: "40 + 50 = 90 40 + 50 = 90")
  // [\s\n]* qo'shildi, chunki takrorlanishlar orasida bo'shliq bo'lishi mumkin
  result = result.replace(/(.{6,})[\s\n]*\1/g, '$1');

  // 2) Yopishib ketgan raqamli takrorlanishlar (masalan: "10100" -> "10" va "100")
  // Agar son o'zining bir qismi bilan boshlansa va bu mantiqsiz bo'lsa
  result = result.replace(/\b(\d{2,})\1\b/g, '$1');

  // 3) Maxsus matematik takrorlanish: "10 + 20 = 3010 + 20 = 30"
  result = result.replace(/([\d\s+\-×÷*/=]{4,})\1/g, '$1');

  // 4) "00" -> "0"
  result = result.replace(/\b0{2,}\b/g, '0');

  return result;
}

// ─── 1. Aqlli Klassifikator ──────────────────────────────────────────────────
async function classifyPrompt(userPrompt) {
  const classifierPayload = {
    contents: [{
      role: "user",
      parts: [{
        text: `Foydalanuvchi so'rovini tahlil qil va FAQAT bitta so'z qaytar: LIGHT, MEDIUM yoki HEAVY.

LIGHT  = Salomlashish, qisqa savollar, 1-2 so'zli tarjima
MEDIUM = Grammatika, insho, o'rta uzunlikdagi tarjima, til o'rganish
HEAVY  = Murakkab kod, matematik integral/differensial, chuqur ilmiy tahlil

So'rov: "${userPrompt}"

Natija:` }]
    }]
  };

  const result = await callAPI(MODELS.LIGHT, classifierPayload, true);
  const cat = result.trim().toUpperCase().replace(/[^A-Z]/g, '');
  return ['LIGHT', 'MEDIUM', 'HEAVY'].includes(cat) ? cat : 'MEDIUM';
}

// ─── Asosiy eksport funksiyasi ───────────────────────────────────────────────
export async function fetchGeminiResponse(prompt, chatHistory = [], customSystem = null) {
  if (!ENV_KEYS.length) {
    console.error("VITE_GEMINI_KEYS topilmadi!");
    return "API kalit topilmadi. .env faylini tekshiring.";
  }

  // 1. Klassifikatsiya
  const category = await classifyPrompt(prompt);
  const modelList = MODELS[category];
  console.log(`[Router] ${category} → [${modelList.join(', ')}]`);

  // 2. Tarix formatlash
  const formattedHistory = [];
  for (const msg of chatHistory) {
    const role = msg.role === 'ai' ? 'model' : 'user';
    const last = formattedHistory[formattedHistory.length - 1];
    if (last?.role === role) {
      last.parts[0].text += "\n" + msg.content;
    } else {
      formattedHistory.push({ role, parts: [{ text: msg.content }] });
    }
  }

  // Tarix zanjiri to'g'ri yakunlanishini ta'minlash (API xatolik bermasligi uchun)
  while (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
    formattedHistory.pop();
  }

  // 3. System prompt — ABSOLUTELY MINIMAL (Hujumkor soddalik)
  const system = customSystem || `Siz professional akademik repetitorsiz.
Faqat aniq, qisqa va professional javob bering.
Takrorlashlar va raqam ikkilanishi qat'iyan man etiladi.
Hech qachon LaTeX ishlatmang.`;

  // 4. Payload
  const payload = {
    system_instruction: { parts: [{ text: system }] },
    contents: [
      ...formattedHistory,
      { role: "user", parts: [{ text: prompt }] }
    ],
    generationConfig: {
      temperature: 0,
      topP: 1,
      topK: 1,
      candidateCount: 1,
      maxOutputTokens: 1024,
    }
  };

  // 5. Javob olish
  return await callAPI(modelList, payload);
}

// ─── Debug uchun ─────────────────────────────────────────────────────────────
export const getAntigravityStats = () => {
  const now = Date.now();
  return ENV_KEYS.map((_, i) => ({
    key: i,
    models: Object.fromEntries(
      Object.entries(antigravity[i]).map(([m, t]) => [
        m, t > now ? `🔴 ${Math.ceil((t - now) / 1000)}s` : '🟢 faol'
      ])
    )
  }));
};