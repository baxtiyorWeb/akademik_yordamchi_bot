import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Shield, Zap, TrendingUp, BookOpen, 
  ChevronLeft, Camera, Settings, LogOut, Brain, Star,
  Award, Clock, CreditCard, ChevronRight, CheckCircle2,
  Bell, Globe, History, Calculator, Code2, PenTool, 
  MessageSquare, Sparkles, PieChart, Activity
} from 'lucide-react';
import { supabase } from '../supabase';
import './ProfilePage.css';

function ProfilePage({ session }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ messages: 0, notebook: 0 });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id) return;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileData) setProfile(profileData);

      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      const { count: noteCount } = await supabase
        .from('notebook_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      setStats({ messages: msgCount || 0, notebook: noteCount || 0 });
      setLoading(false);
    };

    fetchProfile();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return (
    <div className="profile-loading">
      <div className="premium-loader">
        <div className="loader-inner" />
      </div>
    </div>
  );

  return (
    <div className="profile-page-v2">
      {/* Dynamic Background */}
      <div className="bg-elements">
        <div className="mesh-gradient" />
        <div className="floating-orb orb-purple" />
        <div className="floating-orb orb-indigo" />
        <div className="floating-orb orb-emerald" />
        <div className="grid-overlay" />
      </div>

      <div className="profile-wrapper fade-in">
        {/* Sidebar Nav */}
        <aside className="profile-side-nav">
          <div className="side-logo">
            <div className="s-logo-icon"><Brain size={20} /></div>
            <span>LingoAI Expert</span>
          </div>
          <nav className="p-nav-list">
            <button className="p-nav-item active"><Activity size={18} /> Umumiy Dashboard</button>
            <button className="p-nav-item"><BookOpen size={18} /> Mening Fanlarim</button>
            <button className="p-nav-item"><MessageSquare size={18} /> Aqlli Daftar</button>
            <button className="p-nav-item"><Sparkles size={18} /> Quiz Natijalari</button>
            <button className="p-nav-item"><CreditCard size={18} /> To'lov Tarixi</button>
            <button className="p-nav-item"><Settings size={18} /> Profil Sozlamalari</button>
          </nav>
          <div className="side-footer">
            <button className="p-nav-item logout" onClick={handleLogout}>
              <LogOut size={18} /> Tizimdan chiqish
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="profile-content">
          <header className="p-content-header">
            <button className="p-back-btn" onClick={() => navigate('/tutor')}>
              <ChevronLeft size={18} /> Dashboardga qaytish
            </button>
            <div className="p-header-actions">
              <div className="p-user-preview">
                <div className="p-up-info">
                  <span className="p-up-name">{session?.user?.email?.split('@')[0]}</span>
                  <span className="p-up-plan">Pro Reja</span>
                </div>
                <div className="p-up-avatar">
                  <User size={16} />
                </div>
              </div>
            </div>
          </header>

          <div className="p-scroll-area">
            {/* Hero Card */}
            <section className="p-hero-card">
              <div className="p-hero-main">
                <div className="p-avatar-section">
                  <div className="p-avatar-main">
                    <User size={40} />
                    <div className="p-avatar-glow" />
                  </div>
                  <button className="p-camera-btn"><Camera size={14} /></button>
                </div>
                <div className="p-user-meta">
                  <h1>{session?.user?.email?.split('@')[0]} <CheckCircle2 size={18} className="verified-icon" /></h1>
                  <p>{session?.user?.email}</p>
                  <div className="p-badges">
                    <span className="p-badge-v2 gold"><Star size={10} /> PRO MEMBER</span>
                    <span className="p-badge-v2 indigo"><Shield size={10} /> SECURE</span>
                  </div>
                </div>
              </div>
              <div className="p-hero-stats">
                <div className="p-hero-stat-item">
                  <span className="label">Oylik Kredit</span>
                  <span className="value">1,000</span>
                </div>
                <div className="p-hero-stat-item">
                  <span className="label">Suhbatlar</span>
                  <span className="value">{Math.floor(stats.messages / 2)}</span>
                </div>
                <div className="p-hero-stat-item">
                  <span className="label">Level</span>
                  <span className="value">12 LVL</span>
                </div>
              </div>
            </section>

            {/* Grid Layout */}
            <div className="p-grid-layout">
              {/* Left Column */}
              <div className="p-column-left">
                {/* Subject Progress - MATCHING LANDING PAGE FEATURES */}
                <div className="p-card subject-card">
                  <div className="card-header">
                    <h3>Fanlar bo'yicha progress</h3>
                    <PieChart size={18} className="icon-chart" />
                  </div>
                  <div className="subject-list">
                    <div className="sub-item">
                      <div className="sub-header">
                        <div className="sub-title"><Globe size={16} color="#6366f1" /> Til O'rganish</div>
                        <span className="sub-pct">75%</span>
                      </div>
                      <div className="sub-bar-bg"><div className="sub-bar-fill" style={{ width: '75%', background: '#6366f1' }} /></div>
                    </div>
                    <div className="sub-item">
                      <div className="sub-header">
                        <div className="sub-title"><Calculator size={16} color="#10b981" /> Matematika</div>
                        <span className="sub-pct">40%</span>
                      </div>
                      <div className="sub-bar-bg"><div className="sub-bar-fill" style={{ width: '40%', background: '#10b981' }} /></div>
                    </div>
                    <div className="sub-item">
                      <div className="sub-header">
                        <div className="sub-title"><Code2 size={16} color="#3b82f6" /> Dasturlash</div>
                        <span className="sub-pct">90%</span>
                      </div>
                      <div className="sub-bar-bg"><div className="sub-bar-fill" style={{ width: '90%', background: '#3b82f6' }} /></div>
                    </div>
                    <div className="sub-item">
                      <div className="sub-header">
                        <div className="sub-title"><PenTool size={16} color="#f59e0b" /> Akademik Yozish</div>
                        <span className="sub-pct">25%</span>
                      </div>
                      <div className="sub-bar-bg"><div className="sub-bar-fill" style={{ width: '25%', background: '#f59e0b' }} /></div>
                    </div>
                  </div>
                </div>

                {/* Achievements */}
                <div className="p-card achievements-card">
                  <div className="card-header">
                    <h3>Yutuqlar va Badjlar</h3>
                    <Award size={18} className="icon-award" />
                  </div>
                  <div className="achievements-list">
                    <div className="ach-item unlocked">
                      <div className="ach-icon gold"><Zap size={16} /></div>
                      <div className="ach-info">
                        <strong>Tezkor Yechimchi</strong>
                        <span>10 ta matematika masalasi yechildi</span>
                      </div>
                    </div>
                    <div className="ach-item unlocked">
                      <div className="ach-icon blue"><Code2 size={16} /></div>
                      <div className="ach-info">
                        <strong>Junior Coder</strong>
                        <span>Birinchi Python kodi yozildi</span>
                      </div>
                    </div>
                    <div className="ach-item locked">
                      <div className="ach-icon purple"><Globe size={16} /></div>
                      <div className="ach-info">
                        <strong>Poliglot</strong>
                        <span>3 ta tilda savol berildi</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="p-column-right">
                {/* Balance & Wallet */}
                <div className="p-card wallet-card">
                  <div className="card-header">
                    <h3>Hamyon</h3>
                    <Zap size={18} className="icon-zap" />
                  </div>
                  <div className="wallet-main">
                    <div className="w-balance">
                      <span className="w-currency">UZS</span>
                      <span className="w-amount">{profile?.credits?.toLocaleString() || 0}</span>
                    </div>
                    <button className="w-top-up">To'ldirish <ChevronRight size={14} /></button>
                  </div>
                  <div className="wallet-stats">
                    <div className="w-stat">
                      <span>Bugun ishlatildi</span>
                      <strong>2,500</strong>
                    </div>
                    <div className="w-stat">
                      <span>Jami sarf</span>
                      <strong>125,000</strong>
                    </div>
                  </div>
                </div>

                {/* Weekly Activity */}
                <div className="p-card activity-card">
                  <div className="card-header">
                    <h3>Haftalik faollik</h3>
                    <TrendingUp size={18} className="icon-trend" />
                  </div>
                  <div className="activity-chart">
                    {['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'].map((day, i) => (
                      <div key={day} className="act-bar-wrapper">
                        <div className="act-bar" style={{ height: `${[40, 70, 45, 90, 65, 30, 20][i]}%`, opacity: i === 3 ? 1 : 0.4 }} />
                        <span>{day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referral */}
                <div className="p-card referral-card-v2">
                  <div className="ref-v2-header">
                    <Star size={24} className="ref-star" />
                    <h4>Do'stlarni taklif qiling</h4>
                  </div>
                  <p>Har bir taklif uchun 50 ta kredit oling</p>
                  <div className="ref-v2-input">
                    <span>lingoai.uz/ref/{session?.user?.id?.substring(0,6)}</span>
                    <button>Copy</button>
                  </div>
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
