import { db } from "hatchable";
export const access = "public";
export const methods = ["GET"];
function cors(res){res.setHeader("Access-Control-Allow-Origin","*");}
export default async function(req,res){
  cors(res);
  const id=String(req.query?.journey_id||"").trim().toUpperCase();
  if(!/^GJ-[A-Z0-9]{8,20}$/.test(id)) return res.status(400).json({error:"Enter a valid Glow Journey ID."});
  const q=await db.query("SELECT journey_id, email, payment_status, initial_score, initial_analysis_json, day30_completed, day30_score, day30_analysis_json, pdf_url, email_sent_at FROM glow_journeys WHERE journey_id = $1 LIMIT 1",[id]);
  if(!q.rows[0]) return res.status(404).json({error:"We couldn't find that Glow Journey ID."});
  const j=q.rows[0];
  if(j.payment_status!=="paid") return res.status(402).json({error:"This Glow Journey has not been completed as a paid plan."});
  return res.json({journeyId:j.journey_id,email:j.email,initialScore:j.initial_score,initialAnalysis:j.initial_analysis_json,day30Completed:j.day30_completed,day30Score:j.day30_score,day30Analysis:j.day30_analysis_json,pdfUrl:j.pdf_url||null,emailSent:Boolean(j.email_sent_at)});
}