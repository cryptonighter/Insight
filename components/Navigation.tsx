
import React from 'react';
import { ViewState } from '../types';
import { useApp } from '../context/AppContext';
import { Mic, Archive, PlayCircle } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { currentView, setView } = useApp();

  // Don't show nav during player or loading
  if (
    currentView === ViewState.PLAYER ||
    currentView === ViewState.LOADING ||
    currentView === ViewState.TRIAGE
  ) return null;

  const navItems = [
    { id: ViewState.HOME, label: 'Stream', icon: Mic },
    { id: ViewState.CARDS, label: 'Registry', icon: Archive },
    { id: ViewState.MEDITATIONS, label: 'Library', icon: PlayCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full pb-6 pt-4 px-6 bg-white/70 backdrop-blur-xl border-t border-gray-200 z-40">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] uppercase tracking-widest font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
