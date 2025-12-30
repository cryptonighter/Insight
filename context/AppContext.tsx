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

  // Resolution Engine State
  const [userEconomy, setUserEconomy] = useState<UserEconomy>({ userId: 'mock', balance: 5 });
  const [activeResolution, setActiveResolution] = useState<Resolution | null>(null);
  const [todaysEntry, setTodaysEntry] = useState<DailyEntry | null>(null);

  // Audio/Gen State
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [activeMeditationId, setActiveMeditationId] = useState<string | null>(null);
  const [pendingMeditationConfig, setPendingMeditationConfig] = useState<Partial<MeditationConfig> | null>(null);
  const [soundscapes, setSoundscapes] = useState<Soundscape[]>([MOCK_SOUNDSCAPE]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Triage State (Legacy but referenced)
  const [triage] = useState<TriageState>({ valence: 0, arousal: 0, clinicalVariables: {} });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(prev => ({ ...prev, supabaseId: session.user.id, email: session.user.email }));
        syncResolutionData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(prev => ({ ...prev, supabaseId: session.user.id, email: session.user.email }));
        syncResolutionData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncResolutionData = async (userId: string) => {
    try {
      // 1. Fetch Economy
      const { data: eco } = await supabase.from('user_economy').select('*').eq('user_id', userId).single();
      if (eco) setUserEconomy({ userId, balance: eco.balance, lastDailyGrant: eco.last_daily_grant });

      // 2. Fetch Active Resolution
      const { data: res } = await supabase.from('resolutions').select('*').eq('user_id', userId).eq('status', 'active').single();
      if (res) {
        setActiveResolution({
          id: res.id,
          statement: res.statement,
          rootMotivation: res.root_motivation,
          status: 'active',
          createdAt: res.created_at
        });

        // 3. Fetch Today's Entry
        const today = new Date().toISOString().split('T')[0];
        const { data: entry } = await supabase.from('daily_entries')
          .select('*')
          .eq('resolution_id', res.id)
          .eq('date', today)
          .single();

        if (entry) {
          setTodaysEntry({
            id: entry.id,
            resolutionId: res.id,
            date: entry.date,
            eveningCompleted: entry.evening_completed,
            morningGenerated: entry.morning_generated
          });
        }
      }
    } catch (e) {
      console.error("Sync failed", e);
    }
  };

  const createNewResolution = async (statement: string, motivation: string) => {
    if (!user.supabaseId) return;

    // 1. Archive old ones
    await supabase.from('resolutions').update({ status: 'archived' }).eq('user_id', user.supabaseId);

    // 2. Create new Resolution
    const { data, error } = await supabase.from('resolutions').insert({
      user_id: user.supabaseId,
      statement,
      root_motivation: motivation,
      status: 'active'
    }).select().single();

    // 3. Initialize Economy (The Commitment Grant) - Upsert to be safe
    const { error: ecoError } = await supabase.from('user_economy').upsert({
      user_id: user.supabaseId,
      balance: 5, // Start with 5
      last_daily_grant: new Date().toISOString()
    }, { onConflict: 'user_id' }); // If exists, reset/ignore? Let's just ensure it exists.

    if (data && !error) {
      setActiveResolution({
        id: data.id,
        statement: data.statement,
        rootMotivation: data.root_motivation,
        status: 'active',
        createdAt: data.created_at
      });
      setUserEconomy(prev => ({ ...prev, balance: 5 })); // Optimistic update
      setView(ViewState.DASHBOARD);
    }
  };

  const startMorningSession = async () => {
    if (userEconomy.balance < 1) {
      alert("Insufficient tokens. Complete an evening reflection to earn more.");
      return;
    }

    // Debit Token
    if (user.supabaseId) {
      await supabase.from('user_economy').update({ balance: userEconomy.balance - 1 }).eq('user_id', user.supabaseId);
      setUserEconomy(prev => ({ ...prev, balance: prev.balance - 1 }));
    }

    // Prepare Config
    // In a real implementation, we'd use the resolution context here
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

    // Grant Token Logic handled by DB trigger or manual update here?
    // For MVP manual update
    console.log("🪙 Granting token for user:", user.supabaseId);
    const { error: ecoError } = await supabase.from('user_economy').update({
      balance: userEconomy.balance + 1,
      last_daily_grant: new Date().toISOString()
    }).eq('user_id', user.supabaseId);

    if (ecoError) {
      console.error("❌ Economy update failed:", ecoError);
    } else {
      console.log("✅ Economy updated");
      setUserEconomy(prev => ({ ...prev, balance: prev.balance + 1 }));
    }

    // Update or Create Entry
    const today = new Date().toISOString().split('T')[0];
    if (todaysEntry) {
      console.log("Updating existing entry:", todaysEntry.id);
      const { error: updateError } = await supabase.from('daily_entries').update({
        evening_completed: true,
        reflection_summary: summary,
        transcript: transcript
      }).eq('id', todaysEntry.id);
      if (updateError) console.error("❌ Entry update failed:", updateError);
      else {
        console.log("✅ Entry updated successfully");
        setTodaysEntry(prev => prev ? ({ ...prev, eveningCompleted: true }) : null);
      }
    } else {
      // Create a fresh entry for today
      const { data: newEntry } = await supabase.from('daily_entries').insert({
        user_id: user.supabaseId,
        resolution_id: activeResolution.id,
        date: today,
        evening_completed: true,
        reflection_summary: summary,
        transcript: transcript
      }).select().single();

      if (newEntry) {
        setTodaysEntry({
          id: newEntry.id,
          resolutionId: activeResolution.id,
          date: newEntry.date,
          eveningCompleted: true,
          morningGenerated: false
        });
      }
    }

    // TRIGGER MEMORY AUDIT (Fire & Forget for speed)
    console.log("🧠 Triggering Memory Auditor...");
    supabase.functions.invoke('audit-reflection', {
      body: { reflection: summary, transcript, user_id: user.supabaseId }
    }).then(({ data, error }) => {
      if (error) console.error("❌ Auditor Invocation Failed:", error);
      else console.log("✅ Auditor Response:", data);
    });
  };

  const completeOnboarding = () => { /* ... */ };

  // --- REUSED AUDIO ENGINE LOGIC ---
  const finalizeMeditationGeneration = async (config: MeditationConfig) => {
    const tempId = Date.now().toString();
    try {
      const contextTexts = [
        `Goal: ${activeResolution?.statement}`,
        `Why: ${activeResolution?.rootMotivation}`
      ];
      let selectedSoundscape = soundscapes[0];

      const newMeditation: Meditation = {
        id: tempId,
        title: "Morning Alignment",
        transcript: "",
        lines: [],
        audioQueue: [], // Start empty
        isGenerating: true,
        durationMinutes: config.duration,
        createdAt: Date.now(),
        played: false,
        soundscapeId: selectedSoundscape.id,
        backgroundType: 'deep-space',
        config: config
      };

      setMeditations(prev => [newMeditation, ...prev]);
      setActiveMeditationId(tempId);
      setCurrentView(ViewState.LOADING); // Redirects to loading screen

      const { title, lines } = await generateMeditationStream(
        config.focus,
        config.feeling,
        config.duration,
        selectedSoundscape.metadata.description,
        config.voice,
        contextTexts,
        async (chunkBase64, index, instructions, mimeType) => {
          const segments = await processBatchWithSilenceSplitting(chunkBase64, index, instructions, mimeType);
          setMeditations(current => current.map(m => {
            if (m.id === tempId) {
              return { ...m, audioQueue: [...m.audioQueue, ...segments] };
            }
            return m;
          }));

          if (index === 1) setPendingMeditationConfig(null);
        },
        () => {
          setMeditations(current => current.map(m => {
            if (m.id === tempId) return { ...m, isGenerating: false };
            return m;
          }));
          setPendingMeditationConfig(null);
        }
      );

      // Save title/lines
      setMeditations(current => current.map(m => {
        if (m.id === tempId) return { ...m, title, transcript: lines.join('\n'), lines };
        return m;
      }));

    } catch (e) {
      console.error("Failed to generate meditation", e);
      alert("Generation failed. Token refunded (simulation).");
      setMeditations(prev => prev.filter(m => m.id !== tempId));
      setCurrentView(ViewState.DASHBOARD);
    }
  };

  const setView = (view: ViewState) => setCurrentView(view);
  const playMeditation = (id: string) => { setActiveMeditationId(id); setCurrentView(ViewState.PLAYER); };

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
      setView,
      playMeditation,

      // Legacy stubs
      insights, soundscapes, chatHistory, setTriage: () => { }, sendChatMessage, addSoundscape,
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
