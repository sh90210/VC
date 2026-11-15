// One-off probe #2: prints real sample objects from ESPN's golf leaderboard so the app can be built to match.
const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};
const show = (label, value, max = 2600) => {
  console.log(`\n--- ${label}`);
  console.log(JSON.stringify(value, null, 1).replace(/\n\s+/g, ' ').slice(0, max));
};

const LB = 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard';
try {
  const pga = await get(`${LB}?league=pga`);
  const ev = pga.events[0];
  const comp = ev.competitions[0];
  show('pga tournament', ev.tournament);
  show('pga competition.status', comp.status);
  show('pga competitor[0]', comp.competitors[0], 3800);
  show('pga competitor[0].linescores[0] (first round, with holes)', comp.competitors[0].linescores[0], 1800);
  show('pga competitor[60] (mid-field)', { ...comp.competitors[60], linescores: undefined }, 1800);
  show('pga competitor with status.type != first', comp.competitors.map((c) => c.status?.type?.name).filter((v, i, a) => a.indexOf(v) === i));
  show('pga leaders[0]', comp.leaders[0], 1200);
  show('pga course hole[0]', ev.courses[0].holes[0], 600);

  const eur = await get(`${LB}?league=eur`);
  const ec = eur.events[0].competitions[0];
  show('eur competitor[0]', ec.competitors[0], 3000);
  show('eur competitor[0].linescores', ec.competitors[0].linescores, 1500);
} catch (err) { console.log('leaderboard probe failed:', err.message); }

try {
  const sb = await get('https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard');
  const cal = sb.leagues[0].calendar;
  show('pga calendar sample', [cal[0], cal[cal.length - 3], cal[cal.length - 2], cal[cal.length - 1]], 1500);
  const past = cal.find((c) => new Date(c.endDate) < new Date() && new Date(c.endDate) > new Date('2026-10-01'));
  console.log('\nlast finished event in calendar:', JSON.stringify(past));
  if (past) {
    const done = await get(`${LB}?league=pga&event=${past.id}`);
    const c0 = done.events[0].competitions[0];
    console.log('event param works; status:', c0.status?.type?.detail, '; competitors:', c0.competitors.length);
    show('finished event winner', { order: c0.competitors[0].sortOrder, status: c0.competitors[0].status, score: c0.competitors[0].score, earnings: c0.competitors[0].earnings, athlete: c0.competitors[0].athlete?.displayName }, 1200);
  }
} catch (err) { console.log('calendar probe failed:', err.message); }

try {
  const eurSb = await get('https://site.api.espn.com/apis/site/v2/sports/golf/eur/scoreboard');
  const cal = eurSb.leagues[0].calendar;
  show('eur calendar tail', cal.slice(-3), 900);
} catch (err) { console.log('eur calendar failed:', err.message); }
