/**
 * Check-In Context Builder
 * Aggregates user history, preferences, and insights for AI context
 */

import { supabase } from './supabaseClient';
import { THEMES, ThemeType } from './insightService';

export interface CheckInContext {
    // User history
    lastSession?: {
        theme: string;
        duration: number;
        methodology: string;
        daysAgo: number;
    };
    totalSessions: number;
    favoriteTheme?: ThemeType;

    // Recent insights
    recentInsights: {
        text: string;
        category: string;
        createdAt: string;
    }[];

    // Available experiences
    availableThemes: typeof THEMES;
}

/**
 * Build full context for AI check-in conversation
 */
export const buildCheckInContext = async (userId: string): Promise<CheckInContext> => {
    // Fetch session history
    const { data: sessions } = await supabase
        .from('meditation_sessions')
        .select('methodology, duration, theme, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    // Last session
    let lastSession;
    if (sessions && sessions.length > 0) {
        const last = sessions[0];
        const daysAgo = Math.floor(
            (Date.now() - new Date(last.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        lastSession = {
            theme: last.theme || 'unknown',
            duration: last.duration || 10,
            methodology: last.methodology || 'NSDR',
            daysAgo
        };
    }

    // Favorite theme (most used)
    const themeCounts: Record<string, number> = {};
    sessions?.forEach(s => {
        if (s.theme) {
            themeCounts[s.theme] = (themeCounts[s.theme] || 0) + 1;
        }
    });
    const favoriteTheme = Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] as ThemeType | undefined;

    // Recent insights from interactions
    const { data: insights } = await supabase
        .from('user_interactions')
        .select('raw_transcript, detected_category, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    const recentInsights = (insights || []).map(i => ({
        text: i.raw_transcript?.substring(0, 100) || '',
        category: i.detected_category || 'unknown',
        createdAt: i.created_at
    }));

    return {
        lastSession,
        totalSessions: sessions?.length || 0,
        favoriteTheme,
        recentInsights,
        availableThemes: THEMES
    };
};

/**
 * Format context as prompt section for AI
 */
export const formatContextForPrompt = (ctx: CheckInContext): string => {
    const lines: string[] = [];

    lines.push('## AVAILABLE EXPERIENCES');
    ctx.availableThemes.forEach(t => {
        lines.push(`- ${t.emoji} ${t.uxLabel}: ${t.description}`);
    });

    lines.push('\n## USER HISTORY');
    lines.push(`Total sessions: ${ctx.totalSessions}`);
    if (ctx.lastSession) {
        lines.push(`Last session: ${ctx.lastSession.theme} (${ctx.lastSession.duration}min, ${ctx.lastSession.daysAgo} days ago)`);
    }
    if (ctx.favoriteTheme) {
        lines.push(`Usually prefers: ${ctx.favoriteTheme}`);
    }

    if (ctx.recentInsights.length > 0) {
        lines.push('\n## RECENT INSIGHTS');
        ctx.recentInsights.forEach(i => {
            lines.push(`- "${i.text}" (${i.category})`);
        });
    }

    return lines.join('\n');
};
