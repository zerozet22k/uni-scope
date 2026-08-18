import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { qs2027, qsSource } from "../lib/qs2027";

const siteUrl = "https://uni-scope-nu.vercel.app";

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
const browseCountries = ["Thailand", "Singapore", "United Kingdom", "United States", "Australia", "Japan"];

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

function scrollToDirectory() {
  window.setTimeout(() => {
    document.getElementById("directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [compareNotice, setCompareNotice] = useState("");
  const [source, setSource] = useState("");
  const [shortlist, setShortlist] = useState([]);
  const [sortBy, setSortBy] = useState("smart");
  const [rankingQuery, setRankingQuery] = useState("");
  const [rankingCountry, setRankingCountry] = useState("");

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

  const visibleRankings = useMemo(() => {
    const q = rankingQuery.trim().toLowerCase();
    return qs2027.filter((item) => {
      const matchesQuery = !q || `${item.name} ${item.country}`.toLowerCase().includes(q);
      const matchesCountry = !rankingCountry || item.country === rankingCountry;
      return matchesQuery && matchesCountry;
    });
  }, [rankingCountry, rankingQuery]);

  const rankingCountries = useMemo(
    () => [...new Set(qs2027.map((item) => item.country))].sort(),
    []
  );

  const biggestMover = useMemo(() => {
    return [...qs2027]
      .filter((item) => String(item.change).startsWith("+"))
      .sort((a, b) => Number(b.change.slice(1)) - Number(a.change.slice(1)))[0];
  }, []);

  const displayedResults = useMemo(() => {
    const items = [...results];
    if (sortBy === "name") {
      return items.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === "country") {
      return items.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
    }
    if (sortBy === "qs") {
      return items.sort((a, b) => {
        const rankA = rankFor(a.name)?.rank ?? Number.POSITIVE_INFINITY;
        const rankB = rankFor(b.name)?.rank ?? Number.POSITIVE_INFINITY;
        return rankA - rankB || a.name.localeCompare(b.name);
      });
    }
    return items;
  }, [results, sortBy]);

  async function runSearch(event, options = {}) {
    if (event) event.preventDefault();

    const nextQuery = options.query !== undefined ? options.query : query;
    const nextCountry = options.country !== undefined ? options.country : country;

    if (!nextQuery.trim() && !nextCountry) {
      setSearchError("Enter a university name or choose a country.");
      return false;
    }

    setQuery(nextQuery);
    setCountry(nextCountry);
    setLoading(true);
    setSearchError("");
    setCompareNotice("");
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextCountry) params.set("country", nextCountry);

      const response = await fetch(`/api/universities?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed");

      setResults(data.results || []);
      setSource(data.source || "");
      setSortBy("smart");
      return true;
    } catch (error) {
      setResults([]);
      setSearchError(error.message || "Search failed. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function exploreUniversity(name) {
    await runSearch(null, { query: name, country: "" });
    scrollToDirectory();
  }

  async function browseCountry(name) {
    await runSearch(null, { query: "", country: name });
    scrollToDirectory();
  }

  function resetSearch() {
    setQuery("");
    setCountry("");
    setResults([]);
    setSearched(false);
    setSearchError("");
    setSource("");
  }

  function toggleShortlist(item) {
    const key = universityKey(item);
    if (shortlistKeys.has(key)) {
      setShortlist((current) => current.filter((entry) => universityKey(entry) !== key));
      setCompareNotice("");
      return;
    }

    if (shortlist.length >= 4) {
      setCompareNotice("Your comparison is full. Remove one university before adding another.");
      document.getElementById("compare")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setCompareNotice("");
    setShortlist((current) => [...current, item]);
  }

  return (
    <>
      <Head>
        <title>UniScope | University Rankings, Search & Compare</title>
        <meta
          name="description"
          content="Explore universities worldwide, reference QS 2027 top positions, search a live global directory, and compare a shortlist in UniScope."
        />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`${siteUrl}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="UniScope" />
        <meta property="og:title" content="UniScope | University Rankings, Search & Compare" />
        <meta
          property="og:description"
          content="Search universities worldwide, browse QS 2027 top positions, and build a shortlist for comparison."
        />
        <meta property="og:url" content={`${siteUrl}/`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="UniScope | University Rankings, Search & Compare" />
        <meta
          name="twitter:description"
          content="University discovery with QS 2027 references, live directory search, and shortlist comparison."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "UniScope",
              url: `${siteUrl}/`,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              description:
                "University discovery app with ranking references, live directory search, and shortlist comparison.",
              author: {
                "@type": "Person",
                name: "Thi Ha Zaw",
                url: "https://thi-ha-zaw.vercel.app",
              },
            }),
          }}
        />
      </Head>

      <div className="site-shell">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="UniScope home">
            <span className="brand-mark" aria-hidden="true">U</span>
            <span>UniScope</span>
          </a>
          <nav>
            <a href="#rankings">Rankings</a>
            <a href="#directory">Discover</a>
            <a href="#compare">Compare {shortlist.length > 0 ? `(${shortlist.length})` : ""}</a>
          </nav>
        </header>

        <main id="top">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow"><span /> University discovery · QS 2027 reference</div>
              <h1>Research universities with more than a ranking number.</h1>
              <p>
                Search institutions worldwide, inspect official domains and websites, browse the latest
                QS top positions, and keep a shortlist for side-by-side comparison.
              </p>

              <form className="search-box" onSubmit={runSearch}>
                <label className="search-field">
                  <span>University</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="MIT, Oxford, Chulalongkorn…"
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
                  {loading ? "Searching…" : "Search universities"}
                </button>
              </form>

              <div className="quick-searches" aria-label="Quick searches">
                <span>Popular</span>
                {quickSearches.map((item) => (
                  <button key={item} onClick={() => exploreUniversity(item)} type="button">{item}</button>
                ))}
              </div>
            </div>

            <aside className="hero-panel">
              <div className="hero-panel-label">QS World University Rankings 2027</div>
              <div className="hero-rank">01</div>
              <h2>Massachusetts Institute of Technology</h2>
              <p>MIT holds the #1 position in the QS 2027 release.</p>
              <div className="hero-panel-footer">
                <span>1,504 institutions ranked</span>
                <a href={qsSource} target="_blank" rel="noreferrer">Official QS source ↗</a>
              </div>
            </aside>
          </section>

          <section className="metric-strip" aria-label="UniScope summary">
            <div><strong>1,504</strong><span>institutions in QS 2027</span></div>
            <div><strong>21</strong><span>universities in top 20 positions</span></div>
            <div><strong>{rankingCountries.length}</strong><span>locations represented in top positions</span></div>
            <div><strong>4</strong><span>universities per comparison</span></div>
          </section>

          <section className="section rankings" id="rankings">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Ranking reference</p>
                <h2>QS 2027 top 20 positions</h2>
              </div>
              <p>
                Browse the published top positions, filter the table, then jump straight into the directory
                to inspect an institution and add it to your shortlist.
              </p>
            </div>

            <div className="ranking-insights" aria-label="Ranking insights">
              <div><span>Largest rise</span><strong>{biggestMover?.change}</strong><p>{biggestMover?.name}</p></div>
              <div><span>Top-20 ties</span><strong>4</strong><p>Ranks 2, 8, 16 and 20</p></div>
              <div><span>United States</span><strong>9</strong><p>universities in this reference list</p></div>
            </div>

            <div className="ranking-controls">
              <label>
                <span>Filter rankings</span>
                <input
                  value={rankingQuery}
                  onChange={(event) => setRankingQuery(event.target.value)}
                  placeholder="Search institution or location"
                />
              </label>
              <label>
                <span>Location</span>
                <select value={rankingCountry} onChange={(event) => setRankingCountry(event.target.value)}>
                  <option value="">All locations</option>
                  {rankingCountries.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <div className="ranking-table" role="table" aria-label="QS 2027 top universities">
              <div className="ranking-row ranking-head" role="row">
                <span>Rank</span><span>Institution</span><span>Location</span><span>Move</span><span />
              </div>
              {visibleRankings.map((item) => (
                <div className="ranking-row ranking-item" role="row" key={`${item.rank}-${item.name}`}>
                  <span className="rank-number">{String(item.rank).padStart(2, "0")}</span>
                  <span className="rank-name">{item.name}</span>
                  <span className="rank-country">{item.country}</span>
                  <span className={`rank-move ${String(item.change).startsWith("+") ? "up" : String(item.change).startsWith("-") ? "down" : ""}`}>
                    {item.change}
                  </span>
                  <button className="ranking-action" type="button" onClick={() => exploreUniversity(item.name)}>
                    Explore ↗
                  </button>
                </div>
              ))}
            </div>

            {visibleRankings.length === 0 && (
              <div className="ranking-empty">No ranking rows match those filters.</div>
            )}

            <p className="source-note">
              QS names and positions are shown as a reference to the official QS release. UniScope is not affiliated with QS.
              <a href={qsSource} target="_blank" rel="noreferrer"> View the official 2027 release ↗</a>
            </p>
          </section>

          <section className="section directory" id="directory">
            <div className="section-heading">
              <div>
                <p className="section-kicker">University discovery</p>
                <h2>Search the global directory</h2>
              </div>
              <p>
                Directory results provide institution names, locations, official domains, and website links from
                Hipo’s open university dataset. Ranking badges appear only where a QS top-position match exists.
              </p>
            </div>

            <div className="browse-strip">
              <span>Browse by country</span>
              {browseCountries.map((item) => (
                <button type="button" key={item} onClick={() => browseCountry(item)}>{item}</button>
              ))}
            </div>

            {searchError && <div className="error-banner">{searchError}</div>}

            {!searched && (
              <div className="discovery-grid">
                <div className="discovery-intro">
                  <span className="discovery-icon">⌕</span>
                  <p className="section-kicker">Start exploring</p>
                  <h3>Search by name or open a country directory.</h3>
                  <p>
                    Use the search above for a specific university, or begin with one of the suggested institutions.
                  </p>
                </div>
                <div className="discovery-suggestions">
                  {qs2027.slice(0, 6).map((item) => (
                    <button key={item.name} type="button" onClick={() => exploreUniversity(item.name)}>
                      <span>QS #{item.rank}</span>
                      <strong>{item.name}</strong>
                      <small>{item.country} · Explore ↗</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searched && (
              <div className="directory-toolbar">
                <div className="result-meta">
                  <strong>{results.length}</strong> {results.length === 1 ? "result" : "results"}
                  {source && <span> · {source === "hipo-api" ? "live directory" : "dataset fallback"}</span>}
                  {(query || country) && <span> · {query || country}</span>}
                </div>
                <div className="result-actions">
                  <label>
                    <span>Sort</span>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                      <option value="smart">Best match</option>
                      <option value="qs">QS rank first</option>
                      <option value="name">Name A–Z</option>
                      <option value="country">Country</option>
                    </select>
                  </label>
                  <button type="button" onClick={resetSearch}>Clear search</button>
                </div>
              </div>
            )}

            {loading && (
              <div className="loading-grid" aria-label="Loading universities">
                {Array.from({ length: 6 }).map((_, index) => <div className="skeleton" key={index} />)}
              </div>
            )}

            {!loading && displayedResults.length > 0 && (
              <div className="university-grid">
                {displayedResults.map((item) => {
                  const ranking = rankFor(item.name);
                  const selected = shortlistKeys.has(universityKey(item));
                  const webPage = safeLink(item.webPages?.[0]);
                  return (
                    <article className="university-card" key={universityKey(item)}>
                      <div className="card-topline">
                        <span className="country-code">{item.countryCode || "UNI"}</span>
                        {ranking && <span className="qs-badge">QS 2027 #{ranking.rank}</span>}
                      </div>
                      <h3>{item.name}</h3>
                      <p className="university-location">
                        {[item.region, item.country].filter(Boolean).join(", ")}
                      </p>
                      <div className="domain-list">
                        {(item.domains || []).slice(0, 2).map((domain) => <span key={domain}>{domain}</span>)}
                      </div>
                      <div className="card-context">
                        <span>{ranking ? "Published QS top-position match" : "Directory institution"}</span>
                      </div>
                      <div className="card-actions">
                        {webPage ? <a href={webPage} target="_blank" rel="noreferrer">Official website ↗</a> : <span>No website listed</span>}
                        <button type="button" className={selected ? "selected" : ""} onClick={() => toggleShortlist(item)}>
                          {selected ? "In comparison ✓" : "+ Compare"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {searched && !loading && !searchError && results.length === 0 && (
              <div className="empty-state compact useful-empty">
                <h3>No matching institutions</h3>
                <p>Try a broader name, clear the country filter, or jump to one of these searches.</p>
                <div>
                  {quickSearches.slice(0, 4).map((item) => (
                    <button key={item} type="button" onClick={() => exploreUniversity(item)}>{item}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="section compare" id="compare">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Shortlist · {shortlist.length}/4 selected</p>
                <h2>Compare your universities</h2>
              </div>
              <p>
                Build a focused shortlist from directory results. UniScope keeps it in this browser so you can return to it later.
              </p>
            </div>

            {compareNotice && <div className="compare-notice">{compareNotice}</div>}

            {shortlist.length > 0 && (
              <div className="compare-toolbar">
                <span>{shortlist.length} {shortlist.length === 1 ? "university" : "universities"} selected</span>
                <button type="button" onClick={() => { setShortlist([]); setCompareNotice(""); }}>Clear comparison</button>
              </div>
            )}

            {shortlist.length === 0 ? (
              <div className="empty-state compact">
                <h3>Your comparison is empty</h3>
                <p>Search the directory and use “+ Compare” to add up to four universities.</p>
              </div>
            ) : (
              <div className="compare-grid">
                {shortlist.map((item) => {
                  const ranking = rankFor(item.name);
                  const webPage = safeLink(item.webPages?.[0]);
                  return (
                    <article key={universityKey(item)}>
                      <button className="remove" onClick={() => toggleShortlist(item)} aria-label={`Remove ${item.name}`}>×</button>
                      <span className="compare-label">{ranking ? `QS 2027 #${ranking.rank}` : "Directory institution"}</span>
                      <h3>{item.name}</h3>
                      <dl>
                        <div><dt>Country</dt><dd>{item.country}</dd></div>
                        <div><dt>Region</dt><dd>{item.region || "Not listed"}</dd></div>
                        <div><dt>Domain</dt><dd>{item.domains?.[0] || "Not listed"}</dd></div>
                        <div><dt>QS reference</dt><dd>{ranking ? `#${ranking.rank}` : "No top-20 match"}</dd></div>
                      </dl>
                      {webPage && <a className="compare-site" href={webPage} target="_blank" rel="noreferrer">Official website ↗</a>}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="methodology">
            <div>
              <p className="section-kicker">How to read UniScope</p>
              <h2>Ranking data and directory data stay separate.</h2>
            </div>
            <div className="methodology-copy">
              <p>
                QS positions are displayed only when an institution matches the published QS 2027 top-position reference used by this app. UniScope does not create or infer a global rank for other universities.
              </p>
              <p>
                Directory names, countries, domains, and web pages come from Hipo’s open University Domains and Names dataset. For admissions, tuition, programs, scholarships, and entry requirements, always continue to the university’s official website.
              </p>
            </div>
          </section>
        </main>

        <footer>
          <span>UniScope · built by Thi Ha Zaw</span>
          <div>
            <a href="https://github.com/zerozet22k/uni-scope" target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href="mailto:zerozet22k@gmail.com">zerozet22k@gmail.com</a>
          </div>
        </footer>
      </div>
    </>
  );
}
