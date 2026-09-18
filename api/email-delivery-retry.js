import { db } from "hatchable";
import { enqueueCustomerEmail, processCustomerEmail } from "lib/customer-email.js";

export const access = "scheduler";
export const methods = ["POST"];
export const schedule = "0 * * * *";

export default async function(req, res) {
  try {
    const backfill = await db.query(
      "SELECT journey_id FROM glow_journeys WHERE payment_status='paid' AND email IS NOT NULL AND email_sent_at IS NULL ORDER BY paid_at ASC NULLS LAST LIMIT 20"
    );
    for (const row of backfill.rows) {
      await enqueueCustomerEmail(row.journey_id, "EMAIL_PDF");
    }

    const q = await db.query(
      "SELECT id FROM glow_delivery_events WHERE delivery_type IN ('EMAIL_PDF','EMAIL_JOURNEY_LINK') AND (status IN ('QUEUED','FAILED') OR (status='SENDING' AND queued_at < now()-interval '15 minutes')) ORDER BY queued_at ASC LIMIT 4"
    );

    const results = [];
    for (const row of q.rows) {
      results.push(await processCustomerEmail(row.id));
    }

    return res.json({ backfilled: backfill.rows.length, processed: results.length, results });
  } catch (e) {
    console.error("Customer email retry worker failed", e);
    return res.status(500).json({ error: "Email retry worker failed." });
  }
}