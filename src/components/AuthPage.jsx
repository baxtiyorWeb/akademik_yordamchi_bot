import React, { useState } from 'react';
import { Mail, Lock, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import './AuthPage.css';

function AuthPage({ setSession }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
          setError("Email manzilingizga tasdiqlash xati yuborildi! Iltimos pochtangizni tekshiring.");
        }
      }
    } catch (err) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <Sparkles className="auth-icon" size={40} />
          </div>
          <h1>Til O'rganish Markazi</h1>
          <p>Professional til o'rganish va tahlil platformasi</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          <div className="input-group">
            <Mail className="input-icon" size={20} />
            <input
              type="email"
              placeholder="Email manzilingiz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input
              type="password"
              placeholder="Parol (kamida 6 ta belgi)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={24} /> : (isLogin ? "Kirish" : "Ro'yxatdan o'tish")}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "Hali hisobingiz yo'qmi?" : "Allaqachon hisobingiz bormi?"}
          <button type="button" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Ro'yxatdan o'tish" : "Kirish"}
          </button>
        </p>
      </div>

      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>
    </div>
  );
}

export default AuthPage;
