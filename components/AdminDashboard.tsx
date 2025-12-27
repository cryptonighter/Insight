
import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, Music, Activity, Save, Trash2, X } from 'lucide-react';
import { analyzeSoundscape } from '../services/geminiService';
import { Soundscape } from '../types';

export const AdminDashboard: React.FC = () => {
  const { soundscapes, addSoundscape, removeSoundscape, setView } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Basic validation
    if (!file.type.startsWith('audio/')) {
      alert("Please upload an audio file");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        // Analyze via Gemini
        const metadata = await analyzeSoundscape(base64);
        
        const newSoundscape: Soundscape = {
          id: `sc-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          audioBase64: base64,
          metadata: metadata,
          createdAt: Date.now()
        };

        addSoundscape(newSoundscape);
        setIsAnalyzing(false);
      };
    } catch (e) {
      console.error("Upload failed", e);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-widest uppercase">Master Control</h1>
            <p className="text-xs text-slate-500 mt-1">Audio Ingest & Intelligence Engine</p>
          </div>
          <button onClick={() => setView('HOME' as any)} className="text-slate-500 hover:text-white"><X /></button>
        </div>

        {/* Upload Zone */}
        <div 
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all mb-12
            ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}
            ${isAnalyzing ? 'animate-pulse pointer-events-none' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { 
            e.preventDefault(); 
            setDragActive(false); 
            handleFileUpload(e.dataTransfer.files); 
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="audio/*"
            onChange={(e) => handleFileUpload(e.target.files)} 
          />
          
          {isAnalyzing ? (
            <div className="flex flex-col items-center gap-4">
              <Activity className="animate-spin text-indigo-400" size={48} />
              <p className="text-indigo-400">Analyzing waveforms & extracting semantic metadata...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="text-slate-500" size={48} />
              <div>
                <p className="text-lg font-medium text-white">Drop Soundscape Source</p>
                <p className="text-sm text-slate-500">WAV or MP3 • Max 10MB recommended for demo</p>
              </div>
            </div>
          )}
        </div>

        {/* Library Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {soundscapes.map((sc) => (
            <div key={sc.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex gap-6">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Music className="text-indigo-400" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-medium truncate">{sc.name}</h3>
                  <button onClick={() => removeSoundscape(sc.id)} className="text-slate-600 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {/* Metadata Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 rounded bg-slate-700 text-[10px] text-indigo-300 uppercase tracking-wider">{sc.metadata.mood}</span>
                  <span className="px-2 py-1 rounded bg-slate-700 text-[10px] text-teal-300 uppercase tracking-wider">{sc.metadata.intensity} Intensity</span>
                </div>

                <div className="bg-slate-900 rounded p-3 text-xs text-slate-400 mb-4 font-sans leading-relaxed">
                  {sc.metadata.description}
                </div>

                <div className="space-y-1">
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest">Instrumentation</div>
                   <div className="text-xs text-slate-300">{sc.metadata.instrumentation}</div>
                </div>
                
                <div className="mt-4 space-y-1">
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest">Target Topics</div>
                   <div className="flex gap-2">
                      {sc.metadata.suitableTopics.map(t => (
                        <span key={t} className="text-xs text-slate-300 border-b border-slate-600 border-dashed">{t}</span>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
