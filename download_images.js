// Downloads the real photo for each researched listing (per destinations/*/notes.md),
// straight from each property's own page. Saves to images/<imgKey>.<ext>.
// Airbnb listings carry a direct image URL (og:image) we already resolved; Booking.com
// blocks automated fetches, so those fall back to scraping the page and may not resolve —
// the site shows a gradient placeholder for any photo that fails to download.
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Booking imgUrl values are the resolved cf.bstatic.com gallery photos (Booking blocks direct
// page scraping, so these were extracted once via a rendering reader and are pinned here).
const listings = [
  // KALYVIA & PEZOULA / MOUZAKI (Booking)
  {key:'neochori-1', url:'https://www.booking.com/hotel/gr/bila-andreou.html', // Ersis Retreat, Kalyvia
   imgUrl:'https://cf.bstatic.com/xdata/images/hotel/max1024x768/739531031.jpg?k=2832de813ab163c016cbba59bac81122c5e58ce46866a486242775fd3a00d9f9&o='},
  {key:'neochori-2', url:'https://www.booking.com/hotel/gr/sefis-house.html', // Sefis House, Mouzaki
   imgUrl:'https://cf.bstatic.com/xdata/images/hotel/max1024x768/623472829.jpg?k=c242538e77e8026e6a630ac13b7b9b3abff658590fa7966790f26a1aa4a136c3&o='},
  {key:'kalyvia-1', url:'https://www.booking.com/hotel/gr/kazarma-lake-resort-spa.html',
   imgUrl:'https://cf.bstatic.com/xdata/images/hotel/max1024x768/48740214.jpg?k=d3c35d63d61a6a9b42147699e3a763af4898bf93dbd08c4f918abd302abbddc7&o='},
  {key:'kalyvia-2', url:'https://www.booking.com/hotel/gr/petrino-1952-kerasia-limne-plastera.html', // Petrino 1952, Kerasia
   imgUrl:'https://cf.bstatic.com/xdata/images/hotel/max1024x768/846203701.jpg?k=5f5231bc1e7eb569735f60132406e95ad5f5ff9142dc924a4f676d9c60d45f36&o='},
  {key:'kalyvia-3', url:'https://www.airbnb.com/rooms/765276277801888458',
   imgUrl:'https://a0.muscache.com/im/pictures/miso/Hosting-765276277801888458/original/ac8c3bcd-2290-4680-b808-86f2214257dd.jpeg?im_w=1200'},
  // KRYONERI & west shore
  {key:'kryoneri-1', url:'https://www.airbnb.com/rooms/1593301388514462926',
   imgUrl:'https://a0.muscache.com/im/pictures/prohost-api/Hosting-1593301388514462926/original/fc8201dc-fb54-4fee-bd53-8c6f3caca5a6.jpeg?im_w=1200'},
  {key:'kryoneri-2', url:'https://www.airbnb.com/rooms/1556614560589999638',
   imgUrl:'https://a0.muscache.com/im/pictures/hosting/Hosting-1556614560589999638/original/8bf82f37-81fa-442e-a6a9-0d8f0dfd5c94.jpeg?im_w=1200'},
  // AGRAFA mountains
  {key:'agrafa-1', url:'https://www.booking.com/hotel/gr/montanema-handmade-village.html', // Montanema Handmade Village
   imgUrl:'https://cf.bstatic.com/xdata/images/hotel/max1024x768/38610909.jpg?k=c22fb5cd28afdd416b409c6e2638584486448532636f5fc25be1eca7df31174e&o='},
  {key:'agrafa-2', url:'https://www.airbnb.com/rooms/46405158',
   imgUrl:'https://a0.muscache.com/im/pictures/miso/Hosting-46405158/original/3694a257-7954-441e-84ce-fb83bf5eed3f.jpeg?im_w=1200'},
];

const SKIP = /logo|icon|sprite|placeholder|avatar|favicon|flag|warning_bar|product-\d|60x60|1x1|blank|loading|pixel|spacer/i;

const abs = (src, base) => { try { return new URL(src, base).href; } catch { return null; } };

function pickFromHtml(html, base){
  const cands = [];
  const metaRe = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/gi;
  let m;
  while ((m = metaRe.exec(html))) { const c = /content=["']([^"']+)["']/i.exec(m[0]); if (c) cands.push(c[1]); }
  const imgRe = /(?:data-src|data-lazy-src|src|data-original)=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/gi;
  while ((m = imgRe.exec(html))) cands.push(m[1]);
  const seen = new Set(); const out = [];
  for (const c of cands) { const u = abs(c, base); if (!u || SKIP.test(u) || seen.has(u)) continue; seen.add(u); out.push(u); }
  return out;
}

async function fetchText(url){
  const r = await fetch(url, {headers:{'User-Agent':UA,'Accept-Language':'en-US,en;q=0.9'}, redirect:'follow'});
  if (!r.ok) throw new Error('HTTP '+r.status);
  return await r.text();
}

async function download(url, destNoExt, referer){
  const r = await fetch(url, {headers:{'User-Agent':UA, 'Referer':referer||url}, redirect:'follow'});
  if (!r.ok) throw new Error('img HTTP '+r.status);
  const ct = (r.headers.get('content-type')||'').toLowerCase();
  let ext = 'jpg';
  if (ct.includes('webp')) ext='webp'; else if (ct.includes('png')) ext='png';
  else if (ct.includes('jpeg')||ct.includes('jpg')) ext='jpg';
  else { const mm=/\.(jpe?g|png|webp)/i.exec(url); if(mm) ext=mm[1].toLowerCase().replace('jpeg','jpg'); }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 3000) throw new Error('too small ('+buf.length+'b)');
  // normalize everything to .jpg on disk so index.html's imgFiles map stays stable
  const dest = destNoExt+'.jpg';
  fs.writeFileSync(dest, buf);
  return {ext, bytes:buf.length, src:url};
}

(async () => {
  fs.mkdirSync('images', {recursive:true});
  const manifest = {};
  for (const L of listings) {
    try {
      let saved=null;
      if (L.imgUrl) {
        // direct photo URL (Airbnb og:image) — most reliable
        saved = await download(L.imgUrl, path.join('images', L.key), L.url);
      } else {
        const html = await fetchText(L.url);
        const cands = pickFromHtml(html, L.url);
        if (!cands.length) throw new Error('no image candidates (page may be blocked)');
        let lastErr=null;
        for (const c of cands.slice(0,10)) { try { saved=await download(c, path.join('images', L.key), L.url); break; } catch(e){ lastErr=e; } }
        if (!saved) throw lastErr || new Error('all candidates failed');
      }
      manifest[L.key] = L.key+'.jpg';
      console.log(`OK   ${L.key.padEnd(12)} ${(saved.bytes/1024).toFixed(0)}KB  <- ${saved.src.slice(0,72)}`);
    } catch (e) {
      console.log(`FAIL ${L.key.padEnd(12)} ${e.message}  (${L.url})`);
    }
  }
  fs.writeFileSync('images/manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\nManifest:', JSON.stringify(manifest));
})();
