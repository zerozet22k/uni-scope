const API_URL = "http://universities.hipolabs.com/search";
const DATASET_URL = "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";

const queryAliases = {
  mit: "Massachusetts Institute of Technology",
  nus: "National University of Singapore",
  ntu: "Nanyang Technological University",
  ucl: "University College London",
  eth: "ETH Zurich",
  caltech: "California Institute of Technology",
  berkeley: "University of California, Berkeley",
  oxford: "University of Oxford",
  cambridge: "University of Cambridge",
  imperial: "Imperial College London",
  stanford: "Stanford University",
  harvard: "Harvard University",
  tsinghua: "Tsinghua University",
  peking: "Peking University",
  hku: "University of Hong Kong",
  cuhk: "Chinese University of Hong Kong",
  unsw: "University of New South Wales",
  upenn: "University of Pennsylvania",
  penn: "University of Pennsylvania",
  jhu: "Johns Hopkins University",
  chula: "Chulalongkorn University",
};

function expandQuery(value) {
  const normalized = value.trim().toLowerCase();
  return queryAliases[normalized] || value.trim();
}

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

function normalizedText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matches(item, query, country) {
  const q = normalizedText(query);
  const c = normalizedText(country);
  const name = normalizedText(item.name);
  const itemCountry = normalizedText(item.country);
  const domains = normalizedText((item.domains || []).join(" "));

  return (!q || name.includes(q) || domains.includes(q)) && (!c || itemCountry === c);
}

function relevanceScore(item, query) {
  if (!query) return 0;

  const q = normalizedText(query);
  const name = normalizedText(item.name);
  const domains = (item.domains || []).map(normalizedText);

  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (domains.some((domain) => domain === q)) return 2;
  if (name.includes(q)) return 3;
  if (domains.some((domain) => domain.includes(q))) return 4;
  return 5;
}

function sortResults(items, query) {
  return [...items].sort((a, b) => {
    const scoreDifference = relevanceScore(a, query) - relevanceScore(b, query);
    if (scoreDifference !== 0) return scoreDifference;
    return String(a.name).localeCompare(String(b.name));
  });
}

async function fetchWithTimeout(url, timeout = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "UniScope/2.1 university explorer" },
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

  const rawQuery = String(req.query.q || "").trim();
  const query = expandQuery(rawQuery);
  const country = String(req.query.country || "").trim();

  if (!query && !country) {
    return res.status(200).json({
      results: [],
      source: "hipo",
      message: "Add a university name or country to search.",
    });
  }

  const params = new URLSearchParams();
  if (query) params.set("name", query);
  if (country) params.set("country", country);

  try {
    const response = await fetchWithTimeout(`${API_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Hipo API returned ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected Hipo API response");

    const results = sortResults(data.map(normalize), query).slice(0, 80);
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=86400");
    return res.status(200).json({
      results,
      source: "hipo-api",
      resolvedQuery: query,
    });
  } catch (primaryError) {
    try {
      const response = await fetchWithTimeout(DATASET_URL, 10000);
      if (!response.ok) throw new Error(`Dataset returned ${response.status}`);

      const data = await response.json();
      const results = sortResults(
        data.filter((item) => matches(item, query, country)).map(normalize),
        query
      ).slice(0, 80);

      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).json({
        results,
        source: "hipo-dataset-fallback",
        resolvedQuery: query,
      });
    } catch (fallbackError) {
      return res.status(502).json({
        error: "University directory is temporarily unavailable.",
        detail: process.env.NODE_ENV === "development" ? String(fallbackError) : undefined,
      });
    }
  }
}
