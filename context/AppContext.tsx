import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserContext, Insight, Pattern, Meditation, ViewState, ChatMessage,
  SoundscapeType, MeditationConfig, VoiceId, Soundscape, FeedbackData,
  SessionLifecycleState, TriageState, MethodologyType, Part, SomaticAnchor,
  UserEconomy, Resolution, DailyEntry
} from '../types';
import { PREBUILT_PATTERNS, MOCK_INSIGHTS } from '../constants';
import { analyzeInsightsForPatterns, generateMeditationStream, chatWithInsight, runDirectorOrchestration } from '../services/geminiService';
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
  sendChatMessage: (text: string) => Promise<void>;
  addSoundscape: (sc: Soundscape) => void;
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
  } = useMeditationGenerator(soundscapes, activeResolution, setCurrentView);

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

  const completeEveningReflection = async (summary: string, transcript?: string) => {
    if (!user.supabaseId || !activeResolution) return;
    console.log("DEBUG: completeEveningReflection called");

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
  const sendChatMessage = async (t: string) => { };
  const addSoundscape = (s: Soundscape) => { };

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

      // Legacy stubs
      insights, soundscapes, chatHistory, setTriage: () => { }, sendChatMessage: async () => { }, addSoundscape: () => { },
      // Dummy parts/patterns for TS compliance if needed by other components, or remove if unused
      parts: [], anchors: [], patterns: [], acceptPattern: () => { }, updatePatternNote: () => { }, rateMeditation: () => { }, sessionState: SessionLifecycleState.TRIAGE, triage
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
