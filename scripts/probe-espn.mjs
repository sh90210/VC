// One-off probe: shows what ESPN's public golf endpoints return (shape + a few sample values),
// and whether browsers are allowed to call them directly (CORS). Run from GitHub Actions.
const URLS = [
  'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
  'https://site.api.espn.com/apis/site/v2/sports/golf/eur/scoreboard',
  'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga',
  'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=eur',
  'https://site.web.api.espn.com/apis/v2/sports/golf/pga/standings',
  'https://site.api.espn.com/apis/site/v2/sports/golf/pga/rankings',
];

function shape(value, path, out, depth) {
  if (out.length > 170) return;
  if (Array.isArray(value)) {
    out.push(`${path}: array(${value.length})`);
    if (value.length && depth < 7) shape(value[0], `${path}[0]`, out, depth + 1);
  } else if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (depth >= 7) { out.push(`${path}: {${keys.slice(0, 12).join(',')}}`); return; }
    for (const k of keys) shape(value[k], `${path}.${k}`, out, depth + 1);
  } else {
    out.push(`${path} = ${JSON.stringify(value)?.slice(0, 70)}`);
  }
}

for (const url of URLS) {
  console.log(`\n===== ${url}`);
  try {
    const res = await fetch(url, { headers: { Origin: 'https://sh90210.github.io', 'User-Agent': 'Mozilla/5.0' } });
    console.log(`status ${res.status}; content-type ${res.headers.get('content-type')}; CORS allow-origin: ${res.headers.get('access-control-allow-origin')}`);
    const text = await res.text();
    console.log(`size ${text.length} bytes`);
    if (!res.ok) { console.log(text.slice(0, 200)); continue; }
    const out = [];
    shape(JSON.parse(text), '$', out, 0);
    console.log(out.join('\n'));
  } catch (err) {
    console.log(`failed: ${err.message}`);
  }
}
