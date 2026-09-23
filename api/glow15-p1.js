import { db } from "hatchable";

export const access="public";
export const methods=["GET","POST","DELETE","OPTIONS"];

const BUDGETS=[25,50,100,200];

function cors(res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, DELETE, OPTIONS");
}
function text(v,max=240){return String(v||"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,max)}
function num(v,fallback=null){const n=Number(v);return Number.isFinite(n)?n:fallback}
function validJourney(v){return /^GJ-[A-Z0-9]{8,20}$/.test(v)}
async function getJourney(journeyId){
  const q=await db.query("SELECT journey_id,payment_status,initial_score,initial_analysis_json FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[journeyId]);
  if(!q.rows[0]) return {status:404,error:"We couldn't find that Glow Journey ID."};
  if(q.rows[0].payment_status!=="paid") return {status:402,error:"GLOW 1.5 is available with your Personal Glow Plan."};
  return {row:q.rows[0]};
}
async function getProducts(journeyId){
  const q=await db.query("SELECT id,product_name,brand,category,format,ingredients,fit_score,safety_level,effectiveness_level,suitability_level,fit_reasons,cautions,best_for,avoid_if,alternative_profile,routine_role,application,scan_confidence FROM glow15_products WHERE journey_id=$1 ORDER BY fit_score DESC NULLS LAST,updated_at DESC",[journeyId]);
  return q.rows;
}
function categoryDirections(category){
  const map={
    cleanser:["barrier-support cream cleanser","gentle low-foam cleanser","simple fragrance-free cleanser"],
    toner:["hydrating essence/toner with barrier-support humectants","simple hydrating toner","basic alcohol-free hydrating toner"],
    serum:["multi-active hydration and radiance serum","humectant serum with niacinamide or similar support","simple humectant serum"],
    moisturizer:["ceramide-rich barrier cream","barrier-support moisturiser with glycerin or squalane","simple fragrance-free moisturiser"],
    sunscreen:["high-protection lightweight broad-spectrum SPF","comfortable daily SPF fluid","simple daily broad-spectrum SPF"],
    eye_care:["peptide/hydration eye formula","simple hydrating eye gel","basic fragrance-free eye moisturiser"],
    exfoliant:["gentle multi-acid exfoliant","single-acid exfoliant matched to the goal","simple low-strength exfoliant"],
    mask:["barrier-support or hydration mask","hydrating treatment mask","simple rinse-off hydration mask"],
    oil:["luxury barrier-support facial oil","lightweight squalane-style facial oil","simple single-oil facial option"],
    treatment:["targeted treatment matched to the priority","focused treatment with a simpler active profile","simple single-active treatment"],
    other:["topical formulation aligned to the Glow priority","focused topical alternative","simple topical alternative"]
  };
  return map[category]||map.other;
}
function alternativesFor(p){
  const score=Number(p.fit_score);
  if(Number.isFinite(score)&&score>75){
    return {eligible:false,threshold:75,sourceProductId:p.id,sourceProductName:p.product_name,sourceScore:score,reason:"Your Glow Fit Score is above 75, so GLOW does not recommend replacing this product. Keep using what already fits your Glow Journey."};
  }
  const raw=Array.isArray(p.alternative_profile)&&p.alternative_profile.length?p.alternative_profile:categoryDirections(p.category);
  const dirs=[...raw,...categoryDirections(p.category)].filter(Boolean);
  const uniq=[];for(const d of dirs){if(!uniq.some(x=>x.toLowerCase()===String(d).toLowerCase()))uniq.push(d)}
  const tiers=[
    {tier:"PREMIUM",label:"Premium",price:72,direction:uniq[0]||"Higher-spec formulation aligned to your Glow priorities",difference:"More specialised formulation and a broader ingredient profile."},
    {tier:"MID",label:"Mid-range",price:38,direction:uniq[1]||uniq[0]||"Balanced formulation aligned to your Glow priorities",difference:"A balance of targeted ingredients and simplicity."},
    {tier:"VALUE",label:"Value",price:17,direction:uniq[2]||uniq[1]||uniq[0]||"Simple formulation aligned to your Glow priorities",difference:"Keeps the formulation focused while addressing the core role."}
  ];
  return {eligible:true,threshold:75,sourceProductId:p.id,sourceProductName:p.product_name,sourceScore:score,reason:"GLOW only recommends an alternative when the product's Glow Fit Score is 75 or below.",alternatives:tiers.map(x=>({...x,category:p.category,sourceProductId:p.id,sourceProductName:p.product_name}))};
}

function routineRole(p){
  const c=String(p.category||"").toLowerCase().replace(/-/g,"_");
  const r=String(p.routine_role||"").toLowerCase().replace(/-/g,"_");
  const n=String(p.product_name||"").toLowerCase();
  const a=String(p.application||"").toLowerCase();
  if(c==="sunscreen"||c==="sun_protection"||/\bspf\b/.test(n+a)) return "sunscreen";
  if(c==="cleanser") return "cleanser";
  if(c==="toner"||c==="essence") return "toner";
  if(c==="moisturizer"||c==="moisturiser"||r==="moisturizer"||r==="moisturiser") return "moisturizer";
  if(c==="eye_care"||c==="eye_care_product"||c==="eyecare") return "eye_care";
  if(c==="exfoliant"||c==="exfoliator") return "exfoliant";
  if(c==="mask") return "mask";
  if(c==="oil"||c==="face_oil") return "oil";
  if(c==="serum") return "serum";
  if(c==="treatment") return r==="occasional"?"occasional":"treatment";
  if(r==="cleanser"||r==="toner"||r==="serum"||r==="moisturizer"||r==="moisturiser"||r==="sunscreen"||r==="eye_care"||r==="exfoliant"||r==="oil"||r==="mask"||r==="treatment") return r==="moisturiser"?"moisturizer":r;
  return r||c||"other";
}
function isRetinoid(p){return /retin(?:ol|al|oid)|tretinoin|adapalene/i.test([p.product_name,p.application,JSON.stringify(p.ingredients||[])].join(" "))}
function isBodyOnly(p){return /body only|body use only|massage spray|body lotion|body cream/i.test([p.product_name,p.application].join(" "))}
function routineCandidate(p){return !isBodyOnly(p)&&String(p.suitability_level||"").toUpperCase()!=="LOW"&&routineRole(p)!=="occasional"}
function priorityData(profile){
  const top=Array.isArray(profile?.top3)?profile.top3:[];
  const labels={evenness:"Evenness",texture:"Texture",under_eye_appearance:"Under-eye appearance",under_eye:"Under-eye appearance",radiance:"Radiance",vitality:"Vitality",hydration_appearance:"Hydration"};
  return top.map(x=>({dimension:x.dimension,score:Number(x.score)||0,label:labels[x.dimension]||String(x.dimension||"").replace(/_/g," ")}));
}
function routineWhy(role,priorities,p){
  const primary=priorities[0]?.label||"your Glow priorities";
  if(role==="cleanser") return "Creates a clean base for the rest of your Glow routine.";
  if(role==="sunscreen") return "Placed in the morning to support your skin's daily protection and your evenness priority.";
  if(role==="moisturizer") return "Supports hydration and helps keep the routine comfortable and balanced.";
  if(role==="eye_care") return "Adds a focused step for the under-eye area.";
  if(role==="exfoliant") return "Supports a smoother-looking appearance and is kept separate from stronger treatment nights.";
  if(role==="serum"||role==="treatment") return "Chosen because it can support your " + primary.toLowerCase() + " priority.";
  if(role==="toner") return "Adds a lightweight hydration step before treatment or moisturising.";
  if(role==="oil") return "Used as an optional finishing layer when extra comfort is needed.";
  return "Included because it fits a useful role in your current Glow Shelf.";
}
function buildRoutine(products,profile,budget){
  const priorities=priorityData(profile);
  const eligible=products.filter(routineCandidate).map(p=>({...p,__role:routineRole(p)}));
  const bestRole=role=>eligible.filter(p=>p.__role===role).sort((a,b)=>(Number(b.fit_score)||0)-(Number(a.fit_score)||0))[0]||null;
  const used=new Set();
  const pick=(role,side,filter)=>{const arr=eligible.filter(p=>p.__role===role&&!used.has(p.id)&&(filter?filter(p):true)).sort((a,b)=>(Number(b.fit_score)||0)-(Number(a.fit_score)||0));const p=arr[0];if(p)used.add(p.id);return p};
  const make=(p,step,side,note)=>p?{step,role:p.__role,productId:p.id,name:p.category,product:p,why:routineWhy(p.__role,priorities,p),usage:p.application||"Follow the product label.",side,note:note||""}:null;
  const am=[];
  const amRoles=["cleanser","toner","serum","eye_care","moisturizer","sunscreen"];
  for(const role of amRoles){const p=pick(role,"am",role==="serum"?(x)=>!isRetinoid(x):undefined);if(p)am.push(make(p,am.length+1,"am"))}
  const pm=[];
  for(const role of ["cleanser","toner","serum","treatment","eye_care","moisturizer","oil"]){const p=pick(role,"pm",role==="serum"?undefined:undefined);if(p)pm.push(make(p,pm.length+1,"pm"))}
  const ret=eligible.find(p=>isRetinoid(p)&&!used.has(p.id));
  if(ret){used.add(ret.id);const idx=pm.findIndex(x=>x.role==="serum");if(idx>=0){pm[idx]=make(ret,idx+1,"pm","Use in the evening; follow the product directions and avoid pairing it with exfoliant nights.")}else pm.push(make(ret,pm.length+1,"pm","Use in the evening; follow the product directions."))}
  const exfol=eligible.filter(p=>p.__role==="exfoliant"&&!used.has(p.id)).sort((a,b)=>(Number(b.fit_score)||0)-(Number(a.fit_score)||0))[0];
  const rotation=[];
  if(exfol){used.add(exfol.id);rotation.push(make(exfol,1,"rotation","Use on selected evenings rather than on the same night as a retinoid treatment."))}
  const core=["cleanser","moisturizer","sunscreen"];
  const gaps=core.filter(role=>!eligible.some(p=>p.__role===role)).map(role=>({role,label:role.replace("_"," "),reason:role==="cleanser"?"A cleanser is needed to start both AM and PM routines.":role==="sunscreen"?"A daily sunscreen completes the daytime routine.":"A moisturiser supports the final hydration step."}));
  const all=[...am,...pm,...rotation];
  const coverage=Math.round(((core.length-gaps.length)/core.length)*100);
  const notes=[];
  if(rotation.length)notes.push({type:"rotation",title:"Treatment rotation",text:"Your exfoliant is separated from retinoid treatment nights to keep the routine simpler."});
  if(!eligible.some(p=>p.__role==="sunscreen"))notes.push({type:"gap",title:"Daytime protection",text:"Your current Shelf does not include a sunscreen."});
  return {version:"GLOW-ROUTINE-ENGINE-V1.0",generatedAt:new Date().toISOString(),budget:Number(budget||50),priorities,coverage:{covered:core.length-gaps.length,total:core.length,percent:coverage},am,pm,rotation,gaps,notes,excluded:products.filter(p=>!routineCandidate(p)).map(p=>({productId:p.id,productName:p.product_name,reason:isBodyOnly(p)?"Not a facial routine product.":"Low suitability for this routine."})),allProductIds:all.map(x=>x.productId)};
}
function recommendationCatalogue(){
  return {
    cleanser:[
      {id:"glow-gentle-cleanser",name:"Gentle Barrier Cleanser",brand:"GLOW AI Curated",category:"cleanser",value:12,mid:14,premium:22,reason:"Fills the cleansing role missing from your AM + PM routine.",direction:"Gentle barrier-support cleansing."}
    ],
    moisturizer:[
      {id:"glow-barrier-moisturizer",name:"Barrier Support Moisturizer",brand:"GLOW AI Curated",category:"moisturizer",value:14,mid:16,premium:26,reason:"Fills the moisturising role missing from your routine.",direction:"Simple barrier-support hydration."}
    ],
    sunscreen:[
      {id:"glow-daily-spf",name:"Daily Broad-Spectrum SPF",brand:"GLOW AI Curated",category:"sunscreen",value:15,mid:18,premium:28,reason:"Fills the daytime protection role missing from your routine.",direction:"Daily broad-spectrum SPF 30+ planning direction."}
    ],
    toner:[
      {id:"glow-hydrating-toner",name:"Hydrating Toner",brand:"GLOW AI Curated",category:"toner",value:10,mid:13,premium:20,reason:"Adds the optional hydration step identified as useful for your routine.",direction:"Lightweight hydration support."}
    ],
    eye_care:[
      {id:"glow-eye-hydration",name:"Hydrating Eye Care",brand:"GLOW AI Curated",category:"eye_care",value:12,mid:17,premium:25,reason:"Adds a focused under-eye step when this role is missing.",direction:"Simple hydration-focused eye care."}
    ]
  };
}
function recommendationPriority(role,priorities){
  const map={cleanser:["hydration_appearance","texture"],moisturizer:["hydration_appearance","texture"],sunscreen:["evenness","radiance"],toner:["hydration_appearance"],eye_care:["under_eye_appearance","under_eye"]};
  const keys=map[role]||[];
  const found=priorities.findIndex(p=>keys.includes(p.dimension));
  return found<0?99:found;
}
function buildRecommendations(products,profile,routineData,budget,saved){
  const priorities=priorityData(profile);
  const gaps=Array.isArray(routineData?.gaps)?routineData.gaps:[];
  const catalogue=recommendationCatalogue();
  const ownedByRole=new Map();
  products.filter(routineCandidate).forEach(p=>{const role=routineRole(p);if(!ownedByRole.has(role))ownedByRole.set(role,p)});
  const candidates=[];
  gaps.forEach(g=>{if(catalogue[g.role])candidates.push({role:g.role,basis:"GAP",source:null,sourceScore:null})});
  products.filter(routineCandidate).forEach(p=>{
    const role=routineRole(p),score=Number(p.fit_score);
    if(catalogue[role]&&Number.isFinite(score)&&score<=75)candidates.push({role,basis:"LOW_FIT",source:p,sourceScore:score});
  });
  const unique=[];for(const c of candidates){if(!unique.some(x=>x.role===c.role))unique.push(c)}
  const ordered=unique.sort((a,b)=>recommendationPriority(a.role,priorities)-recommendationPriority(b.role,priorities));
  const limit=Math.min(3,ordered.length);
  let remaining=Number(budget||50);
  const out=[];
  for(let i=0;i<ordered.length&&out.length<limit;i++){
    const item=ordered[i],base=catalogue[item.role][0];
    const choices=[{tier:"MID",price:base.mid},{tier:"VALUE",price:base.value},{tier:"PREMIUM",price:base.premium}];
    let choice=choices.find(c=>c.price<=remaining);
    if(!choice&&out.length===0)choice=choices.find(c=>c.price<=Number(budget||50));
    if(!choice)continue;
    const savedMatch=(saved||[]).some(w=>String(w.metadata?.recommendation_id||"")===base.id);
    const primary=priorities[0]?.label;
    const priorityText=primary?"Supports your "+primary.toLowerCase()+" priority.":"Fits the needs identified by your Glow routine.";
    let reason,detail;
    if(item.basis==="LOW_FIT"){
      reason="You already own "+item.source.product_name+", but its Glow Fit Score is "+item.sourceScore+"/100.";
      detail="Because the score is 75 or below, GLOW is showing an alternative worth considering. "+(primary?"This can also support your "+primary.toLowerCase()+" priority.":"It is intended to improve the fit of this routine role.");
    }else{
      reason="You do not currently have a "+String(item.role).replace(/_/g," ")+" product on your Glow Shelf.";
      detail="GLOW is recommending this to fill that routine gap"+(primary?" and support your "+primary.toLowerCase()+" priority.":".");
    }
    out.push({
      id:base.id+"-"+choice.tier.toLowerCase(),
      productId:base.id,name:base.name,brand:base.brand,category:base.category,tier:choice.tier,
      estimated_price_gbp:choice.price,role:item.role,source_product_id:item.source?.id||null,source_score:item.sourceScore,
      basis:item.basis,reason,detailedReason:detail,direction:base.direction,priorityText,planning:true,saved:savedMatch
    });
    remaining-=choice.price;
  }
  return {budget:Number(budget||50),startingBudget:Number(budget||50),remainingBudget:remaining,recommendations:out,total:Number((Number(budget||50)-remaining).toFixed(2)),gapCount:ordered.length};
}
async function preferences(journeyId){
  const q=await db.query("SELECT monthly_budget_gbp FROM glow15_preferences WHERE journey_id=$1 LIMIT 1",[journeyId]);
  return q.rows[0]?Number(q.rows[0].monthly_budget_gbp):50;
}
async function wishlist(journeyId){
  const q=await db.query("SELECT id,title,brand,category,tier,estimated_price_gbp,reason,source_product_id,metadata,created_at FROM glow15_wishlist WHERE journey_id=$1 ORDER BY created_at DESC",[journeyId]);
  return q.rows;
}
async function routine(journeyId){
  const q=await db.query("SELECT monthly_budget_gbp,routine_json,updated_at FROM glow15_routines WHERE journey_id=$1 LIMIT 1",[journeyId]);
  return q.rows[0]||{monthly_budget_gbp:await preferences(journeyId),routine_json:{am:[],pm:[]}};
}
export { buildRoutine, buildRecommendations, alternativesFor, routineRole, priorityData };

export default async function(req,res){
  cors(res);
  if(req.method==="OPTIONS") return res.status(204).send("");
  const raw=text(req.query?.journey_id||req.body?.journeyId,40).toUpperCase();
  if(!validJourney(raw)) return res.status(400).json({error:"Enter a valid Glow Journey ID."});
  const access=await getJourney(raw);
  if(access.status) return res.status(access.status).json({error:access.error});
  const journeyId=raw;

  if(req.method==="GET"){
    const products=await getProducts(journeyId);
    const budget=await preferences(journeyId);
    const list=await wishlist(journeyId);
    const saved=await routine(journeyId);
    const routineJson=saved.routine_json||{am:[],pm:[]};
    const recommendationSource=buildRoutine(products,access.row.initial_analysis_json||{},budget);
    const recommendationData=buildRecommendations(products,access.row.initial_analysis_json||{},recommendationSource,budget,list);
    const productId=text(req.query?.product_id,80);
    const source=productId?products.find(p=>p.id===productId):null;
    const alternativeData=source?alternativesFor(source):null; return res.json({journeyId,budget,wishlist:list,routine:routineJson,routineBudget:Number(saved.monthly_budget_gbp||budget),products,alternatives:alternativeData?.alternatives||[],alternativeEligibility:alternativeData||null,sourceProduct:source||null,recommendations:recommendationData,version:"GLOW-1.7-INTELLIGENCE-V1.0"});
  }

  const b=req.body||{};
  const action=text(b.action,40);
  if(action==="set_budget"){
    const budget=num(b.budget);
    if(!BUDGETS.includes(budget)) return res.status(400).json({error:"Choose a budget of £25, £50, £100 or £200+."});
    await db.query("INSERT INTO glow15_preferences (journey_id,monthly_budget_gbp) VALUES ($1,$2) ON CONFLICT (journey_id) DO UPDATE SET monthly_budget_gbp=$2,updated_at=now()",[journeyId,budget]);
    return res.json({ok:true,budget});
  }
  if(action==="wishlist_add"){
    const title=text(b.title,160), tier=text(b.tier,20).toUpperCase(), category=text(b.category,40)||"other";
    if(!title) return res.status(400).json({error:"Wishlist item needs a title."});
    if(!["PREMIUM","MID","VALUE","OWNED"].includes(tier)) return res.status(400).json({error:"Invalid wishlist tier."});
    const ins=await db.query("INSERT INTO glow15_wishlist (journey_id,title,brand,category,tier,estimated_price_gbp,reason,source_product_id,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",[journeyId,title,text(b.brand,100),category,tier,num(b.estimated_price_gbp),text(b.reason,500),text(b.source_product_id,80)||null,JSON.stringify(b.metadata||{})]);
    return res.json({ok:true,id:ins.rows[0].id});
  }
  if(action==="wishlist_remove"){
    const id=text(b.id,80);
    if(!id) return res.status(400).json({error:"Wishlist item id is required."});
    await db.query("DELETE FROM glow15_wishlist WHERE id=$1 AND journey_id=$2",[id,journeyId]);
    return res.json({ok:true});
  }
  if(action==="routine_build"){
    const budget=BUDGETS.includes(num(b.budget))?num(b.budget):await preferences(journeyId);
    const products=await getProducts(journeyId);
    const generated=buildRoutine(products,access.row.initial_analysis_json||{},budget);
    await db.query("INSERT INTO glow15_routines (journey_id,monthly_budget_gbp,routine_json) VALUES ($1,$2,$3) ON CONFLICT (journey_id) DO UPDATE SET monthly_budget_gbp=$2,routine_json=$3,updated_at=now()",[journeyId,budget,JSON.stringify(generated)]);
    return res.json({ok:true,budget,routine:generated});
  }
  if(action==="routine_save"){
    const products=await getProducts(journeyId);
    const byId=new Map(products.map(p=>[p.id,p]));
    const priorities=priorityData(access.row.initial_analysis_json||{});
    const cleanSide=(side)=>{
      const input=Array.isArray(b?.routine?.[side])?b.routine[side].slice(0,8):[];
      return input.map(x=>byId.get(text(x.productId,80))).filter(Boolean).map((p,i)=>({step:i+1,role:routineRole(p),productId:p.id,name:p.category,product:p,why:routineWhy(routineRole(p),priorities,p),usage:p.application||"Follow the product label.",side}));
    };
    const am=cleanSide("am"),pm=cleanSide("pm");
    const budget=BUDGETS.includes(num(b.budget))?num(b.budget):await preferences(journeyId);
    const core=["cleanser","moisturizer","sunscreen"];
    const gaps=core.filter(role=>!products.some(p=>routineCandidate(p)&&routineRole(p)===role)).map(role=>({role,label:role.replace("_"," "),reason:role==="cleanser"?"A cleanser is needed to start both AM and PM routines.":role==="sunscreen"?"A daily sunscreen completes the daytime routine.":"A moisturiser supports the final hydration step."}));
    const saved={version:"GLOW-ROUTINE-ENGINE-V1.0",savedAt:new Date().toISOString(),userEdited:true,budget,priorities,coverage:{covered:core.length-gaps.length,total:core.length,percent:Math.round(((core.length-gaps.length)/core.length)*100)},am,pm,gaps,notes:[],rotation:Array.isArray(b?.routine?.rotation)?b.routine.rotation:[]};
    await db.query("INSERT INTO glow15_routines (journey_id,monthly_budget_gbp,routine_json) VALUES ($1,$2,$3) ON CONFLICT (journey_id) DO UPDATE SET monthly_budget_gbp=$2,routine_json=$3,updated_at=now()",[journeyId,budget,JSON.stringify(saved)]);
    return res.json({ok:true,budget,routine:saved});
  }
  return res.status(405).json({error:"Method not allowed"});
}