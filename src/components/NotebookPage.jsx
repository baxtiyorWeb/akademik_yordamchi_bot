import React, { useState } from 'react';
import { 
  ChevronLeft, Trash2, Copy, BookOpen, 
  Search, Plus, Calendar, ExternalLink, Sparkles, X, Brain
} from 'lucide-react';
import { useNotebook } from '../hooks/useNotebook';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
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
  const [previewEntry, setPreviewEntry] = useState(null);
  const [viewMode, setViewMode] = useState(null); // null, 'notes', 'exam'
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = entries.filter(entry =>
    (entry.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (entry.content?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Nusxa olindi');
  };

  const handleDelete = (id) => {
    if (window.confirm("Ushbu yozuvni o'chirishni xohlaysizmi?")) {
      deleteEntry(id);
      if (activeEntry?.id === id) setActiveEntry(null);
      if (previewEntry?.id === id) setPreviewEntry(null);
      toast.info('Yozuv o\'chirildi');
    }
  };

  const handleOpenCard = (entry) => {
    setPreviewEntry(entry);
    setViewMode(null);
  };

  const handleViewNotes = () => {
    setActiveEntry(previewEntry);
    setViewMode('notes');
  };

  const handleStartExam = () => {
    setViewMode('exam');
    setActiveEntry(previewEntry);
  };

  const handleClosePreview = () => {
    setPreviewEntry(null);
    setViewMode(null);
  };

  if (activeEntry && viewMode === 'notes') {
    return <NotebookEntryView entry={activeEntry} session={session} onBack={() => { setActiveEntry(null); setPreviewEntry(null); setViewMode(null); }} />;
  }

  if (activeEntry && viewMode === 'exam') {
    return <NotebookEntryView entry={activeEntry} session={session} onBack={() => { setActiveEntry(null); setPreviewEntry(null); setViewMode(null); }} startWithQuiz={true} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfdfe] overflow-hidden">
      <IconGradient />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 md:px-8 py-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Notebook LM</h1>
            <p className="text-xs text-slate-400 mt-1">{filteredEntries.length} ta saqlangan yozuv</p>
          </div>

          <div className="flex w-full sm:w-auto gap-3">
            <div className="relative flex-1 min-w-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Qidirish..."
                className="w-full bg-slate-50 border border-slate-200 pl-11 py-3.5 rounded-2xl text-[15px] focus:outline-none focus:border-indigo-300 transition-all"
              />
            </div>

            <button className="flex items-center gap-2 bg-slate-900 hover:bg-black active:scale-95 transition-all text-white px-5 py-3 rounded-2xl font-medium whitespace-nowrap">
              <Plus size={20} />
              <span className="hidden sm:inline">Yangi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-11 h-11 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-4">
            <div className="w-28 h-28 bg-slate-100 rounded-3xl flex items-center justify-center mb-8">
              <BookOpen size={56} stroke="url(#nb-blue-purple)" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-800">Notebook bo'sh</h3>
            <p className="text-slate-500 mt-3 max-w-xs">Chatlardan muhim qismlarni saqlang va ularni shu yerda ko'ring</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => handleOpenCard(entry)}
                className="group bg-white border border-slate-100 rounded-xl p-4 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all duration-200 cursor-pointer active:scale-[0.995] flex flex-col h-[220px] relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs flex items-center gap-1.5 text-slate-400">
                    <Calendar size={14} /> {new Date(entry.created_at).toLocaleDateString('uz-UZ')}
                  </span>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => copyToClipboard(entry.content)}
                      className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600"
                    >
                      <Copy size={17} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-[15px] leading-tight mt-4 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                  {entry.title || 'Nomsiz yozuv'}
                </h3>

                <div className="flex-1 mt-3 overflow-hidden relative text-sm">
                  <div className="prose prose-slate line-clamp-4 text-slate-600 leading-relaxed text-[13.5px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {entry.content}
                    </ReactMarkdown>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white to-transparent" />
                </div>

                <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-slate-400">
                    <Sparkles size={15} stroke="url(#nb-blue-purple)" />
                    AI Note
                  </div>
                  <div className="text-indigo-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Ochish <ExternalLink size={15} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-2 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white md:rounded-3xl rounded-t-3xl border border-slate-100 shadow-2xl w-full md:w-full max-w-2xl md:max-h-[80vh] max-h-[92vh] flex flex-col animate-in duration-300">

            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 md:p-6 border-b border-slate-100">
              <div className="flex-1">
                <h2 className="text-lg md:text-2xl font-semibold text-slate-900">
                  {previewEntry.title || 'Nomsiz yozuv'}
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  {new Date(previewEntry.created_at).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={handleClosePreview}
                className="p-2 md:p-2 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-slate-600"
                aria-label="close preview"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <div className="prose prose-slate max-w-none markdown-preview">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    code({node, inline, className, children, ...props}){
                      return inline ? <code className="bg-slate-100 px-1 rounded text-[13px] py-0.5">{children}</code> : <pre className="bg-[#0f172a] text-white rounded-2xl p-3 md:p-4 overflow-x-auto">{children}</pre>
                    }
                  }}
                >
                  {previewEntry.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Modal Footer - Action Buttons (responsive compact) */}
            <div className="border-t border-slate-100 p-3 md:p-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { handleClosePreview(); copyToClipboard(previewEntry.content); }}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-all"
              >
                <Copy size={16} />
                Nusxa olish
              </button>

              <button
                onClick={handleViewNotes}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-semibold transition-all"
              >
                <BookOpen size={16} />
                Konspekt
              </button>

              <button
                onClick={handleStartExam}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all"
              >
                <Brain size={16} />
                Imithon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotebookPage;