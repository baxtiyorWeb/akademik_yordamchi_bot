import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Brain, Star, Copy, Check, Volume2, ThumbsUp, ThumbsDown, RotateCcw, ChevronDown, ChevronUp, Code, BookOpen, Calculator, Languages } from 'lucide-react';
import TypewriterText from './TypewriterText';

// ─── Promptga qarab xabar turini aniqlash ───────────────────────────────────
const detectMessageType = (content = '') => {
  const c = content.toLowerCase();
  if (/```[\s\S]*```/.test(content)) return 'code';
  if (/\$.*\$|\\\[|\\\(/.test(content)) return 'math';
  if (/\|.*\|.*\|/.test(content)) return 'table';
  if (c.includes('tarjima') || c.includes('translate') || c.includes('перевод')) return 'translation';
  if (c.includes('test') || c.includes('savol') || c.includes('quiz') || /\d+\)/.test(content)) return 'quiz';
  if (content.split('\n').length > 15) return 'long';
  return 'default';
};

// ─── Xabar turi badge ────────────────────────────────────────────────────────
const TypeBadge = ({ type }) => {
  const badges = {
    code: { icon: <Code size={11} />, label: 'Kod', color: '#3b82f6' },
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

// ─── Kod bloki — nusxa olish tugmasi bilan ──────────────────────────────────
const CodeBlock = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace('language-', '') || 'code';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', margin: '12px 0', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 12px', background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lang}</span>
        <button onClick={handleCopy} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
          color: copied ? '#10b981' : '#94a3b8', fontSize: 11,
          transition: 'all 0.2s',
        }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Nusxa olindi' : 'Nusxa'}
        </button>
      </div>
      {/* Code */}
      <pre style={{
        margin: 0, padding: '14px 16px', overflowX: 'auto',
        background: 'rgba(0,0,0,0.35)', fontSize: '0.85rem',
        lineHeight: 1.65, fontFamily: '"Fira Code", "JetBrains Mono", monospace',
      }}>
        <code style={{ color: '#e2e8f0' }}>{code}</code>
      </pre>
    </div>
  );
};

// ─── Markdown komponentlari ──────────────────────────────────────────────────
const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    if (inline) return (
      <code style={{
        background: 'rgba(59,130,246,0.15)', color: '#93c5fd',
        padding: '1px 6px', borderRadius: 4, fontSize: '0.875em',
        fontFamily: '"Fira Code", monospace',
      }}>{children}</code>
    );
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  table({ children }) {
    return (
      <div style={{ overflowX: 'auto', margin: '12px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead style={{ background: 'rgba(59,130,246,0.1)' }}>{children}</thead>;
  },
  th({ children }) {
    return <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</th>;
  },
  td({ children }) {
    return <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }}>{children}</td>;
  },
  tr({ children }) {
    return <tr style={{ transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >{children}</tr>;
  },
  blockquote({ children }) {
    return (
      <blockquote style={{
        borderLeft: '3px solid #3b82f6', margin: '10px 0',
        paddingLeft: 14, color: '#94a3b8', fontStyle: 'italic',
      }}>{children}</blockquote>
    );
  },
  h1: ({ children }) => <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '16px 0 8px', color: '#f1f5f9', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '14px 0 6px', color: '#e2e8f0' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '12px 0 5px', color: '#cbd5e1' }}>{children}</h3>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</ol>,
  li: ({ children }) => <li style={{ color: '#cbd5e1', lineHeight: 1.6 }}>{children}</li>,
  p: ({ children }) => <p style={{ margin: '6px 0', lineHeight: 1.7, color: '#cbd5e1' }}>{children}</p>,
  strong: ({ children }) => <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>{children}</strong>,
  em: ({ children }) => <em style={{ color: '#a5b4fc' }}>{children}</em>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '14px 0' }} />,
};

// ─── Asosiy ChatMessage komponenti ──────────────────────────────────────────
const ChatMessage = React.memo(({ msg, onSave, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [reaction, setReaction] = useState(null); // 'up' | 'down'
  const isAI = msg.role === 'ai';
  const type = isAI ? detectMessageType(msg.content) : 'default';
  const isLong = msg.content?.length > 800;

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(msg.content.replace(/[#*`]/g, ''));
      utt.lang = 'uz-UZ';
      utt.rate = 0.95;
      speechSynthesis.speak(utt);
    }
  };

  return (
    <div
      className={`chat-bubble-wrapper ${msg.role} fade-in`}
      style={{ position: 'relative' }}
    >
      {/* AI avatar */}
      {isAI && (
        <div className="bubble-avatar ai-avatar"><Brain size={20} /></div>
      )}

      {/* Bubble */}
      <div
        className={`chat-bubble ${msg.role}`}
        style={{ position: 'relative', padding: isAI ? '14px 16px' : undefined }}
      >
        {/* Xabar turi badge */}
        {isAI && <TypeBadge type={type} />}

        {/* Mazmun */}
        <div style={{ overflow: isLong && !expanded ? 'hidden' : 'visible', maxHeight: isLong && !expanded ? 200 : 'none', transition: 'max-height 0.3s ease' }}>
          {isAI && msg.isNew ? (
            <TypewriterText text={msg.content} components={mdComponents} />
          ) : isAI ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={mdComponents}
            >
              {msg.content}
            </ReactMarkdown>
          ) : (
            <p style={{ margin: 0, lineHeight: 1.6 }}>{msg.content}</p>
          )}
        </div>

        {/* Uzun xabarni yoyish */}
        {isAI && isLong && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              marginTop: 8, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, padding: '4px 12px',
              color: '#94a3b8', fontSize: 12, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {expanded ? <><ChevronUp size={13} /> Qisqartirish</> : <><ChevronDown size={13} /> To'liq ko'rish</>}
          </button>
        )}

        {/* AI xabar asboblar paneli */}
        {isAI && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 10, paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
          }}>
            {/* Nusxa olish */}
            <ActionBtn onClick={handleCopy} active={copied} title="Nusxa olish">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Nusxa olindi' : 'Nusxa'}
            </ActionBtn>

            {/* Daftarga saqlash */}
            <ActionBtn onClick={() => onSave?.(msg.content)} title="Daftarga saqlash" color="#f59e0b">
              <Star size={13} /> Saqlash
            </ActionBtn>

            {/* Ovoz */}
            <ActionBtn onClick={handleSpeak} title="Ovoz bilan o'qish">
              <Volume2 size={13} /> Ovoz
            </ActionBtn>

            {/* Qayta yaratish */}
            {onRegenerate && (
              <ActionBtn onClick={() => onRegenerate(msg.id)} title="Qayta yaratish">
                <RotateCcw size={13} /> Qayta
              </ActionBtn>
            )}

            {/* Reaksiya */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <ReactionBtn active={reaction === 'up'} onClick={() => setReaction(r => r === 'up' ? null : 'up')} color="#10b981">
                <ThumbsUp size={12} />
              </ReactionBtn>
              <ReactionBtn active={reaction === 'down'} onClick={() => setReaction(r => r === 'down' ? null : 'down')} color="#ef4444">
                <ThumbsDown size={12} />
              </ReactionBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Yordamchi tugma komponentlari ──────────────────────────────────────────
const ActionBtn = ({ onClick, children, title, active, color }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
      background: active ? `${color || '#3b82f6'}20` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? `${color || '#3b82f6'}40` : 'rgba(255,255,255,0.08)'}`,
      color: active ? (color || '#3b82f6') : '#64748b',
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = `${color || '#3b82f6'}15`;
      e.currentTarget.style.color = color || '#94a3b8';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = active ? `${color || '#3b82f6'}20` : 'rgba(255,255,255,0.04)';
      e.currentTarget.style.color = active ? (color || '#3b82f6') : '#64748b';
    }}
  >
    {children}
  </button>
);

const ReactionBtn = ({ onClick, active, color, children }) => (
  <button
    onClick={onClick}
    style={{
      width: 26, height: 26, borderRadius: 8, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? `${color}20` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
      color: active ? color : '#64748b',
      transition: 'all 0.15s',
    }}
  >
    {children}
  </button>
);

export default ChatMessage;