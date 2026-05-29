import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Brain, Star, Copy, Check, Volume2, RotateCcw, Code, BookOpen, Calculator, Languages, Sparkles, Mic, Paperclip, Zap, Download, FileText, Presentation, Table, FileJson, Sigma } from 'lucide-react';
import Mermaid from './Mermaid';
import VibeEditor from './VibeEditor';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import PptxGenJS from 'pptxgenjs';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';

const TypeBadge = ({ type }) => {
  const badges = {
    code: { icon: <Code size={11} />, label: 'Kod', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    diagram: { icon: <RotateCcw size={11} />, label: 'Diagramma', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    math: { icon: <Calculator size={11} />, label: 'Matematik', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    translation: { icon: <Languages size={11} />, label: 'Tarjima', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    quiz: { icon: <BookOpen size={11} />, label: 'Test', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  };
  const b = badges[type];
  if (!b) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${b.bg} ${b.color} border ${b.border}`}>
      {b.icon}{b.label}
    </span>
  );
};

const ChatMessage = React.memo(({ msg, previousMsg, onSave, onRegenerate, onAutoFix, isKids }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const messageRef = useRef(null);

  const isAI = msg.role === 'ai';
  const content = msg.content || '';

  const phases = useMemo(() => {
    if (!isAI) return [];
    const matches = content.match(/\[PHASE: (.*?)\]/g);
    return matches ? matches.map(m => m.replace('[PHASE: ', '').replace(']', '')) : [];
  }, [content, isAI]);

  const { cleanContent, exportData } = useMemo(() => {
    const exportRegex = /\[EXPORT_FILE:\s*(PDF|DOCX|PPTX)\s*\|\s*([\s\S]*?)\s*\|\s*([\s\S]*?)\]/i;
    const exportMatch = content.match(exportRegex);
    let cleaned = content.replace(/\[PHASE: (.*?)\]/g, '');
    let exportInfo = null;
    if (exportMatch) {
      cleaned = cleaned.replace(exportRegex, '').trim();
      exportInfo = { type: exportMatch[1].toUpperCase(), title: exportMatch[2].trim(), content: exportMatch[3].trim() };
    } else {
      const filenameRegex = /\[EXPORT_FILE:\s*([^\|\]]+?)\]/i;
      const filenameMatch = content.match(filenameRegex);
      if (filenameMatch) {
        cleaned = cleaned.replace(filenameRegex, '').trim();
        const filename = filenameMatch[1].trim();
        const parts = filename.split('.');
        const ext = parts[parts.length - 1].toUpperCase();
        exportInfo = { type: ext, title: filename, content: cleaned };
      }
    }
    return { cleanContent: cleaned, exportData: exportInfo };
  }, [content]);

  const [displayedText, setDisplayedText] = useState(isAI && msg.isNew ? '' : cleanContent);

  const isMathRequested = useMemo(() => {
    if (!previousMsg || previousMsg.role !== 'user') return false;
    const prompt = (previousMsg.content || '').toLowerCase();
    const keywords = ['format', 'formula', 'matematika', 'yech', 'copy', 'nusxa', 'word', 'tushir', 'yozib ber', 'limit', 'integral', 'tenglama', 'misol'];
    return keywords.some(kw => prompt.includes(kw));
  }, [previousMsg]);

  const hasMath = useMemo(() => /\$.*?\$|\$\$.*?\$\$/s.test(cleanContent), [cleanContent]);

  const copyFormulaToWord = () => {
    try {
      const mathMatches = cleanContent.match(/\$\$(.*?)\$\$|\$(.*?)\$/gs) || [];
      if (mathMatches.length === 0) return toast.error("Formula topilmadi");
      let fullMathML = "";
      mathMatches.forEach(m => {
        const latex = m.replace(/\$/g, '').trim();
        try {
          const mathml = katex.renderToString(latex, { displayMode: true, output: 'mathml' });
          fullMathML += `<div>${mathml}</div><br/>`;
        } catch (e) { console.error("KaTeX error:", e); }
      });
      if (!fullMathML) return;
      const blob = new Blob([fullMathML], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob })];
      navigator.clipboard.write(data).then(() => toast.success("Word uchun nusxalandi!"));
    } catch (err) { toast.error("Nusxa olishda xatolik"); }
  };

  useEffect(() => {
    if (isAI && msg.isNew) {
      if (displayedText.length < cleanContent.length) {
        const diff = cleanContent.length - displayedText.length;
        const charsToAdd = diff > 50 ? 5 : diff > 15 ? 2 : 1;
        const timeout = setTimeout(() => {
          setDisplayedText(prev => cleanContent.slice(0, prev.length + charsToAdd));
          const scrollContainer = document.querySelector('.chat-messages') || document.querySelector('.flex-1.overflow-y-auto');
          if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 15);
        return () => clearTimeout(timeout);
      }
    } else {
      setDisplayedText(cleanContent);
    }
  }, [cleanContent, displayedText, isAI, msg.isNew]);

  const mdComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }) {
      const lang = className?.replace('language-', '') || 'code';
      const codeStr = String(children).replace(/\n$/, '');
      const isLongCode = codeStr.split('\n').length > 2;

      if (lang === 'mermaid') return <Mermaid chart={codeStr} />;
      if (lang === 'math' || lang === 'latex') {
        return (
          <div className="relative my-4 group">
            <div dangerouslySetInnerHTML={{ __html: katex.renderToString(codeStr, { displayMode: true, throwOnError: false }) }} />
            {isMathRequested && (
              <button onClick={() => {
                const mathml = katex.renderToString(codeStr, { displayMode: true, output: 'mathml' });
                const blob = new Blob([`<div>${mathml}</div>`], { type: 'text/html' });
                const data = [new ClipboardItem({ 'text/html': blob })];
                navigator.clipboard.write(data).then(() => toast.success("Formula Word uchun nusxalandi!"));
              }} className="absolute top-0 right-0 bg-primary/20 text-primary-light px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Copy for Word</button>
            )}
          </div>
        );
      }

      if (!inline && isLongCode && phases.length > 0) {
        return <VibeEditor code={codeStr} language={lang} isNew={msg.isNew} onAgentError={(err) => onAutoFix?.(codeStr, err, lang)} />;
      }

      if (!inline) {
        return (
          <div className="bg-[#0f172a] rounded-xl border border-white/5 my-4 overflow-hidden shadow-2xl">
            <div className="bg-white/5 px-4 py-2 flex justify-between items-center border-b border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{lang}</span>
              <button onClick={() => { navigator.clipboard.writeText(codeStr); toast.success("Kod nusxalandi"); }} className="text-slate-500 hover:text-white transition-colors"><Copy size={12} /></button>
            </div>
            <pre className="p-4 overflow-x-auto"><code className="font-mono text-sm text-sky-300 leading-relaxed">{codeStr}</code></pre>
          </div>
        );
      }

      return <code className="bg-primary/15 text-primary-light px-1.5 py-0.5 rounded font-mono text-[0.9em]">{children}</code>;
    },
    table: ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-border-custom bg-white/5 w-full"><table className="w-full border-collapse text-[12px] sm:text-sm">{children}</table></div>,
    thead: ({ children }) => <thead className="bg-primary/10">{children}</thead>,
    th: ({ children }) => <th className="px-2 sm:px-4 py-2 sm:py-3 text-left border-b border-border-custom font-bold text-primary-light">{children}</th>,
    td: ({ children }) => <td className="px-2 sm:px-4 py-1.5 sm:py-2.5 border-b border-white/5 text-text-muted break-words whitespace-normal">{children}</td>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-primary bg-primary/5 my-4 p-4 rounded-r-xl text-text-main italic">{children}</blockquote>,
    h1: ({ children }) => <h1 className={`font-black my-6 pb-2 border-b flex items-center gap-2 ${isKids ? 'text-2xl text-pink-500 border-pink-100' : 'text-xl text-text-main border-primary/20'}`}><Sparkles size={20} /> {children}</h1>,
    h2: ({ children }) => <h2 className={`font-bold my-5 pl-3 border-l-4 ${isKids ? 'text-xl text-amber-500 border-amber-400' : 'text-lg text-text-main border-sky-400'}`}>{children}</h2>,
    h3: ({ children }) => <h3 className={`font-bold my-4 ${isKids ? 'text-lg text-emerald-500' : 'text-base text-text-main'}`}>{children}</h3>,
    p: ({ children }) => <div className={`my-2 leading-relaxed ${isKids ? 'text-lg text-slate-700' : 'text-[15px] text-text-main'}`}>{children}</div>,
    ul: ({ children }) => <ul className={`pl-6 my-3 space-y-2 list-disc ${isKids ? 'marker:text-pink-500' : 'marker:text-primary'}`}>{children}</ul>,
    ol: ({ children }) => <ol className="pl-6 my-3 space-y-2 list-decimal">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className={`font-black ${isKids ? 'text-pink-600 bg-pink-50 px-1 rounded' : 'text-amber-400'}`}>{children}</strong>,
    em: ({ children }) => <em className={`italic ${isKids ? 'text-purple-600 underline decoration-wavy decoration-purple-200' : 'text-sky-400'}`}>{children}</em>,
  }), [msg.isNew, onAutoFix, phases, isKids, isMathRequested]);

  const handleExport = async () => {
    if (!exportData) return;
    const { type, title, content } = exportData;
    const fileName = title.endsWith(`.${type.toLowerCase()}`) ? title : `${title}.${type.toLowerCase()}`;
    const loadingId = toast.loading(`${type} tayyorlanmoqda...`);
    try {
      if (type === 'PDF') {
        const element = messageRef.current;
        await html2pdf().set({ margin: 10, filename: fileName, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(element).save();
      } else if (type === 'DOCX') {
        const doc = new Document({ sections: [{ children: content.split('\n').map(l => new Paragraph({ children: [new TextRun(l)] })) }] });
        const blob = await Packer.toBlob(doc);
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
      } else if (type === 'PPTX') {
        const pptx = new PptxGenJS(); const slide = pptx.addSlide();
        slide.addText(content, { x: 0.5, y: 0.5, w: '90%', h: '80%', fontSize: 18 });
        await pptx.writeFile({ fileName });
      } else if (type === 'XLSX') {
        const ws = XLSX.utils.aoa_to_sheet(content.split('\n').map(l => [l]));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "AI");
        XLSX.writeFile(wb, fileName);
      } else {
        // Plain text formats (MD, TXT, HTML, JS, JSON, etc.)
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
      }
      toast.success('Tayyor!', { id: loadingId });
    } catch (err) { toast.error('Xatolik!', { id: loadingId }); }
  };

  const handleManualExport = (type) => {
    const fileName = `Export_${Date.now()}`;
    const loadingId = toast.loading(`${type} tayyorlanmoqda...`);
    try {
      if (type === 'PDF') {
        html2pdf().from(messageRef.current).set({ margin: 10, filename: `${fileName}.pdf` }).save();
      } else if (type === 'DOCX') {
        const doc = new Document({ sections: [{ children: cleanContent.split('\n').map(l => new Paragraph({ children: [new TextRun(l)] })) }] });
        Packer.toBlob(doc).then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${fileName}.docx`; a.click(); });
      } else if (type === 'PPTX') {
        const pptx = new PptxGenJS(); const slide = pptx.addSlide();
        slide.addText(cleanContent.substring(0, 500), { x: 0.5, y: 0.5 });
        pptx.writeFile({ fileName: `${fileName}.pptx` });
      } else if (type === 'XLSX') {
        const ws = XLSX.utils.aoa_to_sheet(cleanContent.split('\n').map(l => [l]));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "AI");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }
      toast.success('Tayyor!', { id: loadingId });
    } catch (err) { toast.error('Xatolik!', { id: loadingId }); }
  };

  return (
    <div className={`flex w-full animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div ref={messageRef} className={`relative ${isKids ? 'max-w-[95%]' : 'max-w-[85%]'} px-6 py-4 rounded-[28px] shadow-sm ${
        msg.role === 'user' 
          ? (isKids ? 'bg-orange-400 text-white rounded-tr-none border-4 border-orange-200' : 'bg-primary text-white rounded-tr-none') 
          : (isKids ? 'bg-white text-slate-700 border-4 border-sky-100 rounded-tl-none shadow-sky-100/50' : 'bg-white dark:bg-[#1a1635] text-text-main border border-border-custom rounded-tl-none shadow-indigo-500/5')
      }`}>
        
        {isKids && msg.role === 'ai' && (
          <div className="absolute -top-4 -left-4 w-10 h-10 bg-white rounded-full border-4 border-sky-100 flex items-center justify-center text-xl shadow-lg animate-bounce">
            🧸
          </div>
        )}
        
        {exportData && (
          <div className="mb-4 p-4 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-between gap-4 animate-pulse-slow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white"><FileText size={20} /></div>
              <div>
                <div className="text-xs font-black text-text-main leading-tight">{exportData.title}</div>
                <div className="text-[10px] text-primary font-bold uppercase tracking-widest">{exportData.type} tayyor</div>
              </div>
            </div>
            <button onClick={handleExport} className="bg-primary text-white text-[11px] font-black px-4 py-2 rounded-lg hover:scale-105 active:scale-95 transition-all">Yuklab olish</button>
          </div>
        )}

        <div className="space-y-4">
          {msg.attachment && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border-custom bg-black/5">
              {msg.attachmentType?.startsWith('image/') ? <img src={msg.attachment} className="max-w-full block max-h-96 object-contain" /> :
               msg.attachmentType?.startsWith('audio/') ? <div className="p-3"><audio src={msg.attachment} controls className="w-full h-8" /></div> :
               <div className="p-3 flex items-center gap-2 text-xs text-text-muted"><Paperclip size={14} /> Fayl yuklandi</div>}
            </div>
          )}

          {isAI && displayedText === '' && msg.isNew ? (
            <div className="flex gap-1.5 py-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          ) : (
            <div className="relative">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={mdComponents}>
                {isAI ? displayedText : content}
              </ReactMarkdown>
              {isAI && msg.isNew && displayedText.length < cleanContent.length && (
                <span className="inline-block w-2 h-5 bg-primary/40 ml-1 animate-pulse rounded-full align-middle"></span>
              )}
            </div>
          )}
        </div>

        {isAI && (
          <div className="mt-4 pt-4 border-t border-border-custom flex flex-wrap gap-2 items-center">
            <button onClick={() => { navigator.clipboard.writeText(cleanContent); setCopied(true); setTimeout(()=>setCopied(false), 2000); }} className="flex items-center gap-1.5 px-3 py-1 bg-bg-main border border-border-custom rounded-full text-[10px] font-bold text-text-muted hover:text-primary transition-all">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Nusxalandi' : 'Nusxa'}
            </button>
            <button onClick={() => onSave?.(cleanContent)} className="flex items-center gap-1.5 px-3 py-1 bg-bg-main border border-border-custom rounded-full text-[10px] font-bold text-amber-600 hover:bg-amber-50 transition-all"><Star size={12} /> Saqlash</button>
            <button onClick={() => { const u = new SpeechSynthesisUtterance(cleanContent.replace(/[#*`]/g, '')); u.lang='uz-UZ'; speechSynthesis.speak(u); }} className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[10px] font-bold transition-all ${isKids ? 'bg-sky-50 border-sky-200 text-sky-600 hover:bg-sky-100 scale-110' : 'bg-bg-main border-border-custom text-text-muted hover:text-primary'}`}><Volume2 size={12} /> {isKids ? 'Eshitish' : 'Ovoz'}</button>
            
            {isKids && (
              <button className="flex items-center gap-1.5 px-3 py-1 bg-pink-50 border border-pink-200 rounded-full text-[10px] font-bold text-pink-600 hover:bg-pink-100 scale-110 transition-all">
                <Star size={12} fill="currentColor" /> Menga yoqdi!
              </button>
            )}

            {!isKids && isMathRequested && hasMath && (
              <button onClick={copyFormulaToWord} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-bold text-primary transition-all"><Sigma size={12} /> Word Formula</button>
            )}

            {!isKids && (
              <div className="flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                 <span className="text-[9px] font-black text-primary uppercase tracking-widest">Export:</span>
                 <button onClick={()=>handleManualExport('PDF')} className="text-red-500 hover:scale-110 transition-transform"><FileText size={14} /></button>
                 <button onClick={()=>handleManualExport('DOCX')} className="text-blue-500 hover:scale-110 transition-transform"><FileJson size={14} /></button>
                 <button onClick={()=>handleManualExport('PPTX')} className="text-amber-500 hover:scale-110 transition-transform"><Presentation size={14} /></button>
                 <button onClick={()=>handleManualExport('XLSX')} className="text-emerald-500 hover:scale-110 transition-transform"><Table size={14} /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatMessage;