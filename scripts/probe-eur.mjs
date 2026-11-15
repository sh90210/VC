// Probe: how fresh is ESPN's DP World Tour data during a live round?
const get = async (u) => (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })).json();
const lb = await get('https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=eur');
const ev = lb.events[0], c = ev.competitions[0];
console.log('now', new Date().toISOString(), '| event', ev.name, '| status', JSON.stringify(c.status));
console.log('holeByHoleSource', JSON.stringify(c.holeByHoleSource), 'dataSource', JSON.stringify(c.dataSource));
const rounds = {};
for (const p of c.competitors) rounds[p.linescores?.length ?? 0] = (rounds[p.linescores?.length ?? 0] || 0) + 1;
console.log('players by number of linescores', JSON.stringify(rounds));
console.log('top 3', JSON.stringify(c.competitors.slice(0, 3).map((p) => ({ n: p.athlete?.displayName, s: p.score, st: p.status, ls: (p.linescores || []).map((l) => ({ p: l.period, v: l.value, n: l.linescores?.length })) })), null, 0).slice(0, 2500));
const sb = await get('https://site.api.espn.com/apis/site/v2/sports/golf/eur/scoreboard');
const e2 = sb.events?.[0];
console.log('scoreboard event', e2?.name, JSON.stringify(e2?.status), 'competitors', e2?.competitions?.[0]?.competitors?.length);
