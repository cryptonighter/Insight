import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UserContext, Insight, Pattern, Meditation, ViewState, ChatMessage,
  SoundscapeType, MeditationConfig, VoiceId, Soundscape, FeedbackData,
  SessionLifecycleState, TriageState, MethodologyType, Part, SomaticAnchor
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
  insights: Insight[];
  patterns: Pattern[];
  meditations: Meditation[];
  currentView: ViewState;
  activeMeditationId: string | null;
  chatHistory: ChatMessage[];
  pendingMeditationConfig: Partial<MeditationConfig> | null;
  soundscapes: Soundscape[];
  parts: Part[];
  anchors: SomaticAnchor[];

  // Two-Brain State
  sessionState: SessionLifecycleState;
  triage: TriageState;

  // Actions
  completeOnboarding: () => void;
  sendChatMessage: (text: string) => Promise<void>;
  startMeditationGeneration: (focus: string, feeling: string, minutes: number, methodology?: MethodologyType, variables?: Record<string, any>) => void;
  finalizeMeditationGeneration: (config: MeditationConfig) => Promise<void>;
  createMeditation: (focus: string, feeling: string, minutes: number) => Promise<string>;
  acceptPattern: (id: string) => void;
  updatePatternNote: (id: string, note: string) => void;
  setView: (view: ViewState) => void;
  setPatterns: React.Dispatch<React.SetStateAction<Pattern[]>>;
  playMeditation: (id: string) => void;
  rateMeditation: (id: string, feedback: FeedbackData) => void;

  // Supabase Actions
  syncWithSupabase: () => Promise<void>;
  saveSessionResults: (sudsAfter: number, insight?: string) => Promise<void>;
  addSoundscape: (sc: Soundscape) => void;
  removeSoundscape: (id: string) => void;
  setTriage: React.Dispatch<React.SetStateAction<TriageState>>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserContext>({ onboardingCompleted: true, clinicalContraindications: [] }); // Default to true
  const [insights, setInsights] = useState<Insight[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME); // Default to HOME
  const [activeMeditationId, setActiveMeditationId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [soundscapes, setSoundscapes] = useState<Soundscape[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [anchors, setAnchors] = useState<SomaticAnchor[]>([]);

  const [sessionState, setSessionState] = useState<SessionLifecycleState>(SessionLifecycleState.TRIAGE);
  const [triage, setTriage] = useState<TriageState>({ valence: 0, arousal: 0, clinicalVariables: {} });

  const [pendingMeditationConfig, setPendingMeditationConfig] = useState<Partial<MeditationConfig> | null>(null);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(prev => ({ ...prev, supabaseId: session.user.id, email: session.user.email }));
      }
    });

    // 2. Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(prev => ({ ...prev, supabaseId: session.user.id, email: session.user.email }));
        syncWithSupabase();
      } else {
        setUser({ onboardingCompleted: true, clinicalContraindications: [] });
      }
    });

    // Legacy loading
    const savedUser = localStorage.getItem('reality_user');
    setInsights(MOCK_INSIGHTS);
    setPatterns(PREBUILT_PATTERNS.map(p => ({ ...p, status: 'active' })) as Pattern[]);

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Load soundscapes from IndexedDB
    const loadSoundscapes = async () => {
      try {
        const stored = await storageService.getAllSoundscapes();
        if (stored.length > 0) {
          setSoundscapes(stored);
        } else {
          setSoundscapes([MOCK_SOUNDSCAPE]);
        }
      } catch (e) {
        console.error("Failed to load soundscapes", e);
        setSoundscapes([MOCK_SOUNDSCAPE]);
      }
    };
    loadSoundscapes();

    return () => subscription.unsubscribe();
  }, []);

  const completeOnboarding = () => {
    const updatedUser = { ...user, onboardingCompleted: true };
    setUser(updatedUser);
    localStorage.setItem('reality_user', JSON.stringify(updatedUser));
  };

  const addSoundscape = async (sc: Soundscape) => {
    // Update UI immediately
    setSoundscapes(prev => [...prev, sc]);
    // Persist to IndexedDB
    try {
      await storageService.saveSoundscape(sc);
    } catch (e) {
      console.error("Failed to save soundscape to DB", e);
    }
  };

  const removeSoundscape = async (id: string) => {
    setSoundscapes(prev => prev.filter(s => s.id !== id));
    try {
      await storageService.deleteSoundscape(id);
    } catch (e) {
      console.error("Failed to delete soundscape from DB", e);
    }
  };

  const sendChatMessage = async (text: string) => {
    if (text.toLowerCase() === '/admin') {
      setCurrentView(ViewState.ADMIN);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);

    const newInsight: Insight = { id: Date.now().toString(), text, timestamp: Date.now(), type: 'text' };
    const updatedInsights = [newInsight, ...insights];
    setInsights(updatedInsights);
    // DIRECTOR LOGIC: Run orchestration in parallel or after chat
    const context = await growthContext.getRecentHistory(user.supabaseId || 'mock-user');

    // Run both in parallel for optimal speed
    const [aiResponse, directorDecision] = await Promise.all([
      chatWithInsight(chatHistory.slice(-5), text, triage.clinicalVariables),
      runDirectorOrchestration(text, triage, context)
    ]);

    let systemMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: aiResponse.reply,
      timestamp: Date.now(),
      suggestion: aiResponse.shouldOfferMeditation ? (aiResponse.meditationData as any) : undefined
    };

    // If Director has a specific tool call, override suggestion
    if (directorDecision.type === 'TOOL_CALL' && directorDecision.name === 'select_meditation_protocol') {
      const args = directorDecision.args;
      systemMsg.suggestion = {
        focus: args.focus,
        feeling: args.targetFeeling,
        duration: 10,
        methodology: args.methodology as MethodologyType,
        intensity: args.intensity as any
      };
      systemMsg.text += `\n\n[Director Suggestion: ${args.rationale || 'Optimal protocol identified'}]`;
    }

    if (systemMsg.suggestion?.methodology) {
      setTriage(prev => ({
        ...prev,
        selectedMethodology: systemMsg.suggestion?.methodology as MethodologyType
      }));
    }

    setChatHistory(prev => [...prev, systemMsg]);

    if (updatedInsights.length % 3 === 0) {
      analyzeInsightsForPatterns(updatedInsights.slice(0, 10)).then(newPatterns => {
        if (newPatterns.length > 0) {
          setPatterns(prev => {
            const existingIds = new Set(prev.map(p => p.title));
            const uniqueNew = newPatterns.filter(p => !existingIds.has(p.title));
            return [...uniqueNew, ...prev];
          });
        }
      });
    }
  };

  const startMeditationGeneration = (focus: string, feeling: string, minutes: number, methodology?: MethodologyType, variables?: Record<string, any>) => {
    setPendingMeditationConfig({ focus, feeling, duration: minutes, methodology, variables });
    setCurrentView(ViewState.CONTEXT);
  };

  // PROGRESSIVE GENERATION HANDLER
  const finalizeMeditationGeneration = async (config: MeditationConfig) => {
    try {
      const contextTexts = insights.slice(0, 5).map(i => i.text);
      let selectedSoundscape = soundscapes.find(s => s.id === config.soundscapeId) || soundscapes[0];

      // Create empty meditation object immediately
      const tempId = Date.now().toString();
      const newMeditation: Meditation = {
        id: tempId,
        title: "Creating session...",
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
      setCurrentView(ViewState.PLAYER);

      // Start streaming process
      const { title, lines } = await generateMeditationStream(
        config.focus,
        config.feeling,
        config.duration,
        selectedSoundscape.metadata.description,
        config.voice,
        contextTexts,
        async (chunkBase64, index, instructions) => {
          // Callback: Process chunk & Update state
          // Pass the instructions from the AI director to the audio segment
          const segments = await processBatchWithSilenceSplitting(chunkBase64, index, instructions);

          setMeditations(current => current.map(m => {
            if (m.id === tempId) {
              return {
                ...m,
                audioQueue: [...m.audioQueue, ...segments]
              };
            }
            return m;
          }));

          // BUFFERING STRATEGY:
          if (index === 1) {
            setPendingMeditationConfig(null);
          }
        },
        () => {
          // ON COMPLETE CALLBACK
          setMeditations(current => current.map(m => {
            if (m.id === tempId) {
              return {
                ...m,
                isGenerating: false // Done
              };
            }
            return m;
          }));

          if (lines.length <= 4) {
            setCurrentView(ViewState.PLAYER);
            setPendingMeditationConfig(null);
          }
        }
      );

      // Initial text metadata update
      setMeditations(current => current.map(m => {
        if (m.id === tempId) {
          return {
            ...m,
            title: title,
            transcript: lines.join('\n'),
            lines: lines,
          };
        }
        return m;
      }));

    } catch (e) {
      console.error("Failed to generate meditation", e);
      setCurrentView(ViewState.HOME);
    }
  };

  // Legacy/Quick Create
  const createMeditation = async (focus: string, feeling: string, minutes: number): Promise<string> => {
    const config: MeditationConfig = {
      focus, feeling, duration: minutes, voice: 'Kore', speed: 1.0,
      soundscapeId: soundscapes[0].id, background: 'deep-space'
    };
    await finalizeMeditationGeneration(config);
    return "";
  };

  const acceptPattern = (id: string) => {
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, status: 'active' as const } : p));
  };

  const updatePatternNote = (id: string, note: string) => {
    setPatterns(prev => prev.map(p => p.id === id ? { ...p, userNotes: note } : p));
  };

  const playMeditation = (id: string) => {
    setActiveMeditationId(id);
    setCurrentView(ViewState.PLAYER);
  };

  const rateMeditation = (id: string, feedback: FeedbackData) => {
    setMeditations(prev => prev.map(m => m.id === id ? { ...m, feedback: feedback } : m));
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    setParts(prev => prev.map(p => p.id === id ? { ...p, ...updates, lastAccessed: Date.now() } : p));
    const target = parts.find(p => p.id === id);
    if (target && user.supabaseId) {
      await storageService.savePart({
        ...target,
        ...updates,
        user_id: user.supabaseId,
        last_accessed: new Date().toISOString()
      });
    }
  };

  const updateAnchor = async (id: string, updates: Partial<SomaticAnchor>) => {
    setAnchors(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    const target = anchors.find(a => a.id === id);
    if (target && user.supabaseId) {
      await storageService.saveSomaticAnchor({
        ...target,
        ...updates,
        user_id: user.supabaseId
      });
    }
  };

  const syncWithSupabase = async () => {
    if (!user.supabaseId || user.supabaseId === 'mock-user' || isMockClient()) return;
    try {
      const [insightsData, partsData, anchorsData] = await Promise.all([
        supabase.from('insights').select('*').eq('user_id', user.supabaseId),
        storageService.getParts(user.supabaseId),
        storageService.getSomaticAnchors(user.supabaseId)
      ]);

      if (insightsData.data) setInsights(insightsData.data as Insight[]);

      // Map database fields to application types
      setParts((partsData as any[]).map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        relationshipScore: p.relationship_score,
        originStory: p.origin_story,
        somaticLocation: p.somatic_location,
        createdAt: new Date(p.created_at).getTime(),
        lastAccessed: new Date(p.last_accessed).getTime()
      })));

      setAnchors((anchorsData as any[]).map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        efficacyRating: a.efficacy_rating,
        createdAt: new Date(a.created_at).getTime()
      })));

      console.log("Supabase sync successful", {
        parts: partsData.length,
        anchors: anchorsData.length,
        insights: insightsData.data?.length
      });
    } catch (e) {
      console.error("Supabase sync failed", e);
    }
  };

  const saveSessionResults = async (sudsAfter: number, insight?: string) => {
    if (!user.supabaseId || !activeMeditationId || isMockClient()) return;
    const meditation = meditations.find(m => m.id === activeMeditationId);
    if (!meditation) return;

    // Map Valence/Arousal to 0-10 SUDS scale
    // Valence -1 (Bad) -> High SUDS, 1 (Good) -> Low SUDS
    // Approximate: (1 - valence) * 5
    const preSuds = Math.round((1 - triage.valence) * 5);
    const deltaSuds = preSuds - sudsAfter;

    try {
      // 1. Log Session
      await storageService.logSession({
        user_id: user.supabaseId,
        modality: meditation.config?.methodology || 'GENERAL',
        focus: meditation.config?.focus,
        feeling: meditation.config?.feeling,
        pre_suds: preSuds,
        post_suds: sudsAfter,
        delta_suds: deltaSuds,
        feedback: {
          note: insight,
          ...meditation.feedback
        },
        transcript: meditation.transcript
      });

      // 2. Handle Methodology Specific Persistence
      const variables = meditation.config?.variables;
      if (variables) {
        if (meditation.config?.methodology === 'IFS' && variables.IFS_Part_Label) {
          await storageService.savePart({
            user_id: user.supabaseId,
            name: variables.IFS_Part_Label,
            role: variables.IFS_Part_Role || 'Protector',
            relationship_score: variables.IFS_Relationship || 5,
            origin_story: variables.IFS_Concern,
            somatic_location: variables.IFS_Somatic,
            last_accessed: new Date().toISOString()
          });
        }

        if (meditation.config?.methodology === 'SOMATIC_AGENCY' && variables.SOM_Trigger) {
          await storageService.saveSomaticAnchor({
            user_id: user.supabaseId,
            type: variables.SOM_Anchor_Type || 'Kinesthetic',
            description: `Trigger: ${variables.SOM_Trigger} | Reaction: ${variables.SOM_Reaction} | Commitment: ${variables.SOM_Commitment}`,
            efficacy_rating: (10 - sudsAfter) / 10 // Higher efficacy if post-suds is low
          });
        }
      }

      // 3. Update local state
      await syncWithSupabase();
    } catch (e) {
      console.error("Failed to save session results", e);
      throw e;
    }
  };

  const setView = (view: ViewState) => setCurrentView(view);

  return (
    <AppContext.Provider value={{
      user,
      insights,
      patterns,
      meditations,
      currentView,
      activeMeditationId,
      chatHistory,
      pendingMeditationConfig: pendingMeditationConfig as MeditationConfig | null,
      soundscapes,
      parts,
      anchors,
      sessionState,
      triage,
      completeOnboarding,
      sendChatMessage,
      startMeditationGeneration,
      finalizeMeditationGeneration,
      createMeditation,
      acceptPattern,
      updatePatternNote,
      setView,
      playMeditation,
      rateMeditation,
      syncWithSupabase,
      addSoundscape,
      removeSoundscape,
      setTriage
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
