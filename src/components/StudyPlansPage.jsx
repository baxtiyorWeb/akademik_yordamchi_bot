import { useState, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Search, Edit3, Save, ArrowRight, RefreshCcw, Cpu } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_TYPES = ['all', 'daily', 'weekly', 'monthly', 'custom'];

const StudyPlansPage = ({ session }) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ topic: '', plan_type: '', content: '' });

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

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

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

  const openInTutor = (plan) => {
    navigate('/tutor', { state: { assistPlan: plan } });
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-100 overflow-scroll">
      <div className="mx-auto flex h-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_-35px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold text-slate-900">Saqlangan Rejalar</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">Bu sahifada barcha rejalar ro‘yxati, filterlash va tahrirlash imkoniyati mavjud. Markdown style va zamonaviy karta dizayni yordamida rejalarni oson boshqarishingiz mumkin.</p>
            </div>
            <button
              onClick={() => navigate('/tutor')}
              className="inline-flex items-center gap-2 rounded-3xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200/40 hover:bg-indigo-700 transition"
            >
              <ArrowRight size={16} /> Tutor sahifasiga qaytish
            </button>
          </div>
        </div>

        <div className="grid flex-1 gap-6 xl:grid-cols-[1.65fr_0.85fr]">
          <section className="space-y-5 overflow-y-auto rounded-[32px] h-200">
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Reja nomi, turi yoki mazmuni bo‘yicha qidirish"
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

            <div className="space-y-4 overflow-hidden">
              {loading ? (
                <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center text-slate-500">Rejalar yuklanmoqda...</div>
              ) : filteredPlans.length === 0 ? (
                <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center text-slate-500">Hech qanday reja topilmadi.</div>
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
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => startEdit(plan)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Edit3 size={14} /> O‘zgartirish
                          </button>
                          <button
                            onClick={() => openInTutor(plan)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                          >
                            <Cpu size={14} /> AI bilan tekshirish
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

          <aside className="space-y-5">
            <div className="sticky top-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.2)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Filterlar va yordam</p>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">Reja boshqaruvi</h2>
                </div>
                <button
                  onClick={loadPlans}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  <RefreshCcw size={14} /> Yangilash
                </button>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <p>- Reja nomi, turi yoki mazmuni bo‘yicha tez qidirish.</p>
                <p>- Har bir reja markdown ko‘rinishida chiroyli aks etadi.</p>
                <p>- O‘zgartirish va AI bilan tekshirish bir joyda.</p>
              </div>
            </div>
            <div className="rounded-[32px] bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white shadow-[0_24px_60px_-45px_rgba(99,102,241,0.35)]">
              <p className="text-sm uppercase tracking-[0.22em] text-indigo-100/90">Virtual yordamchi</p>
              <h3 className="mt-4 text-xl font-semibold">Rejalarni AI bilan darhol tekshiring</h3>
              <p className="mt-3 text-sm leading-6 text-indigo-100/90">Tanlangan rejani Tutor sahifasiga yuboring va AI dan yanada yaxshi, foydali va aniqroq reja oling.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StudyPlansPage;
