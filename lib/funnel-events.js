import { db } from "hatchable";

export const FUNNEL_EVENTS = new Set([
  "landing_view","start_glow_check","photo_selected","photo_confirmed","analysis_started","analysis_success","analysis_rejected",
  "survey_started","survey_completed","glow_profile_reached","free_report_started","free_report_generated","free_report_delivered"
]);

export async function recordFunnelEvent({eventName,eventId,sessionId=null,journeyId=null,properties={},source="server"}){
  if(!FUNNEL_EVENTS.has(String(eventName||""))) throw new Error("Unsupported funnel event");
  const safeSession=String(sessionId||"").trim().slice(0,128)||null;
  const safeJourneyText=String(journeyId||"").trim().toUpperCase().slice(0,40)||null;
  const safeEventId=String(eventId||crypto.randomUUID()).trim().slice(0,128);
  const safeSource=String(source||"server").trim().slice(0,24);
  const safeProperties=properties&&typeof properties==="object"&&!Array.isArray(properties)?properties:{};
  const journeyRows=safeJourneyText?await db.query("SELECT id FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[safeJourneyText]):{rows:[]};
  const internalJourneyId=journeyRows.rows?.[0]?.id||null;
  const result=await db.query(
    "INSERT INTO glow_events (event_id,session_id,journey_id,event_name,event_properties) VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (event_id) DO NOTHING RETURNING id",
    [safeEventId,safeSession,internalJourneyId,String(eventName),JSON.stringify({...safeProperties,source:safeSource,event_id:safeEventId})]
  );
  return {created:Boolean(result.rows?.[0]),eventId:safeEventId};
}