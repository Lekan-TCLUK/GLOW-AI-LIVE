import { db } from "hatchable";
import { enqueueCustomerEmail, processCustomerEmail } from "lib/customer-email.js";

export const access="public";
export const methods=["POST","OPTIONS"];

function cors(res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
}

export default async function(req,res){
  cors(res);
  if(req.method==="OPTIONS") return res.status(204).send("");
  const journeyId=String(req.body?.journeyId||"").trim().toUpperCase();
  const suppliedEmail=String(req.body?.email||"").trim().toLowerCase();
  if(!/^GJ-[A-Z0-9]{8,20}$/.test(journeyId)) return res.status(400).json({error:"A valid Glow Journey ID is required."});
  const q=await db.query("SELECT id,journey_id,email,payment_status,pdf_url FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[journeyId]);
  const j=q.rows[0];
  if(!j||j.payment_status!=="paid") return res.status(403).json({error:"We could not verify this Glow Journey."});
  const email=String(j.email||suppliedEmail||"").trim().toLowerCase();
  if(!email) return res.status(400).json({error:"No customer email is attached to this Glow Journey."});
  try{
    const existing=await db.query("SELECT id,status FROM glow_delivery_events WHERE journey_id=$1 AND delivery_type='EMAIL_PDF' LIMIT 1",[j.id]);
    if(existing.rows[0]) await db.query("UPDATE glow_delivery_events SET status='FAILED',failure_reason=$1 WHERE id=$2",["Customer requested a paid report resend.",existing.rows[0].id]);
    const queued=await enqueueCustomerEmail(journeyId,"EMAIL_PDF");
    if(!queued.deliveryId) return res.json({ok:true,sent:Boolean(queued.sent),pdfUrl:j.pdf_url||null});
    const sent=await processCustomerEmail(queued.deliveryId);
    return res.json({ok:true,sent:Boolean(sent?.sent),pdfUrl:j.pdf_url||null});
  }catch(e){
    console.error("Paid report resend failed",e);
    return res.status(500).json({error:"We could not resend the report email yet. Please try again."});
  }
}