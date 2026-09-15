import { ai, db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

const weights = {
  radiance: 0.20,
  hydration_appearance: 0.15,
  evenness: 0.15,
  texture: 0.15,
  under_eye: 0.15,
  vitality: 0.20
};

function band(score) {
  if (score >= 85) return "Exceptional Glow";
  if (score >= 70) return "Strong Glow";
  if (score >= 55) return "Developing Glow";
  if (score >= 40) return "Glow Reset";
  return "Glow Reboot";
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

export default async function (req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = req.body || {};
  const imageData = body.imageData;
  const sessionId = String(body.sessionId || crypto.randomUUID());
  if (!imageData || typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
    return res.status(400).json({ error: "A valid image is required." });
  }
  if (imageData.length > 16 * 1024 * 1024) {
    return res.status(413).json({ error: "Image is too large. Please use a smaller photo." });
  }

  const system = `You are GLOW AI, a beauty and wellness appearance assistant. Analyze ONLY visible, non-sensitive facial appearance characteristics in the supplied photo. Do not diagnose medical conditions. Do not infer age, race, ethnicity, gender, hormones, nutrition deficiencies, diseases, or other sensitive traits. Do not claim to measure hydration, health, collagen, biological age, or internal cellular status from a photo. Use wording such as apparent, visible, or appears. Return ONLY valid JSON matching the requested schema.`;
  const prompt = `Analyze this selfie for a consumer beauty experience. If the image is unsuitable (no clear face, extreme blur, sunglasses/face obstruction, or no person), return {"valid":false,"reason":"..."}. Otherwise return exactly this JSON shape: {"valid":true,"categories":{"radiance":{"score":0,"observations":["..."]},"hydration_appearance":{"score":0,"observations":["..."]},"evenness":{"score":0,"observations":["..."]},"texture":{"score":0,"observations":["..."]},"under_eye":{"score":0,"observations":["..."]},"vitality":{"score":0,"observations":["..."]}},"overall_summary":"..."}. Scores are 0-100 estimates of visible appearance only. Give 1-2 concise observations per category. Keep recommendations out of this response. Avoid medical claims.`;

  try {
    const result = await ai.generateText({
      model: "gpt",
      system,
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageData } }
      ] }],
      maxSteps: 1,
      purpose: "glow-v02-vision-analysis"
    });

    let parsed;
    try {
      parsed = JSON.parse(result.text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim());
    } catch {
      return res.status(502).json({ error: "The AI returned an invalid analysis. Please try again." });
    }
    if (!parsed.valid) return res.status(422).json({ error: parsed.reason || "Please upload a clearer front-facing photo." });

    for (const key of Object.keys(weights)) {
      if (!parsed.categories?.[key]) return res.status(502).json({ error: "Incomplete AI analysis. Please try again." });
      parsed.categories[key].score = clamp(parsed.categories[key].score);
      parsed.categories[key].observations = Array.isArray(parsed.categories[key].observations)
        ? parsed.categories[key].observations.slice(0, 2).map(String)
        : [];
    }
    const overall = Math.round(Object.entries(weights).reduce((sum, [key, weight]) => sum + parsed.categories[key].score * weight, 0));
    const resultData = { ...parsed, overall_score: overall, band: band(overall) };

    await db.query(
      "INSERT INTO glow_analyses (session_id, overall_score, band, analysis_json) VALUES ($1, $2, $3, $4)",
      [sessionId, overall, resultData.band, JSON.stringify(resultData)]
    );

    return res.json({ sessionId, analysis: resultData });
  } catch (error) {
    console.error("GLOW analysis error", error);
    return res.status(500).json({ error: "We couldn't analyse that photo right now. Please try again." });
  }
}