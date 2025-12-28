import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { CLINICAL_PROTOCOLS } from "../_shared/protocols.ts";
import { MethodologyType } from "../_shared/types.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-3-flash-preview";

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

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) throw new Error("Missing OPENROUTER_API_KEY");

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [{ role: "user", content: generatorPrompt }],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        const cleanContent = content.replace(/```json\n?|```/g, '').trim();
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
