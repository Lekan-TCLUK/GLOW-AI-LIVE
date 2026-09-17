import { calculateScorecard } from '../lib/engine/scoring.js';
import { dimensionStatus, overallBand } from '../lib/engine/status.js';
import { topThree } from '../lib/engine/ranking.js';
import { classifyArchetype } from '../lib/engine/archetypes.js';
import { buildSevenDayReset } from '../lib/engine/reset.js';
import { buildThirtyDayJourney } from '../lib/engine/journey.js';
import { buildPantry } from '../lib/engine/pantry.js';
import { calculateProgress } from '../lib/engine/progress.js';
import { buildMasterOutput } from '../lib/engine/master-output.js';

export const access = 'admin';

export default async function (req, res) {
  const results = [];
  const assert = (name, condition, detail='') => {
    if (!condition) throw new Error(`${name}: ${detail || 'failed'}`);
    results.push(name);
  };
  const s = { radiance:64, hydration_appearance:66, evenness:82, texture:78, under_eye_appearance:58, overall_vitality:67 };
  const sc = calculateScorecard(s);
  assert('overall mean', sc.overall_score === 69, `got ${sc.overall_score}`);
  assert('status boundaries', dimensionStatus(54)==='PRIORITY' && dimensionStatus(55)==='FOCUS' && dimensionStatus(65)==='DEVELOPING' && dimensionStatus(70)==='STRENGTH');
  assert('band boundaries', overallBand(85)==='Exceptional Glow' && overallBand(70)==='Strong Glow' && overallBand(55)==='Developing Glow' && overallBand(40)==='Glow Reset' && overallBand(39)==='Glow Reboot');
  const t = topThree(s);
  assert('top3 deterministic order', JSON.stringify(t.map(x=>x.dimension)) === JSON.stringify(['under_eye_appearance','radiance','hydration_appearance']), JSON.stringify(t));

  const tired = classifyArchetype(s);
  assert('tired archetype', tired.archetype_code === 'TIRED_LUMINARY', JSON.stringify(tired));
  const thirsty = classifyArchetype({radiance:62,hydration_appearance:58,evenness:80,texture:78,under_eye_appearance:66,overall_vitality:65});
  assert('thirsty archetype', thirsty.archetype_code === 'THIRSTY_CANVAS', JSON.stringify(thirsty));
  const mosaic = classifyArchetype({radiance:82,hydration_appearance:66,evenness:58,texture:65,under_eye_appearance:66,overall_vitality:78});
  assert('mosaic archetype', mosaic.archetype_code === 'RADIANT_MOSAIC', JSON.stringify(mosaic));

  const reset = buildSevenDayReset(t);
  assert('reset has 7 days', reset.days.length === 7);
  assert('reset max 2 actions', reset.days.every(d=>d.actions.length<=2));
  assert('reset uses Top3 only', reset.days.every(d=>d.actions.every(a=>t.some(p=>p.dimension===a.dimension))));
  assert('reset roles', JSON.stringify(reset.days.map(d=>d.role)) === JSON.stringify(['Immediate Win','Protection','Target','Lifestyle','Reinforce','Pantry','Reflect']));
  assert('reset protection action', reset.days[1].actions[0].action_id === 'RAD-004');

  const journey = buildThirtyDayJourney(t);
  assert('journey has 30 days', journey.days.length === 30);
  assert('journey phases', journey.days[0].phase==='RESET' && journey.days[7].phase==='BUILD' && journey.days[14].phase==='DEEPEN' && journey.days[21].phase==='INTEGRATE' && journey.days[29].phase==='RECHECK');
  assert('day30 is recheck trigger', journey.days[29].trigger==='DAY30_RECHECK' && journey.days[29].actions.length===0);
  assert('journey uses Top3 only', journey.days.slice(0,29).every(d=>d.actions.every(a=>t.some(p=>p.dimension===a.dimension))));

  const statuses = Object.fromEntries(Object.entries(s).map(([d,v])=>[d,dimensionStatus(v)]));
  const pantry = buildPantry(t, statuses);
  assert('pantry caps', pantry.look_for.length<=4 && pantry.use_with_purpose.length<=4 && pantry.pause.length<=3);
  assert('pantry Top3 controlled', !pantry.look_for.some(x=>x==='hyaluronic acid') || t.some(p=>p.dimension==='hydration_appearance'));

  const day30 = { radiance:68, hydration_appearance:70, evenness:82, texture:79, under_eye_appearance:61, overall_vitality:72 };
  const progress = calculateProgress(s, day30);
  assert('progress overall delta', progress.overall_delta===5, `got ${progress.overall_delta}`);
  assert('progress movement', progress.overall_movement==='VISIBLE_MOVEMENT');
  assert('progress dimension deltas', progress.dimension_deltas.under_eye_appearance===3 && progress.dimension_deltas.overall_vitality===5);
  assert('progress caveat', progress.caveat.includes('not a medical assessment'));

  const master = buildMasterOutput(s, {safe_observation:'visible appearance only'});
  assert('master output score', master.scorecard.overall_score===69);
  assert('master output band', master.scorecard.band==='Developing Glow');
  assert('master output Top3', master.priorities.length===3);
  assert('master output archetype', master.archetype.archetype_code==='TIRED_LUMINARY');
  assert('master output reset', master.reset.days.length===7);
  assert('master output journey', master.journey.days.length===30);
  assert('master output pantry', !!master.pantry);

  return res.json({ok:true, passed:results.length, tests:results, engine_qa:'GLOW-AUDIT-18'});
}