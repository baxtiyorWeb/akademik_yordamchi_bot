// ============================================================
//  ielts.js — IELTS tayyorlanish uchun maxsus API va promptlar
//  gemini.js ga tegmaydi, alohida modul
// ============================================================

import { streamGeminiResponse, fetchGeminiResponse } from './gemini';

// ============================================================
// IELTS SYSTEM PROMPTLARI
// ============================================================

export const IELTS_MOODS = {
  gentle: `MUHIM USLUB: Juda iliq, rag'batlantiruvchi va qo'llab-quvvatlovchi bo'l. Har bir urinishni maqta. Emojilardan foydalanma, lekin samimiy bo'l. Xatolarni yumshoq usulda tuzat. "Ajoyib urinish!", "Siz yaxshi ketayapsiz!" kabi iboralar ishlat.`,
  normal: `MUHIM USLUB: Muvozanatli va professional bo'l. Aniq xatolarni ko'rsat, ammo motivatsiya saqla. Har javobdan keyin bitta kuchli tomoni va bitta rivojlanish yo'nalishini ayt.`,
  strict: `MUHIM USLUB: Qattiq qo'l IELTS ekzaminatori kabi bo'l. Hech qanday yumshatmasdan har bir xatoni aniq ko'rsat. Talabaga yuqori standartlarni eslatib tur. "Bu etarli emas", "Ekzamenda bu ball pasaytiriladi" kabi to'g'ridan-to'g'ri gapir.`,
};

export const IELTS_SYSTEM_PROMPTS = {

  // ----------------------------------------------------------
  // SPEAKING
  // ----------------------------------------------------------
  SPEAKING: (mood = 'gentle') => `Sen professional IELTS Speaking ekzaminatori va kouch san.
${IELTS_MOODS[mood]}

VAZIFANG:
- IELTS Speaking testining Part 1, Part 2, Part 3 qismlarini olib bor
- Har bir talaba javobidan keyin quyidagi formatda baho ber:

**📊 Band Scores:**
| Mezon | Ball | Izoh |
|-------|------|------|
| Fluency & Coherence | X.X | ... |
| Lexical Resource | X.X | ... |
| Grammatical Range | X.X | ... |
| Pronunciation | X.X | ... |
| **Umumiy** | **X.X** | ... |

**✅ Kuchli tomonlar:** ...
**❌ Xatolar:** (aniq misol + tuzatma)
**💡 Band 9 namuna javob:** ...
**📌 Keyingi qadam:** ...

QOIDALAR:
- Savol berishdan oldin qaysi Part ekanligini ayt
- Part 2 da 1 daqiqalik tayyorlanish vaqti ber (foydalanuvchi tayyor deb javob berganida davom et)
- Har doim keyingi savolni yoki topshiriqni ber — talabani quruq qoldirma
- Pronunciation uchun fonetik yozuv ishlatish mumkin: /wɜːrd/`,

  // ----------------------------------------------------------
  // LISTENING
  // ----------------------------------------------------------
  LISTENING: (mood = 'gentle') => `Sen IELTS Listening instruktori san.
${IELTS_MOODS[mood]}

VAZIFANG:
- Haqiqiy IELTS Listening bo'limlarini yaratish (Section 1–4)
- Audio matnni yozib, [AUDIO_START] va [AUDIO_END] teglar orasiga joylashtir
- Savollarni audio KEYIN ber
- Javoblarni tekshirib, band skor ber

AUDIO FORMAT (har doim shu formatda yoz):
[AUDIO_START]
(Bu yerda to'liq dialog yoki monolog matni. 250-350 so'z. Haqiqiy IELTS uslubida.)
[AUDIO_END]

**📝 Savollar (Section X):**
1. ...
2. ...
(va hokazo)

SECTION TURLARI:
- Section 1: Ikki kishi o'rtasidagi kundalik suhbat (bronlash, ro'yxatga olish, ma'lumot so'rash)
- Section 2: Bir kishining monologi (ekskursiya, tashkilot taqdimoti)
- Section 3: Akademik muhokama (2-3 talaba yoki o'qituvchi bilan)
- Section 4: Akademik ma'ruza (ilmiy yoki ijtimoiy mavzu)

JAVOB TEKSHIRISH:
- To'g'ri javoblarni ✅, noto'g'rilarini ❌ bilan belgilayin
- Har bir xato javob uchun audiodagi tegishli qismni ko'rsat
- Umumiy band skor: to'g'ri javoblar soni asosida (40 savoldan)`,

  // ----------------------------------------------------------
  // READING
  // ----------------------------------------------------------
  READING: (mood = 'gentle') => `Sen IELTS Reading ekzaminatori va strategiya murabbiyi san.
${IELTS_MOODS[mood]}

VAZIFANG:
- IELTS Reading passajlarini yaratish yoki tahlil qilish
- Savollarni tekshirish va tushuntirish
- O'qish strategiyalarini o'rgatish

SAVOLLAR TURLARI:
- True / False / Not Given
- Yes / No / Not Given  
- Multiple Choice (A/B/C/D)
- Matching Headings
- Fill in the blanks (passage'dan so'z topish)
- Short answer questions

JAVOB TEKSHIRISH FORMATI:
**Q[N]: [To'g'ri/Noto'g'ri]**
- To'g'ri javob: [javob]
- Passajdagi asosiy jumla: "[iqtibos]"
- Tushuntirish: [nima uchun]

STRATEGIYALAR (so'ralganda):
- Skimming: umumiy fikrni tez tushunish
- Scanning: aniq ma'lumotni qidirish
- True/False/NG uchun: "Not Given" = passajda umuman aytilmagan
- Key words: savoldan kalit so'zlarni topib, passajda qidirish`,

  // ----------------------------------------------------------
  // WRITING
  // ----------------------------------------------------------
  WRITING: (mood = 'gentle') => `Sen IELTS Writing ekzaminatori va yozuv murabbiyi san.
${IELTS_MOODS[mood]}

VAZIFANG:
- IELTS Writing Task 1 va Task 2 essaylarini baholash
- Grammatika xatolarini tuzatish
- Lug'at boyligini oshirish

BAHOLASH FORMATI:
**📊 IELTS Writing Baholash:**
| Mezon | Ball | Izoh |
|-------|------|------|
| Task Achievement | X | ... |
| Coherence & Cohesion | X | ... |
| Lexical Resource | X | ... |
| Grammatical Range | X | ... |
| **Umumiy Band** | **X** | ... |

**❌ Grammatika xatolari:**
- "[Asl jumla]" → "[To'g'ri jumla]" — *Sabab: ...*

**📚 Lug'at takomillashuvi:**
- "[Oddiy so'z]" o'rniga → "[Yuqori darajali so'z/ibora]"

**🏗️ Tuzilish tahlili:**
- Kirish: [tahlil]
- Asosiy qism: [tahlil]
- Xulosa: [tahlil]

**⭐ Band 9 namuna (qisqartirilgan):**
[namuna yoki asosiy gap strukturasi]

TASK 1 uchun qo'shimcha:
- Diagramma/grafik tavsifi: overview paragrafidan boshlash
- Eng muhim tendentsiyalarni ajratish
- Aniq raqamlar va foizlar keltirish

TASK 2 uchun qo'shimcha:
- Thesis statement aniq bo'lishi shart
- Har bir paragraf = bitta asosiy fikr
- Transition words: Furthermore, Nevertheless, In contrast, To illustrate`,

  // ----------------------------------------------------------
  // VOCABULARY COACH
  // ----------------------------------------------------------
  VOCABULARY: () => `Sen IELTS Vocabulary Coach san. 

VAZIFANG:
- IELTS uchun muhim so'zlar va iboralar o'rgatish
- Har so'zni kontekstda tushuntirish
- Sinonimlar va antonimlar berish
- Collocations ko'rsatish (so'zlar birikmasi)

FORMAT:
**📖 [So'z] /fonetik/**
- Ma'nosi: ...
- IELTS konteksti: "..."
- Sinonimlar: ...
- Collocations: ... + [so'z]
- Misol jumlalar:
  1. ...
  2. ...`,
};

// ============================================================
// LISTENING AUDIO PARSER — [AUDIO_START]...[AUDIO_END] ni ajratadi
// ============================================================

export function parseListeningResponse(text) {
  const audioMatch = text.match(/\[AUDIO_START\]([\s\S]*?)\[AUDIO_END\]/);
  const audioText = audioMatch ? audioMatch[1].trim() : null;
  const rest = text.replace(/\[AUDIO_START\][\s\S]*?\[AUDIO_END\]/, '').trim();
  return { audioText, rest };
}

// ============================================================
// SPEAKING — Javobni stream qilib olish
// ============================================================

export async function streamSpeakingFeedback({
  userAnswer,
  history,
  part = 1,
  mood = 'gentle',
  onChunk,
  onDone,
}) {
  const systemPrompt = IELTS_SYSTEM_PROMPTS.SPEAKING(mood);
  const contextMsg = `[IELTS Speaking Part ${part}] Talabaning javobi:\n"${userAnswer}"`;

  return streamGeminiResponse(
    contextMsg,
    history,
    null,
    'IELTS_SPEAKING',
    onChunk,
    onDone,
    systemPrompt
  );
}

// ============================================================
// LISTENING — Audio matn yaratish va streaming
// ============================================================

export async function streamListeningSection({
  section = 1,
  mood = 'gentle',
  onChunk,
  onDone,
}) {
  const systemPrompt = IELTS_SYSTEM_PROMPTS.LISTENING(mood);

  const sectionDescriptions = {
    1: 'ikki kishi orasidagi telefon suhbati — mehmonxona bronlash yoki ro\'yxatga olish',
    2: 'bitta kishi monologi — shahar ekskursiyasi yoki tashkilot haqida ma\'lumot',
    3: 'uch talabaning akademik loyiha muhokamasi',
    4: 'professor yoki mutaxassisning akademik ma\'ruzasi (ilmiy yoki ijtimoiy mavzu)',
  };

  const prompt = `Section ${section} IELTS Listening testi yarat: ${sectionDescriptions[section] || sectionDescriptions[1]}.
Avval [AUDIO_START] va [AUDIO_END] orasiga to'liq matnni yoz (250-350 so'z, ingliz tilida, haqiqiy IELTS uslubida).
Keyin 6 ta savol yoz — har biri 4 ta variant bilan (A, B, C, D). To'g'ri javobni ko'rsatma.`;

  return streamGeminiResponse(
    prompt,
    [],
    null,
    'IELTS_LISTENING',
    onChunk,
    onDone,
    systemPrompt
  );
}

// ============================================================
// READING — Passaj yaratish (JSON formatida)
// ============================================================

export async function generateReadingPassage(topic) {
  const systemPrompt = `Sen IELTS Reading passaj generatori san. 
FAQAT quyidagi JSON formatida javob ber, boshqa hech narsa yozma, markdown blok ham yozma:
{
  "title": "Passaj sarlavhasi",
  "passage": "To'liq passaj matni. 500-600 so'z. 4-5 paragraf. \\n\\n bilan ajrat.",
  "questions": [
    {
      "type": "MCQ",
      "text": "Savol matni?",
      "options": ["A. variant", "B. variant", "C. variant", "D. variant"],
      "answer": "A. variant",
      "explanation": "Passajning 2-paragrafida yozilganidek..."
    },
    {
      "type": "TF",
      "text": "Da'vo matni",
      "options": ["True", "False", "Not Given"],
      "answer": "True",
      "explanation": "Passajda aniq aytilgan: ..."
    }
  ]
}
Kamida 5 ta savol yoz: 3 ta MCQ + 2 ta True/False/Not Given.`;

  const raw = await fetchGeminiResponse(
    `Mavzu: ${topic}. Akademik va IELTS uslubida passaj yarat.`,
    [],
    null,
    'IELTS_READING',
    systemPrompt
  );

  try {
    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error('Reading passage JSON parse xatosi:', e);
    throw new Error('Passaj yaratishda xatolik yuz berdi');
  }
}

// ============================================================
// WRITING — Essay baholash (streaming)
// ============================================================

export async function streamWritingEvaluation({
  taskType = 'task2',
  taskPrompt,
  essay,
  mood = 'gentle',
  history = [],
  onChunk,
  onDone,
}) {
  const systemPrompt = IELTS_SYSTEM_PROMPTS.WRITING(mood);
  const taskLabel = taskType === 'task1' ? 'Task 1 (Diagram/Grafik tavsifi)' : 'Task 2 (Essay)';

  const userMsg = `Iltimos, mening IELTS ${taskLabel} essayimni baholagin.

**Topshiriq:**
${taskPrompt}

**Mening javobim:**
${essay}`;

  return streamGeminiResponse(
    userMsg,
    history,
    null,
    'IELTS_WRITING',
    onChunk,
    onDone,
    systemPrompt
  );
}

// ============================================================
// GENERAL IELTS CHAT — Har qanday bo'lim uchun
// ============================================================

export async function streamIELTSChat({
  section,  // 'SPEAKING' | 'LISTENING' | 'READING' | 'WRITING' | 'VOCABULARY'
  userMessage,
  history = [],
  mood = 'gentle',
  attachment = null,
  onChunk,
  onDone,
}) {
  const promptKey = section?.toUpperCase() || 'SPEAKING';
  const promptFn = IELTS_SYSTEM_PROMPTS[promptKey];
  const systemPrompt = typeof promptFn === 'function'
    ? promptFn(mood)
    : IELTS_SYSTEM_PROMPTS.SPEAKING(mood);

  return streamGeminiResponse(
    userMessage,
    history,
    attachment,
    `IELTS_${promptKey}`,
    onChunk,
    onDone,
    systemPrompt
  );
}

// ============================================================
// TYPING DRILL — IELTS jumlalari
// ============================================================

export const IELTS_TYPING_SENTENCES = [
  // Academic vocabulary
  "The proliferation of digital technology has fundamentally altered communication patterns in modern societies.",
  "Environmental degradation poses one of the most significant threats to global biodiversity.",
  "Governments are implementing comprehensive policies to address the growing problem of income inequality.",
  "Academic researchers have demonstrated a strong correlation between early education and long-term development.",
  "Urban migration continues to accelerate as rural communities struggle with limited economic opportunities.",
  "The advancement of artificial intelligence raises profound ethical questions about privacy and autonomy.",
  "International cooperation is deemed essential for tackling the complex challenges posed by climate change.",
  "Public health initiatives have dramatically reduced the incidence of preventable diseases in developing nations.",
  // IELTS Task 2 phrases
  "It is widely acknowledged that globalisation has both beneficial and detrimental effects on local cultures.",
  "There is considerable debate as to whether governments should prioritise economic growth over environmental protection.",
  "From my perspective, the advantages of this policy significantly outweigh its potential drawbacks.",
  "In conclusion, while there are compelling arguments on both sides, I firmly believe that education is paramount.",
  "Furthermore, it is imperative that policymakers take into account the long-term consequences of their decisions.",
  "Nevertheless, critics argue that such measures are insufficient to address the root causes of the problem.",
  "To illustrate this point, one need only consider the rapid industrialisation of Southeast Asian economies.",
  // Task 1 phrases
  "The graph illustrates the proportion of households owning various electronic devices between 2000 and 2020.",
  "As can be clearly seen from the diagram, there was a dramatic increase in renewable energy consumption.",
  "The figures reveal that urban populations grew steadily throughout the period under examination.",
  "Overall, the data suggests a clear upward trend in university enrolment across all demographic groups.",
];

export function getRandomTypingSentence(exclude = '') {
  const filtered = IELTS_TYPING_SENTENCES.filter(s => s !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ============================================================
// BAND SCORE CALCULATOR — So'z soni va darajaga qarab taxminiy
// ============================================================

export function estimateWritingBand(wordCount, taskType = 'task2') {
  const min = taskType === 'task1' ? 150 : 250;
  if (wordCount < min * 0.5) return { band: 3.0, note: 'Juda qisqa — ball keskin pasayadi' };
  if (wordCount < min * 0.8) return { band: 4.5, note: 'So\'z soni etarli emas' };
  if (wordCount < min) return { band: 5.5, note: 'Minimum chegaraga yaqin' };
  if (wordCount < min * 1.2) return { band: 6.5, note: 'Yaxshi hajm' };
  if (wordCount < min * 1.5) return { band: 7.5, note: 'Mukammal hajm' };
  return { band: 8.0, note: 'A\'lo hajm' };
}

// ============================================================
// SUGGESTED PROMPTS — Har bo'lim uchun
// ============================================================

export const IELTS_SUGGESTED_PROMPTS = {
  SPEAKING: [
    { label: '🏠 Part 1 — Hometown', prompt: 'Start IELTS Speaking Part 1. Ask me about my hometown and where I live.' },
    { label: '📱 Part 2 — Technology', prompt: 'Give me an IELTS Part 2 cue card about a piece of technology you use daily.' },
    { label: '🌿 Part 3 — Environment', prompt: 'Start IELTS Speaking Part 3. Ask me abstract questions about environmental issues.' },
    { label: '🎯 Pronunciation drill', prompt: 'Give me 10 common IELTS vocabulary words with their phonetic transcription and help me practice pronunciation.' },
  ],
  LISTENING: [
    { label: '📞 Section 1 — Conversation', prompt: 'Generate an IELTS Listening Section 1 test: a telephone conversation about booking a hotel room.' },
    { label: '📢 Section 2 — Monologue', prompt: 'Generate an IELTS Listening Section 2 test: a guide describing a local museum tour.' },
    { label: '🎓 Section 3 — Academic', prompt: 'Generate an IELTS Listening Section 3 test: three students discussing a group research project.' },
    { label: '🔬 Section 4 — Lecture', prompt: 'Generate an IELTS Listening Section 4 test: an academic lecture about coral reef ecosystems.' },
  ],
  READING: [
    { label: '🌍 Environment', topic: 'climate change and the impact on coastal communities' },
    { label: '🤖 Technology', topic: 'artificial intelligence and its applications in modern healthcare' },
    { label: '🏙️ Society', topic: 'urbanisation trends and the challenges of megacities' },
    { label: '🏛️ History', topic: 'ancient trade routes and their influence on civilisation' },
    { label: '🧬 Science', topic: 'genetic engineering and the ethics of biotechnology' },
    { label: '📊 Economics', topic: 'globalisation and its effects on developing economies' },
  ],
  WRITING: [
    {
      type: 'task2',
      label: '💬 Discuss both views',
      task: 'Some people believe that technology has made our lives more complicated. Others argue it simplifies everyday tasks. Discuss both views and give your opinion.',
    },
    {
      type: 'task2',
      label: '⚖️ Agree or disagree',
      task: 'Governments should invest more money in public transport than in building new roads. To what extent do you agree or disagree?',
    },
    {
      type: 'task2',
      label: '❓ Problems & Solutions',
      task: 'In many countries, the gap between the rich and the poor is growing. What problems does this cause and what measures can be taken to address this issue?',
    },
    {
      type: 'task1',
      label: '📊 Line graph',
      task: 'The graph below shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    },
    {
      type: 'task1',
      label: '🥧 Pie chart',
      task: 'The pie charts below show the main reasons why people moved to and from the UK in 2019. Summarise the information and make comparisons where relevant.',
    },
  ],
};

export default {
  IELTS_SYSTEM_PROMPTS,
  IELTS_MOODS,
  IELTS_SUGGESTED_PROMPTS,
  IELTS_TYPING_SENTENCES,
  parseListeningResponse,
  streamSpeakingFeedback,
  streamListeningSection,
  generateReadingPassage,
  streamWritingEvaluation,
  streamIELTSChat,
  getRandomTypingSentence,
  estimateWritingBand,
};