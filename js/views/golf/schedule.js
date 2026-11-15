import { h, fmtRange, emptyCard } from '../../ui.js';

let showAllDone = false;

function statusOf(ev, s) {
  const cur = s.board && !s.eventId ? s.board.event : null;
  if (cur && cur.id === ev.id) return cur.state === 'post' ? 'done' : cur.state === 'in' ? 'live' : 'soon';
  const now = Date.now();
  if (now < Date.parse(ev.start)) return 'soon';
  if (now > Date.parse(ev.end) + 36 * 3600 * 1000) return 'done';
  return 'live';
}

export default function schedule({ store, go, onLeave }) {
  const root = h('div', {});
  const draw = () => root.replaceChildren(...build(store.state, store, go, draw));
  onLeave(store.subscribe(draw));
  draw();
  return root;
}

function build(s, store, go, redraw) {
  if (!s.ready) return [h('div', { class: 'skel' }), h('div', { class: 'skel' })];
  const events = [...s.schedule].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  if (!events.length) return [h('div', { class: 'section' }, emptyCard('The schedule is not available right now.'))];

  const tagged = events.map((ev) => ({ ev, st: statusOf(ev, s) }));
  const liveNow = tagged.filter((t) => t.st === 'live');
  const soon = tagged.filter((t) => t.st === 'soon');
  const done = tagged.filter((t) => t.st === 'done').reverse();

  const item = ({ ev, st }) => {
    let action = null;
    if (st === 'live') action = h('button', { class: 'btn small', type: 'button', onclick: () => { if (s.eventId) store.selectEvent(null); go('live'); } }, 'Live scores');
    else if (st === 'done') action = h('button', { class: 'btn small plain', type: 'button', onclick: () => { store.selectEvent(ev.id); go('live'); } }, 'Results');
    return h('div', { class: 'srow' },
      h('div', { class: 'grow' }, h('b', {}, ev.label), h('small', {}, fmtRange(ev.start, ev.end))),
      st === 'live' ? h('span', { class: 'live-tag' }, h('i', { class: 'pulse' }), 'Live') : null,
      action);
  };

  const out = [];
  if (liveNow.length) out.push(section('This week', liveNow.map(item)));
  if (soon.length) out.push(section('Coming up', soon.slice(0, 8).map(item)));
  else out.push(h('div', { class: 'section' }, h('p', { class: 'small-note' }, 'No more tournaments in this season. The next season appears here when the tour publishes it.')));
  if (done.length) {
    out.push(section('Finished', (showAllDone ? done : done.slice(0, 8)).map(item)));
    if (!showAllDone && done.length > 8) out.push(h('div', { class: 'section' }, h('button', { class: 'btn wide', type: 'button', onclick: () => { showAllDone = true; redraw(); } }, `Show all ${done.length} finished`)));
  }
  if (s.season) out.push(h('p', { class: 'fresh' }, `Season ${s.season}`));
  return out;
}

function section(title, rows) {
  return h('section', { class: 'section' }, h('div', { class: 'section-head' }, h('h2', {}, title)), h('div', { class: 'sticker flush' }, rows));
}
