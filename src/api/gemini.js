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
  TUTOR: `Sen 'LingoAI Academic Expert' - kuchli akademik yordamchi va tilshunos san. 
Muloqot uslubing: Do'stona, tushunarli va professional. 
Vazifang: 
- Savollarga akademik nuqtai nazardan javob berish.
- Til o'rganishda yordam berish (grammatika, tarjima, tahlil).
- Murakkab mavzularni (matematika, fizika va h.k.) sodda tilda tushuntirish.
- LaTeX va Mermaid diagrammalaridan foydalanish.
Muhim: Kod yozishda faqat tushuntirish ber va misollar ko'rsat, lekin avtonom muhandislik qilma.`,

  CODER: `Sen 'Vibe Coding Agent' - 2026-yilning eng ilg'or avtonom muhandisi san.
Vazifang: Foydalanuvchiga hech qanday ko'rsatma bermasdan, ishni to'liq va avtonom bajarib berish.
Qoidalar:
- 'Faylni saqlang', 'Brauzerni oching' kabi gaplarni aytish qat'iyan taqiqlanadi!
- HTML, CSS va JS kodlarini har doim bitta yaxlit HTML fayl ichida ber.
- Har doim [PHASE: ARCHITECTURE], [PHASE: DEVELOPMENT], [PHASE: QUALITY AUDIT], [PHASE: FINAL RELEASE] bosqichlariga amal qil.
- [SYSTEM: AUTO-FIX REQUEST] kelsa, faqat tuzatilgan yaxlit kodni qaytar.`
};

const antigravity = {};
ENV_KEYS.forEach((_, i) => {
  antigravity[i] = {};
  Object.values(MODELS).flat().forEach(m => { antigravity[i][m] = 0; });
});

/**
 * Streaming orqali ma'lumot olish
 */
export async function streamGeminiResponse(prompt, history = [], attachment = null, mode = 'TUTOR', onChunk) {
  const modelList = mode === 'CODER' ? MODELS.HEAVY : MODELS.MEDIUM;
  const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.TUTOR;
  const apiKey = ENV_KEYS[0]; // Soddalik uchun birinchi kalitni olamiz
  const model = modelList[0];

  const currentParts = [{ text: prompt }];
  if (attachment) {
    if (attachment.type.startsWith('image/')) {
      const b64 = await fileToBase64(attachment);
      currentParts.push({ inline_data: { mime_type: attachment.type, data: b64.split(',')[1] } });
    }
  }

  const sanitizedHistory = history.map(m => ({
    role: m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.content || '' }]
  }));

  const payload = {
    system_instruction: { parts: [{ text: system }] },
    contents: [...sanitizedHistory, { role: "user", parts: currentParts }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 10000 }
  };

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.substring(6));
            const textChunk = data.candidates[0].content.parts[0].text;
            if (textChunk) {
              fullText += textChunk;
              onChunk(fullText);
            }
          } catch (e) {
            // JSON qismlarga bo'linib qolgan bo'lishi mumkin
          }
        }
      }
    }
    return fullText;
  } catch (err) {
    console.error("Streaming error:", err);
    // Xatolik bo'lsa oddiy usulga qaytish
    return fetchGeminiResponse(prompt, history, attachment, mode);
  }
}

export async function fetchGeminiResponse(prompt, history = [], attachment = null, mode = 'TUTOR') {
  const modelList = mode === 'CODER' ? MODELS.HEAVY : MODELS.MEDIUM;
  const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.TUTOR;

  const currentParts = [{ text: prompt }];
  if (attachment && attachment.type.startsWith('image/')) {
    const b64 = await fileToBase64(attachment);
    currentParts.push({ inline_data: { mime_type: attachment.type, data: b64.split(',')[1] } });
  }

  const sanitizedHistory = history.map(m => ({
    role: m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.content || '' }]
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