export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Handle preflight (CORS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Pass-through bbox params
  const qs = url.searchParams.toString();
  const upstream = `https://opensky-network.org/api/states/all?${qs}`;

  // Cache at the edge to reduce OpenSky hits (helps prevent 429)
  // IMPORTANT: also increase your frontend polling interval (we’ll do that below).
  const cache = caches.default;
  const cacheKey = new Request(upstream, { method: "GET" });

  let res = await cache.match(cacheKey);
  if (!res) {
    res = await fetch(upstream, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "AIRSMET/1.0 (Cloudflare Pages proxy)"
      }
    });

    // Cache even non-200 for a short time to avoid hammering during outages/limits
    const ttlSeconds = res.ok ? 12 : 20;

    res = new Response(res.body, res);
    res.headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
    res.headers.set("CDN-Cache-Control", `public, max-age=${ttlSeconds}`);

    await cache.put(cacheKey, res.clone());
  }

  const out = new Response(res.body, res);
  applyCors(out.headers);
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
