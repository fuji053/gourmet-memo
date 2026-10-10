/* グルメモ — link buttons per genre (Instagram, Amazon …) and streaming services (TMDB) */
'use strict';

/* {q} is replaced with the name of the record */
const LINK_PRESETS = {
  ig:       {label:'Instagram', short:'Insta\ngram',   cls:'ig', special:'ig'},
  tt:       {label:'TikTok', short:'TikTok',      cls:'tt', color:'#111111', special:'tt', icon:'icons/link-tiktok.png'},
  tabelog:  {label:'食べログ', short:'食べ\nログ',     color:'#F5A623', text:'#222222', url:'https://tabelog.com/rstLst/?sw={q}'},
  amazon:   {label:'Amazon', short:'amazon',      color:'#FF9900', text:'#111111', url:'https://www.amazon.co.jp/s?k={q}'},
  rakuten:  {label:'楽天', short:'楽天',         color:'#BF0000', url:'https://search.rakuten.co.jp/search/mall/{q}/'},
  yahoo:    {label:'Yahoo!ショッピング', short:'Yahoo!', color:'#FF0033', url:'https://shopping.yahoo.co.jp/search?p={q}'},
  filmarks: {label:'Filmarks', short:'Film\nmarks',    color:'#FFE100', text:'#111111', url:'https://filmarks.com/search/movies?q={q}'},
  netflix:  {label:'Netflix', short:'Netflix',     color:'#E50914', url:'https://www.netflix.com/search?q={q}', app:'nflx://www.netflix.com/search?q={q}'},
  prime:    {label:'Prime Video', short:'Prime\nVideo', color:'#00A8E1', url:'https://www.amazon.co.jp/s?k={q}&i=instant-video'},
  unext:    {label:'U-NEXT', short:'U-NEXT',      color:'#1D1D1D', url:'https://video.unext.jp/freeword?query={q}'},
  youtube:  {label:'YouTube', short:'You\nTube',     color:'#FF0000', url:'https://www.youtube.com/results?search_query={q}'},
  x:        {label:'X', short:'X',           color:'#000000', url:'https://x.com/search?q={q}'},
  spotify:  {label:'Spotify', short:'Spotify',     color:'#1DB954', text:'#111111', url:'https://open.spotify.com/search/{q}'},
  jalan:    {label:'じゃらん', short:'じゃらん',     color:'#E8380D', url:'https://www.jalan.net/kankou/?keyword={q}'},
  google:   {label:'Google', short:'Google',      color:'#4285F4', url:'https://www.google.com/search?q={q}'},
  wiki:     {label:'Wikipedia', short:'Wiki',   color:'#555555', url:'https://ja.wikipedia.org/w/index.php?search={q}'},
};

/* the site whose own icon is shown on each button */
const LINK_DOMAINS = {ig:'instagram.com', tt:'www.tiktok.com', tabelog:'tabelog.com', amazon:'amazon.co.jp', rakuten:'rakuten.co.jp', yahoo:'shopping.yahoo.co.jp', filmarks:'filmarks.com', netflix:'netflix.com', prime:'primevideo.com', unext:'video.unext.jp', youtube:'youtube.com', x:'x.com', spotify:'spotify.com', jalan:'jalan.net', google:'google.com', wiki:'wikipedia.org'};

/* sensible starting buttons for a genre, from its form and name */
function defaultLinks(c){
  const n = c.name || '';
  if (c.tmpl !== 'work') return /観光|温泉|サウナ|旅|宿|ホテル/.test(n) ? ['ig', 'tt', 'jalan'] : ['ig', 'tt'];
  if (/映画|ドラマ|アニメ|シネマ|作品/.test(n)) return ['filmarks', 'netflix', 'prime', 'unext'];
  if (/酒|ワイン|ビール|ウイスキー|焼酎|日本酒|ジン|お茶|コーヒー|豆/.test(n)) return ['amazon', 'rakuten'];
  if (/本|漫画|マンガ|コミック|小説|雑誌/.test(n)) return ['amazon'];
  if (/音楽|曲|アルバム|ライブ/.test(n)) return ['spotify', 'youtube'];
  if (/ゲーム/.test(n)) return ['amazon', 'youtube'];
  return ['google', 'amazon'];
}
const wantsStreaming = c => c.tmpl === 'work' && /映画|ドラマ|アニメ|シネマ/.test(c.name || '');

/* a stored link is either a preset key ('amazon') or {label, url, color} made by the user */
function linkInfo(l){
  if (typeof l === 'string') return LINK_PRESETS[l] ? {key:l, dom:LINK_DOMAINS[l], ...LINK_PRESETS[l]} : null;
  if (l && l.url && l.label) {
    let dom = ''; try { dom = new URL(l.url.split('{q}').join('x')).hostname; } catch {}
    return {label:l.label, url:l.url, dom, color:l.color || '#3A6EA5', text:textOn(l.color || '#3A6EA5')};
  }
  return null;
}
function textOn(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#ffffff';
  const v = parseInt(m[1], 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? '#111111' : '#ffffff';
}
function lbtnHTML(info, attrs){
  const short = info.short || cleanName(info.label).slice(0, 4);
  const lines = short.split('\n'), longest = Math.max(...lines.map(l => l.length));
  const fs = longest <= 2 && lines.length === 1 ? 22 : longest <= 5 ? 14 : longest <= 7 ? 12 : 10;
  const style = info.cls === 'ig' ? '' : `--c:${esc(info.color || '#333')};--t:${esc(info.text || '#fff')}`;
  // each service's own site icon, loaded from the internet; the coloured text tile stays underneath as a fallback
  const img = info.icon ? `<img src="${info.icon}" alt="" onload="this.parentNode.classList.add('img')" onerror="this.remove()">` : info.dom ? `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(info.dom)}&amp;sz=128" data-dom="${esc(info.dom)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="lIconOk(this)" onerror="lIconNext(this)">` : '';
  return `<button type="button" class="lbtn ${info.cls || ''}" style="${style}" ${attrs || ''}><span class="lico" style="font-size:${fs}px">${lines.map(esc).join('<br>')}${img}</span><span class="lname">${esc(info.label)}</span></button>`;
}
/* site icon: Google's favicon service first, then the site's own app icon, else keep the coloured tile */
function lIconNext(img){
  if (!img.dataset.tried) { img.dataset.tried = '1'; img.src = `https://${img.dataset.dom}/apple-touch-icon.png`; return; }
  img.remove();
}
function lIconOk(img){ if (img.naturalWidth < 48) lIconNext(img); else img.parentNode.classList.add('img'); }
function linkRowHTML(c, name){
  const ls = (Array.isArray(c.links) ? c.links : defaultLinks(c)).map(linkInfo).filter(Boolean);
  if (!ls.length) return '';
  return `<div class="linkrow">${ls.map((info, i) => lbtnHTML(info, `data-link="${i}" aria-label="${esc(info.label)}で「${esc(name)}」を検索"`)).join('')}</div>`;
}
function bindLinkRow(root, c, name){
  const ls = (Array.isArray(c.links) ? c.links : defaultLinks(c)).map(linkInfo).filter(Boolean);
  root.querySelectorAll('[data-link]').forEach(b => b.onclick = () => openLink(ls[Number(b.dataset.link)], name));
}
function openLink(info, name){
  if (!info) return;
  if (info.special) { openSNS(info.special, name); return; }
  const fill = t => t.split('{q}').join(encodeURIComponent(cleanName(name)));
  const url = fill(info.url);
  if (info.app) {   // open the installed app; if nothing happens, fall back to the web page
    const n = cleanName(name);
    copyText(n).then(ok => { if (ok) toast(`「${n}」をコピーしました。見つからないときは検索欄に貼り付けてください`); });
    let left = false; const onHide = () => { left = true; };
    document.addEventListener('visibilitychange', onHide, {once:true});
    window.location.href = fill(info.app);
    setTimeout(() => { document.removeEventListener('visibilitychange', onHide); if (!left && !document.hidden) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); } }, 1400);
    return;
  }
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}
/* user pasted the address of a page that searched for 「テスト」 → turn it into a {q} template */
function toTemplate(raw){
  const s = (raw || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(s)) return {err:'https:// から始まるアドレスを貼り付けてください'};
  const forms = [encodeURIComponent('テスト'), encodeURIComponent('テスト').toLowerCase(), 'テスト'];
  for (const f of forms) if (s.includes(f)) return {url:s.split(f).join('{q}')};
  // some sites encode the space-plus way or double-encode
  const dbl = encodeURIComponent(encodeURIComponent('テスト'));
  if (s.includes(dbl)) return {url:s.split(dbl).join('{q}')};
  return {err:'アドレスの中に「テスト」が見つかりません。そのサイトで「テスト」と検索してから、そのページのアドレスをコピーしてください'};
}

/* ---------- streaming services (TMDB + JustWatch data) ---------- */
const TMDB = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/';
const provCache = new Map();
const tmdbReady = () => typeof TMDB_KEY === 'string' && TMDB_KEY.trim().length > 10;
async function tmdbGet(path, params){
  const q = new URLSearchParams({api_key:TMDB_KEY.trim(), ...(params || {})});
  const r = await fetch(`${TMDB}${path}?${q}`);
  if (!r.ok) throw new Error('tmdb ' + r.status);
  return r.json();
}
function streamHTML(e){
  if (!cur.streaming) return '';
  if (!tmdbReady()) return `<section class="stream"><h4>配信サービス</h4><p class="hint" style="margin:0">準備中です（作った人の設定が終わると表示されます）。</p></section>`;
  if (!e.tmdb) return `<section class="stream"><h4>配信サービス</h4><p class="hint" style="margin:0 0 10px">どの作品か選ぶと、いま見られるサービスが表示されます。</p><button class="btn" type="button" data-tmdb-pick>作品を選ぶ</button></section>`;
  return `<section class="stream" data-stream><h4>配信サービス</h4><p class="hint" style="margin:0">読み込み中…</p></section>`;
}
const PROV_GROUPS = [['flatrate', '見放題'], ['free', '無料'], ['ads', '広告つき無料'], ['rent', 'レンタル'], ['buy', '購入']];
async function fillStream(root, e, rerender){
  root.querySelectorAll('[data-tmdb-pick]').forEach(b => b.onclick = () => openTmdbPick(e, rerender));
  const box = root.querySelector('[data-stream]'); if (!box || !e.tmdb) return;
  const key = `${e.tmdb.type}/${e.tmdb.id}`;
  let jp;
  try {
    if (!provCache.has(key)) provCache.set(key, tmdbGet(`/${e.tmdb.type}/${e.tmdb.id}/watch/providers`).then(d => (d.results && d.results.JP) || {}));
    jp = await provCache.get(key);
  } catch { provCache.delete(key); box.innerHTML = '<h4>配信サービス</h4><p class="hint" style="margin:0">読み込めませんでした。ネットにつながっているか確かめてください。</p>'; return; }
  if (!box.isConnected) return;
  const seen = new Set();
  const groups = PROV_GROUPS.map(([k, label]) => {
    const list = (jp[k] || []).filter(p => !seen.has(k + p.provider_id)).sort((a, b) => (a.display_priority || 0) - (b.display_priority || 0));
    list.forEach(p => seen.add(k + p.provider_id));
    return list.length ? `<div class="sgroup"><b>${label}</b><div class="prov">${list.map(p => `<figure><img src="${TMDB_IMG}w92${p.logo_path}" alt="" loading="lazy"><figcaption>${esc(p.provider_name)}</figcaption></figure>`).join('')}</div></div>` : '';
  }).join('');
  box.innerHTML = `<h4>配信サービス</h4>
    <p style="margin:0 0 4px;font-size:13px"><b>${esc(e.tmdb.title)}</b>${e.tmdb.year ? `（${esc(e.tmdb.year)}）` : ''}</p>
    ${groups || '<p class="hint" style="margin:6px 0 0">いま日本で見られる配信サービスは見つかりませんでした。</p>'}
    <p class="credit">配信情報：JustWatch ／ 作品情報：TMDB。This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    ${e.sample ? '' : '<button class="linkbtn" type="button" data-tmdb-pick style="padding-left:0">作品を選び直す</button>'}`;
  box.querySelectorAll('[data-tmdb-pick]').forEach(b => b.onclick = () => openTmdbPick(e, rerender));
}

let tmdbTarget = null;
function openTmdbPick(e, rerender){
  if (e.sample) { toast('見本では選べません'); return; }
  tmdbTarget = {e, rerender};
  $('#tmdbQuery').value = cleanName(e.shop); $('#tmdbResults').innerHTML = '';
  show($('#tmdbSheet')); tmdbSearch();
}
async function tmdbSearch(){
  const q = cleanName($('#tmdbQuery').value); if (!q) return;
  const box = $('#tmdbResults'); box.innerHTML = '<p class="hint">探しています…</p>';
  let items;
  try { items = ((await tmdbGet('/search/multi', {query:q, language:'ja-JP', region:'JP', include_adult:'false'})).results || []).filter(x => x.media_type === 'movie' || x.media_type === 'tv').slice(0, 12); }
  catch { box.innerHTML = '<p class="hint">検索できませんでした。ネットにつながっているか確かめてください。</p>'; return; }
  if (!items.length) { box.innerHTML = '<p class="hint">見つかりませんでした。英語の題名や、短い名前でも試してみてください。</p>'; return; }
  box.innerHTML = items.map((x, i) => {
    const title = x.title || x.name || '', date = x.release_date || x.first_air_date || '';
    return `<button type="button" class="cand" data-i="${i}">${x.poster_path ? `<img src="${TMDB_IMG}w92${x.poster_path}" alt="" loading="lazy">` : '<span class="np"></span>'}<span><b>${esc(title)}</b><span>${x.media_type === 'tv' ? 'ドラマ・アニメ' : '映画'}${date ? ' · ' + esc(date.slice(0, 4)) : ''}</span></span></button>`;
  }).join('');
  box.querySelectorAll('.cand').forEach(b => b.onclick = async () => {
    const x = items[Number(b.dataset.i)]; if (!tmdbTarget) return;
    const {e, rerender} = tmdbTarget;
    e.tmdb = {id:x.id, type:x.media_type, title:x.title || x.name || '', year:(x.release_date || x.first_air_date || '').slice(0, 4)};
    e.updatedAt = Date.now();
    try { await dbPut(e); } catch { toast('保存できませんでした'); return; }
    hide($('#tmdbSheet')); tmdbTarget = null; rerender && rerender(); toast('作品を設定しました');
  });
}
$('#tmdbForm').addEventListener('submit', ev => { ev.preventDefault(); tmdbSearch(); });
