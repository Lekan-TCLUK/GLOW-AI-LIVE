import { ai, db } from "hatchable";
import { VISION_SYSTEM_PROMPT, VISION_PROMPT_VERSION } from "../lib/vision/prompt.js";
import { evaluatePhotoQuality, QUALITY_GATE_VERSION } from "../lib/vision/quality.js";
import { validateObservationPayload } from "../lib/vision/schema.js";
import { validateVisionSafety } from "../lib/vision/safety.js";
import { processVisionObservations } from "../lib/vision/pipeline.js";
import { CALIBRATION_VERSION, CALIBRATION_STATUS } from "../lib/vision/calibration.js";
import { ENGINE_VERSION } from "../lib/engine/scoring.js";
import { RANKING_ENGINE_VERSION } from "../lib/engine/ranking.js";
import { ARCHETYPE_ENGINE_VERSION } from "../lib/engine/archetypes.js";
import { overallBand } from "../lib/engine/status.js";

export const access = "public";
export const methods = ["POST", "OPTIONS"];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

const DIMENSIONS = [
  "radiance",
  "hydration_appearance",
  "evenness",
  "texture",
  "under_eye_appearance",
  "overall_vitality"
];

const LEGACY_KEYS = {
  under_eye_appearance: "under_eye",
  overall_vitality: "vitality"
};

function cleanText(value, max = 240) {
  return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function buildLegacyAnalysis(result, observations) {
  const categories = {};
  for (const dimension of DIMENSIONS) {
    const key = LEGACY_KEYS[dimension] || dimension;
    categories[key] = {
      score: result.scores[dimension],
      observations: Array.isArray(observations.dimensions[dimension]?.notes)
        ? observations.dimensions[dimension].notes.slice(0, 2).map(cleanText)
        : []
    };
  }
  return {
    valid: true,
    categories,
    overall_score: result.scores ? Math.round(DIMENSIONS.reduce((sum, d) => sum + result.scores[d], 0) / DIMENSIONS.length) : 0,
    band: overallBand(Math.round(DIMENSIONS.reduce((sum, d) => sum + result.scores[d], 0) / DIMENSIONS.length)),
    top3: result.top3,
    archetype: result.archetype,
    calibration_version: CALIBRATION_VERSION,
    scoring_version: ENGINE_VERSION,
    ranking_version: RANKING_ENGINE_VERSION,
    archetype_engine_version: ARCHETYPE_ENGINE_VERSION,
    observation_version: VISION_PROMPT_VERSION
  };
}

export default async function (req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const imageData = body.imageData;
  const freeLegalAccepted = body.freeLegalAccepted === true;
  const sessionId = String(body.sessionId || crypto.randomUUID()).slice(0, 128);
  const idempotencyKey = String(req.headers?.["idempotency-key"] || body.idempotencyKey || "").trim().slice(0, 128);
  const requestHash = await sha256(`${sessionId}:${imageData}`);

  if (!freeLegalAccepted) return res.status(400).json({ error: "Please accept the Terms & Conditions and acknowledge the Privacy Policy before continuing." });
  if (!imageData || typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
    return res.status(400).json({ error: "A valid image is required." });
  }
  if (imageData.length > 16 * 1024 * 1024) {
    return res.status(413).json({ error: "Image is too large. Please use a smaller photo." });
  }

  // A session that already owns a Journey has an immutable Day-0 snapshot.
  // Return that snapshot instead of creating a second customer-facing Day-0
  // analysis that could diverge from the Journey, PDF or future Day-30 baseline.
  const existingJourney = await db.query(
    "SELECT journey_id, initial_assessment_id, initial_analysis_json, initial_score FROM glow_journeys WHERE session_id = $1 LIMIT 1",
    [sessionId]
  );
  if (existingJourney.rows[0]) {
    const j = existingJourney.rows[0];
    return res.json({
      sessionId,
      assessmentId: j.initial_assessment_id || null,
      journeyId: j.journey_id,
      analysis: j.initial_analysis_json,
      calibration_version: j.initial_analysis_json?.calibration_version || CALIBRATION_VERSION,
      calibration_status: CALIBRATION_STATUS,
      quality_gate_version: QUALITY_GATE_VERSION,
      vision_version: j.initial_analysis_json?.observation_version || VISION_PROMPT_VERSION,
      scoring_version: j.initial_analysis_json?.scoring_version || ENGINE_VERSION,
      ranking_version: j.initial_analysis_json?.ranking_version || RANKING_ENGINE_VERSION,
      archetype_engine_version: j.initial_analysis_json?.archetype_engine_version || ARCHETYPE_ENGINE_VERSION,
      continuity: true
    });
  }

  if (idempotencyKey) {
    try {
      const existing = await db.query(
        "SELECT request_hash, response_status, response_json FROM glow_idempotency_keys WHERE scope = $1 AND idempotency_key = $2 AND expires_at > now()",
        ["ANALYZE", idempotencyKey]
      );
      if (existing.rows.length) {
        const saved = existing.rows[0];
        if (saved.request_hash !== requestHash) return res.status(409).json({ error: "This idempotency key was already used for a different request." });
        return res.status(Number(saved.response_status || 200)).json(saved.response_json || { error: "Previous request found." });
      }
    } catch (e) {
      console.error("GLOW analyze idempotency lookup error", e);
    }
  }

  const prompt = `${VISION_SYSTEM_PROMPT}\n\nFor this image, first perform the strict quality gate. If the image contains anything other than exactly one visible human face, set quality to REJECT and do not score. Return ONLY valid JSON in this exact shape:\n{"quality":{"status":"PASS|RETRY|REJECT","reason_codes":[],"face_count":1,"subject_type":"HUMAN_FACE","is_screenshot_or_collage":false},"dimensions":{"radiance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"hydration_appearance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"evenness":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"texture":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"under_eye_appearance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"overall_vitality":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]}},"limitations":[]}\nUse only the allowed levels. Notes must describe visible appearance only. If the image cannot support reliable observation, set quality to RETRY or REJECT and do not guess the dimensions.`;

  try {
    const aiResult = await ai.generateText({
      model: "gpt",
      system: VISION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageData } }
      ] }],
      maxSteps: 1,
      purpose: "glow-v1-vision-observation"
    });

    let observations;
    try {
      const text = String(aiResult.text || "").replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      observations = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "The visual assessment could not be read. Please try again." });
    }

    const quality = evaluatePhotoQuality(observations.quality || {});
    if (quality.status !== "PASS") {
      const status = quality.status === "REJECT" ? 422 : 409;
      return res.status(status).json({
        error: quality.status === "REJECT" ? "Please upload a clear, front-facing photo." : "Please retake the photo in clearer, even lighting.",
        quality_status: quality.status,
        reason_codes: quality.reason_codes
      });
    }

    const schema = validateObservationPayload(observations);
    if (!schema.valid) return res.status(502).json({ error: "The visual assessment was incomplete. Please try again." });
    const safety = validateVisionSafety(observations);
    if (!safety.safe) return res.status(502).json({ error: "The visual assessment could not be safely completed. Please try again." });

    const engine = processVisionObservations(observations);
    if (!engine.ok) return res.status(502).json({ error: "The visual assessment could not be completed. Please try again." });

    const overall = Math.round(DIMENSIONS.reduce((sum, d) => sum + engine.scores[d], 0) / DIMENSIONS.length);
    const band = overallBand(overall);
    const analysis = buildLegacyAnalysis({ ...engine, scores: engine.scores }, observations);
    analysis.overall_score = overall;
    analysis.band = band;

    await db.query(
      "INSERT INTO glow_analyses (session_id, overall_score, band, analysis_json, terms_accepted_at) VALUES ($1, $2, $3, $4, now())",
      [sessionId, overall, band, JSON.stringify(analysis)]
    );

    const assessmentInsert = await db.query(
      "INSERT INTO glow_assessments (session_id, assessment_type, assessment_status, assessment_version, vision_version, scoring_version, calibration_version, quality_gate_version, safety_version, photo_quality_status, photo_quality_reason_codes, assessment_confidence, global_limitations, safety_flags, overall_score, overall_band, archetype_code, archetype_match_score, archetype_second_match_score, archetype_gap, archetype_confidence, archetype_engine_version) VALUES ($1,'INITIAL','VALID','assessment-v1','vision-v2',$2,$3,$4,'safety-v1',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id",
      [
        sessionId,
        ENGINE_VERSION,
        CALIBRATION_VERSION,
        quality.status,
        JSON.stringify(quality.reason_codes),
        engine.archetype.confidence === "HIGH" ? "HIGH" : "STANDARD",
        JSON.stringify(Array.isArray(observations.limitations) ? observations.limitations.slice(0, 8).map(cleanText) : []),
        JSON.stringify(safety.flags),
        overall,
        band,
        engine.archetype.archetype_code,
        engine.archetype.match_score,
        engine.archetype.second_match_score,
        engine.archetype.gap,
        engine.archetype.confidence,
        ARCHETYPE_ENGINE_VERSION
      ]
    );

    const assessmentId = assessmentInsert.rows[0]?.id;
    if (!assessmentId) return res.status(500).json({ error: "The assessment could not be saved. Please try again." });

    for (const dimension of DIMENSIONS) {
      await db.query(
        "INSERT INTO glow_dimension_scores (assessment_id, dimension, score, status, observations) VALUES ($1,$2,$3,$4,$5)",
        [assessmentId, dimension, engine.scores[dimension], engine.dimensions[dimension].status, JSON.stringify(engine.dimensions[dimension].observation.notes || [])]
      );
    }
    for (const priority of engine.top3) {
      await db.query(
        "INSERT INTO glow_assessment_priorities (assessment_id, rank, dimension, score) VALUES ($1,$2,$3,$4)",
        [assessmentId, priority.rank, priority.dimension, priority.score]
      );
    }

    const response = {
      sessionId,
      assessmentId,
      analysis,
      calibration_version: CALIBRATION_VERSION,
      calibration_status: CALIBRATION_STATUS,
      quality_gate_version: QUALITY_GATE_VERSION,
      vision_version: VISION_PROMPT_VERSION,
      scoring_version: ENGINE_VERSION,
      ranking_version: RANKING_ENGINE_VERSION,
      archetype_engine_version: ARCHETYPE_ENGINE_VERSION
    };

    if (idempotencyKey) {
      await db.query(
        "INSERT INTO glow_idempotency_keys (scope, idempotency_key, request_hash, response_status, response_json, resource_type, expires_at) VALUES ($1,$2,$3,$4,$5,$6,now()+interval '24 hours') ON CONFLICT (scope,idempotency_key) DO NOTHING",
        ["ANALYZE", idempotencyKey, requestHash, 200, JSON.stringify(response), "glow_assessment"]
      );
    }

    return res.json(response);
  } catch (error) {
    console.error("GLOW V1 analysis error", error);
    return res.status(500).json({ error: "We couldn't analyse that photo right now. Please try again." });
  }
}