import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
import {
  MessageSquare, CheckSquare, Code, Search, Brain,
  Plus, Mic, ArrowUp, Image as ImageIcon, Copy,
  Bookmark, Share2, Terminal, Download, FileText, Paperclip, X, Sparkles,
  Play, Check, ChevronRight, Eye, Info, AlertCircle, Save, Database, Layers,
  BookOpen, Bot, Send, Calendar, Presentation, Moon, Sun, Palette,
  Star
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
import TutorAssignments from './TutorAssignments';
import TutorWidgets from './TutorWidgets';

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
      } catch (e) { }
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

const safeParseJSON = (str) => {
  if (typeof str !== 'string') return null;
  let clean = str.trim();

  if (!clean.startsWith('{') && !clean.startsWith('[')) {
    return null;
  }
  if (clean.startsWith('[') && !/^\[\s*(?:\{|\[|"|\-|\d|true|false|null)/i.test(clean)) {
    return null;
  }
  if (clean.startsWith('{') && !/^\{\s*"/.test(clean)) {
    return null;
  }

  // 1. Try raw parse first
  try {
    return JSON.parse(clean);
  } catch (e) { }

  // 2. Fix raw newlines in string literals
  try {
    const fixedNewlines = clean.replace(/"([^"]*)"/g, (match, p1) => {
      return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
    });
    return JSON.parse(fixedNewlines);
  } catch (e) { }

  // 3. Repair incomplete JSON structures (auto-closing brackets and quotes)
  try {
    let stack = [];
    let inString = false;
    let escaped = false;
    let cleanStr = "";

    for (let i = 0; i < clean.length; i++) {
      let char = clean[i];
      cleanStr += char;

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '[' || char === '{') {
          stack.push(char);
        } else if (char === ']' || char === '}') {
          let last = stack[stack.length - 1];
          if ((char === ']' && last === '[') || (char === '}' && last === '{')) {
            stack.pop();
          }
        }
      }
    }

    if (inString) {
      cleanStr += '"';
    }

    cleanStr = cleanStr.trim();
    if (cleanStr.endsWith(',')) {
      cleanStr = cleanStr.substring(0, cleanStr.length - 1);
    }

    while (stack.length > 0) {
      let last = stack.pop();
      if (last === '[') {
        cleanStr += ']';
      } else if (last === '{') {
        cleanStr += '}';
      }
    }

    // Strip trailing commas before closing brackets/braces
    cleanStr = cleanStr.replace(/,\s*([\]}])/g, '$1');

    return JSON.parse(cleanStr);
  } catch (e) {
    console.error("Failed to parse JSON even after repair attempts:", e);
    return null;
  }
};

const formatTutorBlocks = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/^:::task\s*/gim, '\n\n**🏠 Uy vazifasi:**\n\n')
    .replace(/^:::step\s*/gim, '\n\n### Bosqich:\n\n')
    .replace(/^:::note\s*/gim, '\n\n**📝 Qayd:**\n\n')
    .replace(/^:::solution\s*/gim, '\n\n**✅ Yechim:**\n\n')
    .replace(/^:::summary\s*/gim, '\n\n**📌 Xulosa:**\n\n')
    .replace(/^:::xulosa\s*/gim, '\n\n**📌 Xulosa:**\n\n')
    .replace(/:::rating\s*Today Rating:\s*([^\n]+?)(?:\s+Izoh:\s*([\s\S]*?))?(?=\n|$)/gi, (_match, score, note) => {
      let result = `\n\n> **⭐ Kunlik reyting:** ${score.trim()}\n`;
      if (note) result += `> ${note.trim()}\n`;
      return result + '\n';
    })
    .replace(/\[daily study time\]:\s*([^\n]+)/gi, '**⏱️ Daily study time:** $1\n\n');
};

// ─── BOT MESSAGE ─────────────────────────────────────────────────────
const BotMessage = React.memo(({ content, isStreaming, onSave, messages }) => {
  const [unlockedSteps, setUnlockedSteps] = useState(1);
  const messageRef = useRef(null);

  const processedContent = useMemo(() => {
    let t = content;
    const mRegex = /(graph\s+(?:TD|LR|TB|BT|RL)[\s\S]*?)(?=\n\n|\n[a-zA-Z]|\n$|$)/gi;
    if ((t.includes('graph ') || t.includes('sequenceDiagram')) && !t.includes('```mermaid')) {
      t = t.replace(mRegex, (m) => `\n\n\`\`\`mermaid\n${m.trim()}\n\`\`\`\n\n`);
    }
    return t;
  }, [content]);

  const slideDeckData = useMemo(() => {
    try {
      const exportClean = content.replace(/\[EXPORT_FILE:[\s\S]*?\]/gi, '').replace(/\[SLIDE_THEME:[\s\S]*?\]/gi, '').trim();
      const jsonBlockMatch = exportClean.match(/```json\s*([\s\S]*?)\s*```/i);
      let jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : null;

      if (!jsonStr) {
        const start = exportClean.indexOf('[');
        if (start >= 0) {
          let depth = 0;
          let inString = false;
          let escaped = false;
          for (let i = start; i < exportClean.length; i++) {
            const ch = exportClean[i];
            if (inString) {
              if (escaped) {
                escaped = false;
              } else if (ch === '\\') {
                escaped = true;
              } else if (ch === '"') {
                inString = false;
              }
            } else {
              if (ch === '"') {
                inString = true;
              } else if (ch === '[') {
                depth += 1;
              } else if (ch === ']') {
                depth -= 1;
                if (depth === 0) {
                  jsonStr = exportClean.slice(start, i + 1).trim();
                  break;
                }
              }
            }
          }
        }
      }

      if (!jsonStr) return null;
      const parsed = safeParseJSON(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].layout) {
        const themeMatch = content.match(/\[SLIDE_THEME:\s*([a-zA-Z0-9_\-]+?)\]/i) ||
          (messages && messages.find(msg => msg.role === 'user' && msg.content.includes('[SLIDE_THEME:'))?.content?.match(/\[SLIDE_THEME:\s*([a-zA-Z0-9_\-]+?)\]/i));
        const theme = themeMatch ? themeMatch[1] : 'dark';
        return {
          slides: parsed,
          theme: theme
        };
      }
    } catch (e) {
      console.error("slideDeckData parse error:", e);
      return null;
    }
    return null;
  }, [content, messages]);

  const { mainBody, noteData, summaryText, steps, solution, exportData } = useMemo(() => {
    try {
      if (isStreaming) {
        return { mainBody: processedContent, noteData: null, summaryText: null, steps: [], solution: null, exportData: null };
      }

      let workingContent = processedContent;

      // Extract [EXPORT_FILE: ...]
      const exportRegex = /\[EXPORT_FILE:\s*(PDF|DOCX|PPTX)\s*\|\s*([\s\S]*?)\s*\|\s*([\s\S]*?)\]/i;
      const exportMatch = workingContent.match(exportRegex);
      let exportInfo = null;

      if (exportMatch) {
        workingContent = workingContent.replace(exportRegex, '').trim();
        exportInfo = {
          type: exportMatch[1].toUpperCase(),
          title: exportMatch[2].trim(),
          content: exportMatch[3].trim()
        };
      } else {
        const filenameRegex = /\[EXPORT_FILE:\s*([^\|\]]+?)\]/i;
        const filenameMatch = workingContent.match(filenameRegex);
        if (filenameMatch) {
          workingContent = workingContent.replace(filenameRegex, '').trim();
          const filename = filenameMatch[1].trim();
          const parts = filename.split('.');
          const ext = parts[parts.length - 1].toUpperCase();
          exportInfo = {
            type: ext,
            title: filename,
            content: workingContent
          };
        }
      }

      let noteMatch = workingContent.match(/:::note\s*([\s\S]*?)(?=:::(summary|xulosa|step|solution)|$)/i);
      let noteData = null;
      if (noteMatch) {
        const noteText = noteMatch[1].trim();
        const lines = noteText.split('\n');
        const title = (lines[0] || 'Qayd').replace(/[\[\]]/g, '').trim();
        const content = lines.slice(1).join('\n').trim();
        if (content) noteData = { title, content };
        workingContent = workingContent.replace(noteMatch[0], '').trim();
      }

      const summaryMatch = workingContent.match(/:::(?:summary|xulosa)\s*([\s\S]*?)(?=:::(step|solution)|$)/i);
      const summaryTextRaw = summaryMatch ? summaryMatch[1].trim() : null;
      if (summaryMatch) {
        workingContent = workingContent.replace(summaryMatch[0], '').trim();
      }

      const solutionMatch = workingContent.match(/:::solution\s*([\s\S]*?)$/i);
      const solutionTextRaw = solutionMatch ? solutionMatch[1].trim() : null;
      if (solutionMatch) {
        workingContent = workingContent.replace(solutionMatch[0], '').trim();
      }

      const stepMatches = [];
      const stepRegex = /:::step\s*([\s\S]*?)(?=:::(step|solution)|$)/gi;
      let stepMatch;
      while ((stepMatch = stepRegex.exec(workingContent))) {
        if (stepMatch[1]?.trim()) {
          stepMatches.push(stepMatch[1].trim());
        }
      }
      workingContent = workingContent.replace(/:::step[\s\S]*/gi, '').trim();

      if (exportInfo && exportInfo.content === workingContent) {
        exportInfo.content = workingContent
          .replace(/:::note[\s\S]*?:::/g, '')
          .replace(/:::step/g, '')
          .replace(/:::solution/g, '')
          .replace(/:::(summary|xulosa)[\s\S]*?$/gi, '')
          .trim();
      }

      const formattedMain = formatTutorBlocks(workingContent);
      const formattedNote = noteData ? { ...noteData, content: formatTutorBlocks(noteData.content) } : null;
      const formattedSummary = summaryTextRaw ? formatTutorBlocks(summaryTextRaw) : null;
      const formattedSteps = stepMatches.filter(s => s.trim() !== '').map(s => formatTutorBlocks(s));
      const formattedSolution = solutionTextRaw ? formatTutorBlocks(solutionTextRaw) : null;
      const formattedExport = exportInfo ? { ...exportInfo, content: formatTutorBlocks(exportInfo.content) } : exportInfo;

      return {
        mainBody: formattedMain,
        noteData: formattedNote,
        summaryText: formattedSummary,
        steps: formattedSteps,
        solution: formattedSolution,
        exportData: formattedExport
      };
    } catch (e) {
      return { mainBody: processedContent, noteData: null, summaryText: null, steps: [], solution: null, exportData: null };
    }
  }, [processedContent, isStreaming]);

  const handleExport = async (e, slidesParam = null, themeParam = null) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    // Check if we are exporting slides from the slide deck card
    if (slidesParam || (Array.isArray(e) && e.length > 0 && e[0].layout)) {
      const slides = slidesParam || e;
      const theme = themeParam || 'dark';
      const firstSlide = slides[0] || { title: "Taqdimot" };
      const fileName = `${(firstSlide.title || "Taqdimot").toLowerCase().replace(/\s+/g, '_')}.pptx`;
      const loadingId = toast.loading("Taqdimot tayyorlanmoqda...");

      try {
        const PptxGenJS = (await import('pptxgenjs')).default;
        const pptx = new PptxGenJS();

        // Define colors based on theme
        const themes = {
          dark: { bg: "0B0F19", text: "FFFFFF", accent: "6366F1", cardBg: "1E293B", cardBorder: "334155" },
          light: { bg: "F8FAFC", text: "0F172A", accent: "2563EB", cardBg: "FFFFFF", cardBorder: "E2E8F0" },
          purple: { bg: "F5F3FF", text: "2E1065", accent: "7C3AED", cardBg: "FFFFFF", cardBorder: "DDD6FE" },
          tech: { bg: "000000", text: "FFFFFF", accent: "10B981", cardBg: "111827", cardBorder: "1F2937" }
        };

        const style = themes[theme] || themes.dark;

        slides.forEach((slideData) => {
          const slide = pptx.addSlide();
          slide.background = { fill: style.bg };

          // Add slide title if it's not a title layout
          if (slideData.layout !== 'title' && slideData.title) {
            slide.addText(slideData.title, {
              x: 0.5, y: 0.4, w: '90%', h: 0.6,
              fontSize: 22, bold: true, color: style.accent
            });
          }

          if (slideData.layout === 'title') {
            // Main title slide
            slide.addText(slideData.title || "Taqdimot", {
              x: 0.5, y: 2.0, w: '90%', h: 1.2,
              fontSize: 32, bold: true, color: style.text, align: 'center'
            });
            if (slideData.subtitle) {
              slide.addText(slideData.subtitle, {
                x: 0.5, y: 3.2, w: '90%', h: 0.8,
                fontSize: 16, color: style.accent, align: 'center'
              });
            }
          } else if (slideData.layout === 'two_column') {
            // Two column layout
            // Left Column
            const left = slideData.leftColumn || { title: "", text: "" };
            slide.addText(left.title || "", {
              x: 0.5, y: 1.2, w: '43%', h: 0.5,
              fontSize: 18, bold: true, color: style.text
            });
            slide.addText(left.text || "", {
              x: 0.5, y: 1.8, w: '43%', h: 3.5,
              fontSize: 14, color: style.text, align: 'left', valign: 'top'
            });

            // Right Column
            const right = slideData.rightColumn || { points: [] };
            let rightY = 1.2;
            if (right.points && Array.isArray(right.points)) {
              right.points.forEach((point) => {
                slide.addText(`• ${point}`, {
                  x: 5.2, y: rightY, w: '43%', h: 0.8,
                  fontSize: 14, color: style.text, align: 'left', valign: 'top'
                });
                rightY += 0.9;
              });
            }
          } else if (slideData.layout === 'cards') {
            // Cards layout
            const cards = slideData.cards || [];
            const cardW = 2.8;
            const cardH = 3.5;
            const gap = 0.3;
            let startX = 0.5;

            cards.slice(0, 3).forEach((card) => {
              // Draw background shape for card
              slide.addShape(pptx.shapes.RECTANGLE, {
                x: startX, y: 1.5, w: cardW, h: cardH,
                fill: { color: style.cardBg },
                line: { color: style.cardBorder, width: 1 }
              });

              slide.addText(card.title || "", {
                x: startX + 0.15, y: 1.7, w: cardW - 0.3, h: 0.5,
                fontSize: 16, bold: true, color: style.accent
              });

              slide.addText(card.desc || "", {
                x: startX + 0.15, y: 2.3, w: cardW - 0.3, h: cardH - 1.0,
                fontSize: 12, color: style.text, align: 'left', valign: 'top'
              });

              startX += cardW + gap;
            });
          } else if (slideData.layout === 'quote') {
            // Quote layout
            slide.addText(`"${slideData.quote || ""}"`, {
              x: 1.0, y: 1.8, w: '80%', h: 2.0,
              fontSize: 20, italic: true, color: style.text, align: 'center', valign: 'middle'
            });
            if (slideData.author) {
              slide.addText(`— ${slideData.author}`, {
                x: 1.0, y: 3.8, w: '80%', h: 0.5,
                fontSize: 14, color: style.accent, align: 'center'
              });
            }
          } else if (slideData.layout === 'bullets') {
            // Bullets layout
            let bulletY = 1.2;
            const points = slideData.points || [];
            points.forEach((point) => {
              slide.addText(`• ${point}`, {
                x: 0.5, y: bulletY, w: '90%', h: 0.7,
                fontSize: 14, color: style.text, align: 'left', valign: 'top'
              });
              bulletY += 0.8;
            });
          }
        });

        await pptx.writeFile({ fileName });
        toast.success('Taqdimot yuklab olindi!', { id: loadingId });
      } catch (err) {
        console.error(err);
        toast.error('Taqdimot yaratishda xatolik yuz berdi.', { id: loadingId });
      }
      return;
    }

    if (!exportData) return;
    const { type, title, content } = exportData;
    const fileName = title.endsWith(`.${type.toLowerCase()}`) ? title : `${title}.${type.toLowerCase()}`;
    const loadingId = toast.loading(`${type} tayyorlanmoqda...`);
    try {
      if (type === 'PDF') {
        const element = messageRef.current;
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf().set({ margin: 10, filename: fileName, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } }).from(element).save();
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
      } else if (type === 'XLSX') {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.aoa_to_sheet(content.split('\n').map(l => [l]));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "AI");
        XLSX.writeFile(wb, fileName);
      } else {
        // Plain text / Markdown
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
      }
      toast.success('Tayyor!', { id: loadingId });
    } catch (err) {
      console.error(err);
      toast.error('Xatolik!', { id: loadingId });
    }
  };

  const markdownComponents = useMemo(() => ({
    p: ({ children }) => <div className="mb-3 md:mb-4 last:mb-0 leading-relaxed text-slate-600 text-[13.5px] md:text-[15px]">{children}</div>,
    table: ({ node, ...props }) => <div className="overflow-x-auto my-4 md:my-8 border border-slate-100 md:border-none rounded-xl md:rounded-2xl"><table className="w-full text-left border-collapse" {...props} /></div>,
    thead: ({ node, ...props }) => <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 text-[11px] md:text-[13px] uppercase tracking-wider font-bold" {...props} />,
    tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-slate-50" {...props} />,
    tr: ({ node, ...props }) => <tr className="hover:bg-indigo-50/30 transition-colors" {...props} />,
    th: ({ node, ...props }) => <th className="px-3 md:px-6 py-2.5 md:py-4 font-bold text-[11px] md:text-[13px]" {...props} />,
    td: ({ node, ...props }) => <td className="px-3 md:px-6 py-2 md:py-4 text-slate-600 text-[12px] md:text-[14px] leading-relaxed break-words whitespace-normal" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 md:ml-6 mb-4 md:mb-6 space-y-1.5 md:space-y-2 marker:text-indigo-400" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 md:ml-6 mb-4 md:mb-6 space-y-1.5 md:space-y-2 marker:text-indigo-500 marker:font-semibold" {...props} />,
    li: ({ node, ...props }) => <li className="pl-1 text-slate-700 leading-relaxed text-[13.5px] md:text-[15px]" {...props} />,
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || ''); const val = String(children).replace(/\n$/, '');
      if (!inline && (match?.[1] === 'mermaid' || val.startsWith('graph '))) return <MermaidChart chart={val} isStreaming={isStreaming} />;
      return !inline && match ? <CodeBlock language={match[1]} value={val} isStreaming={isStreaming} /> : <code className="bg-slate-50 text-slate-700 px-1.5 py-0.5 rounded-lg font-semibold text-[0.9em]" {...props}>{children}</code>;
    }
  }), [isStreaming]);

  const themeStyles = {
    dark: {
      cardBg: 'from-[#0B0F19] to-[#1E293B]',
      textColor: 'text-white',
      subColor: 'text-slate-400',
      accentColor: 'text-indigo-400',
      btnBg: 'bg-indigo-600 hover:bg-indigo-700',
      slideBg: 'bg-[#151C2C]',
      border: 'border-slate-800'
    },
    light: {
      cardBg: 'from-[#F8FAFC] to-[#F1F5F9]',
      textColor: 'text-slate-900',
      subColor: 'text-slate-500',
      accentColor: 'text-blue-600',
      btnBg: 'bg-blue-600 hover:bg-blue-700',
      slideBg: 'bg-white',
      border: 'border-slate-200'
    },
    purple: {
      cardBg: 'from-[#F5F3FF] to-[#EDE9FE]',
      textColor: 'text-indigo-950',
      subColor: 'text-indigo-600/70',
      accentColor: 'text-purple-600',
      btnBg: 'bg-purple-600 hover:bg-purple-700',
      slideBg: 'bg-white',
      border: 'border-purple-200'
    },
    tech: {
      cardBg: 'from-[#070708] to-[#0F172A]',
      textColor: 'text-white',
      subColor: 'text-slate-500',
      accentColor: 'text-emerald-400',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700',
      slideBg: 'bg-[#000000]',
      border: 'border-emerald-500/20'
    }
  };

  const currentStyle = themeStyles[slideDeckData?.theme] || themeStyles.dark;

  if (slideDeckData) {
    const { slides, theme } = slideDeckData;
    const firstSlide = slides[0] || { title: "Taqdimot", subtitle: "" };
    return (
      <div ref={messageRef} className={`bg-gradient-to-br ${currentStyle.cardBg} border ${currentStyle.border} rounded-3xl p-5 md:p-8 shadow-xl w-full group/msg animate-in fade-in duration-500`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 border-white/10">
          <div className="flex items-center gap-3.5 min-w-0 text-left">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 backdrop-blur-md">
              <Presentation size={24} className={currentStyle.accentColor} />
            </div>
            <div className="min-w-0">
              <h3 className={`text-base font-bold ${currentStyle.textColor} truncate max-w-xs sm:max-w-md`}>{firstSlide.title || "Taqdimot"}</h3>
              <p className={`text-xs ${currentStyle.subColor} font-medium mt-1 uppercase tracking-wider`}>{slides.length} slayd • Theme: {theme.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={() => handleExport(null, slideDeckData.slides, slideDeckData.theme)}
            className={`${currentStyle.btnBg} text-white text-[12px] font-bold px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 flex-shrink-0 shadow-lg`}
          >
            <Download size={15} /> Taqdimotni yuklab olish (.pptx)
          </button>
        </div>

        <div className="space-y-2 mt-5 text-left">
          <span className={`text-[10px] font-black uppercase tracking-widest ${currentStyle.subColor}`}>Slaydlar taqdimoti preview</span>
          <div className="flex overflow-x-auto gap-4 py-2 custom-scrollbar pr-4">
            {slides.map((slide, sIdx) => (
              <div
                key={sIdx}
                className={`${currentStyle.slideBg} w-[180px] h-[110px] flex-shrink-0 rounded-xl p-3 border ${currentStyle.border} shadow-sm relative overflow-hidden flex flex-col justify-between`}
              >
                <div className="absolute inset-x-3 bottom-3 flex flex-col gap-1.5 opacity-40">
                  {slide.layout === 'title' && (
                    <div className="flex flex-col items-center gap-1 w-full mt-4">
                      <div className="w-12 h-1 bg-slate-400 rounded-full"></div>
                      <div className="w-8 h-0.5 bg-slate-500 rounded-full"></div>
                    </div>
                  )}
                  {slide.layout === 'two_column' && (
                    <div className="flex gap-2 w-full">
                      <div className="flex-grow bg-slate-400 h-6 rounded"></div>
                      <div className="flex flex-col gap-1 w-1/2 mt-1">
                        <div className="w-full h-0.5 bg-slate-500 rounded-full"></div>
                        <div className="w-2/3 h-0.5 bg-slate-500 rounded-full"></div>
                      </div>
                    </div>
                  )}
                  {slide.layout === 'cards' && (
                    <div className="flex gap-1 w-full justify-around mt-2">
                      <div className="w-[30%] bg-slate-400 h-6 rounded"></div>
                      <div className="w-[30%] bg-slate-400 h-6 rounded"></div>
                      <div className="w-[30%] bg-slate-400 h-6 rounded"></div>
                    </div>
                  )}
                  {slide.layout === 'quote' && (
                    <div className="flex flex-col items-center gap-1 w-full mt-3">
                      <div className="w-16 h-0.5 bg-slate-400 rounded-full"></div>
                      <div className="w-10 h-0.5 bg-slate-500 rounded-full"></div>
                    </div>
                  )}
                  {slide.layout === 'bullets' && (
                    <div className="flex flex-col gap-1 w-full mt-2">
                      <div className="w-3/4 h-0.5 bg-slate-400 rounded-full"></div>
                      <div className="w-2/3 h-0.5 bg-slate-400 rounded-full"></div>
                      <div className="w-4/5 h-0.5 bg-slate-400 rounded-full"></div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-start">
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-full ${currentStyle.accentColor}`}>Slide {sIdx + 1}</span>
                  <span className={`text-[7px] font-semibold text-slate-500 uppercase`}>{slide.layout}</span>
                </div>
                <div className="z-10 mt-1 mb-6">
                  <h4 className={`text-[9.5px] font-bold ${currentStyle.textColor} line-clamp-2 leading-tight uppercase`}>{slide.title || "Mavzusiz"}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={messageRef} className="bg-white/80 backdrop-blur-md border border-indigo-50 rounded-2xl md:rounded-3xl rounded-tl-[4px] p-3.5 md:p-8 shadow-xl shadow-slate-200/50 w-full group/msg transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 hover:shadow-2xl hover:border-indigo-100">
      {exportData && (
        <div className="mb-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <FileText size={20} />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[180px] sm:max-w-xs">{exportData.title}</div>
              <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">{exportData.type} tayyor</div>
            </div>
          </div>
          <button onClick={handleExport} className="bg-indigo-600 text-white text-[11px] font-bold px-4 py-2 rounded-lg hover:scale-105 active:scale-95 transition-all flex-shrink-0">Yuklab olish</button>
        </div>
      )}

      <div className="prose prose-slate prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-[15px] prose-p:mb-4 max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={markdownComponents}
        >{mainBody}</ReactMarkdown>
        {noteData && <SmartNoteLM title={noteData.title} content={noteData.content} onSave={onSave} />}
        {summaryText && (
          <div className="my-6 p-5 bg-slate-50 border border-slate-200 rounded-3xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400 font-semibold">Xulosa</p>
                <h4 className="text-sm font-semibold text-slate-900">Muhim qismlar</h4>
              </div>
              {onSave && (
                <button
                  onClick={() => onSave([mainBody, summaryText, solution].filter(Boolean).join('\n\n'))}
                  className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 transition-all"
                >
                  Saqlash
                </button>
              )}
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{summaryText}</ReactMarkdown>
          </div>
        )}
        {steps.slice(0, unlockedSteps).map((s, i) => (
          <div key={i} className="my-8 border-l-2 border-indigo-100 pl-6 animate-in slide-in-from-left-4 duration-700">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-7 h-7 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-bold shadow-sm">{i + 1}</span>
              <h4 className="text-[16px] font-semibold text-slate-900 m-0 uppercase tracking-tight">{s.split('\n')[0].replace(/[\[\]]/g, '').trim()}</h4>
            </div>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>{s.split('\n').slice(1).join('\n')}</ReactMarkdown>
          </div>
        ))}
        {unlockedSteps < steps.length && !isStreaming && (
          <button onClick={() => setUnlockedSteps(v => v + 1)} className="mt-6 flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all shadow-xl shadow-slate-100">Davom etish <ChevronRight size={16} /></button>
        )}
        {solution && (
          <div className="mt-10 pt-10 border-t border-slate-50">
            <div className="animate-in fade-in duration-1000">
              <div className="flex items-center gap-2 mb-6 py-1.5 px-5 bg-emerald-50 text-emerald-700 rounded-xl w-fit font-bold text-[11px] uppercase tracking-widest">
                <Sparkles size={14} /> Akademik Yechim / Misol
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                {solution}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── MAIN TUTOR CHAT ───────────────────────────────────────────────────
const TutorChat = ({ session }) => {
  const { messages, isSending, sendMessage, chatSessions, activeSessionId, changeSession } = useMessages(session);
  const { saveEntry } = useNotebook(session);
  const [mode, setMode] = useState('TUTOR');
  const [showAssignments, setShowAssignments] = useState(false);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [slideWizard, setSlideWizard] = useState(null);
  const [wizardFile, setWizardFile] = useState(null);
  const wizardFileRef = useRef(null);

  const messagesEndRef = useRef(null);
  const scrollToBottom = useCallback(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), []);
  useEffect(() => { const t = setTimeout(scrollToBottom, 50); return () => clearTimeout(t); }, [messages.length, isSending, scrollToBottom]);
  useEffect(() => {
    const load = async () => {
      try {
        const t = await getStudyTime({ userId: session?.user?.id });
        setTodayMinutes(t.minutes || 0);
      } catch (e) { }
    };
    load();
  }, [session]);

  const handleSave = useCallback((t) => saveEntry(t), [saveEntry]);

  const handleSendMessage = (text, attachment) => {
    const isSlide = ['slayd', 'prezentatsiya', 'taqdimot', 'presentation', 'pptx', 'slide'].some(k => text.toLowerCase().includes(k));
    if (isSlide) {
      setSlideWizard({
        topic: text,
        slidesCount: 10,
        resourceText: '',
        resourceOption: 'none',
        theme: 'dark'
      });
    } else {
      sendMessage({ userText: text, attachment, mode, currentMessages: messages });
    }
  };

  const openSlideWizard = () => {
    setSlideWizard({
      topic: '',
      slidesCount: 10,
      resourceText: '',
      resourceOption: 'none',
      theme: 'dark'
    });
  };

  return (
    <div className="flex-1 flex h-full bg-[#f8faff] nano-bg relative overflow-hidden w-full flex-col lg:flex-row">
      {/* LEFT: MAIN CHAT */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <IconGradient />
        <Toaster position="top-right" richColors />

        {/* HEADER / ACTIONS */}
        <div className="absolute bg-white/70 dark:bg-slate-900/40 h-13 backdrop-blur-2xl float-right max-w-max md:absolute top-0 md:top-4 right-0 md:right-6 z-30 flex flex-row items-center justify-between md:justify-end gap-2 p-4 md:p-3 border-b border-slate-200/60 md:border md:border-white/40 md:rounded-2xl w-full md:w-auto shrink-0 animate-in slide-in-from-top-3 duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">

          {/* Switcher Container */}
          <div className="bg-slate-100/80 dark:bg-slate-800/40 px-2 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-xl p-0.5 md:p-1 flex items-center shadow-inner w-fit">
            <button
              onClick={() => setMode('TUTOR')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-[11px] md:text-[12px] font-semibold transition-all ${mode === 'TUTOR'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              Tutor
            </button>
            <button
              onClick={() => setMode('KIDS')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-[11px] md:text-[12px] font-semibold transition-all ${mode === 'KIDS'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
            >
              Kids
            </button>
          </div>

          {/* Assignments Section */}
          <div className="hidden md:flex items-center gap-3 ml-3">
            <button
              onClick={openSlideWizard}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-slate-200 bg-white/60 text-slate-800 hover:bg-white/90 hover:border-slate-300 backdrop-blur-sm transition-all shadow-sm"
            >
              Slayd Tayyorlash
            </button>
            <button
              onClick={() => setShowAssignments(v => !v)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-slate-200 bg-white/60 text-slate-800 hover:bg-white/90 hover:border-slate-300 backdrop-blur-sm transition-all shadow-sm"
            >
              Assignments
            </button>
            <div className="text-[12px] text-slate-600 font-medium">
              Today: <span className="font-bold text-slate-900">{todayMinutes}m</span>
            </div>
          </div>

          {/* Yangi Chat Button */}
          <button
            onClick={() => changeSession(null)}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-indigo-600 border border-indigo-500/30 rounded-xl text-[11px] md:text-[13px] font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
          >
            <Plus size={14} /> Yangi Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pt-2 md:pt-16 pb-36 md:pb-40 px-0 md:px-6 custom-scrollbar relative z-10">
          {messages.length === 0 ? (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] gap-6 md:gap-8 animate-in fade-in duration-1000">
              <div className="relative">
                <div className="w-24 h-24 bg-white rounded-[32px] shadow-2xl shadow-indigo-100 flex items-center justify-center border border-indigo-50 relative z-10">
                  <Brain size={48} stroke="url(#icon-blue-purple)" />
                </div>
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full blur-2xl opacity-50 -z-10 animate-pulse"></div>
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Men Typer AI man.</h2>
                <p className="text-[15px] font-medium text-slate-400 max-w-md mx-auto leading-relaxed">
                  Akademik savollarga javob beraman, kod yozaman va hujjatlarni tahlil qilaman.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-3 md:gap-8 w-full px-2.5 md:px-0">
              {messages.map((m, i) => (
                <div key={m.id || i} className={`flex gap-3 md:gap-6 ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  {m.role === 'user' ? (
                    <div className="px-4 py-2.5 md:px-7 md:py-4 bg-slate-900 text-white rounded-2xl md:rounded-3xl rounded-tr-[4px] text-[14px] md:text-[15px] font-medium max-w-[92%] md:max-w-[80%] shadow-xl shadow-slate-200 leading-relaxed border border-slate-800">{m.content}</div>
                  ) : (
                    <BotMessage content={m.content} isStreaming={i === messages.length - 1 && isSending} onSave={handleSave} messages={messages} />
                  )}
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white/95 backdrop-blur-md border border-slate-100 rounded-3xl py-4 px-8 shadow-sm flex items-center gap-4">
                    <div className="w-5 h-5 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[12px] font-bold text-indigo-500 uppercase tracking-widest">Tahlil...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-10" />
            </div>
          )}
        </div>

        <div className="absolute bottom-4 md:bottom-6 left-0 w-full px-4 md:px-6 z-20">
          <div className="max-w-4xl mx-auto">
            <div className="glass-panel rounded-[24px] md:rounded-[32px] p-2 md:p-2.5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] bg-white/90 backdrop-blur-xl border border-slate-200 transition-all hover:shadow-[0_30px_60px_-15px_rgba(99,102,241,0.15)]">
              <ChatInput onSend={handleSendMessage} isTyping={isSending} />
            </div>
            <div className="text-center mt-2.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-300">
              AI xato qilishi mumkin. Muhim ma'lumotlarni tekshiring.
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: TUTOR SIDEBAR */}
      <aside className="w-full lg:w-[380px] flex-shrink-0 border-t border-slate-200/60 lg:border-t-0 lg:border-l lg:bg-slate-50/90 lg:backdrop-blur-xl lg:shadow-inner lg:shadow-slate-200/5">
        <div className="sticky top-0 z-30 bg-slate-50/95 lg:bg-transparent border-b border-slate-200/60 lg:border-none px-4 py-4 lg:px-6 lg:pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] font-semibold text-slate-400">Tutor Panel</p>
              <h2 className="text-lg font-bold text-slate-900">Monitoring</h2>
            </div>
            <button onClick={() => setShowAssignments(v => !v)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-[13px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-all">
              {showAssignments ? 'Hide Tasks' : 'Show Tasks'}
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6 space-y-4">
          <TutorWidgets session={session} />
          {showAssignments ? (
            <TutorAssignments session={session} onClose={() => setShowAssignments(false)} />
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                  <Star size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Assignments</h3>
                  <p className="mt-1 text-sm text-slate-500">Tapshiriqlarni boshqarish uchun oching va har kunlik reytingni qidiring.</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 border border-slate-200">Today: <span className="font-semibold text-slate-900">{todayMinutes}m</span></div>
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 border border-slate-200">Open the tasks panel to review progress and add more homework.</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* SLIDE GENERATOR WIZARD MODAL */}
      {slideWizard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-lg p-6 md:p-8 flex flex-col gap-6 relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => { setSlideWizard(null); setWizardFile(null); }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 text-left">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Presentation size={20} className="text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">Typer Slide Wizard</h3>
                <p className="text-xs text-slate-400 font-medium tracking-tight uppercase">Premium Taqdimot Yaratish</p>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Taqdimot Mavzusi</label>
                <input
                  type="text"
                  value={slideWizard.topic}
                  onChange={e => setSlideWizard(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-[14px] outline-none text-slate-700 focus:bg-slate-100 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Slaydlar Soni (Kamida 10 ta)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    value={slideWizard.slidesCount}
                    onChange={e => setSlideWizard(prev => ({ ...prev, slidesCount: Math.max(10, parseInt(e.target.value) || 10) }))}
                    className="w-24 px-4 py-3 bg-slate-50 border-none rounded-xl text-[14px] outline-none text-slate-700 text-center font-medium"
                  />
                  <span className="text-xs text-slate-400 font-normal">10 tadan kam bo'lmagan professional slaydlar to'plami.</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Mavzu bo'yicha manba bormi?</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSlideWizard(prev => ({ ...prev, resourceOption: 'none' }))}
                    className={`py-2 px-3 rounded-xl text-[11px] font-medium border transition-all ${slideWizard.resourceOption === 'none' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}
                  >
                    Yo'q (O'tkazib yuborish)
                  </button>
                  <button
                    onClick={() => setSlideWizard(prev => ({ ...prev, resourceOption: 'text' }))}
                    className={`py-2 px-3 rounded-xl text-[11px] font-medium border transition-all ${slideWizard.resourceOption === 'text' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}
                  >
                    Matn Kiritish
                  </button>
                  <button
                    onClick={() => setSlideWizard(prev => ({ ...prev, resourceOption: 'file' }))}
                    className={`py-2 px-3 rounded-xl text-[11px] font-medium border transition-all ${slideWizard.resourceOption === 'file' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}
                  >
                    Fayl Biriktirish
                  </button>
                </div>
              </div>

              {slideWizard.resourceOption === 'text' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <textarea
                    placeholder="Slayd tuzishda ishlatiladigan kitob yoki maqola matnini shu yerga joylashtiring..."
                    value={slideWizard.resourceText}
                    onChange={e => setSlideWizard(prev => ({ ...prev, resourceText: e.target.value }))}
                    rows={4}
                    className="w-full p-4 bg-slate-50 border-none rounded-xl text-[13px] outline-none text-slate-700 focus:bg-slate-100 transition-all resize-none leading-relaxed font-medium"
                  />
                </div>
              )}

              {slideWizard.resourceOption === 'file' && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div
                    onClick={() => wizardFileRef.current?.click()}
                    className="p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-2xl bg-slate-50 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <input
                      type="file"
                      ref={wizardFileRef}
                      className="hidden"
                      accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={e => {
                        const f = e.target.files[0];
                        if (f) {
                          setWizardFile(f);
                          toast.success('Fayl biriktirildi: ' + f.name);
                        }
                      }}
                    />
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <Paperclip size={18} />
                    </div>
                    <div>
                      <span className="text-[13px] font-semibold text-slate-700 block">Fayl yuklash</span>
                      <span className="text-[10px] text-slate-400 mt-1 block">PDF, Word, Rasm yoki Matn fayli (Max 10MB)</span>
                    </div>
                  </div>

                  {wizardFile && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="text-[12px] font-medium text-slate-800 truncate">{wizardFile.name}</div>
                          <div className="text-[9px] text-indigo-600 font-medium uppercase tracking-wider mt-0.5">{(wizardFile.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setWizardFile(null); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <textarea
                    placeholder="Qisqa reja, mavzu haqida izoh yoki havola..."
                    value={slideWizard.resourceText}
                    onChange={e => setSlideWizard(prev => ({ ...prev, resourceText: e.target.value }))}
                    rows={2}
                    className="w-full p-3 bg-white border border-slate-100 rounded-xl text-[13px] outline-none text-slate-700 resize-none font-medium placeholder:text-slate-300"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Dizayn Uslubi (Theme)</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: 'dark', icon: <Moon size={14} className="text-indigo-500" />, label: 'Premium Dark', desc: 'Indigo urg\'ulari va to\'q fon' },
                    { key: 'light', icon: <Sun size={14} className="text-amber-500" />, label: 'Modern Light', desc: 'Ko\'k urg\'ulari va toza yorug\' fon' },
                    { key: 'purple', icon: <Palette size={14} className="text-purple-500" />, label: 'Creative Violet', desc: 'Binafsha urg\'ulari va och fon' },
                    { key: 'tech', icon: <Terminal size={14} className="text-emerald-500" />, label: 'Minimalist Tech', desc: 'Yashil urg\'ulari va qora fon' }
                  ].map(theme => (
                    <button
                      key={theme.key}
                      onClick={() => setSlideWizard(prev => ({ ...prev, theme: theme.key }))}
                      className={`p-3 rounded-2xl border text-left transition-all ${slideWizard.theme === theme.key ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        {theme.icon}
                        <div className="text-[12px] font-medium text-slate-800">{theme.label}</div>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">{theme.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const compiledPrompt = `
Mavzu: ${slideWizard.topic}
Slaydlar soni: ${slideWizard.slidesCount} ta (albatta kamida ${slideWizard.slidesCount} ta alohida slayd bo'lishi shart!)
Mavzu bo'yicha qo'shimcha manba: ${slideWizard.resourceOption === 'none' ? 'Mavjud emas (AI o\'zi ma\'lumot yig\'sin)' : slideWizard.resourceText}

Iltimos, ushbu ma'lumotlar asosida juda chiroyli va professional slaydlar to'plamini tayyorlang.
Javobingizda FAQAT va FAQAT maxsus JSON formatini qaytarishingiz kerak. Hech qanday boshqa matn, kirish yoki xulosa yozmang.

JSON formati quyidagi ko'rinishda bo'lsin:
[
  {
    "layout": "title",
    "title": "Taqdimot Sarlavhasi",
    "subtitle": "Taqdimot osti sarlavhasi yoki muallif ismi"
  },
  {
    "layout": "two_column",
    "title": "Slayd Sarlavhasi",
    "leftColumn": {
      "title": "Asosiy Fikr yoki Statistika",
      "text": "Ushbu fikr yoki statistika haqida qisqacha izoh"
    },
    "rightColumn": {
      "points": [
        "Birinchi nuqta",
        "Ikkinchi nuqta",
        "Uchinchi nuqta"
      ]
    }
  },
  {
    "layout": "cards",
    "title": "Slayd Sarlavhasi",
    "cards": [
      {
        "title": "Karta 1",
        "desc": "Batafsil ma'lumot"
      },
      {
        "title": "Karta 2",
        "desc": "Batafsil ma'lumot"
      },
      {
        "title": "Karta 3",
        "desc": "Batafsil ma'lumot"
      }
    ]
  },
  {
    "layout": "quote",
    "title": "Iqtibos Slaydi",
    "quote": "Taqdimot mavzusiga mos keladigan juda kuchli iqtibos...",
    "author": "Muallif"
  },
  {
    "layout": "bullets",
    "title": "Slayd Sarlavhasi",
    "points": [
      "Muhim ma'lumot 1",
      "Muhim ma'lumot 2",
      "Muhim ma'lumot 3",
      "Muhim ma'lumot 4"
    ]
  }
]

MUHIM QOIDALAR:
1. Slaydlar soni roppa-rosa ${slideWizard.slidesCount} ta bo'lsin.
2. Har bir slayd uchun mos keladigan layout turini tanlang (title, two_column, cards, quote, bullets).
3. JSON yopilgandan so'ng, javob oxirida maxsus [SLIDE_THEME: ${slideWizard.theme}] yozuvini qoldiring.
`;
                sendMessage({ userText: compiledPrompt, attachment: wizardFile, mode, currentMessages: messages });
                setSlideWizard(null);
                setWizardFile(null);
              }}
              disabled={!slideWizard.topic.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              Slayd Tayyorlash 🚀
            </button>
            <button
              onClick={() => {
                sendMessage({ userText: slideWizard.topic, attachment: wizardFile, mode, currentMessages: messages });
                setSlideWizard(null);
                setWizardFile(null);
              }}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold text-xs transition-all"
            >
              Oddiy xabar sifatida yuborish 💬
            </button>
          </div>
        </div>
      )}

      {/* RIGHT: CHAT HISTORY SIDEBAR */}
      <div className="hidden lg:flex w-72 bg-white border-l border-slate-100 flex-col z-20 shadow-sm">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
          <span className="text-[13px] font-bold text-slate-800 uppercase tracking-widest">Suhbatlar Tarixi</span>
          <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold">{chatSessions?.length || 0}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {chatSessions?.map(s => (
            <button
              key={s.id}
              onClick={() => changeSession(s.id)}
              className={`w-full text-left p-3 rounded-xl transition-all border ${activeSessionId === s.id ? 'bg-indigo-50/50 border-indigo-100 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
            >
              <div className={`text-[13px] font-semibold line-clamp-1 ${activeSessionId === s.id ? 'text-indigo-700' : 'text-slate-600'}`}>{s.title}</div>
              <div className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1.5">
                <Calendar size={10} /> {new Date(s.created_at || Date.now()).toLocaleDateString()} {new Date(s.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── CHAT INPUT ────────────────────────────────────────────────────────
const ChatInput = ({ onSend, isTyping }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);

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

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.indexOf('image') !== -1 || file.type === 'application/pdf')) {
      setAttachment(file);
      if (file.type.indexOf('image') !== -1) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setPreview('pdf');
      }
      toast.success('Fayl biriktirildi');
    }
  }, []);

  const submit = () => {
    if (!text.trim() && !attachment) return;
    onSend(text, attachment);
    setText('');
    setAttachment(null);
    setPreview(null);
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-[24px] transition-all duration-300 ${isDragging ? 'bg-indigo-50 border-2 border-dashed border-indigo-400 p-2' : 'border-2 border-transparent'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input type="file" ref={fileRef} className="hidden" accept="image/*,application/pdf" onChange={e => { const f = e.target.files[0]; if (!f) return; setAttachment(f); if (f.type.indexOf('image') !== -1) { const r = new FileReader(); r.onloadend = () => setPreview(r.result); r.readAsDataURL(f); } else { setPreview('pdf'); } }} />

      {preview && (
        <div className="relative w-16 h-16 ml-4 mt-3 group inline-block">
          {preview === 'pdf' ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500 rounded-xl border border-slate-200 shadow-sm text-[10px] font-bold"><FileText size={20} /> PDF</div>
          ) : (
            <img src={preview} alt="p" className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm" />
          )}
          <button onClick={() => { setAttachment(null); setPreview(null); }} className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 shadow-xl opacity-0 group-hover:opacity-100 transition-all">
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-center md:items-end gap-2 md:gap-3 p-1.5 md:p-2">
        <button onClick={() => fileRef.current?.click()} className="p-2 md:p-3 text-slate-400 hover:bg-slate-50 rounded-[18px] transition-all shrink-0" data-tooltip="Fayl yoki rasm yuklash"><Paperclip size={18} stroke="url(#icon-blue-purple)" className="md:w-5 md:h-5" /></button>
        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          placeholder="Savol yozing..."
          onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          className="flex-1 bg-transparent border-none outline-none resize-none text-[14px] md:text-[15px] font-medium text-slate-700 placeholder:text-slate-300 py-2.5 md:py-4 px-1 md:px-2 leading-relaxed custom-scrollbar max-h-[200px]"
        />
        <button onClick={submit} disabled={(!text.trim() && !attachment) || isTyping} className={`p-2.5 md:p-3 rounded-full md:rounded-[24px] transition-all shadow-md shrink-0 flex items-center justify-center ${text.trim() || attachment ? 'bg-slate-900 text-white shadow-slate-900/20 hover:shadow-lg hover:-translate-y-0.5' : 'bg-slate-50 text-slate-300'}`}>
          <ArrowUp size={16} strokeWidth={2.5} className="md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  );
};

export default TutorChat;