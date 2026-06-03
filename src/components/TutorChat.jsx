import React, {
  useState, useRef, useEffect, useCallback, useMemo, useId,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Brain, Plus, Copy, Download, FileText, X, Sparkles,
  ChevronRight, BookOpen, Bot, Calendar, Presentation,
  Moon, Sun, Palette, Terminal, Paperclip, ArrowUp, LoaderCircle,
  Clock, CalendarDays, BarChart3, ClipboardCheck, Rocket,
  Volume2, VolumeX,
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

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });

/* ─── utils ──────────────────────────────────────────────────── */
const safeParseJSON = (str) => {
  if (typeof str !== 'string') return null;
  let s = str.trim();
  if (!s.startsWith('{') && !s.startsWith('[')) return null;
  try { return JSON.parse(s); } catch (_) { }
  try {
    const fixed = s.replace(/"([^"]*)"/g, (m, p) =>
      '"' + p.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"');
    return JSON.parse(fixed);
  } catch (_) { }
  try {
    let stack = [], inStr = false, esc = false, out = '';
    for (const ch of s) {
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
    .replace(/^:::task\s*/gim, '\n\n')
    .replace(/^:::step\s*/gim, '\n\n')
    .replace(/^:::note\s*/gim, '\n\n')
    .replace(/^:::solution\s*/gim, '\n\n')
    .replace(/^:::(?:summary|xulosa)\s*/gim, '\n\n')
    // theorem/lemma/rule blocks -> keep as raw HTML blocks so rehypeRaw can render them
    .replace(/:::(theorem|lemma|rule|qoid)\s*([\s\S]*?):::/gi, (m, t, body, offset) => {
      // choose variant by simple hash and inline styles for consistent look
      const variants = ['violet', 'indigo', 'emerald', 'amber', 'slate'];
      const colors = {
        violet: { bg: '#f5f3ff', border: '#ddd6fe', title: '#5b21b6' },
        indigo: { bg: '#eef2ff', border: '#e0e7ff', title: '#3730a3' },
        emerald: { bg: '#ecfdf5', border: '#bbf7d0', title: '#065f46' },
        amber: { bg: '#fffbeb', border: '#fef3c7', title: '#92400e' },
        slate: { bg: '#f8fafc', border: '#e6edf3', title: '#0f172a' },
      };
      const idx = Math.abs((t + body).split('').reduce((s,c)=>s + c.charCodeAt(0),0)) % variants.length;
      const v = variants[idx];
      const title = t.charAt(0).toUpperCase() + t.slice(1);
      const safeBody = body.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().replace(/\n/g, '<br/>');
      const style = `background:${colors[v].bg};border:1px solid ${colors[v].border};padding:10px;border-radius:10px;margin:6px 0;font-size:14px;line-height:1.45`;
      const titleStyle = `color:${colors[v].title};font-weight:600;margin-bottom:6px`;
      return `\n\n<div data-qt-type="${t}" style="${style}"><div style="${titleStyle}">${title}.</div><div>${safeBody}</div></div>\n\n`;
    })
    .replace(/:::rating\s*Today Rating:\s*([^\n]+?)(?:\s+Izoh:\s*([\s\S]*?))?(?=\n|$)/gi, '')
    .replace(/\[daily study time\]:\s*([^\n]+)/gi, '')
    .trim();
};

// Small helper to detect continuation prompts that should auto-run
const isAutoContinuePrompt = (text) => {
  if (!text) return false;
  const s = text.toLowerCase();
  return /(iltimos[\s\S]*oldingi javobni davom ettir|please continue|continue the previous)/i.test(s) || s.includes('avvalgi javob');
};

// Detect if content is a study plan
const isStudyPlan = (text) => {
  if (!text) return false;
  const s = text.toLowerCase();
  return (
    (s.includes('o\'quv rejasi') || s.includes('study plan') || s.includes('kunlik plan') || 
     s.includes('haftalik plan') || s.includes('soatlik plan') || s.includes('masterclass')) &&
    (s.includes('vaqt') || s.includes('maqsad') || s.includes('topshiriq') || s.includes('time') ||
     s.includes('task') || s.includes('module'))
  );
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
    <div className="my-4 flex justify-center">
      <div ref={ref} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[80px] flex items-center justify-center">
        {svg
          ? <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full flex justify-center" />
          : <span className="text-[11px] text-slate-300 uppercase tracking-widest">Tahlil...</span>}
      </div>
    </div>
  );
});

/* ─── CodeBlock ───────────────────────────────────────────────── */
const CodeBlock = React.memo(({ language, value, isStreaming }) => {
  if (language === 'mermaid' || value.trim().startsWith('graph ') || value.trim().startsWith('sequenceDiagram'))
    return <MermaidChart chart={value} isStreaming={isStreaming} />;
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 bg-[#1e293b]">
      <div className="px-4 py-2 flex justify-between items-center border-b border-slate-700/40">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language || 'code'}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); toast.success('Nusxa olindi'); }}
          className="text-slate-500 hover:text-white transition-colors p-1 rounded"
        >
          <Copy size={13} />
        </button>
      </div>
      <SyntaxHighlighter
        language={language} style={oneDark}
        customStyle={{ margin: 0, padding: '14px', fontSize: '13px', background: 'transparent' }}
      >{value}</SyntaxHighlighter>
    </div>
  );
});

/* ─── SmartNoteLM ─────────────────────────────────────────────── */
const SmartNoteLM = React.memo(({ title, content, onSave }) => {
  const [saved, setSaved] = useState(false);
  return (
    <div className="my-4 bg-indigo-50/40 border border-indigo-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen size={15} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900 leading-tight">{title || 'Manba'}</p>
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider">Notebook LM</p>
          </div>
        </div>
        <button
          onClick={() => { onSave(content); setSaved(true); toast.success('Saqlandi'); }}
          disabled={saved}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${saved ? 'text-emerald-600 bg-emerald-50' : 'text-slate-700 bg-white hover:bg-indigo-50 border border-slate-200'}`}
        >
          {saved ? 'Saqlandi ✓' : 'Saqlash'}
        </button>
      </div>
      <div className="prose prose-sm max-w-none text-slate-600 border-t border-indigo-100 pt-3">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
});

/* ─── StreamingText ───────────────────────────────────────────── */
const StreamingText = React.memo(({ content }) => {
  const [paras, setParas] = useState([]);
  const prevRef = useRef('');
  const rafRef = useRef(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (content === prevRef.current) return;
      prevRef.current = content;
      setParas(content.split(/\n\n+/));
    });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [content]);

  return (
    <div>
      {paras.map((para, i) => (
        <div key={i} style={{ animation: i === paras.length - 1 ? 'fadeSlideIn 0.18s ease-out both' : 'none' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={mdComponents(true)}>{para}</ReactMarkdown>
        </div>
      ))}
      <span className="inline-block w-[2px] h-[14px] bg-indigo-400 ml-0.5 align-middle animate-[blink_0.8s_step-end_infinite]" />
    </div>
  );
});

/* ─── Markdown components ─────────────────────────────────────── */
const mdComponents = (isStreaming = false) => ({
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-slate-700 text-[14.5px]">{children}</p>,
  table: ({ ...props }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-slate-100">
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

/* ─── InteractiveQuiz ─────────────────────────────────────────── */
const InteractiveQuiz = React.memo(({ quizData }) => {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!quizData || quizData.length === 0) return null;

  const q = quizData[current];

  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correct) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (current < quizData.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    const percent = Math.round((score / quizData.length) * 100);
    return (
      <div className="my-5 bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto bg-indigo-50 rounded-full flex items-center justify-center mb-4">
          <Sparkles size={28} className="text-indigo-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Kviz Yakunlandi!</h3>
        <p className="text-slate-600 mb-6">Siz {quizData.length} ta savoldan {score} tasiga to'g'ri javob berdingiz.</p>
        <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
          <div className="bg-indigo-500 h-3 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
        </div>
        <p className="text-sm font-bold text-indigo-600">{percent}% Natija</p>
      </div>
    );
  }

  return (
    <div className="my-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
          <Brain size={14} /> Interaktiv Kviz
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
          {current + 1} / {quizData.length}
        </div>
      </div>
      
      {/* Question */}
      <div className="p-5">
        <h4 className="text-base font-semibold text-slate-900 mb-4 leading-relaxed">
          {q.q}
        </h4>
        
        {/* Options */}
        <div className="space-y-2">
          {q.options?.map((opt, idx) => {
            let stateClass = "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700";
            if (selected !== null) {
              if (idx === q.correct) stateClass = "border-emerald-500 bg-emerald-50 text-emerald-800 font-medium";
              else if (idx === selected) stateClass = "border-rose-400 bg-rose-50 text-rose-700";
              else stateClass = "border-slate-100 bg-white text-slate-400 opacity-50";
            }
            
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center justify-between ${stateClass}`}
              >
                <span className="text-[14px]">{opt}</span>
                {selected !== null && idx === q.correct && <ClipboardCheck size={16} className="text-emerald-500" />}
              </button>
            );
          })}
        </div>

        {/* Explanation & Next */}
        {selected !== null && (
          <div className="mt-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`p-4 rounded-xl text-sm leading-relaxed mb-4 ${selected === q.correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
              <strong>{selected === q.correct ? 'Ajoyib! ' : 'Diqqat qiling: '}</strong> {q.exp}
            </div>
            <button 
              onClick={nextQuestion}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-[14px] transition-colors"
            >
              {current < quizData.length - 1 ? 'Keyingi Savol' : 'Natijani Ko\'rish'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

/* ─── BotMessage ──────────────────────────────────────────────── */
const BotMessage = React.memo(({ content, isStreaming, onSave, messages, onContinue, onPlanSave, setPlanToSave, setConfirmSave }) => {
  const [unlockedSteps, setUnlockedSteps] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messageRef = useRef(null);
  const components = useMemo(() => mdComponents(isStreaming), [isStreaming]);

  const speakTimerRef = useRef(null);
  const utterQueueRef = useRef([]);
  const speakingRef = useRef(false);

  // ── Mobile-safe TTS: jumlalarga bo'lib ketma-ket o'qish ──────────
  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    clearInterval(speakTimerRef.current);
    utterQueueRef.current = [];
    speakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const speakNext = useCallback(() => {
    const queue = utterQueueRef.current;
    if (!queue.length || !speakingRef.current) {
      stopSpeech();
      return;
    }
    const text = queue.shift();
    if (!text.trim()) { speakNext(); return; }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'uz-UZ';
    utter.rate = 0.9;
    utter.pitch = 1;

    // Prefer any available Uzbek voice, fallback to any available
    const voices = window.speechSynthesis.getVoices();
    const uzVoice = voices.find(v => v.lang.startsWith('uz')) ||
                    voices.find(v => v.lang.startsWith('ru')) || // Russian closer to Uzbek phonetics
                    voices.find(v => v.default);
    if (uzVoice) utter.voice = uzVoice;

    utter.onend = () => {
      if (speakingRef.current) speakNext();
    };
    utter.onerror = (e) => {
      if (e.error === 'interrupted') return; // user stopped
      console.warn('TTS error:', e.error);
      if (speakingRef.current) speakNext(); // skip broken chunk
    };

    window.speechSynthesis.speak(utter);
  }, [stopSpeech]);

  const handleSpeak = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) { stopSpeech(); return; }

    // Strip markdown for cleaner audio
    const plainText = content
      .replace(/```[\s\S]*?```/g, ' kod bloki. ')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.*?\)/g, '$1')
      .replace(/\|.*?\|/g, '')
      .replace(/[-_*~>#]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!plainText) return;

    // Split into short sentences (≤200 chars) — prevents mobile timeout/pause
    const sentences = plainText
      .split(/(?<=[.!?؟])\s+/)
      .flatMap(s => {
        if (s.length <= 200) return [s];
        return s.split(/[,;]/).map(p => p.trim()).filter(Boolean);
      })
      .filter(s => s.trim().length > 2);

    if (!sentences.length) return;

    window.speechSynthesis.cancel();
    utterQueueRef.current = [...sentences];
    speakingRef.current = true;
    setIsSpeaking(true);

    // Android Chrome auto-pauses after ~14s — resume every 5s
    speakTimerRef.current = setInterval(() => {
      if (window.speechSynthesis.paused && speakingRef.current) {
        window.speechSynthesis.resume();
      }
    }, 5000);

    // Wait for voices to load on first use (needed on mobile)
    const startReading = () => speakNext();
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = startReading;
    } else {
      startReading();
    }
  }, [content, isSpeaking, stopSpeech, speakNext]);

  // Cleanup on unmount or content change
  useEffect(() => {
    return () => { stopSpeech(); };
  }, [content, stopSpeech]);

  const processedContent = useMemo(() => {
    if (!content) return '';
    let t = content;
    if ((t.includes('graph ') || t.includes('sequenceDiagram')) && !t.includes('```mermaid')) {
      t = t.replace(/(graph\s+(?:TD|LR|TB|BT|RL)[\s\S]*?)(?=\n\n|\n[a-zA-Z]|\n$|$)/gi,
        m => `\n\n\`\`\`mermaid\n${m.trim()}\n\`\`\`\n\n`);
    }
    return t;
  }, [content]);

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

  const { mainBody, noteData, summaryText, steps, solution, exportData, quizData } = useMemo(() => {
    if (isStreaming) return { mainBody: processedContent, noteData: null, summaryText: null, steps: [], solution: null, exportData: null, quizData: null };
    try {
      let wc = processedContent;
      const exportRegex = /\[EXPORT_FILE:\s*(PDF|DOCX|PPTX)\s*\|\s*([\s\S]*?)\s*\|\s*([\s\S]*?)\]/i;
      const exportMatch = wc.match(exportRegex);
      let exportInfo = null;
      if (exportMatch) {
        wc = wc.replace(exportRegex, '').trim();
        exportInfo = { type: exportMatch[1].toUpperCase(), title: exportMatch[2].trim(), content: exportMatch[3].trim() };
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
      
      const quizRegex = /:::quiz\s*([\s\S]*?)(?=:::(summary|xulosa|step|solution|note)|$)/i;
      const quizMatch = wc.match(quizRegex);
      let parsedQuizData = null;
      if (quizMatch) {
         let rawJson = quizMatch[1].trim();
         const jsonMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/i);
         if (jsonMatch) rawJson = jsonMatch[1];
         parsedQuizData = safeParseJSON(rawJson);
         wc = wc.replace(quizMatch[0], '').trim();
      }

      return {
        mainBody: formatTutorBlocks(wc),
        noteData: noteData ? { ...noteData, content: formatTutorBlocks(noteData.content) } : null,
        summaryText: sumMatch ? formatTutorBlocks(sumMatch[1].trim()) : null,
        steps: stepMatches.map(s => formatTutorBlocks(s)),
        solution: solMatch ? formatTutorBlocks(solMatch[1].trim()) : null,
        exportData: exportInfo ? { ...exportInfo, content: formatTutorBlocks(exportInfo.content) } : null,
        quizData: Array.isArray(parsedQuizData) && parsedQuizData.length > 0 ? parsedQuizData : null,
      };
    } catch (_) {
      return { mainBody: processedContent, noteData: null, summaryText: null, steps: [], solution: null, exportData: null, quizData: null };
    }
  }, [processedContent, isStreaming]);

  // auto-continue detection: trigger onContinue automatically without showing prompt
  const autoContinue = !isStreaming && isAutoContinuePrompt(mainBody || '');
  useEffect(() => {
    if (autoContinue && onContinue) {
      const t = setTimeout(() => onContinue(), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoContinue, onContinue]);

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
            const l = sd.leftColumn || {}, r = sd.rightColumn || {};
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
        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();
        slide.addText(content, { x: 0.5, y: 0.5, w: '90%', h: '80%', fontSize: 18 });
        await pptx.writeFile({ fileName });
      } else {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click();
      }
      toast.success('Tayyor!', { id });
    } catch (err) { console.error(err); toast.error('Xatolik!', { id }); }
  }, [exportData]);

  /* Slide deck theme styles */
  const slideThemeStyles = {
    dark: { wrap: 'bg-slate-900 border-slate-700', text: 'text-white', sub: 'text-slate-400', accent: 'text-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-500', slide: 'bg-slate-800 border-slate-700', divider: 'border-white/10' },
    light: { wrap: 'bg-slate-50 border-slate-200', text: 'text-slate-900', sub: 'text-slate-500', accent: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-500', slide: 'bg-white border-slate-200', divider: 'border-slate-200' },
    purple: { wrap: 'bg-violet-50 border-violet-200', text: 'text-violet-950', sub: 'text-violet-500', accent: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-500', slide: 'bg-white border-violet-200', divider: 'border-violet-200' },
    tech: { wrap: 'bg-black border-emerald-900/40', text: 'text-white', sub: 'text-slate-500', accent: 'text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-500', slide: 'bg-zinc-900 border-zinc-800', divider: 'border-white/10' },
  };

  if (slideDeckData) {
    const { slides, theme } = slideDeckData;
    const ts = slideThemeStyles[theme] || slideThemeStyles.dark;
    return (
      <div ref={messageRef} className={`${ts.wrap} border rounded-2xl p-4 sm:p-6  wrap-break-word `}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${ts.divider} pb-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <Presentation size={20} className={ts.accent} />
            </div>
            <div className="min-w-0">
              <h3 className={`text-[14px] font-semibold text-wrap ${ts.text} truncate`}>{slides[0]?.title || 'Taqdimot'}</h3>
              <p className={`text-[10px] font-medium ${ts.sub} uppercase tracking-wider mt-0.5`}>{slides.length} slayd · {theme.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={() => handleExport(null, slides, theme)}
            className={`${ts.btn} text-white text-[12px] font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center`}
          >
            <Download size={14} /> .pptx yuklab olish
          </button>
        </div>
        <div className="mt-4 flex overflow-x-auto gap-3 py-1 pr-1 scrollbar-thin">
          {slides.map((sl, i) => (
            <div key={i} className={`${ts.slide} border w-36 h-24 shrink-0 rounded-xl p-3 flex flex-col justify-between overflow-hidden`}>
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
        <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-800 truncate">{exportData.title}</p>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">{exportData.type} tayyor</p>
            </div>
          </div>
          <button onClick={handleExport} className="bg-indigo-600 text-white text-[11px] font-semibold px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
            Yuklab olish
          </button>
        </div>
      )}

      {quizData && <InteractiveQuiz quizData={quizData} />}

      {!autoContinue && (
        <div className="prose prose-slate max-w-none">
          {isStreaming
            ? <StreamingText content={mainBody} />
            : <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={components}>{mainBody}</ReactMarkdown>
          }
        </div>
      )}

      {!isStreaming && (
        <>
          {isStudyPlan(mainBody) && setPlanToSave && (
            <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">📚</div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900">Masterclass o'quv rejasi tayyor</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Rejani saqlashni tasdiqlaysizmi?</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const titleMatch = mainBody.match(/## (.+?)(?:\n|$)/);
                  const title = titleMatch?.[1] || 'Study Plan';
                  const typeMatch = mainBody.toLowerCase().includes('soatlik') ? 'hourly' : 
                                    mainBody.toLowerCase().includes('haftalik') ? 'weekly' : 'daily';
                  setPlanToSave({ title, type: typeMatch, content: mainBody });
                  setConfirmSave?.(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-lg transition-all shrink-0"
              >
                Saqlash 💾
              </button>
            </div>
          )}
          {noteData && <SmartNoteLM title={noteData.title} content={noteData.content} onSave={onSave} />}

          {summaryText && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Xulosa</p>
                {onSave && (
                  <button onClick={() => onSave([mainBody, summaryText, solution].filter(Boolean).join('\n\n'))}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                    Saqlash
                  </button>
                )}
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>{summaryText}</ReactMarkdown>
            </div>
          )}

          {steps.slice(0, unlockedSteps).map((s, i) => (
            <div key={i} className="mt-5 border-l-2 border-indigo-100 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <h4 className="text-[14px] font-semibold text-slate-900">{s.split('\n')[0].replace(/[\[\]]/g, '').trim()}</h4>
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
                {s.split('\n').slice(1).join('\n')}
              </ReactMarkdown>
            </div>
          ))}

          {unlockedSteps < steps.length && (
            <button onClick={() => setUnlockedSteps(v => v + 1)}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:bg-slate-800 transition-colors">
              Davom etish <ChevronRight size={14} />
            </button>
          )}

          {onContinue && !isStreaming && (
            <div className="mt-3 hidden">
              <button onClick={onContinue}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[13px] font-semibold hover:bg-indigo-700 transition-colors">
                Javobni davom ettirish
              </button>
            </div>
          )}

          {solution && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl w-fit text-[11px] font-bold uppercase tracking-wider">
                <Sparkles size={12} /> Yechim
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>{solution}</ReactMarkdown>
            </div>
          )}
        </>
      )}

      {/* TTS Button */}
      {!isStreaming && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleSpeak}
            title={isSpeaking ? "To'xtatish" : "Ovozli o'qish"}
            aria-label={isSpeaking ? "Ovoz to'xtatish" : "Ovozli o'qish"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${
              isSpeaking
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
            {isSpeaking ? "To'xtatish" : "Ovozli o'qish"}
          </button>
          {isSpeaking && (
            <div className="flex gap-0.5 items-end h-3">
              {[0, 0.1, 0.2].map((d, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-indigo-500 rounded-full"
                  style={{ height: `${6 + i * 3}px`, animation: `blink 0.5s ${d}s ease-in-out infinite alternate` }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* ─── SavePlanConfirmModal ────────────────────────────────────── */
const SavePlanConfirmModal = React.memo(({ open, title, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[230] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100">
        <h3 className="text-[16px] font-bold text-slate-900 mb-3">📋 Planni tasdiqlaysizmi?</h3>
        <p className="text-[14px] text-slate-600 mb-6 leading-relaxed">
          <strong>{title}</strong> uchun yaratilgan o'quv rejasi saqlanadi. Keyin uni qayta ko'rishingiz mumkin.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
          >
            Bekor qilish
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all"
          >
            Saqlash ✓
          </button>
        </div>
      </div>
    </div>
  );
});

/* ─── SlideWizard Modal ───────────────────────────────────────── */
const THEMES = [
  { key: 'dark', icon: Moon, label: 'Premium Dark', desc: "To'q fon, indigo urg'u" },
  { key: 'light', icon: Sun, label: 'Modern Light', desc: "Yorug' fon, ko'k urg'u" },
  { key: 'purple', icon: Palette, label: 'Creative Violet', desc: 'Binafsha, och fon' },
  { key: 'tech', icon: Terminal, label: 'Minimalist Tech', desc: 'Qora fon, yashil urg\'u' },
];

const SlideWizardModal = React.memo(({ wizard, setWizard, onSend, onClose }) => {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);

  if (!wizard) return null;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); toast.success('Fayl biriktirildi: ' + f.name); }
  };

  const buildPrompt = () => `
Mavzu: ${wizard.topic}
Slaydlar soni: ${wizard.slidesCount} ta
Qo'shimcha manba: ${wizard.resourceOption === 'none' ? "Yo'q" : wizard.resourceText}

Faqat quyidagi JSON formatida javob bering:
[
  { "layout": "title", "title": "...", "subtitle": "..." },
  { "layout": "bullets", "title": "...", "points": ["..."] },
  { "layout": "cards", "title": "...", "cards": [{ "title": "...", "desc": "..." }] },
  { "layout": "two_column", "title": "...", "leftColumn": { "title": "...", "text": "..." }, "rightColumn": { "points": ["..."] } },
  { "layout": "quote", "title": "...", "quote": "...", "author": "..." }
]
MUHIM: Slaydlar soni roppa-rosa ${wizard.slidesCount} ta bo'lsin.
JSON oxirida: [SLIDE_THEME: ${wizard.theme}]`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl border border-slate-100 shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Presentation size={17} className="text-white" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">Slide Wizard</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Taqdimot yaratish</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
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
                  <Paperclip size={18} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-[12px] font-medium text-slate-600">Fayl yuklash</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PDF, Word, rasm (maks 10MB)</p>
                </div>
                {file && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="text-indigo-600 shrink-0" />
                      <p className="text-[12px] font-medium text-slate-700 truncate">{file.name}</p>
                    </div>
                    <button onClick={() => setFile(null)} className="p-1 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      <X size={12} className="text-slate-400" />
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
                  className={`p-3 rounded-xl border text-left transition-all ${wizard.theme === key ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} className={wizard.theme === key ? 'text-indigo-600' : 'text-slate-500'} />
                    <span className="text-[12px] font-semibold text-slate-800">{label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 space-y-2 shrink-0">
          <button
            onClick={() => { onSend(buildPrompt(), file); onClose(); }}
            disabled={!wizard.topic.trim()}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold text-[14px] hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Rocket size={16} />
            <span>Taqdimot yaratish</span>
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

/* ─── PlanModal (dynamic /plan command) ───────────────────────── */
const PlanModal = React.memo(({ open, setOpen, initialTopic, onSend, session }) => {
  const [topic, setTopic] = useState(initialTopic || '');
  const [selectedType, setSelectedType] = useState('daily'); // 'hourly', 'daily', 'weekly'
  const [confirmSave, setConfirmSave] = useState(false);

  useEffect(() => { if (open) setTopic(initialTopic || ''); }, [open, initialTopic]);

  if (!open) return null;

  const planTypes = [
    { id: 'hourly', label: 'Soatlik Plan', icon: Clock },
    { id: 'daily', label: 'Kunlik Plan', icon: CalendarDays },
    { id: 'weekly', label: 'Haftalik Plan', icon: BarChart3 },
  ];

  const handleGeneratePlan = () => {
    if (!topic.trim()) return;
    const planTypeText = selectedType === 'hourly' ? 'soatlik' : selectedType === 'daily' ? 'kunlik' : 'haftalik';
    const prompt = `${topic} mavzusi uchun mukammal va ba'zi tafsilotli masterclass ${planTypeText} o'quv rejasini tuz.

Har bir bosqich uchun aniq vaqt, maqsad, asosiy nazariy qism, topshiriq, baholash mezonlari va uyga vazifa kiritsin.

Javob faqat matn shaklida bo'lsin.`;
    onSend(prompt);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[220] flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-3xl border border-slate-100 shadow-2xl flex flex-col max-h-[80dvh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-indigo-600" />
            <h3 className="text-[16px] font-bold text-slate-900">Masterclass O'quv Rejasi</h3>
          </div>
          <button onClick={() => setOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={16} className="text-slate-500" />
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-widest">Mavzu</label>
            </div>
            <input 
              value={topic} 
              onChange={e => setTopic(e.target.value)}
              placeholder="Masalan: Algebra, Ingliz tili, Biologiya..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:border-indigo-400 focus:bg-white outline-none transition-all" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-slate-500" />
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-widest">Plan Turi</label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {planTypes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedType(id)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    selectedType === id
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200'
                  }`}
                >
                  <Icon size={20} className="mx-auto mb-2" />
                  <div className="text-[13px] font-semibold">{label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ClipboardCheck size={20} className="text-indigo-600 mt-1" />
              <p className="text-[13px] text-indigo-800 leading-relaxed">
                <strong>Oʻquv rejangiz</strong> soatlik, kunlik yoki haftalik timetable bilan tayyorlanadi va to'liq taʼriflar, topshiriqlar va baholash mezonlari bilan biriktiriladi.
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button 
            onClick={() => setOpen(false)}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
          >
            Bekor qilish
          </button>
          <button 
            onClick={handleGeneratePlan}
            disabled={!topic.trim()}
            className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold transition-all flex items-center justify-center gap-2"
          >
            <Rocket size={16} />
            <span>Rejani Yaratish</span>
          </button>
        </div>
      </div>
    </div>
  );
});

/* ─── TutorChat (main) ────────────────────────────────────────── */
const TutorChat = ({ session }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const assistSentRef = useRef(false);
  const { messages, isSending, sendMessage, chatSessions, activeSessionId, changeSession } = useMessages(session);
  const { saveEntry } = useNotebook(session);
  const [mode, setMode] = useState('TUTOR');
  const [showAssignments, setShowAssignments] = useState(false);
  const [slideWizard, setSlideWizard] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [planInitialTopic, setPlanInitialTopic] = useState('');
  const [planToSave, setPlanToSave] = useState(null);
  const [confirmSavePlan, setConfirmSavePlan] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
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
    const trimmed = (text || '').trim();
    if (trimmed.startsWith('/plan')) {
      const topic = trimmed.slice(5).trim();
      setPlanInitialTopic(topic);
      setPlanOpen(true);
      return;
    }
    const isSlide = ['slayd', 'prezentatsiya', 'taqdimot', 'presentation', 'pptx', 'slide']
      .some(k => text.toLowerCase().includes(k));
    if (isSlide) {
      setSlideWizard({ topic: text, slidesCount: 10, resourceText: '', resourceOption: 'none', theme: 'dark' });
    } else {
      sendMessage({ userText: text, attachment, mode, currentMessages: messages });
    }
  }, [mode, messages, sendMessage]);

  const loadSavedPlans = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoadingPlans(true);
    try {
      const { supabase } = await import('../supabase.js');
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSavedPlans(data || []);
    } catch (err) {
      console.error('Load saved plans error:', err);
      toast.error('Rejalar yuklanmadi');
    } finally {
      setLoadingPlans(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) loadSavedPlans();
  }, [session?.user?.id, loadSavedPlans]);

  useEffect(() => {
    const plan = location.state?.assistPlan;
    if (plan && session?.user?.id && !assistSentRef.current) {
      assistSentRef.current = true;
      sendMessage({
        userText: `Iltimos, bu saqlangan rejani AI yordamida tekshirib chiqing va uni yanada mukammallashtiring:\n\n${plan.content}`,
        attachment: null,
        mode,
        currentMessages: messages,
        hidden: true,
      });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, session?.user?.id, sendMessage, mode, messages, navigate]);

  const handlePlanSend = useCallback((prompt) => {
    sendMessage({ userText: prompt, attachment: null, mode, currentMessages: messages, hidden: true });
  }, [mode, messages, sendMessage]);

  const handleSavePlan = useCallback(async () => {
    if (!planToSave || !session?.user?.id) {
      toast.error('Xatolik: Foydalanuvchi ma\'lumotlari topilmadi');
      return;
    }
    
    try {
      const { supabase } = await import('../supabase.js');
      const { error } = await supabase.from('study_plans').insert({
        user_id: session.user.id,
        topic: planToSave.title || 'Untitled Plan',
        plan_type: planToSave.type || 'daily',
        content: planToSave.content,
      });
      
      if (error) throw error;
      toast.success('Reja saqlandi! ✓');
      setConfirmSavePlan(false);
      setPlanToSave(null);
      loadSavedPlans();
    } catch (err) {
      console.error('Save plan error:', err);
      toast.error('Rejani saqlashda xatolik: ' + (err.message || 'Unknown error'));
    }
  }, [planToSave, session, loadSavedPlans]);

  const handleWizardSend = useCallback((text, file) => {
    sendMessage({ userText: text, attachment: file, mode, currentMessages: messages });
  }, [mode, messages, sendMessage]);

  return (
    <div className="flex h-[100dvh] bg-slate-50 relative overflow-hidden font-sans">

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-anim { animation: msgIn 0.22s cubic-bezier(0.16,1,0.3,1) both; }
        .scrollbar-thin::-webkit-scrollbar { height: 3px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
      `}</style>

      <Toaster position="top-center" richColors />

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed lg:relative inset-y-0 right-0 z-40
        w-72 lg:w-64 xl:w-72
        bg-white border-l lg:border-l-0 lg:border-r border-slate-200/70
        flex flex-col shrink-0 shadow-xl lg:shadow-none
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tarix</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-semibold">{chatSessions?.length || 0}</span>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={15} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-0.5">
          {chatSessions?.map(s => (
            <button key={s.id} onClick={() => { changeSession(s.id); setSidebarOpen(false); }}
              className={`w-full text-left p-3 rounded-xl transition-all border ${activeSessionId === s.id ? 'bg-indigo-50 border-indigo-100' : 'border-transparent hover:bg-slate-50'}`}>
              <p className={`text-[13px] font-medium line-clamp-1 ${activeSessionId === s.id ? 'text-indigo-700' : 'text-slate-700'}`}>{s.title}</p>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Calendar size={9} />
                {new Date(s.created_at || Date.now()).toLocaleDateString()}&nbsp;
                {new Date(s.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 p-3 space-y-2 shrink-0">
          <TutorWidgets session={session} />
          <button onClick={() => setShowAssignments(v => !v)}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 transition-all">
            {showAssignments ? 'Vazifalarni yashirish' : "Vazifalarni ko'rsatish"}
          </button>
          {savedPlans.length > 0 ? (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Saqlangan rejalaringiz</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={loadSavedPlans} className="text-[11px] text-indigo-600 hover:text-indigo-800">Yangilash</button>
                  <button
                    onClick={() => navigate('/plans')}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Barcha rejalar sahifasi
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {savedPlans.map(plan => (
                  <div key={plan.id} className="rounded-2xl border border-slate-200 p-3 bg-white min-w-0 break-words">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">{plan.topic}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{plan.plan_type} · {new Date(plan.created_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => sendMessage({ userText: `Iltimos, bu saqlangan rejani davom ettir: ${plan.content}`, attachment: null, mode, currentMessages: messages })}
                        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-1.5 text-white text-[11px] font-semibold hover:bg-indigo-700 transition"
                      >
                        Foydalanish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] text-slate-500">
              {loadingPlans ? 'Rejalar yuklanmoqda...' : 'Hozircha saqlangan reja yo‘q.'}
            </div>
          )}
          {showAssignments && <TutorAssignments session={session} onClose={() => setShowAssignments(false)} />}
        </div>
      </aside>

      {/* ── MAIN COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-5 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-20">
          <div className="flex items-center gap-2.5">
            {/* Mode switcher */}
            <div className="bg-slate-100 rounded-xl p-0.5 flex items-center gap-0.5 border border-slate-200/60">
              {['TUTOR', 'KIDS'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-[10px] text-[12px] font-bold transition-all ${mode === m ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                  {m}
                </button>
              ))}
            </div>

            {/* Slide wizard btn — hidden on very small screens */}
            <button
              onClick={() => setSlideWizard({ topic: '', slidesCount: 10, resourceText: '', resourceOption: 'none', theme: 'dark' })}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-all"
            >
              <Presentation size={13} /> Slayd
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => changeSession(null)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-700 transition-all shadow-sm">
              <Plus size={13} /> <span className="hidden xs:inline">Yangi</span>
            </button>
            {/* Sidebar toggle */}
            <button onClick={() => setSidebarOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200/60 transition-all">
              <Calendar size={14} />
              <span className="hidden md:inline">Tarix</span>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scroll overflow-hidden " >
          <div className="max-w-dvw  mx-auto px-4 md:px-6 py-6 space-y-5">
            {messages.length === 0 ? (
              /* Empty state */
              <div className="flex  flex-col items-center justify-center min-h-[78dvh] text-center px-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Brain size={30} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Salom! Men Ovvox AI</h2>
                <p className="text-[14px] sm:text-[15px] text-slate-500 mt-3 leading-relaxed max-w-sm">
                  Sizning intellektual yordamchingizman. Akademik savollarga javob beraman, kod yozaman va hujjatlarni tahlil qilaman.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-8">
                  {[
                    { title: 'Slayd tayyorla', desc: "Professional slayd rejasi" },
                    { title: 'Tushuntir', desc: "Murakkab mavzuni sodda tilda" },
                    { title: 'Kod yoz', desc: "Istalgan dasturlash tilida" },
                    { title: 'Tarjima qil', desc: "Ko'p tilli tarjima" },
                  ].map(card => (
                    <button key={card.title} onClick={() => handleSendMessage(card.title, null)}
                      className="text-left p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/30 hover:-translate-y-0.5 transition-all duration-200 shadow-xs">
                      <p className="text-[13px] font-semibold text-slate-800">{card.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{card.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5 ">
                {messages.map((m, i) => (
                  <div key={m.id || i}
                    className={`flex gap-3 msg-anim ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'user' ? (
                      <div className="px-4 py-3 bg-slate-900 text-white rounded-2xl rounded-tr-[4px] text-[14px] font-medium max-w-[80%] leading-relaxed">
                        {m.content}
                      </div>
                    ) : (
                      <div className="w-full bg-white rounded-2xl rounded-tl-[4px] border border-slate-100 px-5 py-4 shadow-xs">
                        <BotMessage
                          content={m.content}
                          isStreaming={i === messages.length - 1 && isSending}
                          onSave={handleSave}
                          messages={messages}
                          onContinue={() => {
                            const resumePrompt = `Iltimos, oldingi javobni davom ettiring. Avvalgi javob:\n\n${m.content}\n\nDavom ettiring.`;
                            sendMessage({ userText: resumePrompt, attachment: null, mode, currentMessages: messages });
                          }}
                          setPlanToSave={setPlanToSave}
                          setConfirmSave={setConfirmSavePlan}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-[4px] px-4 py-3 shadow-xs flex items-center gap-2">
                      <LoaderCircle size={16} className="text-indigo-400 animate-spin" />
                      <div className="flex gap-1">
                        {[0, 0.15, 0.3].map(d => (
                          <span key={d} className="w-1.5 h-1.5 bg-indigo-300 rounded-full"
                            style={{ animation: `blink 1.2s ${d}s ease-in-out infinite` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 md:px-6 py-3 bg-white/70 backdrop-blur-xl border-t border-slate-200/50">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSendMessage} isTyping={isSending} />
          </div>
          <p className="text-center text-[10px] text-slate-400 font-medium mt-2 tracking-wide">
            Ovvox AI xato qilishi mumkin. Muhim ma'lumotlarni tekshiring.
          </p>
        </div>
      </div>

      {/* SlideWizard */}
      <SlideWizardModal
        wizard={slideWizard}
        setWizard={setSlideWizard}
        onSend={handleWizardSend}
        onClose={() => setSlideWizard(null)}
      />
      <PlanModal open={planOpen} setOpen={setPlanOpen} initialTopic={planInitialTopic} onSend={handlePlanSend} session={session} />
      <SavePlanConfirmModal 
        open={confirmSavePlan} 
        title={planToSave?.title || 'Study Plan'} 
        onConfirm={handleSavePlan}
        onCancel={() => setConfirmSavePlan(false)}
      />
    </div>
  );
};

export default TutorChat;