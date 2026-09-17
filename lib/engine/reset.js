import { selectFourActions } from './actions.js';

export const RESET_ENGINE_VERSION = 'GLOW-RESET-V1.0';
const ROLES = ['Immediate Win','Protection','Target','Lifestyle','Reinforce','Pantry','Reflect'];

export function buildSevenDayReset(top3, archetypeCode = null) {
  if (!Array.isArray(top3) || top3.length !== 3) throw new Error('Reset requires exactly three priorities');
  const selected = top3.map(p => ({...p, actions: selectFourActions(p.dimension)}));
  const pick = (p, roleIndex, offset=0) => p.actions[(roleIndex + offset) % p.actions.length];
  const days = [];
  for (let day=1; day<=7; day++) {
    const role = ROLES[day-1];
    const p = selected[(day-1) % 3];
    const action = pick(p, day-1);
    const second = day === 5 ? pick(selected[(day) % 3], 1) : null;
    days.push({
      day,
      role,
      phase:'RESET',
      actions: [action, ...(second && second.action_id !== action.action_id ? [second] : [])].map(a => ({
        action_id:a.action_id, dimension:a.dimension, role, selection_reason:a.selection_reason,
        archetype_modifier:archetypeCode || null, safety_validated:true
      }))
    });
  }
  return { engine_version: RESET_ENGINE_VERSION, top3: top3.map(x=>x.dimension), days };
}