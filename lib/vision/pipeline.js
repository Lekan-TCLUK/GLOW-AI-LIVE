import { validateObservationPayload, DIMENSIONS } from './schema.js';
import { validateVisionSafety } from './safety.js';
import { calibrateDimensions, CALIBRATION_VERSION } from './calibration.js';
import { buildCanonicalFlow, GLOW_FLOW_VERSION } from '../engine/flow.js';

export function processVisionObservations(payload){
  const schema=validateObservationPayload(payload);
  if(!schema.valid)return{ok:false,error:'OBSERVATION_VALIDATION_FAILED',errors:schema.errors};

  const safety=validateVisionSafety(payload);
  if(!safety.safe)return{ok:false,error:'VISION_SAFETY_FAILED',safety_flags:safety.flags};

  const calibrated=calibrateDimensions(payload.dimensions);
  const flow=buildCanonicalFlow(calibrated, payload.dimensions);

  const canonical=flow.free;
  const dimensions=Object.fromEntries(
    DIMENSIONS.map(d=>[
      d,
      {
        score:canonical.scorecard.scores[d],
        status:canonical.statuses[d],
        observation:payload.dimensions[d]
      }
    ])
  );

  return{
    ok:true,
    flow_version:GLOW_FLOW_VERSION,
    calibration_version:CALIBRATION_VERSION,
    dimensions,
    scores:canonical.scorecard.scores,
    top3:canonical.priorities,
    archetype:canonical.archetype,
    freeOutput:flow.free,
    paidOutput:flow.paid
  };
}