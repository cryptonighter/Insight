
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './context/AppContext';
import { Home } from './components/Home';
import { CardsView } from './components/CardsView';
import { MeditationsView } from './components/MeditationsView';
import { LoadingGeneration } from './components/LoadingGeneration';
import { AdminDashboard } from './components/AdminDashboard';
import { TriageView } from './components/TriageView';
import { Reflection } from './components/Reflection';
import { ContextInterview } from './components/ContextInterview';
import { AuthView } from './components/AuthView';
import { ViewState } from './types';

import { DashboardV2 } from './components/v2/DashboardV2';
import { ReflectionV2 } from './components/v2/ReflectionV2';
import { SessionSummaryV2 } from './components/v2/SessionSummaryV2';
import { NewResolutionV2 } from './components/v2/NewResolutionV2';
import { OnboardingView } from './components/v2/OnboardingView';
import { SessionPrep } from './components/v2/SessionPrep';
import { UnifiedExperience } from './components/UnifiedExperience';
import { VoiceSelector } from './components/VoiceSelector';
import { ConversationalReflection } from './components/v2/ConversationalReflection';
import { ConversationalCheckIn } from './components/v2/ConversationalCheckIn';
import { supabase } from './services/supabaseClient';

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
      case ViewState.CHECK_IN: return <ConversationalCheckIn />; // NEW: Voice-first experience selection
      case ViewState.DASHBOARD: return <DashboardV2 />;
      case ViewState.HOME: return <ConversationalCheckIn />; // Default to check-in
      case ViewState.ONBOARDING: return <OnboardingView />; // The Matrix V2 Design
      case ViewState.REFLECTION: return <ConversationalReflection />; // NEW: Turbo TTS conversational
      case ViewState.EVENING_REFLECTION: return <ConversationalReflection />; // Both now use conversational
      case ViewState.SESSION_SUMMARY: return <SessionSummaryV2 />;
      case ViewState.NEW_RESOLUTION: return <NewResolutionV2 />;
      case ViewState.FEEDBACK: return <UnifiedExperience />; // Feedback integrated into UnifiedExperience
      case ViewState.CONTEXT: return <ContextInterview />;
      case ViewState.SESSION_PREP: return <SessionPrep />;
      case ViewState.PLAYER: return <UnifiedExperience />; // NEW: Unified meditation + feedback

      // Legacy / Admin
      case ViewState.CARDS: return <CardsView />;
      case ViewState.MEDITATIONS: return <MeditationsView />;
      case ViewState.ADMIN: return <AdminDashboard />;
      case ViewState.TRIAGE: return <TriageView />;
      case ViewState.SETTINGS: return <VoiceSelector />;

      default: return <ConversationalCheckIn />; // Default to check-in
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
