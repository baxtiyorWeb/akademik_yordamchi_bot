import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, ChevronLeft, Send, Sparkles, Brain, 
  Trash2, Copy, FileText, Image as ImageIcon,
  Zap, Code, Sigma, Check, Wand2, Download
} from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const EXAMPLE_PROBLEMS = [
  "f(x) = x^2 + 5x + 6 funksiyaning hosilasini top",
  "lim_{x \\to 0} \\frac{\\sin x}{x}",
  "y'' - 4y' + 4y = 0 differensial tenglamani yech",
  "\\int_{0}^{\\pi} \\sin(x) dx integralni hisobla"
];

function MathCenter({ session }) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (customText = null) => {
    const text = customText || input;
    if (!text.trim() && !attachment) return;

    const userMsg = { id: Date.now(), role: 'user', content: text, attachment: attachment ? URL.createObjectURL(attachment) : null };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setIsSending(true);

    try {
      const { fetchGeminiResponse } = await import('../api/gemini');
      const response = await fetchGeminiResponse(
        `[SYSTEM: MATH EXPERT]\nSiz matematik expertisiz. Har qanday matematik muammoni qadamba-qadam tushuntirib bering. \nFormulalarni FAQAT KaTeX formatida (masalan, $$x^2$$) yozing.\nUser so'rovi: ${text}`,
        messages,
        null,
        'MATH'
      );
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: response }]);
    } catch (err) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Nusxalandi");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setAttachment(file);
  };

  return (
    <div className="flex h-screen w-screen mesh-gradient p-4 gap-4 transition-colors duration-500 overflow-hidden font-sans">
      
      {/* ── Left Control Panel ── */}
      <aside className="w-[320px] premium-glass rounded-[40px] flex flex-col p-8 z-10 hidden lg:flex">
        <div className="flex items-center gap-3 mb-10 cursor-pointer hover:opacity-80" onClick={() => navigate('/tutor')}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg"><ChevronLeft size={20} /></div>
          <span className="font-black text-text-main">Asosiyga qaytish</span>
        </div>

        <div className="flex-1 space-y-10 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="text-[10px] font-black text-text-muted opacity-40 uppercase tracking-[0.2em]">Matematik Markaz</div>
            <div className="p-6 bg-gradient-to-br from-primary to-primary-dark rounded-[32px] text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 animate-pulse"></div>
               <Calculator size={32} className="mb-4" />
               <h3 className="text-lg font-black mb-1">Cortex Math</h3>
               <p className="text-[11px] font-bold text-white/70 leading-relaxed">Mukammal qadamba-qadam matematik yechimlar</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[10px] font-black text-text-muted opacity-40 uppercase tracking-[0.2em]">Misol uchun</div>
            <div className="space-y-3">
              {EXAMPLE_PROBLEMS.map((ex, i) => (
                <button key={i} onClick={() => setInput(ex)} className="w-full p-4 bg-white dark:bg-bg-sidebar border border-border-custom rounded-2xl text-left text-[11px] font-bold text-text-main hover:border-primary hover:text-primary transition-all shadow-sm">
                   {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
           <div className="flex items-center gap-3 text-emerald-600 mb-2">
             <Zap size={16} fill="currentColor" />
             <span className="text-xs font-black uppercase">Statistika</span>
           </div>
           <p className="text-[10px] font-bold text-text-muted">Bugun 12 ta misol muvaffaqiyatli yechildi</p>
        </div>
      </aside>

      {/* ── Main Math Area ── */}
      <main className="flex-1 premium-glass rounded-[40px] flex flex-col relative overflow-hidden">
        
        <header className="h-[80px] px-10 flex justify-between items-center border-b border-border-custom bg-white/20 backdrop-blur-3xl z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center"><Sigma size={20} /></div>
            <div>
              <h2 className="text-lg font-black text-text-main">Formula & Yechim</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Tizim Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="premium-button bg-bg-main text-text-muted hover:text-text-main"><FileText size={18} /> Tarix</button>
            <button className="premium-button bg-primary text-white shadow-lg"><Download size={18} /> Word-ga eksport</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 lg:px-20 py-10 flex flex-col gap-8 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="m-auto text-center animate-in fade-in zoom-in duration-1000">
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 animate-bounce"><Sigma size={48} /></div>
              <h1 className="text-3xl lg:text-4xl font-black text-text-main mb-4 tracking-tighter">Matematik muammo bormi?</h1>
              <p className="text-text-muted font-bold opacity-60 max-w-sm mx-auto">Misolni yozing yoki rasmini yuklang, qolganini Cortex-ga qo'yib bering.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-10">
              {messages.map((msg, i) => (
                <div key={msg.id} className={`flex gap-6 animate-in fade-in slide-in-from-bottom-6 duration-500 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'ai' && (
                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20"><Sparkles size={20} /></div>
                  )}
                  <div className={`group relative p-8 rounded-[40px] text-[15px] leading-relaxed transition-all hover:shadow-xl ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none max-w-[80%]' : 'bg-white dark:bg-[#111827] border border-border-custom text-text-main rounded-tl-none w-full shadow-sm'}`}>
                    {msg.attachment && <img src={msg.attachment} className="rounded-2xl mb-4 max-h-64 object-contain bg-white/10" />}
                    
                    <div className="prose prose-invert max-w-none math-content">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                    </div>

                    <div className={`absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'hidden' : ''}`}>
                       <button onClick={() => copyToClipboard(msg.content)} className="p-2 bg-bg-main/50 text-text-muted hover:text-primary rounded-xl transition-all backdrop-blur-md border border-border-custom"><Copy size={14} /></button>
                       <button className="p-2 bg-bg-main/50 text-text-muted hover:text-emerald-500 rounded-xl transition-all backdrop-blur-md border border-border-custom"><Wand2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex gap-6 animate-pulse">
                   <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/20"><Sigma size={20} /></div>
                   <div className="p-8 rounded-[40px] rounded-tl-none bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 italic font-black">Misol yechilmoqda...</div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* ── Math Input ── */}
        <div className="px-6 lg:px-20 pb-10 pt-4 bg-gradient-to-t from-bg-main/80 via-bg-main/50 to-transparent">
          <div className="max-w-[960px] mx-auto bg-white dark:bg-bg-sidebar border-4 border-emerald-500/5 rounded-[44px] p-4 flex items-center gap-4 shadow-[0_40px_100px_rgba(16,185,129,0.15)] group focus-within:border-emerald-500/20 transition-all">
            <button onClick={() => fileInputRef.current.click()} className="p-4 bg-emerald-500/10 text-emerald-600 rounded-[28px] hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
              <ImageIcon size={24} />
            </button>
            <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*" />
            
            <div className="flex-1 relative">
              {attachment && (
                <div className="absolute -top-16 left-0 bg-white p-2 rounded-xl border border-emerald-200 flex items-center gap-2 animate-in slide-in-from-bottom-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg overflow-hidden"><img src={URL.createObjectURL(attachment)} className="w-full h-full object-cover" /></div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase">Rasm yuklandi</span>
                  <button onClick={() => setAttachment(null)} className="p-1 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              )}
              <input 
                placeholder="Matematik misol yoki formulani kiriting..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="w-full bg-transparent border-none outline-none py-4 text-lg font-bold text-text-main placeholder:text-text-muted/40"
              />
            </div>

            <button onClick={() => handleSend()} disabled={isSending} className="w-[64px] h-[64px] bg-emerald-500 text-white rounded-[28px] flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 hover:bg-emerald-600 transition-all">
              <Zap size={28} fill="currentColor" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MathCenter;
