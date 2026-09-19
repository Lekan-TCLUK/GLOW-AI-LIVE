import { db, browser, storage } from "hatchable";
import { enqueueCustomerEmail, processCustomerEmail } from "lib/customer-email.js";

export const access="public";
export const methods=["POST"];

const ALLOWED_APP_HOSTS=new Set([
  "glow-ai-v01.hatchable.site",
  "i5g7yz.hatchable.site",
  "glow-ai.io",
  "www.glow-ai.io"
]);

function validEmail(v){return /^\S+@\S+\.\S+$/.test(String(v||"").trim());}
function base64url(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function getAppBaseUrl(req){
  const forwardedHost=String(req.headers?.["x-forwarded-host"]||"").split(",")[0].trim().toLowerCase();
  const host=forwardedHost||String(req.headers?.host||"").split(",")[0].trim().toLowerCase();
  if(!ALLOWED_APP_HOSTS.has(host)) throw new Error("Unrecognised application host");
  return "https://"+host;
}

export default async function(req,res){
 try{
  const sessionId=String(req.body?.sessionId||"").trim();
  const recipient=String(req.body?.email||"").trim().toLowerCase();
  const sendEmail=Boolean(req.body?.sendEmail);
  if(!sessionId)return res.status(400).json({error:"Glow Check session is required."});
  if(sendEmail&&!validEmail(recipient))return res.status(400).json({error:"Please enter a valid email address."});

  const baseUrl=getAppBaseUrl(req);
  let journey=(await db.query("SELECT * FROM glow_journeys WHERE session_id = $1 LIMIT 1",[sessionId])).rows[0];
  let analysis;

  if(journey){
   analysis={analysis_json:journey.initial_analysis_json,overall_score:journey.initial_score};
   if(sendEmail && journey.email !== recipient){
    journey=(await db.query("UPDATE glow_journeys SET email=$1 WHERE id=$2 RETURNING *",[recipient,journey.id])).rows[0];
   }
  }else{
   const q=await db.query("SELECT * FROM glow_analyses WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1",[sessionId]);
   if(!q.rows[0])return res.status(404).json({error:"Glow Check not found."});
   analysis=q.rows[0];
   const assessment=(await db.query("SELECT id FROM glow_assessments WHERE session_id = $1 AND assessment_type = 'INITIAL' AND assessment_status = 'VALID' ORDER BY created_at DESC LIMIT 1",[sessionId])).rows[0];
   if(!assessment)return res.status(409).json({error:"Your Glow assessment could not be linked. Please run your Glow Check again."});
   const journeyId="GJ-"+crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
   journey=(await db.query("INSERT INTO glow_journeys (journey_id,session_id,email,initial_assessment_id,initial_analysis_json,initial_score) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",[journeyId,sessionId,sendEmail?recipient:null,assessment.id,JSON.stringify(analysis.analysis_json),Number(analysis.overall_score)])).rows[0];
  }

  const url=baseUrl+"/api/free-report-html?journey_id="+encodeURIComponent(journey.journey_id);
  const pdf=await browser.pdf(url);
  const key="glow-snapshots/"+encodeURIComponent(journey.journey_id)+".pdf";
  const pdfUrl=await storage.put(key,pdf,"application/pdf");

  const rawToken=base64url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash=await sha256(rawToken);
  await db.query("INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'FREE_CONTINUITY',now()+interval '30 days')",[journey.id,tokenHash]);
  const continuityUrl=baseUrl+"/continue?t="+encodeURIComponent(rawToken);

  let emailSent=false;
  let emailQueued=false;
  let emailDeliveryId=null;

  if(sendEmail){
   const queued=await enqueueCustomerEmail(journey.journey_id,"EMAIL_FREE_SNAPSHOT",{
    pdf_url:pdfUrl,
    continuity_url:continuityUrl,
    base_url:baseUrl
   });
   emailSent=Boolean(queued.sent);
   emailQueued=Boolean(queued.queued);
   emailDeliveryId=queued.deliveryId||null;

   if(emailQueued){
    const processed=await processCustomerEmail(emailDeliveryId);
    emailSent=Boolean(processed.sent);
    emailQueued=!emailSent;
   }
  }

  return res.json({
   sessionId,
   pdfUrl,
   emailSent,
   emailQueued,
   emailDeliveryId,
   journeyId:journey.journey_id,
   continuityUrl
  });
 }catch(error){
  console.error("Free report generation failed",error);
  return res.status(500).json({error:"We could not prepare your free report. Please try again."});
 }
}