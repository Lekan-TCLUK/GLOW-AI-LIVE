import { db } from "hatchable";

export const access = "public";
export const methods = ["GET", "OPTIONS"];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

function cleanNotes(value) {
  return (Array.isArray(value) ? value : [])
    .map(v => String(v || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim())
    .filter(v => v.length >= 12)
    .slice(0, 2);
}

export default async function(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const assessmentId = String(req.query?.assessment_id || "").trim();
  if (!assessmentId || assessmentId.length > 128) {
    return res.status(400).json({ error: "A valid assessment ID is required." });
  }

  try {
    const result = await db.query(
      "SELECT dimension, score, observations FROM glow_dimension_scores WHERE assessment_id = $1",
      [assessmentId]
    );

    const observations = {};
    for (const dimension of DIMENSIONS) {
      const row = result.rows.find(r => r.dimension === dimension);
      observations[LEGACY_KEYS[dimension] || dimension] = {
        score: Number(row?.score || 0),
        observations: cleanNotes(row?.observations)
      };
    }

    return res.json({
      assessmentId,
      complete: DIMENSIONS.every(d => observations[LEGACY_KEYS[d] || d]?.observations?.length > 0),
      observations
    });
  } catch (error) {
    console.error("GLOW assessment observations error", error);
    return res.status(500).json({ error: "Assessment observations could not be retrieved." });
  }
}