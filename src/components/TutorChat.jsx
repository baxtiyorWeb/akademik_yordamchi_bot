import React, {
  useState, useRef, useEffect, useCallback, useMemo, useId,
} from 'react';
import {
  Brain, Plus, Copy, Download, FileText, X, Sparkles,
  ChevronRight, BookOpen, Bot, Calendar, Presentation,
  Moon, Sun, Palette, Terminal, Star, Paperclip, Mic, ArrowUp,
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

import { useMessages } from '../hooks/useMessages';
import { useNotebook } from '../hooks/useNotebook';
import TutorAssignments from './TutorAssignments';
import TutorWidgets from './TutorWidgets';
import ChatInput from './ChatInput';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

/* ─── utils ──────────────────────────────────────────────────── */

const safeParseJSON = (str) => {
  if (typeof str !== 'string') return null;
  let clean = str.trim();
  if (!clean.startsWith('{') && !clean.startsWith('[')) return null;
  try { return JSON.parse(clean); } catch (_) { }
  try {
    const fixed = clean.replace(/"([^"]*)"/g, (m, p) =>
      '"' + p.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"');
    return JSON.parse(fixed);
  } catch (_) { }
  try {
    let stack = [], inStr = false, esc = false, out = '';
    for (const ch of clean) {
      out += ch;
      if (inStr) { esc = !esc && ch === '\\'; if (!esc && ch === '"') inStr = false; }
      else if (ch === '"') inStr = true;
      else if (ch === '[' || ch === '{') stack.push(ch);
      else if (ch === ']' || ch === '}') {
        const last = stack[stack.length - 1];
        if ((ch === ']' && last === '[') || (ch === '}' && last === '{')) stack.pop();
      }
    }
    if (inStr) out += '"';
    out = out.trim().replace(/,\s*([\]}])/g, '$1');
    while (stack.length) out += stack.pop() === '[' ? ']' : '}';
    return JSON.parse(out);
  } catch (e) { return null; }
};

const formatTutorBlocks = (text) => {
  if (!text) return text;
  return text
    .replace(/^:::task\s*/gim, '\n\n**🏠 Uy vazifasi:**\n\n')
    .replace(/^:::step\s*/gim, '\n\n### Bosqich:\n\n')
    .replace(/^:::note\s*/gim, '\n\n**📝 Qayd:**\n\n')
    .replace(/^:::solution\s*/gim, '\n\n**✅ Yechim:**\n\n')
    .replace(/^:::(?:summary|xulosa)\s*/gim, '\n\n**📌 Xulosa:**\n\n')
    .replace(/:::rating\s*Today Rating:\s*([^\n]+?)(?:\s+Izoh:\s*([\s\S]*?))?(?=\n|$)/gi,
      (_, score, note) => `\n\n> **⭐ Kunlik reyting:** ${score.trim()}\n${note ? `> ${note.trim()}\n` : ''}\n`)
    .replace(/\[daily study time\]:\s*([^\n]+)/gi, '**⏱️ Daily study time:** $1\n\n');
};

/* ─── Mermaid ─────────────────────────────────────────────────── */

const MermaidChart = React.memo(({ chart, isStreaming }) => {
  const [svg, setSvg] = useState('');
  const ref = useRef(null);
  const uid = useId().replace(/:/g, '');
  useEffect(() => {
    if (!chart || chart.length < 10 || isStreaming) return;
    const t = setTimeout(async () => {
      if (!ref.current) return;
      try {
        ref.current.innerHTML = '';
        const { svg: s } = await mermaid.render(`m-${uid}`, chart);
        setSvg(s);
      } catch (_) { }
    }, 200);
    return () => clearTimeout(t);
  }, [chart, isStreaming, uid]);

  return (
    <div className="my-5 flex justify-center">
      <div ref={ref} className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-100 min-h-[80px] flex items-center justify-center">
        {svg
          ? <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full flex justify-center" />
          : <span className="text-[11px] text-slate-300 uppercase tracking-widest font-medium">Tahlil...</span>}
      </div>
    </div>
  );
});

/* ─── CodeBlock ───────────────────────────────────────────────── */

const CodeBlock = React.memo(({ language, value, isStreaming }) => {
  const [copied, setCopied] = useState(false);
  if (language === 'mermaid' || value.trim().startsWith('graph ') || value.trim().startsWith('sequenceDiagram'))
    return <MermaidChart chart={value} isStreaming={isStreaming} />;
  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-200 bg-[#1e293b]">
      <div className="px-4 py-2 flex justify-between items-center border-b border-slate-700/40">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language || 'code'}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Nusxa olindi'); }}
          className="text-slate-500 hover:text-white transition-colors p-1 rounded"
        >
          <Copy size={14} />
        </button>
      </div>
      <SyntaxHighlighter
        language={language} style={oneDark}
        customStyle={{ margin: 0, padding: '16px', fontSize: '13.5px', background: 'transparent' }}
      >{value}</SyntaxHighlighter>
    </div>
  );
});

/* ─── SmartNoteLM ─────────────────────────────────────────────── */

const SmartNoteLM = React.memo(({ title, content, onSave }) => {
  const [saved, setSaved] = useState(false);
  return (
    <div className="my-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900">{title || 'Manba'}</p>
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider">Notebook LM</p>
          </div>
        </div>
        <button
          onClick={() => { onSave(content); setSaved(true); toast.success('Saqlandi'); }}
          disabled={saved}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${saved ? 'text-emerald-600 bg-emerald-50' : 'text-slate-700 bg-white hover:bg-indigo-50 border border-slate-200'}`}
        >
          {saved ? 'Saqlandi ✓' : 'Saqlash'}
        </button>
      </div>
      <div className="prose prose-sm max-w-none text-slate-600 border-t border-indigo-100 pt-3 text-[16px]">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
});

/* ─── StreamingText ── smooth line-by-line fade, no jank ─────── */

/**
 * Instead of re-rendering the entire ReactMarkdown tree on every streamed chunk,
 * we batch updates with rAF and only swap content when a full line/paragraph arrives.
 * The "typewriter" effect is replaced with a per-paragraph CSS fade-in that costs
 * almost nothing on the GPU.
 */
const StreamingText = React.memo(({ content }) => {
  const [displayedParagraphs, setDisplayedParagraphs] = useState([]);
  const prevRef = useRef('');
  const rafRef = useRef(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const prev = prevRef.current;
      if (content === prev) return;
      prevRef.current = content;
      // Split by double newline (paragraphs) for smooth reveal
      const paras = content.split(/\n\n+/);
      setDisplayedParagraphs(paras);
    });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [content]);

  return (
    <div>
      {displayedParagraphs.map((para, i) => (
        <div
          key={i}
          style={{
            animation: i === displayedParagraphs.length - 1 ? 'fadeSlideIn 0.18s ease-out both' : 'none',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={markdownComponents(true)}
          >{para}</ReactMarkdown>
        </div>
      ))}
      {/* blinking cursor while streaming */}
      <span className="inline-block w-[2px] h-[14px] bg-indigo-400 ml-0.5 align-middle animate-[blink_0.8s_step-end_infinite]" />
    </div>
  );
});

/* ─── Shared markdown components factory ─────────────────────── */

const markdownComponents = (isStreaming = false) => ({
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-slate-700 text-[14.5px]">{children}</p>,
  table: ({ ...props }) => (
    <div className="overflow-x-auto my-5 rounded-xl border border-slate-100">
      <table className="w-full text-left border-collapse" {...props} />
    </div>
  ),
  thead: ({ ...props }) => <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider font-semibold" {...props} />,
  tbody: ({ ...props }) => <tbody className="divide-y divide-slate-50" {...props} />,
  tr: ({ ...props }) => <tr className="hover:bg-indigo-50/20 transition-colors" {...props} />,
  th: ({ ...props }) => <th className="px-4 py-3 font-semibold text-[11px]" {...props} />,
  td: ({ ...props }) => <td className="px-4 py-3 text-slate-600 text-[13px] leading-relaxed" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc list-outside ml-5 mb-4 space-y-1.5 marker:text-indigo-400" {...props} />,
  ol: ({ ...props }) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-1.5 marker:text-indigo-500 marker:font-semibold" {...props} />,
  li: ({ ...props }) => <li className="pl-0.5 text-slate-700 text-[14px] leading-relaxed" {...props} />,
  h1: ({ ...props }) => <h1 className="text-xl font-bold text-slate-900 mt-6 mb-3" {...props} />,
  h2: ({ ...props }) => <h2 className="text-lg font-semibold text-slate-900 mt-5 mb-2.5" {...props} />,
  h3: ({ ...props }) => <h3 className="text-base font-semibold text-slate-800 mt-4 mb-2" {...props} />,
  blockquote: ({ ...props }) => (
    <blockquote className="border-l-2 border-indigo-200 pl-4 my-4 text-slate-600 italic text-[14px]" {...props} />
  ),
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const val = String(children).replace(/\n$/, '');
    if (!inline && (match?.[1] === 'mermaid' || val.startsWith('graph ')))
      return <MermaidChart chart={val} isStreaming={isStreaming} />;
    return !inline && match
      ? <CodeBlock language={match[1]} value={val} isStreaming={isStreaming} />
      : <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono text-[0.85em]" {...props}>{children}</code>;
  },
});

/* ─── BotMessage ──────────────────────────────────────────────── */

const BotMessage = React.memo(({ content, isStreaming, onSave, messages }) => {
  const [unlockedSteps, setUnlockedSteps] = useState(1);
  const messageRef = useRef(null);
  const mdComponents = useMemo(() => markdownComponents(isStreaming), [isStreaming]);

  /* Mermaid wrapping */
  const processedContent = useMemo(() => {
    if (!content) return '';
    let t = content;
    if ((t.includes('graph ') || t.includes('sequenceDiagram')) && !t.includes('```mermaid')) {
      t = t.replace(/(graph\s+(?:TD|LR|TB|BT|RL)[\s\S]*?)(?=\n\n|\n[a-zA-Z]|\n$|$)/gi,
        m => `\n\n\`\`\`mermaid\n${m.trim()}\n\`\`\`\n\n`);
    }
    return t;
  }, [content]);

  /* Slide deck detection */
  const slideDeckData = useMemo(() => {
    if (isStreaming) return null;
    try {
      const clean = processedContent.replace(/\[EXPORT_FILE:[\s\S]*?\]/gi, '').replace(/\[SLIDE_THEME:[\s\S]*?\]/gi, '').trim();
      const jsonBlock = clean.match(/```json\s*([\s\S]*?)\s*```/i);
      let jsonStr = jsonBlock ? jsonBlock[1].trim() : null;
      if (!jsonStr) {
        const start = clean.indexOf('[');
        if (start >= 0) {
          let depth = 0, inStr = false, esc = false;
          for (let i = start; i < clean.length; i++) {
            const ch = clean[i];
            if (inStr) { esc = !esc && ch === '\\'; if (!esc && ch === '"') inStr = false; }
            else { if (ch === '"') inStr = true; else if (ch === '[') depth++; else if (ch === ']' && --depth === 0) { jsonStr = clean.slice(start, i + 1); break; } }
          }
        }
      }
      if (!jsonStr) return null;
      const parsed = safeParseJSON(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].layout) {
        const themeMatch = (processedContent + (messages?.map(m => m.content).join(' ') || '')).match(/\[SLIDE_THEME:\s*([a-zA-Z0-9_-]+?)\]/i);
        return { slides: parsed, theme: themeMatch?.[1] || 'dark' };
      }
    } catch (_) { }
    return null;
  }, [processedContent, isStreaming, messages]);

  /* Content parsing */
  const { mainBody, noteData, summaryText, steps, solution, exportData } = useMemo(() => {
    if (isStreaming) return { mainBody: processedContent, noteData: null, summaryText: null, steps: [], solution: null, exportData: null };
    try {
      let wc = processedContent;
      const exportRegex = /\[EXPORT_FILE:\s*(PDF|DOCX|PPTX)\s*\|\s*([\s\S]*?)\s*\|\s*([\s\S]*?)\]/i;
      const exportMatch = wc.match(exportRegex);
      let exportInfo = null;
      if (exportMatch) {
        wc = wc.replace(exportRegex, '').trim();
        exportInfo = { type: exportMatch[1].toUpperCase(), title: exportMatch[2].trim(), content: exportMatch[3].trim() };
      } else {
        const fnMatch = wc.match(/\[EXPORT_FILE:\s*([^\|\]]+?)\]/i);
        if (fnMatch) {
          wc = wc.replace(fnMatch[0], '').trim();
          const parts = fnMatch[1].trim().split('.');
          exportInfo = { type: parts[parts.length - 1].toUpperCase(), title: fnMatch[1].trim(), content: wc };
        }
      }
      const noteMatch = wc.match(/:::note\s*([\s\S]*?)(?=:::(summary|xulosa|step|solution)|$)/i);
      let noteData = null;
      if (noteMatch) {
        const lines = noteMatch[1].trim().split('\n');
        const nc = lines.slice(1).join('\n').trim();
        if (nc) noteData = { title: (lines[0] || 'Qayd').replace(/[\[\]]/g, '').trim(), content: nc };
        wc = wc.replace(noteMatch[0], '').trim();
      }
      const sumMatch = wc.match(/:::(?:summary|xulosa)\s*([\s\S]*?)(?=:::(step|solution)|$)/i);
      if (sumMatch) wc = wc.replace(sumMatch[0], '').trim();
      const solMatch = wc.match(/:::solution\s*([\s\S]*?)$/i);
      if (solMatch) wc = wc.replace(solMatch[0], '').trim();
      const stepMatches = [];
      const stepRe = /:::step\s*([\s\S]*?)(?=:::(step|solution)|$)/gi;
      let sm;
      while ((sm = stepRe.exec(wc))) if (sm[1]?.trim()) stepMatches.push(sm[1].trim());
      wc = wc.replace(/:::step[\s\S]*/gi, '').trim();
      return {
        mainBody: formatTutorBlocks(wc),
        noteData: noteData ? { ...noteData, content: formatTutorBlocks(noteData.content) } : null,
        summaryText: sumMatch ? formatTutorBlocks(sumMatch[1].trim()) : null,
        steps: stepMatches.map(s => formatTutorBlocks(s)),
        solution: solMatch ? formatTutorBlocks(solMatch[1].trim()) : null,
        exportData: exportInfo ? { ...exportInfo, content: formatTutorBlocks(exportInfo.content) } : null,
      };
    } catch (_) {
      return { mainBody: processedContent, noteData: null, summaryText: null, steps: [], solution: null, exportData: null };
    }
  }, [processedContent, isStreaming]);

  /* Export handler */
  const handleExport = useCallback(async (e, slidesParam = null, themeParam = null) => {
    if (e?.stopPropagation) e.stopPropagation();
    if (slidesParam || (Array.isArray(e) && e[0]?.layout)) {
      const slides = slidesParam || e;
      const theme = themeParam || 'dark';
      const themes = {
        dark: { bg: '0B0F19', text: 'FFFFFF', accent: '6366F1', cardBg: '1E293B', cardBorder: '334155' },
        light: { bg: 'F8FAFC', text: '0F172A', accent: '2563EB', cardBg: 'FFFFFF', cardBorder: 'E2E8F0' },
        purple: { bg: 'F5F3FF', text: '2E1065', accent: '7C3AED', cardBg: 'FFFFFF', cardBorder: 'DDD6FE' },
        tech: { bg: '000000', text: 'FFFFFF', accent: '10B981', cardBg: '111827', cardBorder: '1F2937' },
      };
      const s = themes[theme] || themes.dark;
      const fileName = `${(slides[0]?.title || 'Taqdimot').toLowerCase().replace(/\s+/g, '_')}.pptx`;
      const id = toast.loading('Taqdimot tayyorlanmoqda...');
      try {
        const PptxGenJS = (await import('pptxgenjs')).default;
        const pptx = new PptxGenJS();
        slides.forEach(sd => {
          const slide = pptx.addSlide();
          slide.background = { fill: s.bg };
          if (sd.layout !== 'title' && sd.title)
            slide.addText(sd.title, { x: 0.5, y: 0.4, w: '90%', h: 0.6, fontSize: 22, bold: true, color: s.accent });
          if (sd.layout === 'title') {
            slide.addText(sd.title || 'Taqdimot', { x: 0.5, y: 2.0, w: '90%', h: 1.2, fontSize: 32, bold: true, color: s.text, align: 'center' });
            if (sd.subtitle) slide.addText(sd.subtitle, { x: 0.5, y: 3.2, w: '90%', h: 0.8, fontSize: 16, color: s.accent, align: 'center' });
          } else if (sd.layout === 'bullets') {
            let y = 1.2;
            (sd.points || []).forEach(p => { slide.addText(`• ${p}`, { x: 0.5, y, w: '90%', h: 0.7, fontSize: 14, color: s.text }); y += 0.8; });
          } else if (sd.layout === 'cards') {
            let x = 0.5;
            (sd.cards || []).slice(0, 3).forEach(c => {
              slide.addShape(pptx.shapes.RECTANGLE, { x, y: 1.5, w: 2.8, h: 3.5, fill: { color: s.cardBg }, line: { color: s.cardBorder, width: 1 } });
              slide.addText(c.title || '', { x: x + 0.15, y: 1.7, w: 2.5, h: 0.5, fontSize: 16, bold: true, color: s.accent });
              slide.addText(c.desc || '', { x: x + 0.15, y: 2.3, w: 2.5, h: 2.5, fontSize: 12, color: s.text, valign: 'top' });
              x += 3.1;
            });
          } else if (sd.layout === 'quote') {
            slide.addText(`"${sd.quote || ''}"`, { x: 1, y: 1.8, w: '80%', h: 2, fontSize: 20, italic: true, color: s.text, align: 'center' });
            if (sd.author) slide.addText(`— ${sd.author}`, { x: 1, y: 3.8, w: '80%', h: 0.5, fontSize: 14, color: s.accent, align: 'center' });
          } else if (sd.layout === 'two_column') {
            const l = sd.leftColumn || {}; const r = sd.rightColumn || {};
            slide.addText(l.title || '', { x: 0.5, y: 1.2, w: '43%', h: 0.5, fontSize: 18, bold: true, color: s.text });
            slide.addText(l.text || '', { x: 0.5, y: 1.8, w: '43%', h: 3.5, fontSize: 14, color: s.text, valign: 'top' });
            let ry = 1.2;
            (r.points || []).forEach(p => { slide.addText(`• ${p}`, { x: 5.2, y: ry, w: '43%', h: 0.8, fontSize: 14, color: s.text }); ry += 0.9; });
          }
        });
        await pptx.writeFile({ fileName });
        toast.success('Taqdimot yuklab olindi!', { id });
      } catch (err) { console.error(err); toast.error('Xatolik yuz berdi.', { id }); }
      return;
    }
    if (!exportData) return;
    const { type, title, content } = exportData;
    const fileName = title.endsWith(`.${type.toLowerCase()}`) ? title : `${title}.${type.toLowerCase()}`;
    const id = toast.loading(`${type} tayyorlanmoqda...`);
    try {
      if (type === 'PDF') {
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf().set({ margin: 10, filename: fileName, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(messageRef.current).save();
      } else if (type === 'DOCX') {
        const { Document, Packer, Paragraph, TextRun } = await import('docx');
        const doc = new Document({ sections: [{ children: content.split('\n').map(l => new Paragraph({ children: [new TextRun(l)] })) }] });
        const blob = await Packer.toBlob(doc);
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
      } else if (type === 'PPTX') {
        const PptxGenJS = (await import('pptxgenjs')).default;
        const pptx = new PptxGenJS(); const slide = pptx.addSlide();
        slide.addText(content, { x: 0.5, y: 0.5, w: '90%', h: '80%', fontSize: 18 });
        await pptx.writeFile({ fileName });
      } else {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
      }
      toast.success('Tayyor!', { id });
    } catch (err) { console.error(err); toast.error('Xatolik!', { id }); }
  }, [exportData]);

  /* Slide deck UI */
  const slideThemeStyles = {
    dark: { wrap: 'bg-slate-900 border-slate-700', text: 'text-white', sub: 'text-slate-400', accent: 'text-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-500', slide: 'bg-slate-800 border-slate-700' },
    light: { wrap: 'bg-slate-50 border-slate-200', text: 'text-slate-900', sub: 'text-slate-500', accent: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-500', slide: 'bg-white border-slate-200' },
    purple: { wrap: 'bg-violet-50 border-violet-200', text: 'text-violet-950', sub: 'text-violet-500', accent: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-500', slide: 'bg-white border-violet-200' },
    tech: { wrap: 'bg-black border-emerald-900/40', text: 'text-white', sub: 'text-slate-500', accent: 'text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-500', slide: 'bg-zinc-900 border-zinc-800' },
  };

  if (slideDeckData) {
    const { slides, theme } = slideDeckData;
    const ts = slideThemeStyles[theme] || slideThemeStyles.dark;
    return (
      <div ref={messageRef} className={`${ts.wrap} border rounded-3xl p-5 md:p-7 w-full`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${theme === 'dark' || theme === 'tech' ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Presentation size={22} className={ts.accent} />
            </div>
            <div>
              <h3 className={`text-[15px] font-semibold ${ts.text} truncate max-w-[220px] sm:max-w-sm`}>{slides[0]?.title || 'Taqdimot'}</h3>
              <p className={`text-[10px] font-medium ${ts.sub} uppercase tracking-wider mt-0.5`}>{slides.length} slayd · {theme.toUpperCase()}</p>
            </div>
          </div>
          <button onClick={() => handleExport(null, slides, theme)}
            className={`${ts.btn} text-white text-[12px] font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 flex-shrink-0`}>
            <Download size={14} /> .pptx yuklab olish
          </button>
        </div>
        <div className="mt-4 flex overflow-x-auto gap-3 py-2 pr-2">
          {slides.map((sl, i) => (
            <div key={i} className={`${ts.slide} border w-[160px] h-[100px] flex-shrink-0 rounded-xl p-3 flex flex-col justify-between overflow-hidden`}>
              <div className="flex justify-between items-start">
                <span className={`text-[8px] font-bold uppercase ${ts.accent}`}>#{i + 1}</span>
                <span className="text-[7px] text-slate-500 uppercase">{sl.layout}</span>
              </div>
              <p className={`text-[9px] font-semibold ${ts.text} line-clamp-2 leading-tight`}>{sl.title || 'Mavzusiz'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={messageRef} className="w-full">
      {exportData && (
        <div className="mb-4 p-3.5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-800 truncate max-w-[180px]">{exportData.title}</p>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">{exportData.type} tayyor</p>
            </div>
          </div>
          <button onClick={handleExport} className="bg-indigo-600 text-white text-[11px] font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0">Yuklab olish</button>
        </div>
      )}

      {/* Main content — streaming uses lightweight paragraph fade, settled uses full ReactMarkdown */}
      <div className="prose prose-slate max-w-none">
        {isStreaming
          ? <StreamingText content={mainBody} />
          : <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={mdComponents}>{mainBody}</ReactMarkdown>
        }
      </div>

      {!isStreaming && (
        <>
          {noteData && <SmartNoteLM title={noteData.title} content={noteData.content} onSave={onSave} />}
          {summaryText && (
            <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Xulosa</p>
                {onSave && (
                  <button onClick={() => onSave([mainBody, summaryText, solution].filter(Boolean).join('\n\n'))}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-lg hover:bg-indigo-700 transition-colors">Saqlash</button>
                )}
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={mdComponents}>{summaryText}</ReactMarkdown>
            </div>
          )}
          {steps.slice(0, unlockedSteps).map((s, i) => (
            <div key={i} className="mt-6 border-l-2 border-indigo-100 pl-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                <h4 className="text-[14px] font-semibold text-slate-900">{s.split('\n')[0].replace(/[\[\]]/g, '').trim()}</h4>
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={mdComponents}>
                {s.split('\n').slice(1).join('\n')}
              </ReactMarkdown>
            </div>
          ))}
          {unlockedSteps < steps.length && (
            <button onClick={() => setUnlockedSteps(v => v + 1)}
              className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:bg-slate-800 transition-colors">
              Davom etish <ChevronRight size={15} />
            </button>
          )}
          {solution && (
            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl w-fit text-[11px] font-bold uppercase tracking-wider">
                <Sparkles size={13} /> Yechim
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={mdComponents}>{solution}</ReactMarkdown>
            </div>
          )}
        </>
      )}
    </div>
  );
});

/* ─── SlideWizard Modal ───────────────────────────────────────── */

const THEMES = [
  { key: 'dark', icon: Moon, label: 'Premium Dark', desc: "To'q fon, indigo urg'u" },
  { key: 'light', icon: Sun, label: 'Modern Light', desc: "Yorug' fon, ko'k urg'u" },
  { key: 'purple', icon: Palette, label: 'Creative Violet', desc: "Binafsha, och fon" },
  { key: 'tech', icon: Terminal, label: 'Minimalist Tech', desc: "Qora fon, yashil urg'u" },
];

const SlideWizardModal = React.memo(({ wizard, setWizard, onSend, messages, mode, onClose }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);

  if (!wizard) return null;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); toast.success('Fayl biriktirildi: ' + f.name); }
  };

  const buildPrompt = () => `
Mavzu: ${wizard.topic}
Slaydlar soni: ${wizard.slidesCount} ta (kamida ${wizard.slidesCount} ta bo'lsin!)
Qo'shimcha manba: ${wizard.resourceOption === 'none' ? "Yo'q" : wizard.resourceText}

Faqat quyidagi JSON formatida javob bering (boshqa matn yozmang):
[
  { "layout": "title", "title": "...", "subtitle": "..." },
  { "layout": "bullets", "title": "...", "points": ["...", "..."] },
  { "layout": "cards", "title": "...", "cards": [{ "title": "...", "desc": "..." }] },
  { "layout": "two_column", "title": "...", "leftColumn": { "title": "...", "text": "..." }, "rightColumn": { "points": ["..."] } },
  { "layout": "quote", "title": "...", "quote": "...", "author": "..." }
]
MUHIM: Slaydlar soni roppa-rosa ${wizard.slidesCount} ta bo'lsin.
JSON oxirida: [SLIDE_THEME: ${wizard.theme}]`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl border border-slate-100 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <Presentation size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">Slide Wizard</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Taqdimot yaratish</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Topic */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Mavzu</label>
            <input
              type="text" value={wizard.topic}
              onChange={e => setWizard(p => ({ ...p, topic: e.target.value }))}
              placeholder="Masalan: Sun'iy intellekt asoslari"
              className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[14px] text-slate-800 outline-none focus:bg-slate-100 transition-colors font-medium placeholder:text-slate-300"
            />
          </div>

          {/* Count */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Slaydlar soni (min 10)</label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={10} value={wizard.slidesCount}
                onChange={e => setWizard(p => ({ ...p, slidesCount: Math.max(10, parseInt(e.target.value) || 10) }))}
                className="w-20 px-3 py-2.5 bg-slate-50 rounded-xl text-[14px] text-center outline-none font-semibold"
              />
              <span className="text-[12px] text-slate-400">ta professional slayd</span>
            </div>
          </div>

          {/* Resource */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Manba (ixtiyoriy)</label>
            <div className="grid grid-cols-3 gap-2">
              {[['none', "Yo'q"], ['text', 'Matn'], ['file', 'Fayl']].map(([key, lbl]) => (
                <button key={key} onClick={() => setWizard(p => ({ ...p, resourceOption: key }))}
                  className={`py-2 rounded-xl text-[12px] font-medium transition-all ${wizard.resourceOption === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            {wizard.resourceOption === 'text' && (
              <textarea
                placeholder="Kitob yoki maqola matnini joylashtiring..."
                value={wizard.resourceText}
                onChange={e => setWizard(p => ({ ...p, resourceText: e.target.value }))}
                rows={4}
                className="mt-3 w-full p-3 bg-slate-50 rounded-xl text-[13px] outline-none resize-none text-slate-700 focus:bg-slate-100 transition-colors"
              />
            )}
            {wizard.resourceOption === 'file' && (
              <div className="mt-3 space-y-2">
                <div onClick={() => fileRef.current?.click()}
                  className="p-5 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 rounded-2xl bg-slate-50 text-center cursor-pointer transition-all">
                  <input type="file" ref={fileRef} className="hidden" accept="image/*,application/pdf,.docx,text/plain" onChange={handleFileChange} />
                  <Paperclip size={20} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-[12px] font-medium text-slate-600">Fayl yuklash</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PDF, Word, rasm (maks 10MB)</p>
                </div>
                {file && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-indigo-600 flex-shrink-0" />
                      <p className="text-[12px] font-medium text-slate-700 truncate">{file.name}</p>
                    </div>
                    <button onClick={() => setFile(null)} className="p-1 hover:bg-red-50 rounded-lg transition-colors">
                      <X size={13} className="text-slate-400" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Dizayn uslubi</label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(({ key, icon: Icon, label, desc }) => (
                <button key={key} onClick={() => setWizard(p => ({ ...p, theme: key }))}
                  className={`p-3 rounded-2xl border text-left transition-all ${wizard.theme === key ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} className={wizard.theme === key ? 'text-indigo-600' : 'text-slate-500'} />
                    <span className="text-[12px] font-semibold text-slate-800">{label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 space-y-2 flex-shrink-0">
          <button
            onClick={() => { onSend(buildPrompt(), file); onClose(); }}
            disabled={!wizard.topic.trim()}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold text-[14px] hover:bg-indigo-700 transition-colors disabled:opacity-40"
          >
            Taqdimot yaratish 🚀
          </button>
          <button
            onClick={() => { onSend(wizard.topic, file); onClose(); }}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-medium text-[13px] transition-colors"
          >
            Oddiy xabar sifatida yuborish
          </button>
        </div>
      </div>
    </div>
  );
});

/* ─── TutorChat (main) ────────────────────────────────────────── */

const TutorChat = ({ session }) => {
  const { messages, isSending, sendMessage, chatSessions, activeSessionId, changeSession } = useMessages(session);
  const { saveEntry } = useNotebook(session);
  const [mode, setMode] = useState('TUTOR');
  const [showAssignments, setShowAssignments] = useState(false);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [slideWizard, setSlideWizard] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), []);

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [messages.length, isSending, scrollToBottom]);

  const handleSave = useCallback(t => saveEntry(t), [saveEntry]);

  const handleSendMessage = useCallback((text, attachment) => {
    const isSlide = ['slayd', 'prezentatsiya', 'taqdimot', 'presentation', 'pptx', 'slide']
      .some(k => text.toLowerCase().includes(k));
    if (isSlide) {
      setSlideWizard({ topic: text, slidesCount: 10, resourceText: '', resourceOption: 'none', theme: 'dark' });
    } else {
      sendMessage({ userText: text, attachment, mode, currentMessages: messages });
    }
  }, [mode, messages, sendMessage]);

  const handleWizardSend = useCallback((text, file) => {
    sendMessage({ userText: text, attachment: file, mode, currentMessages: messages });
  }, [mode, messages, sendMessage]);

  return (
    <div className="flex h-[100dvh] bg-[#f7f8fc] overflow-hidden">
      {/* ── CSS for streaming animation ── */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
      `}</style>

      <Toaster position="top-center" richColors />

      {/* ── MAIN CHAT COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Top bar */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Bot size={18} className="text-slate-600" />
            </button>

            {/* Mode switcher */}
            <div className="bg-slate-100 rounded-xl p-0.5 flex items-center gap-0.5">
              {['TUTOR', 'KIDS'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {m}
                </button>
              ))}
            </div>

            {/* Desktop extras */}
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => setSlideWizard({ topic: '', slidesCount: 10, resourceText: '', resourceOption: 'none', theme: 'dark' })}
                className="px-3 py-1.5 rounded-xl text-[12px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors">
                Slayd tayyorlash
              </button>
              <span className="text-[12px] text-slate-400">Bugun: <span className="font-semibold text-slate-700">{todayMinutes}m</span></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* History toggle (desktop) */}
            <button onClick={() => setSidebarOpen(v => !v)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium text-slate-500 hover:bg-slate-100 transition-colors">
              <Calendar size={14} /> Tarix
            </button>
            <button onClick={() => changeSession(null)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              <Plus size={14} /> Yangi chat
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-dvw mx-auto px-4 md:px-6 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-white rounded-[28px] shadow-xl border border-indigo-50 flex items-center justify-center">
                    <Brain size={40} className="text-indigo-500" />
                  </div>
                  <div className="absolute -inset-3 bg-indigo-100 rounded-full blur-2xl opacity-40 -z-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Men Typer AI man</h2>
                  <p className="text-[15px] text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                    Akademik savollarga javob beraman, kod yozaman va hujjatlarni tahlil qilaman.
                  </p>
                </div>
                {/* Quick actions */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {['Kod yozib ber', 'Slayd tayyorla', 'Tushuntir'].map(q => (
                    <button key={q} onClick={() => handleSendMessage(q, null)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-600 font-medium hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={m.id || i}
                    className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    style={{ animation: 'fadeSlideIn 0.22s ease-out both' }}
                  >
                    {m.role === 'user' ? (
                      <div className="px-4 py-3 bg-slate-900 text-white rounded-2xl rounded-tr-[6px] text-[14.5px] font-medium max-w-[85%] leading-relaxed">
                        {m.content}
                      </div>
                    ) : (
                      /* Bot message wrapper — white card */
                      <div className="max-w-full w-full bg-white rounded-2xl rounded-tl-[6px] border border-slate-100 px-5 py-4 shadow-sm shadow-slate-200/60">
                        <BotMessage
                          content={m.content}
                          isStreaming={i === messages.length - 1 && isSending}
                          onSave={handleSave}
                          messages={messages}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-[6px] px-5 py-3.5 shadow-sm flex items-center gap-3">
                      <div className="flex gap-1">
                        {[0, 0.15, 0.3].map(d => (
                          <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full"
                            style={{ animation: `blink 1.2s ${d}s ease-in-out infinite` }} />
                        ))}
                      </div>
                      <span className="text-[12px] text-slate-400 font-medium">Javob tayyorlanmoqda...</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/60">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSendMessage} isTyping={isSending} />
          </div>
          <p className="text-center text-[10px] text-slate-300 font-medium mt-2">
            AI xato qilishi mumkin. Muhim ma'lumotlarni tekshiring.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL (tutor sidebar) ── */}
      <aside className={`
        fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-200/60 flex flex-col shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:relative lg:translate-x-0 lg:shadow-none lg:flex lg:w-72 lg:flex-shrink-0
      `}>
        {/* Sidebar header */}
        <div className="h-14 flex-shrink-0 flex items-center justify-between px-5 border-b border-slate-100">
          <span className="text-[13px] font-bold text-slate-800 uppercase tracking-widest">Tarix</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold">{chatSessions?.length || 0}</span>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Chat sessions */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {chatSessions?.map(s => (
            <button key={s.id} onClick={() => { changeSession(s.id); setSidebarOpen(false); }}
              className={`w-full text-left p-3 rounded-xl transition-all border ${activeSessionId === s.id ? 'bg-indigo-50 border-indigo-100' : 'border-transparent hover:bg-slate-50'}`}>
              <p className={`text-[13px] font-medium line-clamp-1 ${activeSessionId === s.id ? 'text-indigo-700' : 'text-slate-700'}`}>{s.title}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Calendar size={9} />
                {new Date(s.created_at || Date.now()).toLocaleDateString()}&nbsp;
                {new Date(s.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </button>
          ))}
        </div>

        {/* Tutor widgets */}
        <div className="border-t border-slate-100 p-4 space-y-3 flex-shrink-0">
          <TutorWidgets session={session} />
          <button onClick={() => setShowAssignments(v => !v)}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 transition-colors">
            {showAssignments ? 'Vazifalarni yashirish' : 'Vazifalarni ko\'rsatish'}
          </button>
          {showAssignments && <TutorAssignments session={session} onClose={() => setShowAssignments(false)} />}
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Slide Wizard */}
      <SlideWizardModal
        wizard={slideWizard}
        setWizard={setSlideWizard}
        onSend={handleWizardSend}
        messages={messages}
        mode={mode}
        onClose={() => setSlideWizard(null)}
      />
    </div>
  );
};

export default TutorChat;