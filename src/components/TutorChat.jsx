import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Settings, RotateCcw, LayoutGrid, MessageSquare, 
  CheckSquare, Users, AppWindow, LogOut, Brain, Zap, Target, BookOpen, Clock,
  MoreVertical, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { supabase } from '../supabase';
import { toast } from 'sonner';

// Components & Hooks
import ChatInput from './ChatInput';
import { useProfile } from '../hooks/useProfile';
import { useMessages } from '../hooks/useMessages';

const SIDEBAR_MENU = [
  { icon: <LayoutGrid size={18} />, label: 'Dashboard' },
  { icon: <CheckSquare size={18} />, label: 'My Work' },
  { icon: <MessageSquare size={18} />, label: 'AI', active: true },
  { icon: <Users size={18} />, label: 'Channel' },
  { icon: <AppWindow size={18} />, label: 'Apps' },
];

const PROJECTS = [
  { icon: <Target size={14} />, label: 'Website Creation' },
  { icon: <Users size={14} />, label: 'UX Research' },
  { icon: <FileText size={14} />, label: 'Usability Testing', badge: 2 },
  { icon: <FileText size={14} />, label: 'Draft' },
];

const QUICK_CHIPS = [
  { icon: <Target size={16} />, label: 'Focused' },
  { icon: <Clock size={16} />, label: 'Planning' },
  { icon: <RotateCcw size={16} />, label: 'Reviewing' },
  { icon: <Target size={16} />, label: 'Decision' },
  { icon: <Clock size={16} />, label: 'Catch-up' },
];

const ACTION_CARDS = [
  { icon: <Target size={20} className="text-orange-500" />, title: 'Plan My Tasks', desc: 'Organize today\'s priorities', prompt: 'Bugungi vazifalarni rejalashtirishga yordam ber.' },
  { icon: <LayoutGrid size={20} className="text-orange-500" />, title: 'Break Down a Task', desc: 'Turn big work into steps', prompt: 'Katta vazifani kichik qismlarga bo\'lib ber.' },
  { icon: <Search size={20} className="text-orange-500" />, title: 'Summarize My Progress', desc: 'Quick work recap', prompt: 'Oxirgi natijalarimni umumlashtirib ber.' },
];

function TutorChat({ session }) {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const { profile } = useProfile(session);
  const { messages, isSending, setMessages, sendMessage } = useMessages(session);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isSending, scrollToBottom]);

  const handleSend = async (userText, attachment) => {
    try {
      sendMessage({ userText, currentMessages: messages, attachment, mode: 'TUTOR' });
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] p-4 gap-4 font-sans overflow-hidden">
      
      {/* ── SIDEBAR ── */}
      <aside className="w-[280px] bg-white rounded-[32px] flex flex-col p-6 shadow-sm border border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 mb-8 px-2 cursor-pointer" onClick={() => setMessages([])}>
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Brain size={20} fill="currentColor" />
          </div>
          <span className="text-xl font-bold text-orange-500 tracking-tight">Blossom</span>
        </div>

        <div className="p-3 bg-gray-50 rounded-2xl flex items-center gap-3 border border-gray-100 mb-8 cursor-pointer hover:bg-gray-100 transition-colors">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black">
             {session?.user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Cortex Expert</div>
            <div className="text-sm font-bold text-gray-800 truncate">{session?.user?.email?.split('@')[0]}</div>
          </div>
          <MoreVertical size={16} className="text-gray-400" />
        </div>

        <nav className="space-y-1 mb-8">
          {SIDEBAR_MENU.map((item, i) => (
            <div key={i} className={`blossom-sidebar-item ${item.active ? 'active' : ''}`}>
              {item.icon} <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           <div className="flex items-center justify-between px-3 mb-4">
             <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Learning Paths</span>
           </div>
           <div className="space-y-1">
             {PROJECTS.map((p, i) => (
               <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer group transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 group-hover:text-gray-600 transition-colors">{p.icon}</span>
                    <span className="text-[13px] font-semibold text-gray-600 group-hover:text-gray-900">{p.label}</span>
                  </div>
                  {p.badge && <span className="w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{p.badge}</span>}
               </div>
             ))}
           </div>
        </div>

        <div className="mt-auto space-y-1 pt-6 border-t border-gray-100">
           <div className="blossom-sidebar-item text-gray-500"><Settings size={18} /> Settings</div>
           <div className="blossom-sidebar-item text-gray-500" onClick={handleLogout}><LogOut size={18} /> Log Out</div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        <header className="flex justify-between items-center py-4 px-2">
           <div className="flex items-center gap-2">
             <span className="text-orange-500"><Brain size={20} /></span>
             <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest">AI Assistant</h2>
           </div>
           <div className="flex items-center gap-2">
             <button className="p-2 bg-white rounded-xl text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100"><RotateCcw size={18} /></button>
             <button className="p-2 bg-white rounded-xl text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100"><Search size={18} /></button>
             <button onClick={() => setMessages([])} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 ml-2">
               <Plus size={18} /> New Chat
             </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-10 custom-scrollbar">
           {messages.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-700">
                <div className="text-4xl mb-6">👋</div>
                <h1 className="text-3xl font-black text-gray-800 mb-2">Welcome, {session?.user?.email?.split('@')[0]}</h1>
                <p className="text-gray-400 font-semibold mb-12">I'm here to help you plan, organize, and reflect on your learning.</p>

                <ChatInput onSend={handleSend} isTyping={isSending} />

                <div className="flex flex-wrap justify-center gap-3 mb-20 mt-10">
                  {QUICK_CHIPS.map((c, i) => (
                    <button key={i} className="flex items-center gap-2 px-5 py-2.5 bg-gray-200/50 border border-gray-200 text-gray-500 text-[13px] font-bold rounded-2xl hover:bg-gray-200 transition-all">
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>

                <div className="w-full max-w-3xl">
                   <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-2">
                       <span className="text-orange-500"><Zap size={18} fill="currentColor" /></span>
                       <h3 className="text-[15px] font-black text-gray-800">Quick Actions</h3>
                     </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {ACTION_CARDS.map((a, i) => (
                        <div key={i} className="bg-white/60 p-6 rounded-[32px] border border-gray-200 cursor-pointer hover:bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                          onClick={() => handleSend(a.prompt)}>
                           <div className="mb-8 p-3 bg-orange-50 w-fit rounded-xl">{a.icon}</div>
                           <h4 className="text-[14px] font-black text-gray-800 mb-1">{a.title}</h4>
                           <p className="text-[11px] font-bold text-gray-400">{a.desc}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           ) : (
             <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-20">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-4 duration-500`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${msg.role === 'user' ? 'bg-orange-500 text-white border-orange-600' : 'bg-white border-gray-200 text-orange-500'}`}>
                      {msg.role === 'user' ? <UserIcon size={20} /> : <Brain size={20} />}
                    </div>
                    <div className={`max-w-[85%] px-7 py-5 rounded-[28px] text-[15px] font-semibold leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}>
                       <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                         {msg.content}
                       </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex gap-5 animate-pulse">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200 text-orange-500 flex items-center justify-center"><Brain size={20} /></div>
                    <div className="px-7 py-5 rounded-[28px] rounded-tl-none bg-gray-200/50 text-gray-400 text-sm font-bold italic">Cortex is thinking...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
             </div>
           )}
        </div>

        {messages.length > 0 && (
          <div className="p-6 bg-gradient-to-t from-[#f3f4f6] via-[#f3f4f6] to-transparent z-10">
             <ChatInput onSend={handleSend} isTyping={isSending} />
          </div>
        )}
      </main>
    </div>
  );
}

const UserIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default TutorChat;