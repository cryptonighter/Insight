import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { CLINICAL_PROTOCOLS } from './protocols.js';
import type { ChatMessage, MethodologyType, SonicInstruction } from './types.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini & OpenRouter
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });
const openRouterKey = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-3-flash-preview";
const DIRECTOR_MODEL = "google/gemini-3-flash-preview";

async function callOpenRouter(messages: any[], model: string = OPENROUTER_MODEL, jsonMode: boolean = false) {
    if (!openRouterKey) {
        console.warn("OpenRouter API Key is missing on server");
        return null;
    }
    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages,
            response_format: jsonMode ? { type: "json_object" } : undefined
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error(`OpenRouter API Error (${response.status}):`, errorData);
        throw new Error(`OpenRouter API Error: ${response.status}`);
    }
    const data: any = await response.json();
    console.log("OpenRouter Response:", JSON.stringify(data).slice(0, 200));
    return data.choices?.[0]?.message?.content || "";
}

function cleanJson(text: string): string {
    if (!text) return "{}";
    return text.replace(/```json\n?|```/g, '').trim();
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', openRouterLinked: !!openRouterKey });
});

app.post('/api/chat', async (req, res) => {
    const { history, latestInput, userVariables } = req.body;

    console.log("Chat Request received:", { historyLen: history?.length, latestInput });
    const orchestratorPrompt = `
    You are the 'Clinical Orchestrator'. Analyze the explorer and return JSON ONLY.
    
    # OUTPUT FORMAT
    {
      "reply": "Empathetic mirror response...",
      "shouldOfferMeditation": boolean,
      "meditationData": {
        "focus": "The core theme",
        "feeling": "Desired state",
        "duration": 10,
        "methodology": "IFS" | "NSDR" | "SOMATIC_AGENCY" | "ACT" | "FUTURE_SELF" | "WOOP" | "NVC" | "IDENTITY" | "NARRATIVE"
      }
    }
  `;

    const conversation = history.map((h: ChatMessage) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.text
    }));

    const contextMsg = `UserContext: ${JSON.stringify(userVariables)}`;
    const messages = [
        { role: 'system', content: orchestratorPrompt },
        ...conversation,
        { role: 'user', content: `${contextMsg}\nExplore Input: ${latestInput}` }
    ];

    try {
        console.log("Sending to OpenRouter...");
        const text = await callOpenRouter(messages, OPENROUTER_MODEL, true);
        console.log("Raw OpenRouter Text:", text);
        res.json(JSON.parse(cleanJson(text || "{}")));
    } catch (error) {
        console.error("Chat error FULL DETAILS:", error);
        if (error instanceof Error) {
            console.error("Stack:", error.stack);
        }
        res.status(500).json({ reply: "I hear you. Tell me more.", shouldOfferMeditation: false });
    }
});

app.post('/api/director', async (req, res) => {
    const { input, triage, growthHistory } = req.body;

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

    try {
        const text = await callOpenRouter([{ role: "user", content: prompt }], DIRECTOR_MODEL, true);
        const parsed = JSON.parse(cleanJson(text || "{}"));
        res.json(parsed);
    } catch (error) {
        console.error("Director error:", error);
        // Fallback default
        res.json({
            methodology: "NSDR",
            focus: "Grounding",
            targetFeeling: "Calm",
            intensity: "MODERATE",
            rationale: "Fallback due to error"
        });
    }
});

app.post('/api/meditation/generate', async (req, res) => {
    const { focus, targetFeeling, durationMinutes, contextInsights, methodology, variables } = req.body;
    const protocol = CLINICAL_PROTOCOLS[methodology as MethodologyType] || CLINICAL_PROTOCOLS['NSDR'];
    if (!protocol) {
        return res.status(400).json({ error: "Invalid methodology and fallback failed." });
    }

    const generatorPrompt = `
    You are an expert Clinical Generator. Generate a meditation script following the ${protocol.name} protocol.

    ${protocol.systemInput}
    
    # CLINICAL CONTEXT
    Focus: "${focus}"
    Feeling: "${targetFeeling}"
    Variables: ${JSON.stringify(variables)}
    Insights: ${contextInsights?.join(', ')}
    
    # OUTPUT (JSON Screenplay)
    {
      "title": "Title",
      "script": [
        { "text": "...", "instructions": [{ "action": "FADE_VOL", "layer": "atmosphere", "targetValue": 0.6, "duration": 2 }] }
      ]
    }
  `;

    try {
        const textResponse = await callOpenRouter([
            { role: "system", content: generatorPrompt },
            { role: "user", content: "Generate session script." }
        ], OPENROUTER_MODEL, true);

        const parsed = JSON.parse(cleanJson(textResponse || "{}"));
        // ... (rest of the batching logic stays same)
        const scriptBlocks = parsed.script || [{ text: "Breathe...", instructions: [] }];
        const title = parsed.title || "Session";

        const batches: { text: string; instructions: SonicInstruction[] }[] = [];
        let currentBatchText = "";
        let currentBatchInstructions: SonicInstruction[] = [];
        const TARGET_BATCH_CHARS = 400;

        for (const block of scriptBlocks) {
            let cleaned = block.text.replace(/[\*\[\]#_`]/g, '').trim();
            if (!cleaned) continue;
            cleaned = cleaned.toLowerCase()
                .replace(/\./g, '... ')
                .replace(/,/g, '... ')
                .replace(/\?/g, '...')
                .replace(/!/g, '...');

            if (currentBatchText.length === 0 && block.instructions) {
                currentBatchInstructions = [...currentBatchInstructions, ...block.instructions];
            } else if (block.instructions) {
                currentBatchInstructions = [...currentBatchInstructions, ...block.instructions];
            }

            if ((currentBatchText.length + cleaned.length) < TARGET_BATCH_CHARS) {
                currentBatchText += cleaned + "\n\n";
            } else {
                batches.push({ text: currentBatchText, instructions: currentBatchInstructions });
                currentBatchText = cleaned + "\n\n";
                currentBatchInstructions = block.instructions || [];
            }
        }
        if (currentBatchText.length > 0) {
            batches.push({ text: currentBatchText, instructions: currentBatchInstructions });
        }

        res.json({ title, batches, lines: scriptBlocks.map((b: any) => b.text) });

    } catch (error) {
        console.error("Error generating meditation:", error);
        res.status(500).json({ error: "Failed to create meditation." });
    }
});

app.listen(port, () => {
    console.log(`Clinical Agent Server running at http://localhost:${port}`);
});
