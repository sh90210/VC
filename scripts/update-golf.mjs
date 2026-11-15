// Saves a snapshot of each golf tour from ESPN into data/golf/<tour>.json.
// The app shows this snapshot instantly (and offline), then asks ESPN directly for live scores.
// If ESPN can't be reached the existing files stay as they are.
import { mkdir, writeFile } from 'node:fs/promises';
import { leaderboardUrl, scoreboardUrl, normalizeBoard, normalizeSchedule } from '../js/golf-data.js';

const TOURS = ['pga', 'eur'];
const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Score Hub family app)' } });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).pathname}`);
  return res.json();
};

await mkdir('data/golf', { recursive: true });
for (const tour of TOURS) {
  try {
    const [board, schedule] = await Promise.all([get(leaderboardUrl(tour)), get(scoreboardUrl(tour))]);
    const sched = normalizeSchedule(schedule);
    const snap = {
      meta: { source: 'live', updated: new Date().toISOString() },
      season: sched.season,
      schedule: sched.events,
      board: normalizeBoard(board, tour),
    };
    if (!snap.board) throw new Error('no tournament in the answer');
    await writeFile(`data/golf/${tour}.json`, JSON.stringify(snap) + '\n');
    console.log(`${tour}: ${snap.board.event.name}, ${snap.board.players.length} players, ${snap.schedule.length} events in the schedule`);
  } catch (err) {
    console.warn(`${tour}: could not update (${err.message}). Keeping the existing file.`);
  }
}
