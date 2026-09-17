import { validateObservationPayload, DIMENSIONS } from './schema.js';
import { validateVisionSafety } from './safety.js';
import { calibrateDimensions, CALIBRATION_VERSION } from './calibration.js';
import { scoreDimensions } from '../engine/scoring.js';
import { topThree } from '../engine/ranking.js';
import { dimensionStatus } from '../engine/status.js';
import { classifyArchetype } from '../engine/archetypes.js';
export function processVisionObservations(payload){const schema=validateObservationPayload(payload);if(!schema.valid)return{ok:false,error:'OBSERVATION_VALIDATION_FAILED',errors:schema.errors};const safety=validateVisionSafety(payload);if(!safety.safe)return{ok:false,error:'VISION_SAFETY_FAILED',safety_flags:safety.flags};const calibrated=calibrateDimensions(payload.dimensions);const scores=scoreDimensions(calibrated);const dimensions=Object.fromEntries(DIMENSIONS.map(d=>[d,{score:scores[d],status:dimensionStatus(scores[d]),observation:payload.dimensions[d]}]));const top3=topThree(scores);const archetype=classifyArchetype(scores);return{ok:true,calibration_version:CALIBRATION_VERSION,dimensions,scores,top3,archetype}}