import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Sparkles, BookOpen, Zap, Star, Shield,
  ChevronRight, Menu, X, ArrowRight, Check,
  Globe, Calculator, Code2, PenTool, MessageSquare, TrendingUp
} from 'lucide-react';
import './LandingPage.css';

// ── Data ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Imkoniyatlar", href: "#features" },
  { label: "Narxlar", href: "#pricing" },
  { label: "Statistika", href: "#stats" },
];

const FEATURES = [
  {
    icon: <Globe size={24} />,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    title: "Til O'rganish",
    desc: "Ingliz, rus va boshqa tillarda zamonlar, grammatika, tarjima va IELTS tayyorgarligida professional yordam.",
    tags: ["IELTS", "Grammar", "Translation"],
  },
  {
    icon: <Calculator size={24} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    title: "Matematika",
    desc: "Kvadrat tenglamalar, integral, limit va boshqa murakkab matematik masalalarni bosqichma-bosqich yechish.",
    tags: ["Algebra", "Calculus", "Statistics"],
  },
  {
    icon: <Code2 size={24} />,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    title: "Dasturlash",
    desc: "Python, JavaScript, C++ kabi tillarda kod yozish, xatolarni tuzatish va algoritmlarni tushunish.",
    tags: ["Python", "JS", "Algorithms"],
  },
  {
    icon: <PenTool size={24} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    title: "Referat & Insholar",
    desc: "Akademik mavzularda professional maqola, referat va insho yozishda to'liq yordam va namunalar.",
    tags: ["Essay", "Research", "Thesis"],
  },
  {
    icon: <MessageSquare size={24} />,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    title: "Aqlli Daftar",
    desc: "Muhim javoblarni bir tugma bilan saqlang. Daftaringizni istalgan vaqt oching va takrorlang.",
    tags: ["Notes", "Save", "Review"],
  },
  {
    icon: <Star size={24} />,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    title: "Test & Quiz",
    desc: "Har bir mavzu bo'yicha AI tomonidan yaratilgan testlar bilan bilimingizni sinab ko'ring.",
    tags: ["Quiz", "MCQ", "Score"],
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
    features: ["50 ta kredit/oy", "Barcha fanlar", "Chat tarixi", "Aqlli daftar"],
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
    role: "Universitет 2-kurs",
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

  return [ref, count];
}

// ── Stat Item ─────────────────────────────────────────────────────────────────
function StatItem({ value, label, icon }) {
  const [ref, count] = useCountUp(value);
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
function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToLogin = () => navigate('/login');

  return (
    <div className="landing-page">

      {/* ── NAVBAR ── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-brand">
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
            <button className="nav-login-btn" onClick={goToLogin}>Kirish</button>
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
        {/* Background */}
        <div className="hero-bg">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-orb orb-3" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content">
          <div className="hero-badge fade-in">
            <Sparkles size={13} />
            <span>Gemini AI bilan ishlaydi</span>
          </div>

          <h1 className="hero-title fade-in" style={{ animationDelay: '0.1s' }}>
            O'qishni <span className="gradient-text">Yangi Darajaga</span>
            <br />Olib Chiqing
          </h1>

          <p className="hero-sub fade-in" style={{ animationDelay: '0.2s' }}>
            Til, matematika, dasturlash va akademik fanlar bo'yicha
            <br />AI yordamida professional daraja ta'lim oling — bepul.
          </p>

          <div className="hero-actions fade-in" style={{ animationDelay: '0.3s' }}>
            <button className="hero-cta-primary" onClick={goToLogin}>
              <Zap size={18} /> Bepul boshlash
            </button>
            <a href="#features" className="hero-cta-secondary">
              Batafsil ko'rish <ArrowRight size={16} />
            </a>
          </div>

          <div className="hero-social-proof fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="proof-avatars">
              {['JT','MY','BR','AK','ZN'].map((a, i) => (
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

        {/* Hero Card Preview */}
        <div className="hero-visual fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="chat-preview-card">
            <div className="preview-header">
              <div className="preview-dot red" /><div className="preview-dot yellow" /><div className="preview-dot green" />
              <span>LingoAI Expert</span>
            </div>
            <div className="preview-messages">
              <div className="preview-msg user">Ingliz tili Present Perfect ni tushuntirib ber</div>
              <div className="preview-msg ai">
                <div className="preview-ai-badge"><Brain size={12} /> AI</div>
                <strong>Present Perfect</strong> — o'tgan harakatni hozirgi natija bilan bog'laydi.<br /><br />
                📌 <em>Tuzilishi:</em> Subject + <strong>have/has</strong> + V3<br />
                ✅ I <strong>have finished</strong> my homework.<br />
                ✅ She <strong>has visited</strong> London.
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
            {STATS.map((s, i) => <StatItem key={i} {...s} />)}
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
              <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
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
