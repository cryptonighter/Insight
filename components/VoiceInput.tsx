import React, { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, Loader2, AlertCircle } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    isProcessing?: boolean;
    placeholder?: string;
    className?: string; // Additional classes for the container
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
    onTranscript,
    isProcessing = false,
    placeholder = "Type or speak...",
    className = ""
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [localTranscript, setLocalTranscript] = useState('');
    const [useWebSpeech, setUseWebSpeech] = useState(true);

    // Web Speech API Refs
    const recognitionRef = useRef<any>(null);

    // MediaRecorder Fallback Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        // Check browser support for Web Speech API
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setUseWebSpeech(false);
        }
    }, []);

    const startWebSpeech = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Update local preview
            if (interimTranscript) setLocalTranscript(interimTranscript);
            if (finalTranscript) {
                setLocalTranscript('');
                onTranscript(finalTranscript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            if (isRecording) {
                // Should restart if we want continuous, but strictly for this component 
                // we might just let it stop or auto-restart. 
                // For now, let's treat it as a stop.
                setIsRecording(false);
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const startMediaRecorder = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                setIsTranscribing(true);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

                // Clean up tracks
                stream.getTracks().forEach(track => track.stop());

                // Convert Blob to Base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64String = (reader.result as string).split(',')[1];
                    const text = await transcribeAudio(base64String); // Fallback to Gemini
                    onTranscript(text);
                    setIsTranscribing(false);
                };
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Microphone access is required.");
            setIsRecording(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            // Stop
            if (useWebSpeech && recognitionRef.current) {
                recognitionRef.current.stop();
            } else if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        } else {
            // Start
            setIsRecording(true);
            if (useWebSpeech) {
                startWebSpeech();
            } else {
                startMediaRecorder();
            }
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Visualizer / Status Overlay could go here */}
            {isRecording && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-xs px-3 py-1 rounded-full opacity-80 animate-pulse">
                    {localTranscript || "Listening..."}
                </div>
            )}

            <button
                onClick={toggleRecording}
                disabled={isTranscribing || isProcessing}
                className={`
          p-3 rounded-full transition-all duration-300 shadow-sm
          ${isRecording
                        ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110'
                        : 'bg-white/40 text-slate-600 hover:text-slate-800 hover:bg-white/60'}
          ${(isTranscribing || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                {isTranscribing || isProcessing ? (
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                ) : isRecording ? (
                    <StopCircle size={20} />
                ) : (
                    <Mic size={20} />
                )}
            </button>
        </div>
    );
};
