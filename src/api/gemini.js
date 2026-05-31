import { GoogleGenAI } from "@google/genai";

// ============================================================
//  gemini.js — Ko'p toifali, ko'p modellik, Antigravity tizim
// ============================================================

const ENV_KEYS = import.meta.env.VITE_GEMINI_KEYS
  ? import.meta.env.VITE_GEMINI_KEYS.split(',').map(k => k.trim()).filter(Boolean)
  : [];

const MODELS = {
  LIGHT: ["gemini-3.1-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-8b", "gemini-2.5-flash"],
  MEDIUM: ["gemini-3.5-flash", "gemini-3.1-flash", "gemini-3.1-flash-lite"],
  HEAVY: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
};
const SYSTEM_PROMPTS = {
  TUTOR: `Sen "Ovvox Ai Professional Education Tutor" san. Maqsading: foydalanuvchini individual mentorlik asosida o'qitish, murakkab mavzularni sodda qilish va ularni chuqurroq tushuntirishga yordam berish. Har bir javob professional, motivatsion, tushunarli va qiziqarli bo'lishi shart.

QOIDALAR:
- Ta'lim Mazmuni: Foydalanuvchining o'zlashtirish darajasiga moslash. Sodda analogiyalar va hayotiy misollardan foydalan. Sokrat uslubida yo'naltiruvchi savollar orqali xatosini o'zi topishiga yordam ber.
- Vizualizatsiya va Kontent: Markdown JADVALLAR, bullet points, numbered lists, bold/italic matndan MAKSIMAL darajada foydalan. Matn zerikarli bo'lmasligi uchun strukturani yanada vizual qil.
- Baholash: Juda zarur bo'lsa, 0-5 shkala bo'yicha bahola ber lekin FAQAT jadval shaklida, qisqa izohlari bilan.
- Ketma-ketlik: Javoblar bosqichma-bosqich bo'lsin. Kamida bitta misol va uy vazifasi bo'lishi majburiydir.
- O'quv Rejasi: Haftalik va oylik rejani ta'klif et. Ishonchli manbalarni (kitob, kurs, video) tavsiya qil.
- Mavzu Doirasi: Foydalanuvchi chalg'igan holatda uni mavzu doirasiga qaytarish. Birinchi yangi mavzuga o'tishdan oldin reja qabul qilish.
- Emojis va Renglar: Matn ichida emojilar ishlat 📚🎯💡⭐🚀 darsni zerikarli bo'lmasligi uchun. Har doim javob oxirida motivatsion xabar.

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
✓ 3-5 ta eng muhim ta'sirchan tavsiya va Band 9.0 model answer`
};
const antigravity = {};

ENV_KEYS.forEach((_, i) => {
  antigravity[i] = {};
  Object.values(MODELS).flat().forEach(m => {
    antigravity[i][m] = 0;
  });
});

/**
 * Faylni Base64 ga aylantirish
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

/**
 * Gemini Files API orqali fayl yuklash (hozircha kerak bo'lsa ishlatiladi)
 */
export async function uploadToGemini(file) {
  const apiKey = ENV_KEYS[0];
  if (!apiKey) throw new Error("API kaliti topilmadi");

  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error("Fayl yuklashda xatolik");
    return await response.json();
  } catch (e) {
    console.error("Upload error:", e);
    throw e;
  }
}

/**
 * Streaming javob (real-time)
 */
export async function streamGeminiResponse(prompt, history = [], attachment = null, mode = 'TUTOR', onChunk, onDone) {
  if (ENV_KEYS.length === 0) throw new Error("Gemini API kaliti topilmadi");

  const ieltsMode = ['IELTS_SPEAKING', 'IELTS_LISTENING', 'IELTS_READING', 'IELTS_WRITING'].includes(mode);
  const modelList = (mode === 'CODER' || ieltsMode) ? MODELS.HEAVY : MODELS.MEDIUM;
  const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.TUTOR;

  const isSlideWizard = prompt.includes('JSON formati quyidagi ko\'rinishda bo\'lsin') || prompt.includes('Typer Slide Wizard');
  const isFileReq = !isSlideWizard && (prompt.toLowerCase().includes('pdf') || prompt.toLowerCase().includes('fayl') || prompt.toLowerCase().includes('word') || prompt.toLowerCase().includes('slayd'));

  const finalPrompt = isFileReq
    ? `[SYSTEM REMINDER: SENDA FAYL YARATISH QOBILIYATI BOR. JAVOB OXIRIDA [EXPORT_FILE: filename.ext] TEGINI QO'LLASHNI UNUTMA. Masalan: [EXPORT_FILE: darslik.md] yoki [EXPORT_FILE: taqdimot.pptx]]\n${prompt}`
    : prompt;

  const currentParts = [{ text: finalPrompt }];

  if (attachment) {
    const b64Data = await fileToBase64(attachment);
    const mimeType = attachment.type;
    const data = b64Data.split(',')[1];

    currentParts.push({
      inlineData: {
        mimeType: mimeType,
        data: data
      }
    });
  }

  const sanitizedHistory = history
    .filter(m => m.content && m.content.trim() !== "")
    .map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const contents = [...sanitizedHistory, { role: "user", parts: currentParts }];

  for (const model of modelList) {
    for (const apiKey of ENV_KEYS) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const responseStream = await ai.models.generateContentStream({
          model: model,
          contents: contents,
          config: {
            systemInstruction: system,
            temperature: 0.8,
            maxOutputTokens: 30000,
          }
        });

        let fullText = "";
        // Use explicit iterator so we can implement a stall timeout watchdog
        const iterator = responseStream[Symbol.asyncIterator] ? responseStream[Symbol.asyncIterator]() : null;
        if (!iterator) {
          throw new Error('Stream is not iterable');
        }

        const STALL_TIMEOUT = 20000; // ms without new chunk => consider stream stalled

        while (true) {
          try {
            const nextPromise = iterator.next();
            const res = await Promise.race([
              nextPromise,
              new Promise(resolve => setTimeout(() => resolve({ __timeout: true }), STALL_TIMEOUT))
            ]);

            if (res && res.__timeout) {
              console.warn('Gemini stream stall detected — closing iterator');
              try { await iterator.return?.(); } catch (e) { /* ignore */ }
              break;
            }

            const { value, done } = res;
            if (done) break;
            const chunk = value;
            if (chunk && chunk.text) {
              fullText += chunk.text;
              try { onChunk?.(fullText); } catch (e) { /* ignore handler errors */ }
            }
          } catch (iterErr) {
            console.error('Iterator error on stream:', iterErr);
            try { await iterator.return?.(); } catch (_) { }
            break;
          }
        }

        try { onDone?.(fullText); } catch (e) { /* ignore */ }
        return fullText;
      } catch (err) {
        console.error(`Error with model ${model} and key ${apiKey.substring(0, 5)}...:`, err);
        if (model === modelList[modelList.length - 1] && apiKey === ENV_KEYS[ENV_KEYS.length - 1]) {
          throw err;
        }
      }
    }
  }
}

/**
 * Oddiy (non-stream) javob
 */
export async function fetchGeminiResponse(prompt, history = [], attachment = null, mode = 'TUTOR') {
  if (ENV_KEYS.length === 0) throw new Error("Gemini API kaliti topilmadi");

  const ieltsMode = ['IELTS_SPEAKING', 'IELTS_LISTENING', 'IELTS_READING', 'IELTS_WRITING'].includes(mode);
  const modelList = (mode === 'CODER' || ieltsMode) ? MODELS.HEAVY : MODELS.MEDIUM;
  const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.TUTOR;

  const currentParts = [{ text: prompt }];

  if (attachment) {
    const b64Data = await fileToBase64(attachment);
    const mimeType = attachment.type;
    const data = b64Data.split(',')[1];

    currentParts.push({
      inlineData: {
        mimeType: mimeType,
        data: data
      }
    });
  }

  const sanitizedHistory = history
    .filter(m => m.content && m.content.trim() !== "")
    .map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const contents = [...sanitizedHistory, { role: "user", parts: currentParts }];

  for (const model of modelList) {
    for (const apiKey of ENV_KEYS) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
          model: model,
          contents: contents,
          config: {
            systemInstruction: system,
            temperature: 0.7,
            maxOutputTokens: 10000,
          }
        });

        if (response.text) return response.text;
      } catch (err) {
        console.warn(`Model ${model} bilan xatolik:`, err.message);
        continue;
      }
    }
  }

  throw new Error("Barcha API kalitlar va modellar ishlamayapti.");
}

// ==============================================================
// NOTEBOOK LM FUNCTIONS
// ==============================================================

export async function generateNotebookQuiz(documentContent) {
  if (ENV_KEYS.length === 0) throw new Error("API kaliti topilmadi");

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

  const response = await fetchGeminiResponse(prompt, [], null, 'TUTOR');

  try {
    let text = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Quiz JSON parse error", e);
    throw new Error("Test yaratishda xatolik");
  }
}

export async function generateNotebookCheatSheet(documentContent) {
  if (ENV_KEYS.length === 0) throw new Error("API kaliti topilmadi");

  const prompt = `Quyidagi ma'lumotlarning eng asosiy qoidalarini, formulalarini, atamalarini ajratib, 1 sahifalik juda qisqa "shporgalka" (Cheat Sheet / Konspekt) yarating.
Ortiqcha izohlarsiz faqat eng muhimlarini qoldiring. Markdown (jadvallar, bullet list, qalin yozuvlar) orqali juda chiroyli formatlang.

Ma'lumot:
${documentContent}`;

  return await fetchGeminiResponse(prompt, [], null, 'TUTOR');
}

export const getAntigravityStats = () => ({
  status: "Online",
  keysCount: ENV_KEYS.length
});

export default {
  streamGeminiResponse,
  fetchGeminiResponse,
  generateNotebookQuiz,
  generateNotebookCheatSheet,
  uploadToGemini,
  getAntigravityStats
};