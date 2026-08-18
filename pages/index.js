import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { qs2027, qsSource } from "../lib/qs2027";

const countries = [
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
  "China",
  "Germany",
  "Hong Kong",
  "India",
  "Japan",
  "Malaysia",
  "Netherlands",
  "Singapore",
  "South Korea",
  "Switzerland",
  "Thailand",
];

const quickSearches = ["MIT", "Oxford", "NUS", "University of Tokyo", "Chulalongkorn"];

function cleanName(value = "") {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/university college london/g, "ucl")
    .replace(/nanyang technological university singapore/g, "nanyang technological university")
    .replace(/national university of singapore/g, "nus")
    .replace(/california institute of technology/g, "caltech")
    .replace(/massachusetts institute of technology/g, "mit")
    .replace(/university of california berkeley/g, "uc berkeley")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rankFor(name) {
  const candidate = cleanName(name);
  return qs2027.find((item) => {
    const ranked = cleanName(item.name);
    return candidate === ranked || candidate.includes(ranked) || ranked.includes(candidate);
  });
}

function universityKey(item) {
  return `${item.name}|${item.country}`;
}

function safeLink(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState("");
  const [shortlist, setShortlist] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("uniscope-shortlist") || "[]");
      if (Array.isArray(saved)) setShortlist(saved.slice(0, 4));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("uniscope-shortlist", JSON.stringify(shortlist));
  }, [shortlist]);

  const shortlistKeys = useMemo(() => new Set(shortlist.map(universityKey)), [shortlist]);

  async function runSearch(event, overrideQuery) {
    if (event) event.preventDefault();
    const q = typeof overrideQuery === "string" ? overrideQuery : query;
    if (!q.trim() && !country) {
      setError("Enter a university name or choose a country.");
      return;
    }

    if (typeof overrideQuery === "string") setQuery(overrideQuery);
    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (country) params.set("country", country);

      const response = await fetch(`/api/universities?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed");

      setResults(data.results || []);
      setSource(data.source || "");
    } catch (searchError) {
      setResults([]);
      setError(searchError.message || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleShortlist(item) {
    const key = universityKey(item);
    if (shortlistKeys.has(key)) {
      setShortlist((current) => current.filter((entry) => universityKey(entry) !== key));
      return;
    }

    if (shortlist.length >= 4) {
      setError("You can compare up to four universities at once.");
      return;
    }

    setError("");
    setShortlist((current) => [...current, item]);
  }

  return (
    <>
      <Head>
        <title>UniScope — University Explorer</title>
        <meta
          name="description"
          content="Search universities worldwide, compare a shortlist, and reference the latest QS top positions."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="site-shell">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="UniScope home">
            <span className="brand-mark">U</span>
            <span>UniScope</span>
          </a>
          <nav>
            <a href="#rankings">QS 2027</a>
            <a href="#directory">Directory</a>
            <a href="#compare">Compare</a>
          </nav>
        </header>

        <main id="top">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span /> 2027 rankings + live university directory</div>
              <h1>Find universities with context, not just a number.</h1>
              <p>
                Search institutions around the world, open their official sites, build a shortlist,
                and use the latest QS top positions as a reference point.
              </p>

              <form className="search-box" onSubmit={runSearch}>
                <label className="search-field">
                  <span>University</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by university name"
                    aria-label="University name"
                  />
                </label>
                <label className="country-field">
                  <span>Country</span>
                  <select value={country} onChange={(event) => setCountry(event.target.value)}>
                    <option value="">Any country</option>
                    {countries.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <button className="search-button" type="submit" disabled={loading}>
                  {loading ? "Searching…" : "Search"}
                </button>
              </form>

              <div className="quick-searches" aria-label="Quick searches">
                <span>Try</span>
                {quickSearches.map((item) => (
                  <button key={item} onClick={() => runSearch(null, item)} type="button">{item}</button>
                ))}
              </div>
            </div>

            <aside className="hero-panel">
              <div className="hero-panel-label">QS World University Rankings 2027</div>
              <div className="hero-rank">01</div>
              <h2>Massachusetts Institute of Technology</h2>
              <p>MIT retains the global #1 position in the latest QS release.</p>
              <div className="hero-panel-footer">
                <span>1,504 institutions ranked</span>
                <a href={qsSource} target="_blank" rel="noreferrer">QS source ↗</a>
              </div>
            </aside>
          </section>

          <section className="metric-strip" aria-label="Dataset summary">
            <div><strong>1,504</strong><span>QS 2027 institutions</span></div>
            <div><strong>20</strong><span>top ranking positions</span></div>
            <div><strong>Live</strong><span>global directory search</span></div>
            <div><strong>4</strong><span>universities per shortlist</span></div>
          </section>

          <section className="section rankings" id="rankings">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Global benchmark</p>
                <h2>QS 2027 — top 20 positions</h2>
              </div>
              <p>
                A reference list sourced from QS. Ties mean 21 universities occupy the first 20 ranking positions.
              </p>
            </div>

            <div className="ranking-table" role="table" aria-label="QS 2027 top universities">
              <div className="ranking-row ranking-head" role="row">
                <span>Rank</span><span>Institution</span><span>Location</span><span>Move</span>
              </div>
              {qs2027.map((item, index) => (
                <div className="ranking-row" role="row" key={`${item.rank}-${item.name}`}>
                  <span className="rank-number">{String(item.rank).padStart(2, "0")}</span>
                  <span className="rank-name">{item.name}</span>
                  <span className="rank-country">{item.country}</span>
                  <span className={`rank-move ${String(item.change).startsWith("+") ? "up" : String(item.change).startsWith("-") ? "down" : ""}`}>
                    {item.change}
                  </span>
                </div>
              ))}
            </div>

            <p className="source-note">
              QS ranking names and positions are shown for reference. QS and its marks belong to their respective owner.
              <a href={qsSource} target="_blank" rel="noreferrer"> View the official 2027 release ↗</a>
            </p>
          </section>

          <section className="section directory" id="directory">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Explore institutions</p>
                <h2>Global university directory</h2>
              </div>
              <p>
                Search uses the Hipo Universities dataset/API for institution names, countries, domains and official web pages.
              </p>
            </div>

            {!searched && (
              <div className="empty-state">
                <span>⌕</span>
                <h3>Search from the top of the page</h3>
                <p>Try a university name, an email domain, or select a country.</p>
              </div>
            )}

            {error && <div className="error-banner">{error}</div>}

            {searched && !loading && !error && (
              <div className="result-meta">
                <strong>{results.length}</strong> results
                {source && <span> · {source === "hipo-api" ? "live API" : "dataset fallback"}</span>}
              </div>
            )}

            {loading && (
              <div className="loading-grid" aria-label="Loading universities">
                {Array.from({ length: 6 }).map((_, index) => <div className="skeleton" key={index} />)}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="university-grid">
                {results.map((item) => {
                  const ranking = rankFor(item.name);
                  const selected = shortlistKeys.has(universityKey(item));
                  const webPage = safeLink(item.webPages?.[0]);
                  return (
                    <article className="university-card" key={universityKey(item)}>
                      <div className="card-topline">
                        <span className="country-code">{item.countryCode || "UNI"}</span>
                        {ranking && <span className="qs-badge">QS #{ranking.rank}</span>}
                      </div>
                      <h3>{item.name}</h3>
                      <p className="university-location">
                        {[item.region, item.country].filter(Boolean).join(", ")}
                      </p>
                      <div className="domain-list">
                        {(item.domains || []).slice(0, 2).map((domain) => <span key={domain}>{domain}</span>)}
                      </div>
                      <div className="card-actions">
                        {webPage ? <a href={webPage} target="_blank" rel="noreferrer">Official site ↗</a> : <span>No site listed</span>}
                        <button type="button" className={selected ? "selected" : ""} onClick={() => toggleShortlist(item)}>
                          {selected ? "Added ✓" : "+ Compare"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {searched && !loading && !error && results.length === 0 && (
              <div className="empty-state compact">
                <h3>No matching institutions</h3>
                <p>Try a shorter university name or remove the country filter.</p>
              </div>
            )}
          </section>

          <section className="section compare" id="compare">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Shortlist</p>
                <h2>Compare your picks</h2>
              </div>
              <p>Your shortlist stays in this browser. Add up to four institutions from the directory.</p>
            </div>

            {shortlist.length === 0 ? (
              <div className="empty-state compact">
                <h3>No universities selected yet</h3>
                <p>Use “+ Compare” on any search result to build a shortlist.</p>
              </div>
            ) : (
              <div className="compare-grid">
                {shortlist.map((item) => {
                  const ranking = rankFor(item.name);
                  return (
                    <article key={universityKey(item)}>
                      <button className="remove" onClick={() => toggleShortlist(item)} aria-label={`Remove ${item.name}`}>×</button>
                      <span className="compare-label">{ranking ? `QS 2027 #${ranking.rank}` : "Directory institution"}</span>
                      <h3>{item.name}</h3>
                      <dl>
                        <div><dt>Country</dt><dd>{item.country}</dd></div>
                        <div><dt>Region</dt><dd>{item.region || "—"}</dd></div>
                        <div><dt>Domain</dt><dd>{item.domains?.[0] || "—"}</dd></div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="methodology">
            <div>
              <p className="section-kicker">Data notes</p>
              <h2>What this app does — and doesn’t — rank.</h2>
            </div>
            <div className="methodology-copy">
              <p>
                UniScope does not calculate a fake global score. QS positions are displayed only where we have an official QS 2027 reference position. Other institutions are directory entries, not implied to be unranked or lower quality.
              </p>
              <p>
                University names, countries, domains and web pages come from Hipo’s open University Domains and Names dataset. Always verify admissions, tuition, programs and entry requirements on the institution’s official website.
              </p>
            </div>
          </section>
        </main>

        <footer>
          <span>UniScope · built by Thi Ha Zaw</span>
          <div><a href="https://github.com/zerozet22k" target="_blank" rel="noreferrer">GitHub ↗</a><a href="mailto:zerozet22k@gmail.com">zerozet22k@gmail.com</a></div>
        </footer>
      </div>
    </>
  );
}
