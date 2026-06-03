import { useState } from 'react';
import { Sparkles, Coins, Zap, Shield, HelpCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { useProfile } from '../hooks/useProfile';
import { toast } from 'sonner';

const CREDIT_PRICE_UZS = 50; 

function PricingPage({ session }) {
  const { profile } = useProfile(session);
  const [loading, setLoading] = useState(false);
  
  const [credits, setCredits] = useState(200);

  const totalPrice = credits * CREDIT_PRICE_UZS;
  const estimatedMessages = Math.floor(credits / 1); 

  const currentCredits = profile?.credits || 0;

  const handlePayment = async () => {
    if (totalPrice < 5000) {
      toast.error("Minimal to'lov miqdori 5,000 UZS");
      return;
    }

    setLoading(true);
    try {
      const { data: payment, error: dbError } = await supabase
        .from('payments')
        .insert([{
          user_id: session.user.id,
          amount: totalPrice,
          plan_name: `${credits} Kredit`,
          status: 'pending'
        }])
        .select()
        .single();
        
      if (dbError) throw dbError;
      
      const response = await fetch('/api/create-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount: totalPrice,
          order_id: payment.id,
          redirect_url: window.location.origin + '/payment-return'
        })
      });
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Server xatosi yoki API ishlamayapti (JSON o'rniga HTML qaytdi).");
      }

      if (!response.ok) {
        throw new Error(responseData.detail || 'TSPay API error');
      }
      
      const { payment_url } = responseData;
      if (!payment_url) {
        throw new Error("To'lov havolasi olinmadi.");
      }
      window.location.href = payment_url;
      
    } catch (err) {
      console.error(err);
      toast.error("To'lov tizimiga ulanishda xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-12 bg-[#FAFAFA] flex flex-col custom-scrollbar">
      {/* Wrapper max-w-5xl qilib kengaytirildi */}
      <div className="max-w-5xl w-full mx-auto space-y-10 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 text-indigo-600 rounded-full text-[11px] font-medium border border-indigo-100/50">
            <Sparkles size={14} /> Pay-As-You-Go
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Kreditli Balans Tizimi</h1>
          <p className="text-[15px] text-slate-500 max-w-xl mx-auto leading-relaxed">
            Ortiqcha obunalar shart emas. Faqat o'zingizga kerakli miqdorda kredit sotib oling va xizmatlardan erkin foydalaning.
          </p>
        </div>

        {/* Joriy balans kartasi - o'rtacha kattalikda */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm flex items-center justify-between max-w-2xl mx-auto w-full transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100/50 text-amber-500">
              <Coins size={22} />
            </div>
            <div>
              <p className="text-[13px] text-slate-500 mb-0.5">Sizning joriy balansingiz</p>
              <p className="text-xl font-semibold text-slate-900">{currentCredits} <span className="text-sm font-medium text-slate-400">Kredit</span></p>
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-medium border border-emerald-100/50">
            Faol
          </span>
        </div>

        {/* Kalkulyator & Slider Box */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/60 shadow-sm">
          {/* Assimetrik grid: Chap tomon kengroq (col-span-3), o'ng tomon torroq (col-span-2) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            
            {/* Chap tomondagi boshqaruv (Slider) */}
            <div className="lg:col-span-3 flex flex-col justify-center space-y-8">
              
              <div className="flex items-end justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="text-[15px] font-medium text-slate-900 flex items-center gap-2">
                    Kredit Miqdorini Tanlang
                  </span>
                  <p className="text-[13px] text-slate-500">Slayderni surish orqali kerakli miqdorni belgilang</p>
                </div>
                <span className="text-2xl font-semibold text-indigo-600">
                  {credits}
                </span>
              </div>

              {/* Slider */}
              <div className="space-y-3 pt-2">
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
                />
                <div className="flex justify-between text-[12px] text-slate-400 font-medium px-1">
                  <span>100</span>
                  <span>500</span>
                  <span>1000</span>
                  <span>2000</span>
                </div>
              </div>

              {/* Info qismi */}
              <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 space-y-3">
                <p className="text-[13px] font-medium text-slate-700">Bu kreditlar nimalarga yetadi?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    Taxminan <strong className="text-slate-900 font-medium">{estimatedMessages} ta</strong> xabar
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <strong className="text-slate-900 font-medium">{Math.floor(credits / 5)} ta</strong> fayl tahlili
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Amal qilish muddati: <strong className="text-slate-900 font-medium">Cheksiz</strong> (Kuymaydi)
                  </div>
                </div>
              </div>
            </div>

            {/* O'ng tomondagi narx va xarid paneli */}
            <div className="lg:col-span-2 bg-[#0F172A] text-white rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden">
              {/* Orqa fon bezagi (Soft glow) */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
              
              <div className="space-y-2 relative z-10">
                <span className="text-[12px] text-slate-400 font-medium uppercase tracking-wider">Umumiy Qiymat</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-semibold tracking-tight">
                    {totalPrice.toLocaleString('uz-UZ')}
                  </span>
                  <span className="text-lg text-slate-400 font-normal">UZS</span>
                </div>
                <p className="text-[13px] text-slate-400 pt-4 border-t border-slate-800/50 mt-4 leading-relaxed">
                  Hech qanday yashirin to'lovlarsiz. 1 kredit narxi aniq {CREDIT_PRICE_UZS} UZS qilib belgilangan.
                </p>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full mt-8 py-3.5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 text-white font-medium rounded-xl text-[14px] transition-colors active:scale-[0.99] flex items-center justify-center gap-2 relative z-10"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Zap size={16} /> Balansni To'ldirish
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Xavfsizlik bo'limi - minimalist */}
        <div className="flex justify-center items-center gap-8 text-slate-400 text-[12px] font-medium pt-2 pb-8">
          <span className="flex items-center gap-2"><Shield size={14} className="text-emerald-500" /> Xavfsiz To'lov</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 hidden md:block"></span>
          <span className="flex items-center gap-2"><HelpCircle size={14} className="text-indigo-400" /> 24/7 Qo'llab-quvvatlash</span>
        </div>

      </div>
    </div>
  );
}

export default PricingPage;