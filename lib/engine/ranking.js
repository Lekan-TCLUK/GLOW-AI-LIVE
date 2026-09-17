import { DIMENSIONS } from './scoring.js';

export const RANKING_ENGINE_VERSION = 'GLOW-RANKING-V1.0';

// Deterministic tie-break order is the canonical DIMENSIONS order.
export function rankDimensions(scores) {
  return [...DIMENSIONS]
    .map((dimension, index) => ({ dimension, score: scores[dimension], index }))
    .sort((a, b) => a.score - b.score || a.index - b.index);
}

export function topThree(scores) {
  return rankDimensions(scores).slice(0, 3).map((item, i) => ({
    rank: i + 1,
    dimension: item.dimension,
    score: item.score
  }));
}