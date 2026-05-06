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
    const speed = 100; // Tezlangan, lekin silliq harflab yozish

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
  return (
    <div className="typewriter-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {displayedText + (!isDone ? ' ●' : '')}
      </ReactMarkdown>

      <style jsx>{`
        .typewriter-container :global(p) { display: inline; }
        .typewriter-container :global(p:last-child) { display: inline; }
      `}</style>
    </div>
  );
};


export default React.memo(TypewriterText);