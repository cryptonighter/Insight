import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Music, ArrowLeft, Volume2, Mic2, Wind } from 'lucide-react';
import { VoiceId, MeditationConfig, ViewState } from '../types';
import { storageService } from '../services/storageService';
import { CLINICAL_PROTOCOLS } from '../server/protocols';

export const LoadingGeneration: React.FC = () => {
  const {
    pendingMeditationConfig,
    finalizeMeditationGeneration,
    soundscapes,
    setView,
    triage,
    meditations,
    activeMeditationId
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

  const categories = useMemo(() => {
    const cats: Record<string, string[]> = { 'Drone': [], 'Nature': [], 'Musical': [], 'Silence': [] };
    soundscapes.forEach(s => {
      const desc = (s.metadata.description + s.metadata.instrumentation + s.metadata.mood).toLowerCase();
      if (desc.includes('rain') || desc.includes('water') || desc.includes('forest') || desc.includes('wind')) cats['Nature'].push(s.id);
      else if (desc.includes('piano') || desc.includes('cello') || desc.includes('synth') || desc.includes('chime')) cats['Musical'].push(s.id);
      else cats['Drone'].push(s.id);
    });
    if (Object.values(cats).every(arr => arr.length === 0) && soundscapes.length > 0) cats['Drone'].push(soundscapes[0].id);
    return cats;
  }, [soundscapes]);

  const stages = [
    "Analyzing neural patterns...",
    "Weaving clinical protocol...",
    "Composing the guidance...",
    "Synthesizing voice layers...",
    "Layering atmosphere...",
    "Calculating resonance intervals...",
    "Finalizing neuro-symbolic session..."
  ];

  const handlePreview = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setPreviewingId(null);
    }
    const availableIds = categories[categoryId];
    if (!availableIds || availableIds.length === 0) return;

    const sampleId = availableIds[0];
    setPreviewingId(categoryId);

    try {
      const sc = soundscapes.find(s => s.id === sampleId);
      let base64 = sc?.audioBase64;
      if (!base64 || base64.length < 100) base64 = await storageService.getSoundscapeAudio(sampleId) || '';

      if (base64) {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.volume = 0.5;
        audio.loop = true;
        audio.play();
        audioPreviewRef.current = audio;

        setTimeout(() => {
          if (audioPreviewRef.current === audio) {
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
      background: 'deep-space',
      methodology: triage.selectedMethodology || 'NSDR',
      variables: triage.clinicalVariables
    };

    finalizeMeditationGeneration(config).catch(e => console.error(e));

    const interval = setInterval(() => {
      setProgress(prev => (prev >= 98 ? 98 : prev + (Math.random() * 0.7)));
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
  const protocol = useMemo(() => CLINICAL_PROTOCOLS[triage.selectedMethodology || 'NSDR'], [triage.selectedMethodology]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-liquid app-text-primary p-6 relative overflow-hidden">

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

        {/* THE BREATHING LOADER */}
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full border-2 border-indigo-400/20 ${isGenerating ? 'animate-breathe' : ''}`}></div>
          <div className={`absolute inset-4 rounded-full border border-teal-400/30 ${isGenerating ? 'animate-spin-reverse' : ''}`}></div>
          <div className={`absolute inset-8 rounded-full bg-gradient-to-tr from-indigo-500/10 to-teal-400/10 backdrop-blur-sm flex items-center justify-center ${isGenerating ? 'animate-breathe' : ''}`}>
            <span className="text-2xl font-light text-slate-800">{isGenerating ? `${Math.round(progress)}%` : <Sparkles className="text-indigo-400" />}</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
          {isGenerating ? (
            <div className="animate-fade-in space-y-4 w-full">
              <div className="space-y-1">
                <p className="text-indigo-600 text-[10px] tracking-[0.2em] uppercase font-bold">{stages[stage]}</p>
                <h2 className="text-2xl font-light text-slate-800">
                  {protocol?.name || "Preparing Session"}
                </h2>
              </div>

              <div className="bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-sm space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "{protocol?.description}"
                </p>

                <div className="pt-4 border-t border-indigo-100/50 flex flex-col items-center gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Preparation Guide</span>
                  <div className="flex gap-4 justify-center">
                    <div className="flex flex-col items-center gap-1 opacity-70">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center"><Wind size={14} /></div>
                      <span className="text-[9px]">Eyes Closed</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 opacity-70">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center"><Volume2 size={14} /></div>
                      <span className="text-[9px]">Headphones</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 opacity-70">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center"><Mic2 size={14} /></div>
                      <span className="text-[9px]">Quiet Space</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 animate-pulse pt-2">Initial audio transmission buffering...</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-light text-slate-800">Ready your space</h2>
              <p className="app-text-secondary text-sm">Targeting protocol: <span className="text-indigo-600 font-medium">{triage.selectedMethodology || 'NSDR'}</span></p>
            </>
          )}
        </div>

        {!isGenerating && (
          <div className="w-full space-y-6 animate-slide-up">
            <div className="glass-card p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 border-b border-indigo-100 pb-2">
                <Wind size={18} className="text-indigo-400" />
                <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">Atmosphere</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['Drone', 'Nature', 'Musical'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => handlePreview(cat)}
                    className={`p-4 rounded-xl flex flex-col items-center gap-2 border transition-all ${selectedCategory === cat ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/10' : 'bg-white/40 border-transparent text-slate-400'}`}
                  >
                    <span className="text-sm font-medium">{cat}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 border-b border-indigo-100 pb-2 pt-2">
                <Mic2 size={18} className="text-indigo-400" />
                <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">Vocal Tone</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['Kore', 'Fenrir', 'Puck'].map((v: any) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVoice(v)}
                    className={`p-3 rounded-xl border transition-all ${selectedVoice === v ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/10' : 'bg-white/40 border-transparent text-slate-400'}`}
                  >
                    <span className="text-sm font-medium">{v}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full bg-slate-900 sky-shadow text-white py-5 rounded-2xl font-medium tracking-wide transition-all active:scale-[0.98] hover:bg-slate-800"
            >
              Initialize Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
