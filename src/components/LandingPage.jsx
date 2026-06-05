import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, Brain, Code2, BookOpen, Calculator, CalendarCheck,
  FileText, FunctionSquare, Presentation, Upload,
  Mic, Languages, ArrowRight, Menu, X, Sparkles,
  SmileIcon, School, GraduationCap, Check, Users,
  TrendingUp, Activity, ChevronRight,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  pri: "#4f46e5",
  priDark: "#3730a3",
  priDeep: "#1e1b4b",
  priLight: "#eef2ff",
  priMid: "#6366f1",
  priRing: "#a5b4fc",
  slate: "#0f172a",
  slate2: "#1e293b",
  slate3: "#334155",
  muted: "#64748b",
  muted2: "#94a3b8",
  border: "#e2e8f0",
  borderMid: "#cbd5e1",
  bg: "#f8fafc",
  bgMid: "#f1f5f9",
  white: "#ffffff",
  green: "#22c55e",
  greenLight: "#dcfce7",
  amber: "#f59e0b",
  amberLight: "#fffbeb",
  amberText: "#d97706",
  emerald: "#10b981",
  emeraldLight: "#ecfdf5",
  emeraldText: "#059669",
};

// ─── Static data ──────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Imkoniyatlar", href: "#features" },
  { label: "Narxlar", href: "#pricing" },
  { label: "Rejimlar", href: "#modes" },
];

const FEATURES = [
  { Icon: Zap, title: "Ko'p modal AI", desc: "Matn, rasm va PDF fayllar bilan ishlash imkoni.", color: "#6366f1" },
  { Icon: Brain, title: "Chuqur tahlil", desc: "Murakkab masalalarni bosqichma-bosqich tushuntirish.", color: "#8b5cf6" },
  { Icon: Code2, title: "Jonli ko'rinish", desc: "Kod va matematik formulalar real vaqtda render bo'ladi.", color: "#06b6d4" },
  { Icon: BookOpen, title: "Notebook LM", desc: "Hujjatlaringizdan quiz va konspekt yarating.", color: "#10b981" },
  { Icon: Calculator, title: "Math Center", desc: "LaTeX editor va OCR bilan formulalar yechish.", color: "#f59e0b" },
  { Icon: CalendarCheck, title: "Reja boshqaruv", desc: "AI bilan shaxsiy o'quv rejangizni saqlang.", color: "#ec4899" },
];

const MODES = [
  {
    key: "tutor",
    badge: "TUTOR",
    Icon: School,
    title: "Shaxsiy mentor",
    desc: "Professional ta'lim, motivatsiya va Sokrat uslubidagi yo'l-yo'riq.",
    accent: C.pri,
    badgeBg: C.priLight,
    badgeColor: C.pri,
    gradient: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
  },
  {
    key: "kids",
    badge: "KIDS",
    Icon: SmileIcon,
    title: "Bolalar rejimi",
    desc: "Quvnoq va ertaknamo tushuntirishlar bilan o'rganish jarayoni.",
    accent: C.amber,
    badgeBg: C.amberLight,
    badgeColor: C.amberText,
    gradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
  },
  {
    key: "ielts",
    badge: "IELTS",
    Icon: GraduationCap,
    title: "IELTS tayyorgarlik",
    desc: "Speaking, Listening, Reading, Writing — Band 9.0 gacha.",
    accent: C.emerald,
    badgeBg: C.emeraldLight,
    badgeColor: C.emeraldText,
    gradient: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
  },
];

const TOOLS = [
  { Icon: FileText, label: "Notebook LM", color: "#6366f1" },
  { Icon: FunctionSquare, label: "Math Center", color: "#8b5cf6" },
  { Icon: Presentation, label: "Slayd yaratish", color: "#06b6d4" },
  { Icon: Upload, label: "PDF eksport", color: "#10b981" },
  { Icon: Mic, label: "Audio AI", color: "#f59e0b" },
  { Icon: Languages, label: "Tarjima", color: "#ec4899" },
];

const FOOTER_COLS = [
  { title: "Mahsulot", links: ["Imkoniyatlar", "AI Mentor", "Math Center", "Narxlar"] },
  { title: "Kompaniya", links: ["Haqimizda", "Maxfiylik", "Shartlar", "Twitter"] },
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const s = {
  flex: { display: "flex" },
  flexCol: { display: "flex", flexDirection: "column" },
  center: { display: "flex", alignItems: "center", justifyContent: "center" },
  between: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  itemsCenter: { display: "flex", alignItems: "center" },
  label: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase", color: C.pri,
    display: "inline-flex", alignItems: "center", gap: 5,
  },
  sectionTitle: {
    fontSize: "clamp(22px,3.5vw,32px)", fontWeight: 800,
    color: C.slate, letterSpacing: "-0.025em", margin: 0, lineHeight: 1.1,
    textAlign: "center",
  },
  sectionSub: { fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 420, margin: 0 },
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
function LogoMark({ size = 26 }) {
  return (
    <div style={{
      width: size, height: size,
      background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
      borderRadius: Math.round(size * 0.28),
      ...s.center, color: "#fff",
      fontSize: Math.round(size * 0.5), fontWeight: 800, flexShrink: 0,
      letterSpacing: "-0.03em",
    }}>T</div>
  );
}

// ─── Pill badge ───────────────────────────────────────────────────────────────
function Pill({ children, style = {} }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: C.priLight, color: C.pri,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", padding: "4px 10px", borderRadius: 20,
      border: `1px solid #c7d2fe`, ...style,
    }}>{children}</span>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
function BtnPrimary({ children, onClick, style = {}, size = "md" }) {
  const [hov, setHov] = useState(false);
  const pad = size === "lg" ? "10px 22px" : "6px 14px";
  const fs = size === "lg" ? 14 : 12;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov
          ? "linear-gradient(135deg,#3730a3 0%,#4f46e5 100%)"
          : "linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)",
        color: "#fff", fontSize: fs, fontWeight: 600,
        padding: pad, borderRadius: 9, border: "none",
        cursor: "pointer", transition: "all .18s",
        display: "inline-flex", alignItems: "center", gap: 6,
        transform: hov ? "translateY(-1px)" : "none",
        boxShadow: hov ? "0 6px 20px rgba(79,70,229,.35)" : "0 2px 10px rgba(79,70,229,.2)",
        ...style,
      }}
    >{children}</button>
  );
}

function BtnOutline({ children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.bgMid : C.white,
        color: hov ? C.pri : C.slate,
        fontSize: 12, fontWeight: 600,
        padding: "6px 14px", borderRadius: 9,
        border: `1.5px solid ${hov ? C.priRing : C.border}`,
        cursor: "pointer", transition: "all .18s",
        display: "inline-flex", alignItems: "center", gap: 6,
        ...style,
      }}
    >{children}</button>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const num = parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;

  useEffect(() => {
    let start = 0;
    const end = num;
    if (end === 0) return;
    const duration = 1200;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [num]);

  const raw = String(value);
  const prefix = raw.replace(/[0-9.,+%K M]/g, "").trim();
  const hasSuffix = raw.includes("K") ? "K" : raw.includes("M") ? "M" : raw.includes("%") ? "%" : "";

  return <>{prefix}{display.toLocaleString()}{hasSuffix}{suffix}</>;
}

// ─── Hero chat mockup ─────────────────────────────────────────────────────────
function HeroMockup() {
  return (
    <div style={{
      borderRadius: 14, overflow: "hidden",
      border: `1px solid ${C.border}`,
      background: C.white,
      marginTop: 32,
      position: "relative",
    }}>
      {/* window chrome */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "9px 14px",
        borderBottom: `1px solid ${C.border}`,
        background: C.bg,
      }}>
        {["#f87171", "#fbbf24", "#34d399"].map(c => (
          <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginLeft: 8 }}>
          Ovvox AI · Tutor rejimi
        </span>
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
          fontSize: 10, color: C.emeraldText, fontWeight: 600,
        }}>
          <div style={{ width: 6, height: 6, background: C.green, borderRadius: "50%" }} />
          Online
        </div>
      </div>

      {/* body */}
      <div style={{ display: "grid", gridTemplateColumns: "clamp(120px,28%,160px) 1fr", minHeight: 200 }}>
        {/* sidebar */}
        <div style={{
          borderRight: `1px solid ${C.border}`,
          padding: "10px 8px",
          background: C.bg,
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {[
            { label: "AI Tutor", active: true, dot: C.pri },
            { label: "Notebook LM", active: false, dot: null },
            { label: "Math Center", active: false, dot: null },
            { label: "Rejalar", active: false, dot: null },
          ].map(({ label, active, dot }) => (
            <div key={label} style={{
              padding: "5px 8px", borderRadius: 7,
              fontSize: 11, fontWeight: active ? 600 : 500,
              background: active ? C.priLight : "transparent",
              color: active ? C.pri : C.muted,
              display: "flex", alignItems: "center", gap: 5,
              cursor: "pointer",
            }}>
              {dot && <div style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
              {label}
            </div>
          ))}
        </div>

        {/* chat */}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{
            alignSelf: "flex-end",
            background: "linear-gradient(135deg,#4f46e5,#6366f1)",
            color: "#fff",
            padding: "7px 12px", borderRadius: "12px 12px 3px 12px",
            fontSize: 11, maxWidth: "80%", lineHeight: 1.5,
          }}>Python o'rganish uchun reja tuzib ber</div>

          <div style={{
            background: C.bg, border: `1px solid ${C.border}`,
            padding: "10px 12px", borderRadius: "3px 12px 12px 12px",
            fontSize: 11, lineHeight: 1.6,
          }}>
            <div style={{ marginBottom: 7 }}>
              Albatta! <strong>3 oylik strategik reja</strong> tuzaman 📚
            </div>
            <div style={{
              border: `1px solid ${C.border}`, borderRadius: 7,
              overflow: "hidden", fontSize: 10.5,
            }}>
              {[
                { bg: C.bgMid, fw: 700, oy: "Oy", mavzu: "Mavzular", natija: "Natija" },
                { bg: C.white, fw: 400, oy: "1-oy", mavzu: "Asoslar, o'zgaruvchilar", natija: "Kalkulyator" },
                { bg: C.bg, fw: 400, oy: "2-oy", mavzu: "OOP, funksiyalar", natija: "Loyiha" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "38px 1fr 1fr",
                  background: row.bg, fontWeight: row.fw,
                  borderBottom: i < 2 ? `1px solid ${C.border}` : "none",
                }}>
                  {[row.oy, row.mavzu, row.natija].map((cell, j) => (
                    <div key={j} style={{
                      padding: "4px 7px", color: C.slate,
                      borderRight: j < 2 ? `1px solid ${C.border}` : "none",
                    }}>{cell}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* typing indicator */}
          <div style={{ display: "flex", gap: 3, alignItems: "center", paddingLeft: 2 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: C.priRing,
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,60%,100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ id, children, style = {} }) {
  return (
    <section id={id} style={{ padding: "52px 24px", ...style }}>
      {children}
    </section>
  );
}

function SectionHead({ label, title, sub }) {
  return (
    <div style={{ marginBottom: 28, display: "flex", flexDirection: "column", gap: 8 }} className="flex justify-center items-center">
      <Pill><Sparkles size={10} />{label}</Pill>
      <h2  style={s.sectionTitle}>{title}</h2>
      {sub && <p style={s.sectionSub}>{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    users: null,
    tasks: null,
    uptime: "99.9%",
  });

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Fetch dynamic stats from Supabase
  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.rpc("get_landing_stats");
        if (error) throw error;
        setStats({
          users: data.total_users,
          tasks: data.total_messages,
          uptime: "99.9%",
        });
      } catch {
        setStats({ users: 5000, tasks: 200000, uptime: "99.9%" });
      }
    }
    fetchStats();
  }, []);

  const STATS_DISPLAY = [
    { value: stats.users !== null ? `${(stats.users).toFixed(0)}` : "...", label: "Faol foydalanuvchi", Icon: Users },
    { value: stats.tasks !== null ? `${(stats.tasks).toFixed(1)}` : "...", label: "Hal qilingan vazifa", Icon: TrendingUp },
    { value: stats.uptime, label: "Tizim ishlashi", Icon: Activity },
  ];

  const goLogin = () => navigate("/login");

  return (
    <div style={{
      minHeight: "100vh", background: C.white,
      fontFamily: "'Plus Jakarta Sans', 'Sora', system-ui, sans-serif",
      color: C.slate, fontSize: 13, lineHeight: 1.6,
      WebkitFontSmoothing: "antialiased",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 52,
        background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        backdropFilter: "blur(12px)",
        transition: "all .25s",
      }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontWeight: 700, fontSize: 15 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <LogoMark />
          <span style={{ letterSpacing: "-0.02em" }}>Ovvox <span style={{ color: C.pri }}>Ai</span></span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 22 }} className="nav-links-desktop">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} style={{
              fontSize: 13, color: C.muted, fontWeight: 500,
              textDecoration: "none", transition: "color .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = C.slate}
              onMouseLeave={e => e.currentTarget.style.color = C.muted}
            >{l.label}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={goLogin}
            style={{
              background: "none", border: "none", fontSize: 12, fontWeight: 600,
              color: C.muted, cursor: "pointer", padding: "5px 10px",
              transition: "color .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.slate}
            onMouseLeave={e => e.currentTarget.style.color = C.muted}
          >Kirish</button>
          <BtnPrimary onClick={goLogin}>Boshlash <ChevronRight size={13} /></BtnPrimary>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: C.slate, padding: 4 }}
            onClick={() => setMenuOpen(v => !v)}
            className="nav-menu-btn"
          >{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </nav>

      {/* mobile menu */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 52, left: 0, right: 0,
          background: C.white, borderBottom: `1px solid ${C.border}`,
          padding: "12px 24px 16px", zIndex: 99,
          display: "flex", flexDirection: "column", gap: 0,
        }}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href}
              style={{
                fontSize: 14, color: C.muted, fontWeight: 500,
                padding: "10px 0", textDecoration: "none",
                borderBottom: `1px solid ${C.border}`,
              }}
              onClick={() => setMenuOpen(false)}
            >{l.label}</a>
          ))}
          <div style={{ paddingTop: 12, display: "flex", gap: 8 }}>
            <BtnOutline onClick={goLogin} style={{ flex: 1, justifyContent: "center" }}>Kirish</BtnOutline>
            <BtnPrimary onClick={goLogin} style={{ flex: 1, justifyContent: "center" }}>Boshlash</BtnPrimary>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: "60px 24px 56px",
        textAlign: "center",
        background: "linear-gradient(180deg,#f0f4ff 0%,#fafbff 60%,#ffffff 100%)",
        borderBottom: `1px solid ${C.border}`,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative blobs */}
        <div style={{
          position: "absolute", top: -80, left: "10%",
          width: 300, height: 300,
          background: "radial-gradient(circle, rgba(99,102,241,.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: -60, right: "5%",
          width: 250, height: 250,
          background: "radial-gradient(circle, rgba(124,58,237,.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative" }}>


          <h1 style={{
            fontSize: "clamp(28px,5vw,52px)", fontWeight: 800,
            lineHeight: 1.06, letterSpacing: "-0.03em",
            color: C.slate, margin: "0 auto 16px", maxWidth: 580,
          }}>
            O'qishni{" "}
            <span style={{
              color: C.pri,
              backgroundImage: "linear-gradient(135deg,#4f46e5,#7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>aqlli</span>
            {" "}qiling
          </h1>

          <p style={{
            fontSize: 15, color: C.muted, maxWidth: 400,
            margin: "0 auto 28px", lineHeight: 1.7,
          }}>
            Shaxsiy AI mentor, IELTS tayyorgarlik, matematik yechimlar va boshqa ko'plar — bir joyda.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <BtnPrimary onClick={goLogin} size="lg">
              Bepul boshlash <ArrowRight size={15} />
            </BtnPrimary>
            <BtnOutline onClick={() => navigate("/kids")} style={{ padding: "9px 18px", fontSize: 13 }}>
              <SmileIcon size={14} /> Bolalar rejimi
            </BtnOutline>
          </div>

          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            <HeroMockup />
          </div>

          {/* trust badges */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 16, marginTop: 20, flexWrap: "wrap",
          }}>
            {["Kredit karta kerak emas", "Bepul reja mavjud", "5 daqiqada sozlash"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted, fontWeight: 500 }}>
                <Check size={12} color={C.green} /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)",
        borderBottom: `1px solid ${C.border}`,
        background: C.white,
      }}>
        {STATS_DISPLAY.map(({ value, label, Icon }, i) => (
          <div key={i} style={{
            padding: "22px 16px", textAlign: "center",
            borderRight: i < 2 ? `1px solid ${C.border}` : "none",
            transition: "background .15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.bg}
            onMouseLeave={e => e.currentTarget.style.background = C.white}
          >
            <div style={{
              width: 32, height: 32,
              background: C.priLight,
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 8px",
            }}>
              <Icon size={15} color={C.pri} strokeWidth={2} />
            </div>
            <div style={{
              fontSize: "clamp(22px,3vw,32px)", fontWeight: 800,
              color: C.slate, letterSpacing: "-0.03em", lineHeight: 1,
            }}>
              {value !== "..." ? <AnimatedNumber value={value} /> : "..."}
            </div>
            <div style={{
              fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 4,
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <Section id="features" style={{ background: C.bg }} >
        <SectionHead
          style={{
            display: "flex", alignItems: "center", gap: 10,
            justifyContent: "center", textAlign: "center",
          }}
          label="Imkoniyatlar"
          title="Hamma narsa bir joyda"

          sub="O'quvchilar va talabalar uchun professional AI vositalari to'plami."
        />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))",
          gap: 12,
          display: "flex", alignItems: "center", textAlign: "center",
        }}>
          {FEATURES.map(({ Icon, title, desc, color }) => (
            <div key={title} style={{
              background: C.white,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12, padding: "16px 14px",
              transition: "all .2s",
              cursor: "default",

            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.priRing;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.transform = "none";
              }}
            >
              <div style={{
                width: 34, height: 34,
                background: `${color}18`,
                borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 10,

              }}>
                <Icon size={16} color={color} strokeWidth={1.8} />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.slate, margin: "0 0 4px" }}>{title}</h3>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── MODES ────────────────────────────────────────────────────────────── */}
      <Section id="modes" style={{ background: C.white }}>
        <SectionHead label="Rejimlar" title="Har kim uchun" sub="Maqsadingizga mos rejimni tanlang." />
        <div style={{
         display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 16,
          alignItems: 'center'
        }}>
          {MODES.map(({ key, badge, Icon, title, desc, accent, badgeBg, badgeColor, gradient }) => (
            <div key={key} style={{
              background: gradient,
              border: `1.5px solid ${accent}28`,
              borderTop: `3px solid ${accent}`,
              borderRadius: 12, padding: "16px 14px",
              transition: "all .2s",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}
            >
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: badgeBg, color: badgeColor,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", padding: "3px 8px", borderRadius: 5, marginBottom: 9,
              }}>
                <Icon size={10} strokeWidth={2.5} /> {badge}
              </div>
              <h4  style={{ fontSize: 14, fontWeight: 700, color: C.slate, margin: "0 0 5px" }}>{title}</h4>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── TOOLS ────────────────────────────────────────────────────────────── */}
      <Section style={{ background: C.bg, paddingTop: 0 }}>
        <SectionHead label="Vositalar" title="Bir klik bilan" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
          gap: 9,
        }}>
          {TOOLS.map(({ Icon, label, color }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 13px",
              background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 9,
              fontSize: 12, fontWeight: 600, color: C.slate,
              cursor: "pointer", transition: "all .18s",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${color}0f`;
                e.currentTarget.style.borderColor = `${color}50`;
                e.currentTarget.style.color = color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = C.white;
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.color = C.slate;
              }}
            >
              <Icon size={14} color={color} strokeWidth={1.8} />
              {label}
            </div>
          ))}
        </div>
      </Section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 24px 52px" }}>
        <div style={{
          background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%)",
          borderRadius: 18, padding: "44px 28px",
          textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          {/* decorative glows */}
          <div style={{
            position: "absolute", top: -60, left: "30%",
            width: 320, height: 200,
            background: "radial-gradient(circle,rgba(99,102,241,.35) 0%,transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: -40, right: "20%",
            width: 240, height: 180,
            background: "radial-gradient(circle,rgba(124,58,237,.25) 0%,transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative" }}>
            <Pill style={{ background: "rgba(255,255,255,.1)", color: "#c7d2fe", border: "1px solid rgba(255,255,255,.15)", marginBottom: 14 }}>
              <Sparkles size={10} /> Bugundan boshlang
            </Pill>
            <h2 style={{
              fontSize: "clamp(20px,3.5vw,28px)", fontWeight: 800, color: "#fff",
              letterSpacing: "-0.025em", margin: "0 0 8px", lineHeight: 1.15,
            }}>
              O'quv safaringizni<br />AI bilan boshlang
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.6 }}>
              Kredit karta talab etilmaydi · Bepul reja mavjud
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={goLogin} style={{
                background: "#fff", color: C.slate,
                fontSize: 13, fontWeight: 700,
                padding: "10px 22px", borderRadius: 9, border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                transition: "all .18s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#e0e7ff"; e.currentTarget.style.color = C.pri; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = C.slate; }}
              >
                Bepul ro'yxatdan o'tish <ArrowRight size={14} />
              </button>
              <button onClick={goLogin} style={{
                background: "transparent", color: "#94a3b8",
                fontSize: 13, fontWeight: 500,
                padding: "10px 20px", borderRadius: 9,
                border: "1px solid rgba(255,255,255,.15)", cursor: "pointer",
                transition: "all .18s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#a5b4fc"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.15)"; e.currentTarget.style.color = "#94a3b8"; }}
              >
                Kirish
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: "28px 24px 18px", background: C.bg,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: 20, marginBottom: 20,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              <LogoMark size={22} />
              <span>Ovvox <span style={{ color: C.pri }}>Ai</span></span>
            </div>
            <p style={{ fontSize: 12, color: C.muted2, lineHeight: 1.65, margin: 0, maxWidth: 160 }}>
              AI asosidagi akademik yordamchi platforma.
            </p>
          </div>

          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h5 style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.09em", color: C.slate, margin: "0 0 10px",
              }}>{col.title}</h5>
              {col.links.map(link => (
                <a key={link} href="#" style={{
                  display: "block", fontSize: 12, color: C.muted,
                  marginBottom: 5, textDecoration: "none", transition: "color .15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.color = C.pri}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}
                >{link}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: `1px solid ${C.border}`, paddingTop: 12, flexWrap: "wrap", gap: 8,
        }}>
          <span style={{ fontSize: 11, color: C.muted2 }}>
            © 2026 Ovvox Ai. Barcha huquqlar himoyalangan.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.emeraldText, fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, background: C.green, borderRadius: "50%" }} />
            Tizim ishlayapti
          </div>
        </div>
      </footer>

      <style>{`
        @media(min-width:600px){ .nav-menu-btn{ display:none !important } }
        @media(max-width:599px){ .nav-links-desktop{ display:none !important } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}