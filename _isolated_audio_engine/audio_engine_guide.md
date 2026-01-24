# Standalone Audio Engine: Architecture Guide

This guide describes how to build the **Audio Generation Engine** as a completely separate microservice. This allows you to iterate on the "Brain" (Scripting) and "Voice" (TTS) without touching the main UI app.

## 1. The Interface (API)
The engine should be a "Black Box" API.
**Input:** User Intent & Profile
**Output:** Audio URL + Subtitles

```json
// POST /generate-session
{
  "user_profile": { "name": "Kristaps", "mood": "Anxious" },
  "intent": "Sleep visualization",
  "duration_seconds": 600,
  "config": { "voice_id": "fenrir_v2", "background_id": "rain_heavy" }
}

// RETURNS (Stream or JSON)
{
  "audio_url": "https://cdn.../session_123.mp3",
  "transcript": [ ...time-stamped-lines... ]
}
```

## 2. The Internal Pipeline
The independent engine consists of three distinct stages. You can optimize each stage independently.

### Stage A: The Scripting Agent (The Brain)
*   **Role**: Writes the meditation text.
*   **Tech**: LLM (Gemini 1.5, GPT-4o, or Claude).
*   **Optimization**:
    *   Use **Jinja2 Templates** for structure (Intro -> Body -> Outro).
    *   Strictly separate "Director Notes" (instructions) from "Spoken Text".

### Stage B: The Voice Synthesizer (The Throat)
*   **Role**: Turns text into speech.
*   **Current Tech**: ElevenLabs API.
*   **Target Tech (Cost Optimized)**: Self-Hosted **StyleTTS2** or **VITS**.
    *   Run on a GPU Server (RunPod / Modal / AWS).
    *   Input: Text + Speaker Embedding.
    *   Output: WAV Stream.

### Stage C: The Mixer (The Atmosphere)
*   **Role**: Combines Voice + Background Music + Binaural Beats.
*   **Tech**: **FFmpeg** (Server-side) or **Web Audio API** (Client-side).
    *   *Recommendation*: Keep this Client-side (in the App) for now to save bandwidth. The Engine should just deliver the **Voice Track**.

## 3. Development Workflow (Isolation)
To work on this separately:

1.  **Create a New Repo**: `insight-audio-engine`.
2.  **Tech Stack**: Python (FastAPI) is best for Audio/AI work.
3.  **Test Harness**: Create a simple `test.py` that sends a JSON payload and plays the resulting MP3.

## 4. Current vs. Future State

| Component | Current (Insight App) | Future (Standalone Engine) |
| :--- | :--- | :--- |
| **Logic** | `useMeditationGenerator.ts` (React Hook) | Python Service (FastAPI) |
| **Brain** | Gemini Prompt (in Edge Function) | Dedicated LangChain/LLM Agent |
| **Voice** | Gemini/ElevenLabs API Calls | Custom StyleTTS2 Inference Server |
| **State** | React State | Redis / Database Job Queue |

This folder `_isolated_audio_engine` contains the **Current Snapshot** of your logic for reference when building the new engine.
