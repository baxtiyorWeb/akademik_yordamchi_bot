import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, Headphones, BookOpen, PenTool,
  Send, Mic, MicOff, Volume2, VolumeX, Play, Pause,
  RotateCcw, ChevronRight, Award, TrendingUp, X,
  CheckCircle, XCircle, Loader2, Copy, Check,
  Smile, Scale, Flame, Keyboard, BookMarked,
  Star, Lightbulb, FileText, HelpCircle, Eye, Download, Share2, ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

import {
  streamIELTSChat,
  streamListeningSection,
  generateReadingPassage,
  parseListeningResponse,
  IELTS_SUGGESTED_PROMPTS,
  IELTS_TYPING_SENTENCES,
  getRandomTypingSentence,
  estimateWritingBand,
} from '../api/ielts';

// ============================================================
// CONSTANTS
// ============================================================

const SECTIONS = {
  SPEAKING: {
    key: 'SPEAKING',
    label: 'Speaking',
    icon: Mic,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    ring: 'ring-blue-400',
    description: 'Part 1, 2, 3 — Baho va feedback',
  },
  LISTENING: {
    key: 'LISTENING',
    label: 'Listening',
    icon: Headphones,
    color: 'pink',
    gradient: 'from-pink-500 to-rose-500',
    lightBg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
    ring: 'ring-pink-400',
    description: 'AI audio o\'qiydi — Savollar yechish',
  },
  READING: {
    key: 'READING',
    label: 'Reading',
    icon: BookOpen,
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    ring: 'ring-purple-400',
    description: 'Passaj + True/False/MCQ',
  },
  WRITING: {
    key: 'WRITING',
    label: 'Writing',
    icon: PenTool,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    ring: 'ring-emerald-400',
    description: 'Task 1 & 2 — Baholash va tuzatish',
  },
};

const MOODS = [
  { key: 'gentle', label: 'Muloyim', icon: Smile, activeClass: 'bg-teal-500 text-white' },
  { key: 'normal', label: 'Muvozanat', icon: Scale, activeClass: 'bg-blue-500 text-white' },
  { key: 'strict', label: 'Qattiq', icon: Flame, activeClass: 'bg-red-500 text-white' },
];

const WRITING_TASKS = IELTS_SUGGESTED_PROMPTS.WRITING;

// ============================================================
// MARKDOWN MESSAGE
// ============================================================

const AIMessage = ({ content, onSpeak, speaking }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Nusxa olindi');
  };

  return (
    <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100 not-prose">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Nusxa olindi' : 'Nusxa ol'}
        </button>
        {onSpeak && (
          <button
            onClick={onSpeak}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
            {speaking ? 'To\'xtat' : 'Tinglash'}
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// AUDIO PLAYER
// ============================================================

const AudioPlayer = ({ text, autoPlay = false }) => {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const utterRef = useRef(null);

  const getCleanText = (t) =>
    t.replace(/<[^>]+>/g, '').replace(/[*#`_]/g, '').trim();

  const play = useCallback((spd = speed) => {
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(getCleanText(text));
    utt.lang = 'en-GB';
    utt.rate = spd;
    utt.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find(
      (v) => v.lang === 'en-GB' || v.name.includes('British') || v.name.includes('UK')
    );
    if (ukVoice) utt.voice = ukVoice;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    utterRef.current = utt;
    window.speechSynthesis.speak(utt);
    setPlaying(true);
  }, [text, speed]);

  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  const toggle = () => (playing ? stop() : play());

  useEffect(() => {
    if (autoPlay) {
      setTimeout(() => play(), 400);
    }
    return () => window.speechSynthesis.cancel();
  }, []);

  const changeSpeed = (s) => {
    setSpeed(s);
    if (playing) {
      stop();
      setTimeout(() => play(s), 100);
    }
  };

  return (
    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <Headphones size={14} className="text-slate-500" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">IELTS Audio</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all ${
            playing ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-blue-500 rounded-full transition-all duration-300 ${playing ? 'w-full' : 'w-0'}`}
            style={{ transition: playing ? 'width 30s linear' : 'width 0s' }}
          />
        </div>
        <div className="flex gap-1">
          {[0.75, 1, 1.25].map((s) => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                speed === s ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
        <button onClick={() => { stop(); setTimeout(() => play(), 100); }} className="text-slate-400 hover:text-slate-600 transition-colors">
          <RotateCcw size={14} />
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">Audio to'xtatish va qayta boshlash uchun tugmalardan foydalaning</p>
    </div>
  );
};

// ============================================================
// MESSAGE ROW
// ============================================================

const MessageRow = ({ msg, speakingId, setSpeakingId }) => {
  const isUser = msg.role === 'user';
  const isThisSpeaking = speakingId === msg.id;

  const handleSpeak = () => {
    if (isThisSpeaking) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    } else {
      window.speechSynthesis.cancel();
      setSpeakingId(msg.id);
      const utt = new SpeechSynthesisUtterance(msg.content.replace(/[*#`_]/g, '').trim());
      utt.lang = 'en-GB';
      utt.onend = () => setSpeakingId(null);
      window.speechSynthesis.speak(utt);
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isUser ? 'bg-slate-800 text-white' : 'bg-gradient-to-br from-blue-400 to-purple-600 text-white'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{msg.content}</p>
        ) : (
          <>
            <AIMessage
              content={msg.content}
              onSpeak={handleSpeak}
              speaking={isThisSpeaking}
            />
            {msg.audioText && <AudioPlayer text={msg.audioText} autoPlay />}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================
// READING PANEL
// ============================================================

const ReadingPanel = ({ mood }) => {
  const [state, setState] = useState('welcome'); // welcome | loading | active
  const [passage, setPassage] = useState(null);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  const load = async (topic) => {
    setState('loading');
    try {
      const data = await generateReadingPassage(topic);
      setPassage(data);
      setAnswers({});
      setChecked(false);
      setState('active');
    } catch {
      toast.error('Passaj yaratishda xatolik. Qayta urinib ko\'ring.');
      setState('welcome');
    }
  };

  const select = (qi, opt) => {
    if (checked) return;
    setAnswers((prev) => ({ ...prev, [qi]: opt }));
  };

  const check = () => setChecked(true);

  const score = checked
    ? (passage?.questions || []).filter((q, i) => answers[i] === q.answer).length
    : 0;

  if (state === 'welcome') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">
            <BookOpen size={48} className="mx-auto text-purple-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Reading Practice</h3>
          <p className="text-sm text-slate-600 mb-6">Mavzu tanlang — AI haqiqiy IELTS passaj yaratadi</p>
          <div className="grid grid-cols-2 gap-3">
            {IELTS_SUGGESTED_PROMPTS.READING.map((r) => (
              <button
                key={r.topic}
                onClick={() => load(r.topic)}
                className="p-3 text-sm font-medium text-slate-700 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-all text-left"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-purple-500 mx-auto mb-3" size={32} />
          <p className="text-slate-600 text-sm">IELTS passaj yaratilmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Passage */}
      <div className="flex-1 overflow-y-auto p-6 border-r border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{passage?.title}</h3>
          <button
            onClick={() => setState('welcome')}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <RotateCcw size={12} /> Yangi passaj
          </button>
        </div>
        <div className="prose prose-sm max-w-none text-slate-800 leading-loose">
          {(passage?.passage || '').split('\n\n').map((para, i) => (
            <p key={i} className="mb-4">
              <span className="font-semibold text-slate-400 mr-2">[{i + 1}]</span>
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="w-80 flex-shrink-0 overflow-y-auto p-4 bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Savollar</span>
          {checked && (
            <span className="text-sm font-bold text-purple-700">
              {score}/{passage?.questions?.length} ✅
            </span>
          )}
        </div>
        <div className="space-y-3">
          {(passage?.questions || []).map((q, qi) => (
            <div key={qi} className="bg-white rounded-xl p-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-400 mb-1">
                Q{qi + 1} · {q.type}
              </p>
              <p className="text-sm text-slate-800 mb-2 leading-relaxed">{q.text}</p>
              <div className="space-y-1">
                {(q.options || []).map((opt) => {
                  let cls = 'text-slate-700 border-slate-200 hover:border-purple-300';
                  if (answers[qi] === opt) cls = 'border-purple-400 text-purple-700 bg-purple-50';
                  if (checked && opt === q.answer) cls = 'border-emerald-400 text-emerald-700 bg-emerald-50';
                  if (checked && answers[qi] === opt && opt !== q.answer)
                    cls = 'border-red-400 text-red-700 bg-red-50';
                  return (
                    <button
                      key={opt}
                      onClick={() => select(qi, opt)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg border text-xs transition-all ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {checked && (
                <p className={`text-xs mt-2 leading-relaxed ${answers[qi] === q.answer ? 'text-emerald-600' : 'text-red-600'}`}>
                  {answers[qi] === q.answer 
                    ? <><CheckCircle size={12} className="inline mr-1" /> To'g'ri</> 
                    : <><XCircle size={12} className="inline mr-1" /> To'g'ri: {q.answer}</>} — {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
        {!checked && (
          <button
            onClick={check}
            className="w-full mt-3 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all"
          >
            Javoblarni tekshir ✅
          </button>
        )}
        {checked && (
          <button
            onClick={() => setState('welcome')}
            className="w-full mt-3 py-2.5 rounded-xl border border-purple-300 text-purple-700 text-sm font-semibold hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
          >
            <BookOpen size={14} />
            Yangi passaj
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// WRITING TYPING DRILL
// ============================================================

const TypingDrill = () => {
  const [target, setTarget] = useState(() => getRandomTypingSentence());
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const reset = (newTarget = getRandomTypingSentence(target)) => {
    setTarget(newTarget);
    setInput('');
    setStartTime(null);
    setDone(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    if (!startTime && val.length > 0) setStartTime(Date.now());
    setInput(val);
    if (val === target) setDone(true);
  };

  const chars = target.split('');
  const errors = input.split('').filter((c, i) => c !== chars[i]).length;
  const accuracy = input.length > 0 ? Math.round(((input.length - errors) / input.length) * 100) : 100;
  const wpm = startTime && input.length > 10
    ? Math.round((input.split(' ').length) / ((Date.now() - startTime) / 60000))
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-600">Typing Drill — IELTS jumlasi</p>
          <button onClick={() => reset()} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <RotateCcw size={12} /> Yangi jumla
          </button>
        </div>

        {/* Target display */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3 font-mono text-sm leading-loose">
          {chars.map((c, i) => {
            let cls = 'text-slate-400';
            if (i < input.length) {
              cls = input[i] === c ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50 rounded';
            } else if (i === input.length) {
              cls = 'border-b-2 border-blue-400 text-slate-700';
            }
            return (
              <span key={i} className={cls}>
                {c === ' ' ? '\u00A0' : c}
              </span>
            );
          })}
        </div>

        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInput}
          disabled={done}
          rows={2}
          placeholder="Bu yerga yozing..."
          className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          autoFocus
        />

        <div className="flex gap-4 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Aniqlik:</span>
            <span className={`font-bold ${accuracy >= 95 ? 'text-emerald-600' : accuracy >= 80 ? 'text-amber-600' : 'text-red-500'}`}>
              {accuracy}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">WPM:</span>
            <span className="font-bold text-blue-600">{wpm || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Xato:</span>
            <span className={`font-bold ${errors === 0 ? 'text-emerald-600' : 'text-red-500'}`}>{errors}</span>
          </div>
        </div>

        {done && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <p className="text-emerald-700 font-bold mb-1"><CheckCircle size={16} className="inline mr-2" />Mukammal! Aniqlik: {accuracy}% · WPM: {wpm}</p>
            <button onClick={() => reset()} className="mt-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all">
              Keyingi jumla →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// CHAT PANEL (Speaking, Listening, Writing)
// ============================================================

const ChatPanel = ({ sectionKey, mood, writingMode, essayText, essayTask }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const idCounter = useRef(0);

  const newId = () => `msg-${++idCounter.current}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMsg = (role, content, audioText = null) => {
    const msg = { id: newId(), role, content, audioText };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setInput('');
    addMsg('user', userText);
    setLoading(true);

    // Build history for API
    const hist = messages.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

    try {
      let fullResponse = '';
      const tempId = newId();

      await streamIELTSChat({
        section: sectionKey,
        userMessage: userText,
        history: hist,
        mood,
        onChunk: (chunk) => {
          fullResponse = chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.id === tempId) {
              return [...prev.slice(0, -1), { ...last, content: chunk }];
            }
            return [...prev, { id: tempId, role: 'ai', content: chunk, audioText: null }];
          });
        },
      });

      // Parse audio for Listening
      if (sectionKey === 'LISTENING') {
        const { audioText, rest } = parseListeningResponse(fullResponse);
        if (audioText) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, content: rest || fullResponse, audioText } : m))
          );
        }
      }
    } catch (err) {
      addMsg('ai', '⚠️ Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
      toast.error('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Voice recognition
  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Ovoz yozish Chrome brauzeri talab qiladi');
      return;
    }
    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    let final = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setInput(final + interim);
    };
    rec.onend = () => {
      setMicActive(false);
      if (final.trim()) {
        setInput(final.trim());
        sendMessage(final.trim());
      }
    };
    rec.onerror = () => setMicActive(false);
    rec.start();
    recognitionRef.current = rec;
    setMicActive(true);
  };

  const cfg = SECTIONS[sectionKey];
  const prompts = IELTS_SUGGESTED_PROMPTS[sectionKey] || [];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className={`text-4xl w-16 h-16 rounded-2xl ${cfg.lightBg} flex items-center justify-center`}>
              {cfg.emoji}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{cfg.label} Practice</h3>
              <p className="text-sm text-slate-500 max-w-sm">{cfg.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-2">
              {prompts.slice(0, 4).map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p.prompt || `${p.label} haqida mashq qilaylik`)}
                  className={`p-3 text-xs font-medium text-slate-700 bg-white rounded-xl border border-slate-200 hover:${cfg.border} hover:${cfg.lightBg} hover:${cfg.text} transition-all text-left`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageRow key={msg.id} msg={msg} speakingId={speakingId} setSpeakingId={setSpeakingId} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-blue-500" />
                  <span className="text-sm text-slate-500">Javob tayyorlanmoqda...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        {/* Quick chips */}
        <div className="flex gap-2 flex-wrap mb-3">
          {sectionKey === 'SPEAKING' && [
            [<><ChevronRight size={12} className="inline mr-1" />Keyingi savol</>, 'Next question please'],
            [<><Star size={12} className="inline mr-1" />Band 9 namuna</>, 'Give me a Band 9 sample answer for this'],
            [<><Lightbulb size={12} className="inline mr-1" />Yaxshilash</>, 'How can I improve my answer?'],
            [<><BookMarked size={12} className="inline mr-1" />Lug\'at</>, 'What vocabulary should I use for this topic?'],
          ].map(([label, prompt]) => (
            <button key={String(label)} onClick={() => sendMessage(prompt)} className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-xs text-slate-600 transition-all border border-slate-200 hover:border-blue-200 flex items-center gap-1">
              {label}
            </button>
          ))}
          {sectionKey === 'LISTENING' && [
            [<><RotateCcw size={12} className="inline mr-1" />Qayta o\'qi</>, 'Read the audio passage again slowly'],
            [<><FileText size={12} className="inline mr-1" />Transkript</>, 'Show me the full transcript'],
            [<><CheckCircle size={12} className="inline mr-1" />Tekshir</>, 'Check my answers and explain each one'],
            [<><HelpCircle size={12} className="inline mr-1" />Quiz</>, 'Give me 5 questions about what I just heard'],
          ].map(([label, prompt]) => (
            <button key={label} onClick={() => sendMessage(prompt)} className="px-3 py-1 rounded-full bg-slate-100 hover:bg-pink-50 hover:text-pink-700 text-xs text-slate-600 transition-all border border-slate-200 hover:border-pink-200">
              {label}
            </button>
          ))}
          {sectionKey === 'WRITING' && [
            ['🔍 Grammatika', 'Check the grammar in my essay and list all errors'],
            ['✨ Lug\'at', 'Suggest more advanced vocabulary for my essay'],
            ['⭐ Band 9', 'Write a Band 9 sample for this writing task'],
            ['📊 Baho', `Please evaluate this essay: ${essayTask || ''}\n\nEssay:\n${essayText || '(hali yozilmagan)'}`],
          ].map(([label, prompt]) => (
            <button key={label} onClick={() => sendMessage(prompt)} className="px-3 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-xs text-slate-600 transition-all border border-slate-200 hover:border-emerald-200">
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-end">
          {sectionKey === 'SPEAKING' && (
            <button
              onClick={toggleMic}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border ${
                micActive
                  ? 'bg-red-500 text-white border-red-500 animate-pulse'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-pink-300 hover:text-pink-500'
              }`}
              title={micActive ? 'To\'xtat' : 'Gapiring'}
            >
              {micActive ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 bg-white">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                sectionKey === 'SPEAKING'
                  ? 'Javobingizni yozing yoki 🎙️ tugmasi bilan gapiring...'
                  : sectionKey === 'LISTENING'
                  ? 'Javoblaringizni yozing yoki savol bering...'
                  : 'AI ustoz bilan gaplashing...'
              }
              rows={2}
              className="w-full px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none"
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              input.trim() && !loading
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// WRITING PANEL
// ============================================================

const WritingPanel = ({ mood }) => {
  const [mode, setMode] = useState('task2'); // task2 | task1 | typing
  const [taskIndex, setTaskIndex] = useState(0);
  const [essay, setEssay] = useState('');

  const currentTask = WRITING_TASKS.filter((t) => t.type === (mode === 'typing' ? 'task2' : mode))[taskIndex % WRITING_TASKS.filter((t) => t.type === (mode === 'typing' ? 'task2' : mode)).length];
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const minWords = mode === 'task1' ? 150 : 250;
  const pct = Math.min(100, (wordCount / minWords) * 100);
  const bandEst = estimateWritingBand(wordCount, mode);

  const nextTask = () => {
    const filtered = WRITING_TASKS.filter((t) => t.type === mode);
    setTaskIndex((prev) => (prev + 1) % filtered.length);
    setEssay('');
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Mode selector */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-200 bg-slate-50">
        {[
          { key: 'task2', label: 'Task 2 — Essay' },
          { key: 'task1', label: 'Task 1 — Diagram' },
          { key: 'typing', label: '⌨️ Typing Drill' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setEssay(''); setTaskIndex(0); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              mode === m.key ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'typing' ? (
        <TypingDrill />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: task + essay */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Task */}
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                    {mode === 'task1' ? 'Task 1' : 'Task 2'}
                  </span>
                  <p className="text-sm text-amber-900 mt-1 leading-relaxed">{currentTask?.task}</p>
                </div>
                <button onClick={nextTask} className="flex-shrink-0 text-xs text-amber-700 border border-amber-300 rounded-lg px-2 py-1 hover:bg-amber-100 transition-all whitespace-nowrap">
                  Yangi ↺
                </button>
              </div>
            </div>
            {/* Word count */}
            <div className="flex items-center gap-3 px-6 py-2 border-b border-slate-200 bg-white">
              <span className="text-xs text-slate-500">So'zlar:</span>
              <span className={`text-sm font-bold ${wordCount >= minWords ? 'text-emerald-600' : 'text-slate-700'}`}>
                {wordCount}
              </span>
              <span className="text-xs text-slate-400">/ min {minWords}</span>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    pct >= 100 ? 'bg-emerald-500' : pct > 70 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{bandEst.note}</span>
            </div>
            {/* Essay textarea */}
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Essayingizni shu yerga yozing... AI sizning Task Achievement, Coherence, Lexical Resource va Grammatikangizni baholaydi."
              className="flex-1 px-6 py-4 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed"
            />
          </div>

          {/* Right: AI chat */}
          <div className="w-80 flex-shrink-0 flex flex-col border-l border-slate-200">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">✍️ AI Writing Coach</p>
            </div>
            <ChatPanel
              sectionKey="WRITING"
              mood={mood}
              writingMode={mode}
              essayText={essay}
              essayTask={currentTask?.task}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function IELTSPrep({ session }) {
  const [activeSection, setActiveSection] = useState('SPEAKING');
  const [mood, setMood] = useState('gentle');
  const [showStats, setShowStats] = useState(false);

  const stats = {
    SPEAKING: { band: 6.5, target: 7.5, pct: 65 },
    LISTENING: { band: 7.0, target: 8.0, pct: 70 },
    READING: { band: 6.8, target: 8.0, pct: 68 },
    WRITING: { band: 6.5, target: 7.5, pct: 60 },
  };

  const cfg = SECTIONS[activeSection];

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-gradient-to-b from-slate-50 to-white border-r border-slate-200">
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Award size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 font-display">IELTS Pro</span>
          </div>
          <p className="text-xs text-slate-500 ml-10">Band 9.0 maqsad</p>
        </div>

        {/* Mood selector */}
        <div className="px-4 py-3 border-b border-slate-200">
          <p className="text-xs text-slate-400 mb-2 font-medium">Ustoz uslubi</p>
          <div className="flex gap-1">
            {MOODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMood(m.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mood === m.key ? m.activeClass : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {Object.values(SECTIONS).map((sec) => (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                activeSection === sec.key
                  ? `bg-gradient-to-r ${sec.gradient} text-white shadow-sm`
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-lg">{sec.emoji}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">{sec.label}</div>
                <div className={`text-xs ${activeSection === sec.key ? 'text-white/75' : 'text-slate-400'}`}>
                  {stats[sec.key].band} → {stats[sec.key].target}
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Progress */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => setShowStats(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold hover:opacity-90 transition-all"
          >
            <TrendingUp size={14} /> Progress ko'rish
          </button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center gap-1 px-3 overflow-x-auto z-20">
        {Object.values(SECTIONS).map((sec) => (
          <button
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSection === sec.key
                ? `bg-gradient-to-r ${sec.gradient} text-white`
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {sec.emoji} {sec.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col md:mt-0 mt-14 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white">
          <div className={`w-9 h-9 rounded-xl ${cfg.lightBg} flex items-center justify-center text-xl`}>
            {cfg.emoji}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">{cfg.label}</h2>
            <p className="text-xs text-slate-500">{cfg.description}</p>
          </div>
        </div>

        {/* Section panels */}
        {activeSection === 'SPEAKING' && <ChatPanel sectionKey="SPEAKING" mood={mood} />}
        {activeSection === 'LISTENING' && <ChatPanel sectionKey="LISTENING" mood={mood} />}
        {activeSection === 'READING' && <ReadingPanel mood={mood} />}
        {activeSection === 'WRITING' && <WritingPanel mood={mood} />}
      </div>

      {/* Stats modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900">Sizning Progressingiz</h3>
              <button onClick={() => setShowStats(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              {Object.values(SECTIONS).map((sec) => {
                const s = stats[sec.key];
                return (
                  <div key={sec.key} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-slate-900">{sec.emoji} {sec.label}</span>
                      <span className="text-sm font-bold text-slate-700">{s.band} / {s.target}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${sec.gradient} transition-all duration-500`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">{100 - s.pct}% ko'proq tayyorlash kerak</p>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowStats(false)}
              className="w-full mt-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}