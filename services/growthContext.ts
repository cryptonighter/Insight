import { storageService } from './storageService';
import { supabase } from './supabaseClient';

export const growthContext = {
    /**
     * Fetches the most relevant parts and patterns for the director.
     * In a real app, this could involve vector search or keyword matching.
     * For now, it pulls the most recently accessed clinical data.
     */
    async getRecentHistory(userId: string) {
        try {
            const [parts, anchors, patterns] = await Promise.all([
                storageService.getParts(userId),
                storageService.getSomaticAnchors(userId),
                supabase.from('patterns')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(5)
            ]);

            return {
                parts: parts.slice(0, 3).map(p => ({ name: p.name, role: p.role, somatic: p.somatic_location })),
                anchors: anchors.slice(0, 3).map(a => ({ type: a.type, description: a.description })),
                patterns: (patterns.data || []).map(p => p.title)
            };
        } catch (e) {
            console.error("Failed to fetch growth context", e);
            return { parts: [], anchors: [], patterns: [] };
        }
    }
};
