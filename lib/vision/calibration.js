export const CALIBRATION_VERSION='calibration-v1';
export const CALIBRATION_STATUS='FROZEN_PRODUCTION_BASELINE';
export const LEVEL_TO_SCORE=Object.freeze({VERY_LOW:30,LOW:45,MODERATE:60,HIGH:75,VERY_HIGH:90});
export function calibrateObservation(level){const key=String(level||'').toUpperCase();if(!(key in LEVEL_TO_SCORE))throw new Error(`Unsupported observation level: ${level}`);return LEVEL_TO_SCORE[key]}
export function calibrateDimensions(dimensions){const out={};for(const [dimension,item] of Object.entries(dimensions||{}))out[dimension]=calibrateObservation(item.level);return out}
export function calibrationStatus(){return{version:CALIBRATION_VERSION,mapping:LEVEL_TO_SCORE,status:CALIBRATION_STATUS}}