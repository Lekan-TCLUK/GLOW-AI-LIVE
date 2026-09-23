import { ai, db } from "hatchable";

export const access = "public";
export const methods = ["POST","OPTIONS"];

const LANGS = {en:"English",fr:"French",es:"Spanish",pt:"European Portuguese",de:"German",it:"Italian"};
const CATEGORIES = ["cleanser","toner","serum","moisturizer","sunscreen","eye_care","exfoliant","mask","oil","treatment","other"];

function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");}
function text(v,max=300){return String(v||"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max);}
function arr(v,max=8){return Array.isArray(v)?v.map(x=>text(x,180)).filter(Boolean).slice(0,max):[];}
function safeInt(v,min=0,max=100){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):null;}

function fallbackProfile(journey){
  const a=journey.initial_analysis_json||{};
  const cats=a.categories||{};
  const priorities=Array.isArray(a.top3)?a.top3.map(x=>String(x?.dimension||x||"")).slice(0,3):[];
  return {overall:Number(journey.initial_score||a.overall_score||0), priorities, scores:Object.fromEntries(Object.entries(cats).map(([k,v])=>[k,Number(v?.score||0)]))};
}

export default async function(req,res){
  cors(res);
  if(req.method==="OPTIONS") return res.status(204).send("");
  const b=req.body||{};
  const journeyId=text(b.journeyId,40).toUpperCase();
  const images=Array.isArray(b.images)?b.images.filter(x=>typeof x==="string"&&/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(x)).slice(0,3):[];
  const language=LANGS[String(b.language||"en").toLowerCase()]?String(b.language).toLowerCase():"en";
  if(!/^GJ-[A-Z0-9]{8,20}$/.test(journeyId)) return res.status(400).json({error:"Enter a valid Glow Journey ID."});
  if(!images.length) return res.status(400).json({error:"Add a clear product photo."});
  if(images.some(x=>x.length>10*1024*1024)) return res.status(413).json({error:"One of the product photos is too large."});

  const jq=await db.query("SELECT journey_id,payment_status,initial_score,initial_analysis_json FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[journeyId]);
  if(!jq.rows[0]) return res.status(404).json({error:"We couldn't find that Glow Journey ID."});
  if(jq.rows[0].payment_status!=="paid") return res.status(402).json({error:"GLOW 1.5 is available with your Personal Glow Plan."});

  const profile=fallbackProfile(jq.rows[0]);
  const instruction = LANGS[language] || "English";
  const prompt = `You are the GLOW AI Product Intelligence layer. This is a beauty and wellness product analysis, not a medical diagnosis. Analyze only what can be supported by the product images and the user's existing GLOW profile. Do not invent ingredients that are not visible or confidently identifiable. If ingredient information is incomplete, say so.

User GLOW profile:
Overall score: ${profile.overall}/100
Top visible priorities: ${JSON.stringify(profile.priorities)}
Dimension scores: ${JSON.stringify(profile.scores)}

Return ONLY JSON:
{
 "product_name":"string",
 "brand":"string",
 "category":"cleanser|toner|serum|moisturizer|sunscreen|eye_care|exfoliant|mask|oil|treatment|other",
 "format":"string",
 "barcode":"string or empty",
 "ingredients":["visible or confidently identifiable ingredient names only"],
 "visible_text":"short useful text from packaging",
 "fit_score":0,
 "safety_level":"CLEAR|REVIEW|CAUTION|UNKNOWN",
 "effectiveness_level":"HIGH|GOOD|MODERATE|LIMITED|UNKNOWN",
 "suitability_level":"STRONG|GOOD|MIXED|LOW|UNKNOWN",
 "fit_reasons":["3 concise reasons tied to the user's visible priorities"],
 "cautions":["specific cautions only when supported"],
 "best_for":["up to 3 relevant visible priorities or routine roles"],
 "avoid_if":["up to 3 situations where the product may be a poor fit; do not diagnose"],
 "alternative_profile":["up to 3 ingredient/formulation directions to look for if this is not a fit"],
 "routine_role":"AM|PM|AM+PM|OCCASIONAL",
 "application":"short practical application guidance",
 "scan_confidence":"HIGH|STANDARD|LOW"
}
Fit score must reflect the match between the visible formulation information and the user's GLOW priorities, not brand reputation or price. If ingredient evidence is weak, lower confidence and do not manufacture certainty. Write customer-facing text in ${instruction}.`;

  try{
    const content=[{type:"text",text:prompt},...images.map((url,i)=>({type:"text",text:`PRODUCT PHOTO ${i+1}`},{type:"image_url",image_url:{url}}))];
    const result=await ai.generateText({model:"gpt",system:"Analyze cosmetic product packaging conservatively. Never claim a medical diagnosis or guaranteed outcome.",messages:[{role:"user",content}],maxSteps:1,purpose:"glow15-product-scan"});
    const raw=String(result.text||"").replace(/^\`\`\`json\s*/i,"").replace(/\s*\`\`\`$/i,"").trim();
    const p=JSON.parse(raw);
    const product={
      product_name:text(p.product_name||"Unidentified product",120),
      brand:text(p.brand,80),
      category:CATEGORIES.includes(p.category)?p.category:"other",
      format:text(p.format,80),
      barcode:text(p.barcode,40),
      ingredients:arr(p.ingredients,40),
      visible_text:text(p.visible_text,500),
      fit_score:safeInt(p.fit_score),
      safety_level:["CLEAR","REVIEW","CAUTION","UNKNOWN"].includes(p.safety_level)?p.safety_level:"UNKNOWN",
      effectiveness_level:["HIGH","GOOD","MODERATE","LIMITED","UNKNOWN"].includes(p.effectiveness_level)?p.effectiveness_level:"UNKNOWN",
      suitability_level:["STRONG","GOOD","MIXED","LOW","UNKNOWN"].includes(p.suitability_level)?p.suitability_level:"UNKNOWN",
      fit_reasons:arr(p.fit_reasons,4),
      cautions:arr(p.cautions,4),
      best_for:arr(p.best_for,4),
      avoid_if:arr(p.avoid_if,4),
      alternative_profile:arr(p.alternative_profile,4),
      routine_role:["AM","PM","AM+PM","OCCASIONAL"].includes(p.routine_role)?p.routine_role:"AM+PM",
      application:text(p.application,260),
      scan_confidence:["HIGH","STANDARD","LOW"].includes(p.scan_confidence)?p.scan_confidence:"STANDARD"
    };
    return res.json({product,profile,version:"GLOW-1.5-PRODUCT-V1.0"});
  }catch(e){
    console.error("GLOW15 product scan error",e);
    return res.status(502).json({error:"We couldn't read that product clearly. Try a brighter photo showing the front and ingredient list."});
  }
}