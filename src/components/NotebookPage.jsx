import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Trash2, Copy, BookOpen, 
  Search, Plus, Brain, Calendar, Clock, Download, ExternalLink, Sparkles
} from 'lucide-react';
import { useNotebook } from '../hooks/useNotebook';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// SVG Gradient component to be used by icons
const IconGradient = () => (
  <svg width="0" height="0" className="absolute">
    <linearGradient id="nb-blue-purple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#9333ea" />
    </linearGradient>
  </svg>
);

function NotebookPage({ session }) {
  const navigate = useNavigate();
  const { entries, isLoading, deleteEntry } = useNotebook(session);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('NUSXA OLINDI');
  };

  const handleDelete = (id) => {
    deleteEntry(id);
    toast.info('O\'CHIRILDI');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfdfe] overflow-hidden">
      <IconGradient />
      
      {/* --- BALANCED HEADER --- */}
      <div className="px-8 py-8 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Notebook LM</h1>
          <p className="text-[12px] text-slate-400 font-medium uppercase tracking-widest">{entries.length} TA SAQLANGAN MANBA</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative group flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" placeholder="Qidirish..." className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-[13px] outline-none focus:ring-2 focus:ring-slate-100 transition-all" />
          </div>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl text-[13px] font-medium shadow-xl shadow-slate-100">
            <Plus size={16} /> YANGI
          </button>
        </div>
      </div>

      {/* --- BALANCED GRID --- */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 mb-6 border border-slate-100 shadow-sm">
              <BookOpen size={40} stroke="url(#nb-blue-purple)" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">Notebook LM bo'sh</h3>
            <p className="text-sm text-slate-400 font-medium">Chatlardan muhim qismlarni saqlang.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {entries.map((entry) => (
              <div key={entry.id} className="group bg-white border border-slate-100 p-8 rounded-[36px] hover:border-indigo-100 transition-all flex flex-col h-[320px] shadow-sm hover:shadow-2xl hover:shadow-indigo-50/50 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 uppercase tracking-widest">
                    <Calendar size={12} stroke="url(#nb-blue-purple)" /> {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => copyToClipboard(entry.content)} className="p-2 hover:text-indigo-600 text-slate-300 transition-colors"><Copy size={14} /></button>
                    <button onClick={() => handleDelete(entry.id)} className="p-2 hover:text-rose-500 text-slate-300 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>

                <h3 className="text-[16px] font-semibold text-slate-900 mb-4 line-clamp-1 group-hover:text-indigo-600 transition-colors">{entry.title || 'Untitled'}</h3>

                <div className="flex-1 overflow-hidden relative">
                  <div className="prose prose-sm max-w-none text-slate-500 text-[13px] line-clamp-[6] leading-relaxed font-medium italic text-left">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{entry.content}</ReactMarkdown>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent opacity-90"></div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <Sparkles size={14} stroke="url(#nb-blue-purple)" />
                     <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">AI Note</span>
                  </div>
                  <button className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 transition-all flex items-center gap-1.5 uppercase tracking-widest">
                    OCHISH <ExternalLink size={12} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotebookPage;
