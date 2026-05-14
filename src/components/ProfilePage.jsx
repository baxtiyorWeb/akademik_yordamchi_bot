import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Shield, Zap, TrendingUp, BookOpen, 
  ChevronLeft, Camera, Settings, LogOut, Brain, Star,
  Award, CreditCard, ChevronRight, CheckCircle2,
  Globe, Calculator, Code2, PenTool, 
  MessageSquare, Sparkles, PieChart, Activity
} from 'lucide-react';
import { supabase } from '../supabase';

function ProfilePage({ session }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ messages: 0, notebook: 0 });
  const [dynamicData, setDynamicData] = useState({
    subjects: { language: 0, math: 0, coding: 0, writing: 0 },
    achievements: { solver: false, coder: false, polyglot: false },
    activity: [0, 0, 0, 0, 0, 0, 0],
    todaySpent: 0,
    totalSpent: 0
  });

  useEffect(() => {
    const fetchProfileAndData = async () => {
      if (!session?.user?.id) return;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileData) setProfile(profileData);

      const { data: notebookData } = await supabase
        .from('notebook_entries')
        .select('id')
        .eq('user_id', session.user.id);

      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', session.user.id);

      const messages = messagesData || [];
      const notebookCount = notebookData ? notebookData.length : 0;
      
      let lang = 0, math = 0, coding = 0, writing = 0;
      let todaySpent = 0;
      const totalSpent = messages.length;
      const activity = [0, 0, 0, 0, 0, 0, 0];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      messages.forEach(msg => {
        const text = (msg.content || '').toLowerCase();
        if (text.match(/ingliz|rus|tarjima|grammar|til|ielts/)) lang++;
        if (text.match(/matematika|misol|tenglama|math|qo'shish/)) math++;
        if (text.match(/kod|python|javascript|html|css|vibe-coding|dastur/)) coding++;
        if (text.match(/insho|referat|maqola|essay|yozish/)) writing++;

        const msgDate = new Date(msg.created_at);
        const dayIdx = msgDate.getDay() === 0 ? 6 : msgDate.getDay() - 1;
        activity[dayIdx]++;
        if (msgDate >= today) todaySpent++;
      });

      const totalSub = lang + math + coding + writing || 1;
      const subjects = {
        language: Math.min(100, Math.round((lang / totalSub) * 100) + (lang > 0 ? 20 : 0)),
        math: Math.min(100, Math.round((math / totalSub) * 100) + (math > 0 ? 20 : 0)),
        coding: Math.min(100, Math.round((coding / totalSub) * 100) + (coding > 0 ? 20 : 0)),
        writing: Math.min(100, Math.round((writing / totalSub) * 100) + (writing > 0 ? 20 : 0))
      };

      const achievements = {
        solver: math >= 5,
        coder: coding >= 1,
        polyglot: lang >= 5
      };

      const maxAct = Math.max(...activity, 1);
      const normalizedActivity = activity.map(val => Math.round((val / maxAct) * 100));

      setDynamicData({ subjects, achievements, activity: normalizedActivity, todaySpent, totalSpent });
      setStats({ messages: messages.length, notebook: notebookCount });
      setLoading(false);
    };

    fetchProfileAndData();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-bg-main">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main relative overflow-hidden font-sans">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row h-screen p-4 gap-4 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-[280px] bg-white/80 backdrop-blur-2xl rounded-3xl p-6 flex flex-col shadow-xl border border-white/50">
          <div className="flex items-center gap-3 mb-10 p-2">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg"><Brain size={18} /></div>
            <span className="text-xl font-black text-text-main">Cortex AI</span>
          </div>
          <nav className="space-y-1 flex-1">
            <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-primary/5 text-primary font-bold transition-all"><Activity size={18} /> Dashboard</button>
            <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-text-muted font-bold hover:bg-primary/5 transition-all"><BookOpen size={18} /> Mening Fanlarim</button>
            <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-text-muted font-bold hover:bg-primary/5 transition-all"><MessageSquare size={18} /> Aqlli Daftar</button>
            <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-text-muted font-bold hover:bg-primary/5 transition-all"><Settings size={18} /> Sozlamalar</button>
          </nav>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-red-500 font-bold hover:bg-red-50 transition-all mt-auto border border-red-50">
            <LogOut size={18} /> Chiqish
          </button>
        </aside>

        {/* Main */}
        <main className="flex-1 glass-card rounded-3xl flex flex-col overflow-hidden">
          <header className="h-20 px-8 flex justify-between items-center border-b border-border-custom bg-white/30 backdrop-blur-md">
            <button onClick={() => navigate('/tutor')} className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-primary transition-colors">
              <ChevronLeft size={18} /> Ortga qaytish
            </button>
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-border-custom shadow-sm">
               <div className="text-right hidden sm:block">
                 <div className="text-sm font-black text-text-main leading-none">{session?.user?.email?.split('@')[0]}</div>
                 <div className="text-[10px] font-bold text-primary uppercase mt-1">Pro Reja</div>
               </div>
               <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">{session?.user?.email?.[0].toUpperCase()}</div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8 custom-scrollbar">
            
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-primary via-primary-dark to-indigo-900 rounded-[40px] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[40px] bg-white/20 backdrop-blur-xl flex items-center justify-center border-2 border-white/30 shadow-2xl">
                    <User size={64} className="text-white" />
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-3 bg-white text-primary rounded-2xl shadow-xl hover:scale-110 transition-transform"><Camera size={16} /></button>
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h1 className="text-3xl lg:text-4xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">{session?.user?.email?.split('@')[0]} <CheckCircle2 size={24} className="text-sky-300" /></h1>
                   <p className="text-white/70 font-medium mb-6">{session?.user?.email}</p>
                   <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                     <span className="px-4 py-1.5 bg-yellow-400 text-yellow-950 text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2"><Star size={12} fill="currentColor" /> Pro Member</span>
                     <span className="px-4 py-1.5 bg-white/20 text-white text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2"><Shield size={12} /> Secure</span>
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-8 text-center bg-black/10 backdrop-blur-md p-8 rounded-[32px] border border-white/10">
                   <div><div className="text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Kredit</div><div className="text-2xl font-black">{profile?.credits?.toLocaleString() || 0}</div></div>
                   <div className="border-x border-white/10 px-8">
                     <div className="text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Suhbatlar</div>
                     <div className="text-2xl font-black">{Math.floor(stats.messages / 2)}</div>
                   </div>
                   <div><div className="text-xs text-white/50 font-bold uppercase tracking-wider mb-1">Level</div><div className="text-2xl font-black">12 LVL</div></div>
                </div>
              </div>
            </section>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Progress */}
              <div className="bg-white p-8 rounded-[40px] border border-border-custom shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-black text-text-main">Fanlar bo'yicha progress</h3>
                  <PieChart size={20} className="text-primary" />
                </div>
                <div className="space-y-6">
                  {Object.entries({ language: ['Til O\'rganish', '#6366f1', Globe], math: ['Matematika', '#10b981', Calculator], coding: ['Dasturlash', '#3b82f6', Code2], writing: ['Akademik Yozish', '#f59e0b', PenTool] }).map(([key, [label, color, Icon]]) => (
                    <div key={key} className="space-y-2">
                       <div className="flex justify-between items-center text-sm font-bold">
                         <div className="flex items-center gap-2 text-text-main"><Icon size={16} style={{ color }} /> {label}</div>
                         <span className="text-text-muted">{dynamicData.subjects[key]}%</span>
                       </div>
                       <div className="h-2.5 w-full bg-bg-main rounded-full overflow-hidden">
                         <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${dynamicData.subjects[key]}%`, backgroundColor: color }}></div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats & Wallet */}
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-[40px] border border-border-custom shadow-sm flex items-center justify-between">
                   <div className="space-y-1">
                     <div className="text-xs font-bold text-text-muted uppercase tracking-widest">Hamyon Balansi</div>
                     <div className="text-4xl font-black text-text-main">{profile?.credits?.toLocaleString() || 0} <span className="text-sm font-bold text-primary">UZS</span></div>
                   </div>
                   <button className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 transition-all"><ChevronRight size={24} /></button>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-border-custom shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-black text-text-main">Haftalik faollik</h3>
                    <TrendingUp size={20} className="text-emerald-500" />
                  </div>
                  <div className="flex items-end justify-between h-32 gap-3">
                    {['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'].map((day, i) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-3">
                        <div className="w-full bg-primary/10 rounded-lg relative overflow-hidden flex items-end h-full">
                           <div className="w-full bg-primary rounded-lg transition-all duration-1000" style={{ height: `${dynamicData.activity[i]}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-text-muted uppercase">{day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-border-custom shadow-sm">
                 <div className="flex justify-between items-center mb-10">
                   <h3 className="text-lg font-black text-text-main">Yutuqlar va Badjlar</h3>
                   <Award size={22} className="text-amber-500" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[{ key: 'solver', label: 'Tezkor Yechimchi', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: '5 ta masala yechildi' },
                      { key: 'coder', label: 'Junior Coder', icon: Code2, color: 'text-sky-500', bg: 'bg-sky-500/10', desc: 'Kodlash boshlandi' },
                      { key: 'polyglot', label: 'Poliglot AI', icon: Globe, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: '5 ta tilda savol' }
                    ].map(ach => (
                      <div key={ach.key} className={`p-6 rounded-3xl border transition-all duration-500 flex items-center gap-4 ${dynamicData.achievements[ach.key] ? 'border-primary bg-primary/5 opacity-100 scale-100' : 'border-border-custom opacity-40 grayscale'}`}>
                        <div className={`w-14 h-14 ${ach.bg} ${ach.color} rounded-2xl flex items-center justify-center flex-shrink-0`}><ach.icon size={24} fill="currentColor" className="opacity-80" /></div>
                        <div>
                          <div className="font-black text-text-main leading-tight">{ach.label}</div>
                          <div className="text-[10px] font-bold text-text-muted uppercase mt-1 tracking-wide">{ach.desc}</div>
                        </div>
                        {dynamicData.achievements[ach.key] && <Sparkles size={16} className="text-amber-400 ml-auto animate-pulse" />}
                      </div>
                    ))}
                 </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProfilePage;
