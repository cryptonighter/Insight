
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
import { LiveReflection } from './components/LiveReflection';
import { OnboardingWizard } from './components/OnboardingWizard';

const Main: React.FC = () => {
  const { currentView, user } = useApp();

  // Simple Auth Wall
  if (!user.supabaseId && !user.onboardingCompleted) {
    // ... logic
  }

  // if (!user.supabaseId && !localStorage.getItem('reality_user_skip_auth')) {
  //   return <AuthView />;
  // }

  const renderView = () => {
    switch (currentView) {
      case ViewState.ONBOARDING: return <OnboardingWizard />;
      case ViewState.DASHBOARD: return <DashboardV2 />;
      case ViewState.HOME: return <Home />; // Legacy Chat
      case ViewState.LOADING: return <LoadingGeneration />;
      case ViewState.CARDS: return <CardsView />;
      case ViewState.MEDITATIONS: return <MeditationsView />;
      case ViewState.PLAYER: return <Player />;
      case ViewState.ADMIN: return <AdminDashboard />;
      case ViewState.TRIAGE: return <TriageView />;
      case ViewState.REFLECTION: return <Reflection />; // Legacy Support
      case ViewState.EVENING_REFLECTION: return <ReflectionV2 />;
      case ViewState.SESSION_SUMMARY: return <SessionSummaryV2 />;
      case ViewState.NEW_RESOLUTION: return <NewResolutionV2 />;
      case ViewState.FEEDBACK: return <FeedbackV2 />;
      case ViewState.CONTEXT: return <ContextInterview />;
      default: return <DashboardV2 />; // Default to Dashboard now
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
          className="h-full w-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
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
