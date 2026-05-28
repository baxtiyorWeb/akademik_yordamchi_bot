import React, { useState, useRef, useEffect } from 'react';
import { Sigma, Upload, Copy, Check, Trash2, FileText, Sparkles, ArrowLeft, Image as ImageIcon, Brain, History, Zap, Code, FileDown, Wand2, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';
import { streamGeminiResponse, fetchGeminiResponse } from '../api/gemini';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const MathCenter = () => {
  const navigate = useNavigate();
  const [latex, setLatex] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
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
        if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('pdf') !== -1) {
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
    const codeMatch = text.match(/```(?:latex|math|tex)?\s*([\s\S]*?)(?:```|$)/i);
    if (codeMatch && codeMatch[1].trim()) {
      return codeMatch[1].trim();
    }
    if (!text.includes('```')) {
       // Ba'zida AI shunchaki LaTeX kodini beradi bloklarsiz
       const clean = text.replace(/[\$\\]/g, '').trim();
       if (clean.length > 0 && (text.includes('frac') || text.includes('sqrt') || text.includes('sum'))) {
          return text.trim();
       }
    }
    return "";
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setLatex('');
    const loadingId = toast.loading(file.type.includes('pdf') ? "PDF tahlil qilinmoqda..." : "Rasm tahlil qilinmoqda...");

    try {
      const prompt = `TASK: Extract mathematical formulas from the provided ${file.type.includes('pdf') ? 'PDF document' : 'image'}. 
      OUTPUT: ONLY the LaTeX code inside a markdown code block. 
      RULES: 
      1. If there are multiple formulas, combine them logically. 
      2. Support handwriting OCR - be very careful with messy symbols. 
      3. Output ONLY the code block. No explanations.`;

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

  const normalizeEquation = async () => {
    if (!latex.trim()) return;
    setIsNormalizing(true);
    const loadingId = toast.loading("Formula normallashtirilmoqda...");

    try {
      const prompt = `TASK: Normalize and clean up this LaTeX formula: "${latex}". 
      RULES: 
      1. Fix syntax errors. 
      2. Simplify if possible. 
      3. Standardize the formatting. 
      4. Output ONLY the updated LaTeX code inside a block.`;

      const result = await fetchGeminiResponse(prompt, [], null, 'TUTOR');
      const clean = extractLatex(result);
      if (clean) {
        setLatex(clean);
        toast.success("Normallashtirildi!", { id: loadingId });
      } else {
        toast.error("O'zgartirishning iloji bo'lmadi", { id: loadingId });
      }
    } catch (err) {
      toast.error("Xatolik yuz berdi", { id: loadingId });
    } finally {
      setIsNormalizing(false);
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
      mathml = mathml.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/gi, '');
      mathml = mathml.replace(/<\/?semantics[^>]*>/gi, '');

      if (!mathml.includes('xmlns=')) {
        mathml = mathml.replace('<math', '<math xmlns="http://www.w3.org/1998/Math/MathML"');
      }

      await navigator.clipboard.writeText(mathml);

      setCopied(true);
      toast.success("Word/G-Docs uchun nusxalandi!");
      setTimeout(() => setCopied(false), 3500);
    } catch (err) {
      console.error(err);
      toast.error("Nusxa olishda xatolik yuz berdi");
    }
  };

  const exportToDocx = async () => {
    if (!latex.trim()) return;
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Generated Formula (LaTeX):",
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: latex,
                  italics: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "\nInstruction: Copy this LaTeX and paste into Word Equation editor, or use the MathML copy feature from the app.",
                  size: 20,
                  color: "666666"
                }),
              ],
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "formula_export.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(".docx fayli yaratildi!");
    } catch (err) {
      toast.error("Fayl yaratishda xatolik");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('math_history');
    toast.success("Tarix tozalandi");
  };

  return (
    <div className="h-full bg-white nano-bg text-slate-900 font-sans flex flex-col overflow-hidden">
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 flex flex-col overflow-hidden">
        
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-normal tracking-tight text-slate-800">Math Center</h1>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-semibold uppercase tracking-widest">
                <Brain size={12} /> Handwriting OCR Active
             </div>
             <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-semibold uppercase tracking-widest">
                <FileText size={12} /> PDF Extraction Enabled
             </div>
          </div>
        </div>

        {/* --- Main Content Grid --- */}
        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          
          {/* Left - Upload & Tools */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 min-h-0">
            
            {/* Upload Area */}
            <div 
              onClick={() => fileInputRef.current.click()}
              className="nano-card rounded-[28px] p-6 text-center cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg border-dashed border-2 border-slate-200 shrink-0"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*,application/pdf"
                hidden
              />
              <div className="mx-auto w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                {isProcessing ? (
                   <Zap size={24} className="text-indigo-500 animate-pulse" />
                ) : (
                   <ImageIcon size={24} className="text-slate-400" />
                )}
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">Rasm yoki PDF</h3>
              <p className="text-slate-400 text-xs">Yoki Ctrl + V bilan joylashtiring</p>
              
              {isProcessing && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <span className="text-[9px] font-medium text-indigo-500 uppercase tracking-widest">AI tahlil qilmoqda...</span>
                </div>
              )}
            </div>

            {/* LaTeX Editor */}
            <div className="nano-card rounded-[28px] flex-1 flex flex-col overflow-hidden border border-slate-100 shadow-sm min-h-0">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                    <Code size={14} className="text-slate-500" />
                  </div>
                  <span className="text-[13px] font-medium text-slate-700">LaTeX Editor</span>
                </div>
                {latex && (
                  <button onClick={() => setLatex('')} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <textarea
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                placeholder="LaTeX kodi shu yerga yoziladi..."
                className="flex-1 w-full bg-transparent p-6 font-mono text-[14px] resize-none focus:outline-none leading-relaxed text-slate-600 placeholder:text-slate-300 overflow-y-auto custom-scrollbar"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Center - Preview & Action */}
          <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <div className="nano-card rounded-[28px] flex-1 flex flex-col border border-slate-100 shadow-sm overflow-hidden min-h-0">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <Sparkles size={14} className="text-indigo-500" />
                  </div>
                  <span className="text-[13px] font-medium text-slate-700">Vizual Ko‘rinish</span>
                </div>
                
                {/* Advanced Tools bar */}
                <div className="flex items-center gap-2">
                   <button 
                     onClick={normalizeEquation}
                     disabled={!latex || isNormalizing}
                     className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                     title="Equation Normalization Engine"
                   >
                     <Wand2 size={16} className={isNormalizing ? 'animate-spin' : ''} />
                   </button>
                </div>
              </div>

              <div className="flex-1 p-6 flex items-center justify-center bg-slate-50/20 overflow-auto custom-scrollbar">
                {latex ? (
                  <div 
                    className="bg-white p-8 rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-white max-w-full overflow-auto custom-scrollbar"
                    dangerouslySetInnerHTML={{
                      __html: katex.renderToString(latex, { 
                        displayMode: true, 
                        throwOnError: false 
                      })
                    }}
                  />
                ) : (
                  <div className="text-center opacity-40">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4 border border-slate-50">
                      <Sigma size={24} className="text-slate-200" />
                    </div>
                    <p className="text-slate-300 text-xs font-light">Formula shu yerda ko‘rinadi</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-slate-50 shrink-0">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => copyForWord()}
                    disabled={!latex.trim() || isProcessing}
                    className={`col-span-2 py-4 rounded-xl font-medium text-[13px] flex items-center justify-center gap-3 transition-all tracking-wide
                      ${copied 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-100 disabled:bg-slate-100 disabled:shadow-none'}`}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? "NUSXALANDI" : "WORD / G-DOCS UCHUN NUSXALASH"}
                  </button>
                  
                  <button
                    onClick={exportToDocx}
                    disabled={!latex.trim()}
                    className="py-3 rounded-xl border border-slate-100 text-slate-600 hover:bg-slate-50 transition-all text-[12px] flex items-center justify-center gap-2"
                  >
                    <FileDown size={16} /> .docx Export
                  </button>

                  <button
                    onClick={normalizeEquation}
                    disabled={!latex.trim() || isNormalizing}
                    className="py-3 rounded-xl border border-slate-100 text-slate-600 hover:bg-slate-50 transition-all text-[12px] flex items-center justify-center gap-2"
                  >
                    <Zap size={16} className="text-amber-500" /> Normalize
                  </button>
                </div>
                
              </div>
            </div>
          </div>

          {/* Right - History Sidebar */}
          <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
            <div className="nano-card rounded-[28px] flex-1 flex flex-col border border-slate-100 shadow-sm overflow-hidden min-h-0">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                    <History size={14} className="text-slate-500" />
                  </div>
                  <span className="text-[13px] font-medium text-slate-700">Tarix</span>
                </div>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                    <History size={32} className="text-slate-100 mb-2" />
                    <p className="text-slate-300 text-[10px] font-light">Tarix bo‘sh</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setLatex(item.latex)}
                      className="bg-white hover:bg-slate-50 border border-slate-100 rounded-xl p-3 cursor-pointer transition-all group relative shadow-sm hover:shadow-md"
                    >
                      <div 
                        className="text-[11px] mb-2 overflow-hidden text-slate-600 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: katex.renderToString(item.latex, { 
                            displayMode: false, 
                            throwOnError: false 
                          })
                        }}
                      />
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-50 opacity-50 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px]  text-slate-400 font-medium uppercase tracking-tighter">Wordga nusxa</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyForWord(item.latex); }}
                          className="p-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info - Minimalized to save space */}
        <footer className="mt-4 text-center shrink-0">
           <p className="text-[9px] text-slate-300 font-medium uppercase tracking-[0.3em]">
             Academic AI Assistant &copy; 2026 • Advanced Math Tools
           </p>
        </footer>
      </div>
    </div>
  );
};

export default MathCenter;
