export const PANTRY_ENGINE_VERSION = 'GLOW-PANTRY-V1.0';

const ITEMS = {
  'RAD-006': ['niacinamide','USE_WITH_PURPOSE'], 'RAD-004': ['SPF 30+','LOOK_FOR'],
  'HYD-007': ['hyaluronic acid','LOOK_FOR'], 'HYD-005': ['hydration layers','USE_WITH_PURPOSE'],
  'EVE-004': ['niacinamide','USE_WITH_PURPOSE'], 'EVE-005': ['vitamin C derivative','LOOK_FOR'],
  'TEX-004': ['suitable gentle exfoliating product','USE_WITH_PURPOSE'], 'UE-004': ['caffeine','LOOK_FOR'],
  'UE-008': ['consistent sleep window','USE_WITH_PURPOSE'], 'VIT-001': ['sleep window','USE_WITH_PURPOSE']
};

export function buildPantry(top3, statuses, archetypeCode = null) {
  const look = [], use = [], pause = [];
  for (const p of top3) {
    for (const action of Object.keys(ITEMS)) {
      const [item, section] = ITEMS[action];
      if (section === 'LOOK_FOR' && !look.includes(item) && look.length < 4) look.push(item);
      if (section === 'USE_WITH_PURPOSE' && !use.includes(item) && use.length < 4) use.push(item);
    }
  }
  const priorityCount = top3.filter(p => statuses[p.dimension] === 'PRIORITY').length;
  if (priorityCount > 0) pause.push('aggressive physical scrubs');
  if (priorityCount > 1) pause.push('introducing several new actives at once');
  return {
    engine_version:PANTRY_ENGINE_VERSION,
    archetype_modifier:archetypeCode,
    look_for:look.slice(0,4),
    use_with_purpose:use.slice(0,4),
    pause:pause.slice(0,3),
    optional_wellness_support:[]
  };
}