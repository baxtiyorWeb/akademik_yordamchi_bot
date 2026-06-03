import { useState, useEffect } from 'react';
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
import PricingPage from './components/PricingPage';
import PaymentReturn from './components/PaymentReturn';
import IELTSPrep from './components/IELTSPrep';
import StudyPlansPage from './components/StudyPlansPage';
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
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Check if the loaded session token is valid by making a lightweight query
          const { error } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (error && (error.status === 401 || error.message.includes('JWT') || error.message.includes('invalid') || error.code === 'PGRST301')) {
            console.warn('Stale or invalid token detected, signing out to clear cache...');
            await supabase.auth.signOut();
            setSession(null);
          } else {
            setSession(session);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

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
            <div className="text-[11px] font-bold text-neutral-900 uppercase tracking-[0.3em]">Ovvox Ai</div>
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
        <Route path="/ielts" element={<AuthenticatedRoute session={session}><IELTSPrep session={session} /></AuthenticatedRoute>} />
        <Route path="/math" element={<AuthenticatedRoute session={session}><MathCenter session={session} /></AuthenticatedRoute>} />
        <Route path="/pricing" element={<AuthenticatedRoute session={session}><PricingPage session={session} /></AuthenticatedRoute>} />
        <Route path="/plans" element={<AuthenticatedRoute session={session}><StudyPlansPage session={session} /></AuthenticatedRoute>} />
        <Route path="/payment-return" element={<AuthenticatedRoute session={session}><PaymentReturn session={session} /></AuthenticatedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;