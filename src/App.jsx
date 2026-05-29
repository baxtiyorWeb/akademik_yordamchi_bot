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
import NotebookPage from './components/NotebookPage';
import VoicePage from './components/VoicePage';
import VoiceAdmin from './components/VoiceAdmin';
import PricingPage from './components/PricingPage';
import PaymentReturn from './components/PaymentReturn';
import MainLayout from './components/MainLayout';
import { Toaster } from 'sonner';

const AuthenticatedRoute = ({ session, children }) => {
  if (!session) return <Navigate to="/login" />;
  return <MainLayout session={session}>{children}</MainLayout>;
};

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
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-8">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white relative">
            <div className="absolute inset-[-4px] border border-neutral-100 rounded-2xl animate-pulse"></div>
            <Brain size={20} strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-[11px] font-bold text-neutral-900 uppercase tracking-[0.3em]">Typer AI</div>
            <div className="text-[10px] text-neutral-400 font-medium uppercase tracking-[0.1em]">Initializing Workspace...</div>
          </div>
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
        
        {/* Protected Routes with MainLayout */}
        <Route path="/tutor" element={<AuthenticatedRoute session={session}><TutorChat session={session} /></AuthenticatedRoute>} />
        <Route path="/kids" element={<AuthenticatedRoute session={session}><KidsChat session={session} /></AuthenticatedRoute>} />
        <Route path="/profile" element={<AuthenticatedRoute session={session}><ProfilePage session={session} /></AuthenticatedRoute>} />
        <Route path="/notebook" element={<AuthenticatedRoute session={session}><NotebookPage session={session} /></AuthenticatedRoute>} />
        <Route path="/math" element={<AuthenticatedRoute session={session}><MathCenter session={session} /></AuthenticatedRoute>} />
        <Route path="/voice" element={<AuthenticatedRoute session={session}><VoicePage session={session} /></AuthenticatedRoute>} />
        <Route path="/voice-master-setup" element={<AuthenticatedRoute session={session}><VoiceAdmin session={session} /></AuthenticatedRoute>} />
        <Route path="/pricing" element={<AuthenticatedRoute session={session}><PricingPage session={session} /></AuthenticatedRoute>} />
        <Route path="/payment-return" element={<AuthenticatedRoute session={session}><PaymentReturn session={session} /></AuthenticatedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;