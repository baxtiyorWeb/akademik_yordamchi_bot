// ============================================================
//  openrouter.js — OpenRouter API ulanish interfeysi
// ============================================================

const OPENROUTER_KEY = (import.meta.env.VITE_OPENROUTER_KEY || "").trim();
const SITE_URL = window.location.origin;
const SITE_NAME = "LingoAI Academic Expert";

if (OPENROUTER_KEY) {
  console.log("OpenRouter Key loaded:", OPENROUTER_KEY.substring(0, 10) + "...");
}

const MODELS = {
  GENERAL: "google/gemini-2.0-flash-lite-preview-02-05:free",
  THINKING: "deepseek/deepseek-r1:free",
  MATH: "nvidia/nemotron-3-super-120b-a12b:free",
  NVIDIA: "nvidia/nemotron-3-super-120b-a12b:free",
  DOCS: "google/gemini-2.0-flash-lite-preview-02-05:free",
  FREE_ROUTER: "openrouter/free",
};



const SYSTEM_PROMPTS = {
  TUTOR: `Sen 'LingoAI Academic Expert' va professional tutor ro'lidasan. Maqsading: foydalanuvchiga dars berish, kundalik vazifalar berish va 0-5 ballik baholashni amalga oshirish. Har javob pedagogik formatda bo'lsin va oxirida foydalanuvchiga bir uy vazifasi bering.

PRIORITET QOIDALARI:
- Har javob oxirida aniq ":::task" formatida uy vazifasi berilsin va maksimal baho 5 ball ekani ko'rsatilsin.
- Kunlik baholash: agar foydalanuvchi so'rasa yoki kontekst talab qilsa, qayta 0-5 baho va qisqacha izoh bering.
- Foydalanuvchidan kun davomida sarflagan o'qish vaqtini so'rab, "daily study time" sifatida qayd etishni taklif qiling.

MATEMATIKA VA FORMULALAR:
1. Agar rasmda formula bo'lsa, LaTeX formatida taqdim et.
2. Murakkab formulalarni tushuntirishda LaTeX ishlating.

Fayl eksporti kerak bo'lsa, oxirida "[EXPORT_FILE: TYPE | TITLE | CONTENT]" tegini qoldiring.`,

  KIDS: `Sen bolalar uchun quvnoq AI yordamchisan! 
  - Emojilardan ko'p foydalan 😊🚀🌟
  - Soddalashtirib tushuntir.`,

};

/**
 * OpenRouter orqali Streaming javob olish
 */
export async function streamOpenRouterResponse(prompt, history = [], attachment = null, mode = 'TUTOR', onChunk) {
  if (!OPENROUTER_KEY) {
    throw new Error("OpenRouter API kaliti topilmadi (VITE_OPENROUTER_KEY)");
  }

  // Modellarni mode va kontentga qarab tanlash (Zero Budget Strategy)
  let model = MODELS.GENERAL;
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('masala') || lowerPrompt.includes('matem') || lowerPrompt.includes('formula')) {
    model = MODELS.MATH; // Nemotron 3 Super
  } else if (lowerPrompt.includes('tahlil') || lowerPrompt.includes('chuqur') || mode === 'THINKING') {
    model = MODELS.THINKING; // Ring-2.6-1T
  } else if (lowerPrompt.includes('doc') || lowerPrompt.includes('word') || lowerPrompt.includes('excel')) {
    model = MODELS.DOCS; // MiniMax M2.5
  }

  const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.TUTOR;

  const messages = [
    { role: "system", content: system },
    ...history.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    })),
    { role: "user", content: prompt }
  ];

  // Agar rasm bo'lsa, OpenRouter (OpenAI format) multimodal formatini qo'llaymiz
  if (attachment) {
    const b64Data = await fileToBase64(attachment);
    messages[messages.length - 1].content = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: {
          url: b64Data
        }
      }
    ];
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || "OpenRouter ulanishda xatolik";
      console.error("OpenRouter API Error:", errorData);

      if (response.status === 401) {
        throw new Error("OpenRouter API kaliti noto'g'ri (401: Unauthorized). Kalitni .env faylda tekshiring.");
      }
      throw new Error(msg);
    }

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
          const dataStr = line.substring(6).trim();
          if (dataStr === "[DONE]") break;

          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(fullText);
            }
          } catch (e) {
            // Ba'zan chala JSON kelishi mumkin
          }
        }
      }
    }
    return fullText;
  } catch (error) {
    console.error("OpenRouter Stream Error:", error);
    throw error;
  }
}

/**
 * Standard fetch (Stream-siz)
 */
export async function fetchOpenRouterResponse(prompt, history = [], attachment = null, mode = 'TUTOR') {
  if (!OPENROUTER_KEY) throw new Error("VITE_OPENROUTER_KEY topilmadi");

  let model = MODELS.GENERAL;
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('masala') || lowerPrompt.includes('matem')) {
    model = MODELS.MATH;
  }

  const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.TUTOR;

  const messages = [
    { role: "system", content: system },
    ...history.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    })),
    { role: "user", content: prompt }
  ];

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages
      })
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 401) throw new Error("OpenRouter API kaliti noto'g'ri (401)");
      throw new Error(errorData.error?.message || "OpenRouter ulanishda xatolik");
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content;
  } catch (err) {
    console.error("OpenRouter Fetch Error:", err);
    throw err;
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
