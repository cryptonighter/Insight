/**
 * useConversationalReflection - Voice-based post-session reflection
 * 
 * Flow:
 * 1. AI greets user, asks about session experience
 * 2. User holds button to speak (Web Speech API)
 * 3. LLM generates contextual response
 * 4. Resemble TTS speaks the response
 * 5. AI gently redirects if off-topic
 * 6. After ~3-5 exchanges, summarizes insights
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';

const RESEMBLE_API_KEY = import.meta.env.VITE_RESEMBLE_API_KEY || '';
const RESEMBLE_STREAM_URL = 'https://f.cluster.resemble.ai/stream';
const RESEMBLE_VOICE_UUID = import.meta.env.VITE_RESEMBLE_VOICE_UUID || '38a0b764';

// LLM API (OpenRouter or Gemini)
const OPENROUTER_API_KEY = import.meta.env.OPENROUTER_API_KEY || '';
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

interface ConversationTurn {
    role: 'assistant' | 'user';
    content: string;
}

interface SessionContext {
    methodology?: string;
    duration?: number;
    focus?: string;
    transcript?: string;
}

export const useConversationalReflection = () => {
    const { setView, activeMeditationId, meditations, triage, completeEveningReflection } = useApp();

    // State
    const [isActive, setIsActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [transcript, setTranscript] = useState('');
    const [exchangeCount, setExchangeCount] = useState(0);

    // Refs
    const conversationRef = useRef<ConversationTurn[]>([]);
    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const sessionContextRef = useRef<SessionContext>({});

    // Get current meditation context
    const meditation = meditations.find(m => m.id === activeMeditationId);

    // Initialize session context
    useEffect(() => {
        if (meditation) {
            sessionContextRef.current = {
                methodology: triage.selectedMethodology,
                duration: meditation.config?.duration,
                focus: meditation.config?.focus,
                transcript: meditation.script?.substring(0, 500)
            };
        }
    }, [meditation, triage]);

    // Build system prompt for conversational AI
    const buildSystemPrompt = () => {
        const ctx = sessionContextRef.current;
        return `You are a warm, curious reflection guide having a natural conversation after a meditation session.

SESSION CONTEXT:
- Type: ${ctx.methodology || 'Mindfulness'} meditation
- Duration: ${ctx.duration || 10} minutes
- Focus: ${ctx.focus || 'General awareness'}
- Session excerpt: "${ctx.transcript?.substring(0, 200) || 'Not available'}..."

YOUR APPROACH:
- Keep responses SHORT (1-2 sentences max) to maintain conversational flow
- Ask one question at a time, follow their lead
- Listen for: insights, body sensations, emotional shifts, resistance, breakthroughs
- If they go off-topic, gently redirect: "That's interesting... and how does that connect to what you noticed in today's session?"
- ALWAYS eventually ask what could be improved for next time (phrase it naturally)

CONVERSATION STRUCTURE:
1. First: Ask what stood out from the session
2. Follow their thread with curiosity
3. Explore any insights or challenges they mention
4. Before ending: Ask what would make future sessions better
5. After 4-5 exchanges: Offer to summarize with "Would you like me to capture the key insight from our conversation?"

TONE: Warm, present, genuinely curious - like a wise friend, not a therapist or interviewer.`;
    };

    // Generate AI response using LLM
    const generateResponse = async (userMessage: string): Promise<string> => {
        conversationRef.current.push({ role: 'user', content: userMessage });

        const messages = [
            { role: 'system', content: buildSystemPrompt() },
            ...conversationRef.current.map(turn => ({
                role: turn.role,
                content: turn.content
            }))
        ];

        try {
            // Try OpenRouter first, fallback to Gemini
            if (OPENROUTER_API_KEY) {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'anthropic/claude-3-haiku',
                        messages,
                        max_tokens: 150,
                        temperature: 0.8,
                    })
                });

                const data = await response.json();
                const aiResponse = data.choices?.[0]?.message?.content || "I'm curious to hear more about your experience.";
                conversationRef.current.push({ role: 'assistant', content: aiResponse });
                return aiResponse;
            } else {
                // Fallback to Gemini
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
                            contents: conversationRef.current.map(turn => ({
                                role: turn.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: turn.content }]
                            })),
                            generationConfig: { maxOutputTokens: 150, temperature: 0.8 }
                        })
                    }
                );

                const data = await response.json();
                const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Tell me more about that.";
                conversationRef.current.push({ role: 'assistant', content: aiResponse });
                return aiResponse;
            }
        } catch (error) {
            console.error('LLM error:', error);
            return "I'm having trouble connecting. Could you repeat that?";
        }
    };

    // Speak response using Resemble TTS (turbo mode)
    const speak = async (text: string): Promise<void> => {
        setIsSpeaking(true);
        setCurrentMessage(text);

        // Get user's selected voice from localStorage (set via Settings)
        const savedVoiceUuid = localStorage.getItem('insight_voice_id') || RESEMBLE_VOICE_UUID;

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

    // Start speech recognition (push-to-talk)
    const startListening = useCallback(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            console.error('Speech recognition not supported');
            return;
        }

        // Stop any playing audio
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

        // Wait a moment for final transcript
        await new Promise(resolve => setTimeout(resolve, 500));

        const userMessage = transcript.trim();
        if (!userMessage) return;

        setTranscript('');
        setIsProcessing(true);

        try {
            const response = await generateResponse(userMessage);
            setExchangeCount(prev => prev + 1);
            await speak(response);
        } finally {
            setIsProcessing(false);
        }
    }, [transcript]);

    // Start the reflection session
    const start = useCallback(async () => {
        setIsActive(true);
        conversationRef.current = [];
        setExchangeCount(0);

        // Initial greeting
        const greeting = "Welcome back. What stood out to you from today's session?";
        conversationRef.current.push({ role: 'assistant', content: greeting });
        await speak(greeting);
    }, []);

    // End the reflection session
    const end = useCallback(async () => {
        // Stop any audio/recognition
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        // Generate summary from conversation
        const fullConversation = conversationRef.current
            .map(turn => `${turn.role === 'assistant' ? 'Guide' : 'You'}: ${turn.content}`)
            .join('\n');

        // Quick summary generation
        let summary = "Reflection session completed.";
        try {
            const summaryPrompt = `Based on this reflection conversation, write a single first-person sentence starting with "I realized..." or "I noticed..." that captures the key insight:\n\n${fullConversation}`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: summaryPrompt }] }],
                        generationConfig: { maxOutputTokens: 50 }
                    })
                }
            );

            const data = await response.json();
            summary = data.candidates?.[0]?.content?.parts?.[0]?.text || summary;
        } catch (error) {
            console.error('Summary generation error:', error);
        }

        // Save to evening reflection
        await completeEveningReflection(summary, fullConversation);

        setIsActive(false);
        setIsListening(false);
        setIsSpeaking(false);
        setCurrentMessage('');
    }, [completeEveningReflection]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, []);

    return {
        // State
        isActive,
        isListening,
        isSpeaking,
        isProcessing,
        currentMessage,
        transcript,
        exchangeCount,

        // Actions
        start,
        end,
        startListening,
        stopListening,
    };
};
