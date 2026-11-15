import { h, crest, section, teamName, fmtDay } from '../../ui.js';
import { byTime } from './common.js';

// Groups a round's games into ties (two legs between the same teams, or a single game).
function buildTies(games) {
  const map = new Map();
  for (const m of [...games].sort(byTime)) {
    const key = m.home.id == null || m.away.id == null ? `game-${m.id}` : [m.home.id, m.away.id].sort().join('-');
    if (!map.has(key)) map.set(key, { a: m.home, b: m.away, legs: [] });
    map.get(key).legs.push(m);
  }
  return [...map.values()].map((t) => {
    let aggA = 0, aggB = 0, played = 0;
    for (const m of t.legs) {
      if (m.status !== 'finished' && m.status !== 'live') continue;
      played++;
      const aGoals = m.home.id === t.a.id ? m.score.home : m.score.away;
      const bGoals = m.home.id === t.a.id ? m.score.away : m.score.home;
      aggA += aGoals; aggB += bGoals;
    }
    const done = t.legs.every((m) => m.status === 'finished');
    let winner = null;
    if (done) {
      if (aggA !== aggB) winner = aggA > aggB ? t.a.id : t.b.id;
      else {
        const last = t.legs[t.legs.length - 1];
        if (last.pens) winner = (last.pens.home > last.pens.away ? last.home : last.away).id;
      }
    }
    return { ...t, aggA, aggB, played, winner };
  });
}

function legText(tie, m, i) {
  if (m.status === 'upcoming') return `Game ${i + 1}: ${fmtDay(m.utc)}`;
  if (m.status !== 'finished' && m.status !== 'live') return `Game ${i + 1}: postponed`;
  const aHome = m.home.id === tie.a.id;
  const sa = aHome ? m.score.home : m.score.away;
  const sb = aHome ? m.score.away : m.score.home;
  const pens = m.pens ? ` (${aHome ? m.pens.home : m.pens.away}–${aHome ? m.pens.away : m.pens.home} on penalties)` : '';
  return `Game ${i + 1}: ${sa}–${sb}${pens}`;
}

function tieCard(tie) {
  const row = (team, agg) => h('div', { class: `tie-row${tie.winner != null && tie.winner === team.id ? ' win' : ''}` },
    crest(team, 28), h('span', { class: 'name' }, teamName(team)),
    h('span', { class: 'agg' }, tie.played ? agg : '–'));
  return h('div', { class: 'sticker tie' },
    row(tie.a, tie.aggA), row(tie.b, tie.aggB),
    tie.legs.length > 1 || tie.legs[0].status !== 'finished'
      ? h('div', { class: 'tie-legs' }, tie.legs.map((m, i) => legText(tie, m, i)).join(' · '))
      : tie.legs[0].pens ? h('div', { class: 'tie-legs' }, `${tie.legs[0].pens.home}–${tie.legs[0].pens.away} on penalties`) : null);
}

function waitingCard() {
  return h('div', { class: 'sticker tie' },
    h('div', { class: 'tie-row tbd' }, crest(null, 28), h('span', { class: 'name' }, 'To be decided')),
    h('div', { class: 'tie-row tbd' }, crest(null, 28), h('span', { class: 'name' }, 'To be decided')));
}

export default function bracket({ data, comp }) {
  const { standings, matches } = data;

  const zones = comp.zones.map((z) => {
    const teams = standings.filter((r) => r.pos >= z.from && r.pos <= z.to);
    return h('div', { class: `sticker zone-card z-${z.tone}` },
      h('h3', {}, `${z.title} (places ${z.from} to ${z.to})`),
      h('p', {}, z.text),
      h('div', { class: 'crest-row' }, teams.map((r) => h('span', { title: `${r.pos}. ${r.team.name}` }, crest(r.team, 30)))));
  });

  const columns = comp.rounds.map((round) => {
    const ties = buildTies(matches.filter((m) => m.stage === round.key));
    const missing = Math.max(0, round.ties - ties.length);
    return h('div', { class: 'round' },
      h('h3', {}, round.label),
      ties.map(tieCard),
      Array.from({ length: missing }, waitingCard));
  });

  return h('div', {},
    section('Where teams are now', h('div', {}, zones)),
    section('Knockout rounds', h('p', { style: 'margin:0 0 10px' }, 'Swipe sideways to see every round. Teams show up here once they win their way in.')),
    h('div', { class: 'bracket', tabindex: '0', role: 'region', 'aria-label': 'Knockout rounds, scroll sideways' }, columns));
}
