import { selectFourActions } from './actions.js';

export const JOURNEY_ENGINE_VERSION = 'GLOW-JOURNEY-V1.0';

function actionFor(top3, index) {
  const p = top3[index % 3];
  const actions = selectFourActions(p.dimension);
  return actions[index % actions.length];
}

export function buildThirtyDayJourney(top3, archetypeCode = null) {
  if (!Array.isArray(top3) || top3.length !== 3) throw new Error('Journey requires exactly three priorities');
  const days = [];
  for (let day=1; day<=30; day++) {
    let phase = day <= 7 ? 'RESET' : day <= 14 ? 'BUILD' : day <= 21 ? 'DEEPEN' : day <= 29 ? 'INTEGRATE' : 'RECHECK';
    let actions = [];
    if (day === 30) {
      days.push({day, phase, actions:[], trigger:'DAY30_RECHECK'});
      continue;
    }
    const offsets = day <= 7 ? [day-1] : day <= 14 ? [0,1] : day <= 21 ? [1,2] : [0,1];
    actions = offsets.map((_, i) => actionFor(top3, day + i - 1));
    const unique = [];
    for (const a of actions) if (!unique.some(x => x.action_id === a.action_id)) unique.push(a);
    days.push({
      day, phase,
      actions: unique.slice(0,2).map(a => ({action_id:a.action_id, dimension:a.dimension, role:'JOURNEY', selection_reason:'Top 3 journey sequencing', archetype_modifier:archetypeCode || null, safety_validated:true}))
    });
  }
  return { engine_version:JOURNEY_ENGINE_VERSION, active_behaviour_cap:3, days };
}