/**
 * UnifiedExperience - Meditation + Feedback in one screen
 * States: LOADING → POSTURE_INFO → PLAYING → FEEDBACK → COMPLETE
 * Button stays at bottom throughout all states
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ViewState, MethodologyType } from '../types';
import { MainButton, ButtonState } from './MainButton';
import { VolumeControls } from './VolumeControls';
import { Headphones, AlertTriangle, Mic, Keyboard, Check, Loader2 } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';
import { cn } from '@/utils';

type ExperienceState = 'POSTURE_INFO' | 'PLAYING' | 'PAUSED' | 'FEEDBACK' | 'COMPLETE';

interface FeedbackQuestion {
    id: string;
    question: string;
    answer: string;
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

export const UnifiedExperience: React.FC = () => {
    const {
        pendingMeditationConfig,
        currentMeditation,
        setView,
        soundscapes,
        audioPlayback
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

    // Volume state
    const [voiceVolume, setVoiceVolume] = useState(0.8);
    const [soundscapeVolume, setSoundscapeVolume] = useState(0.5);
    const [binauralVolume, setBinauralVolume] = useState(0.3);

    // Audio recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Progress (mock for now, would come from actual audio playback)
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(pendingMeditationConfig?.duration || 10);

    // Get methodology posture info
    const methodology = pendingMeditationConfig?.methodology || 'GENERAL';
    const posture = POSTURE_INFO[methodology] || POSTURE_INFO.GENERAL;

    // Simulate playback progress
    useEffect(() => {
        if (experienceState === 'PLAYING') {
            const interval = setInterval(() => {
                setPlaybackProgress(prev => {
                    if (prev >= 100) {
                        setExperienceState('FEEDBACK');
                        return 100;
                    }
                    return prev + (100 / (playbackDuration * 60)); // 1 second increment
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [experienceState, playbackDuration]);

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

                // Update current answer
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

    // Handle button click based on state
    const handleButtonClick = () => {
        switch (experienceState) {
            case 'POSTURE_INFO':
                setExperienceState('PLAYING');
                break;
            case 'PLAYING':
                setExperienceState('PAUSED');
                break;
            case 'PAUSED':
                setExperienceState('PLAYING');
                break;
            case 'FEEDBACK':
                if (isRecording) {
                    stopRecording();
                } else if (currentQuestionIndex < FEEDBACK_QUESTIONS.length - 1) {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setShowTyping(false);
                    setTypingInput('');
                } else {
                    setExperienceState('COMPLETE');
                }
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
                return currentQuestionIndex < FEEDBACK_QUESTIONS.length - 1 ? 'NEXT' : 'FINISH';
            case 'COMPLETE': return 'DONE';
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const currentSeconds = (playbackProgress / 100) * playbackDuration * 60;
    const totalSeconds = playbackDuration * 60;

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
                                    <span>{formatTime(currentSeconds)}</span>
                                    <span>{formatTime(totalSeconds)}</span>
                                </div>
                                <div className="h-1 bg-surface rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary/60 transition-all duration-1000"
                                        style={{ width: `${playbackProgress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Waveform visualization placeholder */}
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
                                        <button
                                            onClick={() => setShowTyping(false)}
                                            className="flex-1 py-2 rounded-lg bg-surface/50 text-white/60 text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveTypedAnswer}
                                            className="flex-1 py-2 rounded-lg bg-primary text-black font-bold text-sm"
                                        >
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
                    isLoading={isTranscribing}
                    label={getButtonLabel()}
                    onClick={handleButtonClick}
                />
            </footer>
        </div>
    );
};

export default UnifiedExperience;
