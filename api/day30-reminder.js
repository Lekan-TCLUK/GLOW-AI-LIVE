import { enqueueCustomerEmail, processCustomerEmail } from "lib/customer-email.js";

export const access = "scheduler";
export const methods = ["POST"];

export default async function(req, res) {
  const journeyId = String(req.body?.journeyId || "").trim().toUpperCase();
  if (!journeyId) return res.status(400).json({ error: "Journey ID is required." });

  try {
    const queued = await enqueueCustomerEmail(journeyId, "EMAIL_JOURNEY_LINK");
    if (queued.queued && queued.deliveryId) {
      const result = await processCustomerEmail(queued.deliveryId);
      if (result.failed) return res.status(503).json({ sent: false, queuedForRetry: true, journeyId });
      return res.json({ sent: !!result.sent, journeyId, deliveryId: queued.deliveryId });
    }
    return res.json({ sent: !!queued.sent, journeyId, reason: queued.reason || null });
  } catch (e) {
    console.error("Day-29 reminder error", e);
    return res.status(500).json({ error: "We couldn't send the Day-30 reminder right now." });
  }
}