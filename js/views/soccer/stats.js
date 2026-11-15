import { h, crest, section, emptyCard, teamName } from '../../ui.js';
import { matchRow } from './common.js';

let mode = 'goals'; // 'goals' or 'assists'

export default function stats({ data }) {
  const { standings, matches, scorers } = data;
  const played = matches.filter((m) => m.status === 'finished');
  const goals = played.reduce((sum, m) => sum + m.score.home + m.score.away, 0);

  const tiles = h('div', { class: 'section tiles', style: 'margin-top:18px' },
    h('div', { class: 'sticker tile' }, h('b', {}, played.length), h('small', {}, 'Games played')),
    h('div', { class: 'sticker tile' }, h('b', {}, goals), h('small', {}, 'Goals scored')),
    h('div', { class: 'sticker tile' }, h('b', {}, played.length ? (goals / played.length).toFixed(1) : '0'), h('small', {}, 'Goals per game')));

  // Players
  const chips = h('div', { class: 'chips', style: 'padding:0 0 10px', role: 'group', 'aria-label': 'Choose a stat' });
  const list = h('div', { class: 'sticker flush' });
  function drawPlayers() {
    chips.replaceChildren(...[['goals', 'Goals'], ['assists', 'Assists']].map(([key, label]) => h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(mode === key),
      onclick: () => { mode = key; drawPlayers(); },
    }, label)));
    const other = mode === 'goals' ? 'assists' : 'goals';
    const top = [...scorers]
      .filter((p) => (p[mode] || 0) > 0)
      .sort((a, b) => b[mode] - a[mode] || (b[other] || 0) - (a[other] || 0))
      .slice(0, 10);
    list.replaceChildren(...(top.length
      ? top.map((p, i) => h('div', { class: 'mini' },
        h('span', { class: `medal m${i + 1}` }, i + 1),
        crest(p.team, 30),
        h('span', { class: 'grow' }, p.player.name, h('small', {}, teamName(p.team))),
        h('span', { class: 'big' }, p[mode])))
      : [h('div', { class: 'empty' }, 'Player stats are not available yet.')]));
  }
  drawPlayers();

  // Team awards, worked out from the results
  const awards = [];
  const withGames = standings.filter((r) => r.played > 0);
  if (withGames.length) {
    const attack = [...withGames].sort((a, b) => b.gf - a.gf || b.gd - a.gd)[0];
    const defence = [...withGames].sort((a, b) => a.ga - b.ga || b.gd - a.gd)[0];
    awards.push(teamAward('⚽', 'Most goals scored', attack.team, `${attack.gf} goals in ${attack.played} games`));
    awards.push(teamAward('🧤', 'Hardest to score against', defence.team, `Only ${defence.ga} let in, in ${defence.played} games`));
  }
  if (played.length) {
    const margin = (m) => Math.abs(m.score.home - m.score.away);
    const total = (m) => m.score.home + m.score.away;
    const win = [...played].sort((a, b) => margin(b) - margin(a) || total(b) - total(a))[0];
    const fest = [...played].sort((a, b) => total(b) - total(a) || margin(b) - margin(a))[0];
    awards.push(gameAward('💥', 'Biggest win', win));
    awards.push(gameAward('🎉', 'Most goals in one game', fest));
  }

  return h('div', {},
    tiles,
    section('Top players', h('div', {}, chips, list)),
    awards.length > 0 && section('Team highlights', h('div', {}, awards)),
    !played.length && h('div', { class: 'section' }, emptyCard('Stats show up after the first games.')));
}

function teamAward(emoji, title, team, text) {
  return h('div', { class: 'sticker award' },
    h('span', { class: 'icon', 'aria-hidden': 'true' }, emoji),
    h('div', {}, h('h3', {}, title), h('div', { class: 'who' }, crest(team, 24), teamName(team)), h('small', {}, text)));
}

function gameAward(emoji, title, match) {
  return h('div', { class: 'sticker award' },
    h('span', { class: 'icon', 'aria-hidden': 'true' }, emoji),
    h('div', {}, h('h3', {}, title)),
    h('div', { class: 'rows' }, matchRow(match)));
}
