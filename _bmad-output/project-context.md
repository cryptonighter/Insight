---
project_name: Insight
user_name: Kristaps
date: 2026-02-06
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
existing_patterns_found: 14
---

# Project Context for AI Agents

_Critical rules and patterns for implementing code in the Insight AI meditation app. Focus on unobvious details._

---

## Technology Stack & Versions

| Technology | Version | Notes |
|------------|---------|-------|
| React | 19.2.0 | Latest with new hooks |
| Vite | 6.2.0 | Dev server on :3000 |
| TypeScript | 5.8.2 | ES2022 target, bundler resolution |
| Tailwind CSS | 4.1.18 | v4 syntax (different from v3) |
| Supabase | 2.89.0 | Auth + Edge Functions + DB |
| Google GenAI | 1.30.0 | TTS + Text generation |
| Framer Motion | 12.23.26 | Animations |

### Runtime Environments
- **Client**: Browser (Vite dev server)
- **Server Proxy**: Express on :3001 (`/api` routes)
- **Edge Functions**: Deno runtime (Supabase)

---

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- **Path alias**: Use `@/*` for imports (maps to project root)
- **Target**: ES2022 - use modern syntax (optional chaining, nullish coalescing)
- **No emit**: TypeScript is for type checking only, Vite handles bundling
- **Async patterns**: Always use `async/await`, not raw Promises
- **Error handling**: Wrap API calls in try/catch, log with emoji prefixes (`🎤`, `📦`, etc.)

### Framework-Specific Rules (React)

- **Component naming**: PascalCase files (`UnifiedExperience.tsx`)
- **Hooks naming**: `use*` prefix in `/services/` (`useMeditationGenerator.ts`)
- **State management**: React Context + custom hooks (no Redux)
- **Context file**: `/context/AppContext.tsx` is the global state hub
- **Props**: Destructure in function signature, not in body

### Service Architecture

```
services/
├── geminiService.ts      # AI API calls (singleton exports)
├── audioService.ts       # Audio playback (class singleton)
├── supabaseClient.ts     # DB client (singleton)
├── use*.ts               # Custom hooks (state + logic)
└── *Service.ts           # Stateless utilities
```

**Pattern**: Services are singletons exported at module level. Hooks use `useState`/`useEffect` internally.

### Audio Pipeline (Critical)

1. **TTS Models**: 
   - `gemini-2.5-flash-lite-preview-tts` (faster, used first 3 retries)
   - `gemini-2.5-flash-preview-tts` (fallback)
2. **Retry pattern**: 5 attempts with exponential backoff
3. **Timeout**: 30s per TTS request
4. **Playback**: `AudioService` singleton with Web Audio API
5. **Streaming**: Audio chunks are base64, decode with `atob()` + `Uint8Array`

### Supabase Edge Functions

- **Location**: `/supabase/functions/`
- **Runtime**: Deno (NOT Node.js)
- **Imports**: Use `https://` URLs or Deno std library
- **Env vars**: Access via `Deno.env.get('VAR_NAME')`
- **CORS**: Must return proper headers for browser calls

```typescript
// Edge function pattern
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // ... logic
});
```

### Environment Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | `.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Supabase anon key |
| `VITE_GOOGLE_API_KEY` | `.env` | Google AI API key |
| `GOOGLE_API_KEY` | Edge function | Same key for Deno |

**Rule**: Client vars need `VITE_` prefix. Edge functions use raw names.

---

## Critical Don't-Miss Rules

### Anti-Patterns to AVOID

❌ **Never hardcode API keys** - Always use env vars  
❌ **Never use `console.log` without context** - Use emoji prefixes  
❌ **Never block UI on TTS** - Use streaming/progressive loading  
❌ **Never ignore TTS failures** - Always have retry + fallback  
❌ **Never use Node.js APIs in Edge Functions** - They run Deno  

### Edge Cases Agents Must Handle

- **TTS timeouts**: Model can hang for 30s+, must abort and retry
- **Audio context**: Browser may block autoplay - need user gesture
- **Auth state**: Passkey auth needs explicit `persistSession: true`
- **Batch splitting**: AI may return 1 batch instead of many - split client-side

### Security Rules

- Store all secrets in `.env` (gitignored)
- Supabase RLS policies protect data
- Edge functions validate auth tokens
- Never expose API keys in client bundle

---

## File Organization

```
Insight/
├── App.tsx                 # Router entry
├── components/             # React components (PascalCase)
│   ├── UnifiedExperience.tsx
│   └── v2/                 # Version 2 components
├── context/
│   └── AppContext.tsx      # Global state
├── services/               # Business logic
├── supabase/
│   └── functions/          # Edge functions (Deno)
├── types.ts                # TypeScript interfaces
└── _bmad/                  # BMad Method artifacts
```

---

## Quick Reference for AI Agents

When implementing features in Insight:

1. **Check types.ts** for existing interfaces
2. **Check AppContext.tsx** for global state shape
3. **Check geminiService.ts** for AI API patterns
4. **Check audioService.ts** for audio playback patterns
5. **Use existing hooks** before creating new ones
6. **Follow retry patterns** for any external API calls
