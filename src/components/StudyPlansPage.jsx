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
} from 'lucide-react';
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
          mode: 'TUTOR',
          messages: [{ role: 'user', parts: [{ text: prompt }] }],
          userId: session?.user?.id,
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
            const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

  return (
    <div className="flex-1 min-h-screen bg-slate-100 overflow-scroll">
      <CreatePlanModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        session={session}
        onCreated={loadPlans}
      />

      <div className="mx-auto flex h-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_-35px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold text-slate-900">Saqlangan Rejalar</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                AI yordamida shaxsiy o'quv rejasi tuzing yoki mavjud rejalarni ko'ring, tahrirlang va tekshiring.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200/40 hover:opacity-90 transition"
              >
                <Plus size={16} /> AI bilan Reja Tuz
              </button>
              <button
                onClick={() => navigate('/tutor')}
                className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <ArrowRight size={16} /> Tutor sahifasi
              </button>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-6 xl:grid-cols-[1.65fr_0.85fr]">
          {/* Plans list */}
          <section className="space-y-5 overflow-y-auto rounded-[32px] h-200">
            {/* Search & Filter */}
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Reja nomi, turi yoki mazmuni bo'yicha qidirish"
                    className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-12 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <span className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">Filter</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-[28px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  >
                    {PLAN_TYPES.map((type) => (
                      <option key={type} value={type}>{type === 'all' ? 'Barchasi' : type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Plans */}
            <div className="space-y-4 overflow-hidden">
              {loading ? (
                <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center">
                  <Loader2 size={24} className="mx-auto mb-3 text-indigo-500 animate-spin" />
                  <p className="text-slate-500 text-sm">Rejalar yuklanmoqda...</p>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-12 text-center">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen size={20} className="text-indigo-400" />
                  </div>
                  <p className="text-slate-600 text-[15px] font-semibold mb-1">Hali hech qanday reja yo'q</p>
                  <p className="text-slate-400 text-[13px] mb-4">AI bilan birinchi rejanngizni tuzing!</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[13px] font-semibold hover:bg-indigo-700 transition"
                  >
                    <Sparkles size={14} /> Reja tuzish
                  </button>
                </div>
              ) : (
                filteredPlans.map((plan) => {
                  const isEditing = editingId === plan.id;
                  return (
                    <article key={plan.id} className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.24)] transition hover:shadow-[0_24px_90px_-38px_rgba(15,23,42,0.28)]">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">
                            {plan.plan_type === 'daily' ? 'Kunlik' : plan.plan_type === 'weekly' ? 'Haftalik' : plan.plan_type === 'monthly' ? 'Oylik' : 'Maxsus'}
                          </div>
                          <h2 className="mt-4 text-2xl font-semibold text-slate-900 truncate">{plan.topic}</h2>
                          <p className="mt-2 text-sm text-slate-500">Yangilangan: {new Date(plan.updated_at || plan.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => startEdit(plan)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Edit3 size={14} /> O'zgartirish
                          </button>
                          <button
                            onClick={() => openInTutor(plan)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                          >
                            <Cpu size={14} /> AI bilan tekshirish
                          </button>
                          <button
                            onClick={() => deletePlan(plan.id)}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-100 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-6 space-y-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <input
                              type="text"
                              value={editValues.topic}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, topic: e.target.value }))}
                              placeholder="Reja nomi"
                              className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                            />
                            <select
                              value={editValues.plan_type}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, plan_type: e.target.value }))}
                              className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                            >
                              {PLAN_TYPES.filter((type) => type !== 'all').map((type) => (
                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            value={editValues.content}
                            onChange={(e) => setEditValues((prev) => ({ ...prev, content: e.target.value }))}
                            rows={8}
                            className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                          />
                          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                              onClick={cancelEdit}
                              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >Bekor qilish</button>
                            <button
                              onClick={() => updatePlan(plan.id)}
                              disabled={saving}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60"
                            >
                              <Save size={14} /> Saqlash
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-6 prose prose-slate max-w-none text-slate-700">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {plan.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="sticky top-6 space-y-5">
              {/* Stats */}
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.2)]">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Statistika</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-900">Rejalar</h2>
                  </div>
                  <button
                    onClick={loadPlans}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <RefreshCcw size={14} /> Yangilash
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Jami', value: plans.length, color: 'indigo' },
                    { label: 'Kunlik', value: plans.filter(p => p.plan_type === 'daily').length, color: 'emerald' },
                    { label: 'Haftalik', value: plans.filter(p => p.plan_type === 'weekly').length, color: 'amber' },
                    { label: 'Oylik', value: plans.filter(p => p.plan_type === 'monthly').length, color: 'purple' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-2xl bg-${color}-50 p-4`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider text-${color}-500`}>{label}</p>
                      <p className={`text-3xl font-bold text-${color}-700 mt-1`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick create CTA */}
              <div className="rounded-[32px] bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white shadow-[0_24px_60px_-45px_rgba(99,102,241,0.35)]">
                <p className="text-sm uppercase tracking-[0.22em] text-indigo-100/90">AI Yordamchi</p>
                <h3 className="mt-4 text-xl font-semibold">Shaxsiy reja tuzing</h3>
                <p className="mt-3 text-sm leading-6 text-indigo-100/90">
                  Fan, daraja va maqsadingizni kiriting — AI sizga batafsil o'quv reja tuzib beradi.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 rounded-2xl text-[13px] font-bold hover:bg-indigo-50 transition-colors shadow-md"
                >
                  <Sparkles size={14} /> Boshlash
                </button>
              </div>

              {/* Tips */}
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Maslahatlar</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>📌 Reja nomi, turi yoki mazmuni bo'yicha tez qidirish</p>
                  <p>✏️ Har bir rejani tahrirlash va yangilash mumkin</p>
                  <p>🤖 AI bilan tejamkorlikda yanada yaxshi reja oling</p>
                  <p>🗑️ Keraksiz rejalarni o'chirib tashlang</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StudyPlansPage;
