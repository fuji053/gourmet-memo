/* Stash — in-app map (MapLibre + OpenFreeMap, Google-Maps-like layout) & legacy location picker (Leaflet) */
'use strict';

const GSI_TILES = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';
const GSI_ATTR = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>';
const JAPAN = [36.2, 138.25];
const PREF_CENTER = {北海道:[43.064,141.347],青森県:[40.824,140.740],岩手県:[39.704,141.153],宮城県:[38.269,140.872],秋田県:[39.719,140.102],山形県:[38.240,140.364],福島県:[37.750,140.468],茨城県:[36.342,140.447],栃木県:[36.566,139.884],群馬県:[36.391,139.061],埼玉県:[35.857,139.649],千葉県:[35.605,140.123],東京都:[35.690,139.692],神奈川県:[35.448,139.643],新潟県:[37.902,139.023],富山県:[36.695,137.211],石川県:[36.594,136.626],福井県:[36.065,136.222],山梨県:[35.664,138.568],長野県:[36.651,138.181],岐阜県:[35.391,136.722],静岡県:[34.977,138.383],愛知県:[35.180,136.907],三重県:[34.730,136.509],滋賀県:[35.004,135.868],京都府:[35.021,135.756],大阪府:[34.686,135.520],兵庫県:[34.691,135.183],奈良県:[34.685,135.833],和歌山県:[34.226,135.168],鳥取県:[35.504,134.238],島根県:[35.472,133.051],岡山県:[34.662,133.935],広島県:[34.396,132.459],山口県:[34.186,131.471],徳島県:[34.066,134.559],香川県:[34.340,134.043],愛媛県:[33.842,132.766],高知県:[33.560,133.531],福岡県:[33.607,130.418],佐賀県:[33.249,130.299],長崎県:[32.745,129.874],熊本県:[32.790,130.742],大分県:[33.238,131.613],宮崎県:[31.911,131.424],鹿児島県:[31.560,130.558],沖縄県:[26.212,127.681]};
const hasLeaflet = () => typeof L !== 'undefined';
const pinIcon = color => L.divIcon({className:'gpin', html:`<svg width="28" height="40" viewBox="0 0 28 40" aria-hidden="true"><path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 40 14 40s14-15.7 14-26.1C28 6.2 21.7 0 14 0z" fill="${color}" stroke="rgba(0,0,0,.25)" stroke-width="1"/><circle cx="14" cy="14" r="5.2" fill="#fff" fill-opacity=".9"/></svg>`, iconSize:[28,40], iconAnchor:[14,40]});

function locateHere(cb){
  if (!navigator.geolocation) { cb(null); return; }
  navigator.geolocation.getCurrentPosition(p => cb({lat:+p.coords.latitude.toFixed(6), lng:+p.coords.longitude.toFixed(6)}), () => cb(null), {enableHighAccuracy:true, timeout:10000, maximumAge:60000});
}

/* ---------- main map tab (MapLibre + OpenFreeMap; falls back to 国土地理院 if it can't load) ---------- */
const OFM_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const GSI_STYLE = {version:8, sources:{gsi:{type:'raster', tiles:['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'], tileSize:256, maxzoom:18,
  attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>'}}, layers:[{id:'gsi', type:'raster', source:'gsi'}]};
const hasML = () => typeof maplibregl !== 'undefined';
let mainMap = null, mapReady = false, pinMarkers = [], usingFallback = false;
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
const mapRecords = () => [...shownRecords('visit'), ...shownRecords('wish')].filter(r => r.lat != null && r.lng != null);
const ll = (lat, lng) => [lng, lat];

/* labels in Japanese only (the default style shows English + Japanese) */
function japaneseLabels(map){
  for (const layer of map.getStyle().layers || []) {
    if (layer.type !== 'symbol') continue;
    const tf = map.getLayoutProperty(layer.id, 'text-field');
    if (!tf || JSON.stringify(tf).includes('"ref"')) continue;   // road numbers stay as they are
    map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:ja'], ['get', 'name']]);
  }
}
function useFallback(){
  if (usingFallback || !mainMap) return;
  usingFallback = true; mainMap.setStyle(GSI_STYLE);
}
function createMap(center, zoom){
  mainMap = new maplibregl.Map({container:'mapBox', style:OFM_STYLE, center, zoom, minZoom:4, maxZoom:18,
    attributionControl:{compact:true}, localIdeographFontFamily:'"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif', dragRotate:false, pitchWithRotate:false});
  mainMap.touchZoomRotate.disableRotation();
  const timer = setTimeout(() => { if (!mapReady) useFallback(); }, 9000);
  mainMap.on('load', () => { mapReady = true; clearTimeout(timer); if (!usingFallback) try { japaneseLabels(mainMap); } catch {} });
  mainMap.on('error', e => { if (!mapReady && e && e.error && /style|Failed to fetch|NetworkError|AJAXError/i.test(String(e.error.message || e.error))) useFallback(); });
  mainMap.on('click', hideCard);
}
function renderMap(fit = true){
  renderLegend(); hideCard(); $('#mapResults').hidden = true; $('#mapQuery').value = '';
  if (!hasML()) { $('#mapSub').hidden = false; $('#mapSub').textContent = '地図を読み込めませんでした。電波のある場所で開き直してください'; return; }
  const start = PREF_CENTER[lastPref()] || JAPAN;
  if (!mainMap) createMap(ll(start[0], start[1]), lastPref() ? 10 : 4.5);
  setTimeout(() => mainMap.resize(), 30);
  const pts = drawPins();
  const sub = $('#mapSub');
  sub.hidden = pts.length > 0;
  sub.textContent = gReady() ? '地図に出せる記録がまだありません。店名からGoogleマップで場所を探して、自動でピンを立てます。' : '地図に出せる記録がまだありません。';
  if (fit) {
    if (pts.length === 1) mainMap.jumpTo({center:pts[0], zoom:15});
    else if (pts.length) {
      const b = new maplibregl.LngLatBounds(pts[0], pts[0]); pts.forEach(p => b.extend(p));
      mainMap.fitBounds(b, {padding:{top:150, bottom:60, left:40, right:40}, maxZoom:15, duration:0});
    } else mainMap.jumpTo({center:ll(start[0], start[1]), zoom:lastPref() ? 10 : 4.5});
  }
  // records without a position: look them up on Google and add their pins as they come in
  autoPlace([...catRecords('visit'), ...catRecords('wish')], () => { if (view === 'map') { const p = drawPins(); if (p.length) $('#mapSub').hidden = true; } });
}
function pinEl(color){
  const el = document.createElement('div'); el.className = 'gpin';
  el.innerHTML = `<svg width="30" height="42" viewBox="0 0 28 40" aria-hidden="true"><path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 40 14 40s14-15.7 14-26.1C28 6.2 21.7 0 14 0z" fill="${color}" stroke="rgba(0,0,0,.25)" stroke-width="1"/><circle cx="14" cy="14" r="5.2" fill="#fff" fill-opacity=".92"/></svg>`;
  return el;
}
function drawPins(){
  pinMarkers.forEach(m => m.remove()); pinMarkers = [];
  const pts = [];
  for (const r of mapRecords()) {
    const k = mapKind(r); if (!mapShow[k]) continue;
    const el = pinEl(colors[k]); el.title = r.shop;
    el.addEventListener('click', ev => { ev.stopPropagation(); showCard(r); });
    pinMarkers.push(new maplibregl.Marker({element:el, anchor:'bottom'}).setLngLat(ll(r.lat, r.lng)).addTo(mainMap));
    pts.push(ll(r.lat, r.lng));
  }
  return pts;
}

/* Google-Maps-like place card at the bottom */
let cardRec = null;
function showCard(r){
  cardRec = r;
  const t = T(), k = mapKind(r);
  const label = k === 'wish' ? t.wish : k === 'again' ? t.again : t.visited;
  const real = r.photo && r.photo.startsWith('data:image');
  $('#mapCard').innerHTML = `${real ? `<img src="${r.photo}" alt="">` : '<span class="noimg"></span>'}
    <div><h3>${esc(r.shop)}</h3>
      <div class="mmeta">${r.rating ? `★${r.rating.toFixed(1)} · ` : ''}<span style="color:${colors[k]};font-weight:700">● ${esc(label)}</span>${r.sample ? '（見本）' : ''}</div>
      ${areaText(r) ? `<div class="mmeta">${esc(areaText(r))}</div>` : ''}
      <div class="mrow"><button type="button" class="pri" id="mcOpen">くわしく</button><a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener">経路</a></div>
    </div><button type="button" class="mx" id="mcClose" aria-label="閉じる">✕</button>`;
  $('#mapCard').hidden = false; $('#mapLocate').style.bottom = 'calc(var(--sab) + 140px)';
  $('#mcClose').onclick = hideCard;
  $('#mcOpen').onclick = () => {
    if (r.list === 'wish') { if (r.sample) toast('見本です'); else openWish(records.find(x => x.id === r.id) || r); }
    else openDetail(r.id);
  };
  mainMap && mainMap.easeTo({center:ll(r.lat, r.lng), offset:[0, -60]});
}
function hideCard(){ cardRec = null; $('#mapCard').hidden = true; $('#mapLocate').style.bottom = ''; }
function focusOnMap(r){
  setTimeout(() => { if (!mainMap) return; mainMap.jumpTo({center:ll(r.lat, r.lng), zoom:16}); showCard(r); }, 120);
}
$('#mapClose').addEventListener('click', () => setView(lastListView || 'all'));
$('#mapQuery').addEventListener('input', () => {
  const q = $('#mapQuery').value.trim().toLowerCase(), box = $('#mapResults');
  if (!q) { box.hidden = true; return; }
  const hits = [...shownRecords('visit'), ...shownRecords('wish')].filter(r => (r.shop || '').toLowerCase().includes(q) || (r.place || '').toLowerCase().includes(q)).slice(0, 12);
  box.innerHTML = hits.length ? hits.map(r => `<button type="button" data-id="${esc(r.id)}">${esc(r.shop)}<span>${r.lat != null ? esc(areaText(r) || '地図で見る') : '場所がわからないため地図に出せません'}</span></button>`).join('') : '<button type="button" disabled>見つかりませんでした</button>';
  box.hidden = false;
});
$('#mapResults').addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  const r = [...shownRecords('visit'), ...shownRecords('wish')].find(x => x.id === b.dataset.id);
  $('#mapResults').hidden = true; $('#mapQuery').blur();
  if (!r) return;
  if (r.lat == null) { toast('この記録は場所がわからないため、地図に出せません'); return; }
  const k = mapKind(r); if (!mapShow[k]) { mapShow[k] = true; renderMap(false); }
  mainMap.jumpTo({center:ll(r.lat, r.lng), zoom:16}); showCard(r);
});
let hereMarker = null;
$('#mapLocate').addEventListener('click', () => {
  toast('現在地を探しています…');
  locateHere(p => {
    if (!p) { toast('現在地を取得できませんでした。位置情報の許可を確認してください'); return; }
    if (!mainMap) return;
    if (hereMarker) hereMarker.remove();
    const el = document.createElement('div'); el.className = 'hereDot';
    hereMarker = new maplibregl.Marker({element:el}).setLngLat(ll(p.lat, p.lng)).addTo(mainMap);
    mainMap.easeTo({center:ll(p.lat, p.lng), zoom:15});
  });
});

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
