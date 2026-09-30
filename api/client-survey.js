import { db } from "hatchable";
import { incrementDailyMetric } from "../lib/glow16-intelligence.js";
import { recordFunnelEvent } from "../lib/funnel-events.js";

export const access="public";
export const methods=["POST","OPTIONS"];

const GOALS=[
  "overall_appearance",
  "hydration_radiance",
  "uneven_tone",
  "skin_texture",
  "under_eye",
  "better_routine",
  "curious"
];
const AGES=["under_25","25_34","35_44","45_54","55_64","65_plus"];
const CONCERNS=[
  "radiance_dullness",
  "hydration_appearance",
  "uneven_skin_tone",
  "texture",
  "under_eye_appearance",
  "overall_vitality",
  "fine_lines_visible_ageing",
  "not_sure"
];
const ROUTINES=["none","few_products","morning_only","morning_evening","detailed"];
const CONFIDENCE=["new_to_skincare","know_the_basics","know_what_works","skincare_enthusiast"];

function text(v,max=180){
  return String(v??"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max);
}
function valid(v,list){return list.includes(String(v||""));}
function cleanArray(v,list,max=4){
  if(!Array.isArray(v))return [];
  return [...new Set(v.map(x=>String(x||"")).filter(x=>list.includes(x)))].slice(0,max);
}
function cors(res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
}

export default async function(req,res){
  cors(res);
  if(req.method==="OPTIONS")return res.status(204).send("");
  const b=req.body||{};
  const surveyId=text(b.surveyId,80);
  const sessionId=text(b.sessionId,120);
  const language=text(b.language,8)||"en";
  const locale=text(b.locale,24)||"en-GB";
  const primaryGoal=text(b.primaryGoal,60);
  const ageRange=text(b.ageRange,40);
  const concerns=cleanArray(b.concerns,CONCERNS);
  const routineLevel=text(b.routineLevel,50);
  const skincareConfidence=text(b.skincareConfidence,50);

  if(!surveyId)return res.status(400).json({error:"Survey ID is required."});
  if(!valid(primaryGoal,GOALS)||!valid(ageRange,AGES)||!valid(routineLevel,ROUTINES)||!valid(skincareConfidence,CONFIDENCE)){
    return res.status(400).json({error:"Please complete all survey questions before continuing."});
  }
  if(!concerns.length)return res.status(400).json({error:"Please select at least one area you would like to improve."});

  const acquisitionSource=text(b.acquisitionSource,80)||null;
  const referrer=text(b.referrer,500)||null;
  const utmSource=text(b.utmSource,120)||null;
  const utmMedium=text(b.utmMedium,120)||null;
  const utmCampaign=text(b.utmCampaign,180)||null;
  const utmContent=text(b.utmContent,180)||null;
  const utmTerm=text(b.utmTerm,180)||null;
  const rewardfulReferral=text(b.rewardfulReferral,120)||null;

  try{
    const existing=await db.query("SELECT survey_id FROM client_survey_responses WHERE survey_id=$1 LIMIT 1",[surveyId]);
    if(existing.rows[0])return res.json({ok:true,surveyId,created:false});

    await db.query(
      "INSERT INTO client_survey_responses (survey_id,session_id,language,locale,primary_goal,age_range,concerns,routine_level,skincare_confidence,acquisition_source,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,rewardful_referral) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)",
      [surveyId,sessionId||null,language,locale,primaryGoal,ageRange,JSON.stringify(concerns),routineLevel,skincareConfidence,acquisitionSource,referrer,utmSource,utmMedium,utmCampaign,utmContent,utmTerm,rewardfulReferral]
    );
    if(sessionId){
      await db.query("UPDATE client_survey_responses csr SET journey_id=gj.journey_id FROM glow_journeys gj WHERE csr.survey_id=$1 AND gj.session_id=$2",[surveyId,sessionId]);
    }
    await incrementDailyMetric("survey_completed");
    if(sessionId){
      const linked=(await db.query("SELECT journey_id FROM client_survey_responses WHERE survey_id=$1 LIMIT 1",[surveyId])).rows[0]?.journey_id;
      if(linked)await incrementDailyMetric("survey_to_journey");
    }
    return res.json({ok:true,surveyId,created:true});
  }catch(error){
    console.error("Client survey save failed",error);
    return res.status(500).json({error:"Survey analytics could not be saved."});
  }
}