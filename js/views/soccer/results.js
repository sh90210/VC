import { h, fmtDay, dayKey, emptyCard } from '../../ui.js';
import { matchRow, roundKey, roundLabel, roundOrder, byTime } from './common.js';

let picked = null; // the round you last looked at, remembered while the app is open

function startingRound(matches, rounds) {
  const live = matches.find((m) => m.status === 'live');
  if (live) return roundKey(live);
  const last = matches.filter((m) => m.status === 'finished').sort(byTime).pop();
  return roundKey(last || rounds[0].matches[0]);
}

export default function results({ data }) {
  const { matches } = data;
  if (!matches.length) return h('div', { class: 'section' }, emptyCard('No games yet. Check back soon.'));

  const groups = new Map();
  for (const m of matches) {
    const k = roundKey(m);
    if (!groups.has(k)) groups.set(k, { key: k, label: roundLabel(m), order: roundOrder(m), matches: [] });
    groups.get(k).matches.push(m);
  }
  const rounds = [...groups.values()].sort((a, b) => a.order - b.order);
  let active = rounds.some((r) => r.key === picked) ? picked : startingRound(matches, rounds);

  const chipRow = h('div', { class: 'chips', role: 'group', 'aria-label': 'Choose a round' });
  const list = h('div', { class: 'section', style: 'margin-top:12px' });

  function draw() {
    chipRow.replaceChildren(...rounds.map((r) => h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(r.key === active),
      onclick: () => { active = r.key; picked = r.key; draw(); },
    }, r.label)));
    const round = rounds.find((r) => r.key === active);
    const days = new Map();
    for (const m of [...round.matches].sort(byTime)) {
      const k = dayKey(m.utc);
      if (!days.has(k)) days.set(k, []);
      days.get(k).push(m);
    }
    list.replaceChildren(...[...days.values()].map((ms) => h('div', { class: 'day-group' },
      h('h2', { class: 'day' }, fmtDay(ms[0].utc)),
      h('div', { class: 'sticker rows flush' }, ms.map(matchRow)))));
    requestAnimationFrame(() => {
      const el = chipRow.querySelector('[aria-pressed="true"]');
      if (el) chipRow.scrollLeft = el.offsetLeft - (chipRow.clientWidth - el.offsetWidth) / 2;
    });
  }
  draw();
  return h('div', {}, chipRow, list);
}
