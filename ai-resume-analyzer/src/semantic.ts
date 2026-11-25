export type SemanticInput = { bullets: string[]; requirements: string[] }
export type Match = { requirement: string; excerpt: string }
export type SemanticMessage = { status: 'done'; matches: Match[] } | { status: 'error' }
