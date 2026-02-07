# Check-In Script Configuration

This file controls the conversational check-in flow. Edit to iterate quickly.

## Opening Questions
- "How are you feeling right now?"
- "What's present for you in this moment?"

## Follow-up Triggers

### If user mentions stress/overwhelm keywords
Keywords: anxious, stressed, overwhelmed, racing, scattered, can't focus, too much
Follow-up: "Is it more in your body or in your thoughts right now?"

### If user mentions stuck/frozen keywords  
Keywords: stuck, frozen, numb, can't start, avoiding, procrastinating, blocked
Follow-up: "What's one thing you've been putting off?"

### If user mentions energy/push keywords
Keywords: energized, ready, need to push, challenge, motivated, pumped
Follow-up: "What do you want to channel this energy toward?"

### If user mentions tired/forcing keywords
Keywords: exhausted, tired, forcing, burnout, trying too hard, depleted
Follow-up: "When did you last truly rest?"

## Experience Mapping

| Detected State | Theme | Default Duration | Methodology |
|----------------|-------|------------------|-------------|
| Anxious, racing, scattered | SAFETY | 10 min | NSDR |
| Stuck, frozen, procrastinating | SPARK | 5 min | Somatic |
| Energized, need momentum | POWER | 15 min | Breathwork |
| Exhausted, burnout | FLOW | 10 min | NSDR |

## Confirmation Template
"Based on what you shared, I'd suggest a {duration}-minute {theme_label} session focused on {description}. Does that feel right?"

## Quick Adjustments
- "Make it shorter" → reduce by 5 min
- "Make it longer" → increase by 5 min
- "Something different" → show all 4 themes
