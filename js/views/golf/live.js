// The live leaderboard. Redraws every time the store gets fresh scores.
import { h, flagImg, fmtDay, fmtTime } from '../../ui.js';
import { readList, toggleInList, GOLF_FAVS } from '../../favs.js';

let filter = 'all';
let showAll = false;
const open = new Set(); // players whose row is expanded

export const parText = (n) => (n == null ? '–' : n === 0 ? 'E' : n > 0 ? `+${n}` : `−${Math.abs(n)}`);
export const nice = (t) => (t == null || t === '--' ? '–' : String(t).replace('-', '−'));
export const scoreClass = (n) => (n == null ? '' : n < 0 ? 'under' : n > 0 ? 'over' : 'even');
export function agoText(s) {
  if (s.loading) return 'Updating…';
  if (!s.updated) return '';
  const secs = Math.max(0, Math.round((Date.now() - s.updated) / 1000));
  if (secs < 5) return 'Updated just now';
  if (secs < 90) return `Updated ${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 90) return `Updated ${mins} min ago`;
  return `Updated ${Math.round(mins / 60)} h ago`;
}

export default function live({ store, comp, onLeave }) {
  const root = h('div', {});
  const draw = () => root.replaceChildren(...build(store.state, store, draw, comp));
  const off = store.subscribe(draw);
  const ticker = setInterval(() => {
    const el = root.querySelector('.ago');
    if (el) el.textContent = agoText(store.state);
  }, 1000);
  onLeave(() => { off(); clearInterval(ticker); });
  draw();
  return root;
}

function build(s, store, redraw, comp) {
  if (!s.board) {
    if (!s.ready) return [h('div', { class: 'skel' }), h('div', { class: 'skel' }), h('div', { class: 'skel' })];
    return [h('div', { class: 'section' }, h('div', { class: 'sticker empty' },
      h('p', {}, s.eventId ? 'Loading that tournament…' : 'No tournament to show right now.'),
      h('button', { class: 'btn', type: 'button', onclick: () => store.refresh() }, 'Try again')))];
  }
  const { event, course, players } = s.board;
  // The feed can lag behind the real course: if players' tee times have passed but ESPN still shows them as waiting, say so.
  const behind = ['between', 'pre'].includes(event.phase) && players.some((p) => p.state === 'pre' && p.teeTime && Date.parse(p.teeTime) < Date.now() - 10 * 60000);
  const officialUrl = comp.espn === 'eur' ? 'https://www.dpworldtour.com/' : 'https://www.pgatour.com/leaderboard';
  const favs = readList(GOLF_FAVS);
  const demo = s.meta && s.meta.source === 'sample' && s.source !== 'live';

  // --- header sticker
  let tag;
  if (event.phase === 'live') tag = h('span', { class: 'live-tag' }, h('i', { class: 'pulse' }), `Live · Round ${event.round}`);
  else if (behind) tag = h('span', { class: 'tag' }, `Round ${event.round + 1} under way`);
  else if (event.phase === 'between') tag = h('span', { class: 'tag' }, `Round ${event.round} finished`);
  else if (event.phase === 'final') tag = h('span', { class: 'tag' }, 'Final results');
  else tag = h('span', { class: 'tag' }, `Starts ${fmtDay(event.start)}`);

  const pips = Array.from({ length: event.rounds }, (_, i) => {
    const n = i + 1;
    const done = event.phase === 'final' || n < event.round || (n === event.round && event.phase === 'between');
    const now = n === event.round && event.phase === 'live';
    return h('span', { class: `rpip ${done ? 'done' : now ? 'now' : ''}` }, `R${n}`);
  });
  const facts = [event.purse && `Prize ${event.purse}`, course && course.par && `Par ${course.par}`, course && course.yards && `${course.yards.toLocaleString()} yards`].filter(Boolean).join(' · ');
  const nextLine = event.phase === 'between' && !behind && event.nextTee ? `Round ${event.round + 1} tees off at ${fmtTime(event.nextTee)}` : '';
  const src = s.source === 'live' ? 'Live from ESPN' : s.error ? 'Saved scores (live feed not reached)' : 'Saved scores';

  const hero = h('div', { class: 'golf-hero' },
    h('div', { class: 'row-between' }, tag, h('span', { class: 'ago' }, agoText(s))),
    h('h1', {}, event.name),
    course && h('p', {}, [course.name, course.city].filter(Boolean).join(' · ')),
    h('div', { class: 'rpips', 'aria-label': `Round ${event.round} of ${event.rounds}` }, pips),
    nextLine && h('p', { class: 'next-line' }, nextLine),
    facts && h('p', { class: 'facts' }, facts),
    h('p', { class: 'src' }, src));

  const notes = [];
  if (behind) {
    notes.push(h('div', { class: 'demo' }, `Scores are behind. Round ${event.round + 1} has started, but the free score feed has only sent Round ${event.round}. `,
      h('a', { class: 'link-btn', href: officialUrl, target: '_blank', rel: 'noopener' }, 'Open the official live scores')));
  }
  if (demo) notes.push(h('div', { class: 'demo' }, 'Demo scores. Real tournament scores appear once the live feed is reached.'));
  if (s.eventId) {
    notes.push(h('div', { class: 'demo' }, 'You are looking at a past tournament. ',
      h('button', { class: 'link-btn', type: 'button', onclick: () => store.selectEvent(null) }, 'Back to this week')));
  }
  if (!event.hasHoles && event.phase !== 'final' && event.phase !== 'pre') {
    notes.push(h('div', { class: 'demo' }, 'This tour sends scores when each round finishes, so numbers can change in jumps.'));
  }

  // --- my players
  const mine = players.filter((p) => favs.has(p.id));
  const mineBlock = mine.length ? [h('section', { class: 'section' },
    h('div', { class: 'section-head' }, h('h2', {}, 'My players')),
    h('div', { class: 'sticker flush' }, mine.map((p) => row(p, event, favs, redraw, 'mine'))))] : [];

  // --- filters + list
  const chips = [['all', 'All'], ['top10', 'Top 10'], ['now', 'Playing now'], ['stars', 'My players']];
  const chipRow = h('div', { class: 'chips tight', role: 'group', 'aria-label': 'Filter the leaderboard' }, chips.map(([k, label]) => h('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(filter === k),
    onclick: () => { filter = k; showAll = false; redraw(); },
  }, label)));

  let list = players;
  if (filter === 'top10') list = players.filter((p) => p.posNum != null && p.posNum <= 10 && p.state !== 'cut');
  else if (filter === 'now') list = players.filter((p) => p.state === 'in');
  else if (filter === 'stars') list = players.filter((p) => favs.has(p.id));
  const limit = filter === 'all' && !showAll ? 60 : list.length;
  const shown = list.slice(0, limit);

  const rows = [];
  let cutDrawn = false;
  for (const p of shown) {
    if (filter === 'all' && p.state === 'cut' && !cutDrawn) {
      cutDrawn = true;
      const c = event.cut;
      rows.push(h('div', { class: 'cutline' }, c && c.score != null
        ? `Cut line: ${parText(c.score)}${c.count ? ` · ${c.count} players made it` : ''}. Players below missed the cut.`
        : 'Cut line. Players below missed the cut.'));
    }
    rows.push(row(p, event, favs, redraw));
  }
  if (!rows.length) {
    rows.push(h('div', { class: 'empty' }, filter === 'stars'
      ? 'Tap a player, then the star, to follow them here.'
      : filter === 'now' ? 'Nobody is on the course right now.' : 'No players to show.'));
  }

  const more = filter === 'all' && !showAll && list.length > limit
    ? h('button', { class: 'btn wide', type: 'button', onclick: () => { showAll = true; redraw(); } }, `Show all ${list.length} players`) : null;

  return [
    ...notes, hero, ...mineBlock,
    h('section', { class: 'section', style: 'margin-top:18px' },
      h('div', { class: 'section-head' }, h('h2', {}, 'Leaderboard')),
      chipRow,
      h('div', { class: 'sticker flush lb' }, rows),
      more),
  ];
}

function row(p, event, favs, redraw, scope = '') {
  const id = `${scope}${p.id}`;
  const isOpen = open.has(id);
  const star = favs.has(p.id);

  let sub;
  if (p.state === 'in') {
    sub = h('span', { class: 'psub' },
      event.hasHoles && p.thru != null && h('span', { class: 'pips18', 'aria-hidden': 'true' }, Array.from({ length: 18 }, (_, i) => h('i', { class: i < p.thru ? 'on' : '' }))),
      p.thru != null ? `Hole ${p.thru} done` : 'On the course');
  } else if (p.state === 'pre') {
    sub = h('span', { class: 'psub' }, p.teeTime ? `Tees off ${fmtTime(p.teeTime)}` : 'Not started');
  } else if (p.state === 'post') {
    sub = h('span', { class: 'psub' }, event.state === 'post' ? 'Finished' : 'Done for today');
  } else if (p.state === 'cut') sub = h('span', { class: 'psub' }, 'Missed the cut');
  else sub = h('span', { class: 'psub' }, 'Withdrew');

  const todayNum = p.today == null ? null : (p.today === 'E' ? 0 : parseInt(p.today, 10));
  const main = h('button', {
    class: 'prow-main', type: 'button', 'aria-expanded': String(isOpen),
    onclick: () => { if (open.has(id)) open.delete(id); else open.add(id); redraw(); },
  },
    h('span', { class: 'ppos' }, p.state === 'cut' ? 'CUT' : p.pos || '–',
      p.move ? h('small', { class: `move ${p.move > 0 ? 'up' : 'down'}`, 'aria-label': `${Math.abs(p.move)} places ${p.move > 0 ? 'up' : 'down'}` }, `${p.move > 0 ? '▲' : '▼'}${Math.abs(p.move)}`) : null),
    h('span', { class: 'pwho' },
      h('span', { class: 'pname' }, flagImg(p.flag, p.country), p.name, star && h('span', { class: 'star-on', 'aria-label': 'following' }, '★')),
      sub),
    h('span', { class: 'pscore' },
      h('b', { class: scoreClass(p.toParNum) }, nice(p.toPar)),
      p.today != null && p.state !== 'cut' ? h('small', {}, `Today ${nice(p.today)}`) : null));

  const roundsHead = p.rounds.map((r) => h('span', {}, `R${r.n}`));
  const roundsVals = p.rounds.map((r) => {
    const isLive = p.state === 'in' && r.strokes == null && r.n === p.round;
    return h('span', { class: 'rv' }, r.strokes != null ? h('b', {}, r.strokes) : '–',
      h('small', { class: scoreClass(r.toPar == null ? null : parseInt(r.toPar === 'E' ? 0 : r.toPar, 10)) }, r.toPar != null ? nice(r.toPar) : isLive && p.today ? nice(p.today) : ''));
  });
  const journey = p.rounds.filter((r) => r.pos != null);
  const more = h('div', { class: 'pmore', hidden: !isOpen },
    p.rounds.length > 0 && h('div', { class: 'rgrid', style: `--n:${p.rounds.length}` }, roundsHead, roundsVals),
    journey.length > 1 && h('p', {}, h('small', {}, 'Place after each round: '), journey.map((r) => `R${r.n} ${r.pos}`).join(' → ')),
    p.earnings && h('p', {}, h('small', {}, 'Prize money: '), `$${p.earnings.toLocaleString()}`),
    h('button', {
      class: 'btn small', type: 'button',
      onclick: () => { toggleInList(GOLF_FAVS, p.id); redraw(); },
    }, star ? '★ Following' : '☆ Follow this player'));

  return h('div', { class: `prow st-${p.state}${isOpen ? ' open' : ''}${todayNum != null && todayNum < 0 && p.state === 'in' ? ' hot' : ''}` }, main, more);
}
