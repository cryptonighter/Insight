/**
 * useCheckIn - Hook for conversational experience selection
 * 
 * Flow:
 * 1. AI asks opening question
 * 2. User speaks/types response
 * 3. AI suggests experience based on context
 * 4. User confirms or adjusts
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState, SessionSummaryPreview } from '../types';
import { buildCheckInContext, formatContextForPrompt } from './checkInContext';
import { extractInsight, getThemeLabel, getThemeDescription } from './insightExtractor';
import { THEMES, ThemeType } from './insightService';
import { supabase } from './supabaseClient';

const RESEMBLE_API_KEY = import.meta.env.VITE_RESEMBLE_API_KEY || '';
const RESEMBLE_STREAM_URL = 'https://f.cluster.resemble.ai/stream';
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

interface CheckInState {
    phase: 'greeting' | 'listening' | 'suggesting' | 'confirmed';
    suggestedTheme: ThemeType | null;
    suggestedDuration: number;
    currentMessage: string;
}

export const useCheckIn = () => {
    const { setView, user, setPendingMeditationConfig, soundscapes } = useApp();

    const [isActive, setIsActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [state, setState] = useState<CheckInState>({
        phase: 'greeting',
        suggestedTheme: null,
        suggestedDuration: 10,
        currentMessage: ''
    });

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const contextRef = useRef<string>('');

    // Get user's saved voice
    const savedVoiceUuid = localStorage.getItem('insight_voice_id') ||
        import.meta.env.VITE_RESEMBLE_VOICE_UUID || '38a0b764';

    // Speak using Resemble TTS
    const speak = async (text: string): Promise<void> => {
        setIsSpeaking(true);
        setState(prev => ({ ...prev, currentMessage: text }));

        try {
            const response = await fetch(RESEMBLE_STREAM_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEMBLE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    voice_uuid: savedVoiceUuid,
                    data: text,
                    model: 'chatterbox-turbo',
                    sample_rate: 44100,
                    precision: 'PCM_16',
                }),
            });

            if (!response.ok) throw new Error('TTS failed');

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            await new Promise<void>((resolve) => {
                audio.onended = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                audio.onerror = () => {
                    setIsSpeaking(false);
                    resolve();
                };
                audio.play();
            });
        } catch (error) {
            console.error('TTS error:', error);
            setIsSpeaking(false);
        }
    };

    // Generate AI response
    const generateResponse = async (userInput: string): Promise<string> => {
        const extracted = extractInsight(userInput);

        const systemPrompt = `You are a compassionate meditation guide helping someone choose the right experience.

${contextRef.current}

USER JUST SAID: "${userInput}"

EXTRACTED:
- Detected theme: ${extracted.detectedTheme || 'unclear'}
- Body focus: ${extracted.bodyFocus}
- Urgency: ${extracted.urgencyLevel}/3
- Keywords: ${extracted.keywords.join(', ')}

YOUR TASK:
1. Acknowledge what they shared (1 sentence)
2. Suggest the most fitting experience: theme + duration
3. End with a yes/no confirmation question

Keep response to 2-3 sentences max. Be warm but concise.`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: systemPrompt }] }],
                        generationConfig: { maxOutputTokens: 100, temperature: 0.7 }
                    })
                }
            );

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text ||
                "I'd suggest a 10-minute grounding session. Does that feel right?";
        } catch (error) {
            console.error('LLM error:', error);
            return "I'd suggest a 10-minute session to help you center. Does that feel right?";
        }
    };

    // Save interaction to DB
    const saveInteraction = async (
        rawTranscript: string,
        detectedTheme: ThemeType | null,
        suggestedDuration: number,
        accepted: boolean
    ) => {
        if (!user?.supabaseId) return;

        const extracted = extractInsight(rawTranscript);

        await supabase.from('user_interactions').insert({
            user_id: user.supabaseId,
            session_type: 'check_in',
            detected_theme: detectedTheme,
            detected_category: extracted.detectedCategory,
            suggested_duration: suggestedDuration,
            user_accepted: accepted,
            raw_transcript: rawTranscript,
            extracted_keywords: extracted.keywords,
            input_method: 'voice'
        });
    };

    // Start check-in
    const start = useCallback(async () => {
        setIsActive(true);
        setState({ phase: 'greeting', suggestedTheme: null, suggestedDuration: 10, currentMessage: '' });

        // Build context
        if (user?.supabaseId) {
            const ctx = await buildCheckInContext(user.supabaseId);
            contextRef.current = formatContextForPrompt(ctx);
        }

        // Opening greeting
        await speak("How are you feeling right now?");
        setState(prev => ({ ...prev, phase: 'listening' }));
    }, [user?.supabaseId]);

    // Start listening
    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            console.error('Speech recognition not supported');
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setIsSpeaking(false);
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setTranscript(prev => prev + finalTranscript + ' ');
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, []);

    // Stop listening and process
    const stopListening = useCallback(async () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);

        await new Promise(resolve => setTimeout(resolve, 500));

        const userMessage = transcript.trim();
        if (!userMessage) return;

        setTranscript('');
        setIsProcessing(true);

        try {
            const extracted = extractInsight(userMessage);
            const response = await generateResponse(userMessage);

            setState(prev => ({
                ...prev,
                phase: 'suggesting',
                suggestedTheme: extracted.detectedTheme || 'SAFETY',
                suggestedDuration: extracted.suggestedDuration,
                currentMessage: response
            }));

            await speak(response);
        } finally {
            setIsProcessing(false);
        }
    }, [transcript]);

    // Confirm and start session
    const confirm = useCallback(async () => {
        if (!state.suggestedTheme) return;

        setState(prev => ({ ...prev, phase: 'confirmed' }));

        // Save interaction
        await saveInteraction(transcript, state.suggestedTheme, state.suggestedDuration, true);

        // Build session config
        const theme = THEMES.find(t => t.id === state.suggestedTheme);
        const config: SessionSummaryPreview = {
            title: `${theme?.uxLabel || 'Mindful'} Session`,
            methodology: 'NSDR',
            focus: theme?.description || 'Centering and presence',
            duration: state.suggestedDuration,
            soundscapeId: soundscapes[0]?.id,
            preview: `A ${state.suggestedDuration}-minute session for ${theme?.description?.toLowerCase() || 'mindfulness'}.`
        };

        setPendingMeditationConfig({
            focus: config.focus,
            feeling: 'Present',
            methodology: config.methodology as any,
            intensity: 'MODERATE',
            duration: config.duration,
            soundscapeId: config.soundscapeId
        });

        await speak("Perfect. Let's begin.");
        setView(ViewState.LOADING);
    }, [state, transcript, soundscapes, setPendingMeditationConfig, setView]);

    // Skip to dashboard
    const skip = useCallback(() => {
        if (audioRef.current) audioRef.current.pause();
        if (recognitionRef.current) recognitionRef.current.stop();
        setView(ViewState.DASHBOARD);
    }, [setView]);

    // Adjust duration
    const adjustDuration = useCallback((delta: number) => {
        setState(prev => ({
            ...prev,
            suggestedDuration: Math.max(5, Math.min(30, prev.suggestedDuration + delta))
        }));
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, []);

    return {
        isActive,
        isListening,
        isSpeaking,
        isProcessing,
        transcript,
        state,
        start,
        startListening,
        stopListening,
        confirm,
        skip,
        adjustDuration
    };
};
