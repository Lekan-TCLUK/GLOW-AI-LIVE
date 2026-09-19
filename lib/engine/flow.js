import { calculateScorecard } from './scoring.js';
import { dimensionStatus, overallBand } from './status.js';
import { topThree } from './ranking.js';
import { classifyArchetype } from './archetypes.js';
import { buildSevenDayReset } from './reset.js';
import { buildThirtyDayJourney } from './journey.js';
import { buildPantry } from './pantry.js';

export const GLOW_FLOW_VERSION = 'GLOW-FLOW-V1.0';

export const FLOW_STAGES = Object.freeze([
  'PHOTO_QUALITY',
  'VISION_OBSERVATION',
  'SAFETY_VALIDATION',
  'CALIBRATION',
  'SCORING',
  'STATUS',
  'PRIORITIES',
  'ARCHETYPE',
  'FREE_SNAPSHOT',
  'PAID_PLAN',
  'DAY30_RECHECK'
]);

export const ENTITLEMENTS = Object.freeze({
  FREE: 'FREE',
  PAID: 'PAID',
  DAY30: 'DAY30'
});

const FREE_KEYS = Object.freeze([
  'scorecard',
  'statuses',
  'priorities',
  'archetype',
  'observations'
]);

const PAID_KEYS = Object.freeze([
  ...FREE_KEYS,
  'reset',
  'journey',
  'pantry'
]);

export function assertFlowVersion(version) {
  if (version !== GLOW_FLOW_VERSION) {
    throw new Error(`Unsupported GLOW AI engine flow version: ${version}`);
  }
  return true;
}

export function buildCanonicalFlow(scores, observations = {}) {
  const scorecard = calculateScorecard(scores);
  const statuses = Object.fromEntries(
    Object.entries(scorecard.scores).map(([dimension, score]) => [
      dimension,
      dimensionStatus(score)
    ])
  );
  const priorities = topThree(scorecard.scores);
  const archetype = classifyArchetype(scorecard.scores);

  const free = {
    scorecard: {
      ...scorecard,
      band: overallBand(scorecard.overall_score)
    },
    statuses,
    priorities,
    archetype,
    observations
  };

  const paid = {
    ...free,
    reset: buildSevenDayReset(priorities, archetype.archetype_code),
    journey: buildThirtyDayJourney(priorities, archetype.archetype_code),
    pantry: buildPantry(priorities, statuses, archetype.archetype_code)
  };

  return {
    flow_version: GLOW_FLOW_VERSION,
    stages: FLOW_STAGES,
    free,
    paid
  };
}

export function customerOutput(flow, entitlement = ENTITLEMENTS.FREE) {
  if (!flow || flow.flow_version !== GLOW_FLOW_VERSION) {
    throw new Error('Invalid or stale GLOW AI flow output');
  }

  if (entitlement === ENTITLEMENTS.FREE) {
    return {
      flow_version: GLOW_FLOW_VERSION,
      entitlement,
      ...pick(flow.free, FREE_KEYS)
    };
  }

  if (entitlement === ENTITLEMENTS.PAID) {
    return {
      flow_version: GLOW_FLOW_VERSION,
      entitlement,
      ...pick(flow.paid, PAID_KEYS)
    };
  }

  if (entitlement === ENTITLEMENTS.DAY30) {
    return {
      flow_version: GLOW_FLOW_VERSION,
      entitlement,
      ...pick(flow.free, FREE_KEYS)
    };
  }

  throw new Error(`Unknown GLOW AI entitlement: ${entitlement}`);
}

function pick(source, keys) {
  return Object.fromEntries(keys.map(key => [key, source[key]]));
}

export function flowContract() {
  return {
    version: GLOW_FLOW_VERSION,
    stages: [...FLOW_STAGES],
    entitlements: {
      FREE: [...FREE_KEYS],
      PAID: [...PAID_KEYS],
      DAY30: [...FREE_KEYS]
    }
  };
}