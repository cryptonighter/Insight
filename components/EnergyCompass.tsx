import React, { useState, useEffect } from 'react';
import { Leaf, Zap, CloudRain, Sun, Activity, Database } from 'lucide-react';

interface EnergyCompassProps {
    onTriageComplete: (valence: number, arousal: number) => void;
}

export const EnergyCompass: React.FC<EnergyCompassProps> = ({ onTriageComplete }) => {
    // We track raw values -1 to 1
    const [energy, setEnergy] = useState(0);   // Y-Axis: Arousal
    const [feeling, setFeeling] = useState(0); // X-Axis: Valence

    const [description, setDescription] = useState("Neutral");

    // Determine Quadrant Description
    useEffect(() => {
        if (energy > 0.3 && feeling > 0.3) setDescription("Radiant & Active");
        if (energy > 0.3 && feeling < -0.3) setDescription("Anxious & Heated");
        if (energy < -0.3 && feeling > 0.3) setDescription("Calm & Flowing");
        if (energy < -0.3 && feeling < -0.3) setDescription("Heavy & Stuck");
        if (Math.abs(energy) <= 0.3 && Math.abs(feeling) <= 0.3) setDescription("Balanced / Neutral");
    }, [energy, feeling]);

    const handleSubmit = () => {
        onTriageComplete(feeling, energy);
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-xl max-w-sm mx-auto animate-fade-in">

            <div className="mb-6 text-center">
                <h2 className="text-xl font-light text-slate-800 tracking-wide mb-1">Energy Compass</h2>
                <p className="text-xs text-slate-500 uppercase tracking-widest">{description}</p>
            </div>

            <div className="relative w-64 h-64 bg-white/50 rounded-full border-4 border-white shadow-inner flex items-center justify-center mb-8">
                {/* Axis Lines */}
                <div className="absolute w-full h-[1px] bg-slate-200"></div>
                <div className="absolute h-full w-[1px] bg-slate-200"></div>

                {/* Labels - Y Axis (Energy) */}
                <div className="absolute top-4 text-[10px] uppercase font-bold text-slate-400 flex flex-col items-center">
                    <Zap size={12} className="mb-1 text-amber-500" /> High Energy
                </div>
                <div className="absolute bottom-4 text-[10px] uppercase font-bold text-slate-400 flex flex-col items-center">
                    <Database size={12} className="mb-1 text-indigo-400" /> Deep Rest
                </div>

                {/* Labels - X Axis (Feeling) */}
                <div className="absolute left-4 text-[10px] uppercase font-bold text-slate-400 flex flex-col items-center">
                    <CloudRain size={12} className="mb-1 text-slate-500" /> Heavy
                </div>
                <div className="absolute right-4 text-[10px] uppercase font-bold text-slate-400 flex flex-col items-center">
                    <Sun size={12} className="mb-1 text-orange-400" /> Light
                </div>

                {/* The Puck */}
                <div
                    className="absolute w-12 h-12 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 border-4 border-white cursor-grab active:cursor-grabbing transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                        left: `calc(50% + ${feeling * 100}px - 24px)`,
                        top: `calc(50% - ${energy * 100}px - 24px)`
                    }}
                // Simple drag logic could be implemented here, but for "Intuitive" click to set is often easier on mobile
                >
                    <Activity size={20} className="text-white" />
                </div>

                {/* Click surface */}
                <div
                    className="absolute w-full h-full rounded-full cursor-pointer z-10"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        // Map 0-256 to -1 to 1
                        // X: 0 -> -1.2 (clamped), 256 -> 1.2
                        const rawX = (x / rect.width) * 2 - 1;
                        const rawY = -((y / rect.height) * 2 - 1); // Invert Y because screen Y is top-down

                        // Clamp to circle roughly (visual only)
                        const clampedX = Math.max(-1, Math.min(1, rawX));
                        const clampedY = Math.max(-1, Math.min(1, rawY));

                        setFeeling(clampedX);
                        setEnergy(clampedY);
                    }}
                ></div>
            </div>

            <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-indigo-600 text-white rounded-full font-medium shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
            >
                Set Context
            </button>
        </div>
    );
};
