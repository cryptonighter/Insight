/**
 * MainButton - Central interactive button that animates and changes states
 * Controls the entire user journey: setup → meditation → feedback
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils';

export type ButtonPosition = 'center' | 'bottom';
export type ButtonState = 'idle' | 'setup' | 'loading' | 'playing' | 'paused' | 'feedback' | 'complete';

interface MainButtonProps {
    /** Current position of the button */
    position: ButtonPosition;
    /** Current state for labeling and color */
    state: ButtonState;
    /** Progress 0-100 for color gradient (green → yellow) */
    progress: number;
    /** Is button currently loading/processing */
    isLoading?: boolean;
    /** Custom label override */
    label?: string;
    /** Sub-label displayed below main text */
    subLabel?: string;
    /** Click handler */
    onClick?: () => void;
    /** Is button disabled */
    disabled?: boolean;
    /** Size of button */
    size?: 'normal' | 'large';
}

// Calculate button color based on progress (green 120° → yellow 60°)
const getButtonHue = (progress: number): number => {
    // Start at green (120), end at yellow (60)
    return 120 - (progress * 0.6);
};

const getButtonLabel = (state: ButtonState): string => {
    switch (state) {
        case 'idle': return 'START';
        case 'setup': return 'NEXT';
        case 'loading': return 'LOADING';
        case 'playing': return 'PAUSE';
        case 'paused': return 'RESUME';
        case 'feedback': return 'NEXT';
        case 'complete': return 'DONE';
        default: return 'START';
    }
};

export const MainButton: React.FC<MainButtonProps> = ({
    position,
    state,
    progress,
    isLoading = false,
    label,
    subLabel,
    onClick,
    disabled = false,
    size = 'normal'
}) => {
    const hue = getButtonHue(progress);
    const displayLabel = label || getButtonLabel(state);
    const buttonSize = size === 'large' ? 'w-64 h-64' : 'w-48 h-48';
    const fontSize = size === 'large' ? 'text-4xl' : 'text-3xl';

    // Animation variants for position
    const positionVariants = {
        center: {
            y: 0,
            scale: 1,
        },
        bottom: {
            y: 0,
            scale: 0.85,
        }
    };

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled || isLoading}
            initial={position === 'center' ? 'center' : 'bottom'}
            animate={position}
            variants={positionVariants}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
                buttonSize,
                "relative rounded-full flex flex-col items-center justify-center transition-all duration-300 overflow-hidden",
                "bg-surface border-2",
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'
            )}
            style={{
                borderColor: `hsla(${hue}, 70%, 50%, 0.6)`,
                boxShadow: `0 0 ${20 + progress * 0.3}px hsla(${hue}, 70%, 50%, ${0.2 + progress * 0.003})`
            }}
        >
            {/* Glow effect background */}
            <div
                className="absolute inset-0 rounded-full opacity-20 transition-opacity duration-500"
                style={{
                    background: `radial-gradient(circle, hsla(${hue}, 70%, 50%, 0.4) 0%, transparent 70%)`
                }}
            />

            {/* Inner ring */}
            <div className="absolute inset-3 rounded-full border border-white/5" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center">
                {isLoading ? (
                    <Loader2
                        className="animate-spin"
                        style={{ color: `hsl(${hue}, 70%, 60%)` }}
                        size={size === 'large' ? 48 : 36}
                    />
                ) : (
                    <>
                        <span
                            className={cn(fontSize, "font-bold tracking-tight transition-colors duration-300")}
                            style={{ color: `hsl(${hue}, 70%, 70%)` }}
                        >
                            {displayLabel}
                        </span>
                        {subLabel && (
                            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/40 mt-2 max-w-[120px] text-center leading-relaxed">
                                {subLabel}
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* Progress ring (only show during setup) */}
            {state === 'setup' && progress > 0 && (
                <svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox="0 0 100 100"
                >
                    <circle
                        cx="50"
                        cy="50"
                        r="48"
                        fill="none"
                        stroke={`hsla(${hue}, 70%, 50%, 0.3)`}
                        strokeWidth="2"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="48"
                        fill="none"
                        stroke={`hsl(${hue}, 70%, 50%)`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 3.01} 301`}
                        className="transition-all duration-500"
                    />
                </svg>
            )}
        </motion.button>
    );
};

export default MainButton;
