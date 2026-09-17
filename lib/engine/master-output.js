import { calculateScorecard } from './scoring.js';
import { dimensionStatus, overallBand } from './status.js';
import { topThree } from './ranking.js';
import { classifyArchetype } from './archetypes.js';
import { buildSevenDayReset } from './reset.js';
import { buildThirtyDayJourney } from './journey.js';
import { buildPantry } from './pantry.js';

export const MASTER_OUTPUT_ENGINE_VERSION = 'GLOW-MASTER-V1.0';

export function buildMasterOutput(scores, observations = {}) {
  const scorecard = calculateScorecard(scores);
  const statuses = Object.fromEntries(Object.entries(scorecard.scores).map(([d,s]) => [d, dimensionStatus(s)]));
  const priorities = topThree(scorecard.scores);
  const archetype = classifyArchetype(scorecard.scores);
  const reset = buildSevenDayReset(priorities, archetype.archetype_code);
  const journey = buildThirtyDayJourney(priorities, archetype.archetype_code);
  const pantry = buildPantry(priorities, statuses, archetype.archetype_code);
  return {
    schema_version:'GLOW-MASTER-OUTPUT-V1',
    engine_version:MASTER_OUTPUT_ENGINE_VERSION,
    scorecard:{...scorecard, band:overallBand(scorecard.overall_score)},
    statuses,
    priorities,
    archetype,
    observations,
    reset,
    journey,
    pantry
  };
}