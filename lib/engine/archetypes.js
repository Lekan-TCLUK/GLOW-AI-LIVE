export const ARCHETYPE_ENGINE_VERSION = 'GLOW-ARCHETYPE-V1.0';

const SIGNALS = {
  low: [[0,39,100],[40,49,90],[50,54,75],[55,59,60],[60,64,40],[65,69,20],[70,100,0]],
  high: [[70,100,100],[65,69,85],[60,64,65],[55,59,40],[50,54,20],[0,49,0]],
  mid: [[62,68,100],[58,61,80],[69,72,80],[54,57,55],[73,76,55],[0,53,25],[77,100,25]]
};

function signalScore(value, type) {
  const n = Number(value);
  const row = SIGNALS[type].find(([min,max]) => n >= min && n <= max);
  if (!row) throw new Error(`No ${type} signal bucket for ${value}`);
  return row[2];
}

function weighted(pattern, scores) {
  return pattern.reduce((sum, item) => sum + signalScore(scores[item.dimension], item.signal) * item.weight, 0);
}

const ARCHETYPES = [
  {
    code: 'TIRED_LUMINARY',
    label: 'THE TIRED LUMINARY',
    badge: 'Balanced canvas, muted light',
    pattern: [
      {dimension:'under_eye_appearance',signal:'low',weight:.30},{dimension:'radiance',signal:'low',weight:.25},
      {dimension:'overall_vitality',signal:'mid',weight:.15},{dimension:'evenness',signal:'high',weight:.15},
      {dimension:'texture',signal:'high',weight:.10},{dimension:'hydration_appearance',signal:'mid',weight:.05}
    ],
    gate: s => s.under_eye_appearance <= 64 && (s.radiance <= 69 || s.overall_vitality <= 69) && (s.evenness >= 65 || s.texture >= 65)
  },
  {
    code: 'THIRSTY_CANVAS',
    label: 'THE THIRSTY CANVAS',
    badge: 'Even base, thirsty surface',
    pattern: [
      {dimension:'hydration_appearance',signal:'low',weight:.35},{dimension:'radiance',signal:'low',weight:.20},
      {dimension:'texture',signal:'high',weight:.15},{dimension:'evenness',signal:'high',weight:.15},
      {dimension:'overall_vitality',signal:'mid',weight:.10},{dimension:'under_eye_appearance',signal:'mid',weight:.05}
    ],
    gate: s => s.hydration_appearance <= 64 && (s.radiance <= 69 || s.texture >= 65 || s.evenness >= 65)
  },
  {
    code: 'RADIANT_MOSAIC',
    label: 'THE RADIANT MOSAIC',
    badge: 'Natural light, uneven canvas',
    pattern: [
      {dimension:'evenness',signal:'low',weight:.35},{dimension:'radiance',signal:'high',weight:.25},
      {dimension:'overall_vitality',signal:'high',weight:.20},{dimension:'texture',signal:'mid',weight:.10},
      {dimension:'under_eye_appearance',signal:'mid',weight:.05},{dimension:'hydration_appearance',signal:'mid',weight:.05}
    ],
    gate: s => s.evenness <= 64 && (s.radiance >= 65 || s.overall_vitality >= 65) && (s.radiance >= 70 || s.overall_vitality >= 70)
  }
];

export function archetypeMatch(scores, archetype) {
  if (!archetype.gate(scores)) return 0;
  return Math.round(weighted(archetype.pattern, scores) * 100) / 100;
}

export function classifyArchetype(scores) {
  const results = ARCHETYPES.map((a, index) => ({
    archetype: a,
    score: archetypeMatch(scores, a),
    index
  })).sort((a,b) => b.score - a.score || a.index - b.index);

  const best = results[0];
  const second = results[1] || {score:0};
  const gap = Math.round((best.score - second.score) * 100) / 100;

  let confidence = 'FALLBACK';
  if (best.score >= 80 && gap >= 12) confidence = 'HIGH';
  else if (best.score >= 65 && gap >= 7) confidence = 'STANDARD';

  const assigned = confidence === 'FALLBACK' ? null : best.archetype;
  return {
    archetype_code: assigned ? assigned.code : null,
    label: assigned ? assigned.label : 'YOUR UNIQUE GLOW™',
    badge: assigned ? assigned.badge : 'A glow pattern uniquely your own',
    match_score: Math.round(best.score * 100) / 100,
    second_match_score: Math.round(second.score * 100) / 100,
    gap,
    confidence,
    engine_version: ARCHETYPE_ENGINE_VERSION
  };
}