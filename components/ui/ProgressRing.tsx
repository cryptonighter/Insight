import React from 'react';

interface ProgressRingProps {
    /** Progress from 0 to 100 */
    progress: number;
    /** Diameter of the ring in pixels */
    size?: number;
    /** Width of the stroke */
    strokeWidth?: number;
    /** Content to display in center */
    children?: React.ReactNode;
    /** Additional class names */
    className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
    progress,
    size = 256,
    strokeWidth = 4,
    children,
    className = ''
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    // Start from top (-90deg rotation)
    const isComplete = progress >= 100;

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            {/* SVG Ring */}
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={isComplete ? 'rgb(74, 222, 128)' : 'rgba(74, 222, 128, 0.6)'}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500 ease-out"
                    style={{
                        filter: isComplete ? 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.6))' : 'none'
                    }}
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {children}
            </div>
        </div>
    );
};

export default ProgressRing;
