// Makes demo golf data for testing. It builds fake data in ESPN's own shape and runs it through the same
// normalizer the real data uses, so the demo exercises the real code path.
// Run:  node scripts/make_sample_golf.mjs      (SCENARIO=between for a "round finished" demo)
import { mkdirSync, writeFileSync } from 'node:fs';
import { normalizeBoard } from '../js/golf-data.js';

const SCENARIO = process.env.SCENARIO || 'live';
const OUT = process.env.OUT || 'data/golf';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rand = rng(77);
const gauss = () => (rand() + rand() + rand() + rand() - 2) * 1.7;
const fmt = (n) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`);

const FIRST = ['Leo', 'Mateo', 'Jonas', 'Theo', 'Kofi', 'Hugo', 'Luca', 'Emil', 'Noah', 'Yuri', 'Ravi', 'Tomas', 'Ivan', 'Diego', 'Sami', 'Oscar', 'Felix', 'Amir', 'Nico', 'Jin', 'Ben', 'Cal', 'Dan', 'Eli'];
const LAST = ['Vargas', 'Rossi', 'Lindqvist', 'Okafor', 'Duarte', 'Hart', 'Moreau', 'Santos', 'Kowalski', 'Tanaka', 'Brandt', 'Silva', 'Novak', 'Haddad', 'Ferrara', 'Alves', 'Keller', 'Mendes', 'Ortega', 'Park', 'Reid', 'Stone', 'Wells', 'Young'];
const FLAGS = [['usa', 'USA'], ['eng', 'England'], ['sct', 'Scotland'], ['esp', 'Spain'], ['swe', 'Sweden'], ['kor', 'South Korea'], ['jpn', 'Japan'], ['aus', 'Australia'], ['rsa', 'South Africa'], ['irl', 'Ireland'], ['ger', 'Germany'], ['fra', 'France']];
const pick = (l) => l[Math.floor(rand() * l.length)];

function makeEvent({ tour, id, name, purse, hasHoles, count, cutLine, tees }) {
  const players = Array.from({ length: count }, (_, i) => {
    const [code, country] = pick(FLAGS);
    const name2 = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}`;
    const skill = gauss() * 1.2;
    const r = [Math.round(-skill + gauss()), Math.round(-skill + gauss())];
    return { id: String(2000 + i), name: name2, code, country, skill, r, teeIdx: i };
  });
  // Round 3 progress
  const live = SCENARIO === 'live';
  players.forEach((p, i) => {
    const after2 = p.r[0] + p.r[1];
    p.after2 = after2;
  });
  const rank2 = [...players].sort((a, b) => a.after2 - b.after2);
  const cutScore = rank2[Math.min(cutLine, rank2.length - 1)].after2;
  players.forEach((p) => {
    p.cut = p.after2 > cutScore;
    p.startPos = rank2.indexOf(p) + 1;
    if (p.cut) { p.thru = null; return; }
    if (live) { p.thru = Math.max(0, Math.min(18, Math.round((1 - p.teeIdx / count) * 24 - 2 + gauss()))); }
    else p.thru = 18;
    p.todayToPar = p.thru === 0 ? null : Math.round(-p.skill * (p.thru / 18) + gauss() * Math.sqrt(p.thru / 18));
    p.total = p.after2 + (p.todayToPar || 0);
  });
  const ranked = players.filter((p) => !p.cut).sort((a, b) => a.total - b.total);
  ranked.forEach((p) => { p.currentPos = ranked.findIndex((q) => q.total === p.total) + 1; p.tied = ranked.filter((q) => q.total === p.total).length > 1; });
  const cutRanked = players.filter((p) => p.cut).sort((a, b) => a.after2 - b.after2);
  cutRanked.forEach((p, i) => { p.currentPos = ranked.length + 1 + i; p.tied = false; });
  const ordered = [...ranked, ...cutRanked];

  const now = Date.now();
  const competitors = ordered.map((p, idx) => {
    const posName = p.cut ? 'CUT' : `${p.tied ? 'T' : ''}${p.currentPos}`;
    const lines = [
      { value: 72 + p.r[0], displayValue: fmt(p.r[0]), period: 1, teeTime: '2026-11-12T13:00Z' },
      { value: 72 + p.r[1], displayValue: fmt(p.r[1]), period: 2, startPosition: 30, currentPosition: p.startPos, teeTime: '2026-11-13T13:00Z' },
    ];
    let status;
    if (p.cut) {
      status = { displayValue: 'CUT', period: 2, thru: 18, detail: 'CUT', type: { name: 'STATUS_CUT', state: 'post' }, position: { displayName: 'CUT' } };
    } else if (live && p.thru < 18) {
      const tee = new Date(now - p.thru * 13 * 60000).toISOString();
      lines.push({ displayValue: p.todayToPar == null ? undefined : fmt(p.todayToPar), period: 3, startPosition: p.startPos, currentPosition: p.currentPos, teeTime: tee });
      status = p.thru === 0
        ? { displayValue: tee, period: 3, teeTime: new Date(now + (p.teeIdx % 6 + 1) * 9 * 60000).toISOString(), thru: 0, startHole: 1, detail: 'Tee time', type: { name: 'STATUS_SCHEDULED', state: 'pre' }, position: { displayName: posName } }
        : { displayValue: fmt(p.todayToPar), period: 3, teeTime: tee, hole: p.thru + 1, startHole: 1, thru: p.thru, detail: `${fmt(p.todayToPar)}(${p.thru})`, type: { name: 'STATUS_IN_PROGRESS', state: 'in' }, position: { displayName: posName } };
    } else {
      lines.push({ value: 72 + p.todayToPar, displayValue: fmt(p.todayToPar), period: 3, startPosition: p.startPos, currentPosition: p.currentPos, teeTime: '2026-11-14T13:00Z' });
      status = { displayValue: 'F', period: 3, thru: 18, detail: `${fmt(p.todayToPar)}(F)`, type: { name: 'STATUS_FINISH', state: 'post' }, position: { displayName: posName } };
    }
    if (!p.cut && !live) lines.push({ period: 4, teeTime: '2026-11-15T13:00Z' });
    return {
      id: p.id, movement: Math.abs(p.startPos - p.currentPos), earnings: 0, sortOrder: idx + 1,
      status, score: { value: 216 + (p.total ?? p.after2), displayValue: fmt(p.cut ? p.after2 : p.total) }, linescores: lines,
      athlete: { id: p.id, displayName: p.name, shortName: `${p.name[0]}. ${p.name.split(' ')[1]}`, flag: { href: `https://a.espncdn.com/i/teamlogos/countries/500/${p.code}.png`, alt: p.country } },
    };
  });
  const holes = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, shotsToPar: [4, 4, 3, 5, 4, 4, 3, 5, 4][i % 9], totalYards: 380 + ((i * 53) % 190) }));
  return {
    events: [{
      id, name, displayPurse: purse, date: '2026-11-12T05:00Z', endDate: '2026-11-15T05:00Z',
      status: { type: { state: 'in' } },
      tournament: { id: '1', displayName: name, major: false, numberOfRounds: 4, cutRound: 2, cutScore: cutScore, cutCount: cutRanked.length ? ranked.length : 0 },
      competitions: [{
        status: { period: 3, type: live ? { state: 'in', detail: 'Round 3 - In Progress', description: 'In Progress' } : { state: 'post', detail: 'Round 3 - Play Complete', description: 'Play Complete' } },
        holeByHoleSource: { state: hasHoles ? 'full' : 'none' },
        competitors,
        leaders: [
          { displayName: 'Driving Distance', abbreviation: 'YDS/DRV', leaders: [{ displayValue: '318.4', athlete: { displayName: ordered[3].name } }] },
          { displayName: 'Greens in Regulation', abbreviation: 'GIR', leaders: [{ displayValue: '84.7', athlete: { displayName: ordered[1].name } }] },
        ],
      }],
      courses: [{ name: tour === 'pga' ? 'Demo Canyon Resort' : 'Demo Desert Course', totalYards: 7312, shotsToPar: 72, address: { city: tour === 'pga' ? 'Austin' : 'Dubai', state: tour === 'pga' ? 'TX' : '', country: tour === 'pga' ? 'USA' : 'UAE' }, holes, weather: { temperature: 61, windSpeed: 11, gust: 19, windDirection: 'NW', conditionId: 'Partly cloudy' } }],
    }],
  };
}

const schedule = (names) => names.map(([label, s, e], i) => ({ id: String(900 + i), label, start: `${s}T08:00Z`, end: `${e}T08:00Z` }));
const SCHEDULE_PGA = schedule([
  ['Demo Opening Classic', '2026-10-01', '2026-10-04'], ['Demo Fall Open', '2026-10-15', '2026-10-18'], ['Demo Championship', '2026-11-12', '2026-11-15'],
  ['Demo Winter Classic', '2026-11-19', '2026-11-22'], ['Demo Holiday Challenge', '2026-12-03', '2026-12-06'],
]);

mkdirSync(OUT, { recursive: true });
const meta = { source: 'sample', updated: new Date().toISOString() };
for (const [tour, cfg] of Object.entries({
  pga: { id: '9001', name: 'Demo Championship', purse: '$6,000,000', hasHoles: true, count: 78, cutLine: 60, tees: 0 },
  eur: { id: '9002', name: 'Demo Desert Tour Championship', purse: '$10,000,000', hasHoles: SCENARIO === 'live', count: 54, cutLine: 40, tees: 0 },
})) {
  const board = normalizeBoard(makeEvent({ tour, ...cfg }), tour);
  writeFileSync(`${OUT}/${tour}.json`, JSON.stringify({ meta, season: tour === 'pga' ? '2026' : '2025-26', schedule: SCHEDULE_PGA, board }) + '\n');
}
console.log(`Wrote demo golf data to ${OUT} (${SCENARIO})`);
