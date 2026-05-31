import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, X, Paperclip, Mic, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const ChatInput = React.memo(({ onSend, isTyping }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [preview, setPreview] = useState(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [text]);

  /* Paste image */
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        setAttachment(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
        break;
      }
    }
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Fayl hajmi juda katta (maks 10MB)'); return; }
    setAttachment(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearFile = () => { setAttachment(null); setPreview(null); };

  const send = () => {
    if ((!text.trim() && !attachment) || isTyping) return;
    onSend(text.trim(), attachment);
    setText('');
    clearFile();
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const canSend = (text.trim().length > 0 || !!attachment) && !isTyping;

  return (
    <div className="w-full flex flex-col gap-2">

      {/* Image preview */}
      {preview && (
        <div className="flex px-1">
          <div className="relative group">
            <img src={preview} alt="Preview" className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-sm" />
            <button
              onClick={clearFile}
              aria-label="Rasmni o'chirish"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-900/80 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Input container */}
      <div className="flex flex-col bg-white border border-slate-200 rounded-2xl transition-all duration-200 focus-within:border-indigo-300 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]">

        {/* Textarea */}
        <div className="px-3 pt-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Xabar yozing yoki rasm joylang..."
            spellCheck={false}
            className="w-full bg-transparent border-none outline-none resize-none text-[15px] text-slate-800 placeholder:text-slate-400 leading-relaxed max-h-36 overflow-y-auto"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 pb-2 pt-1 gap-2">
          {/* Left actions */}
          <div className="flex items-center gap-0.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFile}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Fayl biriktirish"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <Paperclip size={18} />
            </button>
            <button
              onClick={() => setVoiceActive(v => !v)}
              aria-label="Ovozli kiritish"
              className={`p-2 rounded-xl transition-all ${voiceActive ? 'bg-red-50 text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              <Mic size={18} />
            </button>

            {/* AI badge — hidden on small screens */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg ml-1">
              <Sparkles size={12} className="text-indigo-500" />
              <span className="text-[11px] font-semibold text-indigo-600">Azure AI Voice</span>
            </div>
          </div>

          {/* Right: hint + send */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden md:inline text-[11px] text-slate-400 font-medium">
              Shift+Enter yangi qator
            </span>
            <button
              onClick={send}
              disabled={!canSend}
              aria-label="Yuborish"
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${canSend
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-200'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
            >
              {isTyping ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp size={18} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatInput;