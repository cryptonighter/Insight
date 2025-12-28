import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { input, triage, growthHistory } = await req.json();

        const directorTools = [
            {
                name: "select_meditation_protocol",
                description: "Selects the optimal meditation methodology and configuration.",
                parameters: {
                    type: "object",
                    properties: {
                        methodology: { type: "string", enum: ["IFS", "SOMATIC_AGENCY", "NSDR", "GENERAL"] },
                        focus: { type: "string" },
                        targetFeeling: { type: "string" },
                        intensity: { type: "string", enum: ["SOFT", "MODERATE", "DEEP"] },
                        rationale: { type: "string" }
                    },
                    required: ["methodology", "focus", "targetFeeling", "intensity"]
                }
            }
        ];

        const prompt = `
    You are the "Insight Director". Triage the explorer and select a growth protocol.
    
    EXPLORER INPUT: "${input}"
    STATE: Valence ${triage.valence}, Energy ${triage.arousal}
    CONTEXT: ${JSON.stringify(growthHistory)}

    If they mention a Part, use IFS. If anxious, use NSDR or Grounding.
    
    RETURN JSON ONLY matching this tool schema:
    ${JSON.stringify(directorTools[0])}
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
                messages: [{ role: "user", content: prompt }],
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
        console.error("Director Function Error:", error);
        // Fallback
        return new Response(JSON.stringify({
            methodology: "NSDR",
            focus: "Grounding",
            targetFeeling: "Calm",
            intensity: "MODERATE",
            rationale: "Fallback due to error"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });
    }
});
