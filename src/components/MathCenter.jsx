import React, { useState, useRef, useEffect } from 'react';
import { Sigma, Upload, Copy, Check, Trash2, FileText, Sparkles, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';
import { streamGeminiResponse } from '../api/gemini';
import './MathCenter.css';

const MathCenter = () => {
  const navigate = useNavigate();
  const [latex, setLatex] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('math_history');
    return saved ? JSON.parse(saved) : [];
  });
  const fileInputRef = useRef(null);

  // Clipboard paste support (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) handleImageUpload({ target: { files: [file] } });
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [history]);

  const saveToHistory = (newLatex) => {
    if (!newLatex.trim()) return;
    const newHistory = [{ id: Date.now(), latex: newLatex }, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('math_history', JSON.stringify(newHistory));
  };

  const extractLatex = (text) => {
    // FAQAT kod bloki ichidagi narsani olamiz
    const codeMatch = text.match(/```(?:latex|math|tex)?\s*([\s\S]*?)(?:```|$)/i);
    if (codeMatch && codeMatch[1].trim()) {
      return codeMatch[1].trim();
    }

    // Agar kod bloki hali boshlanmagan bo'lsa, hech narsani ko'rsatmaymiz (streaming paytida)
    // yoki juda qisqa bo'lsa va kod bloki bo'lmasa, shubhali matnlarni filtrlaymiz
    if (!text.includes('```')) {
      return ""; // Kod bloki boshlanmaguncha kutamiz
    }

    return "";
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setLatex(''); // Yangi rasm yuklanganda tozalash
    const loadingId = toast.loading("Rasm tahlil qilinmoqda...");

    try {
      const prompt = "TASK: Extract math from image. OUTPUT: ONLY ```latex <formula> ```. RULES: NO text. NO chat. NO explanation. Just the formula block.";

      const result = await streamGeminiResponse(prompt, [], file, 'TUTOR', (text) => {
        const clean = extractLatex(text);
        if (clean) setLatex(clean);
      });

      const clean = extractLatex(result);
      if (clean) {
        setLatex(clean);
        saveToHistory(clean);
        toast.success("Formula tayyor!", { id: loadingId });
      } else {
        toast.error("Formula topilmadi", { id: loadingId });
      }
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingId });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyForWord = async (targetLatex = latex) => {
    if (!targetLatex.trim()) return;

    try {
      const mathmlFull = katex.renderToString(targetLatex, {
        displayMode: true,
        output: 'mathml',
        throwOnError: false
      });

      const mathMatch = mathmlFull.match(/<math[^>]*>[\s\S]*?<\/math>/i);
      if (!mathMatch) {
        toast.error("Formulani o'zlashtirib bo'lmadi");
        return;
      }

      let mathml = mathMatch[0];

      // Word chalkashmasligi uchun qoldiq teglarni tozalaymiz
      mathml = mathml.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/gi, '');
      mathml = mathml.replace(/<\/?semantics[^>]*>/gi, '');

      // Word bu o'zgaruvchilar emas, balki "math" ekanini bilishi uchun
      if (!mathml.includes('xmlns=')) {
        mathml = mathml.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"');
      }

      // ASOSIY YECHIM: Biz clipboardga hech qanday HTML wrapper (Blob) bermaymiz.
      // Word brauzerning HTML formatini ko'rsa, buzib tashlayotgani aniq bo'ldi.
      // Biz faqat "Toza XML matn" beramiz.
      await navigator.clipboard.writeText(mathml);

      setCopied(true);
      toast.success("Nusxalandi! Endi Alt + = ni bosing."); // Xabarni o'zgartirdim
      setTimeout(() => setCopied(false), 3500);
    } catch (err) {
      console.error(err);
      toast.error("Nusxa olishda xatolik yuz berdi");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('math_history');
  };

  return (
    <div className="math-center-layout">
      <div className="math-center-container">
        {/* Header */}
        <header className="math-center-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Orqaga
          </button>
          <div className="header-title">
            <div className="title-icon"><Sigma size={22} /></div>
            <div>
              <h1>Matematika Markazi</h1>
              <p>Formulalarni Word formatiga bir zumda o'tkazing</p>
            </div>
          </div>
          <div className="header-badge">Premium Tool</div>
        </header>

        <div className="math-center-grid">
          {/* Left Column: Input & Editor */}
          <div className="math-input-column">
            <div className="card upload-card" onClick={() => fileInputRef.current.click()}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                hidden
              />
              <div className="upload-content">
                <div className="upload-icon-wrapper">
                  <ImageIcon size={22} />
                </div>
                <div>
                  <h3>Rasm yuklash</h3>
                  <p>Skrinshotni 'Paste' (Ctrl+V) qiling</p>
                </div>
              </div>
              {isProcessing && <div className="processing-overlay"><Sparkles className="spin" size={24} color="#818cf8" /></div>}
            </div>

            <div className="card editor-card">
              <div className="card-header">
                <div className="header-left">
                  <FileText size={16} />
                  <span>LaTeX Editor</span>
                </div>
                {latex && (
                  <button className="text-clear-btn" onClick={() => setLatex('')}>
                    <Trash2 size={14} /> Tozalash
                  </button>
                )}
              </div>
              <textarea
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                placeholder="LaTeX kodini yozing yoki rasm yuklang..."
                className="math-textarea"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Middle Column: Large Preview & Copy */}
          <div className="math-preview-column">
            <div className="card preview-card">
              <div className="card-header">
                <div className="header-left">
                  <Sparkles size={16} />
                  <span>Vizual Ko'rinish</span>
                </div>
              </div>
              <div className="preview-content">
                {latex ? (
                  <div
                    className="rendered-math"
                    dangerouslySetInnerHTML={{
                      __html: katex.renderToString(latex, { displayMode: true, throwOnError: false })
                    }}
                  />
                ) : (
                  <div className="empty-preview">
                    <Sigma size={48} opacity={0.1} />
                    <p>Formula kutilmoqda...</p>
                  </div>
                )}
              </div>
              <div className="main-action-wrapper">
                <button
                  className={`btn-primary main-copy-btn ${copied ? 'copied' : ''}`}
                  onClick={() => copyForWord()}
                  disabled={!latex.trim() || isProcessing}
                >
                  {copied ? <Check size={20} /> : <Sigma size={20} />}
                  <span>{copied ? "WORD UCHUN NUSXALANDI!" : "WORDGA NUSXALASH"}</span>
                </button>
                <p className="copy-hint">Word dasturiga o'tib <strong>Ctrl + V</strong> tugmasini bosing</p>
              </div>
            </div>
          </div>

          {/* Right Column: History */}
          <div className="math-history-column">
            <div className="card history-card">
              <div className="card-header">
                <div className="header-left">
                  <FileText size={16} />
                  <span>Tarix</span>
                </div>
                {history.length > 0 && (
                  <button className="text-clear-btn" onClick={clearHistory}>
                    <Trash2 size={14} /> Tozalash
                  </button>
                )}
              </div>
              <div className="history-list custom-scrollbar">
                {history.length === 0 ? (
                  <p className="empty-history">Tarix bo'sh</p>
                ) : (
                  history.map(item => (
                    <div key={item.id} className="history-item" onClick={() => setLatex(item.latex)}>
                      <div className="history-math">
                        <div dangerouslySetInnerHTML={{ __html: katex.renderToString(item.latex, { displayMode: false, throwOnError: false }) }} />
                      </div>
                      <button className="history-copy" onClick={(e) => { e.stopPropagation(); copyForWord(item.latex); }}>
                        <Copy size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MathCenter;