
import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, Music, Activity, Save, Trash2, X } from 'lucide-react';
import { analyzeSoundscape } from '../services/geminiService';
import { Soundscape } from '../types';
import { supabase } from '../services/supabaseClient';

export const AdminDashboard: React.FC = () => {
  const { soundscapes, addSoundscape, removeSoundscape, setView, user } = useApp();
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

    if (!user.supabaseId) {
      alert("You must be logged in to upload soundscapes.");
      return;
    }

    setIsAnalyzing(true);

    try {
      // 1. Upload to Storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-assets')
        .getPublicUrl(fileName);

      // 3. Analyze via Gemini (using Base64 for analysis only, not storage)
      // We still need base64 for Gemini analysis? Or can we pass URL? 
      // geminiService expects base64. Let's do a quick read just for that.
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64ForAnalysis = (reader.result as string).split(',')[1];

        // Analyze
        const metadata = await analyzeSoundscape(base64ForAnalysis);

        // 4. Insert into DB
        const { data: newRow, error: dbError } = await supabase
          .from('soundscapes')
          .insert({
            name: file.name.replace(/\.[^/.]+$/, ""),
            audio_url: publicUrl,
            metadata: metadata,
            user_id: user.supabaseId
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // 5. Update Local State
        const newSoundscape: Soundscape = {
          id: newRow.id,
          name: newRow.name,
          audioBase64: '', // No longer needed
          audioUrl: newRow.audio_url, // Add this field to type support
          metadata: newRow.metadata,
          createdAt: new Date(newRow.created_at).getTime()
        };

        addSoundscape(newSoundscape);
        setIsAnalyzing(false);
      };

    } catch (e: any) {
      console.error("Upload failed", e);
      alert(`Upload failed: ${e.message}`);
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
                <p className="text-sm text-slate-500">WAV or MP3 • Max 50MB</p>
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
