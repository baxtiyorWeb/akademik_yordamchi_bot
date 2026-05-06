import React, { useState, useEffect } from 'react';

const VibeSandbox = ({ code, language }) => {
  const [srcDoc, setSrcDoc] = useState('');

  useEffect(() => {
    if (language === 'html' || language === 'xml') {
      setSrcDoc(code);
    } else if (language === 'javascript' || language === 'jsx') {
      // Soddalashtirilgan React/JS render (Babel-siz, shuning uchun asosan Vanilla JS uchun)
      setSrcDoc(`
        <html>
          <body style="background: #0f172a; color: white; font-family: sans-serif; padding: 20px;">
            <div id="root"></div>
            <script type="module">
              try {
                ${code}
              } catch (err) {
                document.getElementById('root').innerHTML = '<pre style="color: #ef4444">' + err + '</pre>';
              }
            </script>
          </body>
        </html>
      `);
    } else if (language === 'css') {
      setSrcDoc(`
        <html>
          <style>${code}</style>
          <body style="background: #0f172a; color: white; padding: 20px;">
            <h1>CSS Preview</h1>
            <div class="preview-element">Dasturlash - bu vibe!</div>
            <style>
              .preview-element { padding: 20px; border: 2px dashed #6366f1; border-radius: 8px; text-align: center; }
            </style>
          </body>
        </html>
      `);
    }
  }, [code, language]);

  return (
    <div className="vibe-sandbox-wrapper">
      <div className="sandbox-header">
        <div className="dot red"></div>
        <div className="dot yellow"></div>
        <div className="dot green"></div>
        <span>Live Vibe Preview</span>
      </div>
      <iframe
        srcDoc={srcDoc}
        title="Vibe Sandbox"
        sandbox="allow-scripts"
        frameBorder="0"
        width="100%"
        height="300px"
      />
      <style jsx>{`
        .vibe-sandbox-wrapper {
          margin: 15px 0;
          border-radius: 12px;
          overflow: hidden;
          background: #1e293b;
          border: 1px solid rgba(99, 102, 241, 0.3);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .sandbox-header {
          background: #0f172a;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #94a3b8;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .red { background: #ef4444; }
        .yellow { background: #f59e0b; }
        .green { background: #10b981; }
        .sandbox-header span { margin-left: 10px; font-weight: 600; }
        iframe { background: #fff; }
      `}</style>
    </div>
  );
};

export default VibeSandbox;
