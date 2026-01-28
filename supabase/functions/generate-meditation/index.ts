import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CLINICAL_PROTOCOLS } from "../_shared/protocols.ts";
import { MethodologyType } from "../_shared/types.ts";

const GEMINI_MODEL = "gemini-1.5-flash";

// Corrected TTS pacing: ~145 words/min spoken, with pauses ~85% effective
const EFFECTIVE_WORDS_PER_MINUTE = 123; // 145 * 0.85

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { focus, targetFeeling, durationMinutes, methodology, variables, voice } = await req.json();

        // Try to fetch protocol from database first, fallback to hardcoded
        let protocol: any = null;

        try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

            if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);

                const { data, error } = await supabase
                    .from('clinical_protocols')
                    .select('*')
                    .eq('methodology', methodology)
                    .eq('is_active', true)
                    .single();

                if (data && !error) {
                    protocol = {
                        name: data.name,
                        description: data.description,
                        systemInput: data.system_prompt,
                        sonicCues: data.sonic_cues || { atmosphere: 'rain', startFreq: 14, endFreq: 4 }
                    };
                    console.log(`📚 Loaded protocol from database: ${methodology}`);
                }
            }
        } catch (dbError) {
            console.warn('Database protocol fetch failed, using fallback:', dbError);
        }

        // Fallback to hardcoded protocols
        if (!protocol) {
            protocol = CLINICAL_PROTOCOLS[methodology as MethodologyType] || CLINICAL_PROTOCOLS['NSDR'];
            console.log(`📁 Using hardcoded protocol: ${methodology}`);
        }

        if (!protocol) {
            throw new Error("Invalid methodology");
        }

        const targetWords = Math.round(durationMinutes * EFFECTIVE_WORDS_PER_MINUTE);

        // Reduced batch counts for better voice consistency (fewer TTS calls = more consistent voice)
        const getStructureInstructions = (mins: number) => {
            if (mins <= 5) {
                return `
                STRUCTURE (5 Minutes):
                - Create 1 SINGLE batch containing the entire session.
                - Flow: Short intro -> Quick technique -> Brief outro.
                `;
            } else if (mins <= 10) {
                // Reduced from 4 to 3 batches for better voice consistency
                return `
                STRUCTURE (10 Minutes):
                - Create EXACTLY 3 BATCHES:
                  1. Opening (approx 2 mins): Immediate settling, framing, and context.
                  2. Main Session (approx 6.5 mins): The core protocol/technique (ONE CONTINUOUS BLOCK).
                  3. Closing (approx 1.5 mins): Grounding back, gentle return to alertness.
                - Ensure smooth transitions between batches.
                `;
            } else {
                // Reduced from 5 to 3 batches for better voice consistency
                return `
                STRUCTURE (20+ Minutes):
                - Create EXACTLY 3 BATCHES:
                  1. Opening (approx 3 mins): Deep settling, breath awareness, body scan.
                  2. Main Session (approx 12 mins): Core technique - combine multiple phases into one continuous flow.
                  3. Closing (approx 5 mins): Long integration, grounding, gentle return to alertness.
                - Maintain one continuous voice throughout each batch.
                `;
            }
        };

        const structureInstructions = getStructureInstructions(durationMinutes);

        // Intensity-specific prompt modifiers
        const getIntensityInstructions = (intensity: string) => {
            switch (intensity) {
                case 'GENTLE':
                    return `
    INTENSITY (GENTLE):
    - Focus on relaxation and comfort only
    - Avoid probing questions or emotional exploration
    - Use soft, reassuring language throughout
    - Keep suggestions light and non-challenging
    - Prioritize safety and ease over depth
    `;
                case 'DEEP':
                    return `
    INTENSITY (DEEP):
    - Guide deeper introspection and emotional exploration
    - Include gentle challenges and probing questions
    - Allow space for difficult emotions to surface
    - Use powerful, evocative metaphors
    - Create opportunities for insight and breakthrough
    `;
                default: // MODERATE
                    return `
    INTENSITY (MODERATE):
    - Balance between relaxation and exploration
    - Include some reflective questions
    - Gently guide without forcing depth
    - Allow organic deepening if it arises
    `;
            }
        };

        const intensityInstructions = getIntensityInstructions(variables?.intensity || 'MODERATE');

        const generatorPrompt = `
    You are an expert Clinical Hypnotherapist and Meditation Guide. 
    Generate a deep, immersive meditation script following the ${protocol.name} protocol.

    META-DATA:
    - Focus: ${focus}
    - Feeling: ${targetFeeling}
    - Duration: ${durationMinutes} minutes
    - Target Word Count: ~${targetWords} words
    - Protocol Context: ${protocol.description}
    - System Instruction: ${protocol.systemInput}
    - Variables: ${JSON.stringify(variables)}
    
    TASK:
    Generate a JSON object containing the meditation script.
    
    ${structureInstructions}
    ${intensityInstructions}
    
    STYLE GUIDELINES (CRITICAL):
    1. **Show, Don't Tell**: Do not explain what you are doing. Do not say "In this session we will...". Just lead the experience.
    2. **Hypnotic Pacing**: Use short, sensory-rich sentences. 
    3. **NO BLOG TALK**: Avoid intellectualizing. No "It is important to...", No "Research shows...". 
    4. **Direct Experience**: Use present tense. "Noticing the breath..." instead of "Now I want you to notice your breath."
    5. **Micro-Pacing**: Insert "[Silence]" or "..." OFTEN to control the speed. 

    JSON FORMAT (STRICT):
    {
      "title": "Title of Session",
      "batches": [
        { "text": "Batch 1 text..." },
        { "text": "Batch 2 text..." },
        { "text": "Batch 3 text..." }
      ],
      "lines": ["Summary line 1", "Summary line 2"]
    }
    
    IMPORTANT: You must return the EXACT number of batches requested in the STRUCTURE section.
    
    BREATHING AND PACING:
    - You MUST include audible breathing cues: "[Perform a deep, audible breath]" (Do not use "Audible Inhale/Exhale").
    - Use "[Silence]" to indicate 3-5 second pauses.
    - Pacing should be EXTREMELY SLOW.
    
    GROUNDING SEQUENCE (MANDATORY FOR ALL SESSIONS):
    - End every session with a gentle return to alertness.
    - Include: body awareness, sounds in the room, invitation to open eyes.
    - Never leave the listener in a deep state without guidance back.
    `;

        // Try multiple env vars
        const googleApiKey = Deno.env.get('GOOGLE_API_KEY') ||
            Deno.env.get('VITE_GOOGLE_API_KEY') ||
            Deno.env.get('NEXT_PUBLIC_GOOGLE_API_KEY');

        const keySource = Deno.env.get('GOOGLE_API_KEY') ? 'GOOGLE_API_KEY' :
            Deno.env.get('VITE_GOOGLE_API_KEY') ? 'VITE_GOOGLE_API_KEY' : 'UNKNOWN';

        if (!googleApiKey) throw new Error("Missing GOOGLE_API_KEY (checked GOOGLE_API_KEY, VITE_..., NEXT_...)");

        const callGoogleAI = async (model: string) => {
            console.log(`Attempting generation with model: ${model} `);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: generatorPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                // EXPOSE KEY DETAILS FOR DEBUGGING
                throw new Error(`Google API Error (${model}): ${response.status} - ${errorText} || KeySource: ${keySource} || KeyPrefix: ${googleApiKey.substring(0, 5)}...`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            const cleanContent = rawText.replace(/```json\n?|```/g, '').trim();
            return JSON.parse(cleanContent);
        };

        const PRIMARY_MODEL = "gemini-2.0-flash";
        const FALLBACK_MODEL = "gemini-1.5-pro";

        let parsed;
        try {
            parsed = await callGoogleAI(PRIMARY_MODEL);
        } catch (primaryError) {
            console.warn(`Primary model (${PRIMARY_MODEL}) failed. Falling back to ${FALLBACK_MODEL}. Error:`, primaryError);
            try {
                parsed = await callGoogleAI(FALLBACK_MODEL);
            } catch (fallbackError) {
                console.error("Fallback model failed too:", fallbackError);
                // Return the detailed error to the client
                const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                throw new Error(errorMessage);
            }
        }

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Generate Function Error:", errorMessage);
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
