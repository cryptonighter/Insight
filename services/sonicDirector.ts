/**
 * Sonic Director Service
 * 
 * Orchestrates the 5-layer audio experience for meditation sessions.
 * Generates deterministic SonicInstruction timelines based on protocol
 * and session structure - no AI needed for this component.
 */

import { SonicInstruction, AudioActionType, MethodologyType } from '../types';
import {
    ENTRAINMENT_PRESETS,
    ATMOSPHERE_PROFILES,
    SESSION_ARCS,
    PROTOCOL_SONIC_PROFILES,
    EntrainmentPreset,
    SessionPhase,
    SessionArc
} from './sonicData';

// ============================================================================
// TYPES
// ============================================================================

export interface SonicTimeline {
    segmentInstructions: SonicInstruction[][];  // Instructions per audio segment
    metadata: {
        protocol: string;
        sessionArc: string;
        targetEntrainment: string;
        atmosphere: string;
        totalDurationMs: number;
    };
}

export interface SonicDirectorInput {
    protocol: MethodologyType;
    segmentCount: number;
    totalDurationMs: number;
    userPreferences?: {
        atmosphereOverride?: string;
        entrainmentVolume?: number;  // 0-1 multiplier
        disableEntrainment?: boolean;
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Maps brainwave state names to actual frequencies
 */
function resolveTargetFrequency(
    target: 'beta' | 'alpha' | 'theta' | 'delta' | 'gamma' | 'target',
    protocolEntrainment: EntrainmentPreset
): number {
    switch (target) {
        case 'delta': return 3;
        case 'theta': return 6;
        case 'alpha': return 10;
        case 'beta': return 15;
        case 'gamma': return 40;
        case 'target': return protocolEntrainment.beatFrequency;
        default: return 10;
    }
}

/**
 * Logarithmic interpolation for more natural frequency drift
 * Instead of linear: start + (end - start) * t
 * We use: start * (end/start)^t
 */
function logarithmicInterpolate(start: number, end: number, t: number): number {
    if (start <= 0 || end <= 0) return start + (end - start) * t; // Fallback to linear
    return start * Math.pow(end / start, t);
}

/**
 * Determines which session phase we're in based on segment index
 */
function getCurrentPhase(
    segmentIndex: number,
    segmentCount: number,
    arc: SessionArc
): { phase: SessionPhase; phaseProgress: number } {
    const overallProgress = segmentIndex / segmentCount;

    let accumulatedDuration = 0;
    for (const phase of arc.phases) {
        const phaseEnd = accumulatedDuration + phase.durationPercent;
        if (overallProgress < phaseEnd) {
            const phaseProgress = (overallProgress - accumulatedDuration) / phase.durationPercent;
            return { phase, phaseProgress };
        }
        accumulatedDuration = phaseEnd;
    }

    // Default to last phase
    return { phase: arc.phases[arc.phases.length - 1], phaseProgress: 1 };
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generates a complete sonic timeline for a meditation session.
 * 
 * The timeline provides per-segment instructions that the Player's SoundEngine
 * will execute as each audio segment begins playing.
 */
export function generateSonicTimeline(input: SonicDirectorInput): SonicTimeline {
    const { protocol, segmentCount, totalDurationMs, userPreferences } = input;

    // Get protocol-specific sonic profile
    const sonicProfile = PROTOCOL_SONIC_PROFILES[protocol] || PROTOCOL_SONIC_PROFILES.GENERAL;

    // Resolve the data objects
    const entrainmentPreset = ENTRAINMENT_PRESETS[sonicProfile.targetEntrainment];
    const atmosphereProfile = userPreferences?.atmosphereOverride
        ? ATMOSPHERE_PROFILES[userPreferences.atmosphereOverride]
        : ATMOSPHERE_PROFILES[sonicProfile.recommendedAtmosphere];
    const sessionArc = SESSION_ARCS[sonicProfile.sessionArc];

    // Volume multiplier from user preferences
    const entrainmentVolMult = userPreferences?.entrainmentVolume ?? 1.0;
    const disableEntrainment = userPreferences?.disableEntrainment ?? false;

    // Calculate segment duration
    const segmentDurationMs = totalDurationMs / segmentCount;
    const segmentDurationSec = segmentDurationMs / 1000;

    // Build timeline
    const segmentInstructions: SonicInstruction[][] = [];

    let previousResonanceFreq: number | null = null;
    let previousResonanceVol: number | null = null;  // Track volume separately from frequency
    let previousAtmosphereVol: number | null = null;

    for (let i = 0; i < segmentCount; i++) {
        const instructions: SonicInstruction[] = [];
        const { phase, phaseProgress } = getCurrentPhase(i, segmentCount, sessionArc);

        // Determine current phase's target frequency
        const phaseTargetFreq = resolveTargetFrequency(phase.resonanceTarget, entrainmentPreset);

        // For smooth frequency transitions, interpolate between previous and target
        const isPhaseTransition = i > 0 && previousResonanceFreq !== null &&
            Math.abs(previousResonanceFreq - phaseTargetFreq) > 1;

        const currentResonanceFreq = isPhaseTransition
            ? logarithmicInterpolate(previousResonanceFreq!, phaseTargetFreq, phaseProgress)
            : phaseTargetFreq;

        // ---- RESONANCE LAYER (Binaural/Isochronic) ----
        if (!disableEntrainment) {
            if (i === 0) {
                // First segment: Initialize binaural
                instructions.push({
                    action: 'SET_BINAURAL',
                    layer: 'resonance',
                    targetValue: currentResonanceFreq,
                    duration: 5
                });
                instructions.push({
                    action: 'FADE_VOL',
                    layer: 'resonance',
                    targetValue: phase.resonanceVolume * entrainmentVolMult,
                    duration: 8
                });
            } else if (previousResonanceFreq !== null &&
                Math.abs(currentResonanceFreq - previousResonanceFreq) > 0.5) {
                // Frequency shift needed
                instructions.push({
                    action: 'SET_BINAURAL',
                    layer: 'resonance',
                    targetValue: currentResonanceFreq,
                    duration: segmentDurationSec * 0.8  // Smooth transition over most of segment
                });
            }

            // Volume adjustment if changed
            const targetResVol = phase.resonanceVolume * entrainmentVolMult;
            if (previousResonanceVol === null ||
                (i > 0 && Math.abs(targetResVol - previousResonanceVol) > 0.01)) {
                instructions.push({
                    action: 'FADE_VOL',
                    layer: 'resonance',
                    targetValue: targetResVol,
                    duration: segmentDurationSec * 0.5
                });
            }
            previousResonanceVol = targetResVol;  // Track current volume for next iteration
        }

        // ---- ATMOSPHERE LAYER ----
        if (atmosphereProfile.category !== 'silence') {
            if (i === 0) {
                // First segment: Fade in atmosphere
                instructions.push({
                    action: 'FADE_VOL',
                    layer: 'atmosphere',
                    targetValue: phase.atmosphereVolume,
                    duration: 10
                });
            } else if (previousAtmosphereVol !== null &&
                Math.abs(phase.atmosphereVolume - previousAtmosphereVol) > 0.02) {
                // Volume change between phases
                instructions.push({
                    action: 'FADE_VOL',
                    layer: 'atmosphere',
                    targetValue: phase.atmosphereVolume,
                    duration: segmentDurationSec * 0.6
                });
            }
        }

        // ---- FINAL SEGMENT: Fade out everything ----
        if (i === segmentCount - 1) {
            instructions.push({
                action: 'FADE_VOL',
                layer: 'atmosphere',
                targetValue: 0,
                duration: 15
            });
            if (!disableEntrainment) {
                instructions.push({
                    action: 'FADE_VOL',
                    layer: 'resonance',
                    targetValue: 0,
                    duration: 12
                });
            }
        }

        // Update tracking variables
        previousResonanceFreq = currentResonanceFreq;
        previousAtmosphereVol = phase.atmosphereVolume;

        segmentInstructions.push(instructions);
    }

    return {
        segmentInstructions,
        metadata: {
            protocol,
            sessionArc: sessionArc.id,
            targetEntrainment: sonicProfile.targetEntrainment,
            atmosphere: atmosphereProfile.id,
            totalDurationMs
        }
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get recommended atmosphere for a protocol, with option to filter by user preferences
 */
export function getRecommendedAtmosphere(protocol: MethodologyType): string {
    const profile = PROTOCOL_SONIC_PROFILES[protocol] || PROTOCOL_SONIC_PROFILES.GENERAL;
    return profile.recommendedAtmosphere;
}

/**
 * Get all available atmospheres suitable for a protocol
 */
export function getCompatibleAtmospheres(protocol: MethodologyType): string[] {
    const atmospheres: string[] = [];
    for (const [key, profile] of Object.entries(ATMOSPHERE_PROFILES)) {
        if (profile.recommendedProtocols.includes(protocol) ||
            profile.recommendedProtocols.includes('advanced')) {
            atmospheres.push(key);
        }
    }
    return atmospheres;
}

/**
 * Get the target brainwave state for a protocol
 */
export function getTargetBrainwaveState(protocol: MethodologyType): string {
    const profile = PROTOCOL_SONIC_PROFILES[protocol] || PROTOCOL_SONIC_PROFILES.GENERAL;
    const entrainment = ENTRAINMENT_PRESETS[profile.targetEntrainment];
    return entrainment?.brainwaveState || 'alpha';
}
