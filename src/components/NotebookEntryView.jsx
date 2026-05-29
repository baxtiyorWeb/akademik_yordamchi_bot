import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Brain, BookOpen, MessageSquare, Play, Sparkles, X, CheckCircle2, XCircle, Send, Bookmark, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { generateNotebookQuiz, generateNotebookCheatSheet, streamGeminiResponse } from '../api/gemini';
import { useNotebook } from '../hooks/useNotebook';
import { toast } from 'sonner';

export default function NotebookEntryView({ entry, session, onBack }) {
  const [activeTool, setActiveTool] = useState(null); // 'quiz', 'cheatsheet'
  const [mobileTab, setMobileTab] = useState('doc'); // 'doc', 'tools'
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [cheatSheet, setCheatSheet] = useState(null);
  
  // Quiz states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Notebook saving integration
  const { saveEntry } = useNotebook(session);

  // Selection Q&A states
  const [selectedText, setSelectedText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [showMiniChat, setShowMiniChat] = useState(false);
  const [miniChatMessages, setMiniChatMessages] = useState([]);
  const [isMiniChatLoading, setIsMiniChatLoading] = useState(false);
  const [miniChatInput, setMiniChatInput] = useState('');

  const handleTextSelection = (e) => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 2) {
        const docArea = document.getElementById('document-content-area');
        if (docArea && docArea.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Position tooltip 12px above the selection top edge in viewport
          const top = rect.top - 12;
          const left = rect.left + (rect.width / 2);
          
          setSelectedText(text);
          setTooltipPos({ top, left });
          setShowTooltip(true);
        }
      }
    }, 20);
  };

  useEffect(() => {
    const docArea = document.getElementById('document-content-area');
    const handleScroll = () => {
      setShowTooltip(false);
    };
    if (docArea) {
      docArea.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (docArea) {
        docArea.removeEventListener('scroll', handleScroll);
      }
    };
  }, [showTooltip]);

  const handleDocumentClick = (e) => {
    if (!e.target.closest('.selection-tooltip') && !e.target.closest('.mini-chat-widget')) {
      const selection = window.getSelection();
      if (!selection.toString().trim()) {
        setShowTooltip(false);
      }
    }
  };

  const triggerExplanation = async (type) => {
    setShowTooltip(false);
    setShowMiniChat(true);
    setIsMiniChatLoading(true);
    
    const promptText = type === 'explain' 
      ? `Foydalanuvchi quyidagi matnni sodda, tushunarli va qisqa qilib tushuntirishingizni so'ramoqda:\n\n"${selectedText}"\n\nIltimos, ilmiy atamalarni soddalashtirib, hayotiy misol yoki analogiya keltirgan holda tushuntiring. Javobingizni chiroyli va mukammal formatlangan Markdown shaklida bering (zarurat bo'lsa jadvallar, ro'yxatlar, qalin matnlar ishlating).`
      : `Foydalanuvchi quyidagi matn yoki tushunchaga oid hayotiy amaliy misol yoki masala keltirishingizni so'ramoqda:\n\n"${selectedText}"\n\nIltimos, juda qiziqarli, tushunarli va amaliy misol yozing. Mavzuni yaxshi o'zlashtirishga yordam beradigan misol bo'lsin. Javobingizni chiroyli va mukammal formatlangan Markdown shaklida bering.`;
      
    const initialMsg = { role: 'user', content: type === 'explain' ? `Tushuntirib bering: "${selectedText}"` : `Misol keltiring: "${selectedText}"` };
    setMiniChatMessages([initialMsg, { role: 'ai', content: '' }]);
    
    try {
      await streamGeminiResponse(
        promptText,
        [],
        null,
        'TUTOR',
        (chunk) => {
          setMiniChatMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { role: 'ai', content: chunk };
            }
            return updated;
          });
        }
      );
    } catch (err) {
      toast.error("Tushuntirish olishda xatolik yuz berdi");
    } finally {
      setIsMiniChatLoading(false);
    }
  };

  const handleMiniChatSend = async (e) => {
    e.preventDefault();
    if (!miniChatInput.trim() || isMiniChatLoading) return;
    
    const userMsg = { role: 'user', content: miniChatInput };
    const currentHistory = [...miniChatMessages, userMsg];
    setMiniChatMessages(currentHistory);
    setMiniChatInput('');
    setIsMiniChatLoading(true);
    
    setMiniChatMessages(prev => [...prev, { role: 'ai', content: '' }]);
    
    try {
      await streamGeminiResponse(
        userMsg.content,
        miniChatMessages,
        null,
        'TUTOR',
        (chunk) => {
          setMiniChatMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { role: 'ai', content: chunk };
            }
            return updated;
          });
        }
      );
    } catch (err) {
      toast.error("Xabar yuborishda xatolik yuz berdi");
    } finally {
      setIsMiniChatLoading(false);
    }
  };

  const handleSaveExplanation = () => {
    const aiMessages = miniChatMessages.filter(m => m.role === 'ai');
    if (aiMessages.length === 0) {
      toast.error("Saqlash uchun hech qanday ma'lumot topilmadi");
      return;
    }
    const lastAiMsg = aiMessages[aiMessages.length - 1].content;
    if (!lastAiMsg) return;
    
    try {
      const content = `### Asl matn:\n> ${selectedText}\n\n### AI Tushuntirish:\n${lastAiMsg}`;
      saveEntry(content);
      toast.success("Konspektga saqlab qo'yildi!");
    } catch (err) {
      toast.error("Saqlashda xatolik yuz berdi");
    }
  };

  // Common markdown styles
  const markdownComponents = useMemo(() => ({
    p: ({ children }) => <div className="mb-4 last:mb-0 leading-relaxed text-slate-700 text-[15px]">{children}</div>,
    table: ({ node, ...props }) => <div className="overflow-x-auto my-8"><table className="w-full text-left border-collapse rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-100" {...props} /></div>,
    thead: ({ node, ...props }) => <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 text-[13px] uppercase tracking-wider font-bold" {...props} />,
    tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-slate-50" {...props} />,
    tr: ({ node, ...props }) => <tr className="hover:bg-indigo-50/30 transition-colors" {...props} />,
    th: ({ node, ...props }) => <th className="px-6 py-4 font-bold" {...props} />,
    td: ({ node, ...props }) => <td className="px-6 py-4 text-slate-600 text-[14px] leading-relaxed" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2 marker:text-indigo-400" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 marker:text-indigo-500 marker:font-semibold" {...props} />,
    li: ({ node, ...props }) => <li className="pl-2 text-slate-700 leading-relaxed text-[15px]" {...props} />,
    code({ node, inline, className, children, ...props }) {
      return <code className="bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded-lg font-semibold text-[0.9em]" {...props}>{children}</code>;
    }
  }), []);

  const miniChatMarkdownComponents = useMemo(() => ({
    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-700 text-[13.5px]">{children}</p>,
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-3 w-full border border-slate-100 rounded-xl">
        <table className="w-full text-left border-collapse" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 text-[11px] uppercase tracking-wider font-bold" {...props} />,
    tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-slate-50" {...props} />,
    tr: ({ node, ...props }) => <tr className="hover:bg-indigo-50/20 transition-colors" {...props} />,
    th: ({ node, ...props }) => <th className="px-3 py-2 font-bold text-[11px]" {...props} />,
    td: ({ node, ...props }) => <td className="px-3 py-2 text-slate-600 text-[12px] leading-relaxed break-words whitespace-normal" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1 marker:text-indigo-400 text-[13px]" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1 marker:text-indigo-500 marker:font-semibold text-[13px]" {...props} />,
    li: ({ node, ...props }) => <li className="pl-1 text-slate-700 leading-relaxed text-[13px]" {...props} />,
    code({ node, inline, className, children, ...props }) {
      return <code className="bg-slate-50 text-slate-700 px-1 py-0.5 rounded font-semibold text-[0.85em] break-all" {...props}>{children}</code>;
    }
  }), []);

  const startQuiz = async () => {
    setActiveTool('quiz');
    if (quizData) return;
    setIsLoading(true);
    try {
      const data = await generateNotebookQuiz(entry.content);
      setQuizData(data);
      setCurrentQuestion(0);
      setScore(0);
      setQuizFinished(false);
      setSelectedOption(null);
      setShowExplanation(false);
    } catch (e) {
      toast.error("Test yaratishda xatolik yuz berdi");
      setActiveTool(null);
    }
    setIsLoading(false);
  };

  const startCheatSheet = async () => {
    setActiveTool('cheatsheet');
    if (cheatSheet) return;
    setIsLoading(true);
    try {
      const data = await generateNotebookCheatSheet(entry.content);
      setCheatSheet(data);
    } catch (e) {
      toast.error("Konspekt yaratishda xatolik yuz berdi");
      setActiveTool(null);
    }
    setIsLoading(false);
  };

  const handleAnswer = (idx) => {
    if (showExplanation) return;
    setSelectedOption(idx);
    setShowExplanation(true);
    if (idx === quizData[currentQuestion].correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setQuizFinished(true);
    }
  };

  const closeTool = () => {
    setActiveTool(null);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#fcfdfe] relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Mobile Tab Selector */}
      <div className="md:hidden flex border-b border-slate-100 bg-white shrink-0 z-20">
        <button 
          onClick={() => setMobileTab('doc')}
          className={`flex-1 py-3.5 text-center text-[12px] uppercase tracking-wider font-bold border-b-2 transition-all ${mobileTab === 'doc' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400'}`}
        >
          📖 Hujjat
        </button>
        <button 
          onClick={() => setMobileTab('tools')}
          className={`flex-1 py-3.5 text-center text-[12px] uppercase tracking-wider font-bold border-b-2 transition-all ${mobileTab === 'tools' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400'}`}
        >
          ⚡ Asboblar {activeTool && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full inline-block ml-1 animate-pulse" />}
        </button>
      </div>

      {/* LEFT: Document Container */}
      <div className={`flex-1 flex-col h-full relative border-r border-slate-100 bg-[#fcfdfe] w-full md:w-auto ${mobileTab === 'doc' ? 'flex' : 'hidden md:flex'}`}>
        {/* Scrollable content area */}
        <div 
          id="document-content-area"
          onMouseUp={handleTextSelection}
          onClick={handleDocumentClick}
          className="flex-1 overflow-y-auto p-10 custom-scrollbar"
        >
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors font-semibold text-[11px] uppercase tracking-widest bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-xl w-fit">
            <ChevronLeft size={16} /> Ortga
          </button>
          
          <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8 leading-snug">{entry.title || 'Saqlangan Manba'}</h1>
              
              <div className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-[15px]">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={markdownComponents}>
                  {entry.content}
              </ReactMarkdown>
              </div>
          </div>
        </div>

        {/* Floating Mini Chat for inline Q&A (outside scrollable area) */}
        {showMiniChat && (
          <div className="mini-chat-widget absolute bottom-6 right-6 w-[480px] sm:w-[540px] max-h-[620px] flex flex-col bg-white border border-slate-100 rounded-[28px] shadow-2xl z-40 overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-5">
             <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-[12px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <MessageSquare size={16} className="text-indigo-600"/> Smart Tushuntirgich
                </span>
                <div className="flex items-center gap-1">
                   <button 
                      onClick={handleSaveExplanation} 
                      title="Konspektga saqlash"
                      className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-slate-400 transition-colors"
                   >
                      <Bookmark size={16} />
                   </button>
                   <button 
                      onClick={() => setShowMiniChat(false)} 
                      className="p-2 hover:bg-slate-200/50 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                   >
                      <X size={18} />
                   </button>
                </div>
             </div>
             
             <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 text-[11px] text-slate-500 italic font-medium leading-relaxed text-left line-clamp-2">
                "{selectedText}"
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
                {miniChatMessages.map((msg, idx) => (
                   <div 
                      key={idx} 
                      className={msg.role === 'user' 
                         ? "self-end bg-indigo-50 text-indigo-900 px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] font-medium text-[13px] leading-relaxed ml-auto text-left" 
                         : "self-start bg-slate-50 text-slate-800 px-3.5 py-2.5 rounded-2xl rounded-tl-sm max-w-[95%] border border-slate-100 mr-auto text-[13px] leading-relaxed text-left w-full prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-2"
                      }
                   >
                      {msg.role === 'user' ? (
                         msg.content
                      ) : (
                         msg.content ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={miniChatMarkdownComponents}>
                               {msg.content}
                            </ReactMarkdown>
                         ) : (
                            <div className="flex items-center gap-2 text-slate-400 py-1">
                               <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                               <span className="text-[12px] font-semibold tracking-wider uppercase text-slate-400">Tahlil qilinmoqda...</span>
                            </div>
                         )
                      )}
                   </div>
                ))}
             </div>

             <form onSubmit={handleMiniChatSend} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white">
                <input 
                   type="text" 
                   value={miniChatInput}
                   onChange={(e) => setMiniChatInput(e.target.value)}
                   placeholder="Qo'shimcha savol bormi?..." 
                   className="flex-1 bg-slate-50 border-none rounded-xl px-3 py-2.5 text-[12.5px] outline-none focus:ring-1 focus:ring-indigo-100 transition-all font-medium text-slate-700"
                   disabled={isMiniChatLoading}
                />
                <button 
                   type="submit" 
                   disabled={isMiniChatLoading || !miniChatInput.trim()}
                   className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
                >
                   <Send size={15} />
                </button>
             </form>
          </div>
        )}

        {/* Floating Tooltip for selected text (using React Portal to prevent clipping) */}
        {showTooltip && createPortal(
          <div 
            className="selection-tooltip fixed bg-slate-900 text-white rounded-2xl p-1.5 shadow-2xl z-[9999] flex items-center gap-1 border border-slate-800 animate-in fade-in zoom-in-95 duration-200"
            style={{ 
              top: `${tooltipPos.top}px`, 
              left: `${tooltipPos.left}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <button 
              onClick={() => triggerExplanation('explain')} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap text-indigo-300"
            >
              <Sparkles size={14} className="text-indigo-400 animate-pulse" /> Soddaroq tushuntir
            </button>
            <div className="w-[1px] h-4 bg-slate-800 my-auto" />
            <button 
              onClick={() => triggerExplanation('example')} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap text-emerald-300"
            >
              <BookOpen size={14} className="text-emerald-400" /> Misol keltir
            </button>
          </div>,
          document.body
        )}
      </div>
      
      {/* RIGHT: Tools Panel */}
      <div className={`bg-white flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10 relative h-full transition-all duration-300 ease-in-out ${mobileTab === 'tools' ? 'flex w-full' : 'hidden md:flex'} ${activeTool ? 'md:w-[600px] lg:md:w-[700px]' : 'md:w-[450px]'}`}>
         
         {!activeTool ? (
           <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-5 h-full">
             <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" /> Notebook Asboblari
             </h3>
             
             {/* Gradient for icons */}
             <svg width="0" height="0" className="absolute">
               <linearGradient id="tool-indigo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#6366f1" />
                 <stop offset="100%" stopColor="#a855f7" />
               </linearGradient>
               <linearGradient id="tool-emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#10b981" />
                 <stop offset="100%" stopColor="#3b82f6" />
               </linearGradient>
             </svg>

             <button onClick={startQuiz} className="bg-transparent border border-slate-200 p-6 rounded-[24px] hover:border-indigo-400 hover:bg-indigo-50/10 transition-all flex flex-col gap-3 group text-left relative overflow-hidden">
                <div className="flex items-center justify-start group-hover:scale-110 transition-transform origin-left">
                   <Brain size={32} strokeWidth={2} stroke="url(#tool-indigo-grad)" />
                </div>
                <div className="relative z-10 mt-1">
                   <h4 className="text-[17px] font-bold text-slate-900 group-hover:text-indigo-700 transition-colors tracking-tight">Imtihon Simulyatori</h4>
                   <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed font-medium">Ushbu matn asosida testlar yoki Flashcardlar orqali o'zingizni sinang.</p>
                </div>
             </button>

             <button onClick={startCheatSheet} className="bg-transparent border border-slate-200 p-6 rounded-[24px] hover:border-emerald-400 hover:bg-emerald-50/10 transition-all flex flex-col gap-3 group text-left relative overflow-hidden">
                <div className="flex items-center justify-start group-hover:scale-110 transition-transform origin-left">
                   <BookOpen size={32} strokeWidth={2} stroke="url(#tool-emerald-grad)" />
                </div>
                <div className="relative z-10 mt-1">
                   <h4 className="text-[17px] font-bold text-slate-900 group-hover:text-emerald-700 transition-colors tracking-tight">Qisqa Konspekt</h4>
                   <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed font-medium">Eng muhim tushunchalar va qoidalarni bitta sahifaga yig'ish (Cheat Sheet).</p>
                </div>
             </button>
           </div>
         ) : (
           <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <span className="text-[12px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    {activeTool === 'quiz' ? <><Brain size={16} className="text-indigo-600"/> Simulyator</> : <><BookOpen size={16} className="text-emerald-600"/> Konspekt</>}
                 </span>
                 <button onClick={closeTool} className="p-2 hover:bg-slate-200/50 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                    <X size={18} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                 {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4 animate-pulse">
                       <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                       <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">AI tahlil qilmoqda...</p>
                    </div>
                 ) : activeTool === 'quiz' && quizData ? (
                    <div className="flex flex-col h-full">
                       {!quizFinished ? (
                         <div className="animate-in fade-in duration-500">
                           <div className="flex items-center justify-between mb-6">
                              <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">Savol {currentQuestion + 1} / {quizData.length}</span>
                              <span className="text-[12px] font-bold text-slate-400">Score: {score}</span>
                           </div>
                           
                           <h3 className="text-[18px] font-semibold text-slate-900 leading-snug mb-8">{quizData[currentQuestion].question}</h3>
                           
                           <div className="flex flex-col gap-3">
                              {quizData[currentQuestion].options.map((opt, idx) => {
                                 let btnClass = "text-left p-4 rounded-2xl border-2 transition-all font-medium text-[14px] leading-relaxed relative overflow-hidden ";
                                 if (!showExplanation) {
                                    btnClass += "border-slate-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-700";
                                 } else {
                                    if (idx === quizData[currentQuestion].correctAnswerIndex) {
                                       btnClass += "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_0_20px_rgba(16,185,129,0.15)]";
                                    } else if (idx === selectedOption) {
                                       btnClass += "border-rose-400 bg-rose-50 text-rose-800";
                                    } else {
                                       btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                                    }
                                 }

                                 return (
                                   <button key={idx} onClick={() => handleAnswer(idx)} disabled={showExplanation} className={btnClass}>
                                      <div className="flex gap-4 items-center">
                                         <span className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-xl text-[13px] font-bold ${showExplanation && idx === quizData[currentQuestion].correctAnswerIndex ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {String.fromCharCode(65 + idx)}
                                         </span>
                                         <span>{opt}</span>
                                      </div>
                                   </button>
                                 );
                              })}
                           </div>

                           {showExplanation && (
                             <div className="mt-8 p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl animate-in slide-in-from-bottom-4">
                                <h4 className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                  {selectedOption === quizData[currentQuestion].correctAnswerIndex ? <CheckCircle2 size={16}/> : <XCircle size={16} className="text-rose-500"/>}
                                  Tushuntirish
                                </h4>
                                <p className="text-[14px] text-slate-700 leading-relaxed font-medium">{quizData[currentQuestion].explanation}</p>
                                <button onClick={nextQuestion} className="mt-5 w-full bg-slate-900 text-white py-3.5 rounded-xl text-[14px] font-semibold hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all">
                                  {currentQuestion < quizData.length - 1 ? 'Keyingi Savol' : 'Natijani Ko\'rish'}
                                </button>
                             </div>
                           )}
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in-95 duration-500 gap-6 py-10">
                            <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                               <Sparkles size={40} className="text-emerald-500" />
                            </div>
                            <div>
                               <h2 className="text-2xl font-bold text-slate-900 mb-2">Ajoyib Natija!</h2>
                               <p className="text-slate-500 font-medium">Siz {quizData.length} ta savoldan {score} tasiga to'g'ri javob berdingiz.</p>
                            </div>
                            <button onClick={() => { setActiveTool(null); setTimeout(startQuiz, 10); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700">Qaytadan ishlash</button>
                         </div>
                       )}
                    </div>
                 ) : activeTool === 'cheatsheet' && cheatSheet ? (
                    <div className="prose prose-sm max-w-none prose-p:text-slate-700 prose-headings:text-slate-900 animate-in fade-in duration-500">
                       <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={markdownComponents}>{cheatSheet}</ReactMarkdown>
                    </div>
                 ) : null}
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
