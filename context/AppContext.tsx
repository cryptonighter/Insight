
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserContext, Insight, Pattern, Meditation, ViewState, ChatMessage, SoundscapeType, MeditationConfig, VoiceId, Soundscape, FeedbackData } from '../types';
import { PREBUILT_PATTERNS, MOCK_INSIGHTS } from '../constants';
import { analyzeInsightsForPatterns, generateMeditationStream, chatWithInsight } from '../services/geminiService';
import { processBatchWithSilenceSplitting } from '../services/audioEngine'; 
import { storageService } from '../services/storageService';

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
  
  // Actions
  completeOnboarding: () => void;
  sendChatMessage: (text: string) => Promise<void>;
  startMeditationGeneration: (focus: string, feeling: string, minutes: number) => void;
  finalizeMeditationGeneration: (config: MeditationConfig) => Promise<void>; 
  createMeditation: (focus: string, feeling: string, minutes: number) => Promise<string>;
  acceptPattern: (id: string) => void;
  updatePatternNote: (id: string, note: string) => void;
  setView: (view: ViewState) => void;
  playMeditation: (id: string) => void;
  rateMeditation: (id: string, feedback: FeedbackData) => void;
  
  addSoundscape: (sc: Soundscape) => void;
  removeSoundscape: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserContext>({ onboardingCompleted: true }); // Default to true
  const [insights, setInsights] = useState<Insight[]>([]); 
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME); // Default to HOME
  const [activeMeditationId, setActiveMeditationId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [soundscapes, setSoundscapes] = useState<Soundscape[]>([]);
  
  const [pendingMeditationConfig, setPendingMeditationConfig] = useState<Partial<MeditationConfig> | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('reality_user');
    
    // Always initialize data for the prototype
    setInsights(MOCK_INSIGHTS);
    setPatterns(PREBUILT_PATTERNS.map(p => ({...p, status: 'active'})) as Pattern[]);
    
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

    const aiResponse = await chatWithInsight(chatHistory.slice(-5), text);
    
    const systemMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: aiResponse.text,
      timestamp: Date.now(),
      suggestion: aiResponse.suggestion
    };
    
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

  const startMeditationGeneration = (focus: string, feeling: string, minutes: number) => {
    setPendingMeditationConfig({ focus, feeling, duration: minutes });
    setCurrentView(ViewState.LOADING);
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
                 setCurrentView(ViewState.PLAYER);
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
      pendingMeditationConfig,
      soundscapes,
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
      addSoundscape,
      removeSoundscape
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
