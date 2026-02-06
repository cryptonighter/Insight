import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance;
let isMock = false;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true, // Persist session to localStorage (critical for passkey)
            detectSessionInUrl: true, // Handle auth callbacks
            autoRefreshToken: true, // Auto-refresh expired tokens
            storageKey: 'insight-auth', // Custom storage key to avoid conflicts
            flowType: 'pkce' // Secure auth flow (required for passkeys)
        }
    });
    console.log('🔐 Supabase: Auth persistence enabled with PKCE flow');
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
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: (callback: any) => {
                // Return mock subscription
                return { data: { subscription: { unsubscribe: () => { } } } };
            },
            signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
            signUp: () => Promise.resolve({ data: { user: { id: 'mock-user' } }, error: null }),
            signOut: () => Promise.resolve({})
        },
        functions: {
            invoke: () => Promise.resolve({ data: null, error: null })
        }
    } as any;
    isMock = true;
}

export const supabase = supabaseInstance;
export const isMockClient = () => isMock;
