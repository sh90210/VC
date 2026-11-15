import { h, flagImg, emptyCard } from '../../ui.js';
import { nice, parText } from './live.js';

export default function stats({ store, onLeave }) {
  const root = h('div', {});
  const draw = () => root.replaceChildren(...build(store.state));
  onLeave(store.subscribe(draw));
  draw();
  return root;
}

const listCard = (rows) => h('div', { class: 'sticker flush' }, rows);

function build(s) {
  if (!s.board) return [h('div', { class: 'skel' }), h('div', { class: 'skel' })];
  const { event, players, leaders, course } = s.board;
  const scored = players.filter((p) => p.toParNum != null);
  if (!scored.length) return [h('div', { class: 'section' }, emptyCard('Stats appear once players start scoring.'))];

  const stillIn = players.filter((p) => p.state !== 'cut' && p.state !== 'out').length;
  const lead = scored.find((p) => p.state !== 'cut') || scored[0];

  const climbers = players.filter((p) => p.move > 0).sort((a, b) => b.move - a.move).slice(0, 5);
  const best = [];
  for (const p of players) for (const r of p.rounds) if (r.strokes != null) best.push({ p, r });
  best.sort((a, b) => a.r.strokes - b.r.strokes);

  const out = [
    h('div', { class: 'section tiles', style: 'margin-top:18px' },
      h('div', { class: 'sticker tile' }, h('b', {}, players.length), h('small', {}, 'Players')),
      h('div', { class: 'sticker tile' }, h('b', {}, stillIn), h('small', {}, event.cut ? 'Still in' : 'Playing')),
      h('div', { class: 'sticker tile' }, h('b', {}, nice(lead.toPar)), h('small', {}, 'Leading score'))),
  ];

  if (best.length) {
    out.push(h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Best rounds')),
      listCard(best.slice(0, 5).map(({ p, r }) => h('div', { class: 'mini' },
        h('span', { class: 'medal' }, r.strokes),
        h('span', { class: 'grow' }, flagImg(p.flag, p.country), p.name, h('small', {}, `Round ${r.n} · ${nice(r.toPar)}`)))))));
  }
  if (climbers.length) {
    out.push(h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Climbing the board')),
      listCard(climbers.map((p) => h('div', { class: 'mini' },
        h('span', { class: 'move up big-move' }, `▲${p.move}`),
        h('span', { class: 'grow' }, flagImg(p.flag, p.country), p.name, h('small', {}, `Now ${p.pos} · ${nice(p.toPar)}`)))))));
  }
  if (leaders.length) {
    out.push(h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Stat leaders')),
      listCard(leaders.map((l) => h('div', { class: 'mini' },
        h('span', { class: 'grow' }, l.player, h('small', {}, l.label)),
        h('span', {}, h('span', { class: 'big' }, l.value), l.unit ? ` ${l.unit}` : ''))))));
  }
  const facts = [
    ['Prize money', event.purse],
    ['Course', course && `Par ${course.par}, ${course.yards ? course.yards.toLocaleString() : '?'} yards`],
    ['Cut line', event.cut && event.cut.score != null ? `${parText(event.cut.score)} (${event.cut.count} players made it)` : null],
    ['Defending champion', event.defending],
  ].filter(([, v]) => v);
  if (facts.length) {
    out.push(h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Quick facts')),
      listCard(facts.map(([k, v]) => h('div', { class: 'mini' }, h('span', { class: 'grow' }, k), h('b', {}, v))))));
  }
  return out;
}
