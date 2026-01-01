import { useState } from 'react';
import { Meditation, MeditationConfig, Soundscape, ViewState } from '../types';
import { generateMeditationStream } from './geminiService';
import { processBatchWithSilenceSplitting } from './audioEngine';

export const useMeditationGenerator = (
    soundscapes: Soundscape[],
    activeResolution: { statement: string; rootMotivation: string } | null,
    setView: (view: ViewState) => void
) => {
    const [meditations, setMeditations] = useState<Meditation[]>([]);
    const [activeMeditationId, setActiveMeditationId] = useState<string | null>(null);
    const [pendingMeditationConfig, setPendingMeditationConfig] = useState<Partial<MeditationConfig> | null>(null);

    const finalizeMeditationGeneration = async (config: MeditationConfig) => {
        const tempId = Date.now().toString();
        try {
            const contextTexts = [
                `Goal: ${activeResolution?.statement}`,
                `Why: ${activeResolution?.rootMotivation}`
            ];
            let selectedSoundscape = soundscapes[0];

            const newMeditation: Meditation = {
                id: tempId,
                title: "Morning Alignment",
                transcript: "",
                lines: [],
                audioQueue: [],
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
            setView(ViewState.LOADING);

            const { title, lines } = await generateMeditationStream(
                config.focus,
                config.feeling,
                config.duration,
                selectedSoundscape.metadata.description,
                config.voice,
                contextTexts,
                async (chunkBase64, index, instructions, mimeType) => {
                    const segments = await processBatchWithSilenceSplitting(chunkBase64, index, instructions, mimeType);
                    setMeditations(current => current.map(m => {
                        if (m.id === tempId) {
                            return { ...m, audioQueue: [...m.audioQueue, ...segments] };
                        }
                        return m;
                    }));

                    if (index === 1) setPendingMeditationConfig(null);
                },
                () => {
                    setMeditations(current => current.map(m => {
                        if (m.id === tempId) return { ...m, isGenerating: false };
                        return m;
                    }));
                    setPendingMeditationConfig(null);
                }
            );

            setMeditations(current => current.map(m => {
                if (m.id === tempId) return { ...m, title, transcript: lines.join('\n'), lines };
                return m;
            }));

        } catch (e) {
            console.error("Failed to generate meditation", e);
            alert("Generation failed.");
            setMeditations(prev => prev.filter(m => m.id !== tempId));
            setView(ViewState.DASHBOARD);
        }
    };

    const playMeditation = (id: string) => {
        setActiveMeditationId(id);
        setView(ViewState.PLAYER);
    };

    return {
        meditations,
        activeMeditationId,
        pendingMeditationConfig,
        finalizeMeditationGeneration,
        playMeditation,
        setMeditations
    };
};
