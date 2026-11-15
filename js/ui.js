// Small helpers shared by every screen. No framework: just DOM building.

const SVG_NS = 'http://www.w3.org/2000/svg';

// h('div', { class: 'x', onclick: fn }, 'text', childNode, [more children])
// Text is always inserted as text (never as HTML), so data from the internet can't inject markup.
export function h(tag, props, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

const ICONS = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.4 4.4H9.6L8.2 10.3z"/><path d="M12 3v4.5M20.4 9.3l-4.6 1M17.2 19.2l-2.8-4.5M6.8 19.2l2.8-4.5M3.6 9.3l4.6 1"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 10h18M3 15h18M9 10v10"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  bracket: '<path d="M3 5h5v5H3zM3 14h5v5H3zM16 9.5h5v5h-5zM8 7.5h3.5v9H8M11.5 12H16"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20.5 4v7h-7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
};

export function icon(name) {
  const s = h('span', { class: 'ic-svg' });
  s.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return s;
}

// A drawn soccer ball for the hero sticker.
export function ballSvg() {
  const pts = (cx, cy, r, rot) => Array.from({ length: 5 }, (_, i) => {
    const a = ((rot + 72 * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const at = (deg, r) => [50 + r * Math.cos((deg * Math.PI) / 180), 50 + r * Math.sin((deg * Math.PI) / 180)];
  let inner = '', spokes = '', patches = '';
  inner = `<polygon points="${pts(50, 50, 15, -90)}" fill="#1a1744"/>`;
  for (let i = 0; i < 5; i++) {
    const deg = -90 + 72 * i;
    const [x1, y1] = at(deg, 15), [x2, y2] = at(deg, 33);
    spokes += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    const [cx, cy] = at(deg, 43);
    patches += `<polygon points="${pts(cx, cy, 11, deg + 180)}" fill="#1a1744"/>`;
  }
  const s = h('span', { class: 'ball', 'aria-hidden': 'true' });
  s.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><clipPath id="ballclip"><circle cx="50" cy="50" r="44"/></clipPath></defs><circle cx="50" cy="50" r="44" fill="#fff"/><g clip-path="url(#ballclip)">${patches}</g><g stroke="#1a1744" stroke-width="3" stroke-linecap="round">${spokes}</g>${inner}<circle cx="50" cy="50" r="44" fill="none" stroke="#1a1744" stroke-width="4"/></svg>`;
  return s;
}

function hue(text) {
  let n = 0;
  for (const c of String(text)) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return n % 360;
}

// Team logo. Falls back to a coloured badge with the team's letters.
export function crest(team, size = 28) {
  const t = team || {};
  const style = `--s:${size}px`;
  const badge = () => h('span', {
    class: 'badge', style: `${style};--h:${hue(t.name)}`, 'aria-hidden': 'true',
  }, t.id == null ? '?' : (t.tla || t.short || '?').slice(0, 3));
  if (t.crest) {
    const img = h('img', { class: 'crest', src: t.crest, alt: '', loading: 'lazy', width: size, height: size, style });
    img.addEventListener('error', () => img.replaceWith(badge()));
    return img;
  }
  return badge();
}

export const teamName = (t) => (t && t.id != null ? t.short || t.name : 'To be decided');

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDay = (iso) => dayFmt.format(new Date(iso));
export const fmtTime = (iso) => timeFmt.format(new Date(iso));
export function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
export function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function section(title, body, action) {
  return h('section', { class: 'section' },
    h('div', { class: 'section-head' },
      h('h2', {}, title),
      action && h('button', { class: 'link-btn', type: 'button', onclick: action.onClick }, action.label)),
    body);
}

export const emptyCard = (text) => h('div', { class: 'sticker empty' }, text);
