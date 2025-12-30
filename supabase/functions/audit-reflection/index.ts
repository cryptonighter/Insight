import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { reflection, user_id } = await req.json();
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_API_KEY') ?? '');

        // 1. EXTRACT FACTS (The Auditor)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const extractionPrompt = `
      Analyze this user reflection. Extract "Atomic Facts" that are worth remembering long-term.
      
      CRITERIA:
      - "Atomic": One single concept per fact.
      - "Long-Term": Ignore temporary trivialities (e.g. "ate a sandwich"). Keep structural things (e.g. "Trying keto diet").
      - "Type": 'core' (identity/values), 'explicit' (user said "remember this"), or 'general'.
      - "Confidence": 0.0 to 1.0.

      REFLECTION:
      "${reflection}"

      RETURN JSON ARRAY:
      [{ "content": "string", "type": "general"|"core"|"explicit", "importance": 1-10 }]
    `;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const facts = JSON.parse(result.response.text());
        console.log("Extracted Facts:", facts);

        // 2. PROCESS EACH FACT (Consolidation)
        const embedModel = genAI.getGenerativeModel({ model: "models/text-embedding-004" });

        for (const fact of facts) {
            if (fact.importance < 3) continue; // Skip noise

            // A. Generate Embedding
            const embedResult = await embedModel.embedContent(fact.content);
            const embedding = embedResult.embedding.values;

            // B. Check for Duplicates (Consolidation)
            // We look for VERY similar memories (>0.85) to avoid duplication
            const { data: matches } = await supabaseClient.rpc('match_memories', {
                query_embedding: embedding,
                match_threshold: 0.85,
                match_count: 1
            });

            if (matches && matches.length > 0) {
                // --- UPDATE (Evolution) ---
                const existing = matches[0];
                console.log(`Evolution detected for: "${existing.content}" -> "${fact.content}"`);

                // Fetch current history
                const { data: currentMem } = await supabaseClient.from('memories').select('history').eq('id', existing.id).single();
                const history = currentMem?.history || [];

                // Append new history event
                history.push({
                    date: new Date().toISOString(),
                    context: `Evolved: ${fact.content}`,
                    previous_content: existing.content
                });

                await supabaseClient.from('memories').update({
                    content: fact.content, // Update to latest "Truth"
                    last_observed: new Date().toISOString(),
                    history: history,
                    importance_score: Math.max(existing.importance_score, fact.importance) // Keep highest importance
                }).eq('id', existing.id);

            } else {
                // --- INSERT (New Memory) ---
                await supabaseClient.from('memories').insert({
                    user_id,
                    content: fact.content,
                    type: fact.type,
                    importance_score: fact.importance,
                    embedding: embedding,
                    history: [{ date: new Date().toISOString(), context: "First observed" }]
                });
            }
        }

        return new Response(JSON.stringify({ success: true, processed: facts.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
