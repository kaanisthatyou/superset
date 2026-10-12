// Bir Spotify çalma listesinden (herkese açık) şarkı çekip müzik havuzuna uygun JSON basar.
//   node tools/spotify-playlist.mjs <playlist url|id> [--take 12] [--skip 0]
// Giriş gerekmez: Spotify'ın embed sayfasındaki veriyi okur, kapak görselini oEmbed'den alır.
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args.splice(i, 2)[1]) : fallback;
};
const take = flag('take', 12);
const skip = flag('skip', 0);
const id = (args[0] || '').match(/([A-Za-z0-9]{22})/)?.[1];
if (!id) {
  console.error('Kullanım: node tools/spotify-playlist.mjs <playlist url|id> [--take 12] [--skip 0]');
  process.exit(1);
}

const ua = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36' };
const html = await (await fetch(`https://open.spotify.com/embed/playlist/${id}`, { headers: ua })).text();
const next = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
const entity = next && JSON.parse(next[1])?.props?.pageProps?.state?.data?.entity;
if (!entity?.trackList) {
  console.error('Liste okunamadı (özel liste olabilir ya da Spotify sayfa yapısını değiştirdi).');
  process.exit(1);
}

const tracks = [];
for (const t of entity.trackList.filter((t) => t.isPlayable !== false).slice(skip, skip + take)) {
  const trackId = t.uri.split(':').pop();
  let cover;
  try {
    const o = await (await fetch(`https://open.spotify.com/oembed?url=spotify:track:${trackId}`, { headers: ua })).json();
    cover = o.thumbnail_url;
  } catch {
    cover = undefined;
  }
  tracks.push({ id: trackId, title: t.title, artist: t.subtitle, cover });
}
console.log(JSON.stringify({ playlist: entity.name ?? entity.title, tracks }, null, 2));
