import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const TypewriterText = ({ text, components }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef(null);
  
  // Matn o'zgarganda hamma narsani tozalash
  useEffect(() => {
    if (!text) return;

    // Reset state
    setDisplayedText('');
    setIsDone(false);
    
    if (timerRef.current) clearInterval(timerRef.current);

    let index = 0;
    const speed = text.length > 500 ? 5 : 12; // Uzun matnlarni tezroq yozish

    timerRef.current = setInterval(() => {
      index++;
      if (index >= text.length) {
        clearInterval(timerRef.current);
        setDisplayedText(text);
        setIsDone(true);
      } else {
        setDisplayedText(text.slice(0, index));
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);

  // Render qilinadigan matnni tanlash
  // Yozish tugallanguncha oddiy matn, tugagach Markdown
  return (
    <div className="typewriter-container">
      {!isDone ? (
        <div style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
          {displayedText}
          <span className="typewriter-cursor">|</span>
        </div>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={components}
        >
          {text}
        </ReactMarkdown>
      )}
      
      <style jsx>{`
        .typewriter-cursor {
          display: inline-block;
          width: 2px;
          background: #3b82f6;
          margin-left: 2px;
          animation: blink 0.7s infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(TypewriterText);