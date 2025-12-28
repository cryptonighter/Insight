import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn('Supabase credentials missing or invalid. Using mock client.');
    // Mock client to prevent crash
    supabaseInstance = {
        from: () => ({
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: [], error: null }),
            update: () => Promise.resolve({ data: [], error: null }),
            delete: () => Promise.resolve({ data: [], error: null }),
            eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) })
        }),
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
            signOut: () => Promise.resolve({})
        }
    } as any;
}

export const supabase = supabaseInstance;
