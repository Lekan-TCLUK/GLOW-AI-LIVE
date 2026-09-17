import { ai, db } from "hatchable";
import { VISION_SYSTEM_PROMPT } from "../lib/vision/prompt.js";
import { evaluatePhotoQuality } from "../lib/vision/quality.js";
import { validateObservationPayload } from "../lib/vision/schema.js";
import { validateVisionSafety } from "../lib/vision/safety.js";
import { processVisionObservations } from "../lib/vision/pipeline.js";
import { CALIBRATION_VERSION } from "../lib/vision/calibration.js";
import { ENGINE_VERSION } from "../lib/engine/scoring.js";
import { RANKING_ENGINE_VERSION } from "../lib/engine/ranking.js";
import { ARCHETYPE_ENGINE_VERSION } from "../lib/engine/archetypes.js";
import { overallBand } from "../lib/engine/status.js";

export const access="public";
export const methods=["POST","OPTIONS"];

function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type, Idempotency-Key");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");}
function cleanText(value,max=240){return String(value||"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max);}
const DIMS=["radiance","hydration_appearance","evenness","texture","under_eye_appearance","overall_vitality"];
const LEGACY={under_eye_appearance:"under_eye",overall_vitality:"vitality"};
function legacyAnalysis(engine,observations){const categories={};for(const d of DIMS){const k=LEGACY[d]||d;categories[k]={score:engine.scores[d],observations:Array.isArray(observations.dimensions[d]?.notes)?observations.dimensions[d].notes.slice(0,2).map(cleanText):[]};}const overall=Math.round(DIMS.reduce((s,d)=>s+engine.scores[d],0)/6);return {valid:true,categories,overall_score:overall,band:overallBand(overall),top3:engine.top3,archetype:engine.archetype,calibration_version:CALIBRATION_VERSION,scoring_version:ENGINE_VERSION,ranking_version:RANKING_ENGINE_VERSION,archetype_engine_version:ARCHETYPE_ENGINE_VERSION};}

export default async function(req,res){
 cors(res); if(req.method==="OPTIONS")return res.status(204).send("");
 const body=req.body||{}; const journeyId=String(body.journeyId||"").trim().toUpperCase(); const imageData=body.imageData; const idem=String(req.headers?.["idempotency-key"]||body.idempotencyKey||"").trim().slice(0,128);
 if(!journeyId||typeof imageData!=="string"||!imageData.startsWith("data:image/"))return res.status(400).json({error:"A valid Day-30 photo is required."});
 if(imageData.length>16*1024*1024)return res.status(413).json({error:"Image is too large. Please use a smaller photo."});
 const jq=await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1",[journeyId]); const j=jq.rows[0];
 if(!j)return res.status(404).json({error:"We couldn't find that Glow Journey."});
 if(j.payment_status!=="paid")return res.status(402).json({error:"Please complete your Personal Glow Plan first."});
 if(j.day30_completed)return res.status(409).json({error:"Your included Day-30 Glow Re-Check has already been used."});
 let initialId=j.initial_assessment_id; if(!initialId){const iq=await db.query("SELECT id FROM glow_assessments WHERE session_id = $1 AND assessment_type = 'INITIAL' AND assessment_status = 'VALID' ORDER BY created_at ASC LIMIT 1",[j.session_id]);initialId=iq.rows[0]?.id||null;}
 if(!initialId)return res.status(409).json({error:"Your Day-0 assessment could not be located. Please contact support."});
 const iq=await db.query("SELECT id,calibration_version,scoring_version,vision_version,quality_gate_version,safety_version,overall_score FROM glow_assessments WHERE id=$1 AND assessment_type='INITIAL' AND assessment_status='VALID' LIMIT 1",[initialId]); const initial=iq.rows[0];
 if(!initial)return res.status(409).json({error:"Your Day-0 assessment could not be verified. Please contact support."});
 if(initial.calibration_version!==CALIBRATION_VERSION)return res.status(409).json({error:"Your Day-30 Glow Re-Check requires the same calibration version as your Day-0 assessment. This journey needs support review before continuing."});
 try{
  const prompt=`${VISION_SYSTEM_PROMPT}\n\nFor this Day-30 image, return ONLY valid JSON in this exact shape: {"quality":{"status":"PASS|RETRY|REJECT","reason_codes":[]},"dimensions":{"radiance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"hydration_appearance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"evenness":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"texture":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"under_eye_appearance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"overall_vitality":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]}},"limitations":[]}. Observe visible appearance only. Do not score, rank, diagnose, recommend or infer sensitive/internal traits.`;
  const aiResult=await ai.generateText({model:"gpt",system:VISION_SYSTEM_PROMPT,messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:imageData}}]}],maxSteps:1,purpose:"glow-v1-day30-vision"});
  let observations;try{const text=String(aiResult.text||"").replace(/^```json\s*/i,"").replace(/\s*```$/i,"").trim();observations=JSON.parse(text);}catch{return res.status(502).json({error:"The visual assessment could not be read. Please try again."});}
  const quality=evaluatePhotoQuality(observations.quality||{});if(quality.status!=="PASS")return res.status(quality.status==="REJECT"?422:409).json({error:quality.status==="REJECT"?"Please upload a clear, front-facing photo.":"Please retake the photo in clearer, even lighting.",quality_status:quality.status,reason_codes:quality.reason_codes});
  const schema=validateObservationPayload(observations);if(!schema.valid)return res.status(502).json({error:"The visual assessment was incomplete. Please try again."});
  const safety=validateVisionSafety(observations);if(!safety.safe)return res.status(502).json({error:"The visual assessment could not be safely completed. Please try again."});
  const engine=processVisionObservations(observations);if(!engine.ok)return res.status(502).json({error:"The visual assessment could not be completed. Please try again."});
  const analysis=legacyAnalysis(engine,observations);const overall=analysis.overall_score;
  const assessment=await db.query("INSERT INTO glow_assessments (journey_id,session_id,assessment_type,assessment_status,assessment_version,vision_version,scoring_version,calibration_version,quality_gate_version,safety_version,photo_quality_status,photo_quality_reason_codes,assessment_confidence,global_limitations,safety_flags,overall_score,overall_band,archetype_code,archetype_match_score,archetype_second_match_score,archetype_gap,archetype_confidence,archetype_engine_version) VALUES ($1,$2,'DAY30','VALID','assessment-v1','vision-v1',$3,$4,'quality-gate-v1','safety-v1',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id",[j.id,j.session_id,ENGINE_VERSION,CALIBRATION_VERSION,quality.status,JSON.stringify(quality.reason_codes),engine.archetype.confidence==="HIGH"?"HIGH":"STANDARD",JSON.stringify((observations.limitations||[]).slice(0,8).map(cleanText)),JSON.stringify(safety.flags),overall,analysis.band,engine.archetype.archetype_code,engine.archetype.match_score,engine.archetype.second_match_score,engine.archetype.gap,engine.archetype.confidence,ARCHETYPE_ENGINE_VERSION]);
  const day30Id=assessment.rows[0]?.id;if(!day30Id)return res.status(500).json({error:"The Day-30 assessment could not be saved."});
  for(const d of DIMS)await db.query("INSERT INTO glow_dimension_scores (assessment_id,dimension,score,status,observations) VALUES ($1,$2,$3,$4,$5)",[day30Id,d,engine.scores[d],engine.dimensions[d].status,JSON.stringify(engine.dimensions[d].observation.notes||[])]);
  for(const p of engine.top3)await db.query("INSERT INTO glow_assessment_priorities (assessment_id,rank,dimension,score) VALUES ($1,$2,$3,$4)",[day30Id,p.rank,p.dimension,p.score]);
  const updated=await db.query("UPDATE glow_journeys SET initial_assessment_id=COALESCE(initial_assessment_id,$1),day30_assessment_id=$1,day30_completed=true,day30_score=$2,day30_analysis_json=$3,day30_completed_at=now(),journey_status='DAY30_COMPLETED',day30_entitlement='CONSUMED' WHERE journey_id=$4 AND day30_completed=false RETURNING journey_id",[initialId,overall,JSON.stringify(analysis),journeyId]);
  if(!updated.rows[0])return res.status(409).json({error:"Your included Day-30 Glow Re-Check has already been used."});
  return res.json({journeyId,initialScore:Number(initial.overall_score),day30Score:overall,day30Analysis:analysis,day30AssessmentId:day30Id,calibration_version:CALIBRATION_VERSION,scoring_version:ENGINE_VERSION,change:overall-Number(initial.overall_score)});
 }catch(e){console.error("Day30 V1 analysis error",e);return res.status(500).json({error:"We couldn't analyse that photo right now. Please try again."});}
}