/**
 * Sonic Director Data Libraries
 * 
 * Centralized definitions for entrainment frequencies, atmosphere profiles,
 * and session arc templates used by the Sonic Director.
 */

import { SonicInstruction, AudioActionType } from '../types';

// ============================================================================
// ENTRAINMENT FREQUENCIES
// ============================================================================

export type EntrainmentType = 'binaural' | 'isochronic' | 'monaural';

export interface EntrainmentPreset {
    id: string;
    name: string;
    type: EntrainmentType;
    beatFrequency: number;      // Hz - the perceived/target brainwave frequency
    carrierFrequency: number;   // Hz - base tone frequency (for binaural: left ear)
    recommendedVolume: number;  // 0-1
    brainwaveState: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
    therapeuticUse: string;
}

export const ENTRAINMENT_PRESETS: Record<string, EntrainmentPreset> = {
    // Delta (0.5-4 Hz) - Deep sleep, healing
    DEEP_DELTA: {
        id: 'DEEP_DELTA',
        name: 'Deep Delta',
        type: 'binaural',
        beatFrequency: 2,
        carrierFrequency: 150,
        recommendedVolume: 0.08,
        brainwaveState: 'delta',
        therapeuticUse: 'Deep sleep, pain relief, unconscious processing'
    },
    HEALING_DELTA: {
        id: 'HEALING_DELTA',
        name: 'Healing Delta',
        type: 'binaural',
        beatFrequency: 4,
        carrierFrequency: 180,
        recommendedVolume: 0.08,
        brainwaveState: 'delta',
        therapeuticUse: 'Cellular regeneration, deep rest'
    },

    // Theta (4-8 Hz) - Meditation, creativity, REM
    LIGHT_THETA: {
        id: 'LIGHT_THETA',
        name: 'Light Theta',
        type: 'binaural',
        beatFrequency: 7,
        carrierFrequency: 200,
        recommendedVolume: 0.10,
        brainwaveState: 'theta',
        therapeuticUse: 'Light meditation, creative insight'
    },
    DEEP_THETA: {
        id: 'DEEP_THETA',
        name: 'Deep Theta',
        type: 'binaural',
        beatFrequency: 5,
        carrierFrequency: 200,
        recommendedVolume: 0.10,
        brainwaveState: 'theta',
        therapeuticUse: 'Deep meditation, subconscious access, IFS work'
    },

    // Alpha (8-13 Hz) - Relaxed alertness
    HIGH_ALPHA: {
        id: 'HIGH_ALPHA',
        name: 'High Alpha',
        type: 'binaural',
        beatFrequency: 12,
        carrierFrequency: 220,
        recommendedVolume: 0.10,
        brainwaveState: 'alpha',
        therapeuticUse: 'Alert relaxation, learning state'
    },
    MID_ALPHA: {
        id: 'MID_ALPHA',
        name: 'Mid Alpha',
        type: 'binaural',
        beatFrequency: 10,
        carrierFrequency: 220,
        recommendedVolume: 0.10,
        brainwaveState: 'alpha',
        therapeuticUse: 'Calm focus, mindfulness'
    },
    LOW_ALPHA: {
        id: 'LOW_ALPHA',
        name: 'Low Alpha',
        type: 'binaural',
        beatFrequency: 8,
        carrierFrequency: 200,
        recommendedVolume: 0.10,
        brainwaveState: 'alpha',
        therapeuticUse: 'Bridge to theta, relaxation deepening'
    },

    // Beta (14-30 Hz) - Active thinking
    FOCUS_BETA: {
        id: 'FOCUS_BETA',
        name: 'Focus Beta',
        type: 'isochronic',
        beatFrequency: 16,
        carrierFrequency: 250,
        recommendedVolume: 0.06,
        brainwaveState: 'beta',
        therapeuticUse: 'Concentration, problem-solving'
    },

    // Gamma (30+ Hz) - Peak cognition
    INSIGHT_GAMMA: {
        id: 'INSIGHT_GAMMA',
        name: 'Insight Gamma',
        type: 'isochronic',
        beatFrequency: 40,
        carrierFrequency: 300,
        recommendedVolume: 0.05,
        brainwaveState: 'gamma',
        therapeuticUse: 'Peak cognition, insight moments, visualization'
    },
};

// ============================================================================
// ATMOSPHERE PROFILES
// ============================================================================

export interface AtmosphereProfile {
    id: string;
    name: string;
    category: 'water' | 'nature' | 'synthetic' | 'silence';
    spectralProfile: 'pink' | 'brown' | 'varied' | 'drone' | null;
    recommendedProtocols: string[];
    parasympatheticBoost: number;  // 0-1, how strongly it activates rest-digest
    features: {
        hasBirdsong?: boolean;
        hasThunder?: boolean;
        isEthereal?: boolean;
        isRhythmic?: boolean;
    };
}

export const ATMOSPHERE_PROFILES: Record<string, AtmosphereProfile> = {
    RAIN_GENTLE: {
        id: 'RAIN_GENTLE',
        name: 'Gentle Rain',
        category: 'water',
        spectralProfile: 'pink',
        recommendedProtocols: ['NSDR', 'GENERAL', 'ACT', 'NVC'],
        parasympatheticBoost: 0.85,
        features: { isRhythmic: true }
    },
    RAIN_HEAVY: {
        id: 'RAIN_HEAVY',
        name: 'Heavy Rainfall',
        category: 'water',
        spectralProfile: 'brown',
        recommendedProtocols: ['NSDR', 'NARRATIVE'],
        parasympatheticBoost: 0.80,
        features: { hasThunder: true, isRhythmic: true }
    },
    OCEAN_WAVES: {
        id: 'OCEAN_WAVES',
        name: 'Ocean Waves',
        category: 'water',
        spectralProfile: 'brown',
        recommendedProtocols: ['IFS', 'NARRATIVE', 'SOMATIC_AGENCY'],
        parasympatheticBoost: 0.90,
        features: { isRhythmic: true }
    },
    STREAM: {
        id: 'STREAM',
        name: 'Forest Stream',
        category: 'water',
        spectralProfile: 'varied',
        recommendedProtocols: ['IFS', 'ACT', 'NVC'],
        parasympatheticBoost: 0.75,
        features: { hasBirdsong: true }
    },
    FOREST_DAWN: {
        id: 'FOREST_DAWN',
        name: 'Forest at Dawn',
        category: 'nature',
        spectralProfile: 'varied',
        recommendedProtocols: ['FUTURE_SELF', 'ACT', 'WOOP', 'IDENTITY'],
        parasympatheticBoost: 0.70,
        features: { hasBirdsong: true }
    },
    DEEP_SPACE: {
        id: 'DEEP_SPACE',
        name: 'Deep Space',
        category: 'synthetic',
        spectralProfile: 'drone',
        recommendedProtocols: ['SOMATIC_AGENCY', 'IDENTITY', 'FUTURE_SELF'],
        parasympatheticBoost: 0.50,
        features: { isEthereal: true }
    },
    SILENCE: {
        id: 'SILENCE',
        name: 'Pure Silence',
        category: 'silence',
        spectralProfile: null,
        recommendedProtocols: ['advanced'],
        parasympatheticBoost: 0,
        features: {}
    }
};

// ============================================================================
// SESSION PHASE STRUCTURE
// ============================================================================

export interface SessionPhase {
    name: string;
    durationPercent: number;          // 0-1, portion of total session
    resonanceTarget: 'beta' | 'alpha' | 'theta' | 'delta' | 'target' | 'gamma';
    atmosphereVolume: number;         // 0-1
    textureVolume: number;            // 0-1
    resonanceVolume: number;          // 0-1
}

export interface SessionArc {
    id: string;
    name: string;
    description: string;
    phases: SessionPhase[];
}

export const SESSION_ARCS: Record<string, SessionArc> = {
    STANDARD: {
        id: 'STANDARD',
        name: 'Standard Arc',
        description: 'Balanced induction, core work, and emergence',
        phases: [
            { name: 'induction', durationPercent: 0.15, resonanceTarget: 'beta', atmosphereVolume: 0.2, textureVolume: 0.05, resonanceVolume: 0.08 },
            { name: 'deepening', durationPercent: 0.25, resonanceTarget: 'alpha', atmosphereVolume: 0.35, textureVolume: 0.08, resonanceVolume: 0.10 },
            { name: 'core', durationPercent: 0.40, resonanceTarget: 'target', atmosphereVolume: 0.30, textureVolume: 0.10, resonanceVolume: 0.10 },
            { name: 'emergence', durationPercent: 0.20, resonanceTarget: 'alpha', atmosphereVolume: 0.15, textureVolume: 0.03, resonanceVolume: 0.05 },
        ]
    },
    DEEP_DESCENT: {
        id: 'DEEP_DESCENT',
        name: 'Deep Descent',
        description: 'Extended deepening for NSDR and sleep protocols',
        phases: [
            { name: 'grounding', durationPercent: 0.10, resonanceTarget: 'beta', atmosphereVolume: 0.15, textureVolume: 0.03, resonanceVolume: 0.06 },
            { name: 'settling', durationPercent: 0.15, resonanceTarget: 'alpha', atmosphereVolume: 0.25, textureVolume: 0.06, resonanceVolume: 0.08 },
            { name: 'deepening', durationPercent: 0.30, resonanceTarget: 'theta', atmosphereVolume: 0.35, textureVolume: 0.10, resonanceVolume: 0.10 },
            { name: 'abyss', durationPercent: 0.30, resonanceTarget: 'delta', atmosphereVolume: 0.30, textureVolume: 0.12, resonanceVolume: 0.08 },
            { name: 'fade', durationPercent: 0.15, resonanceTarget: 'delta', atmosphereVolume: 0.10, textureVolume: 0.05, resonanceVolume: 0.03 },
        ]
    },
    FOCUSED_WORK: {
        id: 'FOCUSED_WORK',
        name: 'Focused Work',
        description: 'For protocols requiring alert attention (IFS, ACT)',
        phases: [
            { name: 'centering', durationPercent: 0.15, resonanceTarget: 'alpha', atmosphereVolume: 0.20, textureVolume: 0.05, resonanceVolume: 0.08 },
            { name: 'engagement', durationPercent: 0.65, resonanceTarget: 'target', atmosphereVolume: 0.25, textureVolume: 0.05, resonanceVolume: 0.08 },
            { name: 'integration', durationPercent: 0.20, resonanceTarget: 'alpha', atmosphereVolume: 0.15, textureVolume: 0.03, resonanceVolume: 0.05 },
        ]
    },
    VISUALIZATION: {
        id: 'VISUALIZATION',
        name: 'Visualization Journey',
        description: 'For Future Self, WOOP - includes gamma burst',
        phases: [
            { name: 'relaxation', durationPercent: 0.20, resonanceTarget: 'alpha', atmosphereVolume: 0.25, textureVolume: 0.05, resonanceVolume: 0.08 },
            { name: 'imagination', durationPercent: 0.30, resonanceTarget: 'theta', atmosphereVolume: 0.30, textureVolume: 0.08, resonanceVolume: 0.10 },
            { name: 'vision', durationPercent: 0.30, resonanceTarget: 'gamma', atmosphereVolume: 0.20, textureVolume: 0.05, resonanceVolume: 0.06 },
            { name: 'grounding', durationPercent: 0.20, resonanceTarget: 'alpha', atmosphereVolume: 0.15, textureVolume: 0.03, resonanceVolume: 0.05 },
        ]
    }
};

// ============================================================================
// PROTOCOL → SONIC MAPPING
// ============================================================================

export interface ProtocolSonicProfile {
    targetEntrainment: string;       // Key from ENTRAINMENT_PRESETS
    recommendedAtmosphere: string;   // Key from ATMOSPHERE_PROFILES
    sessionArc: string;              // Key from SESSION_ARCS
    textureType: 'pink' | 'brown' | 'none';
    specialInstructions?: string;
}

export const PROTOCOL_SONIC_PROFILES: Record<string, ProtocolSonicProfile> = {
    NSDR: {
        targetEntrainment: 'HEALING_DELTA',
        recommendedAtmosphere: 'RAIN_GENTLE',
        sessionArc: 'DEEP_DESCENT',
        textureType: 'brown',
        specialInstructions: 'Fade to near-silence in final phase for sleep transition'
    },
    IFS: {
        targetEntrainment: 'DEEP_THETA',
        recommendedAtmosphere: 'STREAM',
        sessionArc: 'FOCUSED_WORK',
        textureType: 'pink',
        specialInstructions: 'Hold steady at theta during core dialogue work'
    },
    SOMATIC_AGENCY: {
        targetEntrainment: 'LOW_ALPHA',
        recommendedAtmosphere: 'DEEP_SPACE',
        sessionArc: 'STANDARD',
        textureType: 'none',
        specialInstructions: 'Minimal audio to keep focus on body sensations'
    },
    FUTURE_SELF: {
        targetEntrainment: 'HIGH_ALPHA',
        recommendedAtmosphere: 'DEEP_SPACE',
        sessionArc: 'VISUALIZATION',
        textureType: 'pink',
        specialInstructions: 'Gamma burst during peak visualization moment'
    },
    ACT: {
        targetEntrainment: 'MID_ALPHA',
        recommendedAtmosphere: 'FOREST_DAWN',
        sessionArc: 'FOCUSED_WORK',
        textureType: 'pink'
    },
    WOOP: {
        targetEntrainment: 'HIGH_ALPHA',
        recommendedAtmosphere: 'FOREST_DAWN',
        sessionArc: 'VISUALIZATION',
        textureType: 'pink'
    },
    NVC: {
        targetEntrainment: 'MID_ALPHA',
        recommendedAtmosphere: 'STREAM',
        sessionArc: 'FOCUSED_WORK',
        textureType: 'pink'
    },
    IDENTITY: {
        targetEntrainment: 'MID_ALPHA',
        recommendedAtmosphere: 'DEEP_SPACE',
        sessionArc: 'STANDARD',
        textureType: 'pink'
    },
    NARRATIVE: {
        targetEntrainment: 'LIGHT_THETA',
        recommendedAtmosphere: 'OCEAN_WAVES',
        sessionArc: 'STANDARD',
        textureType: 'pink'
    },
    GENERAL: {
        targetEntrainment: 'MID_ALPHA',
        recommendedAtmosphere: 'RAIN_GENTLE',
        sessionArc: 'STANDARD',
        textureType: 'pink'
    }
};
