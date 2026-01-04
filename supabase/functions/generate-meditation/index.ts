import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { CLINICAL_PROTOCOLS } from "../_shared/protocols.ts";
import { MethodologyType } from "../_shared/types.ts";

const GEMINI_MODEL = "gemini-2.0-flash-exp";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { focus, targetFeeling, durationMinutes, methodology, variables, voice } = await req.json();

        const protocol = CLINICAL_PROTOCOLS[methodology as MethodologyType] || CLINICAL_PROTOCOLS['NSDR'];
        if (!protocol) {
            throw new Error("Invalid methodology");
        }

        const generatorPrompt = `
    You are an expert Clinical Generator. Generate a meditation script following the ${protocol.name} protocol.
    
    META-DATA:
    - Focus: ${focus}
    - Feeling: ${targetFeeling}
    - Duration: ${durationMinutes} minutes
    - Protocol Context: ${protocol.description}
    - System Instruction: ${protocol.systemInput}
    - Variables: ${JSON.stringify(variables)}
    
    TASK:
    Generate a JSON object containing the meditation script.
    The script should be broken into "batches" or chunks for progressive loading.
    
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
    `;

        // Use GOOGLE_API_KEY from Supabase Secrets
        const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
        if (!googleApiKey) throw new Error("Missing GOOGLE_API_KEY");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${googleApiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: generatorPrompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Parse Google Response
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const cleanContent = rawText.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleanContent);

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Generate Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
