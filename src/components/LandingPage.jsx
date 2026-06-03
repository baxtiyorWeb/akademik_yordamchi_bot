import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, Brain, Code2, BookOpen, Calculator, CalendarCheck,
  FileText, FunctionSquare, Presentation, Upload,
  Mic, Languages, ArrowRight, Menu, X, Globe, Sparkles,
  SmileIcon, School, GraduationCap, Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

// ─── Design tokens (mirrors your existing CSS vars) ───────────────────────────
const C = {
  pri: "#4f46e5",
  priDark: "#3730a3",
  priLight: "#eef2ff",
  priRing: "#a5b4fc",
  slate: "#0f172a",
  slate2: "#1e293b",
  slate3: "#334155",
  muted: "#64748b",
  muted2: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
  green: "#22c55e",
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
  { label: "Narxlar",      href: "#pricing" },
  { label: "Yechimlar",   href: "#solutions" },
];

const STATS = [
  { value: "50K+",   label: "Faol foydalanuvchi" },
  { value: "2M+",    label: "Hal qilingan vazifa" },
  { value: "99.9%",  label: "Tizim ishlashi" },
];

const FEATURES = [
  { Icon: Zap,          title: "Ko'p modal AI",       desc: "Matn, rasm va PDF fayllar bilan ishlash imkoni." },
  { Icon: Brain,        title: "Chuqur tahlil",       desc: "Murakkab masalalarni bosqichma-bosqich tushuntirish." },
  { Icon: Code2,        title: "Jonli ko'rinish",     desc: "Kod va matematik formulalar real vaqtda render bo'ladi." },
  { Icon: BookOpen,     title: "Notebook LM",         desc: "Hujjatlaringizdan quiz va konspekt yarating." },
  { Icon: Calculator,   title: "Math Center",         desc: "LaTeX editor va OCR bilan formulalar yechish." },
  { Icon: CalendarCheck,title: "Reja boshqaruv",      desc: "AI bilan shaxsiy o'quv rejangizni saqlang." },
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
  },
  {
    key: "kids",
    badge: "KIDS",
    Icon: SmileIcon,
    title: "Bolalar rejimi",
    desc: "Disney uslubida quvnoq va ertaknamo tushuntirishlar.",
    accent: C.amber,
    badgeBg: C.amberLight,
    badgeColor: C.amberText,
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
  },
];

const TOOLS = [
  { Icon: FileText,        label: "Notebook LM" },
  { Icon: FunctionSquare,  label: "Math Center" },
  { Icon: Presentation,    label: "Slayd yaratish" },
  { Icon: Upload,      label: "PDF eksport" },
  { Icon: Mic,             label: "Audio AI" },
  { Icon: Languages,       label: "Tarjima" },
];

const FOOTER_COLS = [
  {
    title: "Mahsulot",
    links: ["Imkoniyatlar", "AI Mentor", "Math Center", "Narxlar"],
  },
  {
    title: "Kompaniya",
    links: ["Haqimizda", "Maxfiylik", "Shartlar", "Twitter"],
  },
];

// ─── Tiny shared primitives ───────────────────────────────────────────────────
const s = {
  // layout
  flex: { display: "flex" },
  flexCol: { display: "flex", flexDirection: "column" },
  center: { display: "flex", alignItems: "center", justifyContent: "center" },
  between: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  itemsCenter: { display: "flex", alignItems: "center" },
  // type
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.pri },
  sectionTitle: { fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, color: C.slate, letterSpacing: "-0.02em", margin: 0 },
  sectionSub: { fontSize: 13, color: C.muted, lineHeight: 1.65, maxWidth: 400, margin: 0 },
  // surface
  card: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 10 },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <div style={{
      width: 24, height: 24, background: C.pri, borderRadius: 6,
      ...s.center, color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0,
    }}>T</div>
  );
}

function BtnPrimary({ children, onClick, style = {} }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.priDark : C.pri,
        color: "#fff", fontSize: 12, fontWeight: 600,
        padding: "5px 14px", borderRadius: 7, border: "none",
        cursor: "pointer", transition: "background .15s",
        ...s.itemsCenter, gap: 5, ...style,
      }}
    >{children}</button>
  );
}

function BtnGhost({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent", color: C.muted, fontSize: 12, fontWeight: 500,
        padding: "5px 10px", borderRadius: 6, border: "none",
        cursor: "pointer", transition: "color .15s", ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.color = C.slate}
      onMouseLeave={e => e.currentTarget.style.color = C.muted}
    >{children}</button>
  );
}

// ── Hero chat mockup ──────────────────────────────────────────────────────────
function HeroMockup() {
  return (
    <div style={{
      ...s.card, borderRadius: 12, overflow: "hidden",
      boxShadow: "0 4px 24px rgba(0,0,0,.06)", marginTop: 28,
    }}>
      {/* topbar */}
      <div style={{
        ...s.itemsCenter, gap: 5, padding: "8px 12px",
        borderBottom: `1px solid ${C.border}`, background: C.bg,
      }}>
        {["#f87171","#fbbf24","#34d399"].map(c => (
          <div key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginLeft: 6 }}>
          AI yordamchisi · Tutor rejimi
        </span>
      </div>

      {/* body */}
      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", minHeight: 180 }}>
        {/* sidebar */}
        <div style={{
          borderRight: `1px solid ${C.border}`, padding: "10px 8px",
          background: C.bg, display: "flex", flexDirection: "column", gap: 3,
        }}>
          {[
            { label: "AI Tutor",    active: true },
            { label: "Notebook LM", active: false },
            { label: "Math Center", active: false },
            { label: "Rejalar",     active: false },
          ].map(({ label, active }) => (
            <div key={label} style={{
              padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: active ? 600 : 500,
              background: active ? C.priLight : "transparent",
              color: active ? C.pri : C.muted,
            }}>{label}</div>
          ))}
        </div>

        {/* chat */}
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{
            alignSelf: "flex-end", background: C.pri, color: "#fff",
            padding: "6px 10px", borderRadius: 8, fontSize: 11, maxWidth: "80%",
          }}>Python o'rganish uchun reja tuzib ber</div>

          <div style={{
            background: C.bg, border: `1px solid ${C.border}`,
            padding: "8px 10px", borderRadius: 8, fontSize: 11, lineHeight: 1.55,
          }}>
            <span>Albatta! </span>
            <strong>3 oylik strategik reja</strong>
            <span> tuzaman 📚</span>
            {/* mini table */}
            <div style={{
              marginTop: 7, border: `1px solid ${C.border}`,
              borderRadius: 6, overflow: "hidden", fontSize: 11,
            }}>
              {[
                { bg: "#f1f5f9", fw: 600, color: C.muted, oy: "Oy",  mavzu: "Mavzular",           natija: "Natija" },
                { bg: C.white,  fw: 400, color: C.slate,  oy: "1-oy", mavzu: "Asoslar, o'zgaruvchilar", natija: "Mini kalkulyator" },
                { bg: C.bg,     fw: 400, color: C.slate,  oy: "2-oy", mavzu: "OOP, funksiyalar",   natija: "Loyiha" },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "36px 1fr 1fr",
                  background: row.bg, fontWeight: row.fw, color: row.color,
                }}>
                  {[row.oy, row.mavzu, row.natija].map((cell, j) => (
                    <div key={j} style={{
                      padding: "3px 6px",
                      borderRight: j < 2 ? `1px solid ${C.border}` : "none",
                    }}>{cell}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const goLogin = () => navigate("/login");

  // ── Styles reused across JSX ────────────────────────────────────────────────
  const sectionWrap = { padding: "36px 20px" };
  const sectionHead = { marginBottom: 20, display: "flex", flexDirection: "column", gap: 5 };

  return (
    <div style={{
      minHeight: "100vh", background: C.white,
      fontFamily: "'DM Sans', 'Sora', system-ui, sans-serif",
      color: C.slate, fontSize: 13, lineHeight: 1.6,
      WebkitFontSmoothing: "antialiased",
    }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        ...s.between,
        padding: "0 20px", height: 46,
        background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        backdropFilter: "blur(8px)",
        transition: "all .2s",
      }}>
        {/* logo */}
        <div style={{ ...s.itemsCenter, gap: 6, cursor: "pointer", fontWeight: 700, fontSize: 14 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <LogoMark />
          Ovvox Ai
        </div>

        {/* center links */}
        <div style={{ ...s.itemsCenter, gap: 18, display: menuOpen ? "none" : "flex" }}
          className="nav-links-desktop">
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} style={{
              fontSize: 12, color: C.muted, fontWeight: 500,
              textDecoration: "none", transition: "color .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.slate}
            onMouseLeave={e => e.currentTarget.style.color = C.muted}>
              {l.label}
            </a>
          ))}
        </div>

        {/* right */}
        <div style={{ ...s.itemsCenter, gap: 6 }}>
          <div style={{
            ...s.itemsCenter, gap: 4, fontSize: 11, fontWeight: 600,
            color: C.muted, padding: "3px 7px",
            border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer",
          }}>
            <Globe size={12} /> UZ
          </div>
          <BtnGhost onClick={goLogin}>Kirish</BtnGhost>
          <BtnPrimary onClick={goLogin}>Boshlash</BtnPrimary>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: C.slate, padding: 3 }}
            onClick={() => setMenuOpen(v => !v)}
            className="nav-menu-btn"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 46, left: 0, right: 0,
          background: C.white, borderBottom: `1px solid ${C.border}`,
          padding: "10px 20px 14px", zIndex: 99,
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href}
              style={{ fontSize: 13, color: C.muted, fontWeight: 500, padding: "6px 0", textDecoration: "none" }}
              onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{
        padding: "48px 20px 44px",
        textAlign: "center",
        background: "linear-gradient(180deg,#f0f4ff 0%,#ffffff 100%)",
        borderBottom: `1px solid ${C.border}`,
      }} >
        {/* badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: C.priLight, color: C.pri,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 20, marginBottom: 14,
          border: "1px solid #c7d2fe",
        }}>
          <Sparkles size={11} />
          Gemini 2.5 Pro tomonidan
        </div>

        {/* h1 */}
        <h1 style={{
          fontSize: "clamp(26px,5vw,46px)", fontWeight: 800,
          lineHeight: 1.08, letterSpacing: "-0.025em",
          color: C.slate, margin: "0 auto 12px", maxWidth: 560,
        }}>
          O'qishni{" "}
          <span style={{ color: C.pri }}>aqlli</span>
          {" "}qiling
        </h1>

        <p style={{
          fontSize: 14, color: C.muted, maxWidth: 380,
          margin: "0 auto 22px", lineHeight: 1.65,
        }}>
          Shaxsiy AI mentor, IELTS tayyorgarlik, matematik yechimlar va boshqa ko'plar — bir joyda.
        </p>

        {/* CTA buttons */}
        <div style={{ ...s.itemsCenter, gap: 8, justifyContent: "center", flexWrap: "wrap" }} >
          <button onClick={goLogin} style={{
            ...s.itemsCenter, gap: 6,
            background: C.pri, color: "#fff",
            fontSize: 13, fontWeight: 600,
            padding: "8px 18px", borderRadius: 8,
            border: "none", cursor: "pointer",
            boxShadow: "0 2px 12px rgba(79,70,229,.25)",
            transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.priDark; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.pri; e.currentTarget.style.transform = "translateY(0)"; }}>
            Bepul boshlash <ArrowRight size={15} />
          </button>

          <button onClick={() => navigate("/kids")} style={{
            ...s.itemsCenter, gap: 6,
            background: C.white, color: C.slate,
            fontSize: 13, fontWeight: 600,
            padding: "8px 16px", borderRadius: 8,
            border: `1px solid ${C.border}`, cursor: "pointer",
            transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.pri; e.currentTarget.style.color = C.pri; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.slate; }}>
            <SmileIcon size={15} /> Bolalar rejimi
          </button>
        </div>

        {/* hero mockup */}
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <HeroMockup />
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)",
        borderBottom: `1px solid ${C.border}`,
      }} >
        {STATS.map((st, i) => (
          <div key={i} style={{
            padding: "18px 12px", textAlign: "center",
            borderRight: i < 2 ? `1px solid ${C.border}` : "none",
          }}>
            <div style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 800, color: C.slate, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {st.value}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {st.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section id="features" style={{ ...sectionWrap, background: "#fcfcfc" , }} >
        <div style={sectionHead}>
          <div style={s.label}>Imkoniyatlar</div>
          <h2 style={s.sectionTitle}>Hamma narsa bir joyda</h2>
          <p style={s.sectionSub}>O'quvchilar va talabalar uchun professional AI vositalari to'plami.</p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 10,
        }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              ...s.card, padding: "14px 12px",
              transition: "border-color .15s, box-shadow .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.priRing; e.currentTarget.style.boxShadow = `0 2px 12px rgba(79,70,229,.06)`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{
                width: 30, height: 30, background: C.priLight, borderRadius: 7,
                ...s.center, color: C.pri, marginBottom: 9,
              }}>
                <Icon size={15} strokeWidth={1.8} />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.slate, margin: "0 0 3px" }}>{title}</h3>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MODES ── */}
      <section style={sectionWrap}>
        <div style={sectionHead}>
          <div style={s.label}>Rejimlar</div>
          <h2 style={s.sectionTitle}>Har kim uchun</h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 10,
        }}>
          {MODES.map(({ key, badge, Icon, title, desc, accent, badgeBg, badgeColor }) => (
            <div key={key} style={{
              ...s.card, padding: "14px 12px",
              borderTop: `2px solid ${accent}`,
              borderRadius: 10,
              transition: "box-shadow .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 2px 16px rgba(0,0,0,.06)`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: badgeBg, color: badgeColor,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
                textTransform: "uppercase", padding: "2px 7px", borderRadius: 4,
                marginBottom: 7,
              }}>
                <Icon size={10} strokeWidth={2.5} /> {badge}
              </div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: C.slate, margin: "0 0 4px" }}>{title}</h4>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TOOLS ── */}
      <section style={{ ...sectionWrap, paddingTop: 0 }}>
        <div style={sectionHead}>
          <div style={s.label}>Vositalar</div>
          <h2 style={s.sectionTitle}>Bir klik bilan</h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: 8,
        }}>
          {TOOLS.map(({ Icon, label }) => (
            <div key={label} style={{
              ...s.itemsCenter, gap: 7,
              padding: "9px 11px", background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 8,
              fontSize: 12, fontWeight: 600, color: C.slate,
              cursor: "pointer", transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.priLight; e.currentTarget.style.borderColor = C.priRing; e.currentTarget.style.color = C.pri; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.slate; }}>
              <Icon size={14} color={C.pri} strokeWidth={1.8} />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "0 20px 40px" }}>
        <div style={{
          background: C.slate, borderRadius: 14, padding: "32px 20px",
          textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          {/* glow */}
          <div style={{
            position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
            width: 280, height: 180,
            background: "radial-gradient(circle,rgba(99,102,241,.28) 0%,transparent 70%)",
            pointerEvents: "none",
          }} />

          <h2 style={{
            fontSize: "clamp(18px,3vw,24px)", fontWeight: 800, color: "#fff",
            letterSpacing: "-0.02em", margin: "0 0 5px", position: "relative",
          }}>
            Bugundan boshlang
          </h2>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 18px", position: "relative" }}>
            Kredit karta talab etilmaydi · Bepul reja mavjud
          </p>

          <div style={{ ...s.itemsCenter, gap: 8, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
            <button onClick={goLogin} style={{
              ...s.itemsCenter, gap: 5,
              background: "#fff", color: C.slate,
              fontSize: 13, fontWeight: 700,
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e0e7ff"; e.currentTarget.style.color = C.pri; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = C.slate; }}>
              Bepul ro'yxatdan o'tish <ArrowRight size={14} />
            </button>

            <button onClick={goLogin} style={{
              background: "transparent", color: "#94a3b8",
              fontSize: 12, fontWeight: 500,
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid #334155", cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#a5b4fc"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94a3b8"; }}>
              Kirish
            </button>
          </div>

          <div style={{ fontSize: 11, color: "#475569", marginTop: 10, position: "relative" }}>
            <Check size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
            Kredit karta kerak emas &nbsp;·&nbsp;
            <Check size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
            5 daqiqada sozlash
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: "22px 20px 16px",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
          gap: 16, marginBottom: 16,
        }}>
          {/* brand */}
          <div>
            <div style={{ ...s.itemsCenter, gap: 6, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
              <LogoMark /> Ovvox Ai
            </div>
            <p style={{ fontSize: 11, color: C.muted2, lineHeight: 1.6, margin: 0, maxWidth: 150 }}>
              AI asosidagi akademik yordamchi platforma.
            </p>
          </div>

          {/* cols */}
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h5 style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: C.slate, margin: "0 0 8px",
              }}>{col.title}</h5>
              {col.links.map(link => (
                <a key={link} href="#" style={{
                  display: "block", fontSize: 12, color: C.muted,
                  marginBottom: 4, textDecoration: "none", transition: "color .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.pri}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* bottom bar */}
        <div style={{
          ...s.between, borderTop: `1px solid ${C.border}`,
          paddingTop: 10, flexWrap: "wrap", gap: 6,
        }}>
          <span style={{ fontSize: 11, color: C.muted2 }}>
            © 2026 Ovvox Ai. Barcha huquqlar himoyalangan.
          </span>
          <div style={{ ...s.itemsCenter, gap: 5, fontSize: 11, color: "#16a34a", fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%" }} />
            Tizim ishlayapti
          </div>
        </div>
      </footer>

      {/* Responsive helpers — hide/show nav desktop links + menu btn */}
      <style>{`
        @media(min-width:600px){ .nav-menu-btn{ display:none !important } }
        @media(max-width:599px){ .nav-links-desktop{ display:none !important } }
      `}</style>
    </div>
  );
}