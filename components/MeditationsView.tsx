
import React from 'react';
import { useApp } from '../context/AppContext';
import { Play, Clock, Calendar } from 'lucide-react';

export const MeditationsView: React.FC = () => {
  const { meditations, playMeditation } = useApp();

  return (
    <div className="min-h-screen px-6 pt-16 pb-24 overflow-y-auto bg-gradient-liquid app-text-primary">
       <h1 className="text-xs font-bold tracking-widest app-text-secondary uppercase mb-8">Your Meditations ({meditations.length})</h1>
       
       <div className="space-y-4">
         {meditations.map((meditation) => (
           <div key={meditation.id} className="glass rounded-xl p-5 hover:bg-white/50 transition-colors shadow-sm">
             <div className="flex justify-between items-start mb-2">
               <h3 className="font-medium text-lg pr-4 text-slate-700">{meditation.title}</h3>
               {meditation.feedback && typeof meditation.feedback === 'object' && meditation.feedback.immersion > 70 && (
                 <span className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(45,212,191,0.6)]"></span>
               )}
               {/* Backward compatibility for string feedback */}
               {meditation.feedback === 'resonated' && (
                 <span className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(45,212,191,0.6)]"></span>
               )}
             </div>
             
             <div className="flex items-center gap-4 text-xs app-text-secondary mb-6">
                <span className="flex items-center gap-1"><Clock size={12} /> {meditation.durationMinutes} min</span>
                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(meditation.createdAt).toLocaleDateString()}</span>
             </div>

             <div className="flex justify-between items-center">
               <button 
                 onClick={() => playMeditation(meditation.id)}
                 className="flex items-center gap-2 text-sm font-medium hover:text-teal-600 transition-colors text-slate-700"
               >
                 <span className="p-2 rounded-full bg-white/40"><Play size={12} fill="currentColor" /></span>
                 Play Again
               </button>
               
               <div className="flex gap-1">
                 {meditation.backgroundType && (
                   <span className="text-[10px] uppercase border border-gray-300 px-2 py-0.5 rounded app-text-secondary">
                     {meditation.backgroundType}
                   </span>
                 )}
               </div>
             </div>
           </div>
         ))}
       </div>
    </div>
  );
};
