/**
 * UnifiedExperience - Meditation + Feedback + Insight Review
 * States: POSTURE_INFO → PLAYING → FEEDBACK → INSIGHT_REVIEW → COMPLETE
 * Button stays at bottom throughout all states
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ViewState } from '../types';
import { MainButton, ButtonState } from './MainButton';
import { VolumeControls } from './VolumeControls';
import { Headphones, AlertTriangle, Mic, Keyboard, Check, Loader2, X, Sparkles } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';
import { saveSessionFeedback, saveInsight } from '../services/insightService';
import { AudioService } from '../services/audioService';
import { cn } from '@/utils';

type ExperienceState = 'POSTURE_INFO' | 'PLAYING' | 'PAUSED' | 'FEEDBACK' | 'INSIGHT_REVIEW' | 'COMPLETE';

interface FeedbackQuestion {
    id: string;
    question: string;
    answer: string;
}

interface ExtractedInsight {
    id: string;
    text: string;
    removed: boolean;
}

const FEEDBACK_QUESTIONS: Omit<FeedbackQuestion, 'answer'>[] = [
    { id: 'insights', question: 'What insights arose during the session?' },
    { id: 'positive', question: 'What felt good about this experience?' },
    { id: 'improve', question: 'What could be improved?' }
];

// Posture recommendations per methodology
const POSTURE_INFO: Record<string, { position: string; icon: string; description: string }> = {
    NSDR: {
        position: 'Lying down',
        icon: '🛏️',
        description: 'This session is best experienced lying down with eyes closed. Find a comfortable position where you can fully relax.'
    },
    SOMATIC_AGENCY: {
        position: 'Sitting or standing',
        icon: '🧘',
        description: 'This session involves body awareness. Sit comfortably or stand with room to move slightly.'
    },
    IFS: {
        position: 'Sitting comfortably',
        icon: '🪑',
        description: 'Find a comfortable seated position where you feel safe and can focus inward.'
    },
    GENERAL: {
        position: 'Sitting or lying',
        icon: '🧘',
        description: 'Choose any comfortable position where you can relax and focus on your breath.'
    }
};

/**
 * Extract insights from feedback text using simple parsing
 * (In production, this would use AI extraction)
 */
function extractInsightsFromFeedback(feedbackAnswers: FeedbackQuestion[]): ExtractedInsight[] {
    const insights: ExtractedInsight[] = [];
    let idCounter = 0;

    // Get the insights answer (Q1)
    const insightsText = feedbackAnswers.find(q => q.id === 'insights')?.answer || '';

    if (insightsText.trim()) {
        // Split by sentence endings or common separators
        const sentences = insightsText
            .split(/[.!?]\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 10 && s.length < 300);

        // If we got sentences, use them; otherwise use the whole text
        if (sentences.length > 0) {
            sentences.forEach(sentence => {
                insights.push({
                    id: `extracted-${idCounter++}`,
                    text: sentence.endsWith('.') ? sentence : sentence + '.',
                    removed: false
                });
            });
        } else if (insightsText.length >= 10) {
            insights.push({
                id: `extracted-${idCounter++}`,
                text: insightsText,
                removed: false
            });
        }
    }

    // Also extract from positive feedback if it contains insight-like content
    const positiveText = feedbackAnswers.find(q => q.id === 'positive')?.answer || '';
    if (positiveText.length > 20 && positiveText.toLowerCase().includes('realize')) {
        insights.push({
            id: `extracted-${idCounter++}`,
            text: positiveText,
            removed: false
        });
    }

    return insights;
}

export const UnifiedExperience: React.FC = () => {
    const {
        pendingMeditationConfig,
        currentMeditation,
        setView,
        user
    } = useApp();

    // State
    const [experienceState, setExperienceState] = useState<ExperienceState>('POSTURE_INFO');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [feedbackAnswers, setFeedbackAnswers] = useState<FeedbackQuestion[]>(
        FEEDBACK_QUESTIONS.map(q => ({ ...q, answer: '' }))
    );
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [showTyping, setShowTyping] = useState(false);
    const [typingInput, setTypingInput] = useState('');

    // Insight extraction state
    const [extractedInsights, setExtractedInsights] = useState<ExtractedInsight[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Volume state
    const [voiceVolume, setVoiceVolume] = useState(0.8);
    const [soundscapeVolume, setSoundscapeVolume] = useState(0.5);
    const [binauralVolume, setBinauralVolume] = useState(0.3);

    // Audio recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Progress - now driven by real audio playback
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [currentSegmentText, setCurrentSegmentText] = useState('');

    // Get methodology posture info
    const methodology = pendingMeditationConfig?.methodology || 'GENERAL';
    const posture = POSTURE_INFO[methodology] || POSTURE_INFO.GENERAL;

    // Initialize AudioService on mount and cleanup on unmount
    useEffect(() => {
        return () => {
            AudioService.stop();
        };
    }, []);

    // Sync volume controls with AudioService
    useEffect(() => {
        AudioService.setVolume('voice', voiceVolume);
    }, [voiceVolume]);

    useEffect(() => {
        AudioService.setVolume('soundscape', soundscapeVolume);
    }, [soundscapeVolume]);

    useEffect(() => {
        AudioService.setVolume('binaural', binauralVolume);
    }, [binauralVolume]);

    // Start real audio playback when entering PLAYING state
    const startRealPlayback = async () => {
        if (!currentMeditation?.audioQueue || currentMeditation.audioQueue.length === 0) {
            console.warn('🔊 No audio segments available to play');
            return;
        }

        try {
            // Initialize AudioService (unlocks audio on iOS)
            await AudioService.init();

            // Start queue playback
            await AudioService.playQueue(currentMeditation.audioQueue, {
                onProgress: (state) => {
                    setPlaybackProgress(state.progress);
                    setCurrentTime(state.currentTime);
                    setTotalDuration(state.totalDuration);
                },
                onSegmentChange: (index, segment) => {
                    setCurrentSegmentText(segment.text || '');
                    console.log(`🔊 Now playing segment ${index + 1}: ${segment.text?.substring(0, 50)}...`);
                },
                onComplete: () => {
                    console.log('✅ Meditation playback complete');
                    setSoundscapeVolume(0.2);
                    setPlaybackProgress(100);
                    setExperienceState('FEEDBACK');
                }
            });
        } catch (error) {
            console.error('🔊 Failed to start playback:', error);
        }
    };

    // Start recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await handleTranscription(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // Handle transcription
    const handleTranscription = async (audioBlob: Blob) => {
        setIsTranscribing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const transcription = await transcribeAudio(base64);

                setFeedbackAnswers(prev => prev.map((q, i) =>
                    i === currentQuestionIndex
                        ? { ...q, answer: q.answer + (q.answer ? ' ' : '') + transcription }
                        : q
                ));
            };
        } catch (error) {
            console.error('Transcription failed:', error);
        } finally {
            setIsTranscribing(false);
        }
    };

    // Process feedback and extract insights
    const processFeedbackAndExtract = async () => {
        // Save feedback to Supabase
        if (user?.supabaseId && currentMeditation?.id) {
            await saveSessionFeedback(
                user.supabaseId,
                currentMeditation.id,
                feedbackAnswers.find(q => q.id === 'insights')?.answer || '',
                feedbackAnswers.find(q => q.id === 'positive')?.answer || '',
                feedbackAnswers.find(q => q.id === 'improve')?.answer || ''
            );
        }

        // Extract insights
        const insights = extractInsightsFromFeedback(feedbackAnswers);
        setExtractedInsights(insights);

        // Move to insight review if we have insights, otherwise complete
        if (insights.length > 0) {
            setExperienceState('INSIGHT_REVIEW');
        } else {
            setExperienceState('COMPLETE');
        }
    };

    // Save kept insights and complete
    const saveInsightsAndComplete = async () => {
        setIsSaving(true);

        if (user?.supabaseId) {
            const insightsToSave = extractedInsights.filter(i => !i.removed);

            for (const insight of insightsToSave) {
                await saveInsight(
                    user.supabaseId,
                    insight.text,
                    'REFLECTION',
                    currentMeditation?.id
                );
            }
        }

        setIsSaving(false);
        // Fade out soundscape
        setSoundscapeVolume(0);
        setExperienceState('COMPLETE');
    };

    // Remove insight
    const toggleInsightRemoval = (id: string) => {
        setExtractedInsights(prev =>
            prev.map(i => i.id === id ? { ...i, removed: !i.removed } : i)
        );
    };

    // Handle button click
    const handleButtonClick = async () => {
        switch (experienceState) {
            case 'POSTURE_INFO':
                setExperienceState('PLAYING');
                // Start real audio playback
                startRealPlayback();
                break;
            case 'PLAYING':
                setExperienceState('PAUSED');
                AudioService.pause();
                break;
            case 'PAUSED':
                setExperienceState('PLAYING');
                AudioService.resume();
                break;
            case 'FEEDBACK':
                if (isRecording) {
                    stopRecording();
                } else if (currentQuestionIndex < FEEDBACK_QUESTIONS.length - 1) {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setShowTyping(false);
                    setTypingInput('');
                } else {
                    processFeedbackAndExtract();
                }
                break;
            case 'INSIGHT_REVIEW':
                saveInsightsAndComplete();
                break;
            case 'COMPLETE':
                setView(ViewState.DASHBOARD);
                break;
        }
    };

    // Save typed answer
    const saveTypedAnswer = () => {
        if (typingInput.trim()) {
            setFeedbackAnswers(prev => prev.map((q, i) =>
                i === currentQuestionIndex
                    ? { ...q, answer: typingInput.trim() }
                    : q
            ));
        }
        setShowTyping(false);
        setTypingInput('');
    };

    // Get button state
    const getButtonState = (): ButtonState => {
        switch (experienceState) {
            case 'POSTURE_INFO': return 'loading';
            case 'PLAYING': return 'playing';
            case 'PAUSED': return 'paused';
            case 'FEEDBACK': return 'feedback';
            case 'INSIGHT_REVIEW': return 'feedback';
            case 'COMPLETE': return 'complete';
        }
    };

    // Get button label
    const getButtonLabel = () => {
        switch (experienceState) {
            case 'POSTURE_INFO': return 'READY';
            case 'PLAYING': return 'PAUSE';
            case 'PAUSED': return 'RESUME';
            case 'FEEDBACK':
                if (isRecording) return 'DONE';
                return currentQuestionIndex < FEEDBACK_QUESTIONS.length - 1 ? 'NEXT' : 'REVIEW';
            case 'INSIGHT_REVIEW': return isSaving ? 'SAVING' : 'SAVE';
            case 'COMPLETE': return 'DONE';
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Time display now uses real values from AudioService
    const keptInsightsCount = extractedInsights.filter(i => !i.removed).length;

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background-dark">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
                <AnimatePresence mode="wait">
                    {/* POSTURE INFO */}
                    {experienceState === 'POSTURE_INFO' && (
                        <motion.div
                            key="posture"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-sm text-center space-y-6"
                        >
                            <div className="text-6xl mb-4">{posture.icon}</div>
                            <h2 className="text-xl font-bold text-white">Best experienced {posture.position.toLowerCase()}</h2>
                            <p className="text-sm text-white/60 leading-relaxed">{posture.description}</p>

                            <div className="space-y-3 pt-4">
                                <div className="flex items-center gap-3 px-4 py-3 bg-surface/30 rounded-xl border border-white/5">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500/70 shrink-0" />
                                    <span className="text-xs text-white/50 text-left">Not while driving or doing activities requiring alertness</span>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-3 bg-surface/30 rounded-xl border border-white/5">
                                    <Headphones className="w-5 h-5 text-primary/70 shrink-0" />
                                    <span className="text-xs text-white/50 text-left">Headphones recommended for best experience</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* PLAYING / PAUSED */}
                    {(experienceState === 'PLAYING' || experienceState === 'PAUSED') && (
                        <motion.div
                            key="playing"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-sm space-y-6"
                        >
                            {/* Progress bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-white/40">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(totalDuration)}</span>
                                </div>
                                <div className="h-1 bg-surface rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary/60 transition-all duration-1000"
                                        style={{ width: `${playbackProgress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Waveform visualization */}
                            <div className="h-24 flex items-center justify-center gap-1">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-primary/40 rounded-full"
                                        animate={{
                                            height: experienceState === 'PLAYING'
                                                ? [10, 30 + Math.random() * 40, 10]
                                                : 10
                                        }}
                                        transition={{
                                            duration: 0.5 + Math.random() * 0.5,
                                            repeat: Infinity,
                                            delay: i * 0.05
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Volume Controls */}
                            <VolumeControls
                                voiceVolume={voiceVolume}
                                soundscapeVolume={soundscapeVolume}
                                binauralVolume={binauralVolume}
                                onVoiceChange={setVoiceVolume}
                                onSoundscapeChange={setSoundscapeVolume}
                                onBinauralChange={setBinauralVolume}
                            />
                        </motion.div>
                    )}

                    {/* FEEDBACK */}
                    {experienceState === 'FEEDBACK' && (
                        <motion.div
                            key="feedback"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-sm space-y-6"
                        >
                            <div className="text-center">
                                <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
                                    Question {currentQuestionIndex + 1} of {FEEDBACK_QUESTIONS.length}
                                </span>
                                <h2 className="text-lg font-bold text-white mt-2 leading-relaxed">
                                    "{FEEDBACK_QUESTIONS[currentQuestionIndex].question}"
                                </h2>
                            </div>

                            {showTyping ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={typingInput}
                                        onChange={(e) => setTypingInput(e.target.value)}
                                        placeholder="Type your answer..."
                                        rows={4}
                                        className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 resize-none"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowTyping(false)} className="flex-1 py-2 rounded-lg bg-surface/50 text-white/60 text-sm">
                                            Cancel
                                        </button>
                                        <button onClick={saveTypedAnswer} className="flex-1 py-2 rounded-lg bg-primary text-black font-bold text-sm">
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Recording button */}
                                    <button
                                        onClick={isRecording ? stopRecording : startRecording}
                                        disabled={isTranscribing}
                                        className={cn(
                                            "w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 transition-all",
                                            isRecording
                                                ? 'bg-red-500/20 border-red-500 animate-pulse'
                                                : 'bg-surface/30 border-white/10 hover:border-primary/50'
                                        )}
                                    >
                                        {isTranscribing ? (
                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        ) : (
                                            <Mic className={cn("w-8 h-8", isRecording ? 'text-red-400' : 'text-primary/60')} />
                                        )}
                                        <span className="text-sm text-white/60">
                                            {isTranscribing ? 'Transcribing...' : isRecording ? 'Recording... tap to stop' : 'Tap to record'}
                                        </span>
                                    </button>

                                    {/* Current answer preview */}
                                    {feedbackAnswers[currentQuestionIndex].answer && (
                                        <div className="bg-surface/30 rounded-xl p-4 border border-white/5">
                                            <p className="text-sm text-white/70 italic">
                                                "{feedbackAnswers[currentQuestionIndex].answer}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Type instead */}
                                    <button
                                        onClick={() => setShowTyping(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-white/40 hover:text-white/60"
                                    >
                                        <Keyboard className="w-4 h-4" />
                                        Type instead
                                    </button>
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* INSIGHT REVIEW */}
                    {experienceState === 'INSIGHT_REVIEW' && (
                        <motion.div
                            key="insight-review"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-sm space-y-6"
                        >
                            <div className="text-center">
                                <Sparkles className="w-8 h-8 text-primary/60 mx-auto mb-2" />
                                <h2 className="text-lg font-bold text-white">Your Insights</h2>
                                <p className="text-xs text-white/40 mt-1">
                                    Remove any you don't want to keep
                                </p>
                            </div>

                            <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                                {extractedInsights.map((insight) => (
                                    <div
                                        key={insight.id}
                                        className={cn(
                                            "flex items-start gap-3 p-4 rounded-xl border transition-all",
                                            insight.removed
                                                ? 'bg-surface/20 border-white/5 opacity-50'
                                                : 'bg-surface/40 border-primary/30'
                                        )}
                                    >
                                        <p className={cn(
                                            "flex-1 text-sm leading-relaxed",
                                            insight.removed ? 'line-through text-white/30' : 'text-white/80'
                                        )}>
                                            {insight.text}
                                        </p>
                                        <button
                                            onClick={() => toggleInsightRemoval(insight.id)}
                                            className={cn(
                                                "shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all",
                                                insight.removed
                                                    ? 'bg-primary/20 text-primary'
                                                    : 'bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400'
                                            )}
                                        >
                                            {insight.removed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <p className="text-center text-xs text-white/30">
                                {keptInsightsCount} insight{keptInsightsCount !== 1 ? 's' : ''} will be saved
                            </p>
                        </motion.div>
                    )}

                    {/* COMPLETE */}
                    {experienceState === 'COMPLETE' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-4"
                        >
                            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                                <Check className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
                            <p className="text-sm text-white/50">+1 Token earned</p>
                            {keptInsightsCount > 0 && (
                                <p className="text-xs text-primary/70">{keptInsightsCount} insight{keptInsightsCount !== 1 ? 's' : ''} saved</p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Button at bottom */}
            <footer className="relative z-20 flex justify-center pb-8">
                <MainButton
                    position="bottom"
                    state={getButtonState()}
                    progress={experienceState === 'PLAYING' ? playbackProgress : experienceState === 'COMPLETE' ? 100 : 50}
                    isLoading={isTranscribing || isSaving}
                    label={getButtonLabel()}
                    onClick={handleButtonClick}
                />
            </footer>
        </div>
    );
};

export default UnifiedExperience;
