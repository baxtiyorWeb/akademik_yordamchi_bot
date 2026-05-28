import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
import {
  MessageSquare, CheckSquare, Code, Search, Brain,
  Plus, Mic, ArrowUp, Image as ImageIcon, Copy,
  Bookmark, Share2, Terminal, Download, FileText, Paperclip, X, Sparkles,
  Play, Check, ChevronRight, Eye, Info, AlertCircle, Save, Database, Layers,
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { toast, Toaster } from 'sonner';

// Hooks
import { useMessages } from '../hooks/useMessages';
import { useNotebook } from '../hooks/useNotebook';

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', fontFamily: 'Inter, sans-serif' });

// SVG Gradient component to be used by icons
const IconGradient = () => (
  <svg width="0" height="0" className="absolute">
    <linearGradient id="icon-blue-purple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#9333ea" />
    </linearGradient>
  </svg>
);

// ─── PROFESSIONAL COMPONENTS ───────────────────────────────────────

const MermaidChart = React.memo(({ chart, isStreaming }) => {
  const [svg, setSvg] = useState('');
  const containerRef = useRef(null);
  const uniqueId = useId().replace(/:/g, '');
  useEffect(() => {
    if (!chart || chart.length < 10 || isStreaming) return;
    const render = async () => {
      if (!containerRef.current) return;
      try {
        containerRef.current.innerHTML = '';
        const { svg: r } = await mermaid.render(`mermaid-${uniqueId}`, chart);
        setSvg(r);
      } catch (e) {}
    };
    const t = setTimeout(render, isStreaming ? 1500 : 100);
    return () => clearTimeout(t);
  }, [chart, isStreaming, uniqueId]);
  return (
    <div className="my-6 flex justify-center w-full animate-in fade-in duration-500">
      <div ref={containerRef} className="w-full p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex justify-center min-h-[100px]">
        {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full flex justify-center" /> : <div className="text-[11px] font-medium text-slate-300 italic uppercase tracking-widest">Tahlil...</div>}
      </div>
    </div>
  );
});

const CodeBlock = React.memo(({ language, value, isStreaming }) => {
  const [copied, setCopied] = useState(false);
  if (language === 'mermaid' || value.trim().startsWith('graph ') || value.trim().startsWith('sequenceDiagram')) return <MermaidChart chart={value} isStreaming={isStreaming} />;
  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-slate-100 bg-[#1e293b] shadow-sm">
      <div className="px-5 py-2.5 flex justify-between items-center border-b border-slate-700/50">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language || 'CODE'}</span>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('NUSXA OLINDI'); }} className="text-slate-500 hover:text-white transition-all"><Copy size={16} /></button>
      </div>
      <SyntaxHighlighter language={language} style={oneDark} customStyle={{ margin: 0, padding: '20px', fontSize: '14px', background: 'transparent' }}>{value}</SyntaxHighlighter>
    </div>
  );
});

const SmartNoteLM = React.memo(({ title, content, onSave }) => {
  const [isSaved, setIsSaved] = useState(false);
  return (
    <div className="my-6 bg-white border border-indigo-50 rounded-2xl p-5 shadow-sm transition-all hover:border-indigo-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center shadow-sm">
             <BookOpen size={20} stroke="url(#icon-blue-purple)" />
           </div>
           <div><h3 className="text-[15px] font-semibold text-slate-900 m-0">{title || 'Manba'}</h3><span className="text-[11px] text-slate-400">Notebook LM tahlili</span></div>
        </div>
        <button onClick={() => { onSave(content); setIsSaved(true); toast.success('Notebookga saqlandi'); }} disabled={isSaved} className={`px-4 py-2 rounded-xl text-[12px] font-medium transition-all ${isSaved ? 'text-emerald-500 bg-emerald-50' : 'text-slate-900 bg-slate-50 hover:bg-white hover:shadow-lg'}`}>
          {isSaved ? 'Saqlandi' : 'Saqlash'}
        </button>
      </div>
      <div className="prose prose-sm max-w-none text-slate-600 border-t border-slate-50 pt-4 text-[14px]"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown></div>
    </div>
  );
});

// ─── BOT MESSAGE ─────────────────────────────────────────────────────
const BotMessage = React.memo(({ content, isStreaming, onCopy, onSave }) => {
  const [unlockedSteps, setUnlockedSteps] = useState(1);
  const [showSolution, setShowSolution] = useState(false);
  const processedContent = useMemo(() => {
    let t = content;
    const mRegex = /(graph\s+(?:TD|LR|TB|BT|RL)[\s\S]*?)(?=\n\n|\n[a-zA-Z]|\n$|$)/gi;
    if ((t.includes('graph ') || t.includes('sequenceDiagram')) && !t.includes('```mermaid')) {
       t = t.replace(mRegex, (m) => `\n\n\`\`\`mermaid\n${m.trim()}\n\`\`\`\n\n`);
    }
    return t;
  }, [content]);
  const { mainBody, noteData, steps, solution } = useMemo(() => {
    const noteParts = processedContent.split(':::note');
    let m = noteParts[0]; let n = null;
    if (noteParts[1]) {
       const [tL, ...cL] = noteParts[1].split('\n');
       n = { title: tL.trim(), content: cL.join('\n').split(':::')[0] };
       m = m + (noteParts[1].split(':::')[1] || '');
    }
    const solParts = m.split(':::solution'); const mSteps = solParts[0].split(':::step');
    return { mainBody: mSteps[0], noteData: n, steps: mSteps.slice(1), solution: solParts[1] || null };
  }, [processedContent]);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl rounded-tl-[4px] p-6 md:p-8 shadow-sm w-full group/msg transition-all duration-500 animate-in fade-in slide-in-from-bottom-2">
      <div className="prose prose-slate prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-[15px] prose-p:mb-4 max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkMath]} 
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={{
            p: ({children}) => <div className="mb-4 last:mb-0 leading-relaxed text-slate-600 text-[15px]">{children}</div>,
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || ''); const val = String(children).replace(/\n$/, '');
              if (!inline && (match?.[1] === 'mermaid' || val.startsWith('graph '))) return <MermaidChart chart={val} isStreaming={isStreaming} />;
              return !inline && match ? <CodeBlock language={match[1]} value={val} isStreaming={isStreaming} /> : <code className="bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded-lg font-semibold text-[0.9em]" {...props}>{children}</code>;
            }
          }}
        >{mainBody}</ReactMarkdown>
        {noteData && <SmartNoteLM title={noteData.title} content={noteData.content} onSave={onSave} />}
        {steps.slice(0, unlockedSteps).map((s, i) => (
          <div key={i} className="my-8 border-l-2 border-indigo-100 pl-6 animate-in slide-in-from-left-4 duration-700">
             <div className="flex items-center gap-3 mb-3">
               <span className="flex items-center justify-center w-7 h-7 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-bold shadow-sm">{i + 1}</span>
               <h4 className="text-[16px] font-semibold text-slate-900 m-0 uppercase tracking-tight">{s.split('\n')[0].trim()}</h4>
             </div>
             <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{s.split('\n').slice(1).join('\n')}</ReactMarkdown>
          </div>
        ))}
        {unlockedSteps < steps.length && !isStreaming && (
          <button onClick={() => setUnlockedSteps(v => v + 1)} className="mt-6 flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all shadow-xl shadow-slate-100">Davom etish <ChevronRight size={16} /></button>
        )}
        {solution && (
          <div className="mt-10 pt-10 border-t border-slate-50">
             {!showSolution ? (
               <div className="p-10 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center gap-5 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-indigo-400 border border-slate-50">
                    <Eye size={32} stroke="url(#icon-blue-purple)" />
                  </div>
                  <div><h5 className="text-[18px] font-semibold text-slate-900 mb-1 uppercase tracking-tight">Yechim yashirilgan</h5><p className="text-[13px] text-slate-400 font-medium">Avval o'zingiz yechib ko'ring.</p></div>
                  <button onClick={() => setShowSolution(true)} className="px-10 py-3 bg-slate-900 text-white rounded-xl text-[14px] font-medium shadow-xl shadow-slate-200 hover:opacity-90 transition-all uppercase tracking-widest">Javobni ko'rish</button>
               </div>
             ) : (
               <div className="animate-in fade-in duration-1000"><div className="flex items-center gap-2 mb-6 py-1.5 px-5 bg-emerald-50 text-emerald-700 rounded-xl w-fit font-bold text-[11px] uppercase tracking-widest"><Sparkles size={14} /> Akademik Yechim</div><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{solution}</ReactMarkdown></div>
             )}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── MAIN TUTOR CHAT ───────────────────────────────────────────────────
const TutorChat = ({ session }) => {
  const { messages, isSending, sendMessage } = useMessages(session);
  const { saveEntry } = useNotebook(session);
  const messagesEndRef = useRef(null);
  const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), []);
  useEffect(() => { const t = setTimeout(scrollToBottom, 50); return () => clearTimeout(t); }, [messages.length, isSending, scrollToBottom]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8faff] nano-bg relative overflow-hidden">
      <IconGradient />
      <Toaster position="top-right" richColors />
      <div className="flex-1 overflow-y-auto pt-8 pb-80 px-6 custom-scrollbar relative z-10">
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] gap-8 animate-in fade-in duration-1000">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full" />
              <div className="relative w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-2xl border border-white">
                <Brain size={48} stroke="url(#icon-blue-purple)" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Tutor AI</h1>
              <p className="text-slate-400 text-lg font-medium tracking-tight">Akademik bilimlar bazasi va yordamchi</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-6 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'user' ? (
                  <div className="px-7 py-4 bg-slate-900 text-white rounded-3xl rounded-tr-[4px] text-[16px] max-w-[80%] shadow-xl shadow-slate-200 leading-relaxed border border-slate-800">{m.content}</div>
                ) : (
                  <BotMessage content={m.content} isStreaming={i === messages.length - 1 && isSending} onCopy={t => navigator.clipboard.writeText(t)} onSave={t => saveEntry(t)} />
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start"><div className="bg-white/95 backdrop-blur-md border border-slate-100 rounded-3xl py-4 px-8 shadow-sm flex items-center gap-4"><div className="w-5 h-5 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" /><span className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest">Tahlil...</span></div></div>
            )}
            <div ref={messagesEndRef} className="h-10" />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 w-full px-6 pb-12 z-20 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-3xl border border-white rounded-[40px] p-2.5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)]">
             <ChatInput onSend={(t, a) => sendMessage({ userText: t, attachment: a, mode: 'TUTOR', currentMessages: messages })} isTyping={isSending} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatInput = ({ onSend, isTyping }) => {
  const [text, setText] = useState(''); 
  const [attachment, setAttachment] = useState(null); 
  const [preview, setPreview] = useState(null);
  const textareaRef = useRef(null); 
  const fileRef = useRef(null);

  // Ctrl+V (Paste) orqali rasm joylash
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setAttachment(file);
          const reader = new FileReader();
          reader.onloadend = () => setPreview(reader.result);
          reader.readAsDataURL(file);
          toast.success('Rasm joylashtirildi');
        }
      }
    }
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
      return () => textarea.removeEventListener('paste', handlePaste);
    }
  }, [handlePaste]);

  useEffect(() => { 
    if (textareaRef.current) { 
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'; 
    } 
  }, [text]);

  const submit = () => { 
    if ((!text.trim() && !attachment) || isTyping) return; 
    onSend(text, attachment); 
    setText(''); 
    setAttachment(null); 
    setPreview(null); 
  };

  return (
    <div className="flex flex-col gap-3">
      {preview && (
        <div className="relative w-20 h-20 ml-6 mb-1 group">
          <img src={preview} alt="p" className="w-full h-full object-cover rounded-2xl border-2 border-white shadow-xl" />
          <button onClick={() => { setAttachment(null); setPreview(null); }} className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white rounded-full p-1.5 shadow-xl opacity-0 group-hover:opacity-100 transition-all">
            <X size={10} />
          </button>
        </div>
      )}
      <input type="file" ref={fileRef} className="hidden" accept="image/*,application/pdf" onChange={e => { const f = e.target.files[0]; if (!f) return; setAttachment(f); const r = new FileReader(); r.onloadend = () => setPreview(r.result); r.readAsDataURL(f); }} />
      <div className="flex items-start gap-3 p-1">
        <button onClick={() => fileRef.current?.click()} className="mt-2.5 p-3.5 text-slate-400 hover:bg-slate-50 rounded-[22px] transition-all"><Paperclip size={22} stroke="url(#icon-blue-purple)" /></button>
        <textarea 
          ref={textareaRef} 
          value={text} 
          rows={1} 
          placeholder="Savol yozing yoki rasm joylang (Ctrl+V)..." 
          onChange={e => setText(e.target.value)} 
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} 
          className="flex-1 bg-transparent border-none outline-none resize-none text-[16px] text-slate-800 placeholder:text-slate-300 py-4 px-2 leading-relaxed" 
        />
        <button onClick={submit} disabled={(!text.trim() && !attachment) || isTyping} className="mt-2.5 w-12 h-12 flex items-center justify-center rounded-[22px] bg-slate-900 text-white disabled:bg-slate-100 transition-all hover:scale-105 shadow-xl shadow-slate-100"><ArrowUp size={24} strokeWidth={2.5} /></button>
      </div>
    </div>
  );
};

export default TutorChat;