
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, Send, Sparkles, StopCircle, ArrowRight, Settings, Loader2 } from 'lucide-react';
import { ViewState } from '../types';
import { transcribeAudio } from '../services/geminiService';

export const Home: React.FC = () => {
  const { chatHistory, sendChatMessage, startMeditationGeneration, setView } = useApp();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setInputText(''); 
    setIsThinking(true);
    await sendChatMessage(text);
    setIsThinking(false);
  }, [sendChatMessage]);

  // Recording Logic (Robust Gemini Transcription)
  const startRecording = async () => {
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
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(',')[1];
          const transcribedText = await transcribeAudio(base64String);
          
          if (transcribedText) {
             setInputText(prev => (prev ? prev + " " + transcribedText : transcribedText));
          }
          setIsTranscribing(false);
        };

        // Clean up tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is required for voice input. Please check your browser permissions.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSuggestionAccept = (suggestion: { focus: string, feeling: string, duration: number }) => {
    startMeditationGeneration(suggestion.focus, suggestion.feeling, suggestion.duration);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-liquid app-text-primary">
      {/* Ambient BG */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-5%] left-[-5%] w-[500px] h-[500px] bg-sky-200/50 rounded-full mix-blend-multiply blur-[100px] opacity-70 animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-pink-200/50 rounded-full mix-blend-multiply blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
      </div>

      {/* Header */}
      <div className="pt-8 pb-4 px-6 z-10 bg-white/40 backdrop-blur-md flex justify-between items-center sticky top-0 border-b border-white/50">
        <div className="w-8"></div> {/* Spacer */}
        <h1 className="text-sm font-medium tracking-[0.2em] app-text-secondary uppercase text-center">Insight Stream</h1>
        <button onClick={() => setView(ViewState.ADMIN)} className="text-slate-400 hover:text-indigo-500 transition-colors">
            <Settings size={20} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar z-10 pt-4">
        <div className="max-w-xl mx-auto space-y-6">
          
          {chatHistory.length === 0 && (
             <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-60">
                <Sparkles className="w-8 h-8 text-indigo-400 mb-4 opacity-50" />
                <p className="text-lg font-light app-text-secondary">What is alive for you right now?</p>
             </div>
          )}

          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] p-5 rounded-2xl text-lg font-light leading-relaxed backdrop-blur-md shadow-lg
                ${msg.role === 'user' 
                  ? 'bg-blue-100/60 text-slate-700 rounded-tr-none border border-blue-200/80' 
                  : 'bg-white/80 text-slate-800 rounded-tl-none border border-gray-200/80'}`}
              >
                {msg.text}
              </div>

              {/* Suggestion Card */}
              {msg.suggestion && (
                <div className="mt-4 w-full max-w-[85%] animate-fade-in">
                  <div className="bg-gradient-to-br from-indigo-100/80 to-blue-100/80 border border-indigo-200/80 p-5 rounded-xl backdrop-blur-xl">
                    <div className="flex items-start gap-3 mb-3">
                       <Sparkles size={16} className="text-amber-500 mt-1" />
                       <div>
                         <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider mb-1">Meditation Suggested</h3>
                         <p className="text-sm app-text-primary">
                           A {msg.suggestion.duration} min session focusing on <span className="text-indigo-700">"{msg.suggestion.focus}"</span> to help you feel <span className="text-indigo-700">{msg.suggestion.feeling}</span>.
                         </p>
                       </div>
                    </div>
                    <button 
                      onClick={() => handleSuggestionAccept(msg.suggestion!)}
                      className="w-full mt-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-700 py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <span className="text-sm font-medium">Create & Play</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isThinking && (
             <div className="flex items-center gap-2 app-text-secondary text-sm pl-4">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-[80px] left-0 w-full px-4 z-20">
        <div className="max-w-xl mx-auto glass rounded-full p-2 pl-6 flex items-center gap-2 shadow-2xl border border-white/60">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)} 
            placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing audio..." : "Type or speak..."}
            disabled={isRecording || isTranscribing}
            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 placeholder-slate-400 disabled:opacity-50"
          />
          
          {isTranscribing ? (
             <div className="p-3 text-indigo-500 animate-spin">
               <Loader2 size={20} />
             </div>
          ) : inputText.length > 0 ? (
            <button 
              onClick={() => handleSendMessage(inputText)} 
              className="p-3 bg-indigo-500 hover:bg-indigo-400 rounded-full text-white transition-colors"
            >
              <Send size={20} />
            </button>
          ) : (
            <button 
              onClick={handleRecordToggle}
              className={`p-3 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500/80 text-white animate-pulse' : 'bg-white/40 text-slate-600 hover:text-slate-800'}`}
            >
              {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
