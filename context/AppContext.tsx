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
  isLoading: boolean;

  // Audio/Gen State
  meditations: Meditation[];
  activeMeditationId: string | null;
  pendingMeditationConfig: Partial<MeditationConfig> | null;
  setPendingMeditationConfig: React.Dispatch<React.SetStateAction<Partial<MeditationConfig> | null>>;

  // Clinical Registry State
  parts: Part[];
  anchors: SomaticAnchor[];
  patterns: Pattern[];

  // Legacy/Context State (Keeping for now)
  insights: Insight[];
  soundscapes: Soundscape[];

  // Actions
  completeOnboarding: () => void;
  createNewResolution: (statement: string, motivation: string) => Promise<void>;
  startMorningSession: (customFocus?: string) => Promise<void>;
  completeEveningReflection: (summary: string) => Promise<void>;

  // Generation Actions
  startMeditationGeneration: (focus: string, feeling: string, duration: number, methodology?: MethodologyType, variables?: Record<string, any>) => void;
  finalizeMeditationGeneration: (config?: MeditationConfig) => Promise<void>;
  setView: (view: ViewState) => void;
  playMeditation: (id: string) => void;
  rateMeditation: (id: string, feedback: any) => Promise<void>;

  // Clinical Registry Actions
  updatePart: (id: string, updates: Partial<Part>) => void;
  updateAnchor: (id: string, updates: Partial<SomaticAnchor>) => void;
  acceptPattern: (id: string) => void;
  updatePatternNote: (id: string, note: string) => void;

  // Soundscape Management
  addSoundscape: (sc: Soundscape) => void;
  removeSoundscape: (id: string) => void;

  // Legacy stubs
  sendChatMessage: (text: string) => Promise<void>;
  lastSessionData: SessionSummaryData | null;
  chatHistory: ChatMessage[];
  triage: TriageState;
  setTriage: (t: TriageState) => void;
  sessionState: SessionLifecycleState;
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
    syncResolutionData,
    isLoading
  } = useResolutionEngine(user, setCurrentView);

  // Audio/Gen State
  const [soundscapes, setSoundscapes] = useState<Soundscape[]>([MOCK_SOUNDSCAPE]);

  const {
    meditations,
    activeMeditationId,
    pendingMeditationConfig,
    setPendingMeditationConfig,
    finalizeMeditationGeneration,
    playMeditation,
    setMeditations
  } = useMeditationGenerator(soundscapes, activeResolution, setCurrentView, user.supabaseId);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Clinical Registry State
  const [parts, setParts] = useState<Part[]>([]);
  const [anchors, setAnchors] = useState<SomaticAnchor[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  // Triage State
  const [triage, setTriage] = useState<TriageState>({ valence: 0, arousal: 0, clinicalVariables: {} });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(prev => ({ ...prev, supabaseId: session.user.id, email: session.user.email }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(prev => ({ ...prev, supabaseId: session.user.id, email: session.user.email }));

        // Ensure Profile Exists (Self-Healing)
        supabase.from('profiles').upsert(
          { id: session.user.id },
          { onConflict: 'id', ignoreDuplicates: true }
        ).then(({ error }) => {
          if (error) console.error("Profile Healing Failed:", error);
        });

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

        // Fetch Clinical Registry Data
        supabase.from('parts_ledger').select('*').eq('user_id', session.user.id).then(({ data }) => {
          if (data) {
            setParts(data.map(row => ({
              id: row.id,
              name: row.name,
              role: row.role,
              relationshipScore: row.relationship_score || 5,
              originStory: row.origin_story,
              somaticLocation: row.somatic_location,
              createdAt: new Date(row.created_at).getTime(),
              lastAccessed: new Date(row.last_accessed || row.created_at).getTime()
            })));
          }
        });

        supabase.from('somatic_anchors').select('*').eq('user_id', session.user.id).then(({ data }) => {
          if (data) {
            setAnchors(data.map(row => ({
              id: row.id,
              type: row.type,
              description: row.description,
              efficacyRating: row.efficacy_rating || 3,
              createdAt: new Date(row.created_at).getTime()
            })));
          }
        });

        supabase.from('patterns').select('*').eq('user_id', session.user.id).then(({ data }) => {
          if (data) {
            setPatterns(data.map(row => ({
              id: row.id,
              title: row.title,
              description: row.description,
              observationCount: row.observation_count || 1,
              lastObserved: Date.now(),
              insights: [],
              color: row.color || '#94a3b8',
              status: row.status || 'pending'
            })));
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const startMorningSession = async (customFocus?: string) => {
    console.log("Starting Morning Session (Config Mode)...", { customFocus });
    try {
      const success = await debitToken();
      if (!success) {
        console.warn("Debit failed. Aborting.");
        return;
      }

      // Prepare Initial Config (But DON'T generate yet)
      const defaultSoundscapeId = soundscapes.length > 0 ? soundscapes[0].id : "default";

      // Use custom focus if provided, otherwise fall back to resolution
      const sessionFocus = customFocus?.trim() || activeResolution?.statement || "Focus";

      const config: MeditationConfig = {
        focus: sessionFocus,
        feeling: "Determined",
        duration: 5,
        voice: 'Kore',
        speed: 1.0,
        soundscapeId: defaultSoundscapeId,
        background: 'deep-space',
        methodology: 'NSDR' // Default
      };

      console.log("Setting Pending Config:", config);
      setPendingMeditationConfig(config);
      setCurrentView(ViewState.LOADING); // Go to "Cab"

    } catch (err) {
      console.error("CRITICAL: Failed to start session", err);
      alert("Failed to initialize session. Please try again.");
    }
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

  // --- START MEDITATION GENERATION (For CardsView/Home compatibility) ---
  const startMeditationGeneration = (
    focus: string,
    feeling: string,
    duration: number,
    methodology: MethodologyType = 'NSDR',
    variables: Record<string, any> = {}
  ) => {
    const defaultSoundscapeId = soundscapes.length > 0 ? soundscapes[0].id : 'default';
    const config: MeditationConfig = {
      focus,
      feeling,
      duration,
      voice: 'Kore',
      speed: 1.0,
      soundscapeId: defaultSoundscapeId,
      background: 'deep-space',
      methodology,
      variables
    };
    setPendingMeditationConfig(config);
    setCurrentView(ViewState.LOADING);
  };

  // --- CLINICAL REGISTRY ACTIONS ---
  const updatePart = async (id: string, updates: Partial<Part>) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (user.supabaseId) {
      await supabase.from('parts_ledger').update({
        relationship_score: updates.relationshipScore,
        last_accessed: new Date().toISOString()
      }).eq('id', id);
    }
  };

  const updateAnchor = async (id: string, updates: Partial<SomaticAnchor>) => {
    setAnchors(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (user.supabaseId) {
      await supabase.from('somatic_anchors').update({
        efficacy_rating: updates.efficacyRating
      }).eq('id', id);
    }
  };

  const acceptPattern = (id: string) => {
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, status: 'active' as const } : p));
    if (user.supabaseId) {
      supabase.from('patterns').update({ status: 'active' }).eq('id', id);
    }
  };

  const updatePatternNote = (id: string, note: string) => {
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, userNotes: note } : p));
  };

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

    // Resolve Real ID
    const meditation = meditations.find(m => m.id === id);
    const realId = meditation?.supabaseId;

    if (!realId) {
      console.warn("⚠️ Cannot submit feedback: No synced Supabase ID found for local ID:", id);
      return;
    }

    // Get current sonic preferences from localStorage for learning
    const sonicPrefs = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('sonicPreferences') || '{}')
      : {};

    try {
      await supabase.from('session_logs')
        .update({
          // Storage Policy: 'feedback' is a JSONB column that stores all subjective ratings
          feedback: {
            pacing_score: feedback.pacing,
            voice_score: feedback.voice,
            immersion_score: feedback.immersion,
            note: feedback.note,
            // Store sonic preferences for learning
            sonic_preferences: {
              voice_volume: sonicPrefs.voice,
              atmosphere_volume: sonicPrefs.atmosphere,
              resonance_volume: sonicPrefs.resonance
            },
            protocol: meditation?.config?.methodology
          }
        })
        .eq('id', realId);

      // Also update user profile with preferred sonic settings
      await supabase.from('profiles')
        .update({
          settings: supabase.sql`
              COALESCE(settings, '{}'::jsonb) || 
              '{"sonicPreferences": ${JSON.stringify(sonicPrefs)}}'::jsonb
            `
        })
        .eq('id', user.supabaseId);

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
      setPendingMeditationConfig,
      isLoading,

      // Clinical Registry State
      parts,
      anchors,
      patterns,

      // Actions
      completeOnboarding,
      createNewResolution,
      startMorningSession,
      completeEveningReflection,
      startMeditationGeneration,
      finalizeMeditationGeneration,
      setView: setCurrentView,
      playMeditation,
      rateMeditation,

      // Clinical Registry Actions
      updatePart,
      updateAnchor,
      acceptPattern,
      updatePatternNote,

      // Soundscape Management
      addSoundscape,
      removeSoundscape,

      // Legacy
      insights,
      soundscapes,
      chatHistory,
      lastSessionData,
      sendChatMessage,
      triage,
      setTriage,
      sessionState: SessionLifecycleState.TRIAGE
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
