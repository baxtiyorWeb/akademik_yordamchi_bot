import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, User, Brain, Star, LogOut, BookOpen, Zap, TrendingUp, Settings, Trash2, Sigma, Mic, Languages, Code, Edit2, Check, X, FileText, Globe, PenTool, Cpu, Menu } from 'lucide-react';
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
import { toast } from 'sonner';

// Custom Hooks
import { useProfile } from '../hooks/useProfile';
import { useMessages } from '../hooks/useMessages';
import { useNotebook } from '../hooks/useNotebook';

const QUICK_CHIPS = [
  { icon: <Languages size={20} />, label: 'Ingliz zamonlari', desc: 'Zamonlar tahlili va misollar', prompt: 'Ingliz tili zamonlarini tushuntirib ber', color: '#6366f1' },
  { icon: <Globe size={20} />, label: 'Ruscha tarjima', desc: 'Matnlarni professional tarjima qilish', prompt: "Ushbu matnni rus tiliga tarjima qil: 'Salom, ahvollar qalay?'", color: '#3b82f6' },
  { icon: <PenTool size={20} />, label: 'IELTS Writing', desc: 'IELTS uchun foydali maslahatlar', prompt: 'IELTS Writing task 2 uchun foydali so\'zlar', color: '#f59e0b' },
  { icon: <Sigma size={20} />, label: 'Matematika', desc: 'Murakkab misollar yechimi', prompt: 'Kvadrat tenglamani yechishni tushuntirib ber', color: '#10b981' },
  { icon: <Code size={20} />, label: 'Dasturlash', desc: 'Kod yozish va xatolarni tuzatish', prompt: 'Python da funksiyalar haqida misollar bilan tushuntir', color: '#8b5cf6' },
  { icon: <FileText size={20} />, label: 'PDF tayyorlash', desc: 'Mavzuni PDF ga eksport qilish', prompt: 'Menga biror mavzuda PDF fayl tayyorlab ber', color: '#ec4899' },
];

function TutorChat({ session }) {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  // TanStack Query Hooks
  const { profile, decrementCredits } = useProfile(session);
  const { messages, isSending, setMessages, sendMessage, clearChat } = useMessages(session);
  const { entries: notebook, saveEntry, deleteEntry } = useNotebook(session);

  // Local UI State
  const [showNotebook, setShowNotebook] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [vibeMode, setVibeMode] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [isVoiceCall, setIsVoiceCall] = useState(false);
  const [isListeningForVoice, setIsListeningForVoice] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [useSegments, setUseSegments] = useState(false);
  const [activeTopic, setActiveTopic] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const [isArchiving, setIsArchiving] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);


  const handleLogoClick = () => {
    // 3 marta tez bosilsa - Vibe Mode (Easter Egg)
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next >= 3) {
        const newVibe = !vibeMode;
        setVibeMode(newVibe);
        toast.info(newVibe ? "Engine Vibe Yoqildi! ✨" : "Engine Vibe O'chirildi");
        
        if (audioRef.current) {
          if (newVibe) {
            audioRef.current.play().catch(e => console.log("Audio play blocked", e));
          } else {
            audioRef.current.pause();
          }
        }
        return 0;
      }
      return next;
    });

    // ChatGPT/Gemini uslubida: Logo bosilsa yangi chat boshlanadi
    if (messages.length > 0) {
      handleClearChat();
    }

    // 1 soniyadan keyin clicklarni tozalash
    setTimeout(() => setLogoClicks(0), 1000);
  };

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

    const quizKeywords = ['test tuz', 'savol ber', 'bilimimni tekshir', 'quiz qil', 'savollar tuz', 'test ber'];
    const isQuizRequest = quizKeywords.some(kw => userText?.toLowerCase().includes(kw));

    if (isQuizRequest) {
      handleGenerateQuiz();
      return;
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

  const handleGenerateQuiz = useCallback(async () => {
    if (isSending || messages.length < 2) return;

    const quizPrompt = `[SYSTEM: QUIZ GENERATION]\nSuhbat tarixidan kelib chiqib foydalanuvchi bilimini tekshirish uchun 3 ta qiziqarli test (multiple choice) savoli tuz. \nJavobni FAQAT JSON formatida quyidagicha qaytar:\n[{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}]`;

    const loadingId = toast.loading('Savollar tayyorlanmoqda...');
    try {
      const { fetchGeminiResponse } = await import('../api/gemini');
      const response = await fetchGeminiResponse(quizPrompt, messages, null, 'TUTOR');

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedQuiz = JSON.parse(jsonMatch[0]);
        setQuiz(parsedQuiz);
        setSelectedAnswers({});
        setShowResults(false);
        toast.success('Test tayyor!', { id: loadingId });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      toast.error('Xatolik yuz berdi', { id: loadingId });
      console.error('Quiz generation error:', err);
    }
  }, [isSending, messages]);

  const handleAnalyzeQuiz = useCallback(async () => {
    if (!quiz || !showResults) return;

    const analysisPrompt = `Ushbu test natijalarini tahlil qiling:\n${quiz.map((q, i) => `Savol: ${q.question}\nBerilgan javob: ${q.options[selectedAnswers[i]]}\nTo'g'ri javob: ${q.options[q.correct]}`).join('\n\n')}\n\nFoydalanuvchiga xatolarini tushuntiring va tavsiyalar bering.`;

    setQuiz(null);
    setShowResults(false);
    sendMessage({ userText: analysisPrompt, currentMessages: messages });
  }, [quiz, showResults, selectedAnswers, messages, sendMessage]);

  // ── Voice Call Logic ────────────────────────────────────────────────────────
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'uz-UZ'; // Default to Uzbek
    // Try to detect language or just use system default
    window.speechSynthesis.speak(utterance);

    utterance.onend = () => {
      if (isVoiceCall) {
        startListening();
      }
    };
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListeningForVoice(true);
    recognition.onend = () => setIsListeningForVoice(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setLastTranscript(transcript);
      if (event.results[0].isFinal) {
        recognition.stop();
        handleVoiceSubmit(transcript);
      }
    };
    recognition.start();
  };

  const handleVoiceSubmit = async (text) => {
    if (!text.trim() || isSending) return;
    try {
      const { fetchGeminiResponse } = await import('../api/gemini');
      const response = await fetchGeminiResponse(text, messages, null, 'TUTOR');
      sendMessage({ userText: text, aiResponse: response });
      speakText(response);
    } catch (err) {
      console.error(err);
      setIsVoiceCall(false);
    }
  };

  const toggleVoiceCall = () => {
    if (isVoiceCall) {
      setIsVoiceCall(false);
      window.speechSynthesis.cancel();
    } else {
      setIsVoiceCall(true);
      startListening();
    }
  };

  // ── Message Grouping Logic ──────────────────────────────────────────────────
  const TOPIC_TYPES = [
    { id: 'math', label: 'Matematika', icon: <Sigma size={14} />, keywords: ['matematika', 'integral', 'tenglama', 'misol', 'hisob', 'formula', 'son'] },
    { id: 'english', label: 'Ingliz tili', icon: <Languages size={14} />, keywords: ['ingliz', 'english', 'ielts', 'grammar', 'so\'z', 'tarjima'] },
    { id: 'coding', label: 'Dasturlash', icon: <Code size={14} />, keywords: ['kod', 'python', 'js', 'react', 'css', 'dastur', 'vibe'] },
    { id: 'science', label: 'Fan va Ta\'lim', icon: <BookOpen size={14} />, keywords: ['fizika', 'tarix', 'kimyo', 'biologiya', 'falsafa', 'ilmiy'] },
  ];

  const getMessageTopic = (text) => {
    const lower = (text || "").toLowerCase();
    for (const t of TOPIC_TYPES) {
      if (t.keywords.some(k => lower.includes(k))) return t.id;
    }
    return 'general';
  };

  const segments = useMemo(() => {
    if (messages.length === 0) return [];
    const groups = [];
    let currentGroup = { topicId: 'general', messages: [], summary: '' };

    messages.forEach((msg, idx) => {
      if (msg.role === 'user') {
        const newTopicId = getMessageTopic(msg.content);
        if (newTopicId !== currentGroup.topicId && currentGroup.messages.length > 0) {
          groups.push(currentGroup);
          currentGroup = { topicId: newTopicId, messages: [msg], summary: msg.content.substring(0, 40) + '...' };
        } else {
          currentGroup.topicId = newTopicId;
          currentGroup.messages.push(msg);
          if (!currentGroup.summary) currentGroup.summary = msg.content.substring(0, 40) + '...';
        }
      } else {
        currentGroup.messages.push(msg);
      }
    });
    groups.push(currentGroup);
    return groups;
  }, [messages]);

  const activeSegments = useMemo(() => {
    if (activeTopic === 'all') return segments;
    return segments.filter(s => s.topicId === activeTopic);
  }, [segments, activeTopic]);

  const chatSummary = useMemo(() => {
    if (messages.length === 0) return null;
    const userMsgs = messages.filter(m => m.role === 'user');
    return userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content.substring(0, 60) + "..." : "";
  }, [messages]);

  const handleLogout = useCallback(() => supabase.auth.signOut(), []);

  // ── Supabase Logic ─────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tutor_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching sessions:", error);
    else setSessions(data || []);
    setIsLoadingSessions(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleClearChat = useCallback(async () => {
    if (messages.length === 0 || isArchiving || isLoadingSessions) return;

    // Dublikatlarni tekshirish: faqat mazmun (role va content) bo'yicha
    const cleanCurrent = messages.map(m => ({ role: m.role, content: m.content }));

    const isAlreadyArchived = sessions.some(s => {
      const cleanSession = s.messages.map(m => ({ role: m.role, content: m.content }));
      return JSON.stringify(cleanSession) === JSON.stringify(cleanCurrent);
    });

    if (isAlreadyArchived) {
      setMessages([]);
      setCurrentSessionId(null);
      setVisibleCount(15);
      return;
    }

    setIsArchiving(true);
    const loadingId = toast.loading("Suhbat arxivlanmoqda...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Arxivlash (Supabase-ga saqlash)
      let autoTitle = messages[0].content
        .replace(/\[Ilova:.*?\]/g, '') // Ilova qismini olib tashlash
        .replace(/[#*`_]/g, '')        // Markdown belgilarini olib tashlash
        .trim()
        .substring(0, 40);

      if (!autoTitle) autoTitle = "Yangi suhbat";
      if (messages[0].content.length > 40) autoTitle += "...";

      const { error } = await supabase
        .from('tutor_sessions')
        .insert({
          user_id: user.id,
          title: autoTitle,
          messages: messages,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessages([]);
      setCurrentSessionId(null);
      setVisibleCount(15);
      fetchSessions();
      toast.success("Suhbat bulutga arxivlandi!", { id: loadingId });
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Xatolik: " + error.message, { id: loadingId });
    } finally {
      setIsArchiving(false);
    }
  }, [messages, fetchSessions, isArchiving, currentSessionId, setMessages]);

  const loadSession = (session) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setVisibleCount(15);
    setShowHistory(false);
    toast.info("Eski suhbat bulutdan yuklandi");
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Ushbu suhbatni o'chirmoqchimisiz?")) return;

    const { error } = await supabase.from('tutor_sessions').delete().eq('id', id);
    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success("Suhbat o'chirildi");
    }
  };

  const startRenaming = (session, e) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleRename = async (id) => {
    if (!editingTitle.trim()) return;

    const { error } = await supabase
      .from('tutor_sessions')
      .update({ title: editingTitle })
      .eq('id', id);

    if (!error) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editingTitle } : s));
      setEditingSessionId(null);
      toast.success("Nom o'zgartirildi");
    }
  };

  // UI helpers
  const creditColor = useMemo(() =>
    credits > 20 ? '#10b981' : credits > 5 ? '#f59e0b' : '#ef4444',
    [credits]);

  return (
    <div className={`tutor-layout ${vibeMode ? 'vibe-active' : ''}`}>
      {vibeMode && <VibeBackground />}
      <audio ref={audioRef} loop src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" />

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

            <button
              className="tutor-info-card"
              onClick={handleGenerateQuiz}
              disabled={messages.length < 2 || isSending}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', opacity: messages.length < 2 ? 0.5 : 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} style={{ color: '#8b5cf6' }} />
                <h3 style={{ margin: 0 }}>Bilimni sinash</h3>
              </div>
              <p style={{ marginTop: 4, fontSize: '0.78rem', color: '#94a3b8' }}>Mavzu bo'yicha AI test tuzadi</p>
            </button>

            <button
              className="tutor-info-card"
              onClick={handleClearChat}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={16} style={{ color: '#ef4444' }} />
                <h3 style={{ margin: 0, color: '#ef4444' }}>Yangi Suhbat</h3>
              </div>
              <p style={{ marginTop: 4, fontSize: '0.78rem', color: '#94a3b8' }}>Joriyni arxivlab, yangisini boshlash</p>
            </button>

            <div className="sidebar-history">
              <h4 className="sidebar-section-title">Suhbatlar Tarixi (Cloud)</h4>
              {isLoadingSessions ? (
                <div className="history-loading">Yuklanmoqda...</div>
              ) : sessions.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#475569', padding: '0 10px' }}>Tarix bo'sh</p>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className={`history-item-container ${editingSessionId === s.id ? 'editing' : ''}`}>
                    {editingSessionId === s.id ? (
                      <div className="session-edit-box">
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                        />
                        <button onClick={() => handleRename(s.id)} className="save-btn"><Check size={12} /></button>
                        <button onClick={() => setEditingSessionId(null)} className="cancel-btn"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className={`history-item ${currentSessionId === s.id ? 'active' : ''}`} onClick={() => loadSession(s)}>
                        <BookOpen size={12} className="history-icon" />
                        <span className="session-title">{s.title}</span>
                        <div className="session-actions">
                          <Edit2 size={12} className="edit-session-icon" onClick={(e) => startRenaming(s, e)} />
                          <Trash2 size={12} className="delete-session-icon" onClick={(e) => deleteSession(s.id, e)} />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              className="tutor-info-card voice-call-btn"
              onClick={toggleVoiceCall}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic size={16} style={{ color: '#10b981' }} />
                <h3 style={{ margin: 0, color: '#10b981' }}>Ovozli Muloqot</h3>
              </div>
              <p style={{ marginTop: 4, fontSize: '0.78rem', color: '#94a3b8' }}>Real-vaqtda AI bilan gaplashish</p>
            </button>

            <button
              className="tutor-info-card"
              onClick={() => navigate('/math')}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sigma size={16} style={{ color: '#a78bfa' }} />
                <h3 style={{ margin: 0, color: '#a78bfa' }}>Matematika Markazi</h3>
              </div>
              <p style={{ marginTop: 4, fontSize: '0.78rem', color: '#94a3b8' }}>Formula va Word bilan ishlash</p>
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
          <div className="header-left">
            <button className="burger-menu-btn" onClick={() => setIsMobileSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="header-title">
              <h2>{activeTopic === 'all' ? 'Til Tahlili va O\'rganish' : TOPIC_TYPES.find(t => t.id === activeTopic)?.label}</h2>
              {chatSummary && <p className="chat-mini-summary">Oxirgi mavzu: {chatSummary}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {messages.length > 4 && activeTopic === 'all' && (
              <button
                className={`segment-toggle-btn ${useSegments ? 'active' : ''}`}
                onClick={() => setUseSegments(!useSegments)}
              >
                {useSegments ? 'Oddiy' : 'Bo\'limlar'}
              </button>
            )}
            <div className="header-badge mobile-hide"><span>Professional Rejim</span></div>
          </div>
        </header>

        <div className="chat-messages">
          {messages.length > visibleCount && (
            <button
              className="load-more-btn"
              onClick={() => setVisibleCount(prev => prev + 15)}
            >
              Oldingi xabarlarni yuklash ({messages.length - visibleCount} ta qoldi)
            </button>
          )}

          {messages.length === 0 ? (
            <div className="welcome-state fade-in">
              <div className="welcome-icon-wrapper pulse"><Sparkles size={48} /></div>
              <h2>LingoAI Markaziga Xush Kelibsiz</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
                Har qanday savol bering — til, matematika, dasturlash yoki boshqa fanlar
              </p>
              <div className="suggestion-chips">
                {QUICK_CHIPS.map((chip, i) => (
                  <button key={i} onClick={() => handleSend(chip.prompt)} className="chip-btn fade-in" style={{ animationDelay: `${i * 0.1}s`, borderLeft: `4px solid ${chip.color}` }}>
                    <div className="chip-icon-wrapper" style={{ backgroundColor: `${chip.color}15`, color: chip.color }}>
                      {chip.icon}
                    </div>
                    <div className="chip-info">
                      <span className="chip-label">{chip.label}</span>
                      <span className="chip-desc">{chip.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {useSegments || activeTopic !== 'all' ? (
                activeSegments.map((seg, sIdx) => (
                  <div key={sIdx} className="chat-segment-block fade-in">
                    <div className="segment-divider">
                      <div className="segment-line" />
                      <div className="segment-label">
                        {TOPIC_TYPES.find(t => t.id === seg.topicId)?.icon || <Sparkles size={12} />}
                        <span>{TOPIC_TYPES.find(t => t.id === seg.topicId)?.label || 'Boshqa'} - {seg.summary}</span>
                      </div>
                      <div className="segment-line" />
                    </div>
                    {seg.messages.map((msg, idx) => (
                      <ChatMessage
                        key={msg.id}
                        msg={msg}
                        previousMsg={idx > 0 ? seg.messages[idx - 1] : null}
                        onSave={saveEntry}
                        onAutoFix={handleAutoFix}
                      />
                    ))}
                  </div>
                ))
              ) : (
                messages.slice(-visibleCount).map((msg, idx) => (
                  <ChatMessage
                    key={msg.id}
                    msg={msg}
                    previousMsg={idx > 0 ? messages.slice(-visibleCount)[idx - 1] : null}
                    onSave={saveEntry}
                    onAutoFix={handleAutoFix}
                  />
                ))
              )}

              {quiz && (
                <div className="quiz-section fade-in">
                  <div className="quiz-header">
                    <Sparkles size={20} color="#fbbf24" />
                    <h3>Bilimingizni sinab ko'ring!</h3>
                  </div>
                  <div className="quiz-list">
                    {quiz.map((q, idx) => {
                      const isSelected = selectedAnswers[idx] !== undefined;
                      const isCorrect = selectedAnswers[idx] === q.correct;

                      return (
                        <div key={idx} className="quiz-item" style={{ opacity: showResults && !isCorrect ? 0.8 : 1 }}>
                          <div className="quiz-question">
                            <strong>{idx + 1}.</strong>
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.question}
                            </ReactMarkdown>
                          </div>
                          <div className="quiz-options">
                            {q.options.map((opt, oIdx) => {
                              const isThisSelected = selectedAnswers[idx] === oIdx;
                              let btnStyle = {};

                              if (showResults) {
                                if (oIdx === q.correct) btnStyle = { background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981', color: '#10b981' };
                                else if (isThisSelected) btnStyle = { background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#ef4444' };
                              } else if (isThisSelected) {
                                btnStyle = { background: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1', color: '#fff' };
                              }

                              return (
                                <button
                                  key={oIdx}
                                  className="quiz-opt-btn"
                                  disabled={showResults}
                                  style={btnStyle}
                                  onClick={() => {
                                    setSelectedAnswers(prev => ({ ...prev, [idx]: oIdx }));
                                  }}
                                >
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: 'span' }}>
                                    {opt}
                                  </ReactMarkdown>
                                </button>
                              );
                            })}
                          </div>
                          {showResults && (
                            <div className="quiz-explanation" style={{ marginTop: 10, fontSize: '0.8rem', color: isCorrect ? '#10b981' : '#94a3b8' }}>
                              {isCorrect ? '✅ To\'g\'ri!' : `❌ Xato. To'g'ri javob: ${q.options[q.correct]}`}
                              <p style={{ marginTop: 4, fontStyle: 'italic' }}>{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!showResults ? (
                    <button
                      className="quiz-close"
                      disabled={Object.keys(selectedAnswers).length < quiz.length}
                      onClick={() => {
                        setShowResults(true);
                        const correctCount = quiz.filter((q, i) => selectedAnswers[i] === q.correct).length;
                        toast.info(`Siz ${quiz.length} tadan ${correctCount} tasiga to'g'ri javob berdingiz!`);
                      }}
                      style={{ opacity: Object.keys(selectedAnswers).length < quiz.length ? 0.5 : 1 }}
                    >
                      Natijalarni ko'rish
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                      <button className="quiz-close" onClick={handleAnalyzeQuiz} style={{ flex: 1, margin: 0 }}>Tahlil qilish</button>
                      <button className="quiz-close" onClick={() => setQuiz(null)} style={{ flex: 1, margin: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Yopish</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}


          <div ref={messagesEndRef} />
        </div>

        <ChatInput onSend={handleSend} isTyping={isSending} />
        <MobileBottomNav credits={credits} onLogout={handleLogout} onVoiceCall={toggleVoiceCall} />

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

        {/* ── Voice Call Overlay ─────────────────────────────────────────── */}
        {isVoiceCall && (
          <div className="voice-call-overlay fade-in">
            <div className="call-orb-container">
              <div className={`call-orb ${isListeningForVoice ? 'listening' : 'speaking'}`}>
                <div className="orb-inner" />
                <div className="orb-wave w1" />
                <div className="orb-wave w2" />
              </div>
              <div className="call-status">
                <h3>{isListeningForVoice ? "Sizni eshityapman..." : "LingoAI gapirmoqda..."}</h3>
                <p className="transcript-preview">{lastTranscript || "Savol bering..."}</p>
              </div>
            </div>
            <button className="end-call-btn" onClick={toggleVoiceCall}>
              <LogOut size={24} />
              <span>Muloqotni yakunlash</span>
            </button>
          </div>
        )}
      </main>

      {/* ── O'ng Sidebar: Mavzular ─────────────────────────────────────── */}
      {!vibeMode && messages.length > 0 && (
        <aside className="tutor-right-sidebar fade-in">
          <div className="sidebar-brand">
            <TrendingUp size={18} style={{ color: '#8b5cf6' }} />
            <h2 style={{ fontSize: '0.85rem' }}>Chat Tahlili</h2>
          </div>

          <div className="sidebar-content">
            <div className="sidebar-topics">
              <h4 className="sidebar-section-title">Mavzular (Chapters)</h4>
              <button
                className={`topic-item ${activeTopic === 'all' ? 'active' : ''}`}
                onClick={() => { setActiveTopic('all'); setUseSegments(false); }}
              >
                <div className="topic-icon"><Sparkles size={14} /></div>
                <span>Barcha xabarlar</span>
              </button>
              {TOPIC_TYPES.map(t => {
                const count = segments.filter(s => s.topicId === t.id).length;
                if (count === 0) return null;
                return (
                  <button
                    key={t.id}
                    className={`topic-item ${activeTopic === t.id ? 'active' : ''}`}
                    onClick={() => { setActiveTopic(t.id); setUseSegments(true); }}
                  >
                    <div className="topic-icon">{t.icon}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{t.label}</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Bo'limni ko'rish</span>
                    </div>
                    <span className="topic-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="tutor-info-card highlighted" style={{ marginTop: 'auto' }}>
              <h3>Statistika</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Suhbat davomida {segments.length} ta asosiy mavzu aniqlandi.</p>
            </div>
          </div>
        </aside>
      )}
      {/* ── Mobile Sidebar Drawer ────────────────────────────────────────── */}
      <div className={`mobile-sidebar-drawer ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="drawer-backdrop" onClick={() => setIsMobileSidebarOpen(false)} />
        <div className="drawer-content">
          <div className="drawer-header">
            <div className="sidebar-brand">
              <Brain size={24} color="#8b5cf6" />
              <h2>LingoAI Expert</h2>
            </div>
            <button className="drawer-close-btn" onClick={() => setIsMobileSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="drawer-body">
            <div className="drawer-section">
              <h4 className="sidebar-section-title">Hisob</h4>
              <div className="tutor-info-card credits" style={{ background: `${creditColor}10`, border: `1px solid ${creditColor}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Zap size={18} style={{ color: creditColor }} />
                  <div>
                    <h3 style={{ fontSize: '1rem', color: creditColor }}>{credits} KREDIT</h3>
                    <p style={{ fontSize: '0.7rem', color: '#64748b' }}>Sizning balansingiz</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-section">
              <h4 className="sidebar-section-title">Mavzular (Chapters)</h4>
              <div className="sidebar-topics">
                <button
                  className={`topic-item ${activeTopic === 'all' ? 'active' : ''}`}
                  onClick={() => { setActiveTopic('all'); setUseSegments(false); setIsMobileSidebarOpen(false); }}
                >
                  <div className="topic-icon"><Sparkles size={14} /></div>
                  <span>Barcha xabarlar</span>
                </button>
                {TOPIC_TYPES.map(t => {
                  const count = segments.filter(s => s.topicId === t.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={t.id}
                      className={`topic-item ${activeTopic === t.id ? 'active' : ''}`}
                      onClick={() => { setActiveTopic(t.id); setUseSegments(true); setIsMobileSidebarOpen(false); }}
                    >
                      <div className="topic-icon">{t.icon}</div>
                      <span>{t.label}</span>
                      <span className="topic-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="drawer-section">
              <h4 className="sidebar-section-title">Suhbatlar Tarixi</h4>
              <div className="sidebar-history">
                {sessions.map(s => (
                  <div key={s.id} className="history-item-container">
                    <button className="history-item" onClick={() => { loadSession(s); setIsMobileSidebarOpen(false); }}>
                      <BookOpen size={12} />
                      <span className="session-title">{s.title}</span>
                      <Trash2 size={12} className="delete-session-icon" onClick={(e) => deleteSession(s.id, e)} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="drawer-footer">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={18} /> Chiqish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vibe Background (Engine Vizualizatsiyasi) ──────────────────────────────
const VibeBackground = () => (
  <div className="vibe-engine-bg">
    <div className="vibe-core" />
    <div className="vibe-particles" />
    <style>{`
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