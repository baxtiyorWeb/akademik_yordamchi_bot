import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, UploadCloud, CheckCircle2, ShieldCheck, Brain } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { supabase } from '../supabase';

const IconGradient = () => (
  <svg width="0" height="0" className="absolute">
    <linearGradient id="v-blue-purple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3b82f6" />
      <stop offset="100%" stopColor="#9333ea" />
    </linearGradient>
  </svg>
);

function VoiceAdmin() {
  const [mode, setMode] = useState('idle'); 
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [waveforms, setWaveforms] = useState(Array(30).fill(5));
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const progressInterval = useRef(null);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 64;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const newWaveforms = Array.from(dataArray).slice(0, 30).map(val => (val / 255) * 100 + 5);
        setWaveforms(newWaveforms);
        animationRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        uploadMasterVoice(blob);
      };
      mediaRecorderRef.current.start();
      return stream;
    } catch (err) {
      toast.error("Mikrofonga ruxsat berilmadi!");
      return null;
    }
  };

  const uploadMasterVoice = async (blob) => {
    setMode('processing');
    const fileName = `master_system_voice.webm`;
    try {
      const { data, error } = await supabase.storage
        .from('system_assets')
        .upload(fileName, blob, { upsert: true });
      if (error) throw error;
      toast.success('Master Ovoz yangilandi!');
      setMode('success');
    } catch (err) {
      toast.error('Saqlashda xatolik');
      setMode('idle');
    }
  };

  const stopMic = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    if (sourceRef.current) sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const handleBeginRecording = async () => {
    const stream = await startMic();
    if (stream) {
      setMode('recording');
      setTrainingProgress(0);
      progressInterval.current = setInterval(() => {
        setTrainingProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval.current);
            stopMic();
            return 100;
          }
          return prev + 1;
        });
      }, 150);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fcfdfe] overflow-hidden p-8">
      <IconGradient />
      <Toaster position="top-right" richColors />
      <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[40px] shadow-sm relative overflow-hidden max-w-4xl mx-auto w-full">
        <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg text-slate-400 font-bold text-[10px] uppercase tracking-widest border border-slate-100">
           <ShieldCheck size={12} /> Master Voice Setup (Hidden)
        </div>

        {mode === 'idle' && (
          <div className="flex flex-col items-center text-center max-w-md animate-in fade-in">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl"><Mic size={32} /></div>
            <h1 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Master Ovozni O'zgartirish</h1>
            <p className="text-[12px] text-slate-400 font-bold mb-8 uppercase tracking-widest">Faqat Admin uchun</p>
            <button onClick={() => setMode('training')} className="px-10 py-3 bg-slate-900 text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-xl">SOZLASHNI BOSHLASH</button>
          </div>
        )}

        {mode === 'training' && (
          <div className="max-w-xl px-10 text-center animate-in slide-in-from-bottom-4">
            <h2 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-tight">Ovozli Namuna Yozish</h2>
            <div className="p-6 bg-slate-50 rounded-2xl text-left mb-8 shadow-inner italic text-slate-600 text-sm">
               "Ushbu yozuv butun platformaning yagona ovozi bo'ladi. Matnni aniq o'qing."
            </div>
            <button onClick={handleBeginRecording} className="px-10 py-3.5 bg-slate-900 text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-xl">YOZISHNI BOSHLASH</button>
          </div>
        )}

        {mode === 'recording' && (
          <div className="flex flex-col items-center animate-in fade-in">
            <div className="flex items-end gap-1.5 h-32 mb-10">
              {waveforms.map((h, i) => (
                <div key={i} className="w-1.5 bg-gradient-to-t from-blue-500 to-purple-600 rounded-full" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="w-64 h-1.5 bg-slate-100 rounded-full mb-10 overflow-hidden">
               <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600" style={{ width: `${trainingProgress}%` }} />
            </div>
            <button onClick={() => { stopMic(); setMode('idle'); }} className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-xl"><Square size={20} fill="currentColor" /></button>
          </div>
        )}

        {mode === 'processing' && (
          <div className="flex flex-col items-center animate-in zoom-in-95">
             <UploadCloud size={48} className="text-indigo-600 animate-bounce mb-6" />
             <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Tizimga yuklanmoqda...</h2>
          </div>
        )}

        {mode === 'success' && (
          <div className="flex flex-col items-center text-center animate-in zoom-in-95">
             <CheckCircle2 size={56} className="text-emerald-500 mb-6" />
             <h2 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Master Ovoz Yangilandi!</h2>
             <button onClick={() => setMode('idle')} className="mt-8 px-10 py-3 bg-slate-900 text-white rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-xl">TAYYOR</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VoiceAdmin;
