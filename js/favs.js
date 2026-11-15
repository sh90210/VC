// Favourites live on the phone itself (nothing is sent anywhere).
export const GOLF_FAVS = 'scorehub.golf.players';
export const teamKey = (compId) => `scorehub.soccer.team.${compId}`;

export function readList(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
export function toggleInList(key, id) {
  const set = readList(key);
  if (set.has(id)) set.delete(id); else set.add(id);
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* private mode: ignore */ }
  return set;
}
export function readOne(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writeOne(key, value) {
  try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, String(value)); } catch { /* ignore */ }
}
