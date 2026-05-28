import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Search, Settings, RotateCcw, LayoutGrid, MessageSquare,
  CheckSquare, Users, AppWindow, LogOut, Brain, Zap, Target, BookOpen, Clock,
  MoreVertical, FileText, Star, Sparkles, Smile
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '../supabase';
import { toast } from 'sonner';

// Components & Hooks
import ChatInput from './ChatInput';
import { useProfile } from '../hooks/useProfile';
import { useMessages } from '../hooks/useMessages';
import { useNotebook } from '../hooks/useNotebook';

const QUICK_CHIPS = [
  { emoji: '🦁', label: 'Animal stories', prompt: 'Tell me a fun story about animals' },
  { emoji: '🚀', label: 'Space travel', prompt: 'How do rockets work?' },
  { emoji: '🎨', label: 'Drawing tips', prompt: 'How can I draw a cat?' },
];

function KidsChat({ session }) {
  const messagesEndRef = useRef(null);
  const { messages, isSending, setMessages, sendMessage } = useMessages(session);
  const { saveEntry } = useNotebook(session);

  const [quiz, setQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isSending, scrollToBottom]);

  const handleSend = async (userText, attachment) => {
    try {
      sendMessage({ userText, currentMessages: messages, attachment, mode: 'KIDS' });
    } catch (err) {
      toast.error('Something went wrong');
    }
  };

  const handleGenerateQuiz = async () => {
    if (isSending || messages.length < 2) return;
    const quizPrompt = `[SYSTEM: KIDS QUIZ]\nCreate a fun 3-question quiz for kids based on our chat. Use JSON: [{"question": "...", "options": ["A", "B", "C"], "correct": 0, "explanation": "..."}]`;
    
    const loadingId = toast.loading('Preparing a game... 🎮');
    try {
      const { fetchGeminiResponse } = await import('../api/gemini');
      const response = await fetchGeminiResponse(quizPrompt, messages, null, 'KIDS');
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        setQuiz(JSON.parse(jsonMatch[0]));
        toast.success('Game ready! ✨', { id: loadingId });
      }
    } catch (err) {
      toast.error('Failed to load game', { id: loadingId });
    }
  };

  const handleSaveToNotebook = (content) => {
    saveEntry(content);
    toast.success('Saved to notebook! ✨');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white nano-bg relative overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-10 custom-scrollbar pb-40">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto h-full flex flex-col items-center justify-center text-center py-20 animate-in fade-in zoom-in duration-1000">
            <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center text-orange-500 mb-8 border border-orange-100 shadow-sm shadow-orange-500/5">
              <Smile size={48} strokeWidth={1.2} />
            </div>
            <h1 className="text-2xl font-normal text-slate-900 mb-3 tracking-tight">Hi there, explorer! 👋</h1>
            <p className="text-slate-500 text-[15px] max-w-sm mx-auto leading-relaxed font-normal">
              What do you want to learn today? We can talk about animals, space, or anything you like!
            </p>

            <div className="flex flex-wrap justify-center gap-3 mt-12">
              {QUICK_CHIPS.map((chip, i) => (
                <button key={i} onClick={() => handleSend(chip.prompt)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 text-slate-600 text-sm font-normal rounded-full hover:border-orange-200 hover:bg-orange-50 transition-all shadow-sm">
                  <span>{chip.emoji}</span> {chip.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-12">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`group flex gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start w-full'}`}>
                  {msg.role === 'user' ? (
                    <div className="message-user bg-orange-500 text-white border-none shadow-lg shadow-orange-500/10 font-normal">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="message-ai w-full border-orange-100">
                      <div className="prose prose-sm max-w-none text-slate-800 text-[15px] font-normal leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-4 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleSaveToNotebook(msg.content)} className="flex items-center gap-1.5 text-[12px] font-medium text-orange-400 hover:text-orange-600 transition-colors"><Plus size={12} /> Saqlash</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {quiz && (
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[40px] border border-orange-100 shadow-xl shadow-orange-500/5 animate-in zoom-in duration-500 w-full max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <Star fill="#fbbf24" color="#fbbf24" size={20} className="animate-pulse" />
                  <h3 className="text-lg font-normal text-slate-900">Quiz Time! 🎮</h3>
                </div>
                <div className="space-y-8">
                  {quiz.map((q, idx) => (
                    <div key={idx} className="space-y-4">
                      <div className="text-[14px] font-normal text-slate-800">
                        <span className="text-orange-500 mr-2">{idx + 1}.</span>{q.question}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {q.options.map((opt, oIdx) => {
                          const isThisSelected = selectedAnswers[idx] === oIdx;
                          let style = "bg-white/50 border-slate-100 text-slate-600";
                          if (showResults) {
                            if (oIdx === q.correct) style = "bg-green-50 border-green-200 text-green-700";
                            else if (isThisSelected) style = "bg-red-50 border-red-200 text-red-700";
                          } else if (isThisSelected) {
                            style = "bg-orange-50 border-orange-200 text-orange-600";
                          }

                          return (
                            <button key={oIdx} disabled={showResults} onClick={() => setSelectedAnswers(prev => ({ ...prev, [idx]: oIdx }))}
                              className={`p-4 rounded-2xl border text-center text-[12px] font-normal transition-all active:scale-95 ${style}`}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                {!showResults ? (
                  <button onClick={() => { setShowResults(true); toast.success('Results ready! 🏆'); }}
                    disabled={Object.keys(selectedAnswers).length < quiz.length}
                    className="mt-10 w-full py-4 bg-orange-500 text-white rounded-2xl font-normal text-sm shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all disabled:opacity-50">
                    See Results
                  </button>
                ) : (
                  <button onClick={() => setQuiz(null)} className="mt-10 w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-normal text-sm hover:bg-slate-200 transition-all">Close Quiz</button>
                )}
              </div>
            )}

            {isSending && (
              <div className="message-ai w-full max-w-3xl animate-pulse border-orange-50">
                <div className="flex gap-1 items-center px-1">
                  <div className="w-1 h-1 bg-orange-300 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-orange-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 bg-orange-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* --- REFINED INPUT AREA --- */}
      <div className="px-6 py-10 bg-transparent absolute bottom-0 left-0 w-full z-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/80 backdrop-blur-3xl border border-white rounded-[40px] p-4 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] focus-within:border-orange-200 transition-all">
            <ChatInput onSend={handleSend} isTyping={isSending} isKids={true} />
            <div className="flex items-center justify-between px-1 pt-4 border-t border-slate-50 mt-4">
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full text-[10px] font-normal text-orange-600 border border-orange-100">
                    <Star size={10} fill="currentColor" /> 1,240 pts
                 </div>
                 {messages.length >= 2 && !quiz && (
                    <button onClick={handleGenerateQuiz} className="text-[10px] font-normal text-slate-400 hover:text-orange-500 flex items-center gap-2 uppercase tracking-widest transition-colors"><Zap size={12} /> Play Quiz</button>
                 )}
               </div>
               <button onClick={() => setMessages([])} className="text-[10px] font-normal text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">Clear Chat</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KidsChat;
