import { db } from "hatchable";

export const access="public";
export const methods=["GET","OPTIONS"];

const FALLBACK=[
 {id:"glow-gentle-cleanser",name:"Gentle Barrier Cleanser",brand:"GLOW AI Curated",category:"cleanser",price:null,source:"GLOW AI curated catalogue",reason:"A simple cleanser direction designed around barrier support."},
 {id:"glow-hydrating-serum",name:"Hydrating Serum",brand:"GLOW AI Curated",category:"serum",price:null,source:"GLOW AI curated catalogue",reason:"A hydration-first serum direction."},
 {id:"glow-barrier-moisturizer",name:"Barrier Support Moisturizer",brand:"GLOW AI Curated",category:"moisturizer",price:null,source:"GLOW AI curated catalogue",reason:"A simple barrier-support moisturiser direction."},
 {id:"glow-daily-spf",name:"Daily Broad-Spectrum SPF",brand:"GLOW AI Curated",category:"sunscreen",price:null,source:"GLOW AI curated catalogue",reason:"Daily UV protection as a core routine role."},
 {id:"glow-niacinamide-serum",name:"Niacinamide Serum",brand:"GLOW AI Curated",category:"serum",price:null,source:"GLOW AI curated catalogue",reason:"A targeted serum direction for tone and barrier support."},
 {id:"glow-squalane-oil",name:"Squalane Facial Oil",brand:"GLOW AI Curated",category:"oil",price:null,source:"GLOW AI curated catalogue",reason:"A lightweight oil direction for a simple finishing step."},
 {id:"glow-hydrating-toner",name:"Hydrating Toner",brand:"GLOW AI Curated",category:"toner",price:null,source:"GLOW AI curated catalogue",reason:"A hydration-focused toner direction."},
 {id:"glow-gentle-exfoliant",name:"Gentle Exfoliant",brand:"GLOW AI Curated",category:"exfoliant",price:null,source:"GLOW AI curated catalogue",reason:"A lower-intensity exfoliation direction."},
 {id:"glow-eye-hydration",name:"Hydrating Eye Care",brand:"GLOW AI Curated",category:"eye_care",price:null,source:"GLOW AI curated catalogue",reason:"A simple hydration-focused eye-care direction."},
 {id:"glow-hydration-mask",name:"Hydration Mask",brand:"GLOW AI Curated",category:"mask",price:null,source:"GLOW AI curated catalogue",reason:"An occasional hydration treatment direction."}
];

function text(v,max=120){return String(v||"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max);}
function fitFor(item,journey){if(!journey)return null;const a=journey.initial_analysis_json||{},cats=a.categories||{};const map={cleanser:["hydration_appearance","texture"],serum:["radiance","hydration_appearance"],moisturizer:["hydration_appearance","texture"],sunscreen:["evenness","radiance"],toner:["hydration_appearance"],exfoliant:["texture","evenness"],oil:["hydration_appearance","radiance"],mask:["hydration_appearance"],eye_care:["under_eye_appearance"],treatment:["radiance","texture"]};const keys=map[item.category]||[];const vals=keys.map(k=>Number(cats[k]?.score)).filter(Number.isFinite);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;}

export default async function(req,res){
 if(req.method==="OPTIONS")return res.status(204).send("");
 const q=text(req.query?.q,100);
 if(q.length<2)return res.json({results:[],source:"GLOW AI curated catalogue"});
 const journeyId=text(req.query?.journey_id,40).toUpperCase();
 let journey=null;
 if(/^GJ-[A-Z0-9]{8,20}$/.test(journeyId)){
  const j=await db.query("SELECT journey_id,payment_status,initial_analysis_json FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[journeyId]);
  if(j.rows[0]&&j.rows[0].payment_status==="paid")journey=j.rows[0];
 }
 const terms=q.toLowerCase().split(/\s+/).filter(Boolean);
 const results=FALLBACK.filter(x=>terms.some(t=>[x.name,x.brand,x.category].join(" ").toLowerCase().includes(t))).map(x=>({...x,fit_score:fitFor(x,journey)}));
 return res.json({results,source:"GLOW AI curated catalogue",version:"GLOW-1.1-CATALOGUE-V1"});
}