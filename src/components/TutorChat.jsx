import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, User, Brain, Star, LogOut, BookOpen, Zap, TrendingUp, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '../supabase';
import './TutorChat.css';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import MobileBottomNav from './MobileBottomNav';

// Custom Hooks
import { useProfile } from '../hooks/useProfile';
import { useMessages } from '../hooks/useMessages';
import { useNotebook } from '../hooks/useNotebook';

const QUICK_CHIPS = [
  { emoji: '🇬🇧', label: 'Ingliz zamonlari', desc: 'Zamonlar tahlili va misollar', prompt: 'Ingliz tili zamonlarini tushuntirib ber' },
  { emoji: '🇷🇺', label: 'Ruscha tarjima', desc: 'Matnlarni professional tarjima qilish', prompt: "Ushbu matnni rus tiliga tarjima qil: 'Salom, ahvollar qalay?'" },
  { emoji: '✍️', label: 'IELTS Writing', desc: 'IELTS uchun foydali maslahatlar', prompt: 'IELTS Writing task 2 uchun foydali so\'zlar' },
  { emoji: '📐', label: 'Matematika', desc: 'Murakkab misollar yechimi', prompt: 'Kvadrat tenglamani yechishni tushuntirib ber' },
  { emoji: '💻', label: 'Dasturlash', desc: 'Kod yozish va xatolarni tuzatish', prompt: 'Python da funksiyalar haqida misollar bilan tushuntir' },
  { emoji: '📖', label: 'Referat yozish', desc: 'Akademik mavzularda maqolalar', prompt: 'Sun\'iy intellekt haqida qisqa referat yoz' },
];

function TutorChat({ session }) {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  // TanStack Query Hooks
  const { profile, decrementCredits } = useProfile(session);
  const { messages, isSending, sendMessage, clearChat } = useMessages(session);
  const { entries: notebook, saveEntry, deleteEntry } = useNotebook(session);

  // Local UI State
  const [showNotebook, setShowNotebook] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [vibeMode, setVibeMode] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      if (prev + 1 >= 3) {
        setVibeMode(!vibeMode);
        return 0;
      }
      return prev + 1;
    });
    // Reset clicks after 2 seconds
    setTimeout(() => setLogoClicks(0), 2000);
  };

  useEffect(() => {
    if (audioRef.current) {
      if (vibeMode) {
        audioRef.current.play().catch(e => console.log("Audio play blocked"));
      } else {
        audioRef.current.pause();
      }
    }
  }, [vibeMode]);

  const credits = profile?.credits || 0;

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = useCallback(async (userText, attachment = null) => {
    if ((!userText?.trim() && !attachment) || isSending) return;

    let mode = 'TUTOR';
    let cleanText = userText;

    const codingKeywords = ['kod', 'tuzib ber', 'qilib ber', 'dastur', 'yozib ber', 'tic-tac-toe', 'bird', 'o\'yin', 'website', 'sahifa'];
    const isCodingRequest = codingKeywords.some(kw => userText?.toLowerCase().includes(kw));

    // /vibe-coding buyrug'ini yoki kodlash so'rovini tekshirish
    if (userText?.trim().toLowerCase().startsWith('/vibe-coding') || isCodingRequest) {
      mode = 'CODER';
      setVibeMode(true);
      cleanText = userText.replace(/\/vibe-coding/i, '').trim();
    } else {
      setVibeMode(false);
    }

    if (credits <= 0) { setShowCreditModal(true); return; }

    try {
      await decrementCredits();
      sendMessage({ userText: cleanText, currentMessages: messages, attachment, mode });
    } catch (err) {
      console.error('Xatolik:', err);
    }
  }, [credits, isSending, messages, sendMessage, decrementCredits]);



  const handleAutoFix = useCallback(async (brokenCode, errorMsg, lang) => {
    if (isSending) return;
    const fixPrompt = `[SYSTEM: AUTO-FIX REQUEST]\nUshbu kodda xatolik aniqlandi: "${errorMsg}". \nUni professional dasturchi sifatida tahlil qil va tuzatib, faqat to'liq va ishchi kodni qaytar.\n\nKOD:\n\`\`\`${lang}\n${brokenCode}\n\`\`\``;
    
    try {
      await sendMessage({ userText: fixPrompt, currentMessages: messages });
    } catch (err) {
      console.error('Auto-fix error:', err);
    }
  }, [isSending, messages, sendMessage]);

  const handleLogout = useCallback(() => supabase.auth.signOut(), []);

  const handleClearChat = useCallback(() => {
    if (window.confirm('Barcha xabarlarni o\'chirasizmi?')) {
      clearChat();
      setQuiz(null);
    }
  }, [clearChat]);

  // UI helpers
  const creditColor = useMemo(() => 
    credits > 20 ? '#10b981' : credits > 5 ? '#f59e0b' : '#ef4444', 
  [credits]);

  return (
    <div className={`tutor-layout ${vibeMode ? 'vibe-active' : ''}`}>
      {vibeMode && <VibeBackground />}
      <audio ref={audioRef} loop src="https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Ketsa/Light_Reflections/Ketsa_-_08_-_The_Warmth_of_the_Sun.mp3" />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {!vibeMode && (
        <aside className="tutor-sidebar">
          <div className="sidebar-brand" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <div className="brand-logo"><Brain size={20} /></div>
            <h2>LingoAI Expert</h2>
          </div>


        <div className="sidebar-content">
          <div className="tutor-info-card highlighted">
            <h3>Kredit Balansi</h3>
            <div className="balans-value-group">
              <h2 style={{ color: creditColor }}>{credits}</h2>
              <span className="balans-badge">Kredit</span>
            </div>
            <div className="balans-progress-bg">
              <div
                className="balans-progress-fill"
                style={{ width: `${Math.min(100, (credits / 50) * 100)}%`, background: creditColor }}
              />
            </div>
          </div>

          <div className="tutor-info-card" style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{Math.floor(messages.length / 2)}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Suhbat</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{notebook.length}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Konspekt</div>
            </div>
          </div>

          <button
            className={`tutor-info-card notebook-toggle ${showNotebook ? 'active' : ''}`}
            onClick={() => setShowNotebook(v => !v)}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0 }}>Aqlli Daftar</h3>
            </div>
            <p style={{ marginTop: 4, fontSize: '0.78rem', color: '#fff' }}>{notebook.length} ta konspekt saqlangan</p>
          </button>

          {messages.length > 0 && (
            <button className="clear-chat-btn" onClick={handleClearChat}>
              <Trash2 size={14} /> Suhbatni tozalash
            </button>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-nav" onClick={() => navigate('/profile')}>
            <div className="user-avatar"><User size={18} /></div>
            <div className="user-info">
              <span className="user-name">{session?.user?.email?.split('@')[0]}</span>
              <span className="user-status">Profilni ko'rish</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Chiqish">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      )}


      {/* ── Asosiy chat maydoni ──────────────────────────────────────────── */}
      <main className="tutor-main">
        <header className="tutor-header">
          <div className="header-title">
            <h2>Til Tahlili va O'rganish</h2>
          </div>
          <div className="header-badge"><span>Professional Rejim</span></div>
        </header>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="welcome-state fade-in">
              <div className="welcome-icon-wrapper pulse"><Sparkles size={48} /></div>
              <h2>LingoAI Markaziga Xush Kelibsiz</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
                Har qanday savol bering — til, matematika, dasturlash yoki boshqa fanlar
              </p>
              <div className="suggestion-chips">
                {QUICK_CHIPS.map((chip, i) => (
                  <button key={i} onClick={() => handleSend(chip.prompt)} className="fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <span style={{ fontSize: '1.5rem' }}>{chip.emoji}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{chip.label}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{chip.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  onSave={saveEntry}
                  onAutoFix={handleAutoFix}
                />
              ))}
            </>
          )}

          {isSending && (
            <div className="chat-bubble-wrapper ai fade-in">
              <div className="bubble-avatar ai-avatar"><Brain size={20} /></div>
              <div className="chat-bubble ai typing-bubble" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
                <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 600, letterSpacing: '0.05em' }}>
                  MUHANDIS IShLAMOQDA...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={handleSend} isTyping={isSending} />
        <MobileBottomNav credits={credits} onLogout={handleLogout} />

        {/* ── Modals ────────────────────────────────────────────────────── */}
        {showCreditModal && (
          <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
            <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
              <h3>Kredit tugadi</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>Kredit paket sotib oling va davom eting.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="modal-close-btn" onClick={() => setShowCreditModal(false)}>Yopish</button>
                <button className="buy-btn">Kredit sotib olish</button>
              </div>
            </div>
          </div>
        )}

        {showNotebook && (
          <div className="notebook-panel fade-in">
            <div className="notebook-header">
              <h3>📖 Aqlli Daftar</h3>
              <button className="notebook-close" onClick={() => setShowNotebook(false)}>×</button>
            </div>
            <div className="notebook-list">
              {notebook.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                  <BookOpen size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <p style={{ fontSize: '0.85rem' }}>Daftar bo'sh. AI javobini saqlang!</p>
                </div>
              ) : (
                notebook.map(note => (
                  <div key={note.id} className="note-card">
                    <h4>{note.title}</h4>
                    <button className="delete-note" onClick={() => deleteEntry(note.id)}>O'chirish</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Vibe Background (Engine Vizualizatsiyasi) ──────────────────────────────
const VibeBackground = () => (
  <div className="vibe-engine-bg">
    <div className="vibe-core" />
    <div className="vibe-particles" />
    <style jsx>{`
      .vibe-engine-bg {
        position: fixed;
        inset: 0;
        z-index: -1;
        background: radial-gradient(circle at center, #020617 0%, #000 100%);
        overflow: hidden;
      }
      .vibe-core {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 150vw;
        height: 150vh;
        background: radial-gradient(circle at center, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
        animation: pulseCore 8s infinite alternate ease-in-out;
      }
      @keyframes pulseCore {
        from { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
        to { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
      }
      .vibe-particles {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        background-size: 50px 50px;
        opacity: 0.3;
        animation: driftParticles 40s linear infinite;
      }
      @keyframes driftParticles {
        from { background-position: 0 0; }
        to { background-position: 1000px 1000px; }
      }
    `}</style>
  </div>
);

export default TutorChat;