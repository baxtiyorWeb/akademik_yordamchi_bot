import { GoogleGenAI } from "@google/genai";

// ============================================================
//  gemini.js — Ko'p toifali, ko'p modellik, Antigravity tizim
// ============================================================

const ENV_KEYS = import.meta.env.VITE_GEMINI_KEYS
  ? import.meta.env.VITE_GEMINI_KEYS.split(',').map(k => k.trim()).filter(Boolean)
  : [];

const MODELS = {
  LIGHT: ["gemini-3.1-flash-lite", "gemini-3.1-flash-lite"],
  MEDIUM: ["gemini-3.5-flash", "gemini-3.1-flash", "gemini-3.1-flash-lite"],
  HEAVY: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
};


const SYSTEM_PROMPTS = {
  TUTOR: `Sen "Typer AI Professional Education Tutor" san. Maqsading: foydalanuvchini o'qitish, kundalik topshiriqlar berish, va baholash tizimida kuzatish. Har bir javobni o'qituvchi uslubida taqdim et: qisqacha kirish, asosiy ta'lim qoidalari, misol/amaliy mashq, va yakuniy vazifa (homework) bo'limi.

QOIDALAR (Muhim):
- Har javob oxirida foydalanuvchiga bir vazifa (homework) bering.
- Har kun uchun AI 0-5 shkala bo'yicha talabani baholasin va qisqacha izoh bersin (5 mukammal, 0 - yetarli emas).
- Har kun oxirida yoki foydalanuvchi so'raganda, foydalanuvchidan bugungi o'qish daqiqalari/vaqtini so'rab, "[daily study time]" sifatida qayd etilsin.
- turli xil [ul, ol, li]  formatlaridan foydalanib, ma'lumotlarni chiroyli va tushunarli tarzda taqdim etsin.
- Javoblar aniq, pedagojik va bosqichma-bosqich bo'lsin. Kamida bitta amaliy misol va bitta uy vazifasi bo'lsin.
- "#Mavzu: Mavzu Nomi" - qisqacha kirish.
- ":::step Asosiy Qoidalar va Tushunchalar" - mavzuning nazariy qismi. MUHIM: Ma'lumotlarni tasniflash va tushuntirish uchun albatta Markdown JADVALLAR (table) va ro'yxatlardan (bullet lists) foydalan! Ta'lim yo'nalishidagi ilg'or platformaga xos tarzda boy, tushunarli va vizual chiroyli kontent yarat.
- ":::step Amaliy Misol yoki Masala yechimi" - batafsil tushuntirish, kod, yoki matematika bo'lsa ':::solution' bilan ajratish.
- ":::note Xulosa va Qiziqarli Savol" - asosiy fikrni xulosalovchi qism. Eng oxirida foydalanuvchini o'ylantiradigan qiziqarli analitik savol yoki amaliy topshiriq bilan yakunla.


FORMAT:
1) "## Mavzu: ..." — kirish.
2) ":::step Nazariya" — kalit tushunchalar.
3) ":::step Amaliy Misol" — qadam-baqadam misol.
4) ":::task Uy vazifasi" — vazifa tavsifi va baholash parametrlari (max 5 ball).
5) ":::rating Today Rating: X/5" — agar baholash talab qilinsa, qisqacha izoh bilan keltirsin.

DIQQAT: Doimo pedagogik uslubda yoz. Foydalanuvchiga aniq nazoratli topshiriq bering va qanday baholanayotgani haqida qisqacha mezon ko'rsating`,

  KIDS: `Sen bolalar uchun quvnoq AI yordamchisan! 
  - Emojilardan ko'p foydalan 😊🚀🌟
  - Soddalashtirib tushuntir.
  - Har doim maqtashни va savol so'rashни unutма.`,

};
const antigravity = {};
ENV_KEYS.forEach((_, i) => {
  antigravity[i] = {};
  Object.values(MODELS).flat().forEach(m => { antigravity[i][m] = 0; });
});

/**
 * Gemini Files API orqali faylni yuklash
 */
export async function uploadToGemini(file) {
  const apiKey = ENV_KEYS[0];
  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'multipart',
        'Content-Type': file.type,
      },
    });
    // ...
  } catch (e) { }
}

/**
 * Streaming orqali ma'lumot olish (Multimodal qo'llab-quvvatlash bilan) - SDK orqali
 */
export async function streamGeminiResponse(prompt, history = [], attachment = null, mode = 'TUTOR', onChunk) {
  const modelList = mode === 'CODER' ? MODELS.HEAVY : MODELS.MEDIUM;
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
            temperature: 0.7,
            maxOutputTokens: 10000,
          }
        });

        let fullText = "";
        for await (const chunk of responseStream) {
          if (chunk.text) {
            fullText += chunk.text;
            onChunk(fullText);
          }
        }
        return fullText; // Muvaffaqiyatli yakunlandi
      } catch (err) {
        console.error(`Error with model ${model} and key ${apiKey.substring(0, 5)}...:`, err);
        // Agar bu oxirgi model va oxirgi kalit bo'lsa, xatoni otamiz
        if (model === modelList[modelList.length - 1] && apiKey === ENV_KEYS[ENV_KEYS.length - 1]) {
          throw err;
        }
      }
    }
  }
}

export async function fetchGeminiResponse(prompt, history = [], attachment = null, mode = 'TUTOR') {
  const modelList = mode === 'CODER' ? MODELS.HEAVY : MODELS.MEDIUM;
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
      } catch (err) { continue; }
    }
  }
}

function fileToBase64(file) {
  return new Promise((r, j) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => r(reader.result);
    reader.onerror = e => j(e);
  });
}

export const getAntigravityStats = () => ({ status: "Online" });

// ==============================================================
// NOTEBOOK LM FUNCTIONS (with Key Rotation & Model Fallback)
// ==============================================================

export async function generateNotebookQuiz(documentContent) {
  if (ENV_KEYS.length === 0) throw new Error("API kaliti topilmadi");

  const modelList = ["gemini-3.5-flash", "gemini-3.1-flash", "gemini-3.1-flash-lite"];
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

  for (const model of modelList) {
    for (const apiKey of ENV_KEYS) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });

        let text = response.text;
        if (text) {
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(text);
        }
      } catch (e) {
        console.warn(`Quiz generation failed with model ${model} and key ${apiKey.substring(0, 5)}...:`, e);
      }
    }
  }
  throw new Error("Barcha API kalitlar va modellar yuklamani to'liq tugatdi (Quota Exceeded)");
}

export async function generateNotebookCheatSheet(documentContent) {
  if (ENV_KEYS.length === 0) throw new Error("API kaliti topilmadi");

  const modelList = ["gemini-3.5-flash", "gemini-3.1-flash", "gemini-3.1-flash-lite"];
  const prompt = `Quyidagi ma'lumotlarning eng asosiy qoidalarini, formulalarini, atamalarini ajratib, 1 sahifalik juda qisqa "shporgalka" (Cheat Sheet / Konspekt) yarating. 
Ortiqcha izohlarsiz faqat eng muhimlarini qoldiring. Markdown (jadvallar, bullet list, qalin yozuvlar) orqali juda chiroyli formatlang.

Ma'lumot:
${documentContent}`;

  for (const model of modelList) {
    for (const apiKey of ENV_KEYS) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });

        if (response.text) return response.text;
      } catch (e) {
        console.warn(`Cheat sheet generation failed with model ${model} and key ${apiKey.substring(0, 5)}...:`, e);
      }
    }
  }
  throw new Error("Barcha API kalitlar va modellar yuklamani to'liq tugatdi (Quota Exceeded)");
}