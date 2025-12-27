
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, CloudRain, Waves, Wind, User, Mic2, Gauge, Music, ArrowLeft, Volume2, StopCircle } from 'lucide-react';
import { SoundscapeType, VoiceId, MeditationConfig, ViewState } from '../types';
import { storageService } from '../services/storageService';
import { decodeBase64 } from '../services/geminiService';

export const LoadingGeneration: React.FC = () => {
  const { 
    pendingMeditationConfig, 
    finalizeMeditationGeneration,
    soundscapes,
    setView
  } = useApp();
  
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  
  // Configuration State
  const [selectedCategory, setSelectedCategory] = useState<string>('Drone');
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('Kore');
  const [selectedSpeed, setSelectedSpeed] = useState<number>(0.95); 
  
  // Preview State
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Group soundscapes by vague categories for "indirect" selection
  const categories = useMemo(() => {
    const cats: Record<string, string[]> = {
        'Drone': [],
        'Nature': [],
        'Musical': [],
        'Silence': []
    };
    
    soundscapes.forEach(s => {
        const desc = (s.metadata.description + s.metadata.instrumentation + s.metadata.mood).toLowerCase();
        if (desc.includes('rain') || desc.includes('water') || desc.includes('forest') || desc.includes('wind')) {
            cats['Nature'].push(s.id);
        } else if (desc.includes('piano') || desc.includes('cello') || desc.includes('synth') || desc.includes('chime')) {
            cats['Musical'].push(s.id);
        } else {
            cats['Drone'].push(s.id); // Default bucket
        }
    });
    
    if (Object.values(cats).every(arr => arr.length === 0)) {
         if (soundscapes.length > 0) cats['Drone'].push(soundscapes[0].id);
    }
    return cats;
  }, [soundscapes]);

  const stages = [
    "Analyzing your patterns...",
    "Weaving specific insights...",
    "Composing the guidance...",
    "Synthesizing voice...",
    "Engine: Layering audio tracks...",
    "Engine: Calculating breath spacing...",
    "Finalizing session..."
  ];

  const instructions = [
    "Find a comfortable position.",
    "Soften your gaze.",
    "Take a deep breath in...",
    "...and let it go.",
    "We are almost ready."
  ];

  // Stop preview on unmount or start
  useEffect(() => {
    return () => {
        if (audioPreviewRef.current) {
            audioPreviewRef.current.pause();
            audioPreviewRef.current = null;
        }
    };
  }, []);

  const handlePreview = async (categoryId: string) => {
      // 1. Select the category
      setSelectedCategory(categoryId);

      // 2. Stop existing
      if (audioPreviewRef.current) {
          audioPreviewRef.current.pause();
          setPreviewingId(null);
      }

      // 3. Find a sample to play
      const availableIds = categories[categoryId];
      if (!availableIds || availableIds.length === 0) return;
      
      const sampleId = availableIds[0];
      setPreviewingId(categoryId);

      try {
          // JIT Fetch
          const sc = soundscapes.find(s => s.id === sampleId);
          let base64 = sc?.audioBase64;
          if (!base64 || base64.length < 100) {
              base64 = await storageService.getSoundscapeAudio(sampleId) || '';
          }
          
          if (base64) {
              const byteCharacters = atob(base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'audio/mp3' }); // Assume MP3/Wav
              const url = URL.createObjectURL(blob);
              
              const audio = new Audio(url);
              audio.volume = 0.5;
              audio.loop = true;
              audio.play();
              audioPreviewRef.current = audio;
              
              // Auto stop after 8s
              setTimeout(() => {
                  if (audioPreviewRef.current === audio) {
                     // fade out logic could go here
                     audio.pause();
                     setPreviewingId(null);
                  }
              }, 8000);
          }
      } catch (e) {
          console.error("Preview failed", e);
          setPreviewingId(null);
      }
  };
  
  const handleStart = () => {
    if (!pendingMeditationConfig) return;
    
    // Kill preview
    if (audioPreviewRef.current) audioPreviewRef.current.pause();
    setPreviewingId(null);

    setStage(0);
    setProgress(1); 
    
    const availableIds = categories[selectedCategory];
    const finalSoundscapeId = availableIds.length > 0 
        ? availableIds[Math.floor(Math.random() * availableIds.length)]
        : soundscapes[0]?.id;

    const config: MeditationConfig = {
      focus: pendingMeditationConfig.focus!,
      feeling: pendingMeditationConfig.feeling!,
      duration: pendingMeditationConfig.duration!,
      voice: selectedVoice,
      speed: selectedSpeed,
      soundscapeId: finalSoundscapeId,
      background: 'deep-space' 
    };

    finalizeMeditationGeneration(config).catch(e => console.error(e));

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return 98; 
        return prev + (Math.random() * 0.7); // Slightly faster visual progress
      });
    }, 400); 

    const stageInterval = setInterval(() => {
      setStage(prev => (prev + 1) % stages.length);
    }, 5000);

    return () => {
        clearInterval(interval);
        clearInterval(stageInterval);
    };
  };

  const isGenerating = progress > 0;

  const voices: {id: VoiceId, label: string, desc: string}[] = [
    { id: 'Kore', label: 'Kore', desc: 'Balanced, Soothing' },
    { id: 'Fenrir', label: 'Fenrir', desc: 'Deep, Grounded' },
    { id: 'Puck', label: 'Puck', desc: 'Light, Gentle' },
  ];

  const soundscapeOptions = [
      { id: 'Nature', icon: CloudRain, label: 'Nature' },
      { id: 'Drone', icon: Wind, label: 'Deep Space' },
      { id: 'Musical', icon: Music, label: 'Instrumental' }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-liquid app-text-primary p-6 relative overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/50 rounded-full blur-[100px] opacity-70 animate-blob animation-delay-0"></div>
         <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-200/50 rounded-full blur-[100px] opacity-70 animate-blob animation-delay-2000"></div>
      </div>
      
      {!isGenerating && (
          <button 
            onClick={() => setView(ViewState.HOME)}
            className="absolute top-8 left-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors z-20"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Add more context</span>
          </button>
      )}
      
      <div className="z-10 w-full max-w-md flex flex-col items-center animate-fade-in pt-12">
        
        <div className="relative w-24 h-24 mb-6">
           <div className={`absolute inset-0 rounded-full border-t-2 border-indigo-400/50 ${isGenerating ? 'animate-spin' : ''}`}></div>
           <div className={`absolute inset-4 rounded-full border-r-2 border-teal-400/50 ${isGenerating ? 'animate-spin-reverse' : ''}`}></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-xl font-light text-slate-800">{isGenerating ? `${Math.round(progress)}%` : 'Setup'}</span>
           </div>
        </div>

        <div className="h-16 flex flex-col items-center justify-center text-center space-y-2 mb-6">
           {isGenerating ? (
             <>
               <p className="text-indigo-600 text-xs tracking-widest uppercase animate-pulse">{stages[stage]}</p>
               <h2 className="text-lg font-light text-slate-800 animate-fade-in">
                 {instructions[Math.min(Math.floor(progress / 20), instructions.length - 1)]}
               </h2>
             </>
           ) : (
             <>
               <h2 className="text-xl font-light text-slate-800">Prepare your environment</h2>
               <p className="app-text-secondary text-sm">Tune the atmosphere for this session.</p>
             </>
           )}
        </div>

        <div className={`w-full space-y-4 transition-all duration-500 ${isGenerating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
           
           {/* Indirect Soundscape Selection & Preview */}
           <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3 opacity-60">
                 <Music size={14} className="app-text-secondary" />
                 <span className="text-[10px] uppercase tracking-widest app-text-secondary">Atmosphere</span>
                 {previewingId && <span className="text-[10px] text-indigo-500 animate-pulse ml-auto">Previewing...</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                 {soundscapeOptions.map((opt) => {
                     const count = categories[opt.id]?.length || 0;
                     const isSelected = selectedCategory === opt.id;
                     const isPreviewing = previewingId === opt.id;

                     return (
                       <button
                         key={opt.id}
                         onClick={() => handlePreview(opt.id)}
                         disabled={count === 0}
                         className={`
                           p-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all border
                           ${isSelected ? 'bg-teal-50/80 border-teal-300 text-teal-700 shadow-sm' : 'border-transparent bg-white/40 hover:bg-white/60 text-slate-500'}
                           ${count === 0 ? 'opacity-40 cursor-not-allowed' : ''}
                         `}
                       >
                         {isPreviewing ? <Volume2 size={20} className="animate-pulse"/> : <opt.icon size={20} strokeWidth={1.5} />}
                         <span className="text-xs font-medium">{opt.label}</span>
                       </button>
                     );
                 })}
              </div>
              <p className="text-[10px] text-center mt-2 text-slate-400 italic">
                  Tap to preview. Click Begin to select.
              </p>
           </div>

           {/* Voice Selection */}
           <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3 opacity-60">
                 <Mic2 size={14} className="app-text-secondary" />
                 <span className="text-[10px] uppercase tracking-widest app-text-secondary">Guide</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                 {voices.map(v => (
                   <button
                     key={v.id}
                     onClick={() => setSelectedVoice(v.id)}
                     className={`p-2 rounded-lg text-center transition-all border ${selectedVoice === v.id ? 'bg-indigo-50/80 border-indigo-300 text-indigo-700 shadow-sm' : 'border-transparent bg-white/40 hover:bg-white/60 text-slate-600'}`}
                   >
                     <div className="text-sm font-medium">{v.label}</div>
                   </button>
                 ))}
              </div>
           </div>
        </div>

        {!isGenerating && (
          <button 
            onClick={handleStart}
            className="mt-8 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-4 rounded-xl font-medium tracking-wide shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            Begin Session
          </button>
        )}

        {isGenerating && (
          <p className="mt-8 text-xs app-text-secondary animate-pulse">
            Deepening audio synthesis...
          </p>
        )}

      </div>
    </div>
  );
};
