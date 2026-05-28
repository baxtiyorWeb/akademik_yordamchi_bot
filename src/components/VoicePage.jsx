import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Sparkles, Play, Square, Headphones, MessageCircle, Radio, Settings2, ShieldCheck, XCircle } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const IconGradient = () => (
  <svg width="0" height="0" className="absolute">
    <linearGradient id="v-blue-purple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#9333ea" />
    </linearGradient>
  </svg>
);

function VoicePage() {
  const [mode, setMode] = useState('idle'); 
  const [waveforms, setWaveforms] = useState(Array(30).fill(5));
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_KEY;
  const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; 

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'uz-UZ';

      recognitionRef.current.onresult = (event) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const final = event.results[i][0].transcript;
            setTranscript(final);
            // Savol tugaganini aniqlash (Silence detection)
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
               handleAiProcess(final);
            }, 1200); // 1.2 soniya jim tursa, savol deb qabul qiladi
          } else {
            interimText += event.results[i][0].transcript;
            setTranscript(interimText);
          }
        }
      };
    }
    return () => stopSession();
  }, []);

  const handleAiProcess = async (text) => {
    if (!text.trim() || mode === 'thinking' || mode === 'speaking') return;
    
    // AI ishlayotgan paytda mikrofonni vaqtinchalik to'xtatish (Muhim!)
    if (recognitionRef.current) recognitionRef.current.stop();
    
    setMode('thinking');
    try {
      const aiText = await getAiResponse(text);
      setAiResponse(aiText);
      await generateElevenLabsAudio(aiText);
    } catch (err) {
      setMode('listening');
      if (recognitionRef.current) recognitionRef.current.start();
    }
  };

  const getAiResponse = async (userMessage) => {
    if (!OPENROUTER_API_KEY) return "OpenRouter API Key topilmadi.";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "Sen Typer AI-ning ovozli yordamchisisan. Foydalanuvchi bilan o'zbek tilida qisqa, 1-2 gapdan iborat javob qaytar." },
          { role: "user", content: userMessage }
        ]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  };

  const generateElevenLabsAudio = async (text) => {
    if (!ELEVENLABS_API_KEY) return;
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      audioPlayerRef.current = new Audio(audioUrl);
      setMode('speaking');
      audioPlayerRef.current.onended = () => {
        setMode('listening');
        // AI gapirib bo'lgach, mikrofonni qayta yoqish
        if (recognitionRef.current) recognitionRef.current.start();
      };
      audioPlayerRef.current.play();
    } catch (err) {
      setMode('listening');
      if (recognitionRef.current) recognitionRef.current.start();
    }
  };

  const startSession = async () => {
    try {
      // Mikrofonni shovqinni o'chirish rejimi bilan ochish
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        setWaveforms(Array.from(dataArray).slice(0, 30).map(val => (val / 255) * 100 + 5));
        animationRef.current = requestAnimationFrame(updateWaveform);
      };
      
      updateWaveform();
      setMode('listening');
      if (recognitionRef.current) recognitionRef.current.start();
      toast.success('Smart Muloqot boshlandi');
    } catch (err) {
      toast.error('Mikrofonga ruxsat berilmadi');
    }
  };

  const stopSession = () => {
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    if (recognitionRef.current) recognitionRef.current.stop();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (sourceRef.current) sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setMode('idle');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfdfe] overflow-hidden p-4">
      <IconGradient />
      <Toaster position="top-right" richColors />
      <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-50 rounded-[40px] shadow-sm relative overflow-hidden">
        
        {/* Smart Status */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
           <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm transition-all ${
             mode === 'listening' ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'
           }`}>
              <Mic size={12} className={mode === 'listening' ? 'animate-pulse' : ''} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{mode === 'listening' ? 'Sizni eshityapman' : 'Mic Off'}</span>
           </div>
        </div>

        <div className={`absolute inset-0 transition-all duration-1000 opacity-20 ${
          mode === 'listening' ? 'bg-blue-400' : 
          mode === 'speaking' ? 'bg-emerald-400' :
          mode === 'thinking' ? 'bg-indigo-400 animate-pulse' : 'bg-transparent'
        }`} />

        {mode === 'idle' && (
          <div className="flex flex-col items-center text-center max-w-md z-10 animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 bg-white border border-slate-50 rounded-[32px] shadow-xl flex items-center justify-center mb-8"><Headphones size={36} stroke="url(#v-blue-purple)" /></div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Lingo Voice</h1>
            <p className="text-[12px] text-slate-400 font-bold mb-10 uppercase tracking-widest">Smart Noise Cancellation Mode</p>
            <button onClick={startSession} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[12px] font-bold shadow-xl uppercase tracking-widest">MULOQOTNI BOSHLASH</button>
          </div>
        )}

        {(mode === 'listening' || mode === 'speaking' || mode === 'thinking') && (
          <div className="flex flex-col items-center text-center z-10 animate-in fade-in w-full max-w-2xl px-10">
            <div className="flex items-end gap-2.5 h-48 mb-12">
              {waveforms.map((h, i) => (
                <div key={i} className={`w-3 rounded-full transition-all duration-75 shadow-lg ${
                  mode === 'speaking' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-gradient-to-t from-blue-500 to-purple-600 shadow-blue-100'
                }`} style={{ height: `${mode === 'thinking' ? 15 : h}%` }} />
              ))}
            </div>
            <div className="mb-12 min-h-[80px]">
               <p className={`text-slate-800 font-medium italic leading-relaxed transition-all duration-500 ${mode === 'speaking' ? 'text-[22px] font-bold text-slate-900 italic-none' : 'text-[18px]'}`}>
                  {mode === 'speaking' ? aiResponse : (transcript || "Sizni eshitmoqdaman...")}
               </p>
            </div>
            <button onClick={stopSession} className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95"><Square size={24} fill="white" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VoicePage;
