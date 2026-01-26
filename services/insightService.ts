/**
 * Insight Service
 * Handles insight extraction, filtering, and persistence
 */

import { supabase } from './supabaseClient';

// ============================================
// TYPES
// ============================================

export type ThemeType = 'SAFETY' | 'SPARK' | 'POWER' | 'CLARITY' | 'FLOW';
export type CategoryType = 'BODY' | 'NARRATIVE' | 'ACTION' | 'CONTEXT';
export type SourceType = 'REFLECTION' | 'INTENTION' | 'MANUAL';

export interface UserInsight {
    id: string;
    userId: string;
    text: string;
    category: CategoryType | null;
    themeRelevance: ThemeType[];
    sourceType: SourceType;
    sourceSessionId: string | null;
    isActive: boolean;
    keywords: string[];
    extractedAt: Date;
}

export interface ThemeConfig {
    id: ThemeType;
    label: string;
    uxLabel: string;
    emoji: string;
    keywords: string[];
    excludeKeywords: string[];
    description: string;
}

export interface CategoryConfig {
    id: CategoryType;
    group: string;
    label: string;
    insightTypes: string[];
    description: string;
}

// ============================================
// RESEARCH-BACKED THEME DEFINITIONS
// ============================================

export const THEMES: ThemeConfig[] = [
    {
        id: 'SAFETY',
        label: 'Safety',
        uxLabel: 'I need Safety',
        emoji: '🛡️',
        keywords: ['grounding', 'safety', 'protect', 'exhale', 'slow', 'heavy', 'secure', 'calm', 'peace'],
        excludeKeywords: ['disconnect', 'numb', 'float', 'sleep'],
        description: 'Ventral Vagal restoration. The biological prerequisite for agency.'
    },
    {
        id: 'SPARK',
        label: 'Spark',
        uxLabel: 'I need a Spark',
        emoji: '✨',
        keywords: ['micro-movement', 'one step', 'wiggle', 'gentle', 'momentum', 'start', 'begin', 'tiny'],
        excludeKeywords: ['grind', 'hustle', 'push', 'force', 'massive'],
        description: 'For when you feel stuck. An exoskeleton, not a drill sergeant.'
    },
    {
        id: 'POWER',
        label: 'Power',
        uxLabel: 'I need Power',
        emoji: '🔥',
        keywords: ['challenge', 'heat', 'push', 'boundary', 'conquer', 'intensity', 'drive', 'strength'],
        excludeKeywords: ['gentle', 'soft', 'surrender', 'allow'],
        description: 'Channel high energy into overcoming. Sympathetic activation.'
    },
    {
        id: 'CLARITY',
        label: 'Clarity',
        uxLabel: 'I need Clarity',
        emoji: '🎯',
        keywords: ['sequence', 'structure', 'first step', 'linear', 'define', 'decide', 'focus', 'clear'],
        excludeKeywords: ['open', 'explore', 'brainstorm', 'imagine', 'possibilities'],
        description: 'Reduce mental noise. Act as a predictive model to reduce surprise.'
    },
    {
        id: 'FLOW',
        label: 'Flow',
        uxLabel: 'I need Flow',
        emoji: '🌊',
        keywords: ['connect', 'align', 'allow', 'release', 'effortless', 'adapt', 'surrender', 'natural'],
        excludeKeywords: ['force', 'control', 'grip', 'rigid', 'try harder'],
        description: 'Moving from forcing to aligning with the system. Wu wei.'
    }
];

// ============================================
// RESEARCH-BACKED CATEGORY DEFINITIONS
// ============================================

export const CATEGORIES: CategoryConfig[] = [
    {
        id: 'BODY',
        group: 'The Body',
        label: 'Somatic',
        insightTypes: ['pulse', 'temperature', 'gut feeling', 'tension', 'breath', 'sensation'],
        description: 'Interoception. Agency starts with feeling the body.'
    },
    {
        id: 'NARRATIVE',
        group: 'The Narrative',
        label: 'Cognitive',
        insightTypes: ['self-talk', 'beliefs', 'stories', 'time horizon', 'judgment'],
        description: 'Stories and scripts. The beliefs that drive behavior.'
    },
    {
        id: 'ACTION',
        group: 'The Action',
        label: 'Behavioral',
        insightTypes: ['procrastination', 'hesitation', 'impulse', 'forcing', 'flowing', 'burnout'],
        description: 'Friction and flow. The metabolic cost of action.'
    },
    {
        id: 'CONTEXT',
        group: 'The Context',
        label: 'Systemic',
        insightTypes: ['environment', 'relationships', 'triggers', 'locus of control'],
        description: 'External factors. Agency is shaped by environment.'
    }
];

// ============================================
// FILTERING FUNCTIONS
// ============================================

/**
 * Filter insights by theme relevance
 */
export function filterInsightsByTheme(insights: UserInsight[], theme: ThemeType): UserInsight[] {
    const themeConfig = THEMES.find(t => t.id === theme);
    if (!themeConfig) return insights;

    return insights.filter(insight => {
        // Check if insight is explicitly tagged for this theme
        if (insight.themeRelevance.includes(theme)) return true;

        // Check keywords
        const textLower = insight.text.toLowerCase();
        const hasRelevantKeyword = themeConfig.keywords.some(k => textLower.includes(k.toLowerCase()));
        const hasExcludedKeyword = themeConfig.excludeKeywords.some(k => textLower.includes(k.toLowerCase()));

        return hasRelevantKeyword && !hasExcludedKeyword;
    });
}

/**
 * Filter insights by category
 */
export function filterInsightsByCategory(insights: UserInsight[], category: CategoryType): UserInsight[] {
    return insights.filter(insight => insight.category === category);
}

/**
 * Group insights by category
 */
export function groupInsightsByCategory(insights: UserInsight[]): Record<CategoryType, UserInsight[]> {
    const grouped: Record<CategoryType, UserInsight[]> = {
        BODY: [],
        NARRATIVE: [],
        ACTION: [],
        CONTEXT: []
    };

    insights.forEach(insight => {
        if (insight.category) {
            grouped[insight.category].push(insight);
        } else {
            // Auto-categorize by keywords if not set
            const category = inferCategory(insight.text);
            grouped[category].push(insight);
        }
    });

    return grouped;
}

/**
 * Infer category from text content
 */
function inferCategory(text: string): CategoryType {
    const textLower = text.toLowerCase();

    for (const cat of CATEGORIES) {
        if (cat.insightTypes.some(type => textLower.includes(type))) {
            return cat.id;
        }
    }

    // Default to NARRATIVE (most common)
    return 'NARRATIVE';
}

/**
 * Calculate theme relevance score
 */
export function calcThemeRelevance(text: string): ThemeType[] {
    const textLower = text.toLowerCase();
    const relevant: ThemeType[] = [];

    for (const theme of THEMES) {
        const matchCount = theme.keywords.filter(k => textLower.includes(k.toLowerCase())).length;
        const excludeCount = theme.excludeKeywords.filter(k => textLower.includes(k.toLowerCase())).length;

        if (matchCount > 0 && excludeCount === 0) {
            relevant.push(theme.id);
        }
    }

    return relevant;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Fetch user's active insights
 */
export async function fetchUserInsights(userId: string): Promise<UserInsight[]> {
    const { data, error } = await supabase
        .from('user_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('extracted_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch insights:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        text: row.text,
        category: row.category,
        themeRelevance: row.theme_relevance || [],
        sourceType: row.source_type,
        sourceSessionId: row.source_session_id,
        isActive: row.is_active,
        keywords: row.keywords || [],
        extractedAt: new Date(row.extracted_at)
    }));
}

/**
 * Save new insight
 */
export async function saveInsight(
    userId: string,
    text: string,
    sourceType: SourceType,
    sourceSessionId?: string
): Promise<UserInsight | null> {
    const category = inferCategory(text);
    const themeRelevance = calcThemeRelevance(text);

    const { data, error } = await supabase
        .from('user_insights')
        .insert({
            user_id: userId,
            text,
            category,
            theme_relevance: themeRelevance,
            source_type: sourceType,
            source_session_id: sourceSessionId || null,
            is_active: true,
            keywords: extractKeywords(text)
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to save insight:', error);
        return null;
    }

    return {
        id: data.id,
        userId: data.user_id,
        text: data.text,
        category: data.category,
        themeRelevance: data.theme_relevance || [],
        sourceType: data.source_type,
        sourceSessionId: data.source_session_id,
        isActive: data.is_active,
        keywords: data.keywords || [],
        extractedAt: new Date(data.extracted_at)
    };
}

/**
 * Deactivate (soft delete) an insight
 */
export async function deactivateInsight(insightId: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_insights')
        .update({ is_active: false })
        .eq('id', insightId);

    return !error;
}

/**
 * Save session feedback
 */
export async function saveSessionFeedback(
    userId: string,
    meditationId: string,
    insights: string,
    positives: string,
    improvements: string
): Promise<string | null> {
    const { data, error } = await supabase
        .from('session_feedback')
        .insert({
            user_id: userId,
            meditation_id: meditationId,
            insights_raw: insights,
            positives_raw: positives,
            improvements_raw: improvements
        })
        .select('id')
        .single();

    if (error) {
        console.error('Failed to save feedback:', error);
        return null;
    }

    return data.id;
}

/**
 * Get/update user preferences
 */
export async function getUserPreferences(userId: string): Promise<{ voice: 'male' | 'female'; lastTheme: string | null; lastDuration: number }> {
    const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return { voice: 'female', lastTheme: null, lastDuration: 10 };
    }

    return {
        voice: data.preferred_voice || 'female',
        lastTheme: data.last_theme,
        lastDuration: data.last_duration || 10
    };
}

export async function updateUserPreferences(
    userId: string,
    updates: { voice?: 'male' | 'female'; lastTheme?: string; lastDuration?: number }
): Promise<void> {
    const { error } = await supabase.rpc('upsert_user_preferences', {
        p_user_id: userId,
        p_preferred_voice: updates.voice || null,
        p_last_theme: updates.lastTheme || null,
        p_last_duration: updates.lastDuration || null
    });

    if (error) console.error('Failed to update preferences:', error);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'i', 'me', 'my', 'to', 'of', 'and', 'or', 'that', 'this', 'it', 'in', 'on', 'for', 'with']);
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const filtered = words.filter(w => !stopWords.has(w));
    const unique = [...new Set(filtered)];
    return unique.slice(0, 10);
}
