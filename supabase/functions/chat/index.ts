import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { history, latestInput, userVariables } = await req.json();

        const orchestratorPrompt = `
    You are the 'Clinical Orchestrator'. Analyze the explorer and return JSON ONLY.
    
    1. Reply: Acknowledge feelings warmly. Keep it short (max 2 sentences).
    2. Suggestion: If they seem ready for a shift, offer a specific session using the "suggestion" object.
       - Focus: What is the main goal? (e.g. "Calm Anxiety", "Sleep", "Unblend Part")
       - Feeling: What is the desired feeling? (e.g. "Safe", "Grounded", "Curious")
       - Methodology: ONE OF ["NSDR", "IFS", "SOMATIC_AGENCY", "ACT", "FUTURE_SELF", "WOOP", "NVC", "IDENTITY", "NARRATIVE"].
       - Duration: 5-20 minutes.
    
    User Context: ${JSON.stringify(userVariables)}
    
    RETURN JSON FORMAT:
    {
      "reply": "I hear... would you like to try...",
      "shouldOfferMeditation": true/false,
      "suggestion": { // OPTIONAL, only if shouldOfferMeditation is true
        "focus": "...",
        "feeling": "...",
        "methodology": "NSDR", 
        "duration": 10
      }
    }
  `;

        const conversation = history.map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.text
        }));

        const contextMsg = `UserContext: ${JSON.stringify(userVariables)}`;
        const messages = [
            { role: 'system', content: orchestratorPrompt },
            ...conversation,
            { role: 'user', content: `${contextMsg}\nExplore Input: ${latestInput}` }
        ];

        const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (!openRouterKey) {
            throw new Error("Missing OPENROUTER_API_KEY");
        }

        console.log("Calling OpenRouter with model:", OPENROUTER_MODEL);
        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter API Error:", errorText);
            throw new Error(`OpenRouter Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";

        // Clean JSON (remove markdown)
        const cleanContent = content.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(cleanContent);

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Chat Function Error:", error);
        return new Response(JSON.stringify({
            reply: "I hear you. Tell me more about that.",
            shouldOfferMeditation: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Return 200 so client handles it gracefully
        });
    }
});
