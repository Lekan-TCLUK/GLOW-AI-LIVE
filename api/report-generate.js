import { db, browser, storage } from "hatchable";
export const access="public";
export const methods=["POST"];
function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");}
export default async function(req,res){
 cors(res); if(req.method==="OPTIONS")return res.status(204).send("");
 const id=String(req.body?.journeyId||"").trim().toUpperCase(); if(!id)return res.status(400).json({error:"Journey ID is required."});
 const q=await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1",[id]); if(!q.rows[0])return res.status(404).json({error:"Glow Journey not found."}); const j=q.rows[0]; if(j.payment_status!=="paid")return res.status(402).json({error:"Payment is required before generating your plan."});
 if(j.pdf_url && j.plan_version === "PAID-REPORT-V2")return res.json({journeyId:id,pdfUrl:j.pdf_url});
 try{
  const url="https://glow-ai-v01.hatchable.site/api/report-html?journey_id="+encodeURIComponent(id);
  const pdf=await browser.pdf(url);
  const pdfUrl=await storage.put("glow-plans/"+id+".pdf",pdf,"application/pdf");
  await db.query("UPDATE glow_journeys SET pdf_url=$1, plan_version='PAID-REPORT-V2' WHERE journey_id=$2",[pdfUrl,id]);
  return res.json({journeyId:id,pdfUrl});
 }catch(e){console.error("PDF generation error",e);return res.status(500).json({error:"We couldn't generate your Glow Plan PDF yet. Please try again."});}
}