// Shared pieces for the soccer screens.
import { h, crest, fmtTime, teamName } from '../../ui.js';

export const STAGE_ORDER = ['league', 'playoffs', 'r16', 'qf', 'sf', 'final'];
export const STAGE_LABEL = {
  league: 'League phase', playoffs: 'Playoffs', r16: 'Round of 16',
  qf: 'Quarter-finals', sf: 'Semi-finals', final: 'Final',
};

export const roundLabel = (m) => (m.stage === 'league' ? `Matchday ${m.matchday}` : STAGE_LABEL[m.stage] || m.stage);
export const roundKey = (m) => (m.stage === 'league' ? `league-${m.matchday}` : m.stage);
export const roundOrder = (m) => STAGE_ORDER.indexOf(m.stage) * 100 + (m.stage === 'league' ? m.matchday || 0 : 0);
export const byTime = (a, b) => new Date(a.utc) - new Date(b.utc);
export const zoneFor = (pos, zones) => zones.find((z) => pos >= z.from && pos <= z.to) || zones[zones.length - 1];

// One game: home team, score (or kick-off time), away team.
export function matchRow(m) {
  const finished = m.status === 'finished';
  const live = m.status === 'live';
  const hs = (m.score && m.score.home) ?? 0;
  const as = (m.score && m.score.away) ?? 0;
  let center;
  if (finished || live) {
    center = h('div', { class: 'score-wrap' },
      h('div', { class: `scorebox${live ? ' live' : ''}` }, `${hs} – ${as}`),
      live && h('span', { class: 'sub live-tag' }, 'Live'),
      m.pens && h('span', { class: 'sub' }, `${m.pens.home}–${m.pens.away} on penalties`));
  } else if (m.status === 'upcoming') {
    center = h('div', { class: 'score-wrap' }, h('div', { class: 'scorebox soon' }, fmtTime(m.utc)));
  } else {
    center = h('div', { class: 'score-wrap' }, h('div', { class: 'scorebox soon' }, 'Postponed'));
  }
  const label = finished || live
    ? `${teamName(m.home)} ${hs}, ${teamName(m.away)} ${as}`
    : `${teamName(m.home)} against ${teamName(m.away)}`;
  return h('div', { class: 'match', role: 'group', 'aria-label': label },
    h('div', { class: `team home${finished && hs > as ? ' win' : ''}` }, h('span', { class: 'name' }, teamName(m.home)), crest(m.home, 26)),
    center,
    h('div', { class: `team away${finished && as > hs ? ' win' : ''}` }, crest(m.away, 26), h('span', { class: 'name' }, teamName(m.away))));
}

// A team's last results, oldest first: ['W', 'D', 'L', ...]
export function formFor(matches, teamId, n = 5) {
  return matches
    .filter((m) => m.status === 'finished' && (m.home.id === teamId || m.away.id === teamId))
    .sort(byTime)
    .slice(-n)
    .map((m) => {
      const mine = m.home.id === teamId ? m.score.home : m.score.away;
      const theirs = m.home.id === teamId ? m.score.away : m.score.home;
      return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
    });
}
