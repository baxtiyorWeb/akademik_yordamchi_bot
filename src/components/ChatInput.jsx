import React,  { useState, useRef, useEffect, useCallback , memo} from 'react';
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

  /* ── Speech-to-Text (STT) ── */
  const recognitionRef = useRef(null);

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Brauzeringiz ovozni qo'llab-quvvatlamaydi. Chrome yoki Edge ishlating.");
      return;
    }

    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setVoiceActive(true);
      toast.info('🎤 Gapiring...', { duration: 2000 });
    };

    recognition.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      if (final) {
        setText(prev => {
          const trimmed = prev.trimEnd();
          return trimmed ? trimmed + ' ' + final : final;
        });
      }
    };

    recognition.onerror = (event) => {
      console.error('STT error:', event.error);
      if (event.error !== 'no-speech') toast.error("Ovoz xatosi: " + event.error);
      setVoiceActive(false);
    };

    recognition.onend = () => setVoiceActive(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [voiceActive]);

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

      {/* Voice recording live indicator */}
      {voiceActive && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex gap-0.5 items-end h-4">
            {[0.0, 0.1, 0.2, 0.15, 0.05].map((delay, i) => (
              <div
                key={i}
                className="w-1 bg-red-400 rounded-full"
                style={{ height: `${8 + (i % 3) * 4}px`, animation: `blink 0.6s ${delay}s ease-in-out infinite alternate` }}
              />
            ))}
          </div>
          <span className="text-[12px] font-semibold text-red-600 flex-1">Gapiring... (to'xtatish uchun tugmani bosing)</span>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
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
            placeholder="Xabar yozing, rasm joylang yoki 🎤 bosing..."
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
              onClick={toggleVoice}
              aria-label={voiceActive ? "Ovozni to'xtatish" : "Ovozli yozish"}
              title={voiceActive ? "To'xtatish" : "Mikrofon bilan yozish (STT)"}
              className={`p-2 rounded-xl transition-all ${voiceActive
                ? 'bg-red-100 text-red-500 ring-2 ring-red-200'
                : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
            >
              <Mic size={18} />
            </button>

            {/* AI badge — hidden on small screens */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg ml-1">
              <Sparkles size={12} className="text-indigo-500" />
              <span className="text-[11px] font-semibold text-indigo-600">Ovvox AI</span>
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