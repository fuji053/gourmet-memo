/* Stash — 検索 page: a search box and an Instagram-like grid of tall photo / video tiles */
'use strict';

const D_TABS = [['pick', 'おすすめ'], ['often', 'よく行く'], ['top', '評価が高い'], ['recent', '最近'], ['video', '動画']];
let dTab = 'pick', dQuery = '';
const shopKey = r => cleanName(r.shop || '').toLowerCase().replace(/\s+/g, '');
const shortDate = d => d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : '';

function visitCounts(){
  const m = new Map();
  for (const r of shownRecords('visit')) m.set(shopKey(r), (m.get(shopKey(r)) || 0) + 1);
  return m;
}
function discoverList(tab){
  const visits = shownRecords('visit').filter(r => recMedia(r));
  const byDate = (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);
  const counts = visitCounts();
  const often = () => {
    const seen = new Set(), out = [];
    for (const r of visits.slice().sort(byDate)) { const k = shopKey(r); if (seen.has(k)) continue; seen.add(k); out.push(r); }
    return out.sort((a, b) => counts.get(shopKey(b)) - counts.get(shopKey(a)) || byDate(a, b));
  };
  const top = () => visits.filter(r => r.rating > 0).sort((a, b) => b.rating - a.rating || byDate(a, b));
  const recent = () => visits.slice().sort(byDate);
  const video = () => visits.filter(r => recMedia(r).video).sort(byDate);
  if (tab === 'often') return often().map(r => ({r, badge:counts.get(shopKey(r)) > 1 ? `${counts.get(shopKey(r))}回` : ''}));
  if (tab === 'top') return top().map(r => ({r, badge:`★${r.rating.toFixed(1)}`}));
  if (tab === 'recent') return recent().map(r => ({r, badge:shortDate(r.date)}));
  if (tab === 'video') return video().map(r => ({r, badge:''}));
  // おすすめ: take turns from each list so the grid feels varied
  const lists = [often().map(r => ({r, badge:counts.get(shopKey(r)) > 1 ? `${counts.get(shopKey(r))}回` : ''})), top().map(r => ({r, badge:`★${r.rating.toFixed(1)}`})), recent().map(r => ({r, badge:''}))];
  const out = [], used = new Set();
  for (let i = 0; out.length < 60 && lists.some(l => i < l.length); i++) for (const l of lists) { const it = l[i]; if (it && !used.has(it.r.id)) { used.add(it.r.id); out.push(it); } }
  return out;
}
function tileHTML({r, badge}){
  const m = recMedia(r);
  const media = !m ? `<span class="dtext"><b>${esc(r.shop)}</b>${areaText(r) ? `<small>${esc(areaText(r))}</small>` : ''}</span>`
    : m.video ? `<video data-src="${m.video}" ${m.poster ? `poster="${m.poster}"` : ''} muted loop playsinline autoplay preload="none"></video>`
    : `<img src="${m.img}" alt="" loading="lazy">`;
  return `<button type="button" class="dtile" data-id="${esc(r.id)}" data-list="${r.list}" aria-label="${esc(r.shop)}">${media}${badge ? `<span class="dbadge">${esc(badge)}</span>` : ''}${r.list === 'wish' ? `<span class="dbadge wish">${esc(T().wish)}</span>` : ''}</button>`;
}
let dObserver = null;
function watchVideos(){
  if (dObserver) dObserver.disconnect();
  const vids = [...document.querySelectorAll('#dGrid video')];
  if (!('IntersectionObserver' in window)) { vids.forEach(v => { v.src = v.dataset.src; v.play().catch(() => {}); }); return; }
  dObserver = new IntersectionObserver(ents => ents.forEach(en => {
    const v = en.target;
    if (en.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
  }), {threshold:.4});
  vids.forEach(v => dObserver.observe(v));
}
function renderSearch(){
  const q = dQuery.trim().toLowerCase();
  $('#dChips').hidden = !!q;
  $('#dChips').innerHTML = D_TABS.map(([k, l]) => `<button type="button" data-dt="${k}" aria-pressed="${dTab === k}">${l}</button>`).join('');
  let items;
  if (q) {
    const hit = r => matches([r.shop, r.sub, r.where, dishNames(r), r.menu, r.pref, r.place, r.memo, r.mood, tagsOf(r).join(' ')], q);
    items = [...shownRecords('visit').filter(hit), ...shownRecords('wish').filter(hit)].map(r => ({r, badge:''}));
  } else items = discoverList(dTab);
  $('#dGrid').innerHTML = items.length ? items.map(tileHTML).join('')
    : `<p class="empty" style="grid-column:1/-1">${q ? '見つかりませんでした' : dTab === 'video' ? '動画のある記録がまだありません' : '写真や動画のある記録がまだありません。記録に写真を入れると、ここに並びます'}</p>`;
  watchVideos();
}
$('#sq').addEventListener('input', () => { dQuery = $('#sq').value; renderSearch(); });
$('#dChips').addEventListener('click', e => { const b = e.target.closest('[data-dt]'); if (!b) return; dTab = b.dataset.dt; renderSearch(); });
$('#dGrid').addEventListener('click', e => {
  const b = e.target.closest('.dtile'); if (!b) return;
  if (b.dataset.list === 'wish') { const w = shownRecords('wish').find(x => x.id === b.dataset.id); if (w && !w.sample) openWish(w); else toast('見本です'); }
  else openDetail(b.dataset.id);
});
