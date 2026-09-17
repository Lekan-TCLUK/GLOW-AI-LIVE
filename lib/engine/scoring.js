export const ENGINE_VERSION = 'GLOW-SCORING-V1.0';
export const DIMENSIONS = Object.freeze([
  'radiance',
  'hydration_appearance',
  'evenness',
  'texture',
  'under_eye_appearance',
  'overall_vitality'
]);

export function validateDimensionScores(scores) {
  if (!scores || typeof scores !== 'object') throw new Error('Dimension scores are required');
  for (const dimension of DIMENSIONS) {
    const value = Number(scores[dimension]);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new Error(`Invalid score for ${dimension}`);
    }
  }
  return true;
}

export function calculateOverallScore(scores) {
  validateDimensionScores(scores);
  return Math.round(DIMENSIONS.reduce((sum, d) => sum + scores[d], 0) / DIMENSIONS.length);
}

export function scoreDimensions(scores) {
  validateDimensionScores(scores);
  return Object.fromEntries(DIMENSIONS.map(d => [d, scores[d]]));
}

export function calculateScorecard(scores) {
  const normalized = scoreDimensions(scores);
  return {
    scores: normalized,
    overall_score: calculateOverallScore(normalized)
  };
}