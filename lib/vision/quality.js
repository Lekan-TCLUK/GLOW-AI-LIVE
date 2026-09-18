export const QUALITY_GATE_VERSION='quality-gate-v2';
const RETRY_CODES=new Set(['TOO_DARK','OVEREXPOSED','BLUR','FACE_TOO_SMALL','EXTREME_ANGLE','HEAVY_OCCLUSION','EXPRESSION_UNSUITABLE','FACE_PARTIALLY_OUT_OF_FRAME']);
const REJECT_CODES=new Set(['FACE_NOT_DETECTED','MULTIPLE_FACES','INVALID_IMAGE','UNSUPPORTED_FORMAT','CORRUPT_IMAGE','FILTERED_IMAGE','NON_HUMAN_SUBJECT','SCREENSHOT_OR_COLLAGE','FACE_COUNT_UNCERTAIN']);
export function evaluatePhotoQuality(input={}){
  const codes=Array.isArray(input.reason_codes)?input.reason_codes.filter(Boolean):[];
  const explicit=String(input.status||'').toUpperCase();
  const derived=[...codes];
  const faceCount=input.face_count;
  if(typeof faceCount!=='number'||!Number.isInteger(faceCount)) derived.push('FACE_COUNT_UNCERTAIN');
  else if(faceCount===0) derived.push('FACE_NOT_DETECTED');
  else if(faceCount!==1) derived.push('MULTIPLE_FACES');
  const subject=String(input.subject_type||'').toUpperCase();
  if(subject&&subject!=='HUMAN_FACE') derived.push('NON_HUMAN_SUBJECT');
  if(input.is_screenshot_or_collage===true) derived.push('SCREENSHOT_OR_COLLAGE');
  const unique=[...new Set(derived)];
  if(explicit==='REJECT'||unique.some(c=>REJECT_CODES.has(c)))return{status:'REJECT',reason_codes:unique.length?unique:['INVALID_IMAGE'],version:QUALITY_GATE_VERSION};
  if(explicit==='RETRY'||unique.some(c=>RETRY_CODES.has(c)))return{status:'RETRY',reason_codes:unique,version:QUALITY_GATE_VERSION};
  return{status:'PASS',reason_codes:unique,version:QUALITY_GATE_VERSION};
}
export function qualityAllowsScoring(result){return result&&result.status==='PASS'}