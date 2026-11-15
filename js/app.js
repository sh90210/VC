// Score Hub: the shell. Handles the home screen, the competition header + tabs, loading data, and routing.
import { SPORTS, VIEWS } from './config.js';
import { h, icon, ballSvg, timeAgo } from './ui.js';
import { createGolfStore } from './golf-data.js';

const app = document.getElementById('app');
const cache = new Map(); // soccer competition id -> { data, loadedAt }
const stores = new Map(); // golf competition id -> live store
let token = 0; // lets a newer screen cancel an older one that is still loading
let shell = null; // the header + tabs of the competition currently open
let cleanups = []; // things a screen wants undone when you leave it (timers, listeners)

const runCleanups = () => cleanups.splice(0).forEach((fn) => { try { fn(); } catch { /* ignore */ } });
const onLeave = (fn) => cleanups.push(fn);

function golfStore(comp) {
  if (!stores.has(comp.id)) stores.set(comp.id, createGolfStore(comp));
  return stores.get(comp.id);
}

async function getJson(url, optional) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url} (${res.status})`);
    return await res.json();
  } catch (err) {
    if (optional) return optional === 'object' ? null : [];
    throw err;
  }
}

async function loadSoccer(comp, force) {
  const hit = cache.get(comp.id);
  if (hit && !force) return hit.data;
  const [meta, standings, matches, scorers, teams] = await Promise.all([
    getJson(`${comp.dataPath}meta.json`),
    getJson(`${comp.dataPath}standings.json`),
    getJson(`${comp.dataPath}matches.json`),
    getJson(`${comp.dataPath}scorers.json`, true),
    getJson(`${comp.dataPath}teams.json`, true),
  ]);
  const data = { meta, standings, matches, scorers, teams };
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

function leaveComp() {
  if (!shell) return;
  runCleanups();
  shell.offs.forEach((off) => off());
  if (shell.comp.kind === 'golf') golfStore(shell.comp).stop();
  shell = null;
}

// ---------- Home ----------
function golfTileInfo(comp) {
  const info = h('p', {}, comp.blurb);
  const store = golfStore(comp);
  const fill = () => {
    const b = store.state.board;
    if (!b) return;
    const fresh = store.state.meta && Date.now() - Date.parse(store.state.meta.updated) < 3 * 3600 * 1000;
    info.replaceChildren(b.event.name, ' ', b.event.phase === 'live' && fresh ? h('span', { class: 'live-tag' }, h('i', { class: 'pulse' }), 'Live') : null);
  };
  if (store.state.board) fill(); else store.loadSnapshot().then(fill);
  return info;
}

function renderHome() {
  token++;
  leaveComp();
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
        sport.competitions.map((comp) => h('a', { class: 'sticker comp-tile', href: `#/${sport.id}/${comp.id}/${Object.keys(comp.views)[0]}` },
          h('span', { class: `logo ${comp.kind}` }, comp.kind === 'golf' ? icon('flag') : ballSvg()),
          h('div', {}, h('h3', {}, comp.name), comp.kind === 'golf' ? golfTileInfo(comp) : h('p', {}, comp.blurb)))))),
      h('div', { class: 'section' }, h('div', { class: 'soon-tile' }, 'More sports can be added here.'))));
}

// ---------- Competition ----------
function buildShell(sport, comp) {
  const main = h('main', { id: 'main' });
  const refreshBtn = h('button', { class: 'round-btn', type: 'button', 'aria-label': 'Refresh scores' }, icon('refresh'));
  const tabs = Object.keys(comp.views).filter((id) => !VIEWS[id].hidden).map((id) => h('a', { class: 'tab', href: `#/${sport.id}/${comp.id}/${id}`, 'data-view': id },
    h('span', { class: 'pill' }, icon(VIEWS[id].icon)), VIEWS[id].label));
  app.replaceChildren(
    h('header', { class: 'top' }, h('div', { class: 'top-in' },
      h('a', { class: 'round-btn', href: '#/', 'aria-label': 'Back to all sports' }, icon('back')),
      h('h1', {}, comp.name),
      refreshBtn)),
    main,
    h('nav', { class: 'tabs', 'aria-label': 'Sections' }, h('div', { class: 'tabs-in' }, tabs)));
  document.body.classList.remove('no-tabs');
  return { sport, comp, main, tabs, refreshBtn, viewId: null, offs: [] };
}

async function renderComp(sport, comp, viewId, param, force = false) {
  const mine = ++token;
  const golf = comp.kind === 'golf';
  if (!shell || shell.comp !== comp) {
    leaveComp();
    shell = buildShell(sport, comp);
    if (golf) {
      const store = golfStore(comp);
      shell.refreshBtn.addEventListener('click', () => store.refresh());
      shell.offs.push(store.subscribe((s) => shell && shell.refreshBtn.classList.toggle('spin', !!s.loading)));
      store.start();
    } else {
      shell.refreshBtn.addEventListener('click', () => renderComp(sport, comp, shell.viewId, undefined, true));
    }
  }
  shell.viewId = viewId;
  shell.tabs.forEach((t) => (t.getAttribute('data-view') === viewId ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
  document.title = `${VIEWS[viewId].label} · ${comp.name}`;
  runCleanups();
  const go = (v, p) => { location.hash = `#/${sport.id}/${comp.id}/${v}${p ? `/${p}` : ''}`; };

  if (golf) {
    try {
      const mod = await import(`./views/${comp.views[viewId]}.js`);
      if (mine !== token) return;
      shell.main.replaceChildren(mod.default({ store: golfStore(comp), comp, go, onLeave }));
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      if (mine === token) shell.main.replaceChildren(errorCard(() => renderComp(sport, comp, viewId, param, true)));
    }
    return;
  }

  shell.refreshBtn.classList.add('spin');
  if (!cache.has(comp.id) || force) shell.main.replaceChildren(...skeleton());
  try {
    const data = await loadSoccer(comp, force);
    const mod = await import(`./views/${comp.views[viewId]}.js`);
    if (mine !== token) return;
    shell.main.replaceChildren(mod.default({ data, comp, go, param, onLeave }), freshLine(data.meta));
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    if (mine === token) shell.main.replaceChildren(errorCard(() => renderComp(sport, comp, viewId, param, true)));
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
  return renderComp(sport, comp, viewId, parts[3]);
}
window.addEventListener('hashchange', route);
route();

// When the app comes back to the screen: golf asks for fresh scores, soccer refreshes if it has been a while.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !shell) return;
  if (shell.comp.kind === 'golf') { golfStore(shell.comp).wake(); return; }
  const hit = cache.get(shell.comp.id);
  if (hit && Date.now() - hit.loadedAt > 5 * 60 * 1000) renderComp(shell.sport, shell.comp, shell.viewId, undefined, true);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
