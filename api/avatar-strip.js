export const access = "public";
export const methods = ["GET"];

export default async function(req,res){
  res.setHeader("Content-Type","image/svg+xml");
  res.setHeader("Cache-Control","public, max-age=86400");
  return res.send('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="transparent"/></svg>');
}