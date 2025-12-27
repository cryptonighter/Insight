
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
import { ViewState } from './types';

const Main: React.FC = () => {
  const { currentView } = useApp();

  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME: return <Home />;
      case ViewState.LOADING: return <LoadingGeneration />;
      case ViewState.CARDS: return <CardsView />;
      case ViewState.MEDITATIONS: return <MeditationsView />;
      case ViewState.PLAYER: return <Player />;
      case ViewState.ADMIN: return <AdminDashboard />;
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
