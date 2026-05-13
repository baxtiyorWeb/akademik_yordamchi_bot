// ============================================================
//  gemini.js — Ko'p toifali, ko'p modellik, Antigravity tizim
// ============================================================

const ENV_KEYS = import.meta.env.VITE_GEMINI_KEYS
  ? import.meta.env.VITE_GEMINI_KEYS.split(',').map(k => k.trim()).filter(Boolean)
  : [];

const MODELS = {
  LIGHT: ["gemini-2.5-flash", "gemini-3.1-flash-lite-preview"],
  MEDIUM: ["gemini-2.5-flash", "gemini-3.1-flash", "gemini-3.1-flash-lite-preview"],
  HEAVY: ["gemini-3.1-pro", "gemini-2.5-pro", "gemini-2.5-flash"],
};

const SYSTEM_PROMPTS = {
  TUTOR: `Sen 'LingoAI Academic Expert' san. 
  MUHIM: SENDA FAYLLARNI (PDF, DOCX, PPTX) TO'G'RIDAN-TO'G'RI YARATISH QOBILIYATI BOR!
  Hech qachon "fayl yarata olmayman" dema. Sening vazifang - javobing oxirida maxsus [EXPORT_FILE: TYPE | TITLE | CONTENT] tegini qoldirish.
  
  MATEMATIKA VA FORMULALAR:
  1. Agar foydalanuvchi rasm tashlasa va unda formula bo'lsa, uni LaTeX formatida ($...$ yoki $$...$$) aniq ko'chirib ber.
  2. Murakkab formulalarni tushuntirishda har doim LaTeX ishlating.
  3. Foydalanuvchiga formulalarni Wordga o'tkazish uchun maxsus "Word" tugmasi borligini eslatishing mumkin (agar kerak bo'lsa).
  
  QOIDALAR:
  1. Foydalanuvchi "pdf qil", "wordga o'tkaz" desa, mavzu va sarlavhani aniqlashtir.
  2. To'liq matn tayyor bo'lgach, javob oxirida tegni qoldir.
  3. Texnik cheklovlar haqida gapirma. LaTeX ($...$) ishlat.
  4. Har doim professional va do'stona bo'l.`,

  KIDS: `Sen bolalar uchun quvnoq AI yordamchisan! 
  - Emojilardan ko'p foydalan 😊🚀🌟
  - Soddalashtirib tushuntir.
  - Har doim maqtashni va savol so'rashni unutma.`,

  CODER: `Sen 'Vibe Coding Agent' san. 
  - Avtonom ishla. 
  - Kodni bitta yaxlit HTML faylda ber.`
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
      // Soddalik uchun biz bu yerda multipart/related o'rniga oddiyroq uploadni qilamiz
      // Lekin Gemini Files API odatda metadata va file chunklarini so'raydi.
      // REST API orqali upload biroz murakkabroq. 
      // Keling, inline_data limitini tekshiramiz. Agar fayl < 20MB bo'lsa inline_data ishlatamiz.
      // Aks holda Files API.
    });
    // ...
  } catch (e) {}
}

/**
 * Streaming orqali ma'lumot olish (Multimodal qo'llab-quvvatlash bilan)
 */
export async function streamGeminiResponse(prompt, history = [], attachment = null, mode = 'TUTOR', onChunk) {
  const modelList = mode === 'CODER' ? MODELS.HEAVY : MODELS.MEDIUM;
  const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.TUTOR;
  
  const isFileReq = prompt.toLowerCase().includes('pdf') || prompt.toLowerCase().includes('fayl') || prompt.toLowerCase().includes('word') || prompt.toLowerCase().includes('slayd');
  const finalPrompt = isFileReq 
    ? `[SYSTEM REMINDER: SENDA FAYL YARATISH QOBILIYATI BOR. JAVOB OXIRIDA [EXPORT_FILE: ...] TEGINI QO'LLASHNI UNUTMA!]\n${prompt}` 
    : prompt;

  const currentParts = [{ text: finalPrompt }];
  
  if (attachment) {
    const b64Data = await fileToBase64(attachment);
    const mimeType = attachment.type;
    const data = b64Data.split(',')[1];
    
    currentParts.push({
      inline_data: {
        mime_type: mimeType,
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

  const payload = {
    system_instruction: { parts: [{ text: system }] },
    contents: [...sanitizedHistory, { role: "user", parts: currentParts }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 10000 }
  };

  const model = modelList[0];

  // Kalitlarni aylantirish (Rotation)
  for (const apiKey of ENV_KEYS) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        console.warn(`API key ${apiKey.substring(0, 5)}... quota exceeded, trying next...`);
        continue; // Keyingi kalitga o'tish
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));
              const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textChunk) {
                fullText += textChunk;
                onChunk(fullText);
              }
            } catch (e) { }
          }
        }
      }
      return fullText; // Muvaffaqiyatli yakunlandi
    } catch (err) {
      console.error(`Error with key ${apiKey.substring(0, 5)}...:`, err);
      if (apiKey === ENV_KEYS[ENV_KEYS.length - 1]) {
        // Oxirgi kalit ham xato bersa, xatolikni qaytaramiz
        throw err;
      }
    }
  }
}

export async function fetchGeminiResponse(prompt, history = [], attachment = null, mode = 'TUTOR') {
  const modelList = mode === 'CODER' ? MODELS.HEAVY : MODELS.MEDIUM;
  const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.TUTOR;

  const isFileReq = prompt.toLowerCase().includes('pdf') || prompt.toLowerCase().includes('fayl') || prompt.toLowerCase().includes('word') || prompt.toLowerCase().includes('slayd');
  const finalPrompt = isFileReq 
    ? `[SYSTEM REMINDER: SENDA FAYL YARATISH QOBILIYATI BOR. JAVOB OXIRIDA [EXPORT_FILE: ...] TEGINI QO'LLASHNI UNUTMA!]\n${prompt}` 
    : prompt;

  const currentParts = [{ text: finalPrompt }];
  
  if (attachment) {
    const b64Data = await fileToBase64(attachment);
    const mimeType = attachment.type;
    const data = b64Data.split(',')[1];
    
    currentParts.push({
      inline_data: {
        mime_type: mimeType,
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

  const payload = {
    system_instruction: { parts: [{ text: system }] },
    contents: [...sanitizedHistory, { role: "user", parts: currentParts }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 10000 }
  };

  for (const model of modelList) {
    for (const apiKey of ENV_KEYS) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (data.candidates) return data.candidates[0].content.parts[0].text;
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