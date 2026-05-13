import React from 'react';
import { MessageSquare, CreditCard, LogOut, Mic } from 'lucide-react';

function MobileBottomNav({ credits, onLogout, onVoiceCall }) {
  return (
    <div className="mobile-bottom-nav">
      <button className="nav-item active">
        <MessageSquare size={22} />
        <span>Chat</span>
      </button>
      <button className="nav-item" style={{ color: '#10b981' }} onClick={onVoiceCall}>
        <Mic size={22} />
        <span>Ovozli</span>
      </button>
      <button className="nav-item" onClick={() => alert(`Kreditingiz: ${credits}`)}>
        <CreditCard size={22} />
        <span>Balans</span>
      </button>
      <button className="nav-item" onClick={onLogout}>
        <LogOut size={22} />
        <span>Chiqish</span>
      </button>
    </div>
  );
}

export default MobileBottomNav;
