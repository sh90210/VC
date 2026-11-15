// Score Hub: the shell. Handles the home screen, the competition header + tabs, loading data, and routing.
import { SPORTS, VIEWS } from './config.js';
import { h, icon, ballSvg, timeAgo } from './ui.js';

const app = document.getElementById('app');
const cache = new Map(); // competition id -> { data, loadedAt }
let token = 0; // lets a newer screen cancel an older one that is still loading
let shell = null; // the header + tabs of the competition currently open

async function getJson(url, optional) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url} (${res.status})`);
    return await res.json();
  } catch (err) {
    if (optional) return [];
    throw err;
  }
}

async function loadData(comp, force) {
  const hit = cache.get(comp.id);
  if (hit && !force) return hit.data;
  const [meta, standings, matches, scorers] = await Promise.all([
    getJson(`${comp.dataPath}meta.json`),
    getJson(`${comp.dataPath}standings.json`),
    getJson(`${comp.dataPath}matches.json`),
    getJson(`${comp.dataPath}scorers.json`, true),
  ]);
  const data = { meta, standings, matches, scorers };
  cache.set(comp.id, { data, loadedAt: Date.now() });
  return data;
}

const skeleton = () => [h('div', { class: 'skel' }), h('div', { class: 'skel' }), h('div', { class: 'skel' })];

function errorCard(retry) {
  return h('div', { class: 'section' },
    h('div', { class: 'sticker empty' },
      h('p', {}, 'The scores did not load. Check your internet and try again.'),
      h('button', { class: 'btn', type: 'button', onclick: retry }, 'Try again')));
}

// ---------- Home ----------
function renderHome() {
  token++;
  shell = null;
  document.title = 'Score Hub';
  document.body.classList.add('no-tabs');
  app.replaceChildren(
    h('header', { class: 'top' }, h('div', { class: 'top-in' }, h('h1', {}, 'Score Hub'))),
    h('main', {},
      h('div', { class: 'hero' },
        h('div', {}, h('h1', {}, 'Pick a game'), h('p', {}, 'Scores, tables and stats for the sports you follow.')),
        ballSvg()),
      SPORTS.map((sport) => h('section', { class: 'section' },
        h('div', { class: 'section-head' }, h('h2', {}, `${sport.emoji} ${sport.name}`)),
        sport.competitions.map((comp) => h('a', { class: 'sticker comp-tile', href: `#/${sport.id}/${comp.id}/overview` },
          h('span', { class: 'logo' }, ballSvg()),
          h('div', {}, h('h3', {}, comp.name), h('p', {}, comp.blurb)))))),
      h('div', { class: 'section' }, h('div', { class: 'soon-tile' }, 'More sports can be added here.'))));
}

// ---------- Competition ----------
function buildShell(sport, comp) {
  const main = h('main', { id: 'main' });
  const refreshBtn = h('button', { class: 'round-btn', type: 'button', 'aria-label': 'Refresh scores' }, icon('refresh'));
  const tabs = Object.keys(comp.views).map((id) => h('a', { class: 'tab', href: `#/${sport.id}/${comp.id}/${id}`, 'data-view': id },
    h('span', { class: 'pill' }, icon(VIEWS[id].icon)), VIEWS[id].label));
  app.replaceChildren(
    h('header', { class: 'top' }, h('div', { class: 'top-in' },
      h('a', { class: 'round-btn', href: '#/', 'aria-label': 'Back to all sports' }, icon('back')),
      h('h1', {}, comp.name),
      refreshBtn)),
    main,
    h('nav', { class: 'tabs', 'aria-label': 'Sections' }, h('div', { class: 'tabs-in' }, tabs)));
  document.body.classList.remove('no-tabs');
  return { sport, comp, main, tabs, refreshBtn, viewId: null };
}

async function renderComp(sport, comp, viewId, force = false) {
  const mine = ++token;
  if (!shell || shell.comp !== comp) {
    shell = buildShell(sport, comp);
    shell.refreshBtn.addEventListener('click', () => renderComp(sport, comp, shell.viewId, true));
  }
  shell.viewId = viewId;
  shell.tabs.forEach((t) => (t.getAttribute('data-view') === viewId ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
  document.title = `${VIEWS[viewId].label} · ${comp.name}`;
  shell.refreshBtn.classList.add('spin');
  if (!cache.has(comp.id) || force) shell.main.replaceChildren(...skeleton());
  try {
    const data = await loadData(comp, force);
    const mod = await import(`./views/${comp.views[viewId]}.js`);
    if (mine !== token) return;
    const go = (v) => { location.hash = `#/${sport.id}/${comp.id}/${v}`; };
    shell.main.replaceChildren(mod.default({ data, comp, go }), freshLine(data.meta));
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    if (mine === token) shell.main.replaceChildren(errorCard(() => renderComp(sport, comp, viewId, true)));
  } finally {
    if (mine === token) shell.refreshBtn.classList.remove('spin');
  }
}

function freshLine(meta) {
  const source = meta.source === 'live' ? 'Live data from football-data.org' : 'Demo data';
  return h('p', { class: 'fresh' }, `Updated ${timeAgo(meta.updated)} · ${source}`);
}

// ---------- Routing ----------
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const sport = SPORTS.find((s) => s.id === parts[0]);
  const comp = sport && sport.competitions.find((c) => c.id === parts[1]);
  if (!comp) return renderHome();
  const viewId = comp.views[parts[2]] ? parts[2] : Object.keys(comp.views)[0];
  return renderComp(sport, comp, viewId);
}
window.addEventListener('hashchange', route);
route();

// Quietly refresh when the app comes back to the screen after a while.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !shell) return;
  const hit = cache.get(shell.comp.id);
  if (hit && Date.now() - hit.loadedAt > 5 * 60 * 1000) renderComp(shell.sport, shell.comp, shell.viewId, true);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
