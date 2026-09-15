import { ai, db } from "hatchable";
export const access="public";
export const methods=["POST"];
function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");}
const keys=["radiance","hydration_appearance","evenness","texture","under_eye","vitality"];
function clamp(n){return Math.max(0,Math.min(100,Math.round(Number(n)||0)));}
function band(s){if(s>=85)return"Exceptional Glow";if(s>=70)return"Strong Glow";if(s>=55)return"Developing Glow";if(s>=40)return"Glow Reset";return"Glow Reboot";}
export default async function(req,res){
 cors(res); if(req.method==="OPTIONS")return res.status(204).send("");
 const {journeyId,imageData}=req.body||{}; if(!journeyId||typeof imageData!=="string"||!imageData.startsWith("data:image/"))return res.status(400).json({error:"A valid Day-30 photo is required."});
 const j=(await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1",[String(journeyId).trim().toUpperCase()])).rows[0];
 if(!j)return res.status(404).json({error:"We couldn't find that Glow Journey."}); if(j.payment_status!=="paid")return res.status(402).json({error:"Please complete your Personal Glow Plan first."}); if(j.day30_completed)return res.status(409).json({error:"Your included Day-30 Glow Re-Check has already been used."});
 const system=`You are GLOW AI, a beauty and wellness appearance assistant. Analyze ONLY visible, non-sensitive facial appearance characteristics. Do not diagnose medical conditions or infer age, race, ethnicity, gender, hormones, nutrition deficiencies, diseases or other sensitive traits. Do not claim to measure hydration, health, collagen, biological age or internal cellular status. Use visible/apparent wording. Return only valid JSON.`;
 const prompt=`Analyze this Day-30 selfie. If unsuitable (no clear face, extreme blur, face obstruction or no person), return {"valid":false,"reason":"..."}. Otherwise return exactly {"valid":true,"categories":{"radiance":{"score":0,"observations":[]},"hydration_appearance":{"score":0,"observations":[]},"evenness":{"score":0,"observations":[]},"texture":{"score":0,"observations":[]},"under_eye":{"score":0,"observations":[]},"vitality":{"score":0,"observations":[]}},"overall_summary":"..."}. Scores are visible appearance estimates only.`;
 try{
  const result=await ai.generateText({model:"gpt",system,messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:imageData}}]}],maxSteps:1,purpose:"glow-v02-day30"});
  const parsed=JSON.parse(result.text.replace(/^```json\s*/i,"").replace(/\s*```$/i,"").trim()); if(!parsed.valid)return res.status(422).json({error:parsed.reason||"Please upload a clearer front-facing photo."});
  for(const k of keys){if(!parsed.categories?.[k])return res.status(502).json({error:"Incomplete Day-30 analysis. Please try again."});parsed.categories[k].score=clamp(parsed.categories[k].score);parsed.categories[k].observations=Array.isArray(parsed.categories[k].observations)?parsed.categories[k].observations.slice(0,2).map(String):[];}
  const score=Math.round(keys.reduce((s,k)=>s+parsed.categories[k].score,0)/6); const resultData={...parsed,overall_score:score,band:band(score)};
  await db.query("UPDATE glow_journeys SET day30_completed=true, day30_score=$1, day30_analysis_json=$2, day30_completed_at=now() WHERE journey_id=$3",[score,JSON.stringify(resultData),String(journeyId).trim().toUpperCase()]);
  return res.json({journeyId:String(journeyId).trim().toUpperCase(),initialScore:j.initial_score,day30Score:score,day30Analysis:resultData,change:score-Number(j.initial_score)});
 }catch(e){console.error("Day30 analysis error",e);return res.status(500).json({error:"We couldn't analyse that photo right now. Please try again."});}
}