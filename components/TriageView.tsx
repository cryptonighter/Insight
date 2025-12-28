import React from 'react';
import { useApp } from '../context/AppContext';
import { EnergyCompass } from './EnergyCompass';
import { ViewState } from '../types';
import { X } from 'lucide-react';

export const TriageView: React.FC = () => {
    const { setView, setTriage, triage } = useApp();

    const handleTriageComplete = (valence: number, arousal: number) => {
        setTriage({
            ...triage,
            valence,
            arousal
        });
        console.log("Context Set:", { valence, arousal });
        setView(ViewState.HOME);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-liquid relative">
            <button
                onClick={() => setView(ViewState.HOME)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
                <X size={24} />
            </button>
            <EnergyCompass onTriageComplete={handleTriageComplete} />
        </div>
    );
};
