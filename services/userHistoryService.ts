/**
 * User History Service
 * Provides personalization through past session data and contraindication safety checks
 */

import { supabase } from './supabaseClient';
import { MethodologyType } from '../types';

// CLINICAL_PROTOCOLS contraindications (from types)
const PROTOCOL_CONTRAINDICATIONS: Record<string, string[]> = {
    'IFS': ['severe_dissociation', 'active_psychosis', 'acute_trauma'],
    'SOMATIC_AGENCY': ['severe_dissociation', 'body_dysmorphia'],
    'FUTURE_SELF': ['severe_depression', 'active_suicidal_ideation'],
    'NSDR': [], // Generally safe for all
    'GENERAL': [],
    'ACT': ['cognitive_impairment'],
    'NVC': [],
};

export interface SessionHistorySummary {
    frequentThemes: string[];
    preferredProtocols: string[];
    averageRating: number;
    lastSessionFocus?: string;
    totalSessions: number;
    recentInsights: string[];
}

export interface ContraindicationCheck {
    safe: boolean;
    warnings: string[];
    suggestedAlternative?: MethodologyType;
}

/**
 * Fetch user's session history for personalization
 */
export const fetchSessionHistory = async (userId: string): Promise<SessionHistorySummary> => {
    try {
        // Fetch last 20 sessions for analysis
        const { data: sessions, error } = await supabase
            .from('session_logs')
            .select('focus, feeling, modality, feedback, created_at, transcript')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error || !sessions || sessions.length === 0) {
            console.log('📊 No session history found for user');
            return {
                frequentThemes: [],
                preferredProtocols: [],
                averageRating: 0,
                totalSessions: 0,
                recentInsights: []
            };
        }

        // Extract themes from focus fields
        const allFocuses = sessions.map(s => s.focus).filter(Boolean);
        const themeFrequency: Record<string, number> = {};
        allFocuses.forEach(focus => {
            const key = focus.toLowerCase();
            themeFrequency[key] = (themeFrequency[key] || 0) + 1;
        });
        const frequentThemes = Object.entries(themeFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([theme]) => theme);

        // Extract protocol preferences from modality
        const protocolFrequency: Record<string, number> = {};
        sessions.forEach(s => {
            if (s.modality) {
                protocolFrequency[s.modality] = (protocolFrequency[s.modality] || 0) + 1;
            }
        });
        const preferredProtocols = Object.entries(protocolFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([protocol]) => protocol);

        // Calculate average rating from feedback
        const ratings = sessions
            .map(s => s.feedback?.rating)
            .filter((r): r is number => typeof r === 'number');
        const averageRating = ratings.length > 0
            ? ratings.reduce((a, b) => a + b, 0) / ratings.length
            : 0;

        // Get recent insights from feedback
        const recentInsights = sessions
            .slice(0, 5)
            .map(s => s.feedback?.user_feedback)
            .filter((i): i is string => typeof i === 'string' && i.length > 10)
            .slice(0, 3);

        // Last session focus
        const lastSessionFocus = sessions[0]?.focus;

        console.log('📊 Session history loaded:', {
            totalSessions: sessions.length,
            frequentThemes,
            preferredProtocols,
            averageRating: averageRating.toFixed(1)
        });

        return {
            frequentThemes,
            preferredProtocols,
            averageRating,
            lastSessionFocus,
            totalSessions: sessions.length,
            recentInsights
        };
    } catch (error) {
        console.error('Failed to fetch session history:', error);
        return {
            frequentThemes: [],
            preferredProtocols: [],
            averageRating: 0,
            totalSessions: 0,
            recentInsights: []
        };
    }
};

/**
 * Check if a protocol is safe for a user based on their contraindications
 */
export const checkContraindications = (
    methodology: MethodologyType,
    userContraindications: string[]
): ContraindicationCheck => {
    const protocolContraindications = PROTOCOL_CONTRAINDICATIONS[methodology] || [];

    // Find any overlap between user's conditions and protocol contraindications
    const conflicts = userContraindications.filter(
        condition => protocolContraindications.includes(condition)
    );

    if (conflicts.length === 0) {
        return { safe: true, warnings: [] };
    }

    // Find a safer alternative
    let suggestedAlternative: MethodologyType | undefined;
    for (const [protocol, contraindications] of Object.entries(PROTOCOL_CONTRAINDICATIONS)) {
        const hasConflict = userContraindications.some(c => contraindications.includes(c));
        if (!hasConflict && protocol !== methodology) {
            suggestedAlternative = protocol as MethodologyType;
            break;
        }
    }

    console.warn('⚠️ Contraindication check failed:', {
        methodology,
        conflicts,
        suggestedAlternative
    });

    return {
        safe: false,
        warnings: conflicts.map(c => `Protocol "${methodology}" may not be suitable for users with ${c.replace(/_/g, ' ')}`),
        suggestedAlternative
    };
};

/**
 * Generate personalization context string for prompt injection
 */
export const generatePersonalizationContext = (history: SessionHistorySummary): string => {
    if (history.totalSessions === 0) {
        return 'This is a new user with no session history.';
    }

    const parts: string[] = [];

    if (history.frequentThemes.length > 0) {
        parts.push(`User often explores: ${history.frequentThemes.join(', ')}`);
    }

    if (history.lastSessionFocus) {
        parts.push(`Last session focused on: ${history.lastSessionFocus}`);
    }

    if (history.recentInsights.length > 0) {
        parts.push(`Recent user insights: "${history.recentInsights[0]}"`);
    }

    if (history.averageRating >= 4) {
        parts.push('User generally rates sessions highly - current approach is working');
    } else if (history.averageRating > 0 && history.averageRating < 3) {
        parts.push('User ratings suggest room for improvement - try a fresh approach');
    }

    return parts.join('. ');
};
