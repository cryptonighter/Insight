
import React from 'react';
import { cn } from '@/utils';
import { Sparkles } from 'lucide-react';

interface ReflectionOrbProps {
    isConnected: boolean;
    isTalking: boolean;
    className?: string;
}

export const ReflectionOrb: React.FC<ReflectionOrbProps> = ({ isConnected, isTalking, className }) => {
    return (
        <div className={cn("relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80", className)}>
            {/* Ambient Glow */}
            <div
                className={cn(
                    "absolute inset-0 rounded-full bg-primary/20 blur-[60px] transition-all duration-1000",
                    isTalking ? "opacity-80 scale-125" : "opacity-30 scale-100",
                    !isConnected && "opacity-0"
                )}
            />

            {/* Outer Rings */}
            <div
                className={cn(
                    "absolute inset-0 rounded-full border border-primary/20 transition-all duration-1000",
                    isTalking ? "scale-110 rotate-180" : "scale-100 rotate-0",
                    !isConnected && "border-white/5"
                )}
            />
            <div
                className={cn(
                    "absolute inset-4 rounded-full border border-primary/10 transition-all duration-1000",
                    isTalking ? "scale-105 -rotate-90" : "scale-100 rotate-0",
                    !isConnected && "border-white/5"
                )}
            />

            {/* Core Orb Container */}
            <div className={cn(
                "relative flex items-center justify-center w-32 h-32 rounded-full overflow-hidden transition-all duration-700 shadow-2xl",
                isConnected ? "bg-gradient-to-b from-primary/20 to-black border-2 border-primary/30" : "bg-white/5 border border-white/10"
            )}>
                {/* Inner Fluid/Noise Effect (Simulated via gradient for now, could be shader later) */}
                <div
                    className={cn(
                        "absolute inset-0 bg-gradient-to-tr from-primary/40 via-transparent to-primary/10 transition-opacity duration-500",
                        isTalking ? "opacity-100" : "opacity-60"
                    )}
                />

                {/* Core Sparkle */}
                <Sparkles
                    className={cn(
                        "w-8 h-8 text-white transition-all duration-500 z-10",
                        isTalking ? "scale-125 opacity-100 text-primary-foreground" : "scale-100 opacity-70",
                        !isConnected && "text-white/20"
                    )}
                />

                {/* Pulse Wave */}
                {isTalking && (
                    <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                )}
            </div>

            {/* Status Text (Optional Floating Label, maybe keep separate? Sticking to plan: separate.) */}
        </div>
    );
};
