import { db, browser, storage, scheduler } from "hatchable";
import { enqueueCustomerEmail, processCustomerEmail } from "lib/customer-email.js";
import { ensureAffiliateAttribution } from "lib/affiliate-attribution.js";

export const access="public";
export const methods=["POST"];

const ALLOWED_APP_HOSTS=new Set([
  "glow-ai-v01.hatchable.site",
  "i5g7yz.hatchable.site",
  "glow-ai.io",
  "www.glow-ai.io",
  "glow-ai.co",
  "www.glow-ai.co",
  "app.glow-ai.co",
  "re9vzi.hatchable.site"
]);

function validEmail(v){return /^\S+@\S+\.\S+$/.test(String(v||"").trim());}
const SUPPORTED_LOCALES={en:"en-GB",fr:"fr-FR",es:"es-ES",pt:"pt-PT",de:"de-DE",it:"it-IT"};
function normaliseLanguage(value){const v=String(value||"en").trim().toLowerCase();return SUPPORTED_LOCALES[v]?v:"en";}
function normaliseLocale(language,value){const expected=SUPPORTED_LOCALES[language];const v=String(value||expected).trim();return v===expected?v:expected;}
function base64url(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}

function getAppBaseUrl(req){
  const forwardedHost=String(req.headers?.["x-forwarded-host"]||"").split(",")[0].trim().toLowerCase();
  const host=forwardedHost||String(req.headers?.host||"").split(",")[0].trim().toLowerCase();
  if(!host) return "https://re9vzi.hatchable.site";
  if(!ALLOWED_APP_HOSTS.has(host)) throw new Error("Unrecognised application host");
  return "https://"+host;
}

async function getOrCreateFreeSnapshotPdf(baseUrl,journeyId){
  const key="glow-snapshots/"+encodeURIComponent(journeyId)+"-v16.pdf";
  try{
    const existing=await storage.head(key);
    if(existing?.size){
      return await storage.urlPermanent(key);
    }
  }catch(_){}
  const htmlUrl=baseUrl+"/api/free-report-pdf-html?journey_id="+encodeURIComponent(journeyId);
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const pdf=await browser.pdf(htmlUrl);
      await storage.put(key,pdf,"application/pdf");
      return await storage.urlPermanent(key);
    }catch(error){
      lastError=error;
      if(attempt<2) await new Promise(resolve=>setTimeout(resolve,1200));
    }
  }
  throw new Error("Free snapshot PDF generation failed: "+String(lastError?.message||lastError||"browser timeout"));
}

export default async function(req,res){
 try{
  const sessionId=String(req.body?.sessionId||"").trim();
  const recipient=String(req.body?.email||"").trim().toLowerCase();
  const sendEmail=Boolean(req.body?.sendEmail);
  const referral=String(req.body?.referral||"").trim();
  const language=normaliseLanguage(req.body?.language);
  const locale=normaliseLocale(language,req.body?.locale);
  const termsLanguage=normaliseLanguage(req.body?.termsLanguage||language);
  const privacyLanguage=normaliseLanguage(req.body?.privacyLanguage||language);
  const termsVersion=String(req.body?.termsVersion||("2026-09-17-"+termsLanguage)).slice(0,40);
  const privacyVersion=String(req.body?.privacyVersion||("2026-09-17-"+privacyLanguage)).slice(0,40);
  const suppliedAffiliate=req.body?.affiliate&&typeof req.body.affiliate==="object"?req.body.affiliate:null;
  const suppliedCampaign=req.body?.campaign&&typeof req.body.campaign==="object"?req.body.campaign:null;
  if(!sessionId)return res.status(400).json({error:"Glow Check session is required."});
  if(sendEmail&&!validEmail(recipient))return res.status(400).json({error:"Please enter a valid email address."});

  const baseUrl=getAppBaseUrl(req);
  let journey=(await db.query("SELECT * FROM glow_journeys WHERE session_id = $1 LIMIT 1",[sessionId])).rows[0];
  let analysis;

  if(journey){
   analysis={analysis_json:journey.initial_analysis_json,overall_score:journey.initial_score};
   journey=(await db.query("UPDATE glow_journeys SET language=$1,locale=$2,terms_language=$3,privacy_language=$4,terms_accepted_at=COALESCE(terms_accepted_at,now()),privacy_acknowledged_at=COALESCE(privacy_acknowledged_at,now()),terms_version=COALESCE(terms_version,$5),privacy_version=COALESCE(privacy_version,$6) WHERE id=$7 RETURNING *",[language,locale,termsLanguage,privacyLanguage,termsVersion,privacyVersion,journey.id])).rows[0];
   if(sendEmail&&recipient&&journey.email!==recipient){
    journey=(await db.query("UPDATE glow_journeys SET email=$1 WHERE id=$2 RETURNING *",[recipient,journey.id])).rows[0];
   }
   if(referral&&journey.rewardful_referral!==referral){
    journey=(await db.query("UPDATE glow_journeys SET rewardful_referral=COALESCE(NULLIF($1,''),rewardful_referral) WHERE id=$2 RETURNING *",[referral,journey.id])).rows[0];
   }
  }else{
   const q=await db.query("SELECT * FROM glow_analyses WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1",[sessionId]);
   if(!q.rows[0])return res.status(404).json({error:"Glow Check not found."});
   analysis=q.rows[0];
   const assessment=(await db.query("SELECT id FROM glow_assessments WHERE session_id = $1 AND assessment_type = 'INITIAL' AND assessment_status = 'VALID' ORDER BY created_at DESC LIMIT 1",[sessionId])).rows[0];
   if(!assessment)return res.status(409).json({error:"Your Glow assessment could not be linked. Please run your Glow Check again."});
   const journeyId="GJ-"+crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
   journey=(await db.query("INSERT INTO glow_journeys (journey_id,session_id,email,initial_assessment_id,initial_analysis_json,initial_score,rewardful_referral,language,locale,terms_language,privacy_language,terms_accepted_at,privacy_acknowledged_at,terms_version,privacy_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now(),$12,$13) RETURNING *",[journeyId,sessionId,sendEmail?recipient:null,assessment.id,JSON.stringify(analysis.analysis_json),Number(analysis.overall_score),referral||null,language,locale,termsLanguage,privacyLanguage,termsVersion,privacyVersion])).rows[0];
   await db.query("UPDATE client_survey_responses SET journey_id=$1 WHERE session_id=$2 AND journey_id IS NULL",[journeyId,sessionId]);
  }

  const pdfUrl=await getOrCreateFreeSnapshotPdf(baseUrl,journey.journey_id);

  const rawToken=base64url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash=await sha256(rawToken);
  await db.query("INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'FREE_CONTINUITY',now()+interval '30 days')",[journey.id,tokenHash]);
  const carriedReferral=referral||String(journey.rewardful_referral||"").trim();
  if(carriedReferral){
   await ensureAffiliateAttribution({journeyInternalId:journey.id,referralId:carriedReferral,customerEmail:journey.email,affiliateSnapshot:suppliedAffiliate,campaignSnapshot:suppliedCampaign});
  }
  const continuityUrl=baseUrl+"/continue?t="+encodeURIComponent(rawToken)+(carriedReferral?"&referral="+encodeURIComponent(carriedReferral):"");

  let emailSent=false;
  let emailQueued=false;
  let emailDeliveryId=null;

  if(sendEmail){
   const queued=await enqueueCustomerEmail(journey.journey_id,"EMAIL_FREE_SNAPSHOT",{
    pdf_url:pdfUrl,
    continuity_url:continuityUrl,
    base_url:baseUrl,
    rewardful_referral:carriedReferral||null
   });
   emailSent=Boolean(queued.sent);
   emailQueued=Boolean(queued.queued);
   emailDeliveryId=queued.deliveryId||null;
   if(queued.deliveryId){
    const processed=await processCustomerEmail(queued.deliveryId);
    emailSent=Boolean(processed.sent);
    emailQueued=!emailSent&&Boolean(queued.queued);
   }
   if (journey.email && journey.payment_status !== "paid" && !journey.day30_completed) {
    try {
     const reminderAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
     await scheduler.at(reminderAt.toISOString(), "/api/glow-24h-reminder", {
      name: "glow24-" + journey.journey_id,
      payload: { journeyId: journey.journey_id }
     });
     const reminder72At = new Date(Date.now() + 72 * 60 * 60 * 1000);
     await scheduler.at(reminder72At.toISOString(), "/api/glow-72h-reminder", {
      name: "glow72-" + journey.journey_id,
      payload: { journeyId: journey.journey_id }
     });
    } catch (scheduleError) {
     console.error("24-hour Glow reminder schedule failed", scheduleError);
    }
   }
  }

  return res.json({sessionId,pdfUrl,emailSent,emailQueued,emailDeliveryId,journeyId:journey.journey_id,continuityUrl,affiliateReferralPersisted:Boolean(carriedReferral)});
 }catch(error){
  console.error("Free report generation failed",error);
  return res.status(500).json({error:"We could not prepare your free report. Please try again."});
 }
}