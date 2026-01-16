export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Pass bbox query params straight through
  const qs = url.searchParams.toString();
  const upstream = `https://opensky-network.org/api/states/all?${qs}`;

  // Edge cache to reduce 429s
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

    const ttlSeconds = res.ok ? 12 : 20;

    const cached = new Response(res.body, res);
    cached.headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
    cached.headers.set("CDN-Cache-Control", `public, max-age=${ttlSeconds}`);
    cached.headers.set("Access-Control-Allow-Origin", "*");

    await cache.put(cacheKey, cached.clone());
    res = cached;
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
