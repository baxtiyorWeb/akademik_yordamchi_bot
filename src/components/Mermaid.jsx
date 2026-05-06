import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Terminal } from 'lucide-react';

// Mermaid'ni maksimal darajada xavfsiz va "jim" (silent) qilib sozlaymiz
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  // Xatolarni interfeysga chiqarishni butunlay taqiqlaymiz
  suppressError: true,
  logLevel: 'error',
  errorControls: false,
});

const Mermaid = ({ chart }) => {
  const ref = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ref.current && chart) {
      setError(null);
      const cleanChart = chart.trim()
        .replace(/^```mermaid\n?/, '')
        .replace(/\n?```$/, '')
        .trim();

      // Har bir render uchun noyob ID, dmermaid prefixini ishlatmaymiz (CSS bloklashi uchun)
      const id = 'vibe-diag-' + Math.random().toString(36).substr(2, 9);
      
      try {
        // Avvalgi tarkibni tozalash
        if (ref.current) ref.current.innerHTML = '';
        
        // Render funksiyasini ehtiyotkorlik bilan chaqiramiz
        mermaid.render(id, cleanChart).then((result) => {
          if (ref.current) {
            ref.current.innerHTML = result.svg;
            const svg = ref.current.querySelector('svg');
            if (svg) {
              svg.style.maxWidth = '100%';
              svg.style.height = 'auto';
            }
          }
        }).catch((err) => {
          // Xatolikni faqat lokal Console'da ko'rsatamiz
          console.warn('Mermaid render issue caught.');
          setError('Diagramma sintaksisida xatolik bor (Console tahlil qilinmoqda)');
        });
      } catch (err) {
        setError('Diagrammani chizishda ichki xatolik.');
      }
    }
  }, [chart]);

  // Agar xatolik bo'lsa, uni chat ichida Console ko'rinishida chiqarish
  if (error) {
    return (
      <div className="diag-console">
        <div className="diag-console-header">
          <Terminal size={10} /> <span>DIAGRAM ENGINE CONSOLE</span>
        </div>
        <div className="diag-console-body">
          <code>{`> Error detected in Mermaid syntax.`}</code>
          <code>{`> Check the source code for invalid tokens.`}</code>
        </div>
        <style jsx>{`
          .diag-console {
            margin: 10px 0;
            background: #020617;
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 6px;
            font-family: 'JetBrains Mono', monospace;
            overflow: hidden;
          }
          .diag-console-header {
            background: rgba(239, 68, 68, 0.05);
            padding: 4px 10px;
            color: #ef4444;
            font-size: 9px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .diag-console-body { padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; }
          .diag-console-body code { color: #fca5a5; font-size: 10px; opacity: 0.8; }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="vibe-mermaid-box"
      onClick={() => setIsFullscreen(true)}
      style={{
        background: 'rgba(15, 23, 42, 0.3)',
        padding: '16px',
        borderRadius: '10px',
        margin: '12px 0',
        cursor: 'zoom-in',
        border: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <div ref={ref} />
      {isFullscreen && (
        <div 
          onClick={() => setIsFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(2, 6, 23, 0.98)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: ref.current?.innerHTML || '' }} />
        </div>
      )}
    </div>
  );
};

export default React.memo(Mermaid);
