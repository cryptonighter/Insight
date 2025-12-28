
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

const Main: React.FC = () => {
  const { currentView, user } = useApp();

  // Simple Auth Wall
  if (!user.supabaseId && !user.onboardingCompleted) {
    // Assuming onboardingCompleted is a proxy for "Has used the app / is local". 
    // But we want real auth now. 
    // If user.supabaseId is missing, show Auth.
    // However, we might want to allow "Guest" mode? The requirements say "Real user data never touches Mock".
    // Let's force Auth for now if we want "Secure Space".
    // But we have MOCK_INSIGHTS in AppContext, so maybe check a flag?
    // Actually, standard pattern: if (!session) show Auth.
    // In AppContext, user defaults to { onboardingCompleted: true }. 
    // We need to check if we are truly logged in.
    // Let's assume if supabaseId is missing, we show AuthView.
  }

  // Actually, let's keep it simple: If you want to use the cloud features, you login.
  // But for the roadmap, Phase 1 includes "Authentication". 

  if (!user.supabaseId && process.env.NODE_ENV !== 'development') {
    // In Dev we might skip? No, we want to test it.
    // check if we are in "Mock Mode" explicitly?
  }

  // Let's modify the condition:
  // If we are strictly enforcing auth:
  if (!user.supabaseId && !localStorage.getItem('reality_user_skip_auth')) {
    return <AuthView />;
  }

  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME: return <Home />;
      case ViewState.LOADING: return <LoadingGeneration />;
      case ViewState.CARDS: return <CardsView />;
      case ViewState.MEDITATIONS: return <MeditationsView />;
      case ViewState.PLAYER: return <Player />;
      case ViewState.ADMIN: return <AdminDashboard />;
      case ViewState.TRIAGE: return <TriageView />;
      case ViewState.REFLECTION: return <Reflection />;
      case ViewState.CONTEXT: return <ContextInterview />;
      default: return <Home />;
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
