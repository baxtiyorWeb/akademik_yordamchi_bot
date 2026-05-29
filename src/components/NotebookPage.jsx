import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Trash2, Copy, BookOpen, 
  Search, Plus, Calendar, ExternalLink, Sparkles
} from 'lucide-react';
import { useNotebook } from '../hooks/useNotebook';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import NotebookEntryView from './NotebookEntryView';

const IconGradient = () => (
  <svg width="0" height="0" className="absolute">
    <linearGradient id="nb-blue-purple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#9333ea" />
    </linearGradient>
  </svg>
);

function NotebookPage({ session }) {
  const { entries, isLoading, deleteEntry } = useNotebook(session);
  const [activeEntry, setActiveEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = entries.filter(entry =>
    entry.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Nusxa olindi');
  };

  const handleDelete = (id) => {
    deleteEntry(id);
    if (activeEntry?.id === id) setActiveEntry(null);
    toast.info('O\'chirildi');
  };

  if (activeEntry) {
    return <NotebookEntryView entry={activeEntry} session={session} onBack={() => setActiveEntry(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfdfe] overflow-hidden">
      <IconGradient />

      {/* Header */}
      <div className="px-4 md:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white sticky top-0 z-30">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notebook LM</h1>
          <p className="text-xs text-slate-400 mt-0.5">{filteredEntries.length} ta yozuv</p>
        </div>

        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Qidirish..."
              className="w-full bg-slate-50 border border-slate-200 pl-11 py-3 rounded-2xl text-sm focus:outline-none focus:border-indigo-200 transition-all"
            />
          </div>

          <button className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-medium transition-all active:scale-95">
            <Plus size={20} /> <span className="hidden sm:inline">Yangi</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-8">
              <BookOpen size={48} stroke="url(#nb-blue-purple)" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Hali hech narsa yo'q</h3>
            <p className="text-slate-500 mt-2 max-w-xs">Chatlardan muhim qismlarni saqlang</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setActiveEntry(entry)}
                className="group bg-white border border-slate-100 rounded-3xl p-6 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer active:scale-[0.985] flex flex-col h-[340px] relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar size={14} /> {new Date(entry.created_at).toLocaleDateString('uz-UZ')}
                  </span>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => copyToClipboard(entry.content)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mt-5 line-clamp-2 leading-tight group-hover:text-indigo-700 transition-colors">
                  {entry.title || 'Nomsiz yozuv'}
                </h3>

                <div className="flex-1 mt-4 overflow-hidden relative">
                  <div className="prose prose-sm text-slate-600 line-clamp-6 text-[14.2px] leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {entry.content}
                    </ReactMarkdown>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
                    <Sparkles size={15} stroke="url(#nb-blue-purple)" />
                    AI Note
                  </div>
                  <div className="text-indigo-600 text-xs font-bold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    Ochish <ExternalLink size={14} />
                  </div>
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