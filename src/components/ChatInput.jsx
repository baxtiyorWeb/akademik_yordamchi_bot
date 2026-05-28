import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Mic, ArrowUp, Send, X, Image as ImageIcon, Wand2, Paperclip, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';

const GradientIcon = ({ icon: Icon, size = 20, className = "" }) => (
  <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    <Icon 
      size={size} 
      stroke="url(#premium-gradient)" 
    />
  </div>
);

const ChatInput = React.memo(({ onSend, isTyping, isNano }) => {
  const [localInput, setLocalInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Fayl hajmi juda katta (maks 10MB)");
        return;
      }
      setAttachment(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setAttachment(file);
          const reader = new FileReader();
          reader.onloadend = () => setPreview(reader.result);
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  const handleSend = () => {
    if ((!localInput.trim() && !attachment) || isTyping) return;
    onSend(localInput, attachment);
    setLocalInput('');
    setAttachment(null);
    setPreview(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [localInput]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
      return () => textarea.removeEventListener('paste', handlePaste);
    }
  }, [handlePaste]);

  if (isNano) {
    return (
      <div className="flex flex-col gap-2 w-full" ref={containerRef}>
        {preview && (
          <div className="flex px-4">
            <div className="relative">
              <img src={preview} className="h-20 w-20 object-cover rounded-xl border border-slate-100 shadow-sm" alt="Preview" />
              <button 
                onClick={() => { setAttachment(null); setPreview(null); }}
                className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white rounded-full p-1 shadow-md hover:scale-110 transition-all"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,application/pdf" 
            className="hidden" 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="mt-2.5 p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
          >
            <GradientIcon icon={Paperclip} size={20} />
          </button>
          
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              placeholder='Savolingizni yozing...'
              rows={1}
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none outline-none resize-none text-[17px] font-normal text-slate-800 placeholder:text-slate-300 py-2.5 min-h-[44px] max-h-40 custom-scrollbar leading-relaxed"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <button 
              onClick={() => setIsVoiceActive(!isVoiceActive)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isVoiceActive ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
            >
              {isVoiceActive ? <Mic size={18} /> : <GradientIcon icon={Mic} size={18} />}
            </button>
            
            <button 
              onClick={handleSend}
              disabled={(!localInput.trim() && !attachment) || isTyping}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all
                ${(!localInput.trim() && !attachment) || isTyping 
                  ? 'bg-slate-100 text-slate-300' 
                  : 'bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-md hover:opacity-90 active:scale-95'}`}
            >
              {isTyping ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <ArrowUp size={20} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {preview && (
        <div className="relative w-14 h-14">
          <img src={preview} className="w-full h-full object-cover rounded-lg" />
          <button onClick={() => { setAttachment(null); setPreview(null); }} className="absolute -top-1 -right-1 bg-slate-900 text-white rounded-full p-0.5"><X size={8} /></button>
        </div>
      )}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="text-slate-400"><Paperclip size={18} /></button>
        <textarea
          ref={textareaRef}
          placeholder="Message..."
          rows={1}
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] py-1.5"
        />
        <button onClick={handleSend} className="p-1.5 bg-slate-900 text-white rounded-lg"><ArrowUp size={16} /></button>
      </div>
    </div>
  );
});

export default ChatInput;
