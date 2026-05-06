import React from 'react';
import { MessageSquare, CreditCard, LogOut } from 'lucide-react';

function MobileBottomNav({ credits, onLogout }) {
  return (
    <div className="mobile-bottom-nav">
      <button className="nav-item active">
        <MessageSquare size={22} />
        <span>Chat</span>
      </button>
      <button className="nav-item" onClick={() => alert(`Kreditingiz: ${credits}`)}>
        <CreditCard size={22} />
        <span>Balans: {credits}</span>
      </button>
      <button className="nav-item" onClick={onLogout}>
        <LogOut size={22} />
        <span>Chiqish</span>
      </button>
    </div>
  );
}

export default MobileBottomNav;
