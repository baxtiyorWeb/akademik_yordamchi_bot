import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Brain, Mail, Lock, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Ro\'yxatdan o\'tish muvaffaqiyatli! Emailingizni tasdiqlang.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Xush kelibsiz!');
        navigate('/tutor');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen mesh-gradient flex items-center justify-center p-6 relative overflow-hidden font-sans">

      {/* Background Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>

      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-white/40 backdrop-blur-3xl rounded-[48px] border border-white/50 shadow-[0_50px_100px_rgba(139,92,246,0.15)] overflow-hidden relative z-10 animate-in fade-in zoom-in duration-700">

        {/* Left Side: Auth Form */}
        <div className="p-10 lg:p-20 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-12 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:rotate-6 transition-transform"><Brain size={24} /></div>
            <span className="text-2xl font-black text-text-main tracking-tight">Typer AI</span>
          </div>

          <div className="mb-10">
            <h1 className="text-4xl font-black text-text-main mb-4 tracking-tight">{isSignUp ? 'Yangi hisob ochish' : 'Tizimga kirish'}</h1>
            <p className="text-text-muted font-bold opacity-70">Akademik muvaffaqiyat sari birinchi qadamni tashlang.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Email Manzil</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors"><Mail size={20} /></div>
                <input type="email" placeholder="misol@gmail.com" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-white rounded-3xl border border-border-custom outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-text-main transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-muted uppercase tracking-widest ml-1">Maxfiy So'z</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors"><Lock size={20} /></div>
                <input type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-white rounded-3xl border border-border-custom outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 font-bold text-text-main transition-all" />
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end"><button type="button" className="text-xs font-black text-primary hover:underline">Parolni unutdingizmi?</button></div>
            )}

            <button type="submit" disabled={loading} className="w-full py-5 bg-primary text-white rounded-3xl font-black text-lg shadow-2xl shadow-primary/30 hover:bg-primary-dark hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
              {loading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : (isSignUp ? "Ro'yxatdan o'tish" : "Kirish")}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-12">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-custom"></div></div>
              <span className="relative px-4 bg-white/0 text-[10px] font-black text-text-muted uppercase tracking-widest">Yoki davom eting</span>
            </div>



            <div className="mt-10 text-center">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm font-bold text-text-muted">
                {isSignUp ? "Hisobingiz bormi? " : "Hisobingiz yo'qmi? "}
                <span className="text-primary font-black hover:underline">{isSignUp ? "Kirish" : "Ro'yxatdan o'tish"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Features/Branding */}
        <div className="hidden lg:flex bg-gradient-to-br from-primary via-primary-dark to-indigo-900 p-20 flex-col justify-center text-white relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-64 h-64 bg-white rounded-full blur-[100px]"></div>
          </div>

          <div className="relative z-10 space-y-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full text-[10px] font-black tracking-widest uppercase border border-white/10"><Sparkles size={14} fill="currentColor" /> Premium Ta'lim Tizimi</div>

            <h2 className="text-5xl font-black leading-tight tracking-tight">Akademik hayotingizni <span className="text-sky-300 italic">avtomatlashtiring</span></h2>

            <div className="space-y-6">
              {[
                { icon: <CheckCircle2 className="text-sky-400" />, title: "Gemini 3.1 Flash-Lite AI", desc: "Eng yangi va tezkor multimodal modellar." },
                { icon: <ShieldCheck className="text-emerald-400" />, title: "Xavfsiz Ma'lumotlar", desc: "Sizning suhbatlaringiz to'liq maxfiy saqlanadi." },
                { icon: <Zap className="text-amber-400" />, title: "24/7 Qo'llab-quvvatlash", desc: "Har qanday savolga istalgan vaqtda javob." }
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-4 p-6 bg-white/5 rounded-[32px] border border-white/10 hover:bg-white/10 transition-all group">
                  <div className="mt-1 group-hover:scale-110 transition-transform">{f.icon}</div>
                  <div>
                    <h4 className="font-black text-lg mb-1">{f.title}</h4>
                    <p className="text-sm text-white/60 font-medium leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
