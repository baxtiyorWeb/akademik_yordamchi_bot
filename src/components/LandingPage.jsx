import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Sparkles, BookOpen, Zap, Star, Shield,
  ChevronRight, Menu, X, ArrowRight, Check,
  Globe, Calculator, Code2, PenTool, MessageSquare, TrendingUp,
  FileText, Notebook
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

const NAV_LINKS = [
  { label: "Imkoniyatlar", href: "#features" },
  { label: "Narxlar", href: "#pricing" },
  { label: "Statistika", href: "#stats" },
];

const FEATURES = [
  {
    icon: <Zap size={24} />,
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.12)",
    title: "Gemini 3.1 Flash-Lite",
    desc: "2026-yilning eng yangi va tezkor multimodal AI modeli yordamida daqiqa ichida javob oling.",
    tags: ["Fast", "Multimodal", "2026"],
  },
  {
    icon: <Brain size={24} />,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    title: "Thinking Engine",
    desc: "Murakkab matematik va ilmiy masalalarni qadamba-qadam mantiqiy tahlil qilish tizimi.",
    tags: ["Reasoning", "Step-by-Step", "Logic"],
  },
  {
    icon: <FileText size={24} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    title: "Multimodal Tahlil",
    desc: "Faqat matn emas, balki PDF, Video va Audio fayllarni chat ichida tahlil qiling.",
    tags: ["PDF", "Video", "Audio"],
  },
  {
    icon: <Code2 size={24} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    title: "Vibe Coding",
    desc: "AI tomonidan yaratilgan kodlarni real vaqtda brauzerda ishga tushiring va natijani ko'ring.",
    tags: ["Live Preview", "Coding", "Fix"],
  },
  {
    icon: <Notebook size={24} />,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    title: "Aqlli Daftar",
    desc: "Muhim akademik ma'lumotlarni konspekt qiling va bulutli xotirada saqlang.",
    tags: ["Notes", "Cloud", "Academic"],
  },
  {
    icon: <Star size={24} />,
    color: "#eab308",
    bg: "rgba(234,179,8,0.12)",
    title: "AI Quiz Generator",
    desc: "O'quv materiallaringiz asosida avtomatik testlar va savollar to'plamini yarating.",
    tags: ["Quiz", "Exam", "Prep"],
  },
  {
    icon: <FileText size={24} />,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    title: "Eksport Markazi",
    desc: "AI javoblarini bir soniyada PDF, Word, Excel yoki Slayd (PPTX) formatlariga aylantiring.",
    tags: ["PDF", "Word", "Excel", "PPTX"],
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

const TESTIMONIALS = [
  {
    name: "Jasur Toshmatov",
    role: "IELTS tayyorgarlik",
    avatar: "JT",
    color: "#6366f1",
    text: "IELTS 7.0 ball oldim! LingoAI menga Writing va Speaking da juda katta yordam berdi. Ustozdan ham yaxshiroq tushuntiradi!",
    rating: 5,
  },
  {
    name: "Malika Yusupova",
    role: "Universitet 2-kurs",
    avatar: "MY",
    color: "#10b981",
    text: "Matematika imtihonlarimga tayyorlanishda zo'r yordam bo'ldi. Har bir qadamni batafsil tushuntiradi, juda qulay.",
    rating: 5,
  },
  {
    name: "Bobur Rahimov",
    role: "Junior Developer",
    avatar: "BR",
    color: "#3b82f6",
    text: "Python o'rganishda eng yaxshi platforma. Kodlarimni tekshirib, xatolarni tushuntiradi. Juda tavsiya qilaman!",
    rating: 5,
  },
];

// ── Counter Animation Hook ────────────────────────────────────────────────────
function useCountUp(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
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
    <div className="stat-item" ref={ref}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">
        {prefix}{value.includes(',') ? count.toLocaleString() : count}{suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);

    const onMouseMove = (e) => {
      const cards = document.querySelectorAll('.feature-card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--x', `${x}%`);
        card.style.setProperty('--y', `${y}%`);
      });
    };
    window.addEventListener('mousemove', onMouseMove);

    // GSAP Animations
    const ctx = gsap.context(() => {
      // Register again just in case
      gsap.registerPlugin(ScrollTrigger);

      // Hero Animations
      gsap.from('.hero-badge', { y: -20, opacity: 0, duration: 0.8, ease: 'back.out(1.7)' });
      gsap.from('.hero-title', { y: 30, opacity: 0, duration: 1, delay: 0.2, ease: 'power4.out' });
      gsap.from('.hero-sub', { y: 20, opacity: 0, duration: 1, delay: 0.4, ease: 'power3.out' });
      gsap.from('.hero-actions', { y: 20, opacity: 0, duration: 1, delay: 0.6, ease: 'power3.out' });
      gsap.from('.hero-social-proof', { opacity: 0, duration: 1, delay: 0.8 });
      gsap.from('.hero-visual', { scale: 0.9, opacity: 0, duration: 1.2, delay: 0.5, ease: 'elastic.out(1, 0.75)' });

      // Floating Orbs
      gsap.to('.hero-orb', {
        y: 'random(-40, 40)',
        x: 'random(-40, 40)',
        duration: 'random(3, 6)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      // Stats Animation
      gsap.from('.stat-item', {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.8,
        scrollTrigger: {
          trigger: '.stats-grid',
          start: 'top 90%'
        }
      });

      // Feature Cards Scroll Effect - Improved with stagger
      gsap.from('.feature-card', {
        opacity: 0,
        y: 40,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });

      // Pricing Cards
      gsap.from('.pricing-card', {
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 1,
        ease: 'back.out(1.4)',
        scrollTrigger: {
          trigger: '.pricing-grid',
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });

      // Step Cards
      gsap.from('.step-card', {
        opacity: 0,
        x: -30,
        stagger: 0.2,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.steps-grid',
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      });

      // Refresh scroll trigger after a small delay to ensure layout is settled
      setTimeout(() => ScrollTrigger.refresh(), 500);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      ctx.revert();
    };
  }, []);

  const goToLogin = () => navigate('/login');

  return (
    <div className="landing-page" ref={containerRef}>
      {/* ── SCROLL PROGRESS ── */}
      <div className="scroll-progress" style={{
        transform: `scaleX(${scrolled ? 1 : 0})`,
        opacity: scrolled ? 1 : 0
      }} />

      {/* ── NAVBAR ── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="nav-logo"><Brain size={20} /></div>
            <span>LingoAI Expert</span>
          </div>

          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            ))}
          </div>

          <div className="nav-actions">
            <LanguageSwitcher />
            <button className="nav-login-btn" onClick={goToLogin}>{t('login', 'Kirish')}</button>
            <button className="nav-cta-btn" onClick={goToLogin}>
              Bepul boshlash <ChevronRight size={16} />
            </button>
            <button className="nav-burger" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-orb orb-3" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <div className="badge-pulse" />
            <Sparkles size={14} />
            <span>Gemini 3.1 Flash-Lite bilan ishlaydi</span>
            <div className="badge-tag">BETA</div>
          </div>

          <h1 className="hero-title">
            Akademik muvaffaqiyatni <span className="gradient-text">AI bilan</span>
            <br />birga zabt eting
          </h1>

          <p className="hero-sub">
            Til, matematika, dasturlash va akademik fanlar bo'yicha
            <br />AI yordamida professional daraja ta'lim oling — bepul.
          </p>

          <div className="hero-actions">
            <button className="hero-cta-primary" onClick={goToLogin}>
              <Zap size={18} /> Bepul boshlash
            </button>
            <button className="hero-cta-kids" onClick={() => navigate('/kids')} style={{ background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 8px 20px rgba(236,72,153,0.3)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <Star size={18} fill="currentColor" /> {t('kids_mode', 'Bolalar rejimi')}
            </button>
          </div>

          <div className="hero-social-proof">
            <div className="proof-avatars">
              {['JT', 'MY', 'BR', 'AK', 'ZN'].map((a, i) => (
                <div key={i} className="proof-avatar" style={{ zIndex: 5 - i }}>
                  {a}
                </div>
              ))}
            </div>
            <div className="proof-text">
              <div className="proof-stars">{'★'.repeat(5)}</div>
              <span>50,000+ foydalanuvchi ishonadi</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="chat-preview-card">
            <div className="preview-header">
              <div className="preview-dot red" /><div className="preview-dot yellow" /><div className="preview-dot green" />
              <span>LingoAI Expert</span>
            </div>
            <div className="preview-messages">
              <div className="preview-msg user">Ingliz tili Present Perfect ni tushuntirib ber</div>
              <div className="preview-msg ai">
                <div className="preview-ai-badge"><Brain size={12} /> AI</div>
                <p><strong>Present Perfect</strong> — o'tgan harakatni hozirgi natija bilan bog'laydi.</p>
                <div className="mt-2 space-y-1">
                  <p>📌 <em>Tuzilishi:</em> Subject + <strong>have/has</strong> + V3</p>
                  <p>✅ I <strong>have finished</strong> my homework.</p>
                  <p>✅ She <strong>has visited</strong> London.</p>
                </div>
                <div className="preview-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-section" id="stats">
        <div className="section-container">
          <div className="stats-grid">
            {STATS.map((s, i) => (
              <StatItem
                key={i}
                value={s.value}
                label={s.label}
                icon={s.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <div className="section-badge">Imkoniyatlar</div>
            <h2 className="section-title">
              Barcha fanlar, <span className="gradient-text">bir platformada</span>
            </h2>
            <p className="section-sub">
              O'quv dasturingizga mos har qanday savol bering — AI daqiqa ichida javob beradi
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div className="feature-card" key={i} id={`feature-${i}`}>
                <div className="feature-icon" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <div className="feature-tags">
                  {f.tags.map(t => (
                    <span key={t} className="feature-tag" style={{ color: f.color, borderColor: f.color + '30', background: f.bg }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-badge">Qanday ishlaydi</div>
            <h2 className="section-title">3 qadamda <span className="gradient-text">boshlang</span></h2>
          </div>

          <div className="steps-grid">
            {[
              { num: "01", title: "Hisob yarating", desc: "Email orqali 30 soniyada bepul hisob oching.", icon: <Shield size={22} /> },
              { num: "02", title: "Savol yozing", desc: "Istalgan fan bo'yicha savolingizni erkin yozing.", icon: <MessageSquare size={22} /> },
              { num: "03", title: "Javob oling", desc: "AI daqiqa ichida batafsil, tushunarli javob beradi.", icon: <Sparkles size={22} /> },
            ].map((s, i) => (
              <div className="step-card" key={i}>
                <div className="step-num">{s.num}</div>
                <div className="step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < 2 && <div className="step-arrow"><ArrowRight size={18} /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-badge">Fikrlar</div>
            <h2 className="section-title">Foydalanuvchilar <span className="gradient-text">nima deydi</span></h2>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-stars">{'★'.repeat(t.rating)}</div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{ background: t.color + '25', color: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pricing-section" id="pricing">
        <div className="section-container">
          <div className="section-header">
            <div className="section-badge">Narxlar</div>
            <h2 className="section-title">Sizga mos <span className="gradient-text">rejani tanlang</span></h2>
            <p className="section-sub">Hech qanday yashirin to'lovlar yo'q</p>
          </div>

          <div className="pricing-grid">
            {PLANS.map((plan, i) => (
              <div className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`} key={i}>
                {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
                <div className="pricing-name">{plan.name}</div>
                <div className="pricing-price">
                  <span className="price-currency">UZS</span>
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-period">/oy</span>
                </div>
                <p className="pricing-desc">{plan.desc}</p>
                <ul className="pricing-features">
                  {plan.features.map(f => (
                    <li key={f}>
                      <span className="check-icon"><Check size={13} /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`pricing-btn ${plan.highlight ? 'primary' : 'secondary'}`}
                  onClick={goToLogin}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <div className="cta-orb cta-orb-1" />
            <div className="cta-orb cta-orb-2" />
            <div className="cta-content">
              <h2>Bugun boshlashga tayyor <span className="gradient-text">emassizmi?</span></h2>
              <p>50,000+ foydalanuvchi bilan qo'shiling. Birinchi 50 ta kredit bepul!</p>
              <button className="hero-cta-primary" onClick={goToLogin}>
                <Sparkles size={18} /> Bepul hisob yaratish
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="section-container">
          <div className="footer-inner">
            <div className="footer-brand">
              <div className="nav-logo"><Brain size={18} /></div>
              <span>LingoAI Expert</span>
            </div>
            <p className="footer-copy">© 2026 LingoAI Expert. Barcha huquqlar himoyalangan.</p>
            <div className="footer-links">
              <a href="#">Maxfiylik</a>
              <a href="#">Shartlar</a>
              <a href="#">Aloqa</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;