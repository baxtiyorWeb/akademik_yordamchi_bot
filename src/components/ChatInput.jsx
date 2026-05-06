import React, { useState } from 'react';
import { Send } from 'lucide-react';

const ChatInput = React.memo(({ onSend, isTyping }) => {
  const [localInput, setLocalInput] = useState('');

  const handleSend = () => {
    if (!localInput.trim() || isTyping) return;
    onSend(localInput);
    setLocalInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-area">
      <div className="input-wrapper">
        <textarea
          placeholder="Ustozga savol yozing... (Enter bosib yuboring)"
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={!localInput.trim() || isTyping}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
});

export default ChatInput;
