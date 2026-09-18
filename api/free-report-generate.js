import { db, browser, storage, email } from "hatchable";
export const access="public";
export const methods=["POST"];
function validEmail(v){return /^\S+@\S+\.\S+$/.test(String(v||"").trim());}
function base64url(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}
async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
function esc(s){return String(s??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
export default async function(req,res){
 const sessionId=String(req.body?.sessionId||"").trim(); const recipient=String(req.body?.email||"").trim().toLowerCase(); const sendEmail=Boolean(req.body?.sendEmail);
 if(!sessionId)return res.status(400).json({error:"Glow Check session is required."});
 if(sendEmail&&!validEmail(recipient))return res.status(400).json({error:"Please enter a valid email address."});
 let journey=(await db.query("SELECT * FROM glow_journeys WHERE session_id = $1 LIMIT 1",[sessionId])).rows[0];
 let analysis;
 if(journey){
  // Once a Journey exists, its Day-0 snapshot is authoritative. Never regenerate
  // a customer-facing report from a later analysis created with the same session.
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
 const url="https://glow-ai-v01.hatchable.site/api/free-report-html?journey_id="+encodeURIComponent(journey.journey_id);
 const pdf=await browser.pdf(url);
 const key="glow-snapshots/"+encodeURIComponent(journey.journey_id)+".pdf";
 const pdfUrl=await storage.put(key,pdf,"application/pdf");
 const rawToken=base64url(crypto.getRandomValues(new Uint8Array(32)));
 const tokenHash=await sha256(rawToken);
 await db.query("INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'FREE_CONTINUITY',now()+interval '30 days')",[journey.id,tokenHash]);
 const continuityUrl="https://glow-ai-v01.hatchable.site/continue?t="+encodeURIComponent(rawToken);
 let emailSent=false;
 if(sendEmail){
  await email.send({to:recipient,subject:"Your GLOW AI™ Glow Snapshot is ready ✨",html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#191715"><h1 style="font-family:Georgia,serif">Your GLOW Snapshot™ is ready.</h1><p>Your private Glow Snapshot has been prepared from your Glow Check.</p><p><b>Glow Journey ID:</b> ${esc(journey.journey_id)}</p><p><a href="${pdfUrl}" style="display:inline-block;padding:13px 18px;background:#191715;color:#fff;text-decoration:none;border-radius:999px">VIEW MY GLOW SNAPSHOT</a></p><p style="margin-top:18px"><a href="${continuityUrl}" style="display:inline-block;padding:13px 18px;background:#C4A66A;color:#191715;text-decoration:none;border-radius:999px">CONTINUE MY GLOW JOURNEY</a></p><p>When you're ready, you can continue from your existing results and unlock your Personal Glow Plan™ — no new selfie or analysis required.</p><p style="font-size:12px;color:#6d675f">This private link gives access to your Glow Journey. Please keep it secure. Your plan is based on visible appearance characteristics and is not a medical assessment.</p><p>SEE YOUR GLOW. START YOUR JOURNEY.</p></div>`});
  emailSent=true;
 }
 return res.json({sessionId,pdfUrl,emailSent,journeyId:journey.journey_id,continuityUrl});
}