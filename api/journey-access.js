import { db, browser, storage } from "hatchable";
export const access = "public";
export const methods = ["GET"];
function cors(res){res.setHeader("Access-Control-Allow-Origin","*");}
export default async function(req,res){
  cors(res);
  const id=String(req.query?.journey_id||"").trim().toUpperCase();
  if(!/^GJ-[A-Z0-9]{8,20}$/.test(id)) return res.status(400).json({error:"Enter a valid Glow Journey ID."});
  const q=await db.query("SELECT journey_id, email, payment_status, initial_score, initial_analysis_json, day30_completed, day30_score, day30_analysis_json, pdf_url, email_sent_at, language, locale FROM glow_journeys WHERE journey_id = $1 LIMIT 1",[id]);
  if(!q.rows[0]) return res.status(404).json({error:"We couldn't find that Glow Journey ID."});
  const j=q.rows[0];
  if(j.payment_status!=="paid") return res.status(402).json({error:"This Glow Journey has not been completed as a paid plan."});
  let pdfUrl=j.pdf_url||null;
  if(pdfUrl && j.plan_version !== "PAID-REPORT-V2") pdfUrl=null;
  if(!pdfUrl){
    const htmlUrl="https://glow-ai-v01.hatchable.site/api/report-html?journey_id="+encodeURIComponent(j.journey_id);
    const pdf=await browser.pdf(htmlUrl);
    pdfUrl=await storage.put("glow-plans/"+j.journey_id+".pdf",pdf,"application/pdf");
    await db.query("UPDATE glow_journeys SET pdf_url=$1, plan_version='PAID-REPORT-V2' WHERE journey_id=$2",[pdfUrl,j.journey_id]);
  }
  return res.json({journeyId:j.journey_id,email:j.email,initialScore:j.initial_score,initialAnalysis:j.initial_analysis_json,day30Completed:j.day30_completed,day30Score:j.day30_score,day30Analysis:j.day30_analysis_json,pdfUrl,emailSent:Boolean(j.email_sent_at),language:j.language||"en",locale:j.locale||"en-GB"});
}