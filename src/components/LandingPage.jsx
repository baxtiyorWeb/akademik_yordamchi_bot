import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Sparkles, BookOpen, Zap, Star, Shield,
  ChevronRight, Menu, X, ArrowRight, Check,
  Globe, Code2, MessageSquare, TrendingUp,
  FileText, Notebook, Command, Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Solutions", href: "#solutions" },
];

const FEATURES = [
  {
    icon: <Zap size={20} strokeWidth={1.5} />,
    title: "Multimodal Intelligence",
    desc: "Analyze PDF, Video, and Audio files instantly using Gemini 3.1 Flash-Lite.",
  },
  {
    icon: <Brain size={20} strokeWidth={1.5} />,
    title: "Reasoning Engine",
    desc: "Solve complex mathematical and scientific problems with step-by-step logic.",
  },
  {
    icon: <Code2 size={20} strokeWidth={1.5} />,
    title: "Live Previews",
    desc: "Execute AI-generated code in real-time within your workspace environment.",
  },
];

const STATS = [
  { value: "50K+", label: "Active Learners" },
  { value: "2M+", label: "Tasks Solved" },
  { value: "99.9%", label: "System Uptime" },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);

    const ctx = gsap.context(() => {
      gsap.from('.hero-text', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.from('.hero-sub', { y: 20, opacity: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' });
      gsap.from('.hero-cta', { y: 20, opacity: 0, duration: 0.8, delay: 0.4, ease: 'power3.out' });
      
      gsap.from('.feature-item', {
        opacity: 0, y: 30, stagger: 0.1, duration: 0.6,
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
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white">
      
      {/* --- MINIMAL NAVBAR --- */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-panel py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} data-tooltip="Bosh sahifaga qaytish">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:bg-indigo-600 transition-colors">T</div>
            <span className="text-lg font-bold tracking-tight">Typer AI</span>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {NAV_LINKS.map(l => <a key={l.label} href={l.href} className="text-[13px] font-semibold text-neutral-500 hover:text-black transition-colors">{l.label}</a>)}
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button className="hidden sm:block text-[13px] font-semibold text-neutral-500 hover:text-black transition-colors" onClick={goToLogin}>Log in</button>
            <button className="btn-glow bg-black text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity" onClick={goToLogin} data-tooltip="Tizimga kirish yoki ro'yxatdan o'tish">
              Get Started
            </button>
            <button className="lg:hidden p-2 text-neutral-900" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION (STRIPE/LINEAR STYLE) --- */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-[0.03] pointer-events-none">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_#000_1px,_transparent_1px)] bg-[size:40px_40px]"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="hero-text inline-flex items-center gap-2 px-3 py-1 bg-neutral-50 border border-neutral-100 rounded-full text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-8">
            <Sparkles size={12} className="text-neutral-900" /> <span>Powered by Gemini 3.1 Flash-Lite</span>
          </div>
          <h1 className="hero-text text-5xl lg:text-7xl font-bold tracking-tight text-neutral-900 mb-8 heading-premium leading-[1.05]">
            The intelligent workspace <br/> for <span className="text-neutral-400">academic excellence.</span>
          </h1>
          <p className="hero-sub text-lg lg:text-xl text-neutral-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Typer AI centralizes your learning, research, and problem-solving into a single, high-performance environment.
          </p>
          <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="btn-glow bg-black text-white px-8 py-3.5 rounded-xl font-semibold text-[15px] shadow-xl shadow-black/10 hover:scale-105 transition-all flex items-center gap-2" onClick={goToLogin}>
              Start for free <ArrowRight size={18} />
            </button>
            <button className="text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 px-8 py-3.5 rounded-xl font-semibold text-[15px] transition-all flex items-center gap-2" onClick={() => navigate('/kids')} data-tooltip="Bolalar uchun maxsus rejim">
              Kids Mode <SmileIcon />
            </button>
          </div>
        </div>

        {/* Hero Visual Mockup (Linear Style) */}
        <div className="max-w-6xl mx-auto mt-24 relative">
           <div className="bg-neutral-50 border border-neutral-100 rounded-3xl p-4 shadow-2xl relative overflow-hidden group">
              <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm h-[500px] overflow-hidden flex">
                 <div className="w-56 border-r border-neutral-50 bg-neutral-50/30 p-6 space-y-4">
                    <div className="w-full h-8 bg-neutral-100 rounded-lg"></div>
                    <div className="space-y-2 pt-8">
                       <div className="w-full h-6 bg-neutral-100 rounded-md"></div>
                       <div className="w-4/5 h-6 bg-neutral-100 rounded-md"></div>
                       <div className="w-full h-6 bg-neutral-100 rounded-md"></div>
                    </div>
                 </div>
                 <div className="flex-1 p-10 space-y-8">
                    <div className="w-2/3 h-10 bg-neutral-50 rounded-xl"></div>
                    <div className="space-y-3">
                       <div className="w-full h-4 bg-neutral-50 rounded"></div>
                       <div className="w-full h-4 bg-neutral-50 rounded"></div>
                       <div className="w-1/2 h-4 bg-neutral-50 rounded"></div>
                    </div>
                    <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 max-w-lg ml-auto">
                       <div className="flex gap-2 mb-4">
                          <div className="w-2 h-2 bg-neutral-200 rounded-full"></div>
                          <div className="w-2 h-2 bg-neutral-200 rounded-full"></div>
                       </div>
                       <div className="space-y-2">
                          <div className="w-full h-3 bg-neutral-200/50 rounded"></div>
                          <div className="w-3/4 h-3 bg-neutral-200/50 rounded"></div>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-50 via-transparent to-transparent opacity-50"></div>
           </div>
        </div>
      </section>

      {/* --- STATS (MINIMAL) --- */}
      <section className="py-24 border-y border-neutral-50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {STATS.map((s, i) => (
            <div key={i} className="space-y-2">
               <div className="text-4xl font-bold tracking-tight text-neutral-900">{s.value}</div>
               <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* --- FEATURES (CENTERED GRID) --- */}
      <section className="py-40 px-6 bg-[#fcfcfc]" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-32 space-y-4">
             <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Features</div>
             <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-neutral-900 heading-premium">Engineered for depth.</h2>
             <p className="text-neutral-500 max-w-xl mx-auto font-medium leading-relaxed">High-performance tools that help you master complex subjects without the distraction.</p>
          </div>

          <div className="features-grid grid grid-cols-1 md:grid-cols-3 gap-16">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-item space-y-6 content-card p-8 border-none bg-white/60">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">{f.icon}</div>
                <h3 className="text-lg font-bold text-neutral-900">{f.title}</h3>
                <p className="text-[14px] text-neutral-500 leading-relaxed font-medium">{f.desc}</p>
                <div className="pt-2">
                   <button className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-black transition-colors flex items-center gap-1.5">Learn more <ChevronRight size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION (LINEAR STYLE) --- */}
      <section className="py-40 px-6 border-t border-neutral-50">
         <div className="max-w-3xl mx-auto text-center space-y-12 bg-neutral-900 p-16 rounded-[40px] text-white shadow-2xl relative overflow-hidden glass-panel !bg-slate-900/90 !border-slate-800">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.2),_transparent)]"></div>
            <h2 className="text-4xl font-bold tracking-tight relative z-10">Start your smart learning <br/> journey today.</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center relative z-10">
               <button className="btn-glow bg-white text-black px-10 py-3.5 rounded-xl font-bold shadow-xl hover:scale-105 transition-all" onClick={goToLogin}>Get Started</button>
               <button className="text-neutral-400 hover:text-white transition-colors font-semibold" onClick={() => navigate('/login')}>Sign in</button>
            </div>
            <div className="text-[10px] text-neutral-500 font-medium relative z-10 tracking-[0.1em] uppercase">No credit card required. Free tier available.</div>
         </div>
      </section>

      {/* --- FOOTER (MINIMAL) --- */}
      <footer className="py-20 px-6 border-t border-neutral-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
           <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white font-bold text-xs">T</div>
                 <span className="font-bold text-neutral-900">Typer AI</span>
              </div>
              <p className="text-[13px] text-neutral-400 max-w-xs font-medium leading-relaxed">Automating academic excellence through advanced multimodal intelligence.</p>
           </div>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-16">
              <div className="space-y-4">
                 <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-900">Product</div>
                 <div className="flex flex-col gap-2 text-[13px] font-medium text-neutral-500">
                    <a href="#" className="hover:text-black transition-colors">Features</a>
                    <a href="#" className="hover:text-black transition-colors">AI Mentor</a>
                    <a href="#" className="hover:text-black transition-colors">Math Center</a>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-900">Company</div>
                 <div className="flex flex-col gap-2 text-[13px] font-medium text-neutral-500">
                    <a href="#" className="hover:text-black transition-colors">About</a>
                    <a href="#" className="hover:text-black transition-colors">Privacy</a>
                    <a href="#" className="hover:text-black transition-colors">Terms</a>
                 </div>
              </div>
              <div className="space-y-4 hidden sm:block">
                 <div className="text-[11px] font-bold uppercase tracking-widest text-neutral-900">Connect</div>
                 <div className="flex flex-col gap-2 text-[13px] font-medium text-neutral-500">
                    <a href="#" className="hover:text-black transition-colors">Twitter</a>
                    <a href="#" className="hover:text-black transition-colors">GitHub</a>
                 </div>
              </div>
           </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-neutral-50 text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex justify-between">
           <span>© 2026 Typer AI. All rights reserved.</span>
           <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> All systems operational</div>
           </div>
        </div>
      </footer>

    </div>
  );
}

const SmileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
);

export default LandingPage;