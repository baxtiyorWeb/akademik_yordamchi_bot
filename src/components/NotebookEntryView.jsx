import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Brain, BookOpen, MessageSquare, Sparkles, X, Send, Bookmark, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { generateNotebookQuiz, generateNotebookCheatSheet, streamGeminiResponse } from './../lib/gemini.js';
import { useNotebook } from '../hooks/useNotebook';
import { toast } from 'sonner';

export default function NotebookEntryView({ entry, session, onBack, startWithQuiz = false }) {
  const [activeTool, setActiveTool] = useState(null);
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

  // Mini Chat states
  const [selectedText, setSelectedText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [showMiniChat, setShowMiniChat] = useState(false);
  const [miniChatMessages, setMiniChatMessages] = useState([]);
  const [miniChatInput, setMiniChatInput] = useState('');
  const [isMiniChatLoading, setIsMiniChatLoading] = useState(false);

  const { saveEntry } = useNotebook(session);

  // Agar startWithQuiz bo'lsa, quiz'ni avtomatik bosla
  useEffect(() => {
    if (startWithQuiz) {
      const startQuizAuto = async () => {
        setActiveTool('quiz');
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
          toast.error("Test yaratishda xatolik");
          setActiveTool(null);
        }
        setIsLoading(false);
      };
      startQuizAuto();
    }
  }, [startWithQuiz, entry.content]);

  const handleTextSelection = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      if (text.length > 4) {
        const docArea = document.getElementById('document-content-area');
        if (docArea && docArea.contains(selection.anchorNode)) {
          const rect = selection.getRangeAt(0).getBoundingClientRect();
          setSelectedText(text);
          setTooltipPos({ top: rect.top - 15, left: rect.left + rect.width / 2 });
          setShowTooltip(true);
        }
      }
    }, 10);
  };

  const triggerExplanation = async (type) => {
    setShowTooltip(false);
    setShowMiniChat(true);
    setIsMiniChatLoading(true);

    const promptText = type === 'explain' 
      ? `Foydalanuvchi quyidagi matnni sodda, tushunarli va qisqa qilib tushuntir: "${selectedText}"`
      : `Quyidagi matnga oid qiziqarli va amaliy misol keltir: "${selectedText}"`;

    setMiniChatMessages([
      { role: 'user', content: type === 'explain' ? 'Tushuntirib bering' : 'Misol keltiring' },
      { role: 'ai', content: '' }
    ]);

    try {
      await streamGeminiResponse(promptText, [], null, 'TUTOR', (chunk) => {
        setMiniChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', content: chunk };
          return updated;
        });
      });
    } catch (err) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsMiniChatLoading(false);
    }
  };

  const handleMiniChatSend = async (e) => {
    e.preventDefault();
    if (!miniChatInput.trim() || isMiniChatLoading) return;

    const userMsg = { role: 'user', content: miniChatInput };
    setMiniChatMessages(prev => [...prev, userMsg, { role: 'ai', content: '' }]);
    setMiniChatInput('');
    setIsMiniChatLoading(true);

    try {
      await streamGeminiResponse(miniChatInput, miniChatMessages, null, 'TUTOR', (chunk) => {
        setMiniChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', content: chunk };
          return updated;
        });
      });
    } catch (err) {
      toast.error("Javob olishda xatolik");
    } finally {
      setIsMiniChatLoading(false);
    }
  };

  const handleSaveExplanation = () => {
    const lastAiMsg = miniChatMessages.filter(m => m.role === 'ai').pop();
    if (!lastAiMsg?.content) return;

    const content = `### Asl matn:\n> ${selectedText}\n\n### AI Tushuntirish:\n${lastAiMsg.content}`;
    saveEntry(content);
    toast.success("Konspektga saqlandi!");
  };

  const startQuiz = async () => {
    setActiveTool('quiz');
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
      toast.error("Test yaratishda xatolik");
      setActiveTool(null);
    }
    setIsLoading(false);
  };

  const startCheatSheet = async () => {
    setActiveTool('cheatsheet');
    setIsLoading(true);
    try {
      const data = await generateNotebookCheatSheet(entry.content);
      setCheatSheet(data);
    } catch (e) {
      toast.error("Konspekt yaratishda xatolik");
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

  const closeTool = () => setActiveTool(null);

  const markdownComponents = useMemo(() => ({
    p: ({ children }) => <p className="mb-4 text-[15.2px] leading-relaxed text-slate-700">{children}</p>,
    h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-semibold mt-7 mb-3">{children}</h2>,
    ul: ({ children }) => <ul className="list-disc ml-6 mb-5 space-y-2">{children}</ul>,
  }), []);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfdfe] relative overflow-hidden">
      {/* Mobile Tab Bar */}
      <div className="md:hidden flex border-b border-slate-100 bg-white shrink-0 z-30 sticky top-0">
        <button 
          onClick={() => setMobileTab('doc')}
          className={`flex-1 py-4 text-center font-semibold text-sm border-b-2 transition-all ${mobileTab === 'doc' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}
        >
          📖 Hujjat
        </button>
        <button 
          onClick={() => setMobileTab('tools')}
          className={`flex-1 py-4 text-center font-semibold text-sm border-b-2 transition-all ${mobileTab === 'tools' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}
        >
          ⚡ Asboblar
        </button>
      </div>

      {/* Document Area - Desktop va Mobile uchun yaxshi padding */}
      <div 
        className={`flex-1 overflow-y-auto ${mobileTab === 'doc' ? 'block' : 'hidden md:block'}`} 
        id="document-content-area"
        onMouseUp={handleTextSelection}
      >
        <div className="p-5 md:p-12 lg:p-16 max-w-4xl mx-auto">
          <button 
            onClick={() => { if (typeof onBack === 'function') { onBack(); } else { window.history.back(); } }}
            className="flex items-center gap-2 mb-8 text-slate-600 hover:text-slate-900 font-medium"
            aria-label="go back"
          >
            <ChevronLeft size={22} /> Ortga
          </button>

          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-10 leading-snug">
              {entry.title || 'Saqlangan Material'}
            </h1>
            
            <div className="prose prose-slate max-w-none prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-[15.5px]">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]} 
                rehypePlugins={[rehypeKatex, rehypeRaw]} 
                components={markdownComponents}
              >
                {entry.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Tools Panel */}
      <div className={`bg-white border-t md:border-l md:border-t-0 border-slate-200 flex flex-col h-full transition-all md:relative fixed inset-0 z-40 md:z-10 ${mobileTab === 'tools' ? 'block' : 'hidden md:flex'}`}>
        {!activeTool ? (
          <div className="p-4 md:p-6 overflow-y-auto">
            <button 
              onClick={startQuiz} 
              className="w-full p-4 md:p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-all active:scale-[0.995] flex items-start gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-lg">
                <Brain size={28} className="text-indigo-600" />
              </div>
              <div>
                <h4 className="text-xl font-semibold">Imtihon Simulyatori</h4>
                <p className="text-slate-500 mt-1 text-sm">Bilimingizni sinab ko'ring</p>
              </div>
            </button>

            <button 
              onClick={startCheatSheet} 
              className="w-full p-4 md:p-5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition-all active:scale-[0.995] mt-3 flex items-start gap-4"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-lg">
                <BookOpen size={28} className="text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xl font-semibold">Qisqa Konspekt</h4>
                <p className="text-slate-500 mt-1 text-sm">Muhim joylarni jamlang</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 md:p-5 border-b flex items-center justify-between bg-slate-50">
              <span className="font-semibold text-lg">
                {activeTool === 'quiz' ? 'Imtihon Simulyatori' : 'Qisqa Konspekt'}
              </span>
              <button onClick={closeTool} className="p-2 hover:bg-slate-200 rounded-xl">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-8">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : activeTool === 'quiz' && quizData ? (
                <div className="flex flex-col h-full">
                  {!quizFinished ? (
                    <div>
                      <div className="flex justify-between mb-6">
                        <span className="text-indigo-600 font-bold">Savol {currentQuestion + 1}/{quizData.length}</span>
                        <span className="font-medium">Ball: {score}</span>
                      </div>
                      <h3 className="text-xl font-semibold leading-tight mb-8">{quizData[currentQuestion].question}</h3>
                      <div className="space-y-3">
                        {quizData[currentQuestion].options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            disabled={showExplanation}
                            className={`w-full text-left p-6 md:p-7 rounded-3xl border-2 transition-all text-[15px] leading-relaxed ${showExplanation ? 
                              (idx === quizData[currentQuestion].correctAnswerIndex ? 'border-emerald-500 bg-emerald-50' : 
                               idx === selectedOption ? 'border-rose-500 bg-rose-50' : 'opacity-50') 
                              : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
                          >
                            <span className="font-bold mr-4 inline-block w-6">{String.fromCharCode(65 + idx)}.</span> 
                            {opt}
                          </button>
                        ))}
                      </div>

                      {showExplanation && (
                        <div className="mt-8 p-6 md:p-8 bg-indigo-50 rounded-3xl">
                          <p className="font-medium text-slate-700 leading-relaxed">{quizData[currentQuestion].explanation}</p>
                          <button 
                            onClick={nextQuestion} 
                            className="mt-8 w-full bg-slate-900 text-white py-4 rounded-2xl font-semibold hover:bg-black transition-all"
                          >
                            {currentQuestion < quizData.length - 1 ? 'Keyingi savol' : 'Natijani ko\'rish'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <h2 className="text-3xl font-bold text-emerald-600">Ajoyib natija!</h2>
                      <p className="mt-4 text-lg">Siz {score}/{quizData.length} ball oldingiz</p>
                    </div>
                  )}
                </div>
              ) : activeTool === 'cheatsheet' && cheatSheet ? (
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={markdownComponents}>
                    {cheatSheet}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Mini Chat Widget */}
      {showMiniChat && createPortal(
        <div className="mini-chat-widget fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 w-auto md:w-[520px] max-h-[70vh] bg-white rounded-3xl shadow-2xl border border-slate-100 z-[100] overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
              <MessageSquare size={22} className="text-indigo-600" />
              <div>
                <p className="font-semibold">Smart Tushuntirgich</p>
                <p className="text-xs text-slate-500">AI yordamchi</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveExplanation} className="p-2 hover:bg-indigo-100 rounded-xl transition-colors">
                <Bookmark size={22} />
              </button>
              <button onClick={() => setShowMiniChat(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-b text-sm italic text-slate-600 line-clamp-2">
            "{selectedText}"
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {miniChatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>
                  {msg.role === 'ai' && msg.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.content || (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="animate-spin" size={18} /> Tahlil qilinmoqda...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleMiniChatSend} className="p-4 border-t flex gap-2">
            <input
              type="text"
              value={miniChatInput}
              onChange={(e) => setMiniChatInput(e.target.value)}
              placeholder="Yana savol bering..."
              className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            <button 
              type="submit" 
              disabled={!miniChatInput.trim() || isMiniChatLoading} 
              className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}