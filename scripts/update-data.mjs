// Fetches live data and writes it into data/<competition>/ in the shape the app reads.
// GitHub runs this on a schedule (see .github/workflows/pages.yml). The token comes from a repo secret,
// so it never appears in the app or in the repo.
//
// If anything goes wrong (no token, API down, rate limit) the existing files are left alone,
// so the app keeps showing the last good data.
//
// To add another competition from the same service, add a line to SOURCES.
// To add a different data service, write another adapter like footDataAdapter below.
import { mkdir, writeFile } from 'node:fs/promises';

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const SOURCES = [
  { id: 'ucl', adapter: 'football-data', code: 'CL', out: 'data/ucl' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- football-data.org ----------
const STAGES = {
  LEAGUE_STAGE: 'league', GROUP_STAGE: 'league',
  PLAYOFFS: 'playoffs', KNOCKOUT_ROUND_PLAYOFFS: 'playoffs',
  LAST_16: 'r16', ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf', SEMI_FINALS: 'sf', FINAL: 'final',
};
const STATUSES = {
  FINISHED: 'finished', AWARDED: 'finished',
  IN_PLAY: 'live', PAUSED: 'live',
  SCHEDULED: 'upcoming', TIMED: 'upcoming',
};

const team = (t) => (t && t.id
  ? { id: t.id, name: t.name, short: t.shortName || t.name, tla: t.tla || '', crest: t.crest || null }
  : { id: null, name: 'To be decided', short: 'TBD', tla: '', crest: null });

function finalScore(score) {
  // Use the score after normal time and extra time. Penalty shoot-outs are kept separate.
  if ((score.duration === 'PENALTY_SHOOTOUT' || score.duration === 'EXTRA_TIME') && score.regularTime && score.extraTime) {
    return { home: score.regularTime.home + score.extraTime.home, away: score.regularTime.away + score.extraTime.away };
  }
  return { home: score.fullTime?.home ?? null, away: score.fullTime?.away ?? null };
}

function mapMatch(m) {
  const pens = m.score?.penalties;
  return {
    id: m.id,
    utc: m.utcDate,
    status: STATUSES[m.status] || 'other',
    stage: STAGES[m.stage] || String(m.stage || '').toLowerCase(),
    matchday: m.matchday ?? null,
    home: team(m.homeTeam),
    away: team(m.awayTeam),
    score: finalScore(m.score || {}),
    ...(pens && pens.home != null ? { pens: { home: pens.home, away: pens.away } } : {}),
  };
}

async function footDataAdapter(source) {
  const get = async (path) => {
    const res = await fetch(`https://api.football-data.org/v4/competitions/${source.code}${path}`, {
      headers: { 'X-Auth-Token': TOKEN },
    });
    if (!res.ok) throw new Error(`football-data.org ${path} answered ${res.status}`);
    return res.json();
  };

  const standingsRes = await get('/standings');
  await sleep(1500); // the free plan allows 10 requests a minute
  const matchesRes = await get('/matches');
  await sleep(1500);
  let scorers = [];
  try {
    const scorersRes = await get('/scorers?limit=30');
    scorers = (scorersRes.scorers || []).map((s) => ({
      player: { id: s.player.id, name: s.player.name },
      team: team(s.team),
      played: s.playedMatches ?? 0,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      penalties: s.penalties ?? 0,
    }));
  } catch (err) {
    console.warn(`  Scorers not available (${err.message}). The Stats tab will say so.`);
  }

  const total = (standingsRes.standings || []).find((s) => s.type === 'TOTAL') || (standingsRes.standings || [])[0];
  const standings = ((total && total.table) || []).map((r) => ({
    pos: r.position, team: team(r.team), played: r.playedGames, won: r.won, draw: r.draw, lost: r.lost,
    gf: r.goalsFor, ga: r.goalsAgainst, gd: r.goalDifference, pts: r.points,
  }));

  const start = standingsRes.season?.startDate?.slice(0, 4);
  const end = standingsRes.season?.endDate?.slice(2, 4);
  const meta = {
    source: 'live',
    updated: new Date().toISOString(),
    season: start && end ? `${start}/${end}` : 'This season',
    competition: standingsRes.competition?.name || source.code,
  };
  return { meta, standings, matches: (matchesRes.matches || []).map(mapMatch), scorers };
}

const ADAPTERS = { 'football-data': footDataAdapter };

// ---------- run ----------
if (!TOKEN) {
  console.log('No FOOTBALL_DATA_TOKEN set. Keeping the demo data.');
  process.exit(0);
}

for (const source of SOURCES) {
  console.log(`Updating ${source.id}...`);
  try {
    const result = await ADAPTERS[source.adapter](source);
    if (!result.standings.length || !result.matches.length) throw new Error('the service sent back no table or no games');
    await mkdir(source.out, { recursive: true });
    for (const name of ['meta', 'standings', 'matches', 'scorers']) {
      await writeFile(`${source.out}/${name}.json`, JSON.stringify(result[name]) + '\n');
    }
    console.log(`  Done: ${result.standings.length} teams, ${result.matches.length} games, ${result.scorers.length} players.`);
  } catch (err) {
    console.warn(`  Could not update ${source.id}: ${err.message}. Keeping the existing data.`);
  }
}
