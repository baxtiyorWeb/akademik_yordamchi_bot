import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  Search, Edit3, Save, ArrowRight, RefreshCcw, Cpu,
  Plus, X, Loader2, Sparkles, BookOpen, Calendar, Target, Clock,
  ChevronDown, Trash2, Copy,
  CheckSquare, MessageSquare, Award, AlertCircle, Send, CheckCircle2, ChevronRight, FileText, Bookmark, Clipboard
} from 'lucide-react';
import { generateNotebookQuiz, generateNotebookCheatSheet, streamGeminiResponse } from '../lib/gemini.js';
import { toast } from 'sonner';

const PLAN_TYPES = ['all', 'daily', 'weekly', 'monthly', 'custom'];

const LEVELS = ['Boshlang\'ich', 'O\'rta', 'Yuqori'];
const DURATIONS = ['1 hafta', '2 hafta', '1 oy', '2 oy', '3 oy', '6 oy'];

/* ─── AI Reja Yaratish Modali ─────────────────────────────── */
function CreatePlanModal({ open, onClose, session, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    subject: '',
    level: 'O\'rta',
    duration: '1 oy',
    dailyHours: '2',
    goal: '',
    planType: 'weekly',
  });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState('');
  const streamRef = useRef(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleGenerate = async () => {
    if (!form.subject.trim()) { toast.error("Fan/mavzuni kiriting!"); return; }
    setStep(2);
    setGenerating(true);
    setPreview('');

    const prompt = `Sen professional akademik reja tuzuvchi murabbiy AI san.

Menga quyidagi ma'lumotlar asosida juda batafsil va amaliy o'quv rejasi tuz:

📚 **Fan/Mavzu**: ${form.subject}
🎯 **Daraja**: ${form.level}
⏱️ **Davomiyligi**: ${form.duration}
🕐 **Kunlik o'qish vaqti**: ${form.dailyHours} soat
🏆 **Maqsad**: ${form.goal || 'Fanni mukammal o\'rganish'}
📅 **Reja turi**: ${form.planType === 'weekly' ? 'Haftalik' : form.planType === 'daily' ? 'Kunlik' : 'Oylik'}

Reja tuzishda quyidagilarni majburiy kiriting:
1. ## Kirish: Nima o'rganiladi va nima uchun
2. ## O'quv Resurslari: Kitoblar, YouTube kanallar, veb-saytlar (aniq nomlar)
3. ## Hafta-hafta Reja: Har hafta nima o'rganiladi (jadval shaklida)
4. ## Kunlik Mashqlar: Har kuni nima qilish kerak
5. ## Nazorat Savollari: Har hafta o'zini tekshirish uchun savollar
6. ## Motivatsiya va Maslahatlar: Qanday qilib davom etish kerak

Faqat Markdown formatlash ishlat. Jadvallar, ro'yxatlar, emoji, bold qo'llangan bo'lsin.`;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const edgeFnUrl = `${supabaseUrl}/functions/v1/gemini-stream`;

      const resp = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          prompt,
          history: [],
          mode: 'TUTOR',
          stream: true,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error('Edge function error');

      const reader = resp.body.getReader();
      streamRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) { throw new Error(parsed.error); }
            if (parsed.done) break;
            const chunk = parsed.chunk || '';
            if (chunk) {
              accumulated += chunk;
              setPreview(accumulated);
            }
          } catch { /* skip */ }
        }
      }

      // Save to Supabase
      if (accumulated && session?.user?.id) {
        const { error } = await supabase.from('study_plans').insert({
          user_id: session.user.id,
          topic: form.subject,
          plan_type: form.planType,
          content: accumulated,
        });
        if (error) { console.error(error); toast.error('Saqlanmadi: ' + error.message); }
        else {
          toast.success('✅ Reja yaratildi va saqlandi!');
          onCreated?.();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Reja yaratishda xatolik: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setStep(1);
    setPreview('');
    setForm({ subject: '', level: 'O\'rta', duration: '1 oy', dailyHours: '2', goal: '', planType: 'weekly' });
  };

  const handleClose = () => {
    streamRef.current?.cancel?.().catch(() => { });
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
            </div>
            <div>
              <h2 className="text-[14px] sm:text-[16px] font-bold text-white">AI bilan Reja Yaratish</h2>
              <p className="text-indigo-200 text-[10px] sm:text-[11px] mt-0.5">
                {step === 1 ? 'Ma\'lumotlarni kiriting' : generating ? 'Reja yaratilmoqda...' : 'Tayyor! Ko\'rib chiqing'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors">
            <X size={14} className="text-white sm:w-[16px] sm:h-[16px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 1 ? (
            /* ── Form ── */
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Subject */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
                  <BookOpen size={13} className="text-indigo-500" /> Fan / Mavzu *
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                  placeholder="Masalan: Python dasturlash, IELTS..."
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-[14px] text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Goal */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
                  <Target size={13} className="text-indigo-500" /> Maqsad
                </label>
                <input
                  type="text"
                  value={form.goal}
                  onChange={e => set('goal', e.target.value)}
                  placeholder="Masalan: IELTS 7.0 olish, Dasturchi bo'lish..."
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-[14px] text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Grid options - Mobil uchun alohida qator (grid-cols-1), kompyuter uchun 2 qator (grid-cols-2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Level */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
                    <Target size={13} className="text-indigo-500" /> Daraja
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {LEVELS.map(l => (
                      <button
                        key={l}
                        onClick={() => set('level', l)}
                        className={`flex-1 px-1 py-2 sm:px-2 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-[12px] font-semibold border transition-all ${form.level === l
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan type */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
                    <Calendar size={13} className="text-indigo-500" /> Reja turi
                  </label>
                  <div className="flex gap-1.5 sm:gap-2">
                    {[['daily', 'Kunlik'], ['weekly', 'Haftalik'], ['monthly', 'Oylik']].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => set('planType', val)}
                        className={`flex-1 px-1 py-2 sm:px-2 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-[12px] font-semibold border transition-all ${form.planType === val
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
                    <Calendar size={13} className="text-indigo-500" /> Davomiylik
                  </label>
                  <div className="relative">
                    <select
                      value={form.duration}
                      onChange={e => set('duration', e.target.value)}
                      className="w-full appearance-none rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-[14px] text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 pr-10"
                    >
                      {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Daily hours */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
                    <Clock size={13} className="text-indigo-500" /> Kunlik soat
                  </label>
                  <div className="flex gap-1.5 sm:gap-2">
                    {['1', '2', '3', '4+'].map(h => (
                      <button
                        key={h}
                        onClick={() => set('dailyHours', h)}
                        className={`flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[12px] sm:text-[13px] font-bold border transition-all ${form.dailyHours === h
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── Preview ── */
            <div className="p-4 sm:p-6">
              {generating && !preview && (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center">
                    <Loader2 size={24} className="text-indigo-600 animate-spin" />
                  </div>
                  <p className="text-slate-600 text-[13px] sm:text-[14px] font-medium">AI reja tuzmoqda...</p>
                  <div className="flex gap-1">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              )}
              {preview && (
                <div className="prose prose-sm sm:prose-base prose-slate max-w-none text-[13px] sm:text-[14px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {preview}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
          {step === 1 ? (
            <>
              <button onClick={handleClose} className="px-4 py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-100 transition-colors">
                Bekor qilish
              </button>
              <button
                onClick={handleGenerate}
                disabled={!form.subject.trim()}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl sm:rounded-2xl text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-indigo-200"
              >
                <Sparkles size={15} /> AI bilan Reja Tuz
              </button>
            </>
          ) : (
            <>
              {!generating && (
                <>
                  <button onClick={reset} className="px-4 py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-100 transition-colors">
                    ← Qaytish
                  </button>
                  <button onClick={handleClose} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl sm:rounded-2xl text-[13px] font-bold hover:bg-emerald-700 transition-colors">
                    <Save size={14} /> Tayyor — Yopish
                  </button>
                </>
              )}
              {generating && (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-[12px] sm:text-[13px] w-full text-center py-2">
                  <Loader2 size={14} className="animate-spin text-indigo-500" />
                  Reja yaratilmoqda, iltimos kuting...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Markdown Roadmap Parser ─────────────────────────────── */
const parseMarkdownToRoadmap = (content) => {
  if (!content) return [];
  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;

  const shouldIgnore = (text) => {
    const t = text.toLowerCase();
    // Ignore footer/outro/intro conversational items
    if (t.includes('mantiqiy savol') ||
      t.includes('savol:') ||
      t.includes('ma\'qulmi') ||
      t.includes('tashakkur') ||
      t.includes('salom') ||
      t.includes('tuzuvchi murabbiy') ||
      t.includes('e\'tibor') ||
      t.includes('baholash') ||
      t.includes('o\'quv rejasi sizga') ||
      t.includes('yordam beradi') ||
      t.includes('omad tilaymiz') ||
      t.includes('harakat qilmaslikdir')) {
      return true;
    }
    // Ignore long general paragraphs that are not specific topics
    if (text.length > 130) {
      return true;
    }
    return false;
  };

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for headings: ## Heading or ### Heading or #### Heading or # Heading
    if (trimmed.startsWith('#')) {
      const title = trimmed.replace(/^#+\s*/, '').trim();
      // Ignore main plan title or metadata titles
      if (title && !shouldIgnore(title)) {
        currentSection = {
          title,
          items: []
        };
        sections.push(currentSection);
      }
    }
    // Check for list items under sections
    else if ((trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) && currentSection) {
      let text = trimmed.replace(/^[-*\d.]+\s*/, '').trim();
      text = text.replace(/^\[[ xX]\]\s*/, '').trim();
      // Strip markdown bold/italic/code markers
      text = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/_(.+?)_/g, '$1').replace(/`(.+?)`/g, '$1').trim();
      if (text.length > 1 && !shouldIgnore(text)) {
        const id = `${currentSection.title}-${text}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!currentSection.items.some(i => i.id === id)) {
          currentSection.items.push({ id, text });
        }
      }
    }
  }

  // Filter sections that have no items
  const validSections = sections.filter(s => s.items.length > 0);
  if (validSections.length > 0) return validSections;

  // Fallback: Default section if no headers
  const defaultSection = { title: "Kurs Yo'nalishlari", items: [] };
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      let text = trimmed.replace(/^[-*\d.]+\s*/, '').trim();
      text = text.replace(/^\[[ xX]\]\s*/, '').trim();
      text = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/_(.+?)_/g, '$1').replace(/`(.+?)`/g, '$1').trim();
      if (text.length > 1 && !shouldIgnore(text)) {
        const id = `default-${text}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!defaultSection.items.some(i => i.id === id)) {
          defaultSection.items.push({ id, text });
        }
      }
    }
  }

  if (defaultSection.items.length > 0) return [defaultSection];

  if (sections.length > 0) {
    return sections.map(s => ({
      title: s.title,
      items: [{ id: `topic-${s.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, text: s.title }]
    }));
  }

  return [];
};

/* ─── AI Study Workspace Component ────────────────────────── */
function StudyWorkspace({ plan, session, onClose, onUpdate }) {
  const userId = session?.user?.id;
  const [activeTab, setActiveTab] = useState('roadmap'); // 'roadmap', 'notes', 'full-text'
  const [aiTab, setAiTab] = useState('chat'); // 'chat', 'quiz', 'cheat-sheet'

  // Mobile active tab: 'roadmap', 'chat', 'quiz-tools', 'notes'
  const [activeMobileTab, setActiveMobileTab] = useState('roadmap');

  // Checklist State (Progress)
  const [checkedIds, setCheckedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`ws_checked_${userId}_${plan.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`ws_checked_${userId}_${plan.id}`, JSON.stringify(checkedIds));
  }, [checkedIds, userId, plan.id]);

  // Notes State
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(`ws_notes_${userId}_${plan.id}`) || '';
  });
  const [isNotesSaving, setIsNotesSaving] = useState(false);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    setIsNotesSaving(true);
    localStorage.setItem(`ws_notes_${userId}_${plan.id}`, val);
    setTimeout(() => {
      setIsNotesSaving(false);
    }, 600);
  };

  // AI Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'ai',
      content: `Salom! Men sizning shaxsiy AI repetitoringizman. 📚 **${plan.topic}** o'quv rejasi doirasida istalgan mavzuni tushuntirib berishim, topshiriqlar berishim yoki savollaringizga javob berishim mumkin. Qaysi mavzudan boshlaymiz?`
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    if (!textToSend) setChatInput('');

    // Add user message
    const userMsg = { id: `u-${Date.now()}`, role: 'user', content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setIsAiThinking(true);

    const aiMsgId = `ai-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: aiMsgId, role: 'ai', content: '' }]);

    try {
      const systemContext = `Foydalanuvchi quyidagi o'quv rejasi bo'yicha o'qimoqda:
Mavzu: "${plan.topic}"
Reja turi: "${plan.plan_type}"
Reja tarkibi:
${plan.content}

Siz ushbu o'quv rejasining AI repetitorisiz. Foydalanuvchiga o'rganishda yordam bering. Savollariga tushunarli, batafsil va amaliy misollar bilan javob bering.`;

      const historyContext = chatMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      await streamGeminiResponse(
        `${systemContext}\n\nFoydalanuvchi so'rovi: ${text}`,
        historyContext,
        null,
        'TUTOR',
        (chunk) => {
          setChatMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: chunk } : m));
        }
      );
    } catch (err) {
      console.error(err);
      setChatMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: "Xatolik yuz berdi. Iltimos qaytadan so'rang." } : m));
    } finally {
      setIsAiThinking(false);
    }
  };

  // Interactive Quiz State
  const [quizData, setQuizData] = useState(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizCurrentIdx, setQuizCurrentIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizFinished, setQuizFinished] = useState(false);

  const startQuiz = async () => {
    setIsQuizLoading(true);
    setQuizData(null);
    setQuizCurrentIdx(0);
    setQuizAnswers([]);
    setQuizFinished(false);
    setAiTab('quiz');
    setActiveMobileTab('quiz-tools');

    try {
      const questions = await generateNotebookQuiz(plan.content);
      if (Array.isArray(questions) && questions.length > 0) {
        setQuizData(questions);
      } else {
        toast.error("Test savollarini yaratib bo'lmadi. Qaytadan urinib ko'ring.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Test yaratishda xatolik yuz berdi.");
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleSelectQuizOption = (optionIdx) => {
    if (quizAnswers[quizCurrentIdx] !== undefined) return;
    setQuizAnswers(prev => {
      const next = [...prev];
      next[quizCurrentIdx] = optionIdx;
      return next;
    });
  };

  const nextQuizQuestion = () => {
    if (quizCurrentIdx < quizData.length - 1) {
      setQuizCurrentIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  // Cheat Sheet State
  const [cheatSheetText, setCheatSheetText] = useState('');
  const [isCsLoading, setIsCsLoading] = useState(false);

  const getCheatSheet = async () => {
    if (cheatSheetText) {
      setAiTab('cheat-sheet');
      setActiveMobileTab('quiz-tools');
      return;
    }
    setIsCsLoading(true);
    setAiTab('cheat-sheet');
    setActiveMobileTab('quiz-tools');
    try {
      const text = await generateNotebookCheatSheet(plan.content);
      setCheatSheetText(text);
    } catch (err) {
      console.error(err);
      toast.error("Cheat sheet yaratishda xatolik yuz berdi.");
    } finally {
      setIsCsLoading(false);
    }
  };

  // Roadmap list
  const roadmap = useMemo(() => {
    return parseMarkdownToRoadmap(plan.content);
  }, [plan.content]);

  const totalItems = useMemo(() => {
    return roadmap.reduce((acc, sec) => acc + sec.items.length, 0);
  }, [roadmap]);

  const progressPercent = useMemo(() => {
    if (totalItems === 0) return 0;
    const completed = checkedIds.filter(id =>
      roadmap.some(sec => sec.items.some(item => item.id === id))
    ).length;
    return Math.round((completed / totalItems) * 100);
  }, [checkedIds, roadmap, totalItems]);

  const handleToggleCheck = (itemId) => {
    setCheckedIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const explainTopic = (topicName) => {
    setActiveMobileTab('chat');
    setAiTab('chat');
    handleSendMessage(`Menga o'quv rejasidagi "${topicName}" mavzusini batafsil, tushunarli qilib misollar bilan tushuntirib ber.`);
  };

  const testTopic = (topicName) => {
    setActiveMobileTab('chat');
    setAiTab('chat');
    handleSendMessage(`Menga o'quv rejasidagi "${topicName}" mavzusi bo'yicha 1 ta savol ber va bilimimni tekshir.`);
  };

  const copyToClipboard = (text, message = "Nusxalandi!") => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const quizCorrectCount = useMemo(() => {
    if (!quizData) return 0;
    return quizAnswers.filter((ans, idx) => ans === quizData[idx]?.correctAnswerIndex).length;
  }, [quizAnswers, quizData]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-slate-50 text-slate-800 w-full">
      {/* Workspace Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all border border-slate-200 shrink-0"
          >
            <X size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider">
                {plan.plan_type === 'daily' ? 'Kunlik' : plan.plan_type === 'weekly' ? 'Haftalik' : plan.plan_type === 'monthly' ? 'Oylik' : 'Maxsus'}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">
                Yangilangan: {new Date(plan.updated_at || plan.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-[16px] sm:text-lg font-bold text-slate-900 mt-0.5 truncate max-w-xs sm:max-w-md">{plan.topic}</h1>
          </div>
        </div>

        {/* Progress & Quick Actions */}
        <div className="flex items-center gap-3 justify-between md:justify-end flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 flex-1 md:flex-initial md:w-60">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-0.5">
                <span>Progress</span>
                <span className="text-indigo-600 font-bold">{progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600 shrink-0">
              {checkedIds.length}/{totalItems}
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(plan.content, "Reja matni nusxalandi")}
            title="Reja matnini nusxalash"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition shrink-0"
          >
            <Copy size={15} />
          </button>
        </div>
      </header>

      {/* Responsive Mobile Tabs Swapper */}
      <div className="xl:hidden flex gap-1 p-2 bg-slate-100/80 border-b border-slate-200 overflow-x-auto shrink-0 scrollbar-none">
        {[
          { id: 'roadmap', label: 'Yo\'l xaritasi', icon: CheckSquare },
          { id: 'chat', label: 'AI Repetitor', icon: MessageSquare },
          { id: 'quiz-tools', label: 'Test & Asboblar', icon: Award },
          { id: 'notes', label: 'Konspekt & Eslatmalar', icon: Bookmark },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveMobileTab(t.id);
              if (t.id === 'roadmap') {
                setActiveTab('roadmap');
              } else if (t.id === 'notes') {
                if (activeTab === 'roadmap') {
                  setActiveTab('notes');
                }
              } else if (t.id === 'chat') {
                setAiTab('chat');
              } else if (t.id === 'quiz-tools') {
                if (aiTab === 'chat') {
                  setAiTab('quiz');
                }
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition shrink-0 ${activeMobileTab === t.id
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-white">
        {/* Left Pane (Roadmap, Notes, Full Text) */}
        <div className={`flex-1 flex-col overflow-hidden border-r border-slate-200 bg-slate-50/50 
          ${activeMobileTab === 'roadmap' || activeMobileTab === 'notes' ? 'flex' : 'hidden xl:flex'}`}
        >
          {/* Tab bar */}
          <div className="px-6 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
            <div className="flex gap-1 py-2 overflow-x-auto scrollbar-none">
              {[
                { id: 'roadmap', label: 'Mundarija', icon: CheckSquare, hideMobile: true },
                { id: 'notes', label: 'Mening Eslatmalarim', icon: Bookmark, activeMobileShow: 'notes' },
                { id: 'full-text', label: 'Asl Reja Matni', icon: FileText, activeMobileShow: 'notes' },
              ].map(t => {
                if (t.hideMobile && activeMobileTab !== 'roadmap' && activeMobileTab !== 'notes') return null;
                if (t.activeMobileShow && activeMobileTab !== t.activeMobileShow) return null;

                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${activeTab === t.id
                      ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    <t.icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>
            {activeTab === 'notes' && (
              <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${isNotesSaving ? 'text-amber-500 animate-pulse' : 'text-emerald-500'}`}>
                {isNotesSaving ? 'Saqlanmoqda...' : 'Saqlandi'}
              </span>
            )}
          </div>

          {/* Left Pane Content scroll container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'roadmap' && (
              <div className="space-y-4">
                {roadmap.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Mavzular ro'yxatini aniqlab bo'lmadi. "Asl reja matni" bo'limini ko'ring.
                  </div>
                ) : (
                  roadmap.map((section, sIdx) => {
                    const sectionCheckedCount = section.items.filter(item => checkedIds.includes(item.id)).length;
                    const sectionTotalCount = section.items.length;
                    const isSectionDone = sectionCheckedCount === sectionTotalCount && sectionTotalCount > 0;

                    return (
                      <div
                        key={sIdx}
                        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 hover:shadow-md hover:shadow-indigo-50/20 transition-all"
                      >
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSectionDone
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              }`}>
                              {sIdx + 1}
                            </div>
                            <h3 className="font-bold text-slate-800 text-xs sm:text-[14px] truncate">{section.title}</h3>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                            {sectionCheckedCount}/{sectionTotalCount}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {section.items.map((item) => {
                            const isChecked = checkedIds.includes(item.id);
                            return (
                              <div
                                key={item.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-3 transition-all ${isChecked
                                  ? 'bg-emerald-50/25 border-emerald-100'
                                  : 'bg-slate-50/40 border-slate-200/60 hover:bg-slate-50 hover:border-slate-200'
                                  }`}
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <button
                                    onClick={() => handleToggleCheck(item.id)}
                                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mt-0.5 shrink-0 ${isChecked
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-slate-300 hover:border-indigo-500 bg-white'
                                      }`}
                                  >
                                    {isChecked && <CheckCircle2 size={13} className="stroke-[3]" />}
                                  </button>
                                  <span className={`text-xs sm:text-[13px] leading-relaxed transition-all cursor-pointer select-none ${isChecked
                                    ? 'text-slate-400 line-through font-normal'
                                    : 'text-slate-700 font-semibold'
                                    }`}
                                    onClick={() => handleToggleCheck(item.id)}
                                  >
                                    {item.text}
                                  </span>
                                </div>

                                <div className="flex gap-1.5 justify-end shrink-0">
                                  <button
                                    onClick={() => explainTopic(item.text)}
                                    className="px-2.5 py-1 text-[10px] sm:text-xs rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-650 text-indigo-600 font-bold border border-indigo-100 transition-all flex items-center gap-1"
                                  >
                                    <MessageSquare size={11} /> Tushuntir
                                  </button>
                                  <button
                                    onClick={() => testTopic(item.text)}
                                    className="px-2.5 py-1 text-[10px] sm:text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold border border-slate-200 transition-all flex items-center gap-1"
                                  >
                                    <Cpu size={11} /> Savol
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="h-full flex flex-col min-h-[300px]">
                <textarea
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Bu yerga shaxsiy konspektlaringizni, dars davomida yozgan eslatmalaringizni yozib boring..."
                  className="flex-1 w-full bg-white text-slate-800 rounded-2xl border border-slate-200 p-4 outline-none resize-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 font-sans text-xs sm:text-[13px] leading-relaxed min-h-[280px]"
                />
              </div>
            )}

            {activeTab === 'full-text' && (
              <div className="prose prose-slate max-w-none text-xs sm:text-[13px] leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {plan.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane (AI Side Panel: Chat / Quiz / Cheat Sheet) */}
        <div className={`w-full xl:w-[420px] flex-col overflow-hidden bg-white border-t xl:border-t-0 border-slate-200 shrink-0
          ${activeMobileTab === 'chat' || activeMobileTab === 'quiz-tools' ? 'flex' : 'hidden xl:flex'}`}
        >
          {/* AI Tools Selection */}
          <div className="px-4 border-b border-slate-200 bg-slate-50 flex gap-1 py-2 shrink-0 overflow-x-auto">
            {activeMobileTab === 'quiz-tools' ? (
              [
                { id: 'quiz', label: 'Interaktiv Test', icon: Award },
                { id: 'cheat-sheet', label: 'Cheat Sheet', icon: FileText },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'quiz') startQuiz();
                    else getCheatSheet();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${aiTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 bg-white border border-slate-200'
                    }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))
            ) : (
              [
                { id: 'chat', label: 'AI Repetitor', icon: MessageSquare },
                { id: 'quiz', label: 'Interaktiv Test', icon: Award },
                { id: 'cheat-sheet', label: 'Cheat Sheet', icon: FileText },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'quiz') startQuiz();
                    else if (tab.id === 'cheat-sheet') getCheatSheet();
                    else {
                      setAiTab('chat');
                      setActiveMobileTab('chat');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${aiTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))
            )}
          </div>

          {/* AI Tab Content */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-slate-50/30">
            {aiTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                {/* Chat Message Scroll */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-50/20">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role !== 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm font-bold text-[10px]">
                          AI
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs md:text-[13px] leading-relaxed shadow-sm ${msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-850 text-slate-800 border border-slate-200/80 rounded-tl-none prose prose-slate max-w-none'
                          }`}
                      >
                        {msg.role === 'user' ? (
                          msg.content
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {msg.content}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  ))}
                  {isAiThinking && (
                    <div className="flex gap-2.5 justify-start">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm font-bold text-[10px]">
                        AI
                      </div>
                      <div className="bg-white text-slate-400 border border-slate-200/80 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs flex items-center gap-2 shadow-sm">
                        <Loader2 size={12} className="animate-spin text-indigo-500" />
                        <span>Fikr qilmoqda...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Pre-defined chips & Input */}
                <div className="p-3 sm:p-4 border-t border-slate-200 bg-white shrink-0">
                  <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-none shrink-0">
                    {[
                      { text: "Topshiriq ber", prompt: "Menga o'quv rejasidagi hozirgi darajam bo'yicha kichik amaliy topshiriq bering." },
                      { text: "Murakkab joylarini soddalashtir", prompt: "Ushbu rejaning eng murakkab tushunchalarini oddiy misollar bilan tushuntiring." },
                      { text: "Savol-javob o'yini", prompt: "Hozirgi mavzular bo'yicha menga 1 ta qisqa test yoki savol bering, tekshirib ko'raman." },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(chip.prompt)}
                        className="px-2.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition shrink-0 whitespace-nowrap"
                      >
                        {chip.text}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Savolingizni yozing..."
                      disabled={isAiThinking}
                      className="flex-1 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 disabled:opacity-60 transition"
                    />
                    <button
                      type="submit"
                      disabled={isAiThinking || !chatInput.trim()}
                      className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition disabled:opacity-50 shrink-0 shadow-md shadow-indigo-100"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {aiTab === 'quiz' && (
              <div className="flex-1 p-5 overflow-y-auto bg-white">
                {isQuizLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-1">
                      <Loader2 size={22} className="text-indigo-500 animate-spin" />
                    </div>
                    <h4 className="font-bold text-[14px] text-slate-800">Test yaratilmoqda...</h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      AI o'quv rejangiz mavzularini o'rganmoqda va variantli test savollarini tayyorlamoqda.
                    </p>
                  </div>
                )}

                {!isQuizLoading && !quizData && (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-1">
                      <Award size={22} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-[14px]">Interaktiv Bilim Sinovi</h4>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      Ushbu o'quv rejasining asosiy tushunchalarini tekshirish uchun AI tomonidan 5 ta variantli test savollarini generatsiya qiling.
                    </p>
                    <button
                      onClick={startQuiz}
                      className="mt-3 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-100"
                    >
                      Test Boshlash
                    </button>
                  </div>
                )}

                {!isQuizLoading && quizData && !quizFinished && (
                  <div className="space-y-4">
                    {/* Question Header */}
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-400 border-b border-slate-100 pb-2.5">
                      <span>Savol {quizCurrentIdx + 1} / {quizData.length}</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        Quiz
                      </span>
                    </div>

                    {/* Question Text */}
                    <h3 className="font-bold text-[13.5px] sm:text-[14px] leading-relaxed text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {quizData[quizCurrentIdx]?.question}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-2">
                      {quizData[quizCurrentIdx]?.options.map((opt, oIdx) => {
                        const isSelected = quizAnswers[quizCurrentIdx] === oIdx;
                        const isCorrectAnswer = oIdx === quizData[quizCurrentIdx]?.correctAnswerIndex;
                        const alreadyAnswered = quizAnswers[quizCurrentIdx] !== undefined;

                        let btnStyle = "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50";
                        if (alreadyAnswered) {
                          if (isCorrectAnswer) {
                            btnStyle = "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold";
                          } else if (isSelected) {
                            btnStyle = "bg-red-50 border-red-300 text-red-800";
                          } else {
                            btnStyle = "bg-white border-slate-200 text-slate-400 opacity-60";
                          }
                        } else {
                          if (isSelected) {
                            btnStyle = "bg-indigo-50 border-indigo-300 text-indigo-800";
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelectQuizOption(oIdx)}
                            disabled={alreadyAnswered}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex gap-3 items-center ${btnStyle}`}
                          >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${alreadyAnswered
                              ? isCorrectAnswer
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : isSelected
                                  ? 'bg-red-500 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-400'
                              : 'bg-slate-100 text-slate-600'
                              }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="flex-1 font-semibold">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {quizAnswers[quizCurrentIdx] !== undefined && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/10 p-4 space-y-2 mt-4 transition-all">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase">
                          <AlertCircle size={13} className="text-indigo-500" />
                          <span>Tushuntirish</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-slate-600 font-medium">
                          {quizData[quizCurrentIdx]?.explanation}
                        </p>

                        <button
                          onClick={nextQuizQuestion}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm shadow-indigo-100"
                        >
                          <span>Navbatdagi savol</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {quizFinished && (
                  <div className="text-center py-6 space-y-5">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500 shadow-sm">
                      <Award size={30} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Test yakunlandi!</h3>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
                        Siz o'quv rejasining asosiy qismlarini takrorlab oldingiz.
                      </p>
                    </div>

                    <div className="max-w-xs mx-auto rounded-2xl bg-slate-50 border border-slate-200 p-5 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Sinov natijasi</p>
                      <p className="text-4xl font-black text-indigo-600 mt-1">
                        {quizCorrectCount} <span className="text-sm text-slate-400">/ {quizData.length}</span>
                      </p>
                      <p className="text-xs text-slate-500 font-semibold mt-2 leading-relaxed">
                        {quizCorrectCount === 5 ? '🎉 Alo daraja! Hammasi to\'g\'ri javob.' :
                          quizCorrectCount >= 3 ? '👍 Yaxshi natija! Xatolaringizni takrorlang.' :
                            '📚 Mavzularni ko\'proq o\'qishni maslahat beramiz.'}
                      </p>
                    </div>

                    <div className="flex gap-2 max-w-xs mx-auto">
                      <button
                        onClick={startQuiz}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                      >
                        Qayta urinish
                      </button>
                      <button
                        onClick={() => {
                          setActiveMobileTab('chat');
                          setAiTab('chat');
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition"
                      >
                        Chatga o'tish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {aiTab === 'cheat-sheet' && (
              <div className="flex-1 p-4 overflow-y-auto flex flex-col bg-white">
                {isCsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center my-auto">
                    <Loader2 size={24} className="text-indigo-500 animate-spin" />
                    <h4 className="font-bold text-slate-700 text-xs sm:text-sm">Cheat Sheet tayyorlanmoqda...</h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 max-w-xs leading-relaxed">
                      AI o'quv rejasining eng muhim qoidalari va formulasidan iborat qulay konspekt tayyorlamoqda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1 flex flex-col min-h-[300px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Cheat Sheet (Konspekt)</h4>
                      <button
                        onClick={() => copyToClipboard(cheatSheetText, "Konspekt nusxalandi")}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition"
                      >
                        <Clipboard size={12} />
                        Nusxalash
                      </button>
                    </div>

                    <div className="flex-1 text-[12.5px] leading-relaxed text-slate-700 prose prose-slate max-w-none bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-y-auto font-sans min-h-[250px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {cheatSheetText}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
const StudyPlansPage = ({ session }) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ topic: '', plan_type: '', content: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePlanId, setActivePlanId] = useState(null);

  const activePlan = useMemo(() => {
    return plans.find(p => p.id === activePlanId) || null;
  }, [plans, activePlanId]);

  const loadPlans = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Study plans load error:', err);
      toast.error('Rejalarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchType = typeFilter === 'all' || plan.plan_type === typeFilter;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch = !q || [plan.topic, plan.plan_type, plan.content].some((field) =>
        String(field || '').toLowerCase().includes(q)
      );
      return matchType && matchSearch;
    });
  }, [plans, searchTerm, typeFilter]);

  const startEdit = (plan) => {
    setEditingId(plan.id);
    setEditValues({ topic: plan.topic, plan_type: plan.plan_type, content: plan.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ topic: '', plan_type: '', content: '' });
  };

  const updatePlan = async (planId) => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('study_plans')
        .update({
          topic: editValues.topic || 'Untitled Plan',
          plan_type: editValues.plan_type || 'custom',
          content: editValues.content,
        })
        .eq('id', planId)
        .eq('user_id', session.user.id);
      if (error) throw error;
      toast.success('Reja yangilandi');
      cancelEdit();
      await loadPlans();
    } catch (err) {
      console.error('Update plan error:', err);
      toast.error('Rejani yangilashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (planId) => {
    if (!confirm('Rejani o\'chirishni tasdiqlaysizmi?')) return;
    try {
      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', session.user.id);
      if (error) throw error;
      toast.success('Reja o\'chirildi');
      await loadPlans();
    } catch (err) {
      toast.error('O\'chirishda xatolik: ' + err.message);
    }
  };

  const openInTutor = (plan) => {
    navigate('/tutor', { state: { assistPlan: plan } });
  };

  if (activePlan) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#fcfdfe] overflow-hidden w-full">
        <StudyWorkspace
          plan={activePlan}
          session={session}
          onClose={() => setActivePlanId(null)}
          onUpdate={loadPlans}
        />
      </div>
    );
  }

  // Helper: strip markdown to plain text for previews
  const stripMarkdown = (text = '') =>
    text
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*>]\s+/gm, '')
      .replace(/\n{2,}/g, ' ')
      .replace(/\n/g, ' ')
      .trim();

  const planTypeLabel = (t) => ({ daily: 'Kunlik', weekly: 'Haftalik', monthly: 'Oylik', custom: 'Maxsus' }[t] || t);
  const planTypeColor = (t) => ({ daily: 'emerald', weekly: 'indigo', monthly: 'purple', custom: 'amber' }[t] || 'slate');

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-[#fcfdfe] to-[#f0f4ff] overflow-hidden w-[100dvw]">
      <CreatePlanModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        session={session}
        onCreated={loadPlans}
      />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-slate-100 px-4 md:px-8 py-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">O'quv Rejalarim</h1>
            <p className="text-xs text-slate-400 mt-1">{filteredPlans.length} ta o'quv rejasi</p>
          </div>

          <div className="flex w-full sm:w-auto gap-3">
            <button
              onClick={loadPlans}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <RefreshCcw size={14} /> Yangilash
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium whitespace-nowrap text-xs shadow-sm"
            >
              <Plus size={15} /> Yangi Reja
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Jami rejalar', value: plans.length, emoji: '📚' },
            { label: 'Kunlik', value: plans.filter(p => p.plan_type === 'daily').length, emoji: '☀️' },
            { label: 'Haftalik', value: plans.filter(p => p.plan_type === 'weekly').length, emoji: '📅' },
            { label: 'Oylik', value: plans.filter(p => p.plan_type === 'monthly').length, emoji: '🗓️' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
              <span className="text-xl">{s.emoji}</span>
              <div>
                <p className="text-[16px] font-bold text-slate-800 leading-tight">{s.value}</p>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-100 p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6 shadow-xs">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Reja nomi yoki mazmuni bo'yicha qidirish..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PLAN_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  typeFilter === t
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t === 'all' ? 'Barchasi' : planTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-semibold">Rejalar yuklanmoqda...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center max-w-lg mx-auto mt-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-800 text-base font-bold mb-1">Hali reja yo'q</p>
            <p className="text-slate-400 text-xs mb-5">AI yordamida birinchi rejangizni tuzing!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              <Sparkles size={13} /> Reja tuzish
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredPlans.map((plan) => {
              const isEditing = editingId === plan.id;
              const color = planTypeColor(plan.plan_type);
              const preview = stripMarkdown(plan.content).slice(0, 140);
              const dateStr = new Date(plan.updated_at || plan.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });

              if (isEditing) {
                return (
                  <article key={plan.id} className="sm:col-span-2 lg:col-span-3 bg-white rounded-3xl border border-indigo-200 shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <Edit3 size={16} className="text-indigo-600" />
                      </div>
                      <h3 className="font-bold text-slate-800">Rejani tahrirlash</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <input
                          type="text"
                          value={editValues.topic}
                          onChange={(e) => setEditValues(prev => ({ ...prev, topic: e.target.value }))}
                          placeholder="Reja nomi"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                        <select
                          value={editValues.plan_type}
                          onChange={(e) => setEditValues(prev => ({ ...prev, plan_type: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                          {PLAN_TYPES.filter(t => t !== 'all').map(t => (
                            <option key={t} value={t}>{planTypeLabel(t)}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={editValues.content}
                        onChange={(e) => setEditValues(prev => ({ ...prev, content: e.target.value }))}
                        rows={8}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                      />
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="px-5 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >Bekor qilish</button>
                        <button
                          onClick={() => updatePlan(plan.id)}
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-60"
                        >
                          <Save size={14} /> Saqlash
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={plan.id}
                  onClick={() => setActivePlanId(plan.id)}
                  className="group bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all duration-200 cursor-pointer active:scale-[0.995] flex flex-col h-[220px] relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                      color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                      color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                      color === 'purple' ? 'bg-purple-50 text-purple-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {planTypeLabel(plan.plan_type)}
                    </span>
                    <span className="text-[11px] text-slate-400">{dateStr}</span>
                  </div>

                  <h3 className="font-semibold text-[15px] leading-tight mt-3 line-clamp-2 group-hover:text-indigo-750 group-hover:text-indigo-600 transition-colors">
                    {plan.topic}
                  </h3>

                  <p className="text-[12.5px] text-slate-500 leading-relaxed mt-2 line-clamp-3">
                    {preview}{preview.length >= 140 ? '...' : ''}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(plan)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="p-1.5 hover:bg-slate-50 hover:text-rose-500 rounded-lg text-slate-400 transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <button
                      onClick={() => setActivePlanId(plan.id)}
                      className="text-indigo-600 text-xs font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all"
                    >
                      AI Workspace <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlansPage;
