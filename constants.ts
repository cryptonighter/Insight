export const PREBUILT_PATTERNS = [
  {
    id: 'p1',
    title: 'Energy Cycles',
    description: 'You\'ve noticed your energy drops significantly in afternoons, especially after meetings.',
    observationCount: 6,
    lastObserved: Date.now() - 86400000 * 2,
    insights: [],
    color: '#fbbf24' // Amber
  },
  {
    id: 'p2',
    title: 'Creative Resistance',
    description: 'When you have time for creative projects, you find yourself avoiding starting.',
    observationCount: 4,
    lastObserved: Date.now() - 86400000 * 5,
    insights: [],
    color: '#2dd4bf' // Teal
  }
];

export const MOCK_INSIGHTS = [
  { id: 'i1', text: "Felt drained after three back-to-back meetings today.", timestamp: Date.now() - 86400000, type: 'text' as const },
  { id: 'i2', text: "Had great energy this morning working on the project.", timestamp: Date.now() - 86400000 * 3, type: 'voice' as const },
  { id: 'i3', text: "By 3pm I'm exhausted and can't focus.", timestamp: Date.now() - 86400000 * 5, type: 'text' as const },
];