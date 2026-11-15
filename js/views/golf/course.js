import { h, emptyCard } from '../../ui.js';

export default function course({ store, onLeave }) {
  const root = h('div', {});
  const draw = () => root.replaceChildren(...build(store.state));
  onLeave(store.subscribe(draw));
  draw();
  return root;
}

function holeTile(x) {
  return h('div', { class: `hole par${x.par}` }, h('b', {}, x.n), h('span', {}, `Par ${x.par}`), h('small', {}, `${x.yards} yd`));
}

function build(s) {
  if (!s.board) return [h('div', { class: 'skel' }), h('div', { class: 'skel' })];
  const { course: c, players, event } = s.board;
  if (!c) return [h('div', { class: 'section' }, emptyCard('No course details for this tournament.'))];
  const onCourse = players.filter((p) => p.state === 'in').length;
  const w = c.weather;
  const front = c.holes.slice(0, 9), back = c.holes.slice(9);
  const sum = (list, k) => list.reduce((t, x) => t + (x[k] || 0), 0);

  return [
    h('section', { class: 'section', style: 'margin-top:18px' },
      h('div', { class: 'sticker' },
        h('h2', {}, c.name),
        h('p', { style: 'margin:4px 0 0' }, [c.city, c.region].filter(Boolean).join(', ')),
        h('p', { class: 'small-note', style: 'margin-left:0' }, `Hosting the ${event.name}`))),
    h('div', { class: 'section tiles' },
      h('div', { class: 'sticker tile' }, h('b', {}, c.par ?? '–'), h('small', {}, 'Par')),
      h('div', { class: 'sticker tile' }, h('b', {}, c.yards ? c.yards.toLocaleString() : '–'), h('small', {}, 'Yards')),
      h('div', { class: 'sticker tile' }, h('b', {}, event.phase === 'live' ? onCourse : '–'), h('small', {}, 'Players out now'))),
    w && h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Weather')),
      h('div', { class: 'sticker tiles flat' },
        h('div', { class: 'tile' }, h('b', {}, w.temp != null ? `${w.temp}°F` : '–'), h('small', {}, w.text || 'Temperature')),
        h('div', { class: 'tile' }, h('b', {}, w.wind != null ? `${w.wind} mph` : '–'), h('small', {}, w.dir ? `Wind from ${w.dir}` : 'Wind')),
        h('div', { class: 'tile' }, h('b', {}, w.gust != null ? `${w.gust} mph` : '–'), h('small', {}, 'Gusts')))),
    c.holes.length === 18 && h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', {}, 'The holes')),
      h('div', { class: 'sticker' },
        h('p', { class: 'small-note', style: 'margin:0 0 8px' }, `Front nine: par ${sum(front, 'par')}, ${sum(front, 'yards').toLocaleString()} yards`),
        h('div', { class: 'holes' }, front.map(holeTile)),
        h('p', { class: 'small-note', style: 'margin:14px 0 8px' }, `Back nine: par ${sum(back, 'par')}, ${sum(back, 'yards').toLocaleString()} yards`),
        h('div', { class: 'holes' }, back.map(holeTile)))),
  ];
}
