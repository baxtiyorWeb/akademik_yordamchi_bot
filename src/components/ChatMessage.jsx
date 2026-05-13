import React, { useState, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Brain, Star, Copy, Check, Volume2, RotateCcw, ChevronDown, ChevronUp, Code, BookOpen, Calculator, Languages, Sparkles } from 'lucide-react';
import Mermaid from './Mermaid';
import VibeEditor from './VibeEditor';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import PptxGenJS from 'pptxgenjs';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import { Download, FileText, Presentation, Table, FileJson, Sigma } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';

// ─── Xabar turi badge ────────────────────────────────────────────────────────
const TypeBadge = ({ type }) => {
  const badges = {
    code: { icon: <Code size={11} />, label: 'Kod', color: '#3b82f6' },
    diagram: { icon: <RotateCcw size={11} />, label: 'Diagramma', color: '#10b981' },
    math: { icon: <Calculator size={11} />, label: 'Matematik', color: '#8b5cf6' },
    translation: { icon: <Languages size={11} />, label: 'Tarjima', color: '#10b981' },
    quiz: { icon: <BookOpen size={11} />, label: 'Test', color: '#f59e0b' },
  };
  const b = badges[type];
  if (!b) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
      textTransform: 'uppercase', padding: '2px 7px',
      borderRadius: 20, marginBottom: 8,
      background: `${b.color}18`, color: b.color,
      border: `1px solid ${b.color}30`,
    }}>
      {b.icon}{b.label}
    </span>
  );
};

// ─── Asosiy ChatMessage komponenti ──────────────────────────────────────────
const ChatMessage = React.memo(({ msg, previousMsg, onSave, onRegenerate, onAutoFix, isKids }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const messageRef = useRef(null);

  const isAI = msg.role === 'ai';
  const content = msg.content || '';

  // Extract phases like [PHASE: ARCHITECTURE]
  const phases = useMemo(() => {
    if (!isAI) return [];
    const matches = content.match(/\[PHASE: (.*?)\]/g);
    return matches ? matches.map(m => m.replace('[PHASE: ', '').replace(']', '')) : [];
  }, [content, isAI]);

  // Clean content from tags
  const { cleanContent, exportData } = useMemo(() => {
    // Regex ni yanada moslashuvchan qilamiz (probellar va qator ko'chishlariga chidamli)
    const exportRegex = /\[EXPORT_FILE:\s*(PDF|DOCX|PPTX)\s*\|\s*([\s\S]*?)\s*\|\s*([\s\S]*?)\]/i;
    const exportMatch = content.match(exportRegex);

    let cleaned = content.replace(/\[PHASE: (.*?)\]/g, '');
    let exportInfo = null;

    if (exportMatch) {
      cleaned = cleaned.replace(exportRegex, '').trim();
      exportInfo = {
        type: exportMatch[1].toUpperCase(),
        title: exportMatch[2].trim(),
        content: exportMatch[3].trim()
      };
    }

    return { cleanContent: cleaned, exportData: exportInfo };
  }, [content]);

  // Harfma-harf yozilish effekti va silliq scroll
  const [displayedText, setDisplayedText] = useState(isAI && msg.isNew ? '' : cleanContent);

  // Foydalanuvchi aynan matematika yoki formula so'raganini aniqlash
  const isMathRequested = useMemo(() => {
    if (!previousMsg || previousMsg.role !== 'user') return false;
    const prompt = (previousMsg.content || '').toLowerCase();
    const keywords = ['format', 'formula', 'matematika', 'yech', 'copy', 'nusxa', 'word', 'tushir', 'yozib ber', 'limit', 'integral', 'tenglama', 'misol'];
    return keywords.some(kw => prompt.includes(kw));
  }, [previousMsg]);

  // Matematik formula borligini tekshirish
  const hasMath = useMemo(() => {
    return /\$.*?\$|\$\$.*?\$\$/s.test(cleanContent);
  }, [cleanContent]);

  const copyFormulaToWord = () => {
    try {
      // Barcha formulalarni yig'ish
      const mathMatches = cleanContent.match(/\$\$(.*?)\$\$|\$(.*?)\$/gs) || [];
      if (mathMatches.length === 0) {
        toast.error("Formula topilmadi");
        return;
      }

      let fullMathML = "";
      mathMatches.forEach(m => {
        const latex = m.replace(/\$/g, '').trim();
        try {
          const mathml = katex.renderToString(latex, {
            displayMode: true,
            output: 'mathml'
          });
          fullMathML += `<div>${mathml}</div><br/>`;
        } catch (e) {
          console.error("KaTeX error:", e);
        }
      });

      if (!fullMathML) return;

      // Wordga tushishi uchun HTML formatida clipboardga yozish
      const blob = new Blob([fullMathML], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob })];

      navigator.clipboard.write(data).then(() => {
        toast.success("Formulalar Word uchun nusxalandi! Wordga o'tib Ctrl+V bosing.");
      });
    } catch (err) {
      console.error("Copy error:", err);
      toast.error("Nusxa olishda xatolik");
    }
  };

  React.useEffect(() => {
    if (isAI && msg.isNew) {
      if (displayedText.length < cleanContent.length) {
        const diff = cleanContent.length - displayedText.length;
        // Agar juda orqada qolib ketsak tezroq qo'shamiz
        const charsToAdd = diff > 50 ? 5 : diff > 15 ? 2 : 1;

        const timeout = setTimeout(() => {
          setDisplayedText(prev => cleanContent.slice(0, prev.length + charsToAdd));

          // Yozilayotganda avtomatik pastga tushish (scroll)
          const scrollContainer = document.querySelector('.chat-messages') || document.querySelector('.kids-messages') || document.querySelector('.tutor-main');
          if (scrollContainer) {
            const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 200;
            if (isNearBottom) {
              // Tez-tez smooth chaqirish xato ishlashiga olib kelishi mumkin, shuning uchun to'g'ridan to'g'ri beramiz yoki ozroq smooth
              scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
          }
        }, 15); // Harf yozilish tezligi

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
          <div className="math-block-container" style={{ position: 'relative', margin: '15px 0' }}>
            <div dangerouslySetInnerHTML={{ __html: katex.renderToString(codeStr, { displayMode: true, throwOnError: false }) }} />
            {isMathRequested && (
              <button
                onClick={() => {
                  const mathml = katex.renderToString(codeStr, { displayMode: true, output: 'mathml' });
                  const blob = new Blob([`<div>${mathml}</div>`], { type: 'text/html' });
                  const data = [new ClipboardItem({ 'text/html': blob })];
                  navigator.clipboard.write(data).then(() => toast.success("Formula Word uchun nusxalandi!"));
                }}
                style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(139, 92, 246, 0.2)', border: 'none', color: '#a78bfa', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
              >
                Copy for Word
              </button>
            )}
          </div>
        );
      }

      // FAQAT bot 'Coding Mode'da bo'lsa (Phase teglar bor bo'lsa) VibeEditor ochiladi
      if (!inline && isLongCode && phases.length > 0) {
        return (
          <VibeEditor
            code={codeStr}
            language={lang}
            isNew={msg.isNew}
            onAgentError={(err) => onAutoFix?.(codeStr, err, lang)}
          />
        );
      }

      // Oddiy rejimda yoki qisqa kodlar uchun - static blok
      if (!inline) {
        return (
          <div className="static-code-block">
            <div className="static-code-header">
              <span>{lang.toUpperCase()}</span>
            </div>
            <pre><code>{codeStr}</code></pre>
            <style>{`
              .static-code-block {
                background: #0f172a;
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 8px;
                margin: 10px 0;
                overflow: hidden;
              }
              .static-code-header {
                background: rgba(255,255,255,0.03);
                padding: 4px 12px;
                font-size: 10px;
                font-weight: 800;
                color: #64748b;
                border-bottom: 1px solid rgba(255,255,255,0.03);
              }
              .static-code-block pre { padding: 12px; margin: 0; overflow-x: auto; }
              .static-code-block code { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #93c5fd; }
            `}</style>
          </div>
        );
      }

      return (
        <code style={{
          background: 'rgba(59,130,246,0.15)',
          color: '#93c5fd',
          padding: '1px 6px',
          borderRadius: 4,
          fontSize: '0.875em',
          fontFamily: 'monospace'
        }}>
          {children}
        </code>
      );
    },
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '16px 0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', background: 'rgba(15, 23, 42, 0.4)' }}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)' }}>{children}</thead>,
    th: ({ children }) => <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#e0e7ff', fontWeight: 700, letterSpacing: '0.02em' }}>{children}</th>,
    td: ({ children }) => <td style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }}>{children}</td>,
    tr: ({ children }) => <tr style={{ transition: 'background 0.2s', '&:hover': { background: 'rgba(255,255,255,0.02)' } }}>{children}</tr>,
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: '4px solid #8b5cf6',
        background: 'rgba(139, 92, 246, 0.1)',
        margin: '16px 0',
        padding: '12px 16px',
        borderRadius: '0 12px 12px 0',
        color: '#e2e8f0',
        boxShadow: 'inset 0 0 20px rgba(139, 92, 246, 0.05)'
      }}>
        {children}
      </blockquote>
    ),
    h1: ({ children }) => <h1 style={{ fontSize: isKids ? '1.8rem' : '1.6rem', fontWeight: 800, margin: '24px 0 12px', color: isKids ? '#f472b6' : '#fff', borderBottom: `2px solid ${isKids ? '#fbcfe8' : 'rgba(99,102,241,0.3)'}`, paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={20} color={isKids ? '#f472b6' : '#818cf8'} /> {children}</h1>,
    h2: ({ children }) => <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '20px 0 10px', color: isKids ? '#fbbf24' : '#f8fafc', borderLeft: `3px solid ${isKids ? '#fbbf24' : '#38bdf8'}`, paddingLeft: '10px' }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '16px 0 8px', color: isKids ? '#4ade80' : '#e2e8f0' }}>{children}</h3>,
    p: ({ children }) => <div style={{ margin: '8px 0', lineHeight: 1.7, color: isKids ? '#334155' : '#f1f5f9', fontSize: isKids ? '1.1rem' : '0.95rem' }}>{children}</div>,
    ul: ({ children }) => <ul style={{ paddingLeft: 24, margin: '12px 0', color: isKids ? '#475569' : '#f1f5f9', listStyleType: isKids ? '"⭐ "' : 'disc' }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ paddingLeft: 24, margin: '12px 0', color: isKids ? '#475569' : '#f1f5f9' }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: '8px', lineHeight: 1.6, paddingLeft: '4px' }}>{children}</li>,
    strong: ({ children }) => <strong style={{ color: isKids ? '#ec4899' : '#fbbf24', fontWeight: 800, background: isKids ? '#fdf2f8' : 'transparent', padding: isKids ? '0 4px' : '0', borderRadius: '4px' }}>{children}</strong>,
    em: ({ children }) => <em style={{ color: isKids ? '#8b5cf6' : '#38bdf8', fontStyle: 'italic', textDecoration: isKids ? 'underline wavy #c4b5fd' : 'none' }}>{children}</em>,
    a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 600 }}>{children}</a>,
  }), [msg.isNew, onAutoFix, phases, isKids, isMathRequested]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    if (!exportData) return;
    const { type, title, content } = exportData;
    const fileName = title.endsWith(`.${type.toLowerCase()}`) ? title : `${title}.${type.toLowerCase()}`;

    try {
      if (type === 'PDF') {
        const element = messageRef.current;
        const opt = {
          margin: 10,
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: isKids ? '#ffffff' : '#0f172a' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
      } else if (type === 'DOCX') {
        const doc = new Document({
          sections: [{
            children: content.split('\n').map(line => new Paragraph({
              children: [new TextRun(line)]
            }))
          }]
        });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
      } else if (type === 'PPTX') {
        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();
        slide.addText(content, { x: 0.5, y: 0.5, w: '90%', h: '80%', fontSize: 18, color: '363636' });
        await pptx.writeFile({ fileName });
      }
      toast.success('Fayl yuklab olindi!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Faylni tayyorlashda xatolik yuz berdi');
    }
  };

  const handleManualExport = async (type) => {
    const fileName = `LingoAI_Eksport_${Date.now()}`;
    const loadingId = toast.loading(`${type} tayyorlanmoqda...`);

    try {
      if (type === 'PDF') {
        const element = messageRef.current;
        const opt = {
          margin: 10,
          filename: `${fileName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: isKids ? '#ffffff' : '#0f172a' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
      } else if (type === 'DOCX') {
        const doc = new Document({
          sections: [{
            children: cleanContent.split('\n').filter(line => line.trim()).map(line => new Paragraph({
              children: [new TextRun({ text: line, color: "000000" })]
            }))
          }]
        });
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.docx`;
        a.click();
      } else if (type === 'PPTX') {
        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();
        slide.addText(cleanContent.substring(0, 1000), { x: 0.5, y: 0.5, w: '90%', h: '80%', fontSize: 14, color: '363636' });
        await pptx.writeFile({ fileName: `${fileName}.pptx` });
      } else if (type === 'XLSX') {
        const rows = cleanContent.split('\n').filter(l => l.trim()).map(line => [line]);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      }
      toast.success('Tayyor!', { id: loadingId });
    } catch (err) {
      console.error(err);
      toast.error('Xatolik!', { id: loadingId });
    }
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(cleanContent.replace(/[#*`]/g, ''));
      utt.lang = 'uz-UZ';
      speechSynthesis.speak(utt);
    }
  };

  return (
    <div className={`chat-bubble-wrapper ${msg.role} fade-in`} style={{ position: 'relative' }}>
      <div
        ref={messageRef}
        className={`chat-bubble ${msg.role} ${isAI ? 'ai-glow' : ''}`}
        style={{
          position: 'relative',
          padding: isAI ? '20px' : undefined,
          boxShadow: isAI && !isKids ? '0 10px 30px -10px rgba(99, 102, 241, 0.2)' : undefined,
          border: isAI && isKids ? '3px solid #bfdbfe' : undefined,
          background: isAI && isKids ? '#ffffff' : undefined,
          color: isKids ? '#334155' : undefined,
        }}
      >
        {exportData && (
          <div style={{
            marginTop: 15,
            padding: 16,
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: 16,
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            animation: 'slideUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                {exportData.type === 'PDF' ? <BookOpen size={20} /> : <Zap size={20} />}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{exportData.title}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{exportData.type} formatida tayyor</div>
              </div>
            </div>
            <button
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Yuklab olish
            </button>
          </div>
        )}

        <div style={{ overflow: content.length > 800 && !expanded ? 'hidden' : 'visible', maxHeight: content.length > 800 && !expanded ? 200 : 'none', transition: 'max-height 0.3s ease' }}>
          {msg.attachment && (
            <div style={{ marginBottom: 15, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
              {msg.attachmentType?.startsWith('image/') ? (
                <img src={msg.attachment} alt="Ilova" style={{ maxWidth: '100%', display: 'block', maxHeight: 400, objectFit: 'contain' }} />
              ) : msg.attachmentType?.startsWith('audio/') ? (
                <div style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#e2e8f0' }}>
                    <Mic size={18} color="#10b981" />
                    <span>Audio xabar</span>
                  </div>
                  <audio src={msg.attachment} controls style={{ width: '100%', height: 40 }} />
                </div>
              ) : msg.attachmentType?.startsWith('video/') ? (
                <div style={{ position: 'relative' }}>
                  <video src={msg.attachment} controls style={{ width: '100%', display: 'block', maxHeight: 400 }} />
                </div>
              ) : (
                <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: 13 }}>
                  <Paperclip size={16} />
                  <span>Fayl yuklandi</span>
                </div>
              )}
            </div>
          )}
          {isAI && displayedText === '' && msg.isNew ? (
            <div style={{ display: 'flex', gap: 6, padding: '10px 5px', alignItems: 'center', height: 24 }}>
              <span className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', opacity: 0.7 }} />
              <span className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', opacity: 0.7, animationDelay: '0.2s' }} />
              <span className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', opacity: 0.7, animationDelay: '0.4s' }} />
            </div>
          ) : isAI ? (
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={mdComponents}>{displayedText}</ReactMarkdown>
          ) : (
            <p style={{ margin: 0, lineHeight: 1.6 }}>{content}</p>
          )}
        </div>

        {isAI && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
            <ActionBtn onClick={handleCopy} active={copied} title="Nusxa olish">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Nusxa olindi' : 'Nusxa'}
            </ActionBtn>
            <ActionBtn onClick={() => onSave?.(cleanContent)} title="Daftarga saqlash" color="#f59e0b">
              <Star size={13} /> Saqlash
            </ActionBtn>
            <ActionBtn onClick={handleSpeak} title="Ovoz bilan o'qish">
              <Volume2 size={13} /> Ovoz
            </ActionBtn>

            {isMathRequested && hasMath && (
              <ActionBtn onClick={copyFormulaToWord} title="Wordga formula sifatida nusxalash" color="#8b5cf6">
                <Sigma size={13} /> Word Formula
              </ActionBtn>
            )}

            <div className="export-selection" style={{
              display: 'flex',
              gap: 4,
              alignItems: 'center',
              background: 'rgba(99, 102, 241, 0.1)',
              padding: '4px 10px',
              borderRadius: 30,
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <span style={{ fontSize: 9, color: '#818cf8', fontWeight: 800, marginRight: 4, textTransform: 'uppercase' }}>Export AI:</span>
              <ExportIconBtn onClick={() => handleManualExport('PDF')} icon={<FileText size={12} />} color="#ef4444" label="PDF" />
              <ExportIconBtn onClick={() => handleManualExport('DOCX')} icon={<FileJson size={12} />} color="#3b82f6" label="Word" />
              <ExportIconBtn onClick={() => handleManualExport('PPTX')} icon={<Presentation size={12} />} color="#f59e0b" label="Slayd" />
              <ExportIconBtn onClick={() => handleManualExport('XLSX')} icon={<Table size={12} />} color="#10b981" label="Excel" />
            </div>

            {onRegenerate && (
              <ActionBtn onClick={() => onRegenerate(msg.id)} title="Qayta yaratish">
                <RotateCcw size={13} /> Qayta
              </ActionBtn>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const ActionBtn = ({ onClick, children, title, active, color }) => (
  <button onClick={onClick} title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: active ? `${color || '#3b82f6'}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? `${color || '#3b82f6'}40` : 'rgba(255,255,255,0.08)'}`, color: active ? (color || '#3b82f6') : '#64748b', transition: 'all 0.15s' }}>
    {children}
  </button>
);

const ExportIconBtn = ({ onClick, icon, color, label }) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      background: 'none',
      border: 'none',
      color: color,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      padding: '2px 6px',
      borderRadius: 4,
      transition: 'background 0.2s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = `${color}15`}
    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
  >
    {icon} <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
  </button>
);

export default ChatMessage;