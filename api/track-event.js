import { recordFunnelEvent } from "../lib/funnel-events.js";

export const access="public";
export const methods=["POST","OPTIONS"];

const cors=res=>{res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");};

export default async function(req,res){
  cors(res);
  if(req.method==="OPTIONS")return res.status(204).send("");
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const b=req.body||{};
  const eventName=String(b.eventName||"").trim();
  const eventId=String(b.eventId||"").trim();
  const sessionId=String(b.sessionId||"").trim();
  const journeyId=String(b.journeyId||"").trim();
  const properties=b.properties&&typeof b.properties==="object"&&!Array.isArray(b.properties)?b.properties:{};
  if(!eventName)return res.status(400).json({error:"eventName is required"});
  if(eventId.length>128||sessionId.length>128||journeyId.length>40)return res.status(400).json({error:"Invalid event identifiers"});
  if(JSON.stringify(properties).length>8000)return res.status(413).json({error:"Event properties are too large"});
  try{
    const result=await recordFunnelEvent({eventName,eventId:eventId||crypto.randomUUID(),sessionId:sessionId||null,journeyId:journeyId||null,properties,source:"client"});
    return res.json({ok:true,created:result.created,eventId:result.eventId});
  }catch(error){
    if(String(error?.message||"").includes("Unsupported funnel event"))return res.status(400).json({error:"Unsupported funnel event"});
    console.error("Funnel event recording failed",error);
    return res.status(500).json({error:"Funnel event could not be recorded"});
  }
}