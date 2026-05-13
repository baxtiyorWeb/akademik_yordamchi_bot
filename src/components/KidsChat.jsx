import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Brain, Star, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useTranslation } from 'react-i18next';
import './KidsChat.css';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useProfile } from '../hooks/useProfile';
import { useMessages } from '../hooks/useMessages';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const QUICK_CHIPS = [
  { emoji: '🦁', prompt: 'Hayvonlar haqida gaplashamiz' },
  { emoji: '🚀', prompt: 'Koinot qanday tuzilgan?' },
  { emoji: '🎨', prompt: 'Qanday qilib rasm chizamiz?' },
  { emoji: '🤖', prompt: 'Robotlar nima qila oladi?' },
];

function KidsChat({ session }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);

  const { profile } = useProfile(session);
  const { messages, isSending, sendMessage } = useMessages(session);
  const [quiz, setQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = useCallback(async (userText, attachment = null) => {
    if ((!userText?.trim() && !attachment) || isSending) return;

    const gameKeywords = ['o\'yin', 'test', 'savol', 'quiz', 'bilimim', 'tekshir'];
    if (gameKeywords.some(kw => userText?.toLowerCase().includes(kw))) {
      handleGenerateQuiz();
      return;
    }

    // KIDS mode yuborish
    try {
      sendMessage({ userText, currentMessages: messages, attachment, mode: 'KIDS' });
    } catch (err) {
      console.error('Xatolik:', err);
    }
  }, [isSending, messages, sendMessage, handleGenerateQuiz]);

  const handleGenerateQuiz = useCallback(async () => {
    if (isSending || messages.length < 2) return;
    
    const quizPrompt = `[SYSTEM: KIDS QUIZ]\nSuhbat tarixidan kelib chiqib bolalar uchun 3 ta juda sodda va qiziqarli rasm-belgili test tuz. \nJavobni FAQAT JSON formatida quyidagicha qaytar:\n[{"question": "...", "options": ["Option A", "Option B", "Option C"], "correct": 0, "explanation": "..."}]`;
    
    const loadingId = toast.loading('O\'yin tayyorlanmoqda... 🎮');
    try {
      const { fetchGeminiResponse } = await import('../api/gemini');
      const response = await fetchGeminiResponse(quizPrompt, messages, null, 'KIDS');
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedQuiz = JSON.parse(jsonMatch[0]);
        setQuiz(parsedQuiz);
        setSelectedAnswers({});
        setShowResults(false);
        toast.success('O\'yin tayyor! ✨', { id: loadingId });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      toast.error('Xatolik bo\'ldi 😢', { id: loadingId });
      console.error('Kids quiz error:', err);
    }
  }, [isSending, messages]);

  const handleAnalyzeQuiz = useCallback(async () => {
    if (!quiz || !showResults) return;
    const analysisPrompt = `Bilimingni tekshirib ko'raylik! Mana natijalar:\n${quiz.map((q, i) => `Savol: ${q.question}\nSening javobing: ${q.options[selectedAnswers[i]]}\nTo'g'ri javob: ${q.options[q.correct]}`).join('\n\n')}\n\nBolajonimga xatolarini juda shirin va tushunarli tilda tushuntirib ber.`;
    setQuiz(null);
    setShowResults(false);
    sendMessage({ userText: analysisPrompt, currentMessages: messages, mode: 'KIDS' });
  }, [quiz, showResults, selectedAnswers, messages, sendMessage]);

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  return (
    <div className="kids-layout">
      {/* ── Background Elements ── */}
      <div className="kids-bg-shapes">
        <div className="shape circle" />
        <div className="shape triangle" />
        <div className="shape square" />
      </div>

      <header className="kids-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={24} /> {t('home', 'Asosiy')}
        </button>
        <div className="kids-title">
          <Star className="bounce" fill="#fef08a" color="#fef08a" />
          <h1>{t('kids_mode', 'Bolalar rejimi')}</h1>
          <Sparkles className="pulse" color="#fef08a" />
        </div>
        <button className="kids-logout" onClick={handleLogout}>
          <LogOut size={20} />
        </button>
      </header>

      <main className="kids-main">
        <div className="kids-chat-area">
          {messages.length === 0 ? (
            <div className="kids-welcome">
              <h2>{t('welcome_kids', 'Salom, do\'stim! Nima haqida o\'rganamiz bugun?')}</h2>
              <div className="kids-chips">
                {QUICK_CHIPS.map((chip, i) => (
                  <button key={i} onClick={() => handleSend(chip.prompt)} className="kids-chip">
                    <span className="chip-emoji">{chip.emoji}</span>
                    <span className="chip-text">{chip.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="kids-messages">
              {messages.map((msg, idx) => (
                <ChatMessage 
                  key={msg.id} 
                  msg={msg} 
                  previousMsg={idx > 0 ? messages[idx - 1] : null}
                  isKids={true} 
                />
              ))}

              {quiz && (
                <div className="kids-quiz fade-in">
                  <div className="kids-quiz-header">
                    <Star fill="#fbbf24" color="#fbbf24" />
                    <h3>Bilimingni sinab ko'r!</h3>
                  </div>
                  <div className="kids-quiz-list">
                    {quiz.map((q, idx) => {
                      const isCorrect = selectedAnswers[idx] === q.correct;
                      return (
                        <div key={idx} className="kids-quiz-item">
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <strong>{idx + 1}.</strong>
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.question}
                            </ReactMarkdown>
                          </div>
                          <div className="kids-quiz-options">
                            {q.options.map((opt, oIdx) => {
                              const isThisSelected = selectedAnswers[idx] === oIdx;
                              let btnStyle = {};
                              if (showResults) {
                                if (oIdx === q.correct) btnStyle = { borderColor: '#4ade80', background: '#f0fdf4' };
                                else if (isThisSelected) btnStyle = { borderColor: '#f87171', background: '#fef2f2' };
                              } else if (isThisSelected) {
                                btnStyle = { borderColor: '#8b5cf6', background: '#f5f3ff' };
                              }

                              return (
                                <button 
                                  key={oIdx} 
                                  disabled={showResults}
                                  style={btnStyle}
                                  onClick={() => setSelectedAnswers(prev => ({ ...prev, [idx]: oIdx }))}
                                >
                                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{ p: 'span' }}>
                                    {opt}
                                  </ReactMarkdown>
                                </button>
                              );
                            })}
                          </div>
                          {showResults && (
                            <div style={{ marginTop: 10, fontSize: '0.9rem', color: isCorrect ? '#16a34a' : '#ef4444' }}>
                              {isCorrect ? '🌟 Barakalla!' : `🧸 To'g'ri javob: ${q.options[q.correct]}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {!showResults ? (
                    <button 
                      className="kids-quiz-close" 
                      disabled={Object.keys(selectedAnswers).length < quiz.length}
                      style={{ opacity: Object.keys(selectedAnswers).length < quiz.length ? 0.5 : 1 }}
                      onClick={() => {
                        setShowResults(true);
                        const correctCount = quiz.filter((q, i) => selectedAnswers[i] === q.correct).length;
                        toast(`Sening natijang: ${correctCount}/${quiz.length} ✨`, { icon: '🏆' });
                      }}
                    >
                      Tayyor! Natijani ko'raylik
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                      <button className="kids-quiz-close" onClick={handleAnalyzeQuiz} style={{ flex: 1, margin: 0, background: '#8b5cf6', boxShadow: '0 4px 0 #6d28d9' }}>Tushuntirib ber</button>
                      <button className="kids-quiz-close" onClick={() => setQuiz(null)} style={{ flex: 1, margin: 0, background: '#94a3b8', boxShadow: '0 4px 0 #64748b' }}>Yopish</button>
                    </div>
                  )}
                </div>
              )}

              {messages.length >= 2 && !quiz && (
                <button className="kids-quiz-trigger" onClick={handleGenerateQuiz}>
                   🎮 O'yinli Testni boshlash
                </button>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="kids-input-wrapper">
          <ChatInput onSend={handleSend} isTyping={isSending} placeholder={t('type_message', 'Xabar yozing...')} />
        </div>
      </main>
    </div>
  );
}

export default KidsChat;
