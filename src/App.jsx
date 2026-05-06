import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from './supabase';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import TutorChat from './components/TutorChat';
import ProfilePage from './components/ProfilePage';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Joriy sessionni tekshirish
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Auth holati o'zgarishini eshitish (login, logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="spinner" size={48} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={!session ? <AuthPage setSession={setSession} /> : <Navigate to="/tutor" />}
        />
        <Route
          path="/tutor"
          element={session ? <TutorChat session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={session ? <ProfilePage session={session} /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;