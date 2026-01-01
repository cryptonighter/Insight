
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './context/AppContext';
import { Home } from './components/Home';
import { CardsView } from './components/CardsView';
import { MeditationsView } from './components/MeditationsView';
import { LoadingGeneration } from './components/LoadingGeneration';
import { Navigation } from './components/Navigation';
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
import { LiveReflection } from './components/LiveReflection';
import { OnboardingWizard } from './components/OnboardingWizard';

const Main: React.FC = () => {
  const { currentView, user } = useApp();

  // Simple Auth Wall
  if (!user.supabaseId && !user.onboardingCompleted) {
    // ... logic
  }

  if (!user.supabaseId && !localStorage.getItem('reality_user_skip_auth')) {
    return <AuthView />;
  }

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
      case ViewState.CONTEXT: return <ContextInterview />;
      default: return <DashboardV2 />; // Default to Dashboard now
    }
  };

  return (
    <div className="antialiased app-text-primary selection:bg-indigo-500/30">
      {/* Global container */}
      {renderView()}
      <Navigation />
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
