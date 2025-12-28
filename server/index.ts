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

// Initialize Gemini
// Note: Using the same pattern as the frontend for consistency
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });
const TEXT_MODEL = "gemini-2.0-pro-exp-02-05";

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/chat', async (req, res) => {
    const { history, latestInput, userVariables } = req.body;

    const orchestratorPrompt = `
    You are the 'Clinical Orchestrator'. You are a deterministic state machine managing the Session Lifecycle.
    
    # ROLE
    Analyze User Input for valence/arousal and identify the appropriate clinical methodology.
    
    # METHODOLOGIES
    1. IFS: Internal conflict, distinct parts ("Part of me...").
    2. NSDR: High arousal, anxiety, exhaustion.
    3. SOMATIC_AGENCY: Freeze, numbness, collapse.
    4. ACT: Cognitive fusion, sticky thoughts.
    5. FUTURE_SELF: Disconnected from future consequences, procrastination.
    6. WOOP: Goal setting, motivation, wishful thinking.
    7. NVC: Interpersonal conflict, judgment, anger.
    8. IDENTITY: Low self-efficacy, forgetting strengths.
    9. NARRATIVE: Over-identification with a problem ("I am depressed").
    
    # OUTPUT FORMAT
    Return JSON ONLY.
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

    const conversation = history.map((h: ChatMessage) => `${h.role === 'user' ? 'User' : 'System'}: ${h.text}`).join('\n');
    const contextMsg = `UserContext: ${JSON.stringify(userVariables)}`;
    const prompt = `${conversation}\n${contextMsg}\nUser: ${latestInput}`;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: orchestratorPrompt,
                responseMimeType: "application/json",
            }
        });

        res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
        console.error("Chat error", error);
        res.status(500).json({ reply: "I hear you. Tell me more.", shouldOfferMeditation: false });
    }
});

app.post('/api/meditation/generate', async (req, res) => {
    const { focus, targetFeeling, durationMinutes, contextInsights, methodology, variables } = req.body;

    const protocol = CLINICAL_PROTOCOLS[methodology as MethodologyType] || CLINICAL_PROTOCOLS['NSDR'];

    const generatorPrompt = `
    You are an expert Clinical Generator specializing in Neuro-Symbolic Interventions.
    
    # MISSION
    Generate a meditation script following the ${protocol.name} protocol.

    ${protocol.systemInput}
    
    # CLINICAL CONTEXT
    Focus: "${focus}"
    Feeling: "${targetFeeling}"
    Variables: ${JSON.stringify(variables)}
    Insights: ${contextInsights?.join(', ')}
    
    # SONIC DIRECTION
    - Start 'resonance' at ${protocol.sonicCues.startFreq}Hz.
    - Drift 'resonance' to ${protocol.sonicCues.endFreq}Hz.
    - Atmos: Use '${protocol.sonicCues.atmosphere}'.
    - Use ellipses (...) for pauses.
    
    # OUTPUT
    Return a JSON Screenplay.
    {
      "title": "Title",
      "script": [
        { "text": "...", "instructions": [{ "action": "FADE_VOL", "layer": "atmosphere", "targetValue": 0.6, "duration": 2 }] }
      ]
    }
  `;

    try {
        const textResponse = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: "Generate session script." }] }],
            config: {
                systemInstruction: generatorPrompt,
                responseMimeType: "application/json"
            }
        });

        const parsed = JSON.parse(textResponse.text || "{}");
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
