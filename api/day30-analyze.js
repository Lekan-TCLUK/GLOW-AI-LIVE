import { ai, db } from "hatchable";
import { VISION_SYSTEM_PROMPT } from "../lib/vision/prompt.js";
import { evaluatePhotoQuality, QUALITY_GATE_VERSION } from "../lib/vision/quality.js";
import { validateObservationPayload } from "../lib/vision/schema.js";
import { validateVisionSafety } from "../lib/vision/safety.js";
import { processVisionObservations } from "../lib/vision/pipeline.js";
import { CALIBRATION_VERSION } from "../lib/vision/calibration.js";
import { ENGINE_VERSION } from "../lib/engine/scoring.js";
import { RANKING_ENGINE_VERSION } from "../lib/engine/ranking.js";
import { ARCHETYPE_ENGINE_VERSION } from "../lib/engine/archetypes.js";
import { GLOW_FLOW_VERSION } from "../lib/engine/flow.js";
import { recordDay30Outcome, saveProfile } from "../lib/glow16-intelligence.js";
import { overallBand } from "../lib/engine/status.js";

export const access="public";
export const methods=["POST","OPTIONS"];

function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type, Idempotency-Key");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");}
function cleanText(value,max=240){return String(value||"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max);}
const DIMS=["radiance","hydration_appearance","evenness","texture","under_eye_appearance","overall_vitality"];
const LEGACY={under_eye_appearance:"under_eye",overall_vitality:"vitality"};
function legacyAnalysis(engine,observations){const categories={};for(const d of DIMS){const k=LEGACY[d]||d;const engineNotes=engine.dimensions[d]?.observation?.notes;const sourceNotes=Array.isArray(engineNotes)&&engineNotes.length?engineNotes:observations.dimensions[d]?.notes;categories[k]={score:engine.scores[d],observations:Array.isArray(sourceNotes)?sourceNotes.slice(0,4).map(cleanText).filter(note=>note.length>=12).slice(0,2):[]};}const overall=Math.round(DIMS.reduce((s,d)=>s+engine.scores[d],0)/6);return {valid:true,categories,overall_score:overall,band:overallBand(overall),top3:engine.top3,archetype:engine.archetype,flow_version:GLOW_FLOW_VERSION,calibration_version:CALIBRATION_VERSION,scoring_version:ENGINE_VERSION,ranking_version:RANKING_ENGINE_VERSION,archetype_engine_version:ARCHETYPE_ENGINE_VERSION};}
function normalizeInitialCategories(rows){const out={};for(const row of rows||[]){const k=LEGACY[row.dimension]||row.dimension;let obs=row.observations;try{if(typeof obs==='string')obs=JSON.parse(obs);}catch(_){obs=[];}out[k]={score:Number(row.score),observations:Array.isArray(obs)?obs.map(cleanText).filter(x=>x.length>=12).slice(0,2):[]};}return out;}
function fallbackComparison(initialCats,currentCats){const dimensions={};for(const d of DIMS){const k=LEGACY[d]||d;const before=initialCats[k]||{};const now=currentCats[k]||{};const delta=Number(now.score||0)-Number(before.score||0);const beforeObs=Array.isArray(before.observations)?before.observations:[];const nowObs=Array.isArray(now.observations)?now.observations:[];const movement=delta>0?'up':delta<0?'down':'flat';let read=movement==='up'?'The score is higher than Day 0.':movement==='down'?'The score is lower than Day 0.':'The score is unchanged from Day 0.';if(beforeObs.length&&nowObs.length)read+=' Day 0: '+beforeObs[0]+' Today: '+nowObs[0];else if(beforeObs.length)read+=' At Day 0, GLOW observed: '+beforeObs[0];else if(nowObs.length)read+=' Today, GLOW observed: '+nowObs[0];dimensions[d]={movement,delta,summary:read,beforeObservations:beforeObs,todayObservations:nowObs};}return {version:'day30-comparison-v1',dimensions};}

export default async function(req,res){
 cors(res); if(req.method==="OPTIONS")return res.status(204).send("");
 const body=req.body||{}; const journeyId=String(body.journeyId||"").trim().toUpperCase(); const imageData=body.imageData;
 if(!journeyId||typeof imageData!=="string"||!imageData.startsWith("data:image/"))return res.status(400).json({error:"A valid Day-30 photo is required."});
 if(!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(imageData))return res.status(415).json({error:"Please upload a JPEG, PNG, WebP, or GIF image."});
 if(imageData.length>16*1024*1024)return res.status(413).json({error:"Image is too large. Please use a smaller photo."});
 const jq=await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1",[journeyId]); const j=jq.rows[0];
 if(!j)return res.status(404).json({error:"We couldn't find that Glow Journey."});
 if(j.payment_status!=="paid")return res.status(402).json({error:"Please complete your Personal Glow Plan first."});
 if(j.day30_completed)return res.status(409).json({error:"Your included Day-30 Glow Re-Check has already been used."});
 const language=["en","fr","es","pt","de","it"].includes(String(j.language||"").toLowerCase())?String(j.language).toLowerCase():"en";
 const languageInstruction=language==="fr"?"Write visible-only observation notes in French.":language==="es"?"Write visible-only observation notes in Spanish.":language==="pt"?"Write visible-only observation notes in European Portuguese.":language==="de"?"Write visible-only observation notes in German.":language==="it"?"Write visible-only observation notes in Italian.":"Write visible-only observation notes in English.";
 let initialId=j.initial_assessment_id; if(!initialId){const iq=await db.query("SELECT id FROM glow_assessments WHERE session_id = $1 AND assessment_type = 'INITIAL' AND assessment_status = 'VALID' ORDER BY created_at ASC LIMIT 1",[j.session_id]);initialId=iq.rows[0]?.id||null;}
 if(!initialId)return res.status(409).json({error:"Your Day-0 assessment could not be located. Please contact support."});
 const iq=await db.query("SELECT id,calibration_version,scoring_version,vision_version,quality_gate_version,safety_version,overall_score FROM glow_assessments WHERE id=$1 AND assessment_type='INITIAL' AND assessment_status='VALID' LIMIT 1",[initialId]); const initial=iq.rows[0];
 if(!initial)return res.status(409).json({error:"Your Day-0 assessment could not be verified. Please contact support."});
 if(initial.calibration_version!==CALIBRATION_VERSION)return res.status(409).json({error:"Your Day-30 Glow Re-Check requires the same calibration version as your Day-0 assessment. This journey needs support review before continuing."});
 const initialScoresQ=await db.query("SELECT dimension,score,observations FROM glow_dimension_scores WHERE assessment_id=$1 ORDER BY dimension",[initialId]);
 const initialCategories=normalizeInitialCategories(initialScoresQ.rows);
 const startingArchetype=j.initial_analysis_json?.archetype||null;
 try{
  const prompt=`${VISION_SYSTEM_PROMPT}\n\n${languageInstruction} Keep the JSON keys and enum values exactly as specified; only customer-facing notes should be localized.\n\nFor this Day-30 image, return ONLY valid JSON in this exact shape: {"quality":{"status":"PASS|RETRY|REJECT","reason_codes":[],"face_count":1,"subject_type":"HUMAN_FACE","is_screenshot_or_collage":false},"dimensions":{"radiance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"hydration_appearance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"evenness":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"texture":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"under_eye_appearance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"overall_vitality":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]}},"limitations":[]}. Observe visible appearance only. Do not score, rank, diagnose, recommend or infer sensitive/internal traits.`;
  const aiResult=await ai.generateText({model:"gpt",system:VISION_SYSTEM_PROMPT,messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:imageData}}]}],maxSteps:1,purpose:"glow-v1-day30-vision"});
  let observations;try{const text=String(aiResult.text||"").replace(/^\`\`\`json\s*/i,"").replace(/\s*\`\`\`$/i,"").trim();observations=JSON.parse(text);}catch{return res.status(502).json({error:"The visual assessment could not be read. Please try again."});}
  const quality=evaluatePhotoQuality(observations.quality||{});if(quality.status!=="PASS")return res.status(quality.status==="REJECT"?422:409).json({error:quality.status==="REJECT"?"Please upload a clear, front-facing photo.":"Please retake the photo in clearer, even lighting.",quality_status:quality.status,reason_codes:quality.reason_codes});
  const schema=validateObservationPayload(observations);if(!schema.valid)return res.status(502).json({error:"The visual assessment was incomplete. Please try again."});
  const safety=validateVisionSafety(observations);if(!safety.safe)return res.status(502).json({error:"The visual assessment could not be safely completed. Please try again."});
  const engine=processVisionObservations(observations);if(!engine.ok)return res.status(502).json({error:"The visual assessment could not be completed. Please try again."});
  const analysis=legacyAnalysis(engine,observations);const overall=analysis.overall_score;
  analysis.archetype=startingArchetype||analysis.archetype;
  const currentCategories=analysis.categories||{};
  let comparison=fallbackComparison(initialCategories,currentCategories);
  try{
    const comparisonPrompt='Act as a careful professional beauty progress reviewer. Compare Day 0 and Day 30 for the same six visible appearance dimensions. Use ONLY the supplied scores and observation notes. Do not diagnose, infer causes, claim a product caused a result, or invent changes that are not supported. For each dimension, decide one of: improved, less_visible, unchanged, mixed, unclear. Then write one concise customer-facing comparison sentence that connects the Day-0 observation to the Day-30 observation. If the notes do not support a direct comparison, say so. Return ONLY JSON with a dimensions object containing all six dimension keys and movement plus summary for each. DAY 0: '+JSON.stringify(initialCategories)+' DAY 30: '+JSON.stringify(currentCategories);
    const comparisonResult=await ai.generateText({model:'gpt',system:'You are GLOW AI evidence-grounded beauty progress comparison engine. Visible appearance only. No diagnosis, causation, treatment claims or invented facts.',messages:[{role:'user',content:comparisonPrompt}],maxSteps:1,purpose:'glow-v1-day30-comparison'});
    const comparisonText=String(comparisonResult.text||'').replace(/^\\`\\`\\`json\\s*/i,'').replace(/\\s*\\`\\`\\`$/i,'').trim();
    const parsed=JSON.parse(comparisonText);
    if(parsed&&parsed.dimensions){for(const d of DIMS){const item=parsed.dimensions[d];if(item&&item.movement&&typeof item.summary==='string'){comparison.dimensions[d]={...comparison.dimensions[d],movement:String(item.movement),summary:cleanText(item.summary,420)};}}}
  }catch(_){ }
  analysis.comparison=comparison;
  const assessment=await db.query("INSERT INTO glow_assessments (journey_id,session_id,assessment_type,assessment_status,assessment_version,vision_version,scoring_version,calibration_version,quality_gate_version,safety_version,photo_quality_status,photo_quality_reason_codes,assessment_confidence,global_limitations,safety_flags,overall_score,overall_band,archetype_code,archetype_match_score,archetype_second_match_score,archetype_gap,archetype_confidence,archetype_engine_version) VALUES ($1,$2,'DAY30','VALID','assessment-v1','vision-v2',$3,$4,'quality-gate-v2','safety-v1',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id",[j.id,j.session_id,ENGINE_VERSION,CALIBRATION_VERSION,quality.status,JSON.stringify(quality.reason_codes),engine.archetype.confidence==="HIGH"?"HIGH":"STANDARD",JSON.stringify((observations.limitations||[]).slice(0,8).map(cleanText)),JSON.stringify(safety.flags),overall,analysis.band,engine.archetype.archetype_code,engine.archetype.match_score,engine.archetype.second_match_score,engine.archetype.gap,engine.archetype.confidence,ARCHETYPE_ENGINE_VERSION]);
  const day30Id=assessment.rows[0]?.id;if(!day30Id)return res.status(500).json({error:"The Day-30 assessment could not be saved."});
  for(const d of DIMS)await db.query("INSERT INTO glow_dimension_scores (assessment_id,dimension,score,status,observations) VALUES ($1,$2,$3,$4,$5)",[day30Id,d,engine.scores[d],engine.dimensions[d].status,JSON.stringify(engine.dimensions[d].observation.notes||[])]);
  for(const p of engine.top3)await db.query("INSERT INTO glow_assessment_priorities (assessment_id,rank,dimension,score) VALUES ($1,$2,$3,$4)",[day30Id,p.rank,p.dimension,p.score]);
  const updated=await db.query("UPDATE glow_journeys SET initial_assessment_id=COALESCE(initial_assessment_id,$1),day30_assessment_id=$2,day30_completed=true,day30_score=$3,day30_analysis_json=$4,day30_completed_at=now(),journey_status='DAY30_COMPLETED',day30_entitlement_status='CONSUMED' WHERE journey_id=$5 AND day30_completed=false RETURNING journey_id",[initialId,day30Id,overall,JSON.stringify(analysis),journeyId]);
  if(!updated.rows[0])return res.status(409).json({error:"Your included Day-30 Glow Re-Check has already been used."});
  const routineQ=await db.query("SELECT COUNT(*)::int AS planned, COUNT(*) FILTER (WHERE completion_status='COMPLETED')::int AS completed, COUNT(*) FILTER (WHERE completion_status='SKIPPED')::int AS skipped FROM glow_journey_actions WHERE journey_id=$1 AND day BETWEEN 1 AND 29",[j.id]);
  const routineProgressRaw=routineQ.rows[0]||{planned:0,completed:0,skipped:0};
  const routineProgress={tracked:Number(routineProgressRaw.completed||0)>0||Number(routineProgressRaw.skipped||0)>0,source:'explicit_completion_log',planned:Number(routineProgressRaw.planned||0),completed:Number(routineProgressRaw.completed||0),skipped:Number(routineProgressRaw.skipped||0)};
  const outcome=await recordDay30Outcome(journeyId,initialId,day30Id,Number(initial.overall_score),overall);
  await saveProfile(journeyId);
  return res.json({journeyId,initialScore:Number(initial.overall_score),initialAnalysis:{...((j.initial_analysis_json&&typeof j.initial_analysis_json==='object')?j.initial_analysis_json:{}),categories:initialCategories,archetype:startingArchetype},day30Score:overall,day30Analysis:analysis,day30AssessmentId:day30Id,flow_version:GLOW_FLOW_VERSION,calibration_version:CALIBRATION_VERSION,scoring_version:ENGINE_VERSION,change:overall-Number(initial.overall_score),routineProgress:{planned:Number(routineProgress.planned||0),completed:Number(routineProgress.completed||0),skipped:Number(routineProgress.skipped||0),tracked:routineProgress.tracked},intelligenceOutcome:outcome});
 }catch(e){console.error("Day30 V1 analysis error",e);return res.status(500).json({error:"We couldn't analyse that photo right now. Please try again."});}
}