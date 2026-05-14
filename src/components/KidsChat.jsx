import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Brain, Star, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useTranslation } from 'react-i18next';
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

    try {
      sendMessage({ userText, currentMessages: messages, attachment, mode: 'KIDS' });
    } catch (err) {
      console.error('Xatolik:', err);
    }
  }, [isSending, messages, sendMessage]);

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
    <div className="min-h-screen bg-[#fffbeb] relative overflow-hidden font-sans selection:bg-orange-200">
      
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-pink-400 rounded-full animate-bounce duration-[5s]"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-sky-400 rotate-12 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-yellow-400 rounded-3xl animate-spin duration-[10s]"></div>
      </div>

      <header className="relative z-10 p-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b-4 border-orange-100">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-5 py-3 bg-white rounded-2xl border-4 border-orange-200 text-orange-500 font-black shadow-lg shadow-orange-100 hover:scale-105 active:scale-95 transition-all">
          <ArrowLeft size={24} /> {t('home', 'Asosiy')}
        </button>
        <div className="flex items-center gap-4 text-orange-500">
          <Star className="animate-bounce" fill="#fbbf24" color="#fbbf24" size={32} />
          <h1 className="text-2xl font-black tracking-tight">{t('kids_mode', 'Bolalar rejimi')}</h1>
          <Sparkles className="animate-pulse" color="#fbbf24" size={32} />
        </div>
        <button onClick={handleLogout} className="p-4 bg-red-100 text-red-500 rounded-2xl border-4 border-red-200 shadow-lg hover:scale-105 transition-all">
          <LogOut size={20} />
        </button>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto p-4 lg:p-8 flex flex-col h-[calc(100vh-112px)]">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-8">
          {messages.length === 0 ? (
            <div className="text-center py-20 space-y-12 animate-in fade-in zoom-in duration-700">
              <h2 className="text-3xl lg:text-4xl font-black text-orange-600 leading-tight">
                {t('welcome_kids', 'Salom, do\'stim! 👋\nNima haqida o\'rganamiz bugun?')}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {QUICK_CHIPS.map((chip, i) => (
                  <button key={i} onClick={() => handleSend(chip.prompt)} className="group bg-white p-8 rounded-[40px] border-4 border-orange-100 shadow-xl hover:border-orange-400 hover:scale-105 transition-all duration-300">
                    <div className="text-5xl mb-4 group-hover:scale-125 transition-transform">{chip.emoji}</div>
                    <div className="text-sm font-black text-orange-600">{chip.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <ChatMessage 
                  key={msg.id || idx} 
                  msg={msg} 
                  previousMsg={idx > 0 ? messages[idx - 1] : null}
                  isKids={true} 
                />
              ))}

              {quiz && (
                <div className="bg-white p-8 rounded-[40px] border-8 border-orange-100 shadow-2xl animate-in zoom-in duration-500 max-w-2xl mx-auto">
                  <div className="flex items-center gap-4 mb-8">
                    <Star fill="#fbbf24" color="#fbbf24" size={32} />
                    <h3 className="text-2xl font-black text-orange-600">Bilimingni sinab ko'r!</h3>
                  </div>
                  <div className="space-y-8">
                    {quiz.map((q, idx) => {
                      const isCorrect = selectedAnswers[idx] === q.correct;
                      return (
                        <div key={idx} className="space-y-4 p-6 bg-orange-50/50 rounded-3xl border-2 border-orange-100">
                          <div className="flex gap-3 text-lg font-black text-orange-800">
                            <span>{idx + 1}.</span>
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{q.question}</ReactMarkdown>
                          </div>
                          <div className="grid gap-3">
                            {q.options.map((opt, oIdx) => {
                              const isThisSelected = selectedAnswers[idx] === oIdx;
                              let borderClass = "border-orange-200 bg-white";
                              if (showResults) {
                                if (oIdx === q.correct) borderClass = "border-green-400 bg-green-50 text-green-700 shadow-[0_4px_0_#4ade80]";
                                else if (isThisSelected) borderClass = "border-red-400 bg-red-50 text-red-700 shadow-[0_4px_0_#f87171]";
                              } else if (isThisSelected) {
                                borderClass = "border-orange-500 bg-orange-100 text-orange-800 shadow-[0_4px_0_#f97316]";
                              }

                              return (
                                <button key={oIdx} disabled={showResults} onClick={() => setSelectedAnswers(prev => ({ ...prev, [idx]: oIdx }))}
                                  className={`p-4 rounded-2xl border-4 text-left font-bold transition-all active:scale-95 ${borderClass}`}>
                                  <ReactMarkdown components={{ p: 'span' }}>{opt}</ReactMarkdown>
                                </button>
                              );
                            })}
                          </div>
                          {showResults && (
                            <div className={`text-sm font-black mt-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {isCorrect ? '🌟 Barakalla!' : `🧸 To'g'ri javob: ${q.options[q.correct]}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {!showResults ? (
                    <button onClick={() => { setShowResults(true); toast(`Natijang: ${quiz.filter((q, i) => selectedAnswers[i] === q.correct).length}/${quiz.length} ✨`, { icon: '🏆' }); }}
                      disabled={Object.keys(selectedAnswers).length < quiz.length}
                      className="mt-10 w-full py-5 bg-orange-500 text-white rounded-[32px] font-black text-xl shadow-[0_8px_0_#c2410c] hover:translate-y-1 active:translate-y-2 active:shadow-none transition-all disabled:opacity-50">
                      Tayyor! Natijani ko'raylik
                    </button>
                  ) : (
                    <div className="flex gap-4 mt-10">
                      <button onClick={handleAnalyzeQuiz} className="flex-1 py-5 bg-primary text-white rounded-[32px] font-black shadow-[0_8px_0_#7c3aed] hover:translate-y-1 active:translate-y-2 active:shadow-none transition-all">Tushuntirib ber</button>
                      <button onClick={() => setQuiz(null)} className="flex-1 py-5 bg-slate-400 text-white rounded-[32px] font-black shadow-[0_8px_0_#64748b] hover:translate-y-1 active:translate-y-2 active:shadow-none transition-all">Yopish</button>
                    </div>
                  )}
                </div>
              )}

              {messages.length >= 2 && !quiz && (
                <button onClick={handleGenerateQuiz} className="mx-auto block px-8 py-4 bg-orange-500 text-white rounded-full font-black text-lg shadow-xl shadow-orange-200 hover:scale-105 active:scale-95 transition-all">
                   🎮 O'yinli Testni boshlash
                </button>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="py-8">
          <ChatInput onSend={handleSend} isTyping={isSending} placeholder={t('type_message', 'Xabar yozing...')} />
        </div>
      </main>
    </div>
  );
}

export default KidsChat;
