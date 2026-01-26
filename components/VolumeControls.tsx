/**
 * VolumeControls - Three-layer volume control panel
 * Controls: Voice, Soundscape, Binaural Beat
 */

import React from 'react';
import { Mic, Music, Waves } from 'lucide-react';
import { cn } from '@/utils';

interface VolumeControlsProps {
    voiceVolume: number;
    soundscapeVolume: number;
    binauralVolume: number;
    onVoiceChange: (value: number) => void;
    onSoundscapeChange: (value: number) => void;
    onBinauralChange: (value: number) => void;
    className?: string;
}

interface SliderProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    onChange: (value: number) => void;
    color?: string;
}

const VolumeSlider: React.FC<SliderProps> = ({ icon, label, value, onChange, color = 'primary' }) => {
    return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface/50">
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold tracking-wide text-white/40 uppercase">{label}</span>
                    <span className="text-[10px] text-white/30">{Math.round(value * 100)}%</span>
                </div>
                <div className="relative h-2 bg-surface rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "absolute inset-y-0 left-0 rounded-full transition-all duration-150",
                            color === 'primary' ? 'bg-primary/60' :
                                color === 'blue' ? 'bg-blue-400/60' :
                                    'bg-purple-400/60'
                        )}
                        style={{ width: `${value * 100}%` }}
                    />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={value}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
};

export const VolumeControls: React.FC<VolumeControlsProps> = ({
    voiceVolume,
    soundscapeVolume,
    binauralVolume,
    onVoiceChange,
    onSoundscapeChange,
    onBinauralChange,
    className
}) => {
    return (
        <div className={cn("space-y-4 p-4 bg-surface/30 rounded-2xl border border-white/5", className)}>
            <VolumeSlider
                icon={<Mic className="w-4 h-4 text-primary/60" />}
                label="Voice"
                value={voiceVolume}
                onChange={onVoiceChange}
                color="primary"
            />
            <VolumeSlider
                icon={<Music className="w-4 h-4 text-blue-400/60" />}
                label="Soundscape"
                value={soundscapeVolume}
                onChange={onSoundscapeChange}
                color="blue"
            />
            <VolumeSlider
                icon={<Waves className="w-4 h-4 text-purple-400/60" />}
                label="Binaural"
                value={binauralVolume}
                onChange={onBinauralChange}
                color="purple"
            />
        </div>
    );
};

export default VolumeControls;
