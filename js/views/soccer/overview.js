import { h, crest, ballSvg, section, emptyCard, fmtDay, teamName } from '../../ui.js';
import { matchRow, roundLabel, byTime } from './common.js';

export default function overview({ data, comp, go }) {
  const { meta, standings, matches, scorers } = data;
  const sorted = [...matches].sort(byTime);
  const live = sorted.filter((m) => m.status === 'live');
  const finished = sorted.filter((m) => m.status === 'finished').reverse();
  const next = sorted.find((m) => m.status === 'upcoming');
  const ref = live[0] || finished[0] || next;

  let where = '';
  if (ref) {
    where = ref.stage === 'league' && comp.leagueMatchdays
      ? `League phase · Matchday ${ref.matchday} of ${comp.leagueMatchdays}`
      : roundLabel(ref);
  }

  const star = [...scorers].sort((a, b) => b.goals - a.goals)[0];

  return h('div', {},
    meta.source === 'sample' && h('div', { class: 'demo' }, 'Demo scores. Real results show up once live data is switched on.'),
    h('div', { class: 'hero' },
      h('div', {}, h('h1', {}, comp.name), h('p', {}, meta.season), where && h('p', {}, where)),
      ballSvg()),

    live.length > 0 && section('Playing now', h('div', { class: 'sticker rows flush' }, live.map(matchRow))),

    next && section('Next game',
      h('div', { class: 'sticker rows flush' },
        h('div', { class: 'when', style: 'padding:10px 12px 0' }, `${roundLabel(next)} · ${fmtDay(next.utc)}`),
        matchRow(next)),
      { label: 'See all games', onClick: () => go('results') }),

    section('Latest scores',
      finished.length ? h('div', { class: 'sticker rows flush' }, finished.slice(0, 3).map(matchRow)) : emptyCard('No games have been played yet.'),
      { label: 'See all', onClick: () => go('results') }),

    standings.length > 0 && section('Top of the table',
      h('div', { class: 'sticker flush' }, standings.slice(0, 3).map((r) => h('div', { class: 'mini' },
        h('span', { class: `medal m${r.pos}` }, r.pos),
        crest(r.team, 30),
        h('span', { class: 'grow' }, teamName(r.team)),
        h('span', {}, h('span', { class: 'big' }, r.pts), ' pts')))),
      { label: 'Full table', onClick: () => go('table') }),

    star && section('Top scorer',
      h('div', { class: 'sticker flush' }, h('div', { class: 'mini' },
        crest(star.team, 34),
        h('span', { class: 'grow' }, star.player.name, h('small', {}, teamName(star.team))),
        h('span', {}, h('span', { class: 'big' }, star.goals), star.goals === 1 ? ' goal' : ' goals'))),
      { label: 'More stats', onClick: () => go('stats') }));
}
