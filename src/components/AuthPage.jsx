import { useState } from 'react';
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
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin + '/login'
          }
        });
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
    <div className="min-h-screen w-screen bg-[#f8fafc] flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">

      {/* Dashboard interfeysidagi kabi yumshoq Mesh Gradient orqa fonlar */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-tr from-indigo-200/40 to-purple-200/30 rounded-full blur-[140px] animate-pulse duration-[6s]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-sky-200/40 to-indigo-200/30 rounded-full blur-[140px] animate-pulse duration-[8s] delay-1000"></div>
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-pink-200/20 rounded-full blur-[120px]"></div>

      {/* Asosiy Glassmorphism Kontayner */}
      <div className="w-full max-w-[1050px] grid grid-cols-1 lg:grid-cols-2 bg-white/60 backdrop-blur-2xl rounded-[32px] md:rounded-[40px] border border-white/80 shadow-[0_32px_64px_-16px_rgba(99,102,241,0.12)] overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500">

        {/* Chap tomon: Yangilangan Elegant Auth Formasi */}
        <div className="p-8 md:p-14 lg:p-16 flex flex-col justify-center bg-white/30 backdrop-blur-md">
          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-10 cursor-pointer group w-fit" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-all duration-300">
              <Brain size={20} />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Typer <span className="text-indigo-600">AI</span></span>
          </div>

          {/* Sarlavha */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2.5 tracking-tight">
              {isSignUp ? 'Yangi hisob ochish' : 'Tizimga kirish'}
            </h1>
            <p className="text-[14px] font-medium text-slate-500 leading-relaxed">
              Akademik muvaffaqiyat sari birinchi qadamni tashlang.
            </p>
          </div>

          {/* Forma */}
          <form onSubmit={handleAuth} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Manzil</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="misol@gmail.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-5 py-3.5 bg-white/70 border border-slate-200/80 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-medium text-[14px] text-slate-900 transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Maxfiy So'z</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-5 py-3.5 bg-white/70 border border-slate-200/80 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 font-medium text-[14px] text-slate-900 transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            {/* Parolni unutdingizmi */}
            {!isSignUp && (
              <div className="flex justify-end">
                <button type="button" className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
                  Parolni unutdingizmi?
                </button>
              </div>
            )}

            {/* Kirish Tugmasi (Asosiy dashboard stilida) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold text-[15px] shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSignUp ? "Ro'yxatdan o'tish" : "Kirish"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Pastki qism */}
          <div className="mt-8">
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/60"></div>
              </div>
              <span className="relative px-3 bg-transparent text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Yoki
              </span>
            </div>

            <div className="text-center">
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors">
                {isSignUp ? "Hisobingiz bormi? " : "Hisobingiz yo'qmi? "}
                <span className="text-indigo-600 font-semibold hover:underline">{isSignUp ? "Kirish" : "Ro'yxatdan o'tish"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Features/Branding */}
        {/* Right Side: Features/Branding */}
        <div className="hidden lg:flex bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-16 flex-col justify-center text-white relative border-l border-white/5">
          {/* Ichki neon nur effektlari */}
          <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-sky-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 space-y-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.06] backdrop-blur-md rounded-full text-[10px] font-semibold tracking-wider uppercase border border-white/10 text-indigo-300">
              <Sparkles size={12} className="text-indigo-400" /> Intellektual Ta'lim Platformasi
            </div>

            <h2 className="text-4xl font-bold leading-[1.25] tracking-tight text-slate-100">
              Akademik hayotingizni <br />
              <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent font-extrabold">
                avtomatlashtiring
              </span>
            </h2>

            <div className="space-y-4">
              {[
                {
                  icon: <Brain size={18} className="text-sky-400" />,
                  title: "Shaxsiy Mentor (Tutor Mode)",
                  desc: "Murakkab mavzularni zerikarli ma'ruzalarsiz, oddiy va tushunarli tilda o'rgatuvchi aqlli suhbatdosh."
                },
                {
                  icon: <Sparkles size={18} className="text-indigo-400" />,
                  title: "Mas’uliyatli va Baholovchi Ilk AI",
                  desc: "Bilimingizni shunchaki tekshirmaydi, balki real vaqtda xatolaringizni tahlil qilib, xolis baho berib boradi."
                },
                {
                  icon: <CheckCircle2 size={18} className="text-emerald-400" />,
                  title: "Vazifalar Nazorati (Assignments)",
                  desc: "O'quv rejangiz va topshiriqlaringizni tartibga solib, kunlik o'sishingizni daqiqama-daqiqa hisoblab boradi."
                }
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3.5 p-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/[0.05] transition-all duration-300">
                  <div className="mt-0.5">{f.icon}</div>
                  <div>
                    <h4 className="font-semibold text-[15px] text-slate-200 mb-0.5">{f.title}</h4>
                    <p className="text-[13px] text-slate-400 font-normal leading-relaxed">{f.desc}</p>
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