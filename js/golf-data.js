// Golf data. Turns ESPN's leaderboard into a small, tidy shape, and keeps it fresh while a tournament is on.
// No page code in here, so the scheduled GitHub job (Node) and the app (browser) share the same logic.

const LEADERBOARD = 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard';
export const scoreboardUrl = (tour) => `https://site.api.espn.com/apis/site/v2/sports/golf/${tour}/scoreboard`;
export const leaderboardUrl = (tour, eventId) => `${LEADERBOARD}?league=${tour}${eventId ? `&event=${eventId}` : ''}`;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
export function parToNum(text) {
  if (text == null || text === '--') return null;
  if (text === 'E') return 0;
  const n = parseInt(text, 10);
  return Number.isNaN(n) ? null : n;
}

function normalizePlayer(c) {
  const st = c.status || {};
  const stType = st.type || {};
  const athlete = c.athlete || {};
  let state = 'pre';
  if (stType.name === 'STATUS_CUT') state = 'cut';
  else if (/WITHDRAW|DISQUAL|STATUS_WD|STATUS_DQ/.test(stType.name || '')) state = 'out';
  else if (stType.state === 'in') state = 'in';
  else if (stType.state === 'post') state = 'post';

  // ESPN writes today's round like "-3(12)" (3 under, through 12) or "-5(F)" (finished).
  let today = null, thru = null;
  const m = /^\s*([+-]?\d+|E)\s*\(\s*(F|\d+)\s*\)/.exec(st.detail || '');
  if (m) { today = m[1]; thru = m[2] === 'F' ? 18 : parseInt(m[2], 10); }
  else if (state === 'in') thru = num(st.thru);

  const lines = Array.isArray(c.linescores) ? c.linescores : [];
  const rounds = lines.map((l) => ({
    n: l.period, strokes: num(l.value), toPar: l.displayValue ?? null,
    pos: num(l.currentPosition), startPos: num(l.startPosition),
  }));
  if (state === 'in' && today == null) {
    const cur = rounds.find((r) => r.n === st.period);
    if (cur && cur.toPar) today = cur.toPar;
  }
  // Places gained (+) or lost (-) in the latest round we have both numbers for.
  const last = [...rounds].reverse().find((r) => r.pos != null && r.startPos != null);
  const posName = (st.position && st.position.displayName) || null;

  return {
    id: String(c.id ?? athlete.id),
    name: athlete.displayName || 'Unknown player',
    short: athlete.shortName || athlete.displayName || '',
    country: (athlete.flag && athlete.flag.alt) || '',
    flag: (athlete.flag && athlete.flag.href) || null,
    amateur: !!athlete.amateur,
    order: num(c.sortOrder) ?? 9999,
    pos: posName,
    posNum: posName ? parseInt(String(posName).replace(/\D/g, ''), 10) || null : null,
    toPar: (c.score && c.score.displayValue) ?? null,
    toParNum: parToNum(c.score && c.score.displayValue),
    total: num(c.score && c.score.value),
    today, thru, hole: num(st.hole),
    state, teeTime: st.teeTime || null, round: num(st.period),
    rounds,
    move: last ? last.startPos - last.pos : null,
    earnings: num(c.earnings) > 0 ? c.earnings : null,
  };
}

export function normalizeBoard(json, tour) {
  const ev = json && json.events && json.events[0];
  if (!ev) return null;
  const comp = (ev.competitions && ev.competitions[0]) || {};
  const tourney = ev.tournament || {};
  const evState = (ev.status && ev.status.type && ev.status.type.state) || 'pre';
  const compState = (comp.status && comp.status.type && comp.status.type.state) || 'pre';
  const players = (comp.competitors || []).map(normalizePlayer).sort((a, b) => a.order - b.order);
  const hole = comp.holeByHoleSource && comp.holeByHoleSource.state;
  const upcomingTees = players.filter((p) => p.state === 'pre' && p.teeTime).map((p) => p.teeTime).sort();

  let phase = 'pre';
  if (evState === 'post') phase = 'final';
  else if (compState === 'in') phase = 'live';
  else if (compState === 'post') phase = 'between';
  else if (players.some((p) => p.state === 'in')) phase = 'live';

  const course = ev.courses && ev.courses[0];
  const w = course && course.weather;
  const cutPlayers = players.filter((p) => p.state === 'cut');

  return {
    tour,
    event: {
      id: String(ev.id), name: ev.name || tourney.displayName || 'Tournament',
      start: ev.date || null, end: ev.endDate || null,
      state: evState, phase,
      roundText: (comp.status && comp.status.type && (comp.status.type.detail || comp.status.type.description)) || '',
      round: num(comp.status && comp.status.period) || 1,
      rounds: num(tourney.numberOfRounds) || 4,
      purse: ev.displayPurse || null,
      major: !!tourney.major,
      defending: (ev.defendingChampion && ev.defendingChampion.athlete && ev.defendingChampion.athlete.displayName) || null,
      hasHoles: !!hole && hole !== 'none',
      nextTee: upcomingTees[0] || null,
      cut: cutPlayers.length || num(tourney.cutCount) > 0
        ? { round: num(tourney.cutRound), score: num(tourney.cutCount) > 0 ? num(tourney.cutScore) : null, count: num(tourney.cutCount) > 0 ? tourney.cutCount : null }
        : null,
    },
    course: course ? {
      name: course.name, par: num(course.shotsToPar), yards: num(course.totalYards),
      city: (course.address && course.address.city) || '', region: (course.address && (course.address.state || course.address.country)) || '',
      holes: (course.holes || []).map((x) => ({ n: x.number, par: x.shotsToPar, yards: x.totalYards })),
      weather: w ? {
        temp: num(w.temperature), wind: num(w.windSpeed), gust: num(w.gust), dir: w.windDirection || '',
        text: w.conditionId && Number.isNaN(Number(w.conditionId)) ? w.conditionId : '',
      } : null,
    } : null,
    players,
    leaders: (comp.leaders || []).map((l) => ({
      label: l.displayName, unit: l.abbreviation || '',
      player: l.leaders && l.leaders[0] && l.leaders[0].athlete && l.leaders[0].athlete.displayName,
      value: l.leaders && l.leaders[0] && l.leaders[0].displayValue,
    })).filter((l) => l.player),
  };
}

export function normalizeSchedule(json) {
  const league = json && json.leagues && json.leagues[0];
  return {
    season: (league && league.season && league.season.displayName) || '',
    events: ((league && league.calendar) || []).map((c) => ({ id: String(c.id), label: c.label, start: c.startDate, end: c.endDate })),
  };
}

// ---------- Live store (browser) ----------
// Shows the saved snapshot straight away, then asks ESPN directly and keeps asking while a tournament is on.
export function createGolfStore(comp) {
  const listeners = new Set();
  const state = { ready: false, board: null, schedule: [], season: '', meta: null, source: 'saved', updated: null, error: null, eventId: null, loading: false };
  let timer = null, running = false;
  const emit = () => listeners.forEach((fn) => fn(state));

  async function loadSnapshot() {
    try {
      const res = await fetch(comp.dataPath, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`saved scores (${res.status})`);
      const snap = await res.json();
      if (!state.board || state.source === 'saved') {
        state.board = snap.board || null;
        state.updated = Date.parse(snap.meta && snap.meta.updated) || null;
      }
      state.meta = snap.meta || null;
      state.schedule = snap.schedule || [];
      state.season = snap.season || '';
    } catch (err) {
      state.error = err.message;
    }
    state.ready = true;
    emit();
  }

  async function refresh() {
    state.loading = true;
    emit();
    try {
      const res = await fetch(leaderboardUrl(comp.espn, state.eventId));
      if (!res.ok) throw new Error(`ESPN answered ${res.status}`);
      const board = normalizeBoard(await res.json(), comp.id);
      if (board) { state.board = board; state.source = 'live'; state.updated = Date.now(); state.error = null; }
    } catch (err) {
      state.error = err.message;
    } finally {
      state.loading = false;
      state.ready = true;
      emit();
    }
  }

  function pollDelay() {
    const ev = state.board && state.board.event;
    if (!ev || state.eventId || ev.state === 'post') return null;
    if (ev.phase === 'live') return 30000;
    if (ev.phase === 'between') return 120000;
    if (ev.start && Date.parse(ev.start) - Date.now() < 3 * 3600 * 1000) return 60000;
    return null;
  }

  function loop() {
    clearTimeout(timer);
    const ms = pollDelay();
    if (!running || !ms) return;
    timer = setTimeout(async () => {
      if (!document.hidden) await refresh();
      loop();
    }, ms);
  }

  return {
    state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    loadSnapshot,
    refresh: async () => { await refresh(); loop(); },
    async start() {
      running = true;
      if (!state.ready) await loadSnapshot();
      await refresh();
      loop();
    },
    stop() { running = false; clearTimeout(timer); },
    async selectEvent(id) {
      state.eventId = id || null;
      state.board = null;
      state.source = 'saved';
      emit();
      await refresh();
      loop();
    },
    wake() {
      if (running && !document.hidden && (!state.updated || Date.now() - state.updated > 20000)) refresh().then(loop);
    },
  };
}
