import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { CLINICAL_PROTOCOLS } from "../_shared/protocols.ts";
import { MethodologyType } from "../_shared/types.ts";

const GEMINI_MODEL = "gemini-1.5-flash";

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { focus, targetFeeling, durationMinutes, methodology, variables, voice } = await req.json();

        const protocol = CLINICAL_PROTOCOLS[methodology as MethodologyType] || CLINICAL_PROTOCOLS['NSDR'];
        if (!protocol) {
            throw new Error("Invalid methodology");
        }

        const getStructureInstructions = (mins: number) => {
            if (mins <= 5) {
                return `
                STRUCTURE (5 Minutes):
                - Create 1 SINGLE batch containing the entire session.
                - Flow: Short intro -> Quick technique -> Brief outro.
                `;
            } else if (mins <= 10) {
                // 4 Batches: Greeting (Fast Start) -> Intro -> Main (Long) -> Outro
                return `
                STRUCTURE (10 Minutes):
                - Create EXACTLY 4 BATCHES:
                  1. Greeting (approx 45s): Very brief, immediate settling. (OPTIMIZED FOR FAST START).
                  2. Intro (approx 1.5 mins): Deeper framing and context.
                  3. Main Session (approx 6.5 mins): The core protocol/technique (ONE CONTINUOUS BLOCK).
                  4. Outro (approx 1.5 mins): Grounding back, CTA.
                - Ensure context flows smoothly between them.
                `;
            } else {
                // 5 Batches: Greeting -> Intro -> Main A -> Main B -> Outro
                return `
                STRUCTURE (20+ Minutes):
                - Create EXACTLY 5 BATCHES:
                  1. Greeting (approx 45s): Very brief, immediate settling. (OPTIMIZED FOR FAST START).
                  2. Intro (approx 2 mins): Deep settling.
                  3. Main Part 1 (approx 6 mins): Core technique A.
                  4. Main Part 2 (approx 6 mins): Core technique B / Deepening.
                  5. Outro (approx 5 mins): Long integration & Landing.
                - Ensure distinct progression between parts.
                `;
            }
        };

        const structureInstructions = getStructureInstructions(durationMinutes);

        const generatorPrompt = `
    You are an expert Clinical Hypnotherapist and Meditation Guide. 
    Generate a deep, immersive meditation script following the ${protocol.name} protocol.

    META-DATA:
    - Focus: ${focus}
    - Feeling: ${targetFeeling}
    - Duration: ${durationMinutes} minutes
    - Target Word Count: ~${durationMinutes * 130} words
    - Protocol Context: ${protocol.description}
    - System Instruction: ${protocol.systemInput}
    - Variables: ${JSON.stringify(variables)}
    
    TASK:
    Generate a JSON object containing the meditation script.
    
    ${structureInstructions}
    
    STYLE GUIDELINES (CRITICAL):
    1. **Show, Don't Tell**: Do not explain what you are doing. Do not say "In this session we will...". Just lead the experience.
    2. **Hypnotic Pacing**: Use short, sensory-rich sentences. 
    3. **NO BLOG TALK**: Avoid intellectualizing. No "It is important to...", No "Research shows...". 
    4. **Direct Experience**: Use present tense. "Noticing the breath..." instead of "Now I want you to notice your breath."
    5. **Micro-Pacing**: Insert "[Silence]" or "..." OFTEN to control the speed. 

    JSON FORMAT:
    {
      "title": "Title of Session",
      "batches": [
        {
          "text": "Spoken text...",
          "instructions": [
            { "action": "FADE_VOL", "layer": "music", "targetValue": 0.5, "duration": 5 }
          ]
        }
      ],
      "lines": ["Summary line 1", "Summary line 2"]
    }
    
    IMPORTANT:
    - Use ${protocol.sonicCues.atmosphere} as the implied atmosphere.
    - Start binaural beats at ${protocol.sonicCues.startFreq}Hz and ramp to ${protocol.sonicCues.endFreq}Hz.

    BREATHING AND PACING:
    - You MUST include audible breathing cues: "[Perform a deep, audible breath]" (Do not use "Audible Inhale/Exhale").
    - Use "[Silence]" to indicate 3-5 second pauses.
    - Pacing should be EXTREMELY SLOW.
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

        const PRIMARY_MODEL = "gemini-2.5-flash";
        const FALLBACK_MODEL = "gemini-1.5-flash";

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
