import { db } from "hatchable";
import { saveProfile } from "../lib/glow16-intelligence.js";

export const access="public";
export const methods=["GET","OPTIONS"];

function cors(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");}
function validJourney(v){return /^GJ-[A-Z0-9]{8,20}$/.test(String(v||"").toUpperCase());}

export default async function(req,res){
  cors(res);
  if(req.method==="OPTIONS")return res.status(204).send("");
  const journeyId=String(req.query?.journey_id||"").trim().toUpperCase();
  if(!validJourney(journeyId))return res.status(400).json({error:"Enter a valid Glow Journey ID."});
  const j=(await db.query("SELECT payment_status FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[journeyId])).rows[0];
  if(!j)return res.status(404).json({error:"We couldn't find that Glow Journey ID."});
  if(j.payment_status!=="paid")return res.status(402).json({error:"GLOW Intelligence is available with your Personal Glow Plan."});
  const profile=await saveProfile(journeyId);
  if(!profile)return res.status(404).json({error:"Customer intelligence profile not available."});
  return res.json({ok:true,journeyId,profile,version:"GLOW-INTELLIGENCE-1.6"});
}