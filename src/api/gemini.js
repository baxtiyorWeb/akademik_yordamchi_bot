// Env fayldan kalitlarni olish
const ENV_KEYS = import.meta.env.VITE_GEMINI_KEYS ? import.meta.env.VITE_GEMINI_KEYS.split(',') : [];

const API_KEYS = ENV_KEYS.length > 0 ? ENV_KEYS : [
  "YANGI_API_KEY_SHU_YERGA_QOYING" // Zaxira uchun
];

// Har bir kalitning holatini kuzatib borish uchun (RPM limitini boshqarish)
const keyStatuses = API_KEYS.map(() => ({
  isBlocked: false,
  unblockAt: null
}));

// API xatosidan kutish vaqtini aniqlash (Regex orqali)
const parseRetryAfter = (message) => {
  const match = message.match(/retry in ([\d.]+)s/);
  if (match && match[1]) {
    return (parseFloat(match[1]) + 2) * 1000;
  }
  return 30000;
};

export async function fetchGeminiResponse(prompt, chatHistory = []) {
  const systemInstruction = `Siz dunyo darajasidagi til o'rganish bo'yicha mutaxassis va filologsiz. 
Sizning vazifangiz: Foydalanuvchiga yangi tillarni (ingliz, rus, nemis va h.k.) o'rganishda, matnlarni tarjima qilishda va grammatikani tushunishda yordam berish.
Qoidalaringiz:
1. Tabiiylik: Sizning gapirishingiz sun'iy intellektga o'xshamasligi kerak. Xuddi haqiqiy o'zbek tilshunosi yoki tajribali repetitor kabi gapiring. "Men AI modeliman" kabi gaplarni ishlatmang.
2. Jiddiylik va Sifat: Yosh bolalarcha quvnoqlikdan qoching. Professional, akademik va jiddiy uslubda javob bering.
3. Strukturaviy yondashuv: Yangi so'zlarni jadvallarda, grammatik qoidalarni aniq punktlarda ($formula$ formatida bo'lsa LaTeX) tushuntiring.
4. Tanqidiy fikrlash: Foydalanuvchi xato qilsa, uni professional tarzda to'g'rilang va nima uchun xato ekanini tushuntiring.
5. Motivatsiya: Javob oxirida talabani keyingi qadamga undaydigan mantiqiy savol bering.`;

  let formattedHistory = [];
  let lastRole = null;

  for (const msg of chatHistory) {
    const role = msg.role === 'ai' ? 'model' : 'user';
    if (role === lastRole) continue;
    formattedHistory.push({
      role: role,
      parts: [{ text: msg.content }]
    });
    lastRole = role;
  }

  if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
    formattedHistory.pop();
  }

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };

  const model = "gemini-2.5-flash"; // Stable version required for system_instruction

  let startIndex = Math.floor(Math.random() * API_KEYS.length);

  for (let i = 0; i < API_KEYS.length; i++) {
    const index = (startIndex + i) % API_KEYS.length;
    const now = Date.now();

    if (keyStatuses[index].isBlocked && keyStatuses[index].unblockAt > now) {
      continue;
    }

    const apiKey = API_KEYS[index];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.error) {
        console.error(`Gemini API Error (Key ${index}):`, data.error);
        if (data.error.code === 429) {
          const retryAfterMs = parseRetryAfter(data.error.message);
          keyStatuses[index].isBlocked = true;
          keyStatuses[index].unblockAt = Date.now() + retryAfterMs;
          console.warn(`Key ${index} band. ${retryAfterMs / 1000}s ga bloklandi.`);
          continue;
        }
        continue;
      }

      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Kechirasiz, tushunmay qoldim 😊";
    } catch (error) {
      continue;
    }
  }

  return "Ustoz biroz o'ylanyapti, hamma tarmoqlar band. 15-30 soniyadan keyin aloqaga chiqadi... 🧠";
}
