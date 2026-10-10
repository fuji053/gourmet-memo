/* グルメモ — in-app map (国土地理院タイル, no Google) & location picker */
'use strict';

const GSI_TILES = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
const GSI_ATTR = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>';
const JAPAN = [36.2, 138.25];
const PREF_CENTER = {北海道:[43.064,141.347],青森県:[40.824,140.740],岩手県:[39.704,141.153],宮城県:[38.269,140.872],秋田県:[39.719,140.102],山形県:[38.240,140.364],福島県:[37.750,140.468],茨城県:[36.342,140.447],栃木県:[36.566,139.884],群馬県:[36.391,139.061],埼玉県:[35.857,139.649],千葉県:[35.605,140.123],東京都:[35.690,139.692],神奈川県:[35.448,139.643],新潟県:[37.902,139.023],富山県:[36.695,137.211],石川県:[36.594,136.626],福井県:[36.065,136.222],山梨県:[35.664,138.568],長野県:[36.651,138.181],岐阜県:[35.391,136.722],静岡県:[34.977,138.383],愛知県:[35.180,136.907],三重県:[34.730,136.509],滋賀県:[35.004,135.868],京都府:[35.021,135.756],大阪府:[34.686,135.520],兵庫県:[34.691,135.183],奈良県:[34.685,135.833],和歌山県:[34.226,135.168],鳥取県:[35.504,134.238],島根県:[35.472,133.051],岡山県:[34.662,133.935],広島県:[34.396,132.459],山口県:[34.186,131.471],徳島県:[34.066,134.559],香川県:[34.340,134.043],愛媛県:[33.842,132.766],高知県:[33.560,133.531],福岡県:[33.607,130.418],佐賀県:[33.249,130.299],長崎県:[32.745,129.874],熊本県:[32.790,130.742],大分県:[33.238,131.613],宮崎県:[31.911,131.424],鹿児島県:[31.560,130.558],沖縄県:[26.212,127.681]};
const hasLeaflet = () => typeof L !== 'undefined';
const pinIcon = color => L.divIcon({className:'', html:`<div class="gm-pin" style="background:${color}"></div>`, iconSize:[24,24], iconAnchor:[12,29], popupAnchor:[0,-26]});

function locateHere(cb){
  if (!navigator.geolocation) { cb(null); return; }
  navigator.geolocation.getCurrentPosition(p => cb({lat:+p.coords.latitude.toFixed(6), lng:+p.coords.longitude.toFixed(6)}), () => cb(null), {enableHighAccuracy:true, timeout:10000, maximumAge:60000});
}

/* ---------- main map tab ---------- */
let mainMap = null, pinLayer = null;
let mapShow = (() => { try { return JSON.parse(lsGet('gm-mapshow')) || {visit:true, wish:true, again:true}; } catch { return {visit:true, wish:true, again:true}; } })();
const mapKind = r => r.list === 'wish' ? 'wish' : (r.again ? 'again' : 'visit');
function renderLegend(){
  const t = T();
  const items = [['visit', t.visited.replace('行った店','行ったことある')], ['again', t.again], ['wish', t.wish]];
  $('#mapLegend').innerHTML = items.map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${!!mapShow[k]}"><i style="background:${colors[k]}"></i>${esc(l)}</button>`).join('');
}
$('#mapLegend').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  mapShow[b.dataset.k] = !mapShow[b.dataset.k]; lsSet('gm-mapshow', JSON.stringify(mapShow)); renderMap(false);
});
function renderMap(fit = true){
  renderLegend();
  if (!hasLeaflet()) { $('#mapSub').textContent = '地図を読み込めませんでした。電波のある場所で開き直してください'; return; }
  if (!mainMap) {
    mainMap = L.map('mapBox', {zoomControl:true, attributionControl:true, minZoom:5, maxZoom:18}).setView(JAPAN, 5);
    L.tileLayer(GSI_TILES, {attribution:GSI_ATTR, maxZoom:18, minZoom:5}).addTo(mainMap);
    pinLayer = L.layerGroup().addTo(mainMap);
  }
  setTimeout(() => mainMap.invalidateSize(), 30);
  pinLayer.clearLayers();
  const all = [...shownRecords('visit'), ...shownRecords('wish')].filter(r => r.lat != null && r.lng != null);
  const pts = [];
  const t = T();
  for (const r of all) {
    const k = mapKind(r); if (!mapShow[k]) continue;
    const m = L.marker([r.lat, r.lng], {icon:pinIcon(colors[k]), title:r.shop});
    const label = k === 'wish' ? t.wish : k === 'again' ? t.again : t.visited;
    m.bindPopup(`<b>${esc(r.shop)}</b><span style="color:${colors[k]};font-weight:700">● ${esc(label)}</span>${r.rating ? ` ★${r.rating.toFixed(1)}` : ''}${r.sample ? '（見本）' : ''}<br><button type="button" data-open="${esc(r.id)}" data-list="${r.list}">くわしく見る</button>`);
    m.addTo(pinLayer); pts.push([r.lat, r.lng]);
  }
  const missing = [...catRecords('visit'), ...catRecords('wish')].filter(r => r.lat == null).length;
  $('#mapSub').textContent = `${pts.length}件を表示中` + (missing ? `・位置が未設定のものが${missing}件（詳細の「地図に位置を設定」から）` : '');
  if (fit) {
    if (pts.length === 1) mainMap.setView(pts[0], 15);
    else if (pts.length) mainMap.fitBounds(pts, {padding:[36,36], maxZoom:15});
    else mainMap.setView(PREF_CENTER[lastPref()] || JAPAN, lastPref() ? 10 : 5);
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('.leaflet-popup [data-open]'); if (!b) return;
  const id = b.dataset.open;
  if (b.dataset.list === 'wish') { const w = shownRecords('wish').find(x => x.id === id); if (w && !w.sample) openWish(w); else toast('見本です'); }
  else openDetail(id);
});
function focusOnMap(r){
  setTimeout(() => {
    if (!mainMap) return;
    mainMap.setView([r.lat, r.lng], 16);
    pinLayer.eachLayer(l => { const p = l.getLatLng(); if (Math.abs(p.lat - r.lat) < 1e-7 && Math.abs(p.lng - r.lng) < 1e-7) l.openPopup(); });
  }, 120);
}

/* ---------- location picker (move the map under the fixed pin) ---------- */
let locMap = null, locCb = null;
function pickLocation(init, pref, cb){
  locCb = cb;
  $('#locResults').innerHTML = ''; $('#locQuery').value = '';
  $('#locPin').style.background = colors.visit;
  show($('#locSheet'));
  if (!hasLeaflet()) { toast('地図を読み込めませんでした。電波のある場所で開いてください'); return; }
  const start = init ? [init.lat, init.lng] : (PREF_CENTER[pref] || JAPAN);
  const z = init ? 17 : (PREF_CENTER[pref] ? 12 : 5);
  if (!locMap) {
    locMap = L.map('locMap', {zoomControl:true, minZoom:5, maxZoom:18}).setView(start, z);
    L.tileLayer(GSI_TILES, {attribution:GSI_ATTR, maxZoom:18, minZoom:5}).addTo(locMap);
  }
  setTimeout(() => { locMap.invalidateSize(); locMap.setView(start, z); }, 60);
  if (!init && !PREF_CENTER[pref]) locateHere(p => { if (p && !$('#locSheet').hidden) locMap.setView([p.lat, p.lng], 16); });
}
$('#locOk').addEventListener('click', () => {
  if (!locMap) { hide($('#locSheet')); return; }
  const c = locMap.getCenter(); hide($('#locSheet'));
  locCb && locCb({lat:+c.lat.toFixed(6), lng:+c.lng.toFixed(6)});
});
$('#locClear').addEventListener('click', () => { hide($('#locSheet')); locCb && locCb(null); });
$('#locHere').addEventListener('click', () => {
  toast('現在地を探しています…');
  locateHere(p => { if (!p) { toast('現在地を取得できませんでした。位置情報の許可を確認してください'); return; } locMap && locMap.setView([p.lat, p.lng], 17); });
});
$('#locSearchForm').addEventListener('submit', async e => {
  e.preventDefault();
  const q = cleanName($('#locQuery').value); if (!q) return;
  $('#locQuery').blur();
  $('#locResults').innerHTML = '<p class="hint">探しています…</p>';
  try {
    const res = await fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q));
    const list = (await res.json()) || [];
    if (!list.length) { $('#locResults').innerHTML = '<p class="hint">見つかりませんでした。市区町村名や番地を変えて試してください（店名では探せません）</p>'; return; }
    $('#locResults').innerHTML = list.slice(0, 8).map((f, i) => `<button type="button" data-i="${i}">${esc(f.properties && f.properties.title || q)}</button>`).join('');
    $('#locResults').onclick = ev => {
      const b = ev.target.closest('[data-i]'); if (!b) return;
      const [lng, lat] = list[Number(b.dataset.i)].geometry.coordinates;
      locMap && locMap.setView([lat, lng], 17); $('#locResults').innerHTML = '';
    };
  } catch { $('#locResults').innerHTML = '<p class="hint">検索できませんでした。電波を確認してください</p>'; }
});
