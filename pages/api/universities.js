const API_URL = "http://universities.hipolabs.com/search";
const DATASET_URL = "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";

function normalize(item) {
  return {
    name: item.name,
    country: item.country,
    countryCode: item.alpha_two_code || "",
    region: item["state-province"] || null,
    domains: Array.isArray(item.domains) ? item.domains : item.domain ? [item.domain] : [],
    webPages: Array.isArray(item.web_pages) ? item.web_pages : item.web_page ? [item.web_page] : [],
  };
}

function matches(item, query, country) {
  const q = query.trim().toLowerCase();
  const c = country.trim().toLowerCase();
  const name = String(item.name || "").toLowerCase();
  const itemCountry = String(item.country || "").toLowerCase();
  const domains = (item.domains || []).join(" ").toLowerCase();

  return (!q || name.includes(q) || domains.includes(q)) && (!c || itemCountry === c);
}

async function fetchWithTimeout(url, timeout = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "UniScope/2.0 university explorer" },
    });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = String(req.query.q || "").trim();
  const country = String(req.query.country || "").trim();

  if (!query && !country) {
    return res.status(200).json({ results: [], source: "hipo", message: "Add a university name or country to search." });
  }

  const params = new URLSearchParams();
  if (query) params.set("name", query);
  if (country) params.set("country", country);

  try {
    const response = await fetchWithTimeout(`${API_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Hipo API returned ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected Hipo API response");

    const results = data.slice(0, 80).map(normalize);
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=86400");
    return res.status(200).json({ results, source: "hipo-api" });
  } catch (primaryError) {
    try {
      const response = await fetchWithTimeout(DATASET_URL, 10000);
      if (!response.ok) throw new Error(`Dataset returned ${response.status}`);

      const data = await response.json();
      const results = data.filter((item) => matches(item, query, country)).slice(0, 80).map(normalize);
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({ results, source: "hipo-dataset-fallback" });
    } catch (fallbackError) {
      return res.status(502).json({
        error: "University directory is temporarily unavailable.",
        detail: process.env.NODE_ENV === "development" ? String(fallbackError) : undefined,
      });
    }
  }
}
