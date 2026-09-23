import { db } from "hatchable";

export const access="public";
export const methods=["GET","OPTIONS"];

function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");}
function text(v,max=120){return String(v||"").trim().slice(0,max);}
function pick(products,keys,role){
  return products.find(p=>keys.includes(p.category)&&(!role||String(p.routine_role||"").includes(role)))||products.find(p=>keys.includes(p.category))||null;
}

export default async function(req,res){
  cors(res);
  if(req.method==="OPTIONS") return res.status(204).send("");
  const journeyId=text(req.query?.journey_id,40).toUpperCase();
  if(!/^GJ-[A-Z0-9]{8,20}$/.test(journeyId)) return res.status(400).json({error:"Enter a valid Glow Journey ID."});
  const jq=await db.query("SELECT payment_status,initial_score,initial_analysis_json FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[journeyId]);
  if(!jq.rows[0]) return res.status(404).json({error:"We couldn't find that Glow Journey ID."});
  if(jq.rows[0].payment_status!=="paid") return res.status(402).json({error:"GLOW 1.5 is available with your Personal Glow Plan."});
  const pq=await db.query("SELECT id,product_name,brand,category,fit_score,safety_level,routine_role,application,ingredients,fit_reasons,cautions FROM glow15_products WHERE journey_id=$1 ORDER BY fit_score DESC NULLS LAST, updated_at DESC",[journeyId]);
  const products=pq.rows;
  const am=[
    ["Cleanse",pick(products,["cleanser"],"AM")],
    ["Target",pick(products,["serum","treatment","toner"],"AM")],
    ["Moisturise",pick(products,["moisturizer","oil"],"AM")],
    ["Protect",pick(products,["sunscreen"],"AM")]
  ].filter(x=>x[1]).map((x,i)=>({step:i+1,name:x[0],product:x[1]}));
  const pm=[
    ["Cleanse",pick(products,["cleanser"],"PM")],
    ["Target",pick(products,["serum","treatment","exfoliant"],"PM")],
    ["Eye",pick(products,["eye_care"],"PM")],
    ["Moisturise",pick(products,["moisturizer","oil"],"PM")]
  ].filter(x=>x[1]).map((x,i)=>({step:i+1,name:x[0],product:x[1]}));
  const actives=products.filter(p=>/(retinol|retinal|tretinoin|aha|bha|pha|glycolic|salicylic|lactic|mandelic|peel)/i.test(JSON.stringify(p.ingredients||[])));
  const conflicts=[];
  if(actives.length>1) conflicts.push("Your shelf contains multiple active products. Introduce or alternate them rather than layering several strong actives together.");
  if(products.some(p=>p.category==="exfoliant")&&products.some(p=>p.category==="treatment")) conflicts.push("Keep exfoliation and strong treatment nights separate unless the product instructions explicitly support combining them.");
  const priority=jq.rows[0].initial_analysis_json?.top3||[];
  const focus=Array.isArray(priority)?priority.slice(0,3).map(p=>String(p?.dimension||p||"").replace(/_/g," ")):[];

  return res.json({journeyId,score:jq.rows[0].initial_score,focus,am,pm,conflicts,productCount:products.length,version:"GLOW-1.5-ROUTINE-V1.0"});
}