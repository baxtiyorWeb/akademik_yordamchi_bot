import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid, BookOpen, MessageSquare, Users, AppWindow,
  Settings, LogOut, Search, Plus, Bell, ChevronDown, Command, CreditCard, Mic, Share2
} from 'lucide-react';
import { supabase } from '../supabase';

// SVG Gradient component to be used by icons
const IconGradient = () => (
  <svg width="0" height="0" className="absolute">
    <linearGradient id="blue-purple-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#9333ea" />
    </linearGradient>
  </svg>
);

const navItems = [
  { icon: <LayoutGrid size={18} strokeWidth={2} />, label: 'Dashboard', path: '/profile' },
  { icon: <MessageSquare size={18} strokeWidth={2} />, label: 'AI Assistant', path: '/tutor' },
  { icon: <BookOpen size={18} strokeWidth={2} />, label: 'Notebook LM', path: '/notebook' },
  { icon: <Mic size={18} strokeWidth={2} />, label: 'Lingo Voice', path: '/voice' },
  { icon: <AppWindow size={18} strokeWidth={2} />, label: 'Math Center', path: '/math' },
  { icon: <CreditCard size={18} strokeWidth={2} />, label: 'Plans', path: '/pricing' },
];

function MainLayout({ children, session }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const currentLabel = navItems.find(i => i.path === location.pathname || (i.path === '/' && location.pathname === '/tutor'))?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-[#fcfdfe] overflow-hidden font-sans text-slate-900">
      <IconGradient />
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col z-30 shadow-sm">
        <div className="p-6 border-b border-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-100">T</div>
          <span className="text-[16px] font-semibold tracking-tight text-slate-900">Typer AI</span>
        </div>

        <div className="p-4">
          <div className="relative group">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              type="text" 
              placeholder="Qidirish..." 
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border-none rounded-xl text-[13px] outline-none placeholder:text-slate-400 focus:bg-slate-100 transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/tutor');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span style={{ stroke: isActive ? 'white' : 'url(#blue-purple-gradient)' }}>
                  {React.cloneElement(item.icon, { 
                    stroke: isActive ? 'currentColor' : 'url(#blue-purple-gradient)' 
                  })}
                </span>
                {item.label}
              </button>
            );
          })}
          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-300 uppercase tracking-widest opacity-60">Workspace</div>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium text-slate-500 hover:bg-slate-50">
            <Plus size={18} stroke="url(#blue-purple-gradient)" /> Yangi joy
          </button>
        </nav>

        <div className="p-3 border-t border-slate-50">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium text-slate-500 hover:bg-slate-50 mb-2">
            <Settings size={18} stroke="url(#blue-purple-gradient)" /> Sozlamalar
          </button>
          <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between group border border-transparent hover:border-slate-100 transition-all shadow-sm">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center text-blue-600 text-[11px] font-bold uppercase shadow-inner">
                  {session?.user?.email?.[0] || 'U'}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[13px] font-semibold text-slate-900 truncate w-24">{session?.user?.email?.split('@')[0] || 'User'}</span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-tight">Free Plan</span>
                </div>
             </div>
             <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-14 border-b border-slate-50 flex items-center justify-between px-8 z-20 bg-white/80 backdrop-blur-md">
          <span className="text-[15px] font-semibold text-slate-900">{currentLabel}</span>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><Bell size={18} stroke="url(#blue-purple-gradient)" /></button>
            <button className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all shadow-xl shadow-slate-100">
              <Share2 size={14} /> Ulashish
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
