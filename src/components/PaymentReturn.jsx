import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Zap, ArrowRight } from 'lucide-react';
import { supabase } from '../supabase';

function PaymentReturn({ session }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking | success | failed | error
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!session?.user?.id) {
        setStatus('error');
        return;
      }

      try {
        // Check the latest payment for this user
        const { data: payments, error } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error || !payments || payments.length === 0) {
          setStatus('error');
          return;
        }

        const latestPayment = payments[0];
        setPaymentInfo(latestPayment);

        if (latestPayment.status === 'success') {
          setStatus('success');
        } else if (latestPayment.status === 'pending') {
          // Payment might still be processing, poll a few times
          let attempts = 0;
          const maxAttempts = 6;
          const pollInterval = setInterval(async () => {
            attempts++;
            const { data: updated } = await supabase
              .from('payments')
              .select('*')
              .eq('id', latestPayment.id)
              .single();

            if (updated?.status === 'success') {
              setPaymentInfo(updated);
              setStatus('success');
              clearInterval(pollInterval);
            } else if (attempts >= maxAttempts) {
              setStatus('pending');
              clearInterval(pollInterval);
            }
          }, 3000);

          return () => clearInterval(pollInterval);
        } else {
          setStatus('failed');
        }
      } catch (err) {
        console.error('Payment check error:', err);
        setStatus('error');
      }
    };

    checkPaymentStatus();
  }, [session]);

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center px-6 py-16 bg-white nano-bg">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in duration-700">
        
        {status === 'checking' && (
          <>
            <div className="w-20 h-20 mx-auto bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100">
              <Loader2 size={32} className="text-indigo-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-normal text-slate-900 tracking-tight">To'lov tekshirilmoqda...</h2>
              <p className="text-[13px] text-slate-400 font-normal">Biroz kuting, to'lov holatini tekshiryapmiz</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-100 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-normal text-slate-900 tracking-tight">To'lov muvaffaqiyatli!</h2>
              <p className="text-[13px] text-slate-400 font-normal">
                {paymentInfo?.plan_name} tarifiga muvaffaqiyatli o'tdingiz
              </p>
              {paymentInfo && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-medium border border-indigo-100 mt-2">
                  <Zap size={12} className="fill-indigo-600" />
                  {paymentInfo.plan_name} Plan · {Number(paymentInfo.amount).toLocaleString()} UZS
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all shadow-lg shadow-slate-200 cursor-pointer"
            >
              Profilga o'tish <ArrowRight size={14} />
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-20 h-20 mx-auto bg-amber-50 rounded-3xl flex items-center justify-center border border-amber-100">
              <Loader2 size={32} className="text-amber-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-normal text-slate-900 tracking-tight">To'lov kutilmoqda</h2>
              <p className="text-[13px] text-slate-400 font-normal leading-relaxed">
                To'lov hali qayta ishlanmagan. Iltimos, bir necha daqiqadan keyin profilingizni tekshiring.
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all shadow-lg shadow-slate-200 cursor-pointer"
            >
              Profilga o'tish <ArrowRight size={14} />
            </button>
          </>
        )}

        {(status === 'failed' || status === 'error') && (
          <>
            <div className="w-20 h-20 mx-auto bg-rose-50 rounded-3xl flex items-center justify-center border border-rose-100">
              <XCircle size={36} className="text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-normal text-slate-900 tracking-tight">To'lov amalga oshmadi</h2>
              <p className="text-[13px] text-slate-400 font-normal leading-relaxed">
                To'lov bekor qilindi yoki xatolik yuz berdi. Qaytadan urinib ko'ring.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/pricing')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all shadow-lg shadow-slate-200 cursor-pointer"
              >
                Qaytadan urinish
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[13px] font-medium hover:bg-slate-50 transition-all cursor-pointer"
              >
                Profilga o'tish
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default PaymentReturn;
