import { db, browser, storage, email } from "hatchable";
export const access="public";
export const methods=["POST"];
function validEmail(v){return /^\S+@\S+\.\S+$/.test(String(v||"").trim());}
export default async function(req,res){
 const sessionId=String(req.body?.sessionId||"").trim(); const recipient=String(req.body?.email||"").trim(); const sendEmail=Boolean(req.body?.sendEmail);
 if(!sessionId)return res.status(400).json({error:"Glow Check session is required."});
 if(sendEmail&&!validEmail(recipient))return res.status(400).json({error:"Please enter a valid email address."});
 const q=await db.query("SELECT * FROM glow_analyses WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1",[sessionId]);
 if(!q.rows[0])return res.status(404).json({error:"Glow Check not found."});
 const url="https://glow-ai-v01.hatchable.site/api/free-report-html?session_id="+encodeURIComponent(sessionId);
 const pdf=await browser.pdf(url);
 const key="glow-snapshots/"+encodeURIComponent(sessionId)+".pdf";
 const pdfUrl=await storage.put(key,pdf,"application/pdf");
 let emailSent=false;
 if(sendEmail){
  await email.send({to:recipient,subject:"Your GLOW AI™ Glow Snapshot",html:`<p>Your GLOW AI™ Glow Snapshot is ready.</p><p><a href="${pdfUrl}">Open your free Glow Snapshot PDF</a></p><p>Your starting Glow Score and Top 3 priorities are included in the report.</p><p>SEE YOUR GLOW. START YOUR JOURNEY.</p>`});
  emailSent=true;
 }
 return res.json({sessionId,pdfUrl,emailSent});
}