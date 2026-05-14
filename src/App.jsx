import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Brain, Loader2 } from 'lucide-react';
import { supabase } from './supabase';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import TutorChat from './components/TutorChat';
import KidsChat from './components/KidsChat';
import ProfilePage from './components/ProfilePage';
import MathCenter from './components/MathCenter';
import { Toaster } from 'sonner';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg-main relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary relative">
            <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-[32px] animate-spin"></div>
            <Brain size={32} className="animate-pulse" />
          </div>
          <div className="text-sm font-black text-primary uppercase tracking-[0.3em] animate-pulse">Cortex AI yuklanmoqda</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
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
          path="/kids"
          element={session ? <KidsChat session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={session ? <ProfilePage session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/math"
          element={session ? <MathCenter /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;