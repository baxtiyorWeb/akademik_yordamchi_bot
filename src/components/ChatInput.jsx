import React, { useState, useRef, useCallback } from 'react';
import { LayoutGrid, ChevronRight, History, Paperclip, Mic, ArrowRight, X } from 'lucide-react';

const ChatInput = React.memo(({ onSend, isTyping }) => {
  const [localInput, setLocalInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if ((!localInput.trim() && !attachment) || isTyping) return;
    onSend(localInput, attachment);
    setLocalInput('');
    setAttachment(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Ovozli qidiruv qo\'llab-quvvatlamaydi.');
    const recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => setLocalInput(prev => prev + ' ' + event.results[0][0].transcript);
    if (isListening) recognition.stop(); else recognition.start();
  }, [isListening]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {attachment && (
        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-2xl animate-in slide-in-from-bottom-2 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center overflow-hidden border border-orange-100">
              {attachment.type.startsWith('image/') ? <img src={URL.createObjectURL(attachment)} className="w-full h-full object-cover" /> : <Paperclip size={18} className="text-orange-500" />}
            </div>
            <div className="text-[11px] font-bold text-gray-500 truncate max-w-[150px]">{attachment.name}</div>
          </div>
          <button onClick={() => setAttachment(null)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-[32px] p-5 shadow-xl shadow-black/[0.02] relative group transition-all focus-within:border-gray-300">
        <div className="absolute top-4 right-5 text-gray-300 pointer-events-none"><LayoutGrid size={18} /></div>

        <textarea
          placeholder="Cortex dan istalgan narsani so'rang..."
          rows={1}
          value={localInput}
          onChange={(e) => {
            setLocalInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-none outline-none resize-none text-[15px] font-semibold text-gray-800 placeholder:text-gray-300 py-1 max-h-40 custom-scrollbar"
        />

        <div className="flex justify-between items-center mt-4">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-[11px] font-black hover:bg-gray-200 transition-colors uppercase tracking-wider">
            Cortex 4.0 <ChevronRight size={14} />
          </button>
          <div className="flex items-center gap-1">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"><History size={18} /></button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all" onClick={() => fileInputRef.current.click()}><Paperclip size={18} /></button>
            <input type="file" ref={fileInputRef} hidden onChange={(e) => setAttachment(e.target.files[0])} accept="image/*,audio/*,video/*,.pdf" />
            <button className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-50 text-red-500' : 'text-gray-400 hover:bg-gray-100'}`} onClick={handleVoice}>
              <Mic size={18} />
            </button>
            <button onClick={handleSend} disabled={(!localInput.trim() && !attachment) || isTyping}
              className={`ml-2 w-9 h-9 text-white rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 ${isTyping ? 'bg-gray-300 shadow-none' : 'bg-orange-500 shadow-orange-500/20'}`}>
              {isTyping ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ArrowRight size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatInput;
