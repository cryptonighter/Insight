import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { history, latestInput, userVariables, directorSuggestion } = await req.json();

        const orchestratorPrompt = `
    You are the 'Companion Brain'. Your goal is to provide a warm, empathetic response while weaving in clinical suggestions from the 'Director Brain' naturally.
    
    CRITICAL INSTRUCTIONS:
    1. NEVER show technical jargon (e.g., "IFS", "Orchestrator", "shouldTrigger", "Rationale").
    2. If there is a directorSuggestion with shouldTrigger=true, explain the proposed session in a way that feels like a natural next step in the conversation.
    3. Ask for the user's confirmation or if they'd like to adjust anything before starting.
    4. Keep the reply supportive and concise (max 3 sentences).
    
    Director Brain Suggestion: ${JSON.stringify(directorSuggestion)}
    User Context: ${JSON.stringify(userVariables)}
    
    RETURN JSON FORMAT:
    {
      "reply": "Warm response weaving in the suggestion...",
      "shouldOfferMeditation": true/false,
      "meditationData": { // ONLY if shouldOfferMeditation is true. Use values from directorSuggestion.
        "focus": "...",
        "feeling": "...",
        "methodology": "...", 
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

        // Ensure we map internal suggestion to meditationData for the client if needed
        const result = {
            reply: parsed.reply,
            shouldOfferMeditation: !!parsed.meditationData || !!parsed.shouldOfferMeditation,
            meditationData: parsed.meditationData || parsed.suggestion
        };

        return new Response(JSON.stringify(result), {
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
