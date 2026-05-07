import React, { useState, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Brain, Star, Copy, Check, Volume2, RotateCcw, ChevronDown, ChevronUp, Code, BookOpen, Calculator, Languages } from 'lucide-react';
import TypewriterText from './TypewriterText';
import Mermaid from './Mermaid';
import VibeEditor from './VibeEditor';

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
const ChatMessage = React.memo(({ msg, onSave, onRegenerate, onAutoFix }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  const isAI = msg.role === 'ai';
  const content = msg.content || '';

  // Extract phases like [PHASE: ARCHITECTURE]
  const phases = useMemo(() => {
    if (!isAI) return [];
    const matches = content.match(/\[PHASE: (.*?)\]/g);
    return matches ? matches.map(m => m.replace('[PHASE: ', '').replace(']', '')) : [];
  }, [content, isAI]);

  // Clean content from [PHASE: ...] tags completely (Silent Agent)
  const cleanContent = useMemo(() => {
    return content.replace(/\[PHASE: (.*?)\]/g, '').trim();
  }, [content]);

  const mdComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }) {
      const lang = className?.replace('language-', '') || 'code';
      const codeStr = String(children).replace(/\n$/, '');
      const isLongCode = codeStr.split('\n').length > 2;

      if (lang === 'mermaid') return <Mermaid chart={codeStr} />;
      
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
    table: ({ children }) => <div style={{ overflowX: 'auto', margin: '12px 0' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>{children}</table></div>,
    thead: ({ children }) => <thead style={{ background: 'rgba(59,130,246,0.1)' }}>{children}</thead>,
    th: ({ children }) => <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', fontWeight: 600 }}>{children}</th>,
    td: ({ children }) => <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }}>{children}</td>,
    tr: ({ children }) => <tr style={{ transition: 'background 0.15s' }}>{children}</tr>,
    blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #3b82f6', margin: '10px 0', paddingLeft: 14, color: '#94a3b8', fontStyle: 'italic' }}>{children}</blockquote>,
    h1: ({ children }) => <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '16px 0 8px', color: '#f1f5f9' }}>{children}</h1>,
    p: ({ children }) => <div style={{ margin: '6px 0', lineHeight: 1.7, color: '#cbd5e1' }}>{children}</div>,
    ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '10px 0' }}>{children}</ul>,
    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  }), [msg.isNew, onAutoFix, phases]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {isAI && <div className="bubble-avatar ai-avatar"><Brain size={20} /></div>}
      <div className={`chat-bubble ${msg.role}`} style={{ position: 'relative', padding: isAI ? '14px 16px' : undefined }}>
        <div style={{ overflow: content.length > 800 && !expanded ? 'hidden' : 'visible', maxHeight: content.length > 800 && !expanded ? 200 : 'none', transition: 'max-height 0.3s ease' }}>
          {msg.attachment && (
            <div style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={msg.attachment} alt="Ilova" style={{ maxWidth: '100%', display: 'block', maxHeight: 300, objectFit: 'contain' }} />
            </div>
          )}
          {isAI && msg.isNew && phases.length === 0 ? (
            <TypewriterText text={cleanContent} components={mdComponents} />
          ) : isAI ? (
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={mdComponents}>{cleanContent}</ReactMarkdown>
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

export default ChatMessage;