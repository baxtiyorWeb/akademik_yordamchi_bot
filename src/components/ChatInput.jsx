import React, { useState, useRef, useCallback } from 'react';
import { Send, Mic, MicOff, Paperclip, X } from 'lucide-react';

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
    if (!SpeechRecognition) {
      alert('Brauzeringiz ovozli qidiruvni qo\'llab-quvvatlamaydi.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setLocalInput(prev => prev + ' ' + transcript);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [isListening]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
  };

  return (
    <div className="chat-input-area">
      {attachment && (
        <div className="attachment-preview fade-in">
          <div className="preview-content">
            {attachment.type.startsWith('image/') ? (
              <div className="image-thumbnail">
                <img src={URL.createObjectURL(attachment)} alt="Preview" />
              </div>
            ) : attachment.type.startsWith('audio/') ? (
              <div className="file-info audio">
                <Mic size={14} color="#10b981" />
                <span>Audio fayl</span>
              </div>
            ) : attachment.type.startsWith('video/') ? (
              <div className="file-info video">
                <Send size={14} color="#8b5cf6" />
                <span>Video fayl</span>
              </div>
            ) : (
              <div className="file-info">
                <Paperclip size={14} />
                <span>{attachment.name}</span>
              </div>
            )}
            <div className="preview-details">
              <span className="file-name">{attachment.name}</span>
              <span className="file-size">{(attachment.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <button className="remove-attachment" onClick={() => setAttachment(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="input-wrapper">
        <button className="tool-button" onClick={() => fileInputRef.current.click()}>
          <Paperclip size={20} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          hidden 
          onChange={handleFileChange} 
          accept="image/*,.pdf,audio/*,video/*"
        />
        
        <textarea
          placeholder="Savol yozing yoki rasm/audio/video yuklang..."
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={(e) => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                setAttachment(blob);
                break;
              }
            }
          }}
          rows={1}
        />

        <button 
          className={`tool-button ${isListening ? 'active' : ''}`} 
          onClick={handleVoice}
        >
          {isListening ? <MicOff size={20} color="#ef4444" /> : <Mic size={20} />}
        </button>

        <button
          className="send-button"
          onClick={handleSend}
          disabled={(!localInput.trim() && !attachment) || isTyping}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
});

export default ChatInput;

