import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, ArrowRight } from 'lucide-react';
import { ViewState } from '../types';

export const Onboarding: React.FC = () => {
  const { createMeditation, playMeditation, completeOnboarding, setView } = useApp();
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState("");
  const [feeling, setFeeling] = useState("");
  const [duration, setDuration] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNext = () => setStep(prev => prev + 1);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setStep(4); // Processing screen
    try {
      const id = await createMeditation(focus, feeling, duration);
      completeOnboarding(); 
      // Auto play
      playMeditation(id);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      setStep(0); // Retry logic in real app would be better
    }
  };

  // Screen 1: Welcome
  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center animate-fade-in bg-gradient-liquid app-text-primary">
        <h1 className="text-3xl font-light mb-6 tracking-wide text-slate-800">Welcome.</h1>
        <p className="text-lg text-slate-600 mb-12 leading-relaxed max-w-sm">
          This tool creates meditations based on what's actually alive for you.
          <br /><br />
          Let's create your first one together.
          <br />
          Three questions. Then we'll generate it.
        </p>
        <button 
          onClick={handleNext}
          className="bg-indigo-500 text-white px-8 py-4 rounded-full font-medium hover:bg-indigo-600 transition-colors flex items-center gap-2 shadow-lg"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // Screen 2: Focus
  if (step === 1) {
    return (
      <div className="flex flex-col min-h-screen px-8 pt-24 animate-fade-in bg-gradient-liquid app-text-primary">
        <div className="w-12 h-1 bg-gray-200 rounded mb-8">
          <div className="h-full bg-indigo-400 w-1/3 rounded"></div>
        </div>
        <h2 className="text-2xl font-light mb-8 text-slate-800">What's one thing you'd like to work with right now?</h2>
        
        <textarea
          autoFocus
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="e.g., Stress at work, Feeling scattered..."
          className="w-full bg-transparent border-b border-gray-300 text-xl py-4 focus:outline-none focus:border-indigo-400 mb-8 placeholder-slate-400 resize-none h-32 text-slate-700"
        />
        
        <div className="flex items-center justify-between">
           <button className="p-4 rounded-full glass hover:bg-white/80 text-slate-600 hover:text-slate-800 transition-colors shadow-sm">
              <Mic size={24} />
           </button>
           {focus.length > 3 && (
             <button onClick={handleNext} className="bg-indigo-500 hover:bg-indigo-600 px-6 py-3 rounded-full text-sm font-medium transition-colors text-white shadow-md">
               Next
             </button>
           )}
        </div>
      </div>
    );
  }

  // Screen 3: Feeling
  if (step === 2) {
    return (
      <div className="flex flex-col min-h-screen px-8 pt-24 animate-fade-in bg-gradient-liquid app-text-primary">
         <div className="w-12 h-1 bg-gray-200 rounded mb-8">
          <div className="h-full bg-indigo-400 w-2/3 rounded"></div>
        </div>
        <h2 className="text-2xl font-light mb-8 text-slate-800">When this meditation is done, how would you like to feel?</h2>
        
        <input
          autoFocus
          type="text"
          value={feeling}
          onChange={(e) => setFeeling(e.target.value)}
          placeholder="e.g., Grounded, Clear-headed..."
          className="w-full bg-transparent border-b border-gray-300 text-xl py-4 focus:outline-none focus:border-indigo-400 mb-8 placeholder-slate-400 text-slate-700"
        />
        
         <div className="flex items-center justify-between mt-auto mb-12">
           <button className="p-4 rounded-full glass hover:bg-white/80 text-slate-600 hover:text-slate-800 transition-colors shadow-sm">
              <Mic size={24} />
           </button>
           {feeling.length > 2 && (
             <button onClick={handleNext} className="bg-indigo-500 hover:bg-indigo-600 px-6 py-3 rounded-full text-sm font-medium transition-colors text-white shadow-md">
               Next
             </button>
           )}
        </div>
      </div>
    );
  }

  // Screen 4: Duration
  if (step === 3) {
    return (
      <div className="flex flex-col min-h-screen px-8 pt-24 animate-fade-in bg-gradient-liquid app-text-primary">
        <div className="w-12 h-1 bg-gray-200 rounded mb-8">
          <div className="h-full bg-indigo-400 w-full rounded"></div>
        </div>
        <h2 className="text-2xl font-light mb-12 text-slate-800">How much time do you have?</h2>
        
        <div className="space-y-4">
          {[5, 10, 15, 20].map((m) => (
            <button
              key={m}
              onClick={() => {
                setDuration(m);
                handleGenerate();
              }}
              className="w-full py-5 text-left px-8 glass-card rounded-xl text-lg hover:bg-white/80 transition-all active:scale-95 text-slate-700 shadow-md"
            >
              {m} minutes
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Screen 5: Processing
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center animate-pulse bg-gradient-liquid app-text-primary">
      <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-indigo-400/50 animate-spin mb-8"></div>
      <h2 className="text-xl font-light tracking-widest text-slate-800">Creating your meditation...</h2>
      <p className="text-sm text-slate-500 mt-4">Weaving your words into a custom session.</p>
    </div>
  );
};