import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserContext, Insight, Pattern, Meditation, ViewState, ChatMessage,
  SoundscapeType, MeditationConfig, VoiceId, Soundscape, FeedbackData,
  SessionLifecycleState, TriageState, MethodologyType, Part, SomaticAnchor,
  UserEconomy, Resolution, DailyEntry, SessionSummaryData
} from '../types';
import { PREBUILT_PATTERNS, MOCK_INSIGHTS } from '../constants';
import { analyzeInsightsForPatterns, chatWithInsight, runDirectorOrchestration, generateMeditationScript } from '../services/geminiService';
import { growthContext } from '../services/growthContext';
import { processBatchWithSilenceSplitting } from '../services/audioEngine';
import { storageService } from '../services/storageService';
import { supabase, isMockClient } from '../services/supabaseClient';
import { useResolutionEngine } from '../services/useResolutionEngine';
import { useMeditationGenerator } from '../services/useMeditationGenerator';

const MOCK_SOUNDSCAPE: Soundscape = {
  id: 'default-space',
  name: 'Deep Space Drone',
  audioBase64: '',
  createdAt: Date.now(),
  metadata: {
    mood: 'Ethereal',
    intensity: 'low',
    suitableTopics: ['Focus', 'Sleep'],
    instrumentation: 'Synth, Drone',
    description: 'A deep, resonant void.'
  }
};

interface AppState {
  user: UserContext;
  currentView: ViewState;

  // Resolution Engine State
  userEconomy: UserEconomy;
  activeResolution: Resolution | null;
  todaysEntry: DailyEntry | null;

  // Audio/Gen State
  meditations: Meditation[];
  activeMeditationId: string | null;
  pendingMeditationConfig: Partial<MeditationConfig> | null;

  // Legacy/Context State (Keeping for now)
  insights: Insight[];
  soundscapes: Soundscape[];
  // ... other legacy fields can remain for seamless refactor, or be cleaned up

  // Actions
  completeOnboarding: () => void;
  createNewResolution: (statement: string, motivation: string) => Promise<void>;
  startMorningSession: () => Promise<void>;
  completeEveningReflection: (summary: string) => Promise<void>;

  // Shared Actions
  finalizeMeditationGeneration: (config: MeditationConfig) => Promise<void>;
  setView: (view: ViewState) => void;
  playMeditation: (id: string) => void;

  // Legacy actions needed for compilation
  // Legacy actions needed for compilation
  sendChatMessage: (text: string) => Promise<void>;
  addSoundscape: (sc: Soundscape) => void;
  removeSoundscape: (id: string) => void;
  lastSessionData: SessionSummaryData | null;
  chatHistory: ChatMessage[];
}

const AppContext = createContext<AppState | undefined>(undefined);



export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserContext>({ onboardingCompleted: true, clinicalContraindications: [] });
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD); // Default to DASHBOARD

  const {
    userEconomy,
    activeResolution,
    todaysEntry,
    createNewResolution,
    debitToken,
    grantToken,
    updateDailyEntry,
    syncResolutionData
  } = useResolutionEngine(user, setCurrentView);

  // Audio/Gen State
  const [soundscapes, setSoundscapes] = useState<Soundscape[]>([MOCK_SOUNDSCAPE]);

  const {
    meditations,
    activeMeditationId,
    pendingMeditationConfig,
    finalizeMeditationGeneration,
    playMeditation,
    setMeditations
  } = useMeditationGenerator(soundscapes, activeResolution, setCurrentView, user.supabaseId);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Triage State (Legacy but referenced)
  const [triage] = useState<TriageState>({ valence: 0, arousal: 0, clinicalVariables: {} });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(prev => ({ ...prev, supabaseId: session.user.id, email: session.user.email }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(prev => ({ ...prev, supabaseId: session.user.id, email: session.user.email }));

        // Fetch Soundscapes
        supabase.from('soundscapes').select('*').then(({ data, error }) => {
          if (data && !error && data.length > 0) {
            const loaded: Soundscape[] = data.map(row => ({
              id: row.id,
              name: row.name,
              audioBase64: '',
              audioUrl: row.audio_url,
              metadata: row.metadata,
              createdAt: new Date(row.created_at).getTime()
            }));
            setSoundscapes(loaded);
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const startMorningSession = async () => {
    const success = await debitToken();
    if (!success) return;

    // Prepare Config
    const config: MeditationConfig = {
      focus: activeResolution?.statement || "Focus",
      feeling: "Determined",
      duration: 5,
      voice: 'Kore',
      speed: 1.0,
      soundscapeId: soundscapes[0].id,
      background: 'deep-space'
    };

    await finalizeMeditationGeneration(config);
  };

  const [lastSessionData, setLastSessionData] = useState<SessionSummaryData | null>(null);

  const completeEveningReflection = async (summary: string, transcript?: string) => {
    if (!user.supabaseId || !activeResolution) return;
    console.log("DEBUG: completeEveningReflection called");

    // Store data for the summary view
    setLastSessionData({
      summary,
      transcript: transcript || ""
    });

    // Switch view immediately to Summary to keep the flow seamless
    setCurrentView(ViewState.SESSION_SUMMARY);

    await grantToken();
    await updateDailyEntry(summary, transcript);

    // TRIGGER MEMORY AUDIT (Fire & Forget for speed)
    console.log("🧠 Triggering Memory Auditor...");
    supabase.functions.invoke('audit-reflection', {
      body: { reflection: summary, transcript, user_id: user.supabaseId }
    }).catch(err => console.error("❌ Auditor Invocation Failed:", err));
  };

  const completeOnboarding = () => { /* ... */ };

  // --- REUSED AUDIO ENGINE LOGIC ---
  // This logic is now handled by useMeditationGenerator hook.
  // const finalizeMeditationGeneration = async (config: MeditationConfig) => { ... };

  // const setView = (view: ViewState) => setCurrentView(view);
  // const playMeditation = (id: string) => { setActiveMeditationId(id); setCurrentView(ViewState.PLAYER); };

  // Stubs for legacy
  // Stubs for legacy
  const sendChatMessage = async (t: string) => { };

  const addSoundscape = (s: Soundscape) => {
    setSoundscapes(prev => [...prev, s]);
  };

  const removeSoundscape = async (id: string) => {
    // Optimistic update
    setSoundscapes(prev => prev.filter(sc => sc.id !== id));
    if (user.supabaseId) {
      await supabase.from('soundscapes').delete().eq('id', id);
      // Also delete from storage? ideally yes, but we need the filename.
      // For now, just database link.
    }
  };

  const rateMeditation = async (id: string, feedback: any) => {
    console.log("Submitting feedback for:", id, feedback);
    if (!user.supabaseId) return;
    try {
      await supabase.from('session_logs')
        .update({
          pacing_score: feedback.pacing,
          voice_score: feedback.voice,
          immersion_score: feedback.immersion,
          user_feedback: feedback.note
        })
        .eq('id', id);
    } catch (e) {
      console.error("Failed to save feedback", e);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      currentView,
      userEconomy,
      activeResolution,
      todaysEntry,
      meditations,
      activeMeditationId,
      pendingMeditationConfig,

      // actions
      completeOnboarding,
      createNewResolution,
      startMorningSession,
      completeEveningReflection,
      finalizeMeditationGeneration,
      setView: setCurrentView,
      playMeditation,
      rateMeditation,

      // Soundscape Management
      addSoundscape,
      removeSoundscape,

      // Legacy stubs
      insights, soundscapes, chatHistory, lastSessionData, setTriage: () => { }, sendChatMessage: async () => { },
      // Dummy parts/patterns for TS compliance if needed by other components, or remove if unused
      parts: [], anchors: [], patterns: [], acceptPattern: () => { }, updatePatternNote: () => { }, sessionState: SessionLifecycleState.TRIAGE, triage
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
