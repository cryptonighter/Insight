import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function audit() {
    const email = '3kristaps6barons9@gmail.com';
    console.log(`Auditing data for: ${email}`);

    // 1. Find User ID
    const { data: users, error: userError } = await supabase
        .from('profiles') // Trying profiles first as auth is harder via service role sometimes or just generic
        .select('id')
        .eq('email', email);

    if (userError || !users || users.length === 0) {
        // Fallback: try memories to see if we can find any entries for that email (if joined) 
        // Or just let's try to get ALL memories and filter in JS if small enough
        console.log("Could not find user in 'profiles'. Checking 'memories' for clues...");
        const { data: allMemories } = await supabase.from('memories').select('*').limit(10);
        console.log("Latest memories (sample):", allMemories);
        return;
    }

    const userId = users[0].id;
    console.log(`User ID Found: ${userId}`);

    // 2. Fetch Memories
    const { data: memories } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    console.log("\n--- MEMORIES ---");
    memories?.forEach(m => {
        console.log(`[${m.type}] ${m.content} (Importance: ${m.importance_score})`);
    });

    // 3. Fetch Recent Reflections
    const { data: entries } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5);

    console.log("\n--- RECENT SUMMARIES ---");
    entries?.forEach(e => {
        console.log(`[${e.date}] ${e.reflection_summary}`);
    });
}

audit();
