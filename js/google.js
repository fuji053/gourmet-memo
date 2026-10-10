/* Stash — Google Places: find the shop by name → map position + business hours (shown, never typed in) */
'use strict';

const gReady = () => typeof GOOGLE_KEY === 'string' && GOOGLE_KEY.trim().length > 20;
let gLoad = null;
function gPlaces(){
  if (!gReady()) return Promise.reject(new Error('no key'));
  if (!gLoad) gLoad = new Promise((res, rej) => {
    window.__stashGmaps = () => res();
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY.trim())}&v=weekly&language=ja&region=JP&loading=async&callback=__stashGmaps`;
    s.async = true; s.onerror = () => { gLoad = null; rej(new Error('load')); };
    document.head.appendChild(s);
  });
  return gLoad.then(() => google.maps.importLibrary('places'));
}
const placeQuery = r => [cleanName(r.shop), r.pref || '', cleanName(r.place || '')].filter(Boolean).join(' ');
const HOURS_TTL = 7 * 24 * 3600 * 1000;

/* safety cap on this phone: at most this many Google look-ups per day (Google's own daily caps can't be set during the free trial) */
const G_DAILY = {search:20, hours:10};
function gSpend(kind){
  const day = ymd(new Date());
  let c; try { c = JSON.parse(lsGet('gm-gcount') || '{}'); } catch { c = {}; }
  if (c.day !== day) c = {day};
  if ((c[kind] || 0) >= G_DAILY[kind]) { const e = new Error('limit'); e.limit = true; throw e; }
  c[kind] = (c[kind] || 0) + 1; lsSet('gm-gcount', JSON.stringify(c));
}

/* step 1: name → Google place (id + position). Cached on the record so each shop is looked up once. */
async function findPlace(r){
  const q = placeQuery(r);
  if (r.gplace && r.gplace.q === q) return r.gplace.id ? r.gplace : null;
  gSpend('search');
  const {Place} = await gPlaces();
  const {places} = await Place.searchByText({textQuery:q, fields:['id', 'location', 'displayName', 'formattedAddress'], language:'ja', region:'jp', maxResultCount:1});
  const p = places && places[0];
  r.gplace = p ? {q, id:p.id, name:p.displayName || '', addr:p.formattedAddress || '', at:Date.now()} : {q, id:null, at:Date.now()};
  if (p && p.location && (r.lat == null || r.locSrc === 'google')) {
    r.lat = +p.location.lat().toFixed(6); r.lng = +p.location.lng().toFixed(6); r.locSrc = 'google';
  }
  if (!p && r.locSrc === 'google') { r.lat = null; r.lng = null; r.locSrc = null; }   // renamed to a place Google does not know
  delete r.ghours;
  return p ? r.gplace : null;
}

/* step 2: place → opening hours (refreshed at most once a week per shop) */
async function placeHours(r){
  if (!r.gplace || !r.gplace.id) return null;
  if (r.ghours && Date.now() - r.ghours.at < HOURS_TTL) return r.ghours;
  gSpend('hours');
  const {Place} = await gPlaces();
  const p = new Place({id:r.gplace.id, requestedLanguage:'ja'});
  await p.fetchFields({fields:['regularOpeningHours', 'businessStatus', 'googleMapsURI']});
  const oh = p.regularOpeningHours;
  r.ghours = {
    at:Date.now(), status:p.businessStatus || '', url:p.googleMapsURI || '',
    desc:oh && oh.weekdayDescriptions ? oh.weekdayDescriptions.slice() : [],
    periods:oh && oh.periods ? oh.periods.map(x => ({o:x.open ? [x.open.day, x.open.hour, x.open.minute] : null, c:x.close ? [x.close.day, x.close.hour, x.close.minute] : null})) : [],
  };
  return r.ghours;
}

async function saveQuiet(r){
  if (r.sample) return;
  try { await dbPut(r); } catch {}
  const i = records.findIndex(x => x.id === r.id); if (i >= 0) records[i] = r;
}

/* ---------- open now? (like Google: 営業中 · 17:00に閉店) ---------- */
const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const hm = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
function openState(h, now = new Date()){
  if (h.status === 'CLOSED_PERMANENTLY') return {open:false, text:'閉業'};
  if (h.status === 'CLOSED_TEMPORARILY') return {open:false, text:'臨時休業中'};
  const ps = h.periods || []; if (!ps.length) return null;
  if (ps.length === 1 && ps[0].o && !ps[0].c) return {open:true, text:'24時間営業'};
  const W = 7 * 1440, cur = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes();
  const at = p => p[0] * 1440 + p[1] * 60 + p[2];
  for (const p of ps) {
    if (!p.o || !p.c) continue;
    const o = at(p.o); let c = at(p.c); if (c <= o) c += W;
    for (const t of [cur, cur + W]) if (t >= o && t < c) return {open:true, text:`営業中 · ${hm(p.c[1], p.c[2])}に閉店`};
  }
  let best = null;
  for (const p of ps) { if (!p.o) continue; const d = (at(p.o) - cur + W) % W; if (best == null || d < best.d) best = {d, p:p.o}; }
  if (!best) return {open:false, text:'営業時間外'};
  const days = Math.floor((now.getHours() * 60 + now.getMinutes() + best.d) / 1440);
  const when = days === 0 ? '' : days === 1 ? '明日 ' : `${DAYS[best.p[0]]}曜日 `;
  return {open:false, text:`営業時間外 · ${when}${hm(best.p[1], best.p[2])}に開店`};
}

/* ---------- detail page block ---------- */
const CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
function hoursHTML(e){
  if (!T().shop || !gReady() || e.sample) return '';
  return `<section class="hours" data-hours><div class="hrow"><span class="hico">${CLOCK}</span><span class="hstate">営業時間を調べています…</span></div></section>`;
}
function hoursFill(box, h){
  const st = openState(h);
  const today = new Date().getDay();
  // weekdayDescriptions start on Monday; show from today like Google does
  const rows = h.desc.length === 7 ? [0, 1, 2, 3, 4, 5, 6].map(i => (today + i) % 7).map(d => {
    const [day, ...rest] = h.desc[(d + 6) % 7].split(/[:：]\s*/);
    return `<div class="hday${d === today ? ' today' : ''}"><span>${esc(day)}</span><span>${esc(rest.join(': ') || '—')}</span></div>`;
  }).join('') : '';
  if (!st && !rows) { box.innerHTML = `<div class="hrow"><span class="hico">${CLOCK}</span><span class="hstate muted">Googleに営業時間の情報がありません</span></div>`; return; }
  box.innerHTML = `<button type="button" class="hrow" aria-expanded="false"><span class="hico">${CLOCK}</span>
      <span class="hstate ${st && st.open ? 'on' : 'off'}">${esc(st ? st.text : '営業時間')}</span>${rows ? '<span class="hchev" aria-hidden="true">⌄</span>' : ''}</button>
    ${rows ? `<div class="hlist" hidden>${rows}<p class="hsrc">Googleマップの情報です。祝日などは異なる場合があります。</p></div>` : ''}`;
  const btn = box.querySelector('.hrow'), list = box.querySelector('.hlist');
  if (list) btn.onclick = () => { list.hidden = !list.hidden; btn.setAttribute('aria-expanded', String(!list.hidden)); };
}
async function fillHours(root, e, onPlaced){
  const box = root.querySelector('[data-hours]'); if (!box) return;
  try {
    const hadPin = e.lat != null;
    const pl = await findPlace(e);
    if (!pl) { await saveQuiet(e); box.innerHTML = `<div class="hrow"><span class="hico">${CLOCK}</span><span class="hstate muted">Googleマップで見つからなかったため、営業時間は出せません</span></div>`; return; }
    const h = await placeHours(e);
    await saveQuiet(e);
    if (box.isConnected && h) hoursFill(box, h);
    if (!hadPin && e.lat != null && onPlaced) onPlaced();
  } catch (err) { if (box.isConnected) box.innerHTML = `<div class="hrow"><span class="hico">${CLOCK}</span><span class="hstate muted">${err && err.limit ? '今日はGoogleへの問い合わせ上限に達しました。明日また表示されます' : '営業時間を読み込めませんでした（電波を確認してください）'}</span></div>`; }
}

/* ---------- put pins on the map automatically for records without a position ---------- */
let autoBusy = false;
async function autoPlace(list, onEach){
  if (!gReady() || autoBusy) return;
  autoBusy = true;
  try {
    let n = 0;
    for (const r of list) {
      if (r.sample || n >= 25) continue;
      const q = placeQuery(r);
      if (r.lat != null && r.locSrc !== 'google') continue;      // a position from the camera is kept
      if (r.gplace && r.gplace.q === q) continue;               // already looked up
      n++;
      try { await findPlace(r); await saveQuiet(r); onEach && onEach(r); } catch { break; }
    }
  } finally { autoBusy = false; }
}
