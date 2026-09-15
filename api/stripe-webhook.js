import { db } from "hatchable";

export const access = "public";
export const methods = ["POST"];

export default async function(req, res) {
  const keys = Object.keys(req || {}).sort();
  const headerKeys = Object.keys(req.headers || {}).sort();
  return res.json({
    keys,
    headerKeys,
    bodyType: typeof req.body,
    bodyIsString: typeof req.body === "string",
    hasRawBody: Object.prototype.hasOwnProperty.call(req, "rawBody"),
    rawBodyType: typeof req.rawBody,
    hasRaw: Object.prototype.hasOwnProperty.call(req, "raw"),
    rawType: typeof req.raw,
    stripeSignaturePresent: !!(req.headers?.["stripe-signature"] || req.headers?.["Stripe-Signature"])
  });
}