import { useState, useRef, useEffect } from 'react';
import { Sigma, Upload, Copy, Check, Trash2, FileText, Sparkles, ArrowLeft, Image as ImageIcon, Brain, History, Zap, Code, FileDown, Wand2, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';
import { streamGeminiResponse, fetchGeminiResponse } from './../lib/gemini.js';
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
    <div className="h-full bg-[#f8fafc] text-slate-700 font-sans flex flex-col overflow-y-scroll">
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col overflow-auto">
        
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-medium tracking-tight text-slate-800">Math Center</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-medium">
              <Brain size={14} /> OCR
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-2xl text-xs font-medium">
              <FileText size={14} /> PDF
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* Left Column - Upload & Editor */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            
            {/* Upload Area */}
            <div 
              onClick={() => fileInputRef.current.click()}
              className="bg-white border border-slate-200 rounded-3xl p-8 text-center cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.985]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*,application/pdf"
                hidden
              />
              <div className="mx-auto w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
                {isProcessing ? (
                  <Zap size={28} className="text-indigo-500 animate-pulse" />
                ) : (
                  <ImageIcon size={28} className="text-slate-400" />
                )}
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-1">Rasm yoki PDF yuklang</h3>
              <p className="text-slate-500 text-sm">Yoki Ctrl + V bilan joylashtiring</p>

              {isProcessing && (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                  </div>
                  <span className="text-xs font-medium text-indigo-500 tracking-widest">AI tahlil qilmoqda...</span>
                </div>
              )}
            </div>

            {/* LaTeX Editor */}
            <div className="bg-white border border-slate-200 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Code size={18} className="text-slate-500" />
                  </div>
                  <span className="font-medium text-slate-700">LaTeX Editor</span>
                </div>
                {latex && (
                  <button 
                    onClick={() => setLatex('')} 
                    className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-slate-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <textarea
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                placeholder="Bu yerga LaTeX kodi yozing yoki yuqoridan yuklang..."
                className="flex-1 w-full bg-transparent p-6 font-mono text-[15px] resize-none focus:outline-none leading-relaxed text-slate-600 placeholder:text-slate-400 overflow-y-auto custom-scrollbar"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Center - Preview */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-white border border-slate-200 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Sparkles size={18} className="text-indigo-500" />
                  </div>
                  <span className="font-medium text-slate-700">Vizual Ko‘rinish</span>
                </div>

                <button 
                  onClick={normalizeEquation}
                  disabled={!latex || isNormalizing}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Normallashtirish"
                >
                  <Wand2 size={18} className={isNormalizing ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="flex-1 p-8 flex items-center justify-center bg-slate-50/50 overflow-auto custom-scrollbar min-h-[300px]">
                {latex ? (
                  <div 
                    className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 max-w-full overflow-auto custom-scrollbar"
                    dangerouslySetInnerHTML={{
                      __html: katex.renderToString(latex, { 
                        displayMode: true, 
                        throwOnError: false 
                      })
                    }}
                  />
                ) : (
                  <div className="text-center opacity-40">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-5 border border-slate-100">
                      <Sigma size={32} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 text-sm">Formula shu yerda paydo bo'ladi</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => copyForWord()}
                    disabled={!latex.trim() || isProcessing}
                    className={`py-4 rounded-2xl font-medium flex items-center justify-center gap-3 transition-all text-sm
                      ${copied 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400'}`}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? "NUSXALANDI" : "WORD UCHUN NUSXALASH"}
                  </button>

                  <button
                    onClick={exportToDocx}
                    disabled={!latex.trim()}
                    className="py-4 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <FileDown size={18} /> .docx Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right - History */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="bg-white border border-slate-200 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                    <History size={18} className="text-slate-500" />
                  </div>
                  <span className="font-medium text-slate-700">Tarix</span>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory} 
                    className="text-slate-400 hover:text-rose-500 p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <History size={40} className="text-slate-200 mb-4" />
                    <p className="text-sm text-slate-400">Tarix hali bo‘sh</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setLatex(item.latex)}
                      className="bg-slate-50 hover:bg-white border border-slate-100 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-sm group"
                    >
                      <div 
                        className="text-[13px] text-slate-600 line-clamp-3"
                        dangerouslySetInnerHTML={{
                          __html: katex.renderToString(item.latex, { 
                            displayMode: false, 
                            throwOnError: false 
                          })
                        }}
                      />
                      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end opacity-70 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyForWord(item.latex); }}
                          className="text-xs flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700"
                        >
                          <Copy size={14} /> Nusxa
                        </button>
                      </div>
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