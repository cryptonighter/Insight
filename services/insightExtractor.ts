/**
 * Insight Extractor
 * Parses user input (voice/text) into structured + unstructured data
 */

import { ThemeType, THEMES } from './insightService';

export interface ExtractedInsight {
    // Structured
    detectedTheme: ThemeType | null;
    detectedCategory: 'BODY' | 'NARRATIVE' | 'ACTION' | 'CONTEXT' | null;
    suggestedDuration: number;
    urgencyLevel: 1 | 2 | 3; // 1=low, 2=medium, 3=high

    // Unstructured
    rawTranscript: string;
    keywords: string[];
    bodyFocus: boolean; // vs mind focus
}

// Keyword mappings for quick detection
const THEME_KEYWORDS: Record<ThemeType, string[]> = {
    SAFETY: ['anxious', 'stressed', 'overwhelmed', 'racing', 'scattered', 'panic', 'worried', 'scared'],
    SPARK: ['stuck', 'frozen', 'numb', 'procrastinating', 'avoiding', 'blocked', 'can\'t start', 'paralyzed'],
    POWER: ['energized', 'ready', 'push', 'challenge', 'motivated', 'pumped', 'drive', 'fire'],
    FLOW: ['exhausted', 'tired', 'forcing', 'burnout', 'depleted', 'trying too hard', 'drained']
};

const BODY_KEYWORDS = ['body', 'chest', 'stomach', 'shoulders', 'tension', 'heart', 'breath', 'physical', 'muscles'];
const URGENCY_KEYWORDS = ['now', 'urgent', 'need', 'help', 'can\'t', 'emergency', 'immediately'];

/**
 * Extract structured insights from raw user input
 */
export const extractInsight = (transcript: string): ExtractedInsight => {
    const lower = transcript.toLowerCase();
    const words = lower.split(/\s+/);

    // Detect theme
    let detectedTheme: ThemeType | null = null;
    let maxMatches = 0;

    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
        const matches = keywords.filter(kw => lower.includes(kw)).length;
        if (matches > maxMatches) {
            maxMatches = matches;
            detectedTheme = theme as ThemeType;
        }
    }

    // Detect body vs mind focus
    const bodyFocus = BODY_KEYWORDS.some(kw => lower.includes(kw));

    // Detect category based on content
    let detectedCategory: ExtractedInsight['detectedCategory'] = null;
    if (bodyFocus) {
        detectedCategory = 'BODY';
    } else if (lower.includes('think') || lower.includes('thought') || lower.includes('mind')) {
        detectedCategory = 'NARRATIVE';
    } else if (lower.includes('doing') || lower.includes('action') || lower.includes('work')) {
        detectedCategory = 'ACTION';
    }

    // Detect urgency
    const urgencyMatches = URGENCY_KEYWORDS.filter(kw => lower.includes(kw)).length;
    const urgencyLevel: 1 | 2 | 3 = urgencyMatches >= 2 ? 3 : urgencyMatches === 1 ? 2 : 1;

    // Suggested duration based on urgency and theme
    let suggestedDuration = 10;
    if (urgencyLevel === 3) {
        suggestedDuration = 5; // Quick intervention
    } else if (detectedTheme === 'SPARK') {
        suggestedDuration = 5; // Spark sessions are short
    } else if (detectedTheme === 'POWER') {
        suggestedDuration = 15; // Power sessions can be longer
    }

    // Extract notable keywords
    const allKeywords = [...Object.values(THEME_KEYWORDS).flat(), ...BODY_KEYWORDS];
    const keywords = words.filter(w => allKeywords.includes(w));

    return {
        detectedTheme,
        detectedCategory,
        suggestedDuration,
        urgencyLevel,
        rawTranscript: transcript,
        keywords: [...new Set(keywords)],
        bodyFocus
    };
};

/**
 * Get theme label for display
 */
export const getThemeLabel = (theme: ThemeType): string => {
    return THEMES.find(t => t.id === theme)?.uxLabel || theme;
};

/**
 * Get theme description
 */
export const getThemeDescription = (theme: ThemeType): string => {
    return THEMES.find(t => t.id === theme)?.description || '';
};
