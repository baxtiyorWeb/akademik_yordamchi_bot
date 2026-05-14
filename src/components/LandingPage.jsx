import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Sparkles, BookOpen, Zap, Star, Shield,
  ChevronRight, Menu, X, ArrowRight, Check,
  Globe, Code2, MessageSquare, TrendingUp,
  FileText, Notebook
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const NAV_LINKS = [
  { label: "Imkoniyatlar", href: "#features" },
  { label: "Narxlar", href: "#pricing" },
  { label: "Statistika", href: "#stats" },
];

const FEATURES = [
  {
    icon: <Zap size={24} />,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    title: "Gemini 3.1 Flash-Lite",
    desc: "2026-yilning eng yangi va tezkor multimodal AI modeli yordamida daqiqa ichida javob oling.",
    tags: ["Fast", "Multimodal", "2026"],
  },
  {
    icon: <Brain size={24} />,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    title: "Thinking Engine",
    desc: "Murakkab matematik va ilmiy masalalarni qadamba-qadam mantiqiy tahlil qilish tizimi.",
    tags: ["Reasoning", "Step-by-Step", "Logic"],
  },
  {
    icon: <FileText size={24} />,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Multimodal Tahlil",
    desc: "Faqat matn emas, balki PDF, Video va Audio fayllarni chat ichida tahlil qiling.",
    tags: ["PDF", "Video", "Audio"],
  },
  {
    icon: <Code2 size={24} />,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Vibe Coding",
    desc: "AI tomonidan yaratilgan kodlarni real vaqtda brauzerda ishga tushiring va natijani ko'ring.",
    tags: ["Live Preview", "Coding", "Fix"],
  },
  {
    icon: <Notebook size={24} />,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    title: "Aqlli Daftar",
    desc: "Muhim akademik ma'lumotlarni konspekt qiling va bulutli xotirada saqlang.",
    tags: ["Notes", "Cloud", "Academic"],
  },
  {
    icon: <Star size={24} />,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    title: "AI Quiz Generator",
    desc: "O'quv materiallaringiz asosida avtomatik testlar va savollar to'plamini yarating.",
    tags: ["Quiz", "Exam", "Prep"],
  },
];

const STATS = [
  { value: "50K+", label: "Faol foydalanuvchi", icon: <TrendingUp size={20} /> },
  { value: "2M+", label: "Javob berildi", icon: <MessageSquare size={20} /> },
  { value: "98%", label: "Qoniqish darajasi", icon: <Star size={20} /> },
  { value: "24/7", label: "Doim tayyor", icon: <Zap size={20} /> },
];

const PLANS = [
  {
    name: "Bepul",
    price: "0",
    desc: "Boshlash uchun",
    features: ["50 ta kredit/oy", "Interaktiv chat", "Barcha fanlar", "Chat tarixi", "Aqlli daftar"],
    cta: "Bepul boshlash",
    highlight: false,
  },
  {
    name: "Pro",
    price: "49,000",
    desc: "Jiddiy o'quvchilar uchun",
    features: ["1,000 ta kredit/oy", "Ustuvor javob", "Quiz generatsiya", "Email qo'llab-quvvatlash", "Kredit ko'tarish"],
    cta: "Pro olish",
    highlight: true,
    badge: "Eng mashhur",
  },
  {
    name: "Premium",
    price: "99,000",
    desc: "Cheksiz imkoniyat",
    features: ["Cheksiz kredit", "Eng tez javob", "Barcha Pro imkoniyatlar", "Shaxsiy mentor rejimi", "API kirish"],
    cta: "Premium olish",
    highlight: false,
  },
];

function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const num = parseInt(target.replace(/\D/g, '')) || 0;
    if (!num) return;
    const step = num / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, num);
      setCount(Math.floor(current));
      if (current >= num) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { ref, count };
}

function StatItem({ value, label, icon }) {
  const { ref, count } = useCountUp(value);
  const suffix = value.replace(/[\d,]/g, '');
  const prefix = value.startsWith('$') ? '$' : '';
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white rounded-3xl shadow-sm border border-border-custom" ref={ref}>
      <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">{icon}</div>
      <div className="text-3xl font-black text-text-main mb-1">
        {prefix}{value.includes(',') ? count.toLocaleString() : count}{suffix}
      </div>
      <div className="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);

    const ctx = gsap.context(() => {
      gsap.from('.hero-content > *', { y: 30, opacity: 0, stagger: 0.2, duration: 1, ease: 'power4.out' });
      gsap.from('.hero-visual', { scale: 0.9, opacity: 0, duration: 1.2, delay: 0.5, ease: 'elastic.out(1, 0.75)' });
      
      gsap.from('.feature-card', {
        opacity: 0, y: 40, stagger: 0.1, duration: 0.8,
        scrollTrigger: { trigger: '.features-grid', start: 'top 85%' }
      });
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      ctx.revert();
    };
  }, []);

  const goToLogin = () => navigate('/login');

  return (
    <div className="min-h-screen bg-bg-main font-sans selection:bg-primary/30">
      
      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl py-3 shadow-lg' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-12 transition-transform">
              <Brain size={20} />
            </div>
            <span className="text-xl font-black text-text-main tracking-tight">Cortex AI</span>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map(l => <a key={l.label} href={l.href} className="text-sm font-bold text-text-muted hover:text-primary transition-colors">{l.label}</a>)}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button className="hidden sm:block text-sm font-bold text-text-main px-4 py-2 hover:bg-primary/5 rounded-xl transition-all" onClick={goToLogin}>{t('login', 'Kirish')}</button>
            <button className="bg-primary text-white text-sm font-bold px-6 py-3 rounded-xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2" onClick={goToLogin}>
              Bepul boshlash <ChevronRight size={16} />
            </button>
            <button className="lg:hidden p-2 text-text-main" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 top-[72px] bg-white z-40 p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
             {NAV_LINKS.map(l => <a key={l.label} href={l.href} className="text-2xl font-bold text-text-main" onClick={() => setMenuOpen(false)}>{l.label}</a>)}
             <button className="mt-4 w-full py-4 bg-primary text-white rounded-2xl font-bold" onClick={goToLogin}>Bepul boshlash</button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="hero-content relative z-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold mb-8 animate-in fade-in slide-in-from-top-4">
              <Sparkles size={14} fill="currentColor" /> <span>Gemini 3.1 Flash-Lite bilan ishlaydi</span>
              <span className="bg-primary text-white px-1.5 py-0.5 rounded text-[9px] ml-1">BETA</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-text-main leading-[1.1] mb-6 tracking-tight">
              Akademik muvaffaqiyatni <span className="text-primary italic">AI bilan</span> zabt eting
            </h1>
            <p className="text-lg lg:text-xl text-text-muted mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Til, matematika va dasturlash bo'yicha dunyodagi eng ilg'or AI agentlari yordamida bepul ta'lim oling.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="bg-primary text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3" onClick={goToLogin}>
                <Zap size={22} fill="currentColor" /> Bepul boshlash
              </button>
              <button className="bg-white border border-border-custom text-text-main px-10 py-5 rounded-2xl font-bold text-lg hover:bg-primary/5 transition-all" onClick={() => navigate('/kids')}>
                 Bolalar rejimi ✨
              </button>
            </div>
          </div>

          <div className="hero-visual relative lg:block hidden">
            <div className="bg-white/80 backdrop-blur-3xl rounded-[40px] p-8 shadow-2xl border border-white/50 rotate-3 transform-gpu hover:rotate-0 transition-transform duration-700">
               <div className="flex gap-2 mb-6">
                 <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                 <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                 <div className="w-3 h-3 bg-green-400 rounded-full"></div>
               </div>
               <div className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-2xl rounded-tr-none self-end ml-12 text-sm font-medium text-primary">Ingliz tili Present Perfect ni tushuntirib ber</div>
                  <div className="bg-white border border-border-custom p-5 rounded-2xl rounded-tl-none mr-12 shadow-sm">
                    <div className="flex items-center gap-2 text-primary font-bold text-[10px] mb-2 uppercase tracking-widest"><Brain size={14} /> AI Expert</div>
                    <p className="text-sm leading-relaxed text-text-main">Present Perfect — o'tgan harakatni hozirgi natija bilan bog'laydi. <br/><br/> 📌 I <b>have finished</b> my homework.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 px-6" id="stats">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s, i) => <StatItem key={i} {...s} />)}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-32 px-6" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
             <div className="text-primary font-bold text-xs uppercase tracking-widest mb-4">Imkoniyatlar</div>
             <h2 className="text-4xl lg:text-5xl font-black text-text-main mb-6">Barcha fanlar, <span className="text-primary italic">bir joyda</span></h2>
             <p className="text-text-muted max-w-2xl mx-auto">O'quv dasturingizga mos har qanday savol bering — AI daqiqa ichida javob beradi</p>
          </div>

          <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card bg-white p-8 rounded-[32px] border border-border-custom hover:border-primary hover:shadow-2xl transition-all duration-500 group">
                <div className={`w-14 h-14 ${f.bg} ${f.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>{f.icon}</div>
                <h3 className="text-xl font-bold text-text-main mb-4">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-6">{f.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map(t => <span key={t} className={`text-[10px] font-bold px-3 py-1 rounded-full ${f.bg} ${f.color}`}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-32 px-6 bg-bg-sidebar/50" id="pricing">
         <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
               <div className="text-primary font-bold text-xs uppercase tracking-widest mb-4">Narxlar</div>
               <h2 className="text-4xl lg:text-5xl font-black text-text-main mb-6">Sizga mos <span className="text-primary italic">rejani tanlang</span></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pricing-grid">
               {PLANS.map((plan, i) => (
                 <div key={i} className={`bg-white p-10 rounded-[40px] border transition-all duration-500 flex flex-col ${plan.highlight ? 'border-primary shadow-2xl scale-105 relative z-10' : 'border-border-custom hover:border-primary/30'}`}>
                    {plan.badge && <div className="absolute top-6 right-6 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{plan.badge}</div>}
                    <div className="text-xl font-bold text-text-muted mb-6">{plan.name}</div>
                    <div className="mb-8">
                       <span className="text-4xl font-black text-text-main">{plan.price}</span>
                       <span className="text-text-muted text-sm ml-2">UZS / oy</span>
                    </div>
                    <ul className="space-y-4 mb-10 flex-1">
                       {plan.features.map(f => <li key={f} className="flex items-center gap-3 text-sm text-text-main font-medium"><Check size={16} className="text-primary" /> {f}</li>)}
                    </ul>
                    <button className={`w-full py-5 rounded-2xl font-bold transition-all ${plan.highlight ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105' : 'bg-bg-main text-text-main hover:bg-primary/10'}`} onClick={goToLogin}>
                       {plan.cta}
                    </button>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-border-custom bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white"><Brain size={18} /></div>
              <span className="font-bold text-text-main">Cortex AI</span>
           </div>
           <p className="text-sm text-text-muted">© 2026 Cortex AI. Barcha huquqlar himoyalangan.</p>
           <div className="flex gap-6 text-sm font-bold text-text-muted">
              <a href="#" className="hover:text-primary transition-colors">Maxfiylik</a>
              <a href="#" className="hover:text-primary transition-colors">Shartlar</a>
              <a href="#" className="hover:text-primary transition-colors">Aloqa</a>
           </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;