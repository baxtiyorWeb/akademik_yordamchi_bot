import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Zap, TrendingUp, BookOpen,
  Camera, Settings, LogOut, Brain, Star,
  Award, CreditCard, ChevronRight, CheckCircle2,
  Globe, Calculator, Code2, PenTool,
  MessageSquare, Sparkles, PieChart, Activity,
  Users, ExternalLink, Mail, MapPin
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

  if (loading) return (
    <div className="flex items-center justify-center h-full py-40">
      <div className="w-6 h-6 border-2 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-16 bg-white nano-bg custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8 md:space-y-16 animate-in fade-in duration-700">
        
        {/* --- USER PROFILE HEADER --- */}
        <section className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
          <div className="relative group">
            <div className="w-24 h-24 rounded-[32px] bg-white shadow-xl shadow-blue-500/5 flex items-center justify-center text-slate-400 border border-slate-100 overflow-hidden relative">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-indigo-50 opacity-50"></div>
               <User size={40} strokeWidth={1.2} className="relative z-10" />
            </div>
            <button className="absolute -bottom-1 -right-1 p-2 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-100 hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100">
               <Camera size={14} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex-1 space-y-5 w-full">
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-100 w-full md:w-fit shadow-sm">
               <div className="flex flex-wrap items-center gap-2 mb-2">
                 <h1 className="text-xl md:text-2xl font-normal text-slate-900 tracking-tight break-all">{session?.user?.email?.split('@')[0]}</h1>
                 {profile?.plan === 'Pro' ? (
                   <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-semibold uppercase tracking-widest rounded-full border border-indigo-100 whitespace-nowrap flex items-center gap-1 shadow-sm">
                     <Zap size={10} className="fill-indigo-600 animate-pulse" /> Pro Account
                   </div>
                 ) : profile?.plan === 'Research' ? (
                   <div className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-semibold uppercase tracking-widest rounded-full border border-purple-100 whitespace-nowrap flex items-center gap-1 shadow-sm">
                     <Brain size={10} className="fill-purple-600 animate-pulse" /> Research Account
                   </div>
                 ) : (
                   <div className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-medium uppercase tracking-widest rounded-full border border-slate-200 whitespace-nowrap">
                     Free Account
                   </div>
                 )}
               </div>
               <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-[13px] font-normal text-slate-400">
                  <div className="flex items-center gap-2 min-w-0"><Mail size={14} strokeWidth={1.5} className="text-slate-300 flex-shrink-0" /> <span className="break-all">{session?.user?.email}</span></div>
                  <div className="flex items-center gap-2"><Activity size={14} strokeWidth={1.5} className="text-slate-300 flex-shrink-0" /> Level 12</div>
                  {profile?.plan && profile?.plan !== 'Free' && profile?.plan_expires_at && (
                    <div className="flex items-center gap-1.5 text-indigo-500 bg-indigo-50/50 px-2 py-0.5 rounded-lg border border-indigo-100/50 text-[11px] font-medium">
                      <Zap size={12} className="animate-pulse" />
                      Muddati: {new Date(profile.plan_expires_at).toLocaleDateString('uz-UZ')}
                    </div>
                  )}
               </div>
            </div>
            <div className="flex flex-wrap gap-3">
               <button onClick={() => navigate('/pricing')} className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-black text-white text-[13px] font-normal rounded-xl hover:opacity-90 transition-all shadow-lg shadow-black/10 whitespace-nowrap cursor-pointer">
                 {profile?.plan && profile?.plan !== 'Free' ? 'Tariflar' : 'Upgrade Pro'}
               </button>
               <button className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-white border border-slate-200 text-slate-600 text-[13px] font-normal rounded-xl hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap">Settings</button>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
             <div className="flex-1 p-1 min-w-[100px] md:min-w-[120px] bg-white/90 backdrop-blur-xl border border-slate-100 rounded-2xl text-center shadow-sm">
                <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-2 mb-1">Messages</div>
                <div className="text-xl font-normal text-slate-900 mb-2">{stats.messages}</div>
             </div>
             <div className="flex-1 p-1 min-w-[100px] md:min-w-[120px] bg-white/90 backdrop-blur-xl border border-slate-100 rounded-2xl text-center shadow-sm">
                <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-2 mb-1">Credits</div>
                <div className="text-xl font-normal text-slate-900 mb-2">{profile?.credits?.toLocaleString() || 0}</div>
             </div>
          </div>
        </section>

        {/* --- STATS & PROGRESS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16">
          
          <div className="lg:col-span-2 space-y-6 md:space-y-10">
            <div className="flex items-center justify-between">
               <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.25em]">Subject Mastery</h3>
               <TrendingUp size={16} strokeWidth={1.5} className="text-slate-300" />
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6 md:gap-y-10">
              {[
                { key: 'language', label: 'Language', icon: Globe, color: 'bg-indigo-500' },
                { key: 'math', label: 'Mathematics', icon: Calculator, color: 'bg-rose-500' },
                { key: 'coding', label: 'Coding', icon: Code2, color: 'bg-emerald-500' },
                { key: 'writing', label: 'Writing', icon: PenTool, color: 'bg-purple-500' }
              ].map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="space-y-3 md:space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5 text-[14px] font-normal text-slate-600">
                       <Icon size={16} strokeWidth={1.5} className="text-slate-300" />
                       {label}
                    </div>
                    <span className="text-[12px] font-normal text-slate-400">{dynamicData.subjects[key]}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                    <div className={`h-full ${color} rounded-full transition-all duration-1000 opacity-80`} style={{ width: `${dynamicData.subjects[key]}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 md:space-y-10">
            <div className="flex items-center justify-between">
               <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.25em]">Weekly Activity</h3>
               <Activity size={16} strokeWidth={1.5} className="text-slate-300" />
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm">
               <div className="flex items-end justify-between h-28 gap-2">
                 {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                     <div className="w-full bg-slate-100/80 rounded-lg relative overflow-hidden flex items-end h-full border border-slate-50">
                       <div 
                         className="w-full bg-indigo-500/60 rounded-lg transition-all duration-1000 group-hover:bg-indigo-600" 
                         style={{ height: `${dynamicData.activity[i]}%` }}
                       ></div>
                     </div>
                     <span className="text-[9px] font-medium text-slate-400">{day}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* --- ACHIEVEMENTS --- */}
        <section className="space-y-6 md:space-y-10 pt-6 border-t border-slate-50">
           <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.25em]">Milestones</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              {[
                { key: 'solver', label: 'Problem Solver', icon: Zap, desc: 'Solved 5+ complex problems', color: 'text-amber-500 bg-amber-50 border-amber-100' },
                { key: 'coder', label: 'Tech Specialist', icon: Code2, desc: 'Explored programming concepts', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
                { key: 'polyglot', label: 'Global Learner', icon: Globe, desc: 'Studied multiple languages', color: 'text-indigo-500 bg-indigo-50 border-indigo-100' }
              ].map(ach => (
                <div key={ach.key} className={`p-5 md:p-6 rounded-[24px] md:rounded-[32px] border transition-all duration-700 flex items-start gap-5 ${dynamicData.achievements[ach.key] ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-transparent opacity-30 grayscale'}`}>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${dynamicData.achievements[ach.key] ? ach.color : 'bg-white border-slate-200 text-slate-300'}`}>
                    <ach.icon size={20} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[14px] font-normal text-slate-900">{ach.label}</div>
                    <div className="text-[12px] font-normal text-slate-400 leading-relaxed">{ach.desc}</div>
                  </div>
                </div>
              ))}
           </div>
        </section>

      </div>
    </div>
  );
}

export default ProfilePage;
