import { buildCanonicalFlow, customerOutput, ENTITLEMENTS, GLOW_FLOW_VERSION } from './flow.js';

export const MASTER_OUTPUT_ENGINE_VERSION = 'GLOW-MASTER-V2.0';

export function buildMasterOutput(scores, observations = {}) {
  const flow = buildCanonicalFlow(scores, observations);
  const paid = customerOutput(flow, ENTITLEMENTS.PAID);
  return {
    schema_version:'GLOW-MASTER-OUTPUT-V2',
    engine_version:MASTER_OUTPUT_ENGINE_VERSION,
    flow_version:GLOW_FLOW_VERSION,
    ...paid
  };
}

export function buildFreeOutput(scores, observations = {}) {
  const flow = buildCanonicalFlow(scores, observations);
  const free = customerOutput(flow, ENTITLEMENTS.FREE);
  return {
    schema_version:'GLOW-FREE-OUTPUT-V1',
    flow_version:GLOW_FLOW_VERSION,
    ...free
  };
}