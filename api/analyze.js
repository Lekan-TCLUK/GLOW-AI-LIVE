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
import { GLOW_FLOW_VERSION } from "../lib/engine/flow.js";
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

function normalizeObservationNotes(value) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map(cleanText)
    .filter(note => note.length >= 12)
    .slice(0, 2);
}

function normalizeGlobalLimitations(value) {
  if (typeof value === "string") {
    const note = cleanText(value, 240);
    return note ? [note] : [];
  }
  if (Array.isArray(value)) {
    return value.map(item => cleanText(item, 240)).filter(Boolean).slice(0, 8);
  }
  return [];
}

function parseAiJson(text) {
  const cleaned = String(text || "").replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
  return JSON.parse(cleaned);
}

async function repairMissingObservations(observations, imageData, language) {
  const invalidDimensions = DIMENSIONS.filter(d => {
    const notes = observations?.dimensions?.[d]?.notes;
    if (!Array.isArray(notes)) return true;
    return notes.map(cleanText).filter(x => x.length >= 20).length === 0;
  });
  if (!invalidDimensions.length) return { ok: true, observations, attempted: false };

  const languageName = ({en:"English",fr:"French",es:"Spanish",pt:"European Portuguese",de:"German",it:"Italian"})[language] || "English";
  const repairPrompt = `The GLOW AI Vision assessment below contains scored dimensions with missing or unusable observation notes. Re-examine the supplied image and repair ONLY these observation notes: ${invalidDimensions.join(", ")}. Do not change levels, quality, or any other fields. For each listed dimension return 1-2 specific, visible, client-specific observations grounded in the supplied image. Do not diagnose, infer causes, or use generic filler. Write observations in ${languageName}. Return JSON only in this shape: {"dimensions":{"dimension_key":{"notes":["observation"]}}}.\nExisting levels:\n${JSON.stringify(Object.fromEntries(invalidDimensions.map(d => [d, observations?.dimensions?.[d]?.level || null])))}`;
  try {
    const repaired = await ai.generateText({
      model: "gpt",
      system: VISION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: [
        { type: "text", text: repairPrompt },
        { type: "image_url", image_url: { url: imageData } }
      ] }],
      maxSteps: 1,
      purpose: "glow-v1-vision-observation-repair"
    });
    const parsed = parseAiJson(repaired.text);
    const merged = JSON.parse(JSON.stringify(observations));
    for (const d of invalidDimensions) {
      const notes = parsed?.dimensions?.[d]?.notes;
      if (Array.isArray(notes)) merged.dimensions[d].notes = notes;
    }
    return { ok: true, observations: merged, attempted: true, repaired_dimensions: invalidDimensions };
  } catch (error) {
    return { ok: false, observations, attempted: true, repaired_dimensions: invalidDimensions, error: String(error?.message || error) };
  }
}

function buildLegacyAnalysis(result, observations) {
  const categories = {};
  for (const dimension of DIMENSIONS) {
    const key = LEGACY_KEYS[dimension] || dimension;
    const canonicalNotes = normalizeObservationNotes(result.dimensions?.[dimension]?.observation?.notes);
    const legacyNotes = normalizeObservationNotes(observations.dimensions?.[dimension]?.notes);
    categories[key] = {
      score: result.scores[dimension],
      observations: canonicalNotes.length ? canonicalNotes : legacyNotes
    };
  }
  return {
    valid: true,
    categories,
    overall_score: result.scores ? Math.round(DIMENSIONS.reduce((sum, d) => sum + result.scores[d], 0) / DIMENSIONS.length) : 0,
    band: overallBand(Math.round(DIMENSIONS.reduce((sum, d) => sum + result.scores[d], 0) / DIMENSIONS.length)),
    top3: result.top3,
    archetype: result.archetype,
    flow_version: GLOW_FLOW_VERSION,
    calibration_version: CALIBRATION_VERSION,
    scoring_version: ENGINE_VERSION,
    ranking_version: RANKING_ENGINE_VERSION,
    archetype_engine_version: ARCHETYPE_ENGINE_VERSION,
    observation_version: VISION_PROMPT_VERSION
  };
}

function hasCompleteLegacyObservations(analysis) {
  return DIMENSIONS.every(d => {
    const key = LEGACY_KEYS[d] || d;
    return normalizeObservationNotes(analysis?.categories?.[key]?.observations).length > 0;
  });
}

async function hydrateExistingAnalysis(journey) {
  if (!journey?.initial_assessment_id) return null;
  const rows = await db.query(
    "SELECT dimension, score, observations FROM glow_dimension_scores WHERE assessment_id = $1",
    [journey.initial_assessment_id]
  );
  if (!rows.rows?.length) return null;
  const byDimension = Object.fromEntries(rows.rows.map(row => [row.dimension, row]));
  if (!DIMENSIONS.every(d => normalizeObservationNotes(byDimension[d]?.observations).length > 0)) return null;

  const analysis = JSON.parse(JSON.stringify(journey.initial_analysis_json || {}));
  analysis.categories = analysis.categories || {};
  for (const dimension of DIMENSIONS) {
    const key = LEGACY_KEYS[dimension] || dimension;
    const row = byDimension[dimension];
    analysis.categories[key] = {
      ...(analysis.categories[key] || {}),
      score: Number(row.score),
      observations: normalizeObservationNotes(row.observations)
    };
  }
  analysis.observation_version = VISION_PROMPT_VERSION;
  return analysis;
}

export default async function (req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const language = ["en","fr","es","pt","de","it"].includes(String(body.language||"").toLowerCase()) ? String(body.language).toLowerCase() : "en";
  const locale = ({en:"en-GB",fr:"fr-FR",es:"es-ES",pt:"pt-PT",de:"de-DE",it:"it-IT"})[language];
  const imageData = body.imageData;
  const freeLegalAccepted = body.freeLegalAccepted === true;
  const sessionId = String(body.sessionId || crypto.randomUUID()).slice(0, 128);
  const idempotencyKey = String(req.headers?.["idempotency-key"] || body.idempotencyKey || "").trim().slice(0, 128);
  const requestHash = await sha256(`${sessionId}:${imageData}`);

  if (!freeLegalAccepted) return res.status(400).json({ error: "Please accept the Terms & Conditions and acknowledge the Privacy Policy before continuing." });
  if (!imageData || typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
    return res.status(400).json({ error: "A valid image is required." });
  }
  if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(imageData)) {
    return res.status(415).json({ error: "Please upload a JPEG, PNG, WebP, or GIF image." });
  }
  if (imageData.length > 16 * 1024 * 1024) {
    return res.status(413).json({ error: "Image is too large. Please use a smaller photo." });
  }

  const existingJourney = await db.query(
    "SELECT journey_id, initial_assessment_id, initial_analysis_json, initial_score FROM glow_journeys WHERE session_id = $1 LIMIT 1",
    [sessionId]
  );
  if (existingJourney.rows[0]) {
    const j = existingJourney.rows[0];
    let existingAnalysis = j.initial_analysis_json;
    try {
      const dimensionRows = await db.query(
        "SELECT dimension, score, observations FROM glow_dimension_scores WHERE assessment_id = $1",
        [j.initial_assessment_id]
      );
      const canonical = dimensionRows.rows || [];
      const byDimension = Object.fromEntries(canonical.map(row => [row.dimension, row]));
      const complete = DIMENSIONS.every(d => Array.isArray(byDimension[d]?.observations) && byDimension[d].observations.some(note => String(note || "").trim().length >= 12));
      if (complete) {
        existingAnalysis = JSON.parse(JSON.stringify(existingAnalysis || {}));
        existingAnalysis.categories = existingAnalysis.categories || {};
        for (const dimension of DIMENSIONS) {
          const key = LEGACY_KEYS[dimension] || dimension;
          const row = byDimension[dimension];
          existingAnalysis.categories[key] = {
            ...(existingAnalysis.categories[key] || {}),
            score: Number(row.score),
            observations: row.observations.map(note => cleanText(note)).filter(note => note.length >= 12).slice(0, 2)
          };
        }
        existingAnalysis.observation_version = VISION_PROMPT_VERSION;
        try {
          await db.query(
            "UPDATE glow_journeys SET initial_analysis_json = $1 WHERE journey_id = $2",
            [JSON.stringify(existingAnalysis), j.journey_id]
          );
          await db.query(
            "UPDATE glow_analyses SET analysis_json = $1 WHERE session_id = $2",
            [JSON.stringify(existingAnalysis), sessionId]
          );
        } catch (persistError) {
          console.error("GLOW existing journey observation persistence error", { sessionId, journeyId: j.journey_id, error: String(persistError?.message || persistError) });
        }
      }
    } catch (e) {
      console.error("GLOW existing journey observation hydration error", { sessionId, journeyId: j.journey_id, error: String(e?.message || e) });
    }
    return res.json({
      sessionId,
      assessmentId: j.initial_assessment_id || null,
      journeyId: j.journey_id,
      analysis: existingAnalysis,
      flow_version: existingAnalysis?.flow_version || GLOW_FLOW_VERSION,
      calibration_version: existingAnalysis?.calibration_version || CALIBRATION_VERSION,
      calibration_status: CALIBRATION_STATUS,
      quality_gate_version: QUALITY_GATE_VERSION,
      vision_version: existingAnalysis?.observation_version || VISION_PROMPT_VERSION,
      scoring_version: existingAnalysis?.scoring_version || ENGINE_VERSION,
      ranking_version: existingAnalysis?.ranking_version || RANKING_ENGINE_VERSION,
      archetype_engine_version: existingAnalysis?.archetype_engine_version || ARCHETYPE_ENGINE_VERSION,
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

  const languageInstruction = language === "en" ? "Write EVERY customer-facing observation note in English." : language === "fr" ? "Write EVERY customer-facing observation note in French (français)." : language === "es" ? "Write EVERY customer-facing observation note in Spanish (español)." : language === "pt" ? "Write EVERY customer-facing observation note in European Portuguese (português europeu)." : language === "de" ? "Write EVERY customer-facing observation note in German (Deutsch)." : "Write EVERY customer-facing observation note in Italian (italiano).";
  const prompt = `${VISION_SYSTEM_PROMPT}\n\n${languageInstruction} Keep the JSON keys and enum values exactly as specified; only customer-facing notes should be localized.\n\nFor this image, first perform the strict quality gate. If the image contains anything other than exactly one visible human face, set quality to REJECT and do not score. Return ONLY valid JSON in this exact shape:\n{"quality":{"status":"PASS|RETRY|REJECT","reason_codes":[],"face_count":1,"subject_type":"HUMAN_FACE","is_screenshot_or_collage":false},"dimensions":{"radiance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"hydration_appearance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"evenness":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"texture":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"under_eye_appearance":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]},"overall_vitality":{"level":"VERY_LOW|LOW|MODERATE|HIGH|VERY_HIGH","notes":[]}},"limitations":[]}\nUse only the allowed levels. Notes must describe visible appearance only. If the image cannot support reliable observation, set quality to RETRY or REJECT and do not guess the dimensions.`;

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
      const text = String(aiResult.text || "").replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
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

    let schema = validateObservationPayload(observations);
    let repairAttempted = false;
    if (!schema.valid) {
      const repair = await repairMissingObservations(observations, imageData, language);
      repairAttempted = repair.attempted === true;
      if (!repair.ok) {
        return res.status(502).json({ error: "The visual assessment could not produce complete evidence. Please try again.", code: "OBSERVATION_REPAIR_FAILED" });
      }
      observations = repair.observations;
      schema = validateObservationPayload(observations);
    }
    if (!schema.valid) {
      console.error("GLOW observation contract failed", { sessionId, errors: schema.errors, repairAttempted });
      return res.status(502).json({ error: "The visual assessment could not produce complete evidence. Please try again.", code: "OBSERVATION_CONTRACT_FAILED", details: schema.errors });
    }
    const safety = validateVisionSafety(observations);
    if (!safety.safe) return res.status(502).json({ error: "The visual assessment could not be safely completed. Please try again." });

    const engine = processVisionObservations(observations);
    if (!engine.ok) return res.status(502).json({ error: "The visual assessment could not be completed. Please try again." });

    const overall = Math.round(DIMENSIONS.reduce((sum, d) => sum + engine.scores[d], 0) / DIMENSIONS.length);
    const band = overallBand(overall);
    const analysis = buildLegacyAnalysis({ ...engine, scores: engine.scores }, observations);
    analysis.overall_score = overall;
    analysis.band = band;

    const txStatements = [
      {
        sql: "INSERT INTO glow_analyses (session_id, overall_score, band, analysis_json, terms_accepted_at) VALUES ($1, $2, $3, $4, now())",
        params: [sessionId, overall, band, JSON.stringify(analysis)]
      },
      {
        sql: "INSERT INTO glow_assessments (session_id, assessment_type, assessment_status, assessment_version, vision_version, scoring_version, calibration_version, quality_gate_version, safety_version, photo_quality_status, photo_quality_reason_codes, assessment_confidence, global_limitations, safety_flags, overall_score, overall_band, archetype_code, archetype_match_score, archetype_second_match_score, archetype_gap, archetype_confidence, archetype_engine_version) VALUES ($1,'INITIAL','VALID','assessment-v1','vision-v3',$2,$3,$4,'safety-v1',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id",
        params: [
          sessionId, ENGINE_VERSION, CALIBRATION_VERSION, quality.version, quality.status,
          JSON.stringify(quality.reason_codes),
          engine.archetype.confidence === "HIGH" ? "HIGH" : "STANDARD",
          JSON.stringify(normalizeGlobalLimitations(observations.limitations)),
          JSON.stringify(safety.flags), overall, band,
          engine.archetype.archetype_code, engine.archetype.match_score,
          engine.archetype.second_match_score, engine.archetype.gap,
          engine.archetype.confidence, ARCHETYPE_ENGINE_VERSION
        ]
      }
    ];
    for (const dimension of DIMENSIONS) {
      txStatements.push({
        sql: "INSERT INTO glow_dimension_scores (assessment_id, dimension, score, status, observations) VALUES ((SELECT id FROM glow_assessments WHERE session_id = $1 AND assessment_type = 'INITIAL' ORDER BY created_at DESC LIMIT 1),$2,$3,$4,$5)",
        params: [sessionId, dimension, engine.scores[dimension], engine.dimensions[dimension].status, JSON.stringify(engine.dimensions[dimension].observation.notes || [])]
      });
    }
    for (const priority of engine.top3) {
      txStatements.push({
        sql: "INSERT INTO glow_assessment_priorities (assessment_id, rank, dimension, score) VALUES ((SELECT id FROM glow_assessments WHERE session_id = $1 AND assessment_type = 'INITIAL' ORDER BY created_at DESC LIMIT 1),$2,$3,$4)",
        params: [sessionId, priority.rank, priority.dimension, priority.score]
      });
    }
    const tx = await db.transaction(txStatements);
    const assessmentId = tx.results?.[1]?.rows?.[0]?.id;
    if (!assessmentId) return res.status(500).json({ error: "The assessment could not be saved. Please try again." });

    const response = {
      sessionId,
      assessmentId,
      analysis,
      flow_version: GLOW_FLOW_VERSION,
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