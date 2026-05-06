import React, { useState } from 'react';
import { Mail, Lock, Sparkles, Loader2, Brain, Zap, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import './AuthPage.css';

function AuthPage({ setSession }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSession(data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
        } else {
          setSuccessMsg("Email manzilingizga tasdiqlash xati yuborildi! Iltimos pochtangizni tekshiring.");
        }
      }
    } catch (err) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (loginMode) => {
    setIsLogin(loginMode);
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="auth-page">
      {/* Background */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      {/* Centered card */}
      <div className="auth-panel">
        <div className="auth-card fade-in">

          {/* Brand */}
          <div className="auth-mobile-brand">
            <div className="auth-mobile-logo">
              <Brain size={21} />
            </div>
            <span>LingoAI Expert</span>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => switchMode(true)}
            >
              Kirish
            </button>
            <button
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => switchMode(false)}
            >
              Ro'yxatdan o'tish
            </button>
          </div>

          {/* Heading */}
          <div className="auth-form-header">
            <h2>{isLogin ? 'Xush kelibsiz! 👋' : 'Hisob yaratish'}</h2>
            <p>
              {isLogin
                ? 'Davom etish uchun hisobingizga kiring'
                : "Bepul hisob yarating va o'rganishni boshlang"}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="auth-error scale-in">
              <AlertCircle size={15} />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="auth-success scale-in">
              <ShieldCheck size={15} />
              {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="auth-form">
            <div className="auth-field">
              <label htmlFor="auth-email">Email manzil</label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={16} />
                <input
                  id="auth-email"
                  type="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Parol</label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={16} />
                <input
                  id="auth-password"
                  type="password"
                  className="auth-input"
                  placeholder="Kamida 6 ta belgi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Yuklanmoqda…</>
              ) : isLogin ? (
                <><Zap size={16} /> Kirish</>
              ) : (
                <><Sparkles size={16} /> Hisob yaratish</>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>{isLogin ? "Hisobingiz yo'qmi?" : "Allaqachon hisobingiz bormi?"}</span>
          </div>

          <p className="auth-switch">
            <button type="button" onClick={() => switchMode(!isLogin)}>
              {isLogin ? "Ro'yxatdan o'tish" : "Kirish"}
            </button>
          </p>

          <p className="auth-footer-note">
            Davom etish orqali siz{' '}
            <a href="#">Xizmat shartlari</a> va{' '}
            <a href="#">Maxfiylik siyosati</a>ga rozilik bildirasiz.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
