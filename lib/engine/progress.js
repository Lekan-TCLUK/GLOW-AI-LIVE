export const PROGRESS_ENGINE_VERSION = 'GLOW-PROGRESS-V1.0';

function movement(delta) {
  if (delta >= 5) return 'VISIBLE_MOVEMENT';
  if (delta >= 1) return 'POSITIVE_MOVEMENT';
  if (delta === 0) return 'STEADY';
  if (delta >= -4) return 'DOWNWARD_MOVEMENT';
  return 'SIGNIFICANT_MOVEMENT';
}

export function calculateProgress(day0, day30) {
  const dimensions = Object.keys(day0);
  if (dimensions.length !== 6 || dimensions.some(d => !(d in day30))) throw new Error('Progress requires the same six dimensions');
  const dimension_deltas = Object.fromEntries(dimensions.map(d => [d, day30[d] - day0[d]]));
  const entries = dimensions.map(d => ({dimension:d, delta:dimension_deltas[d]}));
  const largest_upward = [...entries].sort((a,b)=>b.delta-a.delta)[0];
  const largest_downward = [...entries].sort((a,b)=>a.delta-b.delta)[0];
  const most_stable = [...entries].sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta) || a.dimension.localeCompare(b.dimension))[0];
  const overall_day0 = Math.round(Object.values(day0).reduce((a,b)=>a+b,0)/6);
  const overall_day30 = Math.round(Object.values(day30).reduce((a,b)=>a+b,0)/6);
  const overall_delta = overall_day30 - overall_day0;
  return {
    engine_version:PROGRESS_ENGINE_VERSION,
    day0_overall_score:overall_day0,
    day30_overall_score:overall_day30,
    overall_delta,
    overall_movement:movement(overall_delta),
    dimension_deltas,
    largest_upward,
    largest_downward,
    most_stable,
    caveat:'Your Glow Progress reflects the difference between two visual assessments. Lighting, camera angle, expression, image quality and other conditions can influence scores. A score change is not a medical assessment and does not establish that any particular action caused the change.'
  };
}