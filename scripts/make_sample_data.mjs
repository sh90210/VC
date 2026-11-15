// Makes demo Champions League data in the same shape the live fetcher produces.
// Run:  node scripts/make_sample_data.mjs
// Options (environment variables): OUT=folder  FULL=1 (a finished season, with knockouts)
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.env.OUT || 'data/ucl';
const FULL = process.env.FULL === '1';
const PLAYED = FULL ? 8 : 4; // league matchdays already finished

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function poisson(l) {
  const L = Math.exp(-l);
  let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

// [name, short name, 3-letter code, strength]
const TEAMS = [
  ['Real Madrid', 'Real Madrid', 'RMA', 92], ['Barcelona', 'Barcelona', 'BAR', 90],
  ['Atlético Madrid', 'Atlético', 'ATM', 84], ['Athletic Club', 'Athletic', 'ATH', 78],
  ['Villarreal', 'Villarreal', 'VIL', 74], ['Manchester City', 'Man City', 'MCI', 93],
  ['Liverpool', 'Liverpool', 'LIV', 90], ['Arsenal', 'Arsenal', 'ARS', 91],
  ['Chelsea', 'Chelsea', 'CHE', 84], ['Newcastle United', 'Newcastle', 'NEW', 79],
  ['Tottenham Hotspur', 'Spurs', 'TOT', 78], ['Bayern Munich', 'Bayern', 'FCB', 93],
  ['Borussia Dortmund', 'Dortmund', 'BVB', 83], ['Bayer Leverkusen', 'Leverkusen', 'B04', 84],
  ['Eintracht Frankfurt', 'Frankfurt', 'SGE', 74], ['Paris Saint-Germain', 'PSG', 'PSG', 92],
  ['Marseille', 'Marseille', 'OM', 78], ['Monaco', 'Monaco', 'ASM', 76],
  ['Inter Milan', 'Inter', 'INT', 89], ['AC Milan', 'AC Milan', 'MIL', 80],
  ['Juventus', 'Juventus', 'JUV', 82], ['Napoli', 'Napoli', 'NAP', 81],
  ['Atalanta', 'Atalanta', 'ATA', 82], ['Benfica', 'Benfica', 'BEN', 79],
  ['Sporting CP', 'Sporting', 'SCP', 80], ['Porto', 'Porto', 'POR', 77],
  ['PSV Eindhoven', 'PSV', 'PSV', 78], ['Ajax', 'Ajax', 'AJA', 73],
  ['Club Brugge', 'Brugge', 'BRU', 72], ['Celtic', 'Celtic', 'CEL', 68],
  ['Galatasaray', 'Galatasaray', 'GAL', 72], ['Olympiacos', 'Olympiacos', 'OLY', 68],
  ['Copenhagen', 'Copenhagen', 'COP', 64], ['Slavia Praha', 'Slavia', 'SLA', 63],
  ['Qarabağ', 'Qarabağ', 'QAR', 60], ['Bodø/Glimt', 'Bodø/Glimt', 'BOD', 62],
].map(([name, short, tla, rating], i) => ({ id: 1001 + i, name, short, tla, rating }));

const byId = new Map(TEAMS.map((t) => [t.id, t]));
const pub = (t) => ({ id: t.id, name: t.name, short: t.short, tla: t.tla, crest: null });

function playScore(home, away) {
  const lh = clamp(1.35 + (home.rating - away.rating) / 45, 0.4, 3.4);
  const la = clamp(1.05 + (away.rating - home.rating) / 45, 0.3, 3.0);
  return { home: poisson(lh), away: poisson(la) };
}

const MD_DATES = ['2026-09-15', '2026-09-29', '2026-10-20', '2026-11-03', '2026-11-24', '2026-12-08', '2027-01-20', '2027-01-27'];
function kickoff(date, dayOffset, slot) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return `${d.toISOString().slice(0, 10)}T${slot % 3 === 0 ? '16:45' : '19:00'}:00Z`;
}

// League phase: 8 matchdays, 18 games each, nobody plays the same team twice.
const matches = [];
let nextId = 500000;
let ring = TEAMS.map((t) => t.id);
for (let r = 0; r < 8; r++) {
  for (let i = 0; i < 18; i++) {
    let a = ring[i], b = ring[35 - i];
    if ((i + r) % 2) [a, b] = [b, a];
    const home = byId.get(a), away = byId.get(b);
    const done = r < PLAYED;
    matches.push({
      id: nextId++, utc: kickoff(MD_DATES[r], i < 9 ? 0 : 1, i),
      status: done ? 'finished' : 'upcoming', stage: 'league', matchday: r + 1,
      home: pub(home), away: pub(away),
      score: done ? playScore(home, away) : { home: null, away: null },
    });
  }
  ring.splice(1, 0, ring.pop());
}

function buildTable() {
  const rows = new Map(TEAMS.map((t) => [t.id, { team: pub(t), played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 }]));
  for (const m of matches.filter((x) => x.stage === 'league' && x.status === 'finished')) {
    const H = rows.get(m.home.id), A = rows.get(m.away.id);
    H.played++; A.played++;
    H.gf += m.score.home; H.ga += m.score.away; A.gf += m.score.away; A.ga += m.score.home;
    if (m.score.home > m.score.away) { H.won++; A.lost++; H.pts += 3; }
    else if (m.score.home < m.score.away) { A.won++; H.lost++; A.pts += 3; }
    else { H.draw++; A.draw++; H.pts++; A.pts++; }
  }
  const list = [...rows.values()];
  for (const r of list) r.gd = r.gf - r.ga;
  list.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name));
  return list.map((r, i) => ({ pos: i + 1, ...r }));
}
const standings = buildTable();

// Knockouts (only for the "finished season" test data).
if (FULL) {
  const seed = (n) => byId.get(standings[n - 1].team.id);
  const leg = (stage, home, away, utc) => ({
    id: nextId++, utc, status: 'finished', stage, matchday: null,
    home: pub(home), away: pub(away), score: playScore(home, away),
  });
  const tie = (stage, A, B, d1, d2) => { // A hosts the second leg
    const m1 = leg(stage, B, A, `${d1}T19:00:00Z`);
    const m2 = leg(stage, A, B, `${d2}T19:00:00Z`);
    const aggA = m1.score.away + m2.score.home, aggB = m1.score.home + m2.score.away;
    let winner = aggA > aggB ? A : aggB > aggA ? B : null;
    if (!winner) {
      const aWins = rand() < 0.5;
      winner = aWins ? A : B;
      m2.pens = aWins ? { home: 4, away: 3 } : { home: 3, away: 4 };
    }
    matches.push(m1, m2);
    return winner;
  };
  const po = [[9, 23], [10, 24], [11, 21], [12, 22], [13, 19], [14, 20], [15, 17], [16, 18]]
    .map(([a, b]) => tie('playoffs', seed(a), seed(b), '2027-02-17', '2027-02-24'));
  const r16 = po.map((w, i) => tie('r16', seed(i + 1), w, '2027-03-10', '2027-03-17'));
  const qf = [0, 2, 4, 6].map((i) => tie('qf', r16[i], r16[i + 1], '2027-04-07', '2027-04-14'));
  const sf = [0, 2].map((i) => tie('sf', qf[i], qf[i + 1], '2027-04-28', '2027-05-05'));
  const final = leg('final', sf[0], sf[1], '2027-05-29T19:00:00Z');
  if (final.score.home === final.score.away) final.pens = { home: 5, away: 4 };
  matches.push(final);
}
matches.sort((a, b) => new Date(a.utc) - new Date(b.utc));

// Made-up players so the Stats tab has something to show.
const FIRST = ['Leo', 'Mateo', 'Jonas', 'Theo', 'Kofi', 'Hugo', 'Luca', 'Emil', 'Noah', 'Yuri', 'Ravi', 'Tomas', 'Ivan', 'Diego', 'Sami', 'Oscar', 'Felix', 'Amir', 'Nico', 'Jin'];
const LAST = ['Vargas', 'Rossi', 'Lindqvist', 'Okafor', 'Duarte', 'Hart', 'Moreau', 'Santos', 'Kowalski', 'Tanaka', 'Brandt', 'Silva', 'Novak', 'Haddad', 'Ferrara', 'Alves', 'Keller', 'Mendes', 'Ortega', 'Park'];
const pick = (list) => list[Math.floor(rand() * list.length)];
const used = new Set();
function newName() {
  let n;
  do { n = `${pick(FIRST)} ${pick(LAST)}`; } while (used.has(n));
  used.add(n);
  return n;
}
function buildScorers() {
  const gf = new Map(), played = new Map();
  for (const m of matches.filter((x) => x.status === 'finished')) {
    for (const [side, other] of [['home', 'away'], ['away', 'home']]) {
      const id = m[side].id;
      gf.set(id, (gf.get(id) || 0) + m.score[side]);
      played.set(id, (played.get(id) || 0) + 1);
    }
  }
  const players = [];
  let pid = 9000;
  for (const t of TEAMS) {
    const g = gf.get(t.id) || 0;
    if (!g) continue;
    const star = Math.round(g * (0.3 + rand() * 0.15));
    const second = Math.round(g * (0.12 + rand() * 0.1));
    players.push({ player: { id: pid++, name: newName() }, team: pub(t), played: played.get(t.id), goals: star, assists: Math.round(g * rand() * 0.2), penalties: Math.floor(star * rand() * 0.3) });
    players.push({ player: { id: pid++, name: newName() }, team: pub(t), played: played.get(t.id), goals: second, assists: Math.round(g * (0.1 + rand() * 0.15)), penalties: 0 });
  }
  return players.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 25);
}

const meta = { source: 'sample', updated: new Date().toISOString(), season: 'Demo season', competition: 'Champions League' };
mkdirSync(OUT, { recursive: true });
const write = (name, data) => writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 1) + '\n');
write('meta', meta);
write('standings', standings);
write('matches', matches);
write('scorers', buildScorers());
console.log(`Wrote demo data to ${OUT} (${matches.length} matches, ${FULL ? 'full season' : `${PLAYED} matchdays played`})`);
