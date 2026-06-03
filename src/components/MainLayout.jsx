import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid, BookOpen, MessageSquare, Users, AppWindow,
  Settings, LogOut, Search, Plus, Bell, ChevronDown, Command, Calendar, Mic, Share2,
  Brain, Zap, Award
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { supabase } from '../supabase';
import { useNotebook } from '../hooks/useNotebook';
import { useProfile } from '../hooks/useProfile';


const IconGradient = () => (
  <svg width="0" height="0" className="absolute">
    <linearGradient id="blue-purple-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#9333ea" />
    </linearGradient>
  </svg>
);

const navItems = [
  { icon: <LayoutGrid size={18} strokeWidth={2} />, labelKey: 'dashboard', path: '/profile' },
  { icon: <MessageSquare size={18} strokeWidth={2} />, labelKey: 'ai_assistant', path: '/tutor' },
  { icon: <BookOpen size={18} strokeWidth={2} />, labelKey: 'notebook_lm', path: '/notebook' },
  // { icon: <Award size={18} strokeWidth={2} />, labelKey: 'ielts_prep', path: '/ielts' },
  { icon: <AppWindow size={18} strokeWidth={2} />, labelKey: 'math_center', path: '/math' },
  { icon: <Calendar size={18} strokeWidth={2} />, label: 'Rejalar', path: '/plans' },
];

function MainLayout({ children, session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { entries } = useNotebook(session);
  const { profile } = useProfile(session);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const currentNavItem = navItems.find(i => i.path === location.pathname || (i.path === '/' && location.pathname === '/tutor'));
  const currentLabel = currentNavItem ? t(currentNavItem.labelKey) : t('dashboard');

  return (
    <div className="flex h-screen bg-[#fcfdfe] overflow-hidden font-sans text-slate-900">
      <IconGradient />

      <aside className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col z-30 shadow-sm">
        <Link to={'/'} className="p-6 border-b border-slate-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-100">T</div>
          <span className="text-[16px] font-semibold tracking-tight text-slate-900">Ovvox Ai</span>
        </Link>

        <div className="p-4">
          <div className="relative group">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border-none rounded-xl text-[13px] outline-none placeholder:text-slate-400 focus:bg-slate-100 transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/' && item.path === '/tutor');
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${isActive
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span style={{ stroke: isActive ? 'white' : 'url(#blue-purple-gradient)' }}>
                  {React.cloneElement(item.icon, {
                    stroke: isActive ? 'currentColor' : 'url(#blue-purple-gradient)'
                  })}
                </span>
                {item.label || t(item.labelKey)}
              </button>
            );
          })}
          <div className="pt-6 pb-2 px-4 text-[11px] font-bold text-slate-300 uppercase tracking-widest opacity-60">{t('workspace')}</div>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium text-slate-500 hover:bg-slate-50">
            <Plus size={18} stroke="url(#blue-purple-gradient)" /> {t('new_space')}
          </button>
        </nav>

        <div className="p-3 border-t border-slate-50">
          <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium text-slate-500 hover:bg-slate-50">
            <Settings size={18} stroke="url(#blue-purple-gradient)" /> Sozlamalar
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around z-30 px-2 shadow-lg">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/tutor');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${isActive ? 'text-indigo-600 scale-105 font-bold' : 'text-slate-400 font-medium'
                }`}
            >
              <span className="transition-all duration-300">
                {React.cloneElement(item.icon, {
                  size: 18,
                  stroke: isActive ? 'url(#blue-purple-gradient)' : 'currentColor',
                })}
              </span>
              <span className="text-[9px] tracking-tight mt-1">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>

      <main className="flex-1 flex flex-col min-w-0 bg-white relative pb-16 md:pb-0">
        <header className="h-14 border-b border-slate-50 flex items-center justify-between px-6 md:px-8 z-20 bg-white/80 backdrop-blur-md">
          <div className="flex flex-col text-left">
            <span className="text-[14px] md:text-[15px] font-semibold text-slate-900 leading-tight">{currentLabel}</span>
            <span className="md:hidden text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {location.pathname === '/notebook' && `${entries.length} TA SAQLANGAN MANBA`}
              {location.pathname === '/tutor' && "AI Professional Tutor"}
              {location.pathname === '/ielts' && "IELTS Band 9.0 Preparation"}
              {location.pathname === '/math' && "Math & OCR Center"}
              {location.pathname === '/profile' && "Dashboard Overview"}
              {location.pathname === '/pricing' && "Simple Tariflar"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><Bell size={18} stroke="url(#blue-purple-gradient)" /></button>
            <button className="hidden sm:flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-[13px] font-medium hover:opacity-90 transition-all shadow-xl shadow-slate-100">
              <Share2 size={14} /> Ulashish
            </button>
            {/* UPGRADE BUTTON */}
            <button
              onClick={() => navigate('/pricing')}
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all text-xs font-normal tracking-widest uppercase shadow-sm border border-indigo-100"
              style={{ letterSpacing: '0.12em' }}
            >
              Upgrade
            </button>
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 p-1 hover:bg-slate-50 rounded-xl transition-all border border-slate-100"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-[12px] font-bold uppercase shadow-md shadow-indigo-100">
                  {session?.user?.email?.[0] || 'U'}
                </div>
                <ChevronDown size={13} className="text-slate-400 mr-0.5" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-slate-50">
                    <p className="text-[12px] font-bold text-slate-900 truncate">{session?.user?.email?.split('@')[0] || 'User'}</p>
                    <p className="text-[10px] font-bold tracking-tight uppercase flex items-center gap-1 mt-0.5">
                      {profile?.plan === 'Pro' ? (
                        <span className="text-indigo-600 flex items-center gap-0.5"><Zap size={8} className="fill-indigo-600" /> Pro Plan</span>
                      ) : profile?.plan === 'Research' ? (
                        <span className="text-purple-600 flex items-center gap-0.5"><Brain size={8} className="fill-purple-600" /> Research Plan</span>
                      ) : (
                        <span className="text-slate-400">Free Plan</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
                  >
                    <LayoutGrid size={15} stroke="url(#blue-purple-gradient)" /> {t('profile')}
                  </button>
                  <button
                    onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
                  >
                    <Settings size={15} stroke="url(#blue-purple-gradient)" /> {t('settings')}
                  </button>
                  <hr className="border-slate-50 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium text-rose-500 hover:bg-rose-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={15} /> {t('logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
