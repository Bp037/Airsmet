export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const upstream = "https://tfr.faa.gov/tfrapi/geojson";

  const res = await fetch(upstream, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "AIRSMET/1.0 (Cloudflare Pages proxy)"
    }
  });

  const out = new Response(res.body, res);
  applyCors(out.headers);

  // Light caching is fine here
  out.headers.set("Cache-Control", "public, max-age=60");
  out.headers.set("CDN-Cache-Control", "public, max-age=60");

  return out;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function applyCors(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
}
