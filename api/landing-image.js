import { storage } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function(req,res){
  const asset=await storage.get("glow-ai/landing/glow-hero.webp");
  if(!asset?.buffer)return res.status(404).send("");
  res.setHeader("Content-Type",asset.contentType||"image/webp");
  res.setHeader("Cache-Control","public, max-age=86400, stale-while-revalidate=604800");
  return res.send(asset.buffer);
}