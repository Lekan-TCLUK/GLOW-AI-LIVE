import { db } from "hatchable";
export const access="public";
export const methods=["GET"];
function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Referrer-Policy","no-referrer");}
async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
export default async function(req,res){
 cors(res);
 const token=String(req.query?.t||"").trim();
 if(!token||token.length<40)return res.status(400).json({error:"This Glow Journey link is invalid or incomplete."});
 try{
  const tokenHash=await sha256(token);
  const q=await db.query("SELECT j.journey_id,j.email,j.payment_status,j.initial_score,j.initial_analysis_json,j.pdf_url,j.id,j.language,j.locale FROM glow_access_tokens t JOIN glow_journeys j ON j.id=t.journey_id WHERE t.token_hash=$1 AND t.token_type IN ('FREE_CONTINUITY','PAID_CONTINUITY') AND t.revoked_at IS NULL AND t.expires_at>now() LIMIT 1",[tokenHash]);
  if(!q.rows[0])return res.status(404).json({error:"This Glow Journey link has expired or is no longer available. Please request a new link."});
  const j=q.rows[0];
  return res.json({journeyId:j.journey_id,email:j.email||"",paymentStatus:j.payment_status,initialScore:j.initial_score,initialAnalysis:j.initial_analysis_json,pdfUrl:j.pdf_url||null,language:j.language||"en",locale:j.locale||"en-GB"});
 }catch(e){console.error("Continuity error",e);return res.status(500).json({error:"We couldn't open your Glow Journey right now. Please try again."});}
}