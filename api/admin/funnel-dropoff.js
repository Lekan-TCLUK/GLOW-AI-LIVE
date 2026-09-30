import { db } from "hatchable";

export const access = "admin";
export const methods = ["GET"];

const MILESTONES = [
  "landing_view",
  "start_glow_check",
  "photo_selected",
  "photo_confirmed",
  "analysis_started",
  "analysis_success",
  "analysis_rejected",
  "survey_started",
  "survey_completed",
  "glow_profile_reached",
  "free_report_started",
  "free_report_generated",
  "free_report_delivered"
];

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function safeJson(value) {
  if (!value || typeof value !== "object") return {};
  return value;
}

export default async function(req, res) {
  const hours = clampInt(req.query?.hours, 24, 1, 720);
  const sessionLimit = clampInt(req.query?.limit, 100, 1, 500);
  const source = String(req.query?.source || "").trim().slice(0, 40) || null;
  const params = [hours, source, sessionLimit];

  const summary = await db.query(`
    WITH events AS (
      SELECT e.id,e.session_id,e.event_name,e.event_properties,e.created_at,
             ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.created_at DESC,e.id DESC) AS rn
      FROM glow_events e
      WHERE e.created_at >= now() - ($1 * interval '1 hour')
        AND e.session_id IS NOT NULL AND NULLIF(TRIM(e.session_id),'') IS NOT NULL
        AND ($2::text IS NULL OR COALESCE(e.event_properties->>'source','')=$2::text)
    ),
    sessions AS (SELECT DISTINCT session_id FROM events),
    latest AS (
      SELECT session_id,event_name AS last_event
      FROM events WHERE rn=1
    )
    SELECT
      (SELECT COUNT(*) FROM sessions)::int AS instrumented_sessions,
      (SELECT COUNT(DISTINCT session_id) FROM events WHERE event_name='landing_view')::int AS landing_sessions,
      (SELECT COUNT(*) FROM sessions WHERE session_id NOT IN
        (SELECT DISTINCT session_id FROM events WHERE event_name='landing_view'))::int AS sessions_without_landing
  `, params);

  const funnel = await db.query(`
    WITH sessions AS (
      SELECT DISTINCT session_id FROM glow_events e
      WHERE e.created_at >= now() - ($1 * interval '1 hour')
        AND e.session_id IS NOT NULL AND NULLIF(TRIM(e.session_id),'') IS NOT NULL
        AND ($2::text IS NULL OR COALESCE(e.event_properties->>'source','')=$2::text)
    )
    SELECT event_name,COUNT(DISTINCT e.session_id)::int AS sessions
    FROM glow_events e JOIN sessions s ON s.session_id=e.session_id
    WHERE e.created_at >= now() - ($1 * interval '1 hour')
    GROUP BY event_name
    ORDER BY array_position(ARRAY[
      'landing_view','start_glow_check','photo_selected','photo_confirmed','analysis_started',
      'analysis_success','analysis_rejected','survey_started','survey_completed',
      'glow_profile_reached','free_report_started','free_report_generated','free_report_delivered'
    ]::text[],event_name)
  `, params);

  const lastEvents = await db.query(`
    WITH ranked AS (
      SELECT e.session_id,e.event_name,e.created_at,
             ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.created_at DESC,e.id DESC) AS rn
      FROM glow_events e
      WHERE e.created_at >= now() - ($1 * interval '1 hour')
        AND e.session_id IS NOT NULL AND NULLIF(TRIM(e.session_id),'') IS NOT NULL
        AND ($2::text IS NULL OR COALESCE(e.event_properties->>'source','')=$2::text)
    )
    SELECT event_name AS last_event,COUNT(*)::int AS sessions
    FROM ranked WHERE rn=1 GROUP BY event_name ORDER BY sessions DESC,last_event
  `, params);

  const reasons = await db.query(`
    SELECT COALESCE(reason_code,'UNKNOWN') AS reason_code,quality_status,
           COUNT(DISTINCT session_id)::int AS sessions,COUNT(*)::int AS events
    FROM (
      SELECT e.session_id,e.event_properties->>'quality_status' AS quality_status,
             jsonb_array_elements_text(
               CASE WHEN jsonb_typeof(e.event_properties->'reason_codes')='array'
               THEN e.event_properties->'reason_codes' ELSE '[]'::jsonb END
             ) AS reason_code
      FROM glow_events e
      WHERE e.created_at >= now() - ($1 * interval '1 hour')
        AND e.event_name='analysis_rejected' AND e.session_id IS NOT NULL
        AND ($2::text IS NULL OR COALESCE(e.event_properties->>'source','')=$2::text)
    ) x
    GROUP BY quality_status,reason_code ORDER BY events DESC,reason_code
  `, params);

  const attribution = await db.query(`
    SELECT COALESCE(NULLIF(TRIM(s.utm_source),''),'(not captured)') AS utm_source,
           COALESCE(NULLIF(TRIM(s.utm_medium),''),'(not captured)') AS utm_medium,
           COALESCE(NULLIF(TRIM(s.utm_campaign),''),'(not captured)') AS utm_campaign,
           COUNT(DISTINCT s.session_id)::int AS survey_sessions
    FROM client_survey_responses s
    WHERE s.created_at >= now() - ($1 * interval '1 hour')
      AND s.session_id IS NOT NULL
    GROUP BY 1,2,3 ORDER BY survey_sessions DESC,utm_source,utm_campaign LIMIT 100
  `, [hours]);

  const sessionRows = await db.query(`
    WITH ranked AS (
      SELECT e.session_id,e.event_name,e.event_properties,e.created_at,
             ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.created_at DESC,e.id DESC) AS rn
      FROM glow_events e
      WHERE e.created_at >= now() - ($1 * interval '1 hour')
        AND e.session_id IS NOT NULL AND NULLIF(TRIM(e.session_id),'') IS NOT NULL
        AND ($2::text IS NULL OR COALESCE(e.event_properties->>'source','')=$2::text)
    ),
    flags AS (
      SELECT session_id,MAX(created_at) AS last_event_at,
        BOOL_OR(event_name='landing_view') AS landing_view,
        BOOL_OR(event_name='start_glow_check') AS start_glow_check,
        BOOL_OR(event_name='photo_selected') AS photo_selected,
        BOOL_OR(event_name='photo_confirmed') AS photo_confirmed,
        BOOL_OR(event_name='analysis_started') AS analysis_started,
        BOOL_OR(event_name='analysis_success') AS analysis_success,
        BOOL_OR(event_name='analysis_rejected') AS analysis_rejected,
        BOOL_OR(event_name='survey_started') AS survey_started,
        BOOL_OR(event_name='survey_completed') AS survey_completed,
        BOOL_OR(event_name='glow_profile_reached') AS glow_profile_reached,
        BOOL_OR(event_name='free_report_started') AS free_report_started,
        BOOL_OR(event_name='free_report_generated') AS free_report_generated,
        BOOL_OR(event_name='free_report_delivered') AS free_report_delivered
      FROM ranked GROUP BY session_id
    )
    SELECT r.session_id,r.event_name AS last_event,r.created_at AS last_event_at,
           r.event_properties AS last_event_properties,f.*
    FROM ranked r JOIN flags f ON f.session_id=r.session_id
    WHERE r.rn=1 ORDER BY r.created_at DESC LIMIT $3
  `, params);

  const rows = sessionRows.rows.map(row => {
    const last = String(row.last_event || "");
    const next = {
      landing_view:"start_glow_check",
      start_glow_check:"photo_selected",
      photo_selected:"photo_confirmed",
      photo_confirmed:"analysis_started",
      analysis_started:"analysis_success (or analysis_rejected/RETRY)",
      analysis_success:"survey_started",
      analysis_rejected:"analysis_started / retake",
      survey_started:"survey_completed",
      survey_completed:"glow_profile_reached",
      glow_profile_reached:"free_report_started",
      free_report_started:"free_report_generated",
      free_report_generated:"free_report_delivered",
      free_report_delivered:null
    }[last] ?? null;
    const p = safeJson(row.last_event_properties);
    return {
      session_id:row.session_id,
      last_event:last,
      last_event_at:row.last_event_at,
      next_expected_milestone:next,
      analysis_quality_status:p.quality_status||null,
      analysis_reason_codes:Array.isArray(p.reason_codes)?p.reason_codes:[],
      source:p.source||null,
      milestones:Object.fromEntries(MILESTONES.map(name=>[name,Boolean(row[name])]))
    };
  });

  const counts=Object.fromEntries(funnel.rows.map(r=>[r.event_name,Number(r.sessions)]));
  const landing=Number(summary.rows[0]?.landing_sessions||0);

  res.json({
    ok:true,
    generated_at:new Date().toISOString(),
    window:{hours,since:new Date(Date.now()-hours*3600*1000).toISOString()},
    population:{
      definition:"Instrumented funnel sessions with a non-empty session_id.",
      instrumented_sessions:Number(summary.rows[0]?.instrumented_sessions||0),
      landing_sessions:landing,
      sessions_without_landing:Number(summary.rows[0]?.sessions_without_landing||0)
    },
    funnel:MILESTONES.map((eventName,index)=>{
      const sessions=Number(counts[eventName]||0);
      let previous=index===0?landing:Number(counts[MILESTONES[index-1]]||0);
      let dropSessions=Math.max(previous-sessions,0);
      let dropPct=previous?Number((dropSessions/previous*100).toFixed(2)):0;
      if(eventName==="analysis_rejected"){
        return {
          event:eventName,
          sessions,
          conversion_from_landing_pct:landing?Number((sessions/landing*100).toFixed(2)):0,
          branch_from:"analysis_started",
          branch_rate_from_analysis_started_pct:Number((Number(counts.analysis_started||0)?sessions/Number(counts.analysis_started)*100:0).toFixed(2)),
          drop_off_from_previous_sessions:null,
          drop_off_from_previous_pct:null,
          note:"Alternative analysis outcome; not counted as sequential funnel drop-off."
        };
      }
      if(eventName==="survey_started"){
        previous=Number(counts.analysis_success||0);
        dropSessions=Math.max(previous-sessions,0);
        dropPct=previous?Number((dropSessions/previous*100).toFixed(2)):0;
      }
      if(eventName==="analysis_success"){
        const rejected=Number(counts.analysis_rejected||0);
        const started=Number(counts.analysis_started||0);
        dropSessions=Math.max(started-sessions-rejected,0);
        dropPct=started?Number((dropSessions/started*100).toFixed(2)):0;
      }
      return {
        event:eventName,
        sessions,
        conversion_from_landing_pct:landing?Number((sessions/landing*100).toFixed(2)):0,
        drop_off_from_previous_sessions:dropSessions,
        drop_off_from_previous_pct:dropPct
      };
    }),
    analysis_outcomes:{
      analysis_started:Number(counts.analysis_started||0),
      analysis_success:Number(counts.analysis_success||0),
      analysis_rejected:Number(counts.analysis_rejected||0),
      unclassified_after_analysis:Math.max(Number(counts.analysis_started||0)-Number(counts.analysis_success||0)-Number(counts.analysis_rejected||0),0)
    },
    last_observed_event:lastEvents.rows,
    analysis_rejection_reasons:reasons.rows,
    attribution:{
      source:"client_survey_responses",
      note:"UTM attribution is available only for sessions that submitted the survey. Country, device, and browser are not currently persisted in glow_events.",
      rows:attribution.rows
    },
    sessions:rows
  });
}