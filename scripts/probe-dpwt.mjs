// Probe: read DP World Tour robots.txt and terms (no scraping of score data yet) to see if automated use is allowed.
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': 'ScoreHub-probe/1.0' } }); return `${r.status}\n${(await r.text())}`; };
for (const u of ['https://www.dpworldtour.com/robots.txt']) {
  try { console.log('=== ' + u + '\n' + (await get(u)).slice(0, 2500)); } catch (e) { console.log('ERR', u, e.message); }
}
for (const u of ['https://www.dpworldtour.com/terms-and-conditions/', 'https://www.dpworldtour.com/terms-of-use/', 'https://www.dpworldtour.com/legal/terms-and-conditions/']) {
  try {
    const t = await get(u);
    const txt = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log('=== ' + u, t.slice(0, 3), 'len', txt.length);
    for (const m of txt.matchAll(/.{200}(scrap|automat|robot|spider|crawl|data mining|extract).{250}/gi)) console.log('  >>', m[0]);
  } catch (e) { console.log('ERR', u, e.message); }
}
