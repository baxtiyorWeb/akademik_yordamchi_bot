import { useState } from 'react';
import { Sparkles, Zap, Shield, HelpCircle, Check, Flame } from 'lucide-react';
import { supabase } from '../supabase';
import { useProfile } from '../hooks/useProfile';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 100,
    features: [
      '100 ta AI Kredit',
      'AI Tutor Mode',
      'Oddiy tezlikdagi javoblar',
      'Standard qo\'llab-quvvatlash',
    ],
    popular: false,
    color: 'slate',
    glow: 'from-slate-500/10 to-slate-400/5',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19000,
    credits: 500,
    features: [
      '500 ta AI Kredit',
      'AI Tutor + Assignments',
      'Tezkor AI javoblar',
      'IELTSPrep va MathCenter ruxsati',
      'Ustuvor qo\'llab-quvvatlash',
    ],
    popular: false,
    color: 'blue',
    glow: 'from-blue-500/10 to-indigo-500/5',
  },
  {
    id: 'individual',
    name: 'Individual',
    price: 49000,
    credits: 1500,
    features: [
      '1500 ta AI Kredit (Eng yaxshi tanlov)',
      'Cheksiz shaxsiy o\'quv rejalari',
      'Juda tezkor AI javoblar',
      'Barcha modullar va yangi funksiyalar',
      '24/7 Premium qo\'llab-quvvatlash',
    ],
    popular: true,
    color: 'indigo',
    glow: 'from-indigo-600/20 to-purple-600/10',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 149000,
    credits: 5000,
    features: [
      '5000 ta AI Kredit (Cheksiz imkoniyat)',
      'OCR va audio tahlil modullari',
      'Eng yuqori tezlikdagi AI modellar',
      'VIP shaxsiy yordamchi',
      'Erta sinov ruxsatnomalari',
    ],
    popular: false,
    color: 'purple',
    glow: 'from-purple-600/20 to-pink-600/10',
  },
];

function PricingPage({ session }) {
  const { profile } = useProfile(session);
  const [loadingPlan, setLoadingPlan] = useState(null);

  const currentPlan = (profile?.plan || 'Free').toLowerCase();

  const handleSelectPlan = async (planId, price) => {
    if (planId === 'free' || price === 0) {
      toast.success("Free tarifidan avtomatik foydalanishingiz mumkin!");
      return;
    }

    if (currentPlan === planId) {
      toast.info("Siz allaqachon ushbu tarifdasiz!");
      return;
    }

    setLoadingPlan(planId);
    try {
      const response = await fetch('/api/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          planId: planId,
          userId: session.user.id,
          redirect_url: window.location.origin + '/payment-return'
        })
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Server xatosi yoki API javobi noto'g'ri (JSON emas).");
      }

      if (!response.ok) {
        throw new Error(responseData.error || responseData.detail || 'TSPay API error');
      }

      const { url } = responseData;
      if (!url) {
        throw new Error("To'lov havolasi olinmadi.");
      }

      // Redirect user to TSPay checkout URL
      window.location.href = url;
    } catch (err) {
      console.error(err);
      toast.error("To'lov tizimiga ulanishda xatolik: " + err.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-12 bg-slate-50 flex flex-col custom-scrollbar">
      <div className="max-w-6xl w-full mx-auto space-y-12 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-semibold border border-indigo-100/50 uppercase tracking-wider">
            <Sparkles size={14} className="animate-pulse" /> Obuna Tariflari
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
            Sizga mos keladigan tarifni tanlang
          </h1>
          <p className="text-[15px] text-slate-500 max-w-xl mx-auto leading-relaxed">
            Bizning moslashuvchan o'quv rejalari yordamida bilimingizni AI mentor bilan birgalikda oshiring.
          </p>
        </div>

        {/* Tarif Kartalari Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PLANS.map((plan) => {
            const isActive = currentPlan === plan.id;
            const isProcessing = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  plan.popular
                    ? 'border-indigo-600 ring-2 ring-indigo-600/10'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Neon Glow Bezag (Soft Glow) */}
                <div className={`absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 rounded-full bg-gradient-to-tr ${plan.glow} blur-2xl pointer-events-none`}></div>

                <div className="relative z-10 space-y-6">
                  {/* Badge-lar */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] font-bold uppercase tracking-widest ${
                      plan.popular ? 'text-indigo-600' : 'text-slate-400'
                    }`}>
                      {plan.name}
                    </span>
                    {plan.popular && (
                      <span className="flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        <Flame size={10} className="fill-white" /> OMMABOP
                      </span>
                    )}
                    {isActive && (
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border border-emerald-100 tracking-wider">
                        FAOL
                      </span>
                    )}
                  </div>

                  {/* Narx */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {plan.price.toLocaleString('uz-UZ')}
                      </span>
                      <span className="text-sm font-semibold text-slate-400">UZS</span>
                      {plan.price > 0 && <span className="text-xs text-slate-400 font-normal ml-0.5">/ oy</span>}
                    </div>
                    <p className="text-[12px] text-indigo-500 font-semibold flex items-center gap-1">
                      {plan.credits.toLocaleString()} ta AI kredit qo'shiladi
                    </p>
                  </div>

                  {/* Xususiyatlar */}
                  <ul className="space-y-3.5 pt-4 border-t border-slate-100">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-600 leading-snug">
                        <span className={`p-0.5 rounded-full shrink-0 ${
                          plan.popular ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Check size={12} strokeWidth={2.5} />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Xarid Tugmasi */}
                <div className="pt-8 relative z-10">
                  <button
                    onClick={() => handleSelectPlan(plan.id, plan.price)}
                    disabled={isActive || loadingPlan !== null}
                    className={`w-full py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-100'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : isActive ? (
                      'Joriy tarif'
                    ) : plan.price === 0 ? (
                      'Bepul foydalanish'
                    ) : (
                      'Ushbu tarifga o\'tish'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Xavfsizlik bo'limi */}
        <div className="flex flex-wrap justify-center items-center gap-8 text-slate-400 text-[12px] font-semibold pt-4">
          <span className="flex items-center gap-1.5">
            <Shield size={14} className="text-emerald-500" /> 100% Xavfsiz va Kafolatlangan To'lov tizimi (TSPay)
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden md:block"></span>
          <span className="flex items-center gap-1.5">
            <HelpCircle size={14} className="text-indigo-400" /> Savollaringiz bormi? Yordam markazi faol
          </span>
        </div>

      </div>
    </div>
  );
}

export default PricingPage;