import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Terminal, FileCode, Loader2 } from 'lucide-react';

const VibeEditor = ({ code, language, isNew, onAgentError }) => {
  const [displayedCode, setDisplayedCode] = useState(isNew ? '' : code);
  const [isTyping, setIsTyping] = useState(isNew);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(isNew ? 'coding' : 'ready');
  const iframeRef = useRef(null);
  
  useEffect(() => {
    if (isNew) {
      setStatus('coding');
      if (displayedCode.length < code.length) {
        const timeout = setTimeout(() => {
          setDisplayedCode(code.slice(0, displayedCode.length + 8));
        }, 5);
        return () => clearTimeout(timeout);
      } else {
        setIsTyping(false);
        setStatus('testing');
        const timer = setTimeout(() => setStatus('ready'), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [displayedCode, code, isNew]);

  useEffect(() => {
    const handleIframeError = (e) => {
      if (status === 'testing') {
        setStatus('fixing');
        onAgentError?.(e.detail);
      }
    };
    window.addEventListener('vibe-iframe-error', handleIframeError);
    return () => window.removeEventListener('vibe-iframe-error', handleIframeError);
  }, [status, onAgentError]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`vibe-editor-minimal ${status}`}>
      {/* Elegant Thin Progress Line */}
      <div className="vibe-progress-line">
        <div className={`vibe-progress-fill ${status}`} />
      </div>

      <div className="vibe-toolbar-minimal">
        <div className="vibe-file-info">
          <FileCode size={12} />
          <span>index.{language === 'javascript' ? 'js' : language}</span>
          <span className={`vibe-status-tag ${status}`}>
            {status === 'coding' && 'Coding...'}
            {status === 'testing' && 'Auditing...'}
            {status === 'fixing' && 'Repairing...'}
            {status === 'ready' && 'Ready'}
          </span>
        </div>
        <div className="vibe-actions-minimal">
          <button onClick={handleCopy} className="vibe-icon-btn">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>
      
      <div className="vibe-editor-content">
        <div className="vibe-line-nums">
          {code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <pre className="vibe-code-pre">
          <code>{displayedCode}</code>
          {isTyping && <span className="vibe-cursor-minimal">|</span>}
        </pre>
      </div>

      <div className="vibe-preview-minimal">
        <div className="vibe-preview-header">
          <Terminal size={10} /> <span>PREVIEW</span>
          {status === 'testing' && <Loader2 size={10} className="spin" style={{ marginLeft: 'auto' }} />}
        </div>
        <iframe 
          ref={iframeRef}
          srcDoc={`
            <html>
              <body style="background:#0f172a;color:white;font-family:sans-serif;margin:0;padding:10px;">
                <div id="root">${language === 'html' ? displayedCode : ''}</div>
                <script>
                  window.onerror = function(msg) {
                    window.parent.dispatchEvent(new CustomEvent('vibe-iframe-error', { detail: msg }));
                    return true;
                  };
                  ${language === 'javascript' ? displayedCode : ''}
                </script>
              </body>
            </html>
          `} 
          title="preview"
        />
      </div>

      <style>{`
        .vibe-editor-minimal {
          background: #020617;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          margin: 15px 0;
          overflow: hidden;
          transition: all 0.3s;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .vibe-editor-minimal.ready { border-color: rgba(16, 185, 129, 0.3); }

        .vibe-progress-line { height: 2px; background: rgba(255,255,255,0.03); width: 100%; }
        .vibe-progress-fill { 
          height: 100%; 
          background: #3b82f6; 
          width: 0; 
          transition: width 1s ease, background 0.3s; 
        }
        .vibe-progress-fill.coding { width: 40%; }
        .vibe-progress-fill.testing { width: 70%; background: #f59e0b; }
        .vibe-progress-fill.fixing { width: 85%; background: #ef4444; }
        .vibe-progress-fill.ready { width: 100%; background: #10b981; }

        .vibe-toolbar-minimal {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px; background: rgba(255,255,255,0.02);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .vibe-file-info { display: flex; align-items: center; gap: 8px; color: #94a3b8; font-size: 11px; font-weight: 500; }
        .vibe-status-tag {
          font-size: 9px; padding: 1px 6px; border-radius: 4px;
          text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;
        }
        .vibe-status-tag.coding { background: rgba(59,130,246,0.1); color: #3b82f6; }
        .vibe-status-tag.testing { background: rgba(245,158,11,0.1); color: #f59e0b; }
        .vibe-status-tag.fixing { background: rgba(239,68,68,0.1); color: #ef4444; }
        .vibe-status-tag.ready { background: rgba(16,185,129,0.1); color: #10b981; }

        .vibe-editor-content { display: flex; font-family: 'JetBrains Mono', monospace; font-size: 13px; min-height: 80px; }
        .vibe-line-nums { padding: 10px; text-align: right; color: #334155; border-right: 1px solid rgba(255,255,255,0.03); user-select: none; }
        .vibe-code-pre { margin: 0; padding: 10px; flex: 1; color: #cbd5e1; white-space: pre-wrap; line-height: 1.5; }
        
        .vibe-cursor-minimal { color: #3b82f6; animation: blink 1s infinite; margin-left: 2px; }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }

        .vibe-preview-minimal { border-top: 1px solid rgba(255,255,255,0.05); }
        .vibe-preview-header {
          padding: 4px 12px; background: rgba(0,0,0,0.2); color: #64748b;
          font-size: 9px; font-weight: 800; display: flex; align-items: center; gap: 6px;
        }
        iframe { width: 100%; height: 200px; border: none; background: #fff; }
      `}</style>
    </div>
  );
};

export default VibeEditor;