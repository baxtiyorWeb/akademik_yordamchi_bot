import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, User, Brain, Star, LogOut, BookOpen, Zap, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '../supabase';
import { fetchGeminiResponse } from '../api/gemini';
import './TutorChat.css';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import MobileBottomNav from './MobileBottomNav';

// ─── Tezkor chip tugmalar ────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { emoji: '🇬🇧', label: 'Ingliz zamonlari', desc: 'Zamonlar tahlili va misollar', prompt: 'Ingliz tili zamonlarini tushuntirib ber' },
  { emoji: '🇷🇺', label: 'Ruscha tarjima', desc: 'Matnlarni professional tarjima qilish', prompt: "Ushbu matnni rus tiliga tarjima qil: 'Salom, ahvollar qalay?'" },
  { emoji: '✍️', label: 'IELTS Writing', desc: 'IELTS uchun foydali maslahatlar', prompt: 'IELTS Writing task 2 uchun foydali so\'zlar' },
  { emoji: '📐', label: 'Matematika', desc: 'Murakkab misollar yechimi', prompt: 'Kvadrat tenglamani yechishni tushuntirib ber' },
  { emoji: '💻', label: 'Dasturlash', desc: 'Kod yozish va xatolarni tuzatish', prompt: 'Python da funksiyalar haqida misollar bilan tushuntir' },
  { emoji: '📖', label: 'Referat yozish', desc: 'Akademik mavzularda maqolalar', prompt: 'Sun\'iy intellekt haqida qisqa referat yoz' },
];

function TutorChat({ session }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [credits, setCredits] = useState(0);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [notebook, setNotebook] = useState([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const messagesEndRef = useRef(null);

  // ─── Boshlang'ich ma'lumotlarni yuklash ─────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!session?.user?.id) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', session.user.id)
        .single();
      if (profileData) setCredits(profileData.credits);

      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (msgData) {
        setMessages(msgData.map(m => ({ id: m.id, role: m.role, content: m.content, isNew: false })));
        setTotalMessages(msgData.length);
      }

      const { data: notebookData } = await supabase
        .from('notebook_entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (notebookData) setNotebook(notebookData);
    };

    fetchInitialData();
  }, [session]);

  // ─── Auto scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ─── Xabar yuborish ──────────────────────────────────────────────────────
  const handleSend = useCallback(async (userText) => {
    if (!userText?.trim() || isTyping || !session?.user?.id) return;

    if (credits <= 0) { setShowCreditModal(true); return; }

    const userId = session.user.id;
    const newCredits = credits - 1;
    setCredits(newCredits);

    // Kreditni DB da kamaytirish
    const { error: rpcErr } = await supabase.rpc('decrement_credits', { user_id: userId });
    if (rpcErr) await supabase.from('profiles').update({ credits: newCredits }).eq('id', userId);

    // UI ga user xabarini qo'shish
    const tempUser = { id: `u-${Date.now()}`, role: 'user', content: userText };
    setMessages(prev => [...prev, tempUser]);
    setIsTyping(true);

    // DB ga user xabarini saqlash
    supabase.from('messages').insert([{ user_id: userId, role: 'user', content: userText }]).then();

    // AI dan javob olish
    const replyText = await fetchGeminiResponse(userText, messages);

    // Kredit hisoblash (har 200 belgi = 1 kredit)
    const cost = Math.max(1, Math.ceil(replyText.length / 200));
    const finalBal = Math.max(0, newCredits - cost);
    setCredits(finalBal);
    supabase.from('profiles').update({ credits: finalBal }).eq('id', userId).then();

    // UI ga AI xabarini qo'shish
    const tempAI = { id: `a-${Date.now()}`, role: 'ai', content: replyText, isNew: true };
    setMessages(prev => [...prev.map(m => ({ ...m, isNew: false })), tempAI]);
    setTotalMessages(prev => prev + 2);
    setIsTyping(false);

    // DB ga AI xabarini saqlash
    supabase.from('messages').insert([{ user_id: userId, role: 'ai', content: replyText }]).then();
  }, [credits, isTyping, messages, session]);

  // ─── Qayta yaratish ──────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async (msgId) => {
    if (isTyping) return;
    // Oxirgi user xabarini topish
    const msgIndex = messages.findIndex(m => m.id === msgId);
    const prevUser = [...messages].slice(0, msgIndex).reverse().find(m => m.role === 'user');
    if (!prevUser) return;
    // Shu AI xabarni olib tashlab qayta yuborish
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await handleSend(prevUser.content);
  }, [isTyping, messages, handleSend]);

  // ─── Daftarga saqlash ────────────────────────────────────────────────────
  const handleSaveToNotebook = useCallback(async (content) => {
    if (!session?.user?.id) return;
    const title = content.replace(/[#*`]/g, '').substring(0, 40).trim() + '…';

    const { data, error } = await supabase
      .from('notebook_entries')
      .insert([{ user_id: session.user.id, title, content }])
      .select()
      .single();

    if (!error && data) {
      setNotebook(prev => [data, ...prev]);
    }
  }, [session]);

  // ─── Suhbatni tozalash ───────────────────────────────────────────────────
  const handleClearChat = useCallback(async () => {
    if (!session?.user?.id || !window.confirm('Barcha xabarlarni o\'chirasizmi?')) return;
    await supabase.from('messages').delete().eq('user_id', session.user.id);
    setMessages([]);
    setTotalMessages(0);
    setQuiz(null);
  }, [session]);

  // ─── Quiz yaratish ───────────────────────────────────────────────────────
  const handleStartQuiz = useCallback(async () => {
    if (isTyping || messages.length < 2 || quizLoading) return;
    setQuizLoading(true);

    const quizPrompt = `Hozirgacha gaplashgan mavzularimiz asosida 5 ta ko'p variantli test yaratib ber.
FAQAT quyidagi JSON formatida qaytar, boshqa hech narsa yozma:
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"TO'G'RI VARIANT TO'LIQ MATNI"}]}`;

    const response = await fetchGeminiResponse(quizPrompt, messages);
    try {
      const clean = response.replace(/```json|```/g, '').trim();
      const data = JSON.parse(clean);
      setQuiz({ questions: data.questions, active: true, currentIdx: 0, score: 0, feedback: null, finished: false });
    } catch {
      alert('Test yaratishda xatolik. Qaytadan urinib ko\'ring.');
    }
    setQuizLoading(false);
  }, [isTyping, messages, quizLoading]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ─── Kredit rangi ────────────────────────────────────────────────────────
  const creditColor = credits > 20 ? '#10b981' : credits > 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="tutor-layout">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="tutor-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo"><Brain size={20} /></div>
          <h2>LingoAI Expert</h2>
        </div>

        <div className="sidebar-content">
          {/* Kredit */}
          <div className="tutor-info-card highlighted">
            <h3>Balans</h3>
            <h2 style={{ color: creditColor }}>{credits}</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>xizmat krediti</p>
            <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (credits / 50) * 100)}%`, background: creditColor, borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Statistika */}
          <div className="tutor-info-card" style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{Math.floor(totalMessages / 2)}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Suhbat</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{notebook.length}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Konspekt</div>
            </div>
          </div>

          {/* Notebook tugma */}
          <button
            className={`tutor-info-card notebook-toggle ${showNotebook ? 'active' : ''}`}
            onClick={() => setShowNotebook(v => !v)}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0 }}>Aqlli Daftar</h3>
            </div>
            <p style={{ marginTop: 4, fontSize: '0.78rem' }}>{notebook.length} ta konspekt saqlangan</p>
          </button>

          {/* Suhbatni tozalash */}
          {messages.length > 0 && (
            <button onClick={handleClearChat} style={{
              width: '100%', padding: '8px 12px', borderRadius: 10,
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            }}>
              Suhbatni tozalash
            </button>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar"><User size={20} /></div>
            <div className="user-email">{session?.user?.email?.split('@')[0] || 'Foydalanuvchi'}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Chiqish">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* ── Asosiy chat maydoni ──────────────────────────────────────────── */}
      <main className="tutor-main">
        <header className="tutor-header">
          <div className="header-title">
            <h2>Til Tahlili va O'rganish</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {quizLoading && <span style={{ fontSize: 12, color: '#94a3b8' }}>Test tayyorlanmoqda…</span>}
            <div className="header-badge"><span>Professional Rejim</span></div>
          </div>
        </header>

        <div className="chat-messages">
          {/* Welcome holati */}
          {messages.length === 0 ? (
            <div className="welcome-state fade-in">
              <div className="welcome-icon-wrapper pulse">
                <Sparkles size={48} />
              </div>
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
                  onSave={handleSaveToNotebook}
                  onRegenerate={handleRegenerate}
                />
              ))}

              {/* Quiz CTA — 4 ta xabardan keyin */}
              {messages.length >= 4 && !isTyping && !quiz && (
                <div className="quiz-start-cta fade-in">
                  <button className="quiz-btn" onClick={handleStartQuiz} disabled={quizLoading}>
                    <Star size={16} />
                    {quizLoading ? 'Test tayyorlanmoqda…' : 'Mavzu bo\'yicha o\'zingni sinab ko\'r!'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Yozayapti indikatori */}
          {isTyping && (
            <div className="chat-bubble-wrapper ai fade-in">
              <div className="bubble-avatar ai-avatar"><Brain size={20} /></div>
              <div className="chat-bubble ai typing-bubble">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={handleSend} isTyping={isTyping} />
        <MobileBottomNav credits={credits} onLogout={handleLogout} />

        {/* ── Modal: Kredit tugadi ──────────────────────────────────────── */}
        {showCreditModal && (
          <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
            <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
              <h3>Kredit tugadi</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>
                Kredit paket sotib oling va davom eting.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="modal-close-btn" onClick={() => setShowCreditModal(false)}>
                  Yopish
                </button>
                <button style={{
                  flex: 1, padding: '10px 20px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer',
                }}>
                  Kredit sotib olish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Quiz ───────────────────────────────────────────────── */}
        {quiz?.active && (
          <div className="modal-overlay" onClick={() => !quiz.finished && null}>
            <div className="modal-content quiz-modal fade-in" onClick={e => e.stopPropagation()}>
              {!quiz.finished ? (
                <>
                  <div className="quiz-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <h3 style={{ margin: 0 }}>Savol {quiz.currentIdx + 1}/{quiz.questions.length}</h3>
                      <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                        {quiz.score} to'g'ri
                      </span>
                    </div>
                    <div className="quiz-progress-bar">
                      <div className="progress-fill" style={{ width: `${((quiz.currentIdx + 1) / quiz.questions.length) * 100}%` }} />
                    </div>
                  </div>

                  <div className="quiz-question">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {quiz.questions[quiz.currentIdx].question}
                    </ReactMarkdown>
                  </div>

                  <div className="quiz-options">
                    {quiz.questions[quiz.currentIdx].options.map((opt, idx) => {
                      const isSelected = quiz.feedback?.selectedOption === opt;
                      const isCorrect = opt.trim() === quiz.questions[quiz.currentIdx].answer.trim();
                      const statusClass = quiz.feedback
                        ? isCorrect ? 'correct' : isSelected ? 'wrong' : ''
                        : '';
                      return (
                        <button
                          key={idx}
                          className={`quiz-option ${statusClass}`}
                          disabled={!!quiz.feedback}
                          onClick={() => {
                            const correct = opt.trim() === quiz.questions[quiz.currentIdx].answer.trim();
                            setQuiz(prev => ({
                              ...prev,
                              feedback: { selectedOption: opt, isCorrect: correct },
                              score: correct ? prev.score + 1 : prev.score,
                            }));
                          }}
                        >
                          <ReactMarkdown>{opt}</ReactMarkdown>
                        </button>
                      );
                    })}
                  </div>

                  {quiz.feedback && (
                    <div className={`quiz-feedback-banner ${quiz.feedback.isCorrect ? 'correct' : 'wrong'} slide-up`}>
                      <p>
                        {quiz.feedback.isCorrect
                          ? '✅ To\'g\'ri!'
                          : `❌ Xato! Javob: ${quiz.questions[quiz.currentIdx].answer}`}
                      </p>
                      <button className="next-quiz-btn" onClick={() => {
                        const next = quiz.currentIdx + 1;
                        if (next < quiz.questions.length) {
                          setQuiz(prev => ({ ...prev, currentIdx: next, feedback: null }));
                        } else {
                          setQuiz(prev => ({ ...prev, finished: true }));
                        }
                      }}>
                        {quiz.currentIdx + 1 < quiz.questions.length ? 'Keyingi →' : 'Natijani ko\'r'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="quiz-results-screen">
                  <div style={{ fontSize: 60, marginBottom: 16 }}>
                    {quiz.score === quiz.questions.length ? '🏆' : quiz.score >= quiz.questions.length / 2 ? '🎯' : '📚'}
                  </div>
                  <h2>Natija: {quiz.score}/{quiz.questions.length}</h2>
                  <p style={{ color: '#94a3b8', marginBottom: 20 }}>
                    {quiz.score === quiz.questions.length ? 'Mukammal! Zo\'r natija!' : quiz.score >= quiz.questions.length / 2 ? 'Yaxshi! Davom eting!' : 'Yana o\'rganing va qaytadan urining!'}
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="modal-close-btn" onClick={() => setQuiz(null)}>Yopish</button>
                    <button
                      style={{ flex: 1, padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setQuiz(prev => ({ ...prev, currentIdx: 0, score: 0, feedback: null, finished: false }))}
                    >
                      Qayta ishlash
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notebook panel ────────────────────────────────────────────── */}
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
                    <button
                      className="delete-note"
                      onClick={async () => {
                        await supabase.from('notebook_entries').delete().eq('id', note.id);
                        setNotebook(prev => prev.filter(n => n.id !== note.id));
                      }}
                    >
                      O'chirish
                    </button>
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

export default TutorChat;