
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './context/AppContext';
import { Home } from './components/Home';
import { CardsView } from './components/CardsView';
import { MeditationsView } from './components/MeditationsView';
import { LoadingGeneration } from './components/LoadingGeneration';
import { Player } from './components/Player';
import { AdminDashboard } from './components/AdminDashboard';
import { TriageView } from './components/TriageView';
import { Reflection } from './components/Reflection';
import { ContextInterview } from './components/ContextInterview';
import { AuthView } from './components/AuthView';
import { ViewState } from './types';

import { Dashboard } from './components/Dashboard';
import { DashboardV2 } from './components/v2/DashboardV2';
import { ReflectionV2 } from './components/v2/ReflectionV2';
import { SessionSummaryV2 } from './components/v2/SessionSummaryV2';
import { NewResolutionV2 } from './components/v2/NewResolutionV2';
import { FeedbackV2 } from './components/v2/FeedbackV2';
import { OnboardingView } from './components/v2/OnboardingView';
import { LiveReflection } from './components/LiveReflection';
import { OnboardingWizard } from './components/OnboardingWizard';
import { supabase } from './services/supabaseClient'; // Ensure imported

const Main: React.FC = () => {
  const { currentView, user, userEconomy } = useApp();

  // Simple Auth Wall
  if (!user.supabaseId && !user.onboardingCompleted) {
    // ... logic
  }

  if (!user.supabaseId && !localStorage.getItem('reality_user_skip_auth')) {
    return <AuthView />;
  }

  const renderView = () => {
    switch (currentView) {
      case ViewState.LOADING: return <LoadingGeneration />;

      // V2 Routes
      case ViewState.DASHBOARD: return <DashboardV2 />;
      case ViewState.HOME: return <DashboardV2 />;
      case ViewState.ONBOARDING: return <OnboardingView />; // The Matrix V2 Design
      case ViewState.REFLECTION: return <ReflectionV2 />;
      case ViewState.EVENING_REFLECTION: return <ReflectionV2 />;
      case ViewState.SESSION_SUMMARY: return <SessionSummaryV2 />;
      case ViewState.NEW_RESOLUTION: return <NewResolutionV2 />;
      case ViewState.FEEDBACK: return <FeedbackV2 />;
      case ViewState.CONTEXT: return <ContextInterview />;

      // Legacy / Admin
      case ViewState.CARDS: return <CardsView />;
      case ViewState.MEDITATIONS: return <MeditationsView />;
      case ViewState.PLAYER: return <Player />;
      case ViewState.ADMIN: return <AdminDashboard />;
      case ViewState.TRIAGE: return <TriageView />;

      default: return <DashboardV2 />;
    }
  };

  return (
    <div className="antialiased app-text-primary selection:bg-indigo-500/30">
      {/* Global container */}
      {/* Global container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // Custom "Apple-like" ease
          className="h-[100dvh] w-full bg-background-dark overflow-hidden fixed inset-0"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      {/* Global Hard Reset (Dev Tool) - RESTORED FOR TESTING */}
      <div className="fixed top-24 right-4 z-[9999]">
        <button
          onClick={async () => {
            if (confirm("⚠️ GLOBAL RESET? This wipes everything AND Logs you out.")) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user?.id) {
                const uid = user.id;
                console.log("Resetting data for:", uid);
                // 1. Wipe Data
                await supabase.from('user_economy').delete().eq('user_id', uid);
                await supabase.from('resolutions').delete().eq('user_id', uid);
                await supabase.from('daily_entries').delete().eq('user_id', uid);
                await supabase.from('session_logs').delete().eq('user_id', uid);

                // 2. Sign Out to force Login Screen
                await supabase.auth.signOut();

                window.location.reload();
              } else {
                // Even if no user found, force sign out to see login screen
                await supabase.auth.signOut();
                window.location.reload();
              }
            }
          }}
          className="w-12 h-12 rounded-full bg-red-600 text-white font-bold text-xl flex items-center justify-center shadow-2xl border-2 border-white/20 hover:scale-110 active:scale-95 transition-all"
          title="Reset & Logout"
        >
          R
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
};

export default App;
