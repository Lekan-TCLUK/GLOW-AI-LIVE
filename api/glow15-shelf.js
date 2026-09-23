import { db } from "hatchable";

export const access="public";
export const methods=["GET","POST","DELETE","OPTIONS"];

function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","GET, POST, DELETE, OPTIONS");}
function text(v,max=120){return String(v||"").trim().slice(0,max);}

async function verify(journeyId){
  const q=await db.query("SELECT journey_id,payment_status FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[journeyId]);
  return q.rows[0]&&q.rows[0].payment_status==="paid";
}

export default async function(req,res){
  cors(res);
  if(req.method==="OPTIONS") return res.status(204).send("");
  const journeyId=text(req.query?.journey_id||req.body?.journeyId,40).toUpperCase();
  if(!/^GJ-[A-Z0-9]{8,20}$/.test(journeyId)) return res.status(400).json({error:"Enter a valid Glow Journey ID."});
  if(!(await verify(journeyId))) return res.status(402).json({error:"GLOW 1.5 is available with your Personal Glow Plan."});

  if(req.method==="GET"){
    const q=await db.query("SELECT id,journey_id,product_name,brand,category,format,ingredients,fit_score,safety_level,effectiveness_level,suitability_level,fit_reasons,cautions,best_for,avoid_if,alternative_profile,routine_role,application,scan_confidence,created_at FROM glow15_products WHERE journey_id=$1 ORDER BY updated_at DESC",[journeyId]);
    return res.json({products:q.rows,version:"GLOW-1.5-SHELF-V1.0"});
  }

  const body=req.body||{};
  if(req.method==="POST"){
    const p=body.product||{};
    const name=text(p.product_name,120);
    if(!name) return res.status(400).json({error:"Product name is required."});
    const countQ=await db.query("SELECT count(*)::int AS count FROM glow15_products WHERE journey_id=$1",[journeyId]);
    if(Number(countQ.rows[0]?.count||0)>=20) return res.status(409).json({error:"YOUR GLOW SHELF IS FULL. You can keep up to 20 products. Remove one before adding another."});
    const ins=await db.query("INSERT INTO glow15_products (journey_id,product_name,brand,category,format,barcode,ingredients,visible_text,fit_score,safety_level,effectiveness_level,suitability_level,fit_reasons,cautions,best_for,avoid_if,alternative_profile,routine_role,application,scan_confidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id",[journeyId,name,text(p.brand,80),text(p.category,30)||"other",text(p.format,80),text(p.barcode,40),JSON.stringify(Array.isArray(p.ingredients)?p.ingredients.slice(0,40):[]),text(p.visible_text,500),Number.isFinite(Number(p.fit_score))?Math.max(0,Math.min(100,Math.round(Number(p.fit_score)))):null,text(p.safety_level,20)||"UNKNOWN",text(p.effectiveness_level,20)||"UNKNOWN",text(p.suitability_level,20)||"UNKNOWN",JSON.stringify(p.fit_reasons||[]),JSON.stringify(p.cautions||[]),JSON.stringify(p.best_for||[]),JSON.stringify(p.avoid_if||[]),JSON.stringify(p.alternative_profile||[]),text(p.routine_role,20)||"AM+PM",text(p.application,260),text(p.scan_confidence,20)||"STANDARD"]);
    return res.json({ok:true,id:ins.rows[0].id});
  }

  if(req.method==="DELETE"){
    const id=text(req.query?.id||req.body?.id,80);
    if(!id) return res.status(400).json({error:"Product id is required."});
    await db.query("DELETE FROM glow15_products WHERE id=$1 AND journey_id=$2",[id,journeyId]);
    return res.json({ok:true});
  }
  return res.status(405).json({error:"Method not allowed"});
}