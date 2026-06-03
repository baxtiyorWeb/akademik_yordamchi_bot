import React, { useState } from 'react';
import { Globe, BookOpen, Bell, ArrowRight, Check, Award, Compass, Zap } from 'lucide-react';
import { toast } from 'sonner';

const COUNTRIES = [
  { code: 'UZ', name: 'Oʻzbekiston', flag: '🇺🇿' },
  { code: 'US', name: 'AQSH (USA)', flag: '🇺🇸' },
  { code: 'GB', name: 'Buyuk Britaniya', flag: '🇬🇧' },
  { code: 'RU', name: 'Rossiya', flag: '🇷🇺' },
  { code: 'KR', name: 'Koreya', flag: '🇰🇷' },
  { code: 'CN', name: 'Xitoy', flag: '🇨🇳' },
];

const LANGUAGES = [
  { code: 'en', name: 'Ingliz tili', desc: 'English language' },
  { code: 'ru', name: 'Rus tili', desc: 'Русский язык' },
  { code: 'kr', name: 'Koreys tili', desc: '한국어' },
  { code: 'ar', name: 'Arab tili', desc: 'العربية' },
  { code: 'uz', name: 'Oʻzbek tili', desc: 'Oʻzbek tili' },
];

const GOALS = [
  { id: 'ielts', title: 'IELTS Band 7.5+', desc: 'Xalqaro sertifikat olish va xorijda oʻqish', icon: Award, color: 'text-amber-500 bg-amber-50 border-amber-100' },
  { id: 'coding', title: 'Dasturlash (Coding)', desc: 'IT mutaxassisi boʻlish va real loyihalar yaratish', icon: Zap, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
  { id: 'academic', title: 'Akademik oʻzlashtirish', desc: 'Maktab, litsey yoki oliy taʼlim fanlarini oʻrganish', icon: Compass, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
  { id: 'self_dev', title: 'Shaxsiy rivojlanish', desc: 'Dunyoqarashni kengaytirish va yangi bilimlar olish', icon: BookOpen, color: 'text-purple-500 bg-purple-50 border-purple-100' },
];

const REMINDER_TIMES = ['09:00', '12:00', '15:00', '18:00', '21:00'];

const OnboardingModal = ({ isOpen, onComplete, isSaving }) => {
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState('UZ');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedGoal, setSelectedGoal] = useState('ielts');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('15:00');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      const data = {
        country: selectedCountry,
        learning_language: selectedLanguage,
        personal_goals: selectedGoal,
        reminder_time: reminderTime,
        notifications_enabled: notificationsEnabled,
        onboarding_completed: true,
      };
      onComplete(data);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.warning('Sizning brauzeringizda bildirishnomalar qoʻllab-quvvatlanmaydi.');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Eslatmalar muvaffaqiyatli faollashtirildi! 🔔');
        setNotificationsEnabled(true);
      } else {
        toast.error('Bildirishnomalarga ruxsat berilmadi.');
        setNotificationsEnabled(false);
      }
    } catch (err) {
      console.error('Notification error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4">
      {/* Wave animation styles */}
      <style>{`
        @keyframes modalShow {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal {
          animation: modalShow 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-modal">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 flex">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content Container */}
        <div className="p-6 sm:p-10 flex-1 flex flex-col min-h-[420px]">
          
          {/* Header */}
          <div className="mb-8 text-center sm:text-left">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
              Sizga moslashish · {step}-bosqich
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-3 tracking-tight">
              {step === 1 && "Mamlakat va oʻrganish tilini tanlang"}
              {step === 2 && "Asosiy oʻquv maqsadingiz nima?"}
              {step === 3 && "Eslatmalar va dars jadvalini sozlang"}
            </h2>
            <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
              {step === 1 && "Sizga mos xizmatlar va til muhitini yaratishimiz uchun kerak."}
              {step === 2 && "Bizning AI oʻqituvchimiz ushbu maqsadga qarab siz bilan suhbat quradi."}
              {step === 3 && "Biz sizni oʻrganishdan toʻxtab qolmasligingiz uchun eslatib turamiz."}
            </p>
          </div>

          {/* Steps Body */}
          <div className="flex-1 flex flex-col justify-center">
            {step === 1 && (
              <div className="space-y-6">
                {/* Country Grid */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Mamlakatingiz</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {COUNTRIES.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setSelectedCountry(c.code)}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                          selectedCountry === c.code 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold' 
                            : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-lg leading-none">{c.flag}</span>
                        <span className="text-[13px] truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Language selection */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Qaysi tilni oʻrganmoqchisiz?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => setSelectedLanguage(l.code)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                          selectedLanguage === l.code 
                            ? 'bg-purple-50 border-purple-300 text-purple-900 font-semibold' 
                            : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div>
                          <p className="text-[13px] leading-none">{l.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-normal">{l.desc}</p>
                        </div>
                        {selectedLanguage === l.code && (
                          <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white shrink-0">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-3">
                {GOALS.map(g => {
                  const Icon = g.icon;
                  const isSelected = selectedGoal === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGoal(g.id)}
                      className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all ${
                        isSelected 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected ? 'bg-white/10 border-white/20 text-white' : g.color
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className={`text-[14px] font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{g.title}</p>
                        <p className={`text-[11px] mt-1 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{g.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {/* OneSignal / Notifications opt-in */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 text-indigo-600">
                    <Bell size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-bold text-slate-900">Eslatmalar (Push Notifications)</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Siz uchun dars vaqti boʻlganda yoki yangi uy vazifasi berilganda eslatib turamiz.
                    </p>
                    <button 
                      onClick={requestNotificationPermission}
                      className={`mt-3.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        notificationsEnabled 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {notificationsEnabled ? 'Yoqilgan ✓' : 'Ruxsat berish 🔔'}
                    </button>
                  </div>
                </div>

                {/* Reminder time select */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Kunlik eslatma vaqti</label>
                  <div className="grid grid-cols-5 gap-2">
                    {REMINDER_TIMES.map(t => (
                      <button
                        key={t}
                        onClick={() => setReminderTime(t)}
                        className={`py-3 rounded-xl border text-center text-[12px] font-semibold transition-all ${
                          reminderTime === t 
                            ? 'bg-indigo-600 border-indigo-600 text-white font-bold' 
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-10 pt-5 border-t border-slate-50 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button 
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Orqaga
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              disabled={isSaving}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-semibold text-[13px] hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center gap-2 shadow-lg shadow-slate-100 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{step === 3 ? "Boshlash" : "Keyingisi"}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
