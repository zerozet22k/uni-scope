# UniScope — University Explorer

## What It Does

- searches universities worldwide by name or country
- uses the Hipo Universities hosted API with a maintained dataset fallback
- opens official university websites and shows known academic domains
- highlights universities that appear in the official QS World University Rankings 2027 top 20 positions
- lets users shortlist and compare up to four universities in-browser
- clearly separates directory data from ranking data instead of inventing a combined score

## Data Sources

### University directory

Institution names, countries, domains and websites come from the open [Hipo University Domains and Names](https://github.com/Hipo/university-domains-list) project.

The server route first queries the hosted Hipo API. If that service is unavailable, it falls back to the maintained upstream JSON dataset.

### QS reference

The top ranking positions are transcribed from the official [QS World University Rankings 2027 results](https://www.qs.com/insights/qs-world-university-rankings).

QS data is presented as a reference only. UniScope is not affiliated with QS and does not reproduce or claim the QS methodology as its own.

## Stack

- Next.js 14
- React 18
- Next.js API Routes
- plain responsive CSS
- browser `localStorage` for the comparison shortlist

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production

```bash
npm run build
npm start
```

## API

```text
GET /api/universities?q=oxford
GET /api/universities?country=Thailand
GET /api/universities?q=technology&country=Singapore
```

The endpoint returns normalized university records and identifies whether the live API or fallback dataset supplied the response.

## License

MIT © 2026 Thi Ha Zaw. See [LICENSE](LICENSE).
