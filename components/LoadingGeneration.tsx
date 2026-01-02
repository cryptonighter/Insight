import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, ArrowLeft, Volume2, Mic2, Wind, Terminal, Cpu, Activity, Play } from 'lucide-react';
import { VoiceId, MeditationConfig, ViewState } from '../types';
import { storageService } from '../services/storageService';
import { CLINICAL_PROTOCOLS } from '../server/protocols';
import { cn } from '@/utils';

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

  const [hasStarted, setHasStarted] = useState(false);

  // Configuration State
  const [selectedCategory, setSelectedCategory] = useState<string>('Drone');
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('Kore');
  const [selectedSpeed, setSelectedSpeed] = useState<number>(0.95);

  // Preview State
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Terminal Line Animation
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const lineIndex = useRef(0);

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

  const activeMeditation = useMemo(() => meditations.find(m => m.id === activeMeditationId), [meditations, activeMeditationId]);
  const protocol = useMemo(() => CLINICAL_PROTOCOLS[triage.selectedMethodology || 'NSDR'], [triage.selectedMethodology]);
  const queueLength = activeMeditation?.audioQueue?.length || 0;
  const isGenerating = activeMeditation?.isGenerating || hasStarted;
  const showBeginButton = queueLength > 0;

  // Simulate Matrix Lines
  useEffect(() => {
    if (isGenerating && !showBeginButton) {
      const interval = setInterval(() => {
        const possibleLines = [
          `> ANALYZING NEURAL PATTERNS [${Math.floor(Math.random() * 99)}%MATCH]`,
          `> WEAVING PROTOCOL: ${triage.selectedMethodology || 'UNKNOWN'}`,
          `> SYNTHESIZING VOICE LAYERS: ${selectedVoice.toUpperCase()}`,
          `> CALCULATING RESONANCE INTERVALS...`,
          `> OPTIMIZING GUIDANCE VECTORS...`,
          `> LOADING ATMOSPHERE: ${selectedCategory.toUpperCase()}...`,
          `> GENERATING SOMATIC INSTRUCTIONS...`
        ];
        setTerminalLines(prev => [...prev.slice(-4), possibleLines[Math.floor(Math.random() * possibleLines.length)]]);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isGenerating, showBeginButton, triage.selectedMethodology, selectedVoice, selectedCategory]);

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
    setHasStarted(true);

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

    finalizeMeditationGeneration(config).catch(e => {
      console.error(e);
      setHasStarted(false);
    });
  };

  return (
    <div className="relative min-h-[100dvh] bg-background-dark font-display flex flex-col items-center justify-center p-6 overflow-hidden text-primary">
      {/* Matrix Grid Background */}
      <div className="fixed top-0 left-0 w-full h-full bg-grid-pattern opacity-10 pointer-events-none"></div>

      {!hasStarted && (
        <button
          onClick={() => setView(ViewState.NEW_RESOLUTION)}
          className="absolute top-8 left-6 flex items-center gap-2 text-primary/50 hover:text-primary transition-colors z-20 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold tracking-widest uppercase">Abort Sequence</span>
        </button>
      )}

      <div className="z-10 w-full max-w-md flex flex-col items-center animate-in fade-in duration-700">

        {/* CORE STATUS */}
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          <div className={cn("absolute inset-0 rounded-full border border-primary/20", isGenerating ? "animate-ping opacity-20" : "")}></div>
          <div className={cn("absolute inset-4 rounded-full border border-primary/40 border-dashed", isGenerating ? "animate-[spin_10s_linear_infinite]" : "")}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2">
                <Cpu className="w-12 h-12 text-primary animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-primary/70 animate-pulse">Processing</span>
              </div>
            ) : (
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(74,222,128,0.1)]">
                <Activity className="w-10 h-10 text-primary" />
              </div>
            )}
          </div>
        </div>

        {/* STATUS TEXT */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8 w-full">
          {hasStarted ? (
            <div className="w-full space-y-6">
              <div className="space-y-1">
                <p className="text-primary text-[10px] tracking-[0.2em] uppercase font-bold animate-pulse">
                  {queueLength > 0 ? ">> TRANSMISSION READY <<" : ">> COMPILING PROTOCOL <<"}
                </p>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {protocol?.name || "Initializing..."} | <span className="text-primary">{queueLength > 0 ? "100%" : "WORKING"}</span>
                </h2>
              </div>

              {/* TERMINAL LOG */}
              <div className="bg-black/50 border border-primary/20 p-4 rounded-lg font-mono text-[10px] text-left h-32 flex flex-col justify-end shadow-inner overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full bg-scanline pointer-events-none opacity-10"></div>
                {terminalLines.map((line, i) => (
                  <div key={i} className="text-primary/80 truncate animate-in slide-in-from-left-2 fade-in">{line}</div>
                ))}
              </div>

              {/* BEGIN BUTTON */}
              {showBeginButton ? (
                <button
                  onClick={() => setView(ViewState.PLAYER)}
                  className="w-full bg-primary text-background-dark py-4 rounded-none font-bold tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all shadow-[0_0_20px_rgba(74,222,128,0.4)] flex items-center justify-center gap-3 border border-primary skew-x-[-10deg]"
                >
                  <Play size={18} fill="currentColor" className="skew-x-[10deg]" />
                  <span className="skew-x-[10deg]">Init Sequence</span>
                </button>
              ) : (
                <p className="text-xs text-primary/40 animate-pulse pt-2 font-mono">ESTIMATED TIME: CALC...</p>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white tracking-wide">Configure Protocol</h2>
              <p className="text-primary/60 text-xs font-mono tracking-wider">TARGET: <span className="text-white">{triage.selectedMethodology || 'NSDR'}</span></p>
            </>
          )}
        </div>

        {/* CONFIG OPTIONS */}
        {!hasStarted && (
          <div className="w-full space-y-6 animate-slide-up-fade">
            <div className="border border-primary/10 bg-white/5 p-6 rounded-lg space-y-6 backdrop-blur-sm">

              {/* ATMOSPHERE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <Wind size={14} className="text-primary" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Atmosphere</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Drone', 'Nature', 'Musical'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => handlePreview(cat)}
                      className={cn(
                        "p-3 rounded-sm border text-[10px] font-bold uppercase tracking-wide transition-all",
                        selectedCategory === cat
                          ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(74,222,128,0.2)]"
                          : "bg-black/20 border-white/10 text-white/40 hover:border-primary/50 hover:text-primary/80"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* VOICE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <Mic2 size={14} className="text-primary" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Voice Synthesis</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Kore', 'Fenrir', 'Puck'].map((v: any) => (
                    <button
                      key={v}
                      onClick={() => setSelectedVoice(v)}
                      className={cn(
                        "p-3 rounded-sm border text-[10px] font-bold uppercase tracking-wide transition-all",
                        selectedVoice === v
                          ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(74,222,128,0.2)]"
                          : "bg-black/20 border-white/10 text-white/40 hover:border-primary/50 hover:text-primary/80"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full bg-primary text-background-dark py-5 rounded-none font-bold tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-all shadow-[0_0_20px_rgba(74,222,128,0.3)] skew-x-[-5deg] group"
            >
              <div className="skew-x-[5deg] flex items-center justify-center gap-2">
                <Terminal size={18} className="group-hover:animate-pulse" />
                <span>Execute Generation</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
