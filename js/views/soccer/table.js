import { h, crest, emptyCard, teamName } from '../../ui.js';
import { formFor, zoneFor } from './common.js';

export default function table({ data, comp }) {
  const { standings, matches } = data;
  if (!standings.length) return h('div', { class: 'section' }, emptyCard('The table appears after the first games.'));

  const blocks = standings.map((r) => {
    const zone = zoneFor(r.pos, comp.zones);
    const form = formFor(matches, r.team.id);
    const detail = h('div', { class: `tdetail z-${zone.tone}`, hidden: true },
      h('div', {}, h('b', {}, r.gf), h('small', {}, 'Goals scored')),
      h('div', {}, h('b', {}, r.ga), h('small', {}, 'Goals let in')),
      h('div', {}, h('b', {}, `${r.gd > 0 ? '+' : ''}${r.gd}`), h('small', {}, 'Goal difference')),
      form.length > 0 && h('div', { class: 'form' }, h('small', {}, 'Last games'), h('div', {},
        form.map((c) => h('span', { class: `dot ${c}`, title: { W: 'Won', D: 'Draw', L: 'Lost' }[c] }, c)))));
    const row = h('button', {
      class: `trow z-${zone.tone}`, type: 'button', 'aria-expanded': 'false',
      'aria-label': `${r.pos}. ${r.team.name}, ${r.pts} points. Tap for more.`,
      onclick: () => {
        detail.hidden = !detail.hidden;
        row.setAttribute('aria-expanded', String(!detail.hidden));
      },
    },
      h('span', { class: 'pos' }, r.pos),
      h('span', { class: 'tname' }, crest(r.team, 24), h('span', { class: 'name' }, teamName(r.team))),
      h('span', { class: 'num' }, r.played), h('span', { class: 'num' }, r.won),
      h('span', { class: 'num' }, r.draw), h('span', { class: 'num' }, r.lost),
      h('span', { class: 'num pts' }, r.pts));
    return h('div', { class: 'tblock' }, row, detail);
  });

  return h('div', { class: 'section', style: 'margin-top:18px' },
    h('div', { class: 'sticker flush' },
      h('div', { class: 'thead', 'aria-hidden': 'true' },
        h('span', { class: 'pos' }, '#'), h('span', {}, 'Team'),
        h('span', { class: 'num' }, 'P'), h('span', { class: 'num' }, 'W'),
        h('span', { class: 'num' }, 'D'), h('span', { class: 'num' }, 'L'),
        h('span', { class: 'num' }, 'Pts')),
      blocks),
    h('p', { class: 'small-note' }, 'P = played, W = won, D = draw, L = lost, Pts = points. Tap a team to see more.'),
    h('ul', { class: 'legend' }, comp.zones.map((z) => h('li', {},
      h('i', { class: `swatch z-${z.tone}` }), `Places ${z.from} to ${z.to}: ${z.title}`))));
}
