import { db } from "hatchable";
import { enqueueCustomerEmail, processCustomerEmail } from "lib/customer-email.js";

export const access = "scheduler";
export const methods = ["POST"];

export default async function(req, res) {
  const journeyId = String(req.body?.journeyId || "").trim();
  if (!journeyId) return res.status(400).json({ error: "Journey ID is required." });

  try {
    const q = await db.query(
      "SELECT journey_id,email,payment_status,day30_completed FROM glow_journeys WHERE journey_id=$1 LIMIT 1",
      [journeyId]
    );
    const journey = q.rows[0];
    if (!journey) return res.status(404).json({ error: "Glow Journey not found." });
    if (!journey.email) return res.json({ sent: false, skipped: true, reason: "NO_EMAIL" });
    if (journey.payment_status === "paid") return res.json({ sent: false, skipped: true, reason: "ALREADY_PAID" });
    if (journey.day30_completed) return res.json({ sent: false, skipped: true, reason: "DAY30_COMPLETED" });

    const queued = await enqueueCustomerEmail(journeyId, "EMAIL_72H_REMINDER");
    if (queued.deliveryId) {
      const processed = await processCustomerEmail(queued.deliveryId);
      return res.json({ sent: Boolean(processed.sent), journeyId, deliveryId: queued.deliveryId });
    }
    return res.json({ sent: Boolean(queued.sent), journeyId, reason: queued.reason || null });
  } catch (e) {
    console.error("72-hour Glow reminder error", e);
    return res.status(500).json({ error: "We couldn't send the 72-hour Glow reminder right now." });
  }
}