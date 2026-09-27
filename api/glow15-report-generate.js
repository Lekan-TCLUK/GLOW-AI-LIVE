import { db, browser, storage, email } from "hatchable";
import { getCustomerProfile } from "lib/glow16-intelligence.js";
export const access="public";
export const methods=["POST","OPTIONS"];

function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");}
function validJourney(v){return /^GJ-[A-Z0-9]{8,20}$/.test(v);}
const ALLOWED_APP_HOSTS=new Set(["glow-ai-v01.hatchable.site","i5g7yz.hatchable.site","glow-ai.co","www.glow-ai.co","app.glow-ai.co","re9vzi.hatchable.site"]);
function getAppBaseUrl(req){
  const forwardedHost=String(req.headers?.["x-forwarded-host"]||"").split(",")[0].trim().toLowerCase();
  const host=forwardedHost||String(req.headers?.host||"").split(",")[0].trim().toLowerCase();
  if(!host) return "https://re9vzi.hatchable.site";
  if(!ALLOWED_APP_HOSTS.has(host)) throw new Error("Unrecognised application host");
  return "https://"+host;
}
async function signature(value){const bytes=new TextEncoder().encode(JSON.stringify(value));const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
const MAIL={en:{subject:"Your Personal Glow Intelligence Report is ready. ✨",title:"Your Personal Glow Intelligence Report is ready.",complete:"Your Glow Intelligence is now complete.",body:"Your report brings together what you own, what GLOW identified, your personalised AM + PM routine, your genuine routine gaps, recommendations and product alternatives.",cta:"${mail.cta}",medical:"Beauty & wellness product guidance only — not medical advice."},fr:{subject:"Votre rapport Personal Glow Intelligence est prêt. ✨",title:"Votre rapport Personal Glow Intelligence est prêt.",complete:"Votre Glow Intelligence est maintenant complète.",body:"Votre rapport rassemble ce que vous possédez, ce que GLOW a identifié, votre routine personnalisée matin et soir, vos véritables lacunes de routine, vos recommandations et vos alternatives.",cta:"TÉLÉCHARGER MON RAPPORT GLOW INTELLIGENCE →",medical:"Conseils sur les produits de beauté et de bien-être uniquement — pas de conseils médicaux."},es:{subject:"Tu informe Personal Glow Intelligence está listo. ✨",title:"Tu informe Personal Glow Intelligence está listo.",complete:"Tu Glow Intelligence ya está completo.",body:"Tu informe reúne lo que ya tienes, lo que GLOW identificó, tu rutina personalizada de mañana y noche, tus carencias reales, recomendaciones y alternativas.",cta:"DESCARGAR MI INFORME GLOW INTELLIGENCE →",medical:"Orientación sobre productos de belleza y bienestar únicamente — no es asesoramiento médico."},pt:{subject:"O seu relatório Personal Glow Intelligence está pronto. ✨",title:"O seu relatório Personal Glow Intelligence está pronto.",complete:"A sua Glow Intelligence está agora completa.",body:"O seu relatório reúne o que já possui, o que o GLOW identificou, a sua rotina personalizada de manhã e à noite, as lacunas reais da rotina, recomendações e alternativas.",cta:"DESCARREGAR O MEU RELATÓRIO GLOW INTELLIGENCE →",medical:"Orientação sobre produtos de beleza e bem-estar apenas — não é aconselhamento médico."},de:{subject:"Ihr Personal Glow Intelligence Bericht ist bereit. ✨",title:"Ihr Personal Glow Intelligence Bericht ist bereit.",complete:"Ihre Glow Intelligence ist jetzt vollständig.",body:"Ihr Bericht verbindet Ihre vorhandenen Produkte, die Erkenntnisse von GLOW, Ihre personalisierte Morgen- und Abendroutine, echte Routinelücken, Empfehlungen und Alternativen.",cta:"MEINEN GLOW INTELLIGENCE BERICHT HERUNTERLADEN →",medical:"Beauty- und Wellness-Produkthinweise – keine medizinische Beratung."},it:{subject:"Il tuo report Personal Glow Intelligence è pronto. ✨",title:"Il tuo report Personal Glow Intelligence è pronto.",complete:"La tua Glow Intelligence è ora completa.",body:"Il tuo report riunisce ciò che possiedi, ciò che GLOW ha identificato, la tua routine personalizzata AM + PM, le vere lacune della routine, consigli e alternative.",cta:"SCARICA IL MIO REPORT GLOW INTELLIGENCE →",medical:"Indicazioni su prodotti beauty e wellness soltanto — non sono consigli medici."}};

export default async function(req,res){
 cors(res);
 if(req.method==="OPTIONS")return res.status(204).send("");
 const id=String(req.body?.journeyId||req.query?.journey_id||"").trim().toUpperCase();
 if(!validJourney(id))return res.status(400).json({error:"A valid Glow Journey ID is required."});
 try{
  const jq=await db.query("SELECT * FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[id]);
  const j=jq.rows[0];if(!j)return res.status(404).json({error:"Glow Journey not found."});
  if(j.payment_status!=="paid")return res.status(402).json({error:"Your Personal Glow Plan is required."});
  const rq=await db.query("SELECT routine_json,monthly_budget_gbp,updated_at FROM glow15_routines WHERE journey_id=$1 LIMIT 1",[id]);
  if(!rq.rows[0])return res.status(409).json({error:"Save your personalised routine before creating your Glow Intelligence Report."});
  const products=(await db.query("SELECT id,product_name,brand,category,format,ingredients,fit_score,safety_level,effectiveness_level,suitability_level,fit_reasons,cautions,best_for,avoid_if,alternative_profile,routine_role,application,scan_confidence,updated_at FROM glow15_products WHERE journey_id=$1 ORDER BY updated_at DESC",[id])).rows;
  const wishlist=(await db.query("SELECT id,title,brand,category,tier,estimated_price_gbp,reason,source_product_id,metadata,created_at FROM glow15_wishlist WHERE journey_id=$1 ORDER BY created_at DESC",[id])).rows;
  const customerIntelligence=await getCustomerProfile(id);
  const state={journeyId:id,analysis:j.initial_analysis_json||{},products,wishlist,routine:rq.rows[0].routine_json||{},budget:Number(rq.rows[0].monthly_budget_gbp||50),customerIntelligence:customerIntelligence?.insights||null};
  const sig=await signature(state);
  if(j.glow_intelligence_report_signature===sig&&j.glow_intelligence_report_url){
    return res.json({ok:true,generated:false,sent:Boolean(j.glow_intelligence_report_sent_at),reportUrl:j.glow_intelligence_report_url,journeyId:id});
  }
  const htmlUrl=getAppBaseUrl(req)+"/api/glow15-report-html?journey_id="+encodeURIComponent(id);
  const pdf=await browser.pdf(htmlUrl);
  const key="glow-intelligence/"+encodeURIComponent(id)+"/report-"+sig+".pdf";
  await storage.put(key,pdf,"application/pdf");
  const reportUrl=await storage.urlPermanent(key);
  await db.query("UPDATE glow_journeys SET glow_intelligence_report_url=$1,glow_intelligence_report_generated_at=now(),glow_intelligence_report_signature=$2,glow_intelligence_report_sent_at=NULL WHERE journey_id=$3",[reportUrl,sig,id]);
  const mail=MAIL[j.language||"en"]||MAIL.en; const subject=mail.subject;
  const html=`<div style="margin:0;padding:0;background:#f6f3ed;font-family:Inter,Arial,sans-serif;color:#191715;line-height:1.6"><div style="max-width:620px;margin:0 auto;background:#fffdf9"><div style="padding:24px 30px;border-bottom:1px solid #e7e0d4;letter-spacing:.14em;font-size:11px;font-weight:600">GLOW AI™</div><div style="padding:12px 30px 0;text-align:center;color:#8d7547;font-size:11px;letter-spacing:.18em;font-weight:600">GLOW INTELLIGENCE™</div><div style="padding:34px 30px;text-align:center;background:#fbf8f1"><h1 style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:1.1;font-weight:500">${mail.title}</h1></div><div style="padding:32px 30px"><p style="font-size:15px">${mail.complete}</p><p style="font-size:15px;color:#5f5a53">${mail.body}</p><div style="margin:28px 0"><a href="${esc(reportUrl)}" style="display:block;padding:14px 16px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;text-align:center;font-size:13px;font-weight:600;letter-spacing:.04em">DOWNLOAD MY GLOW INTELLIGENCE REPORT →</a></div><div style="border-top:1px solid #e7e0d4;padding-top:20px;font-size:12px;color:#6d675f"><b>Glow Journey ID:</b> ${esc(id)}<br><br>${mail.medical}</div></div></div></div>`;
  const text=`${mail.title}\n\n${mail.complete}\n\n${mail.body}\n\nOpen your report: ${reportUrl}\n\nGlow Journey ID: ${id}`;
  const result=await email.send({from:"GLOW AI <hello@glow-ai.co>",replyTo:"hello@glow-ai.co",to:j.email,subject,html,text});
  if(result?.success===false)throw new Error("Email provider did not accept the Glow Intelligence report.");
  await db.query("UPDATE glow_journeys SET glow_intelligence_report_sent_at=now() WHERE journey_id=$1",[id]);
  return res.json({ok:true,generated:true,sent:true,reportUrl,journeyId:id});
 }catch(error){console.error("Glow Intelligence report generation failed",error);return res.status(500).json({error:"We could not prepare your Glow Intelligence Report yet. Your saved routine is safe — please try again."});}
}