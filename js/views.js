/* Stash — genre view: lists, tabs, tags, hero, switching, settings */
'use strict';

/* samples shown only while a built-in genre is empty */
const SAMPLES = {
  izakaya: {
    visit: [
      {id:'s1', shop:'炭火焼鳥 とりまる', dishes:[{id:'d1',name:'つくね（タレ）',rec:true},{id:'d2',name:'ねぎま'},{id:'d3',name:'生ビール'}], total:12000, price:4000, people:3, nomi:false, resv:'要予約', pref:'愛知県', place:'名古屋駅店', lat:35.1709, lng:136.8815, rating:4.5, date:'2026-10-04', tags:['大衆店'], again:true, memo:'カウンターが落ち着く'},
      {id:'s2', shop:'海鮮酒場 うおまさ', dishes:[{id:'d1',name:'刺身五点盛り',rec:true},{id:'d2',name:'ぶり大根'}], total:22000, price:5500, people:4, nomi:true, resv:'要予約', pref:'東京都', place:'新橋店', lat:35.6663, lng:139.7583, rating:4.0, date:'2026-09-27', tags:['高級店'], again:false, memo:'個室あり'},
      {id:'s3', shop:'大衆酒場 ちどり', dishes:[{id:'d1',name:'もつ煮込み',rec:true}], total:5000, price:2500, people:2, pref:'愛知県', place:'栄店', lat:35.1706, lng:136.9086, rating:3.5, date:'2026-09-15', tags:['大衆店'], again:false, memo:'0次会向き'},
    ],
    wish: [
      {id:'w1', shop:'おでん処 しずく', pref:'東京都', place:'神楽坂', lat:35.7016, lng:139.7408, menu:'大根と牛すじ', memo:'先輩のおすすめ'},
    ],
  },
  kissa: {
    visit: [
      {id:'s1', shop:'純喫茶 みどり', dishes:[{id:'d1',name:'クリームソーダ',rec:true},{id:'d2',name:'固めのプリン',rec:true}], pref:'愛知県', place:'大須', lat:35.1595, lng:136.9020, rating:4.5, date:'2026-10-04', tags:['禁煙','落ち着いている'], again:true, mood:'昭和の照明とステンドグラス', memo:'窓際の席がおすすめ'},
      {id:'s2', shop:'喫茶 ランブル', dishes:[{id:'d1',name:'ナポリタン',rec:true}], pref:'東京都', place:'銀座', lat:35.6717, lng:139.7650, rating:4.0, date:'2026-09-27', tags:['喫煙可','賑やか'], again:false, memo:'お昼どきは並ぶ'},
    ],
    wish: [
      {id:'w1', shop:'喫茶 ほしぞら', pref:'東京都', place:'神保町', lat:35.6959, lng:139.7577, menu:'ホットケーキ', memo:'日曜定休'},
    ],
  },
};
function shownRecords(list){
  const real = catRecords(list);
  if (real.length || catRecords('visit').length) return real;   // samples disappear once anything is recorded
  const s = (SAMPLES[cur.id] || {})[list] || [];
  return s.map(x => ({...x, sample:true, cat:cur.id, list}));
}

/* ---------- state for this view ---------- */
let view = 'all', query = '', sortBy = lsGet('gm-sort') || 'date';
let typeSel = 'all', typeEdit = false, armedType = null, armTimer = null;
$('#sort').value = sortBy;
const sorters = {
  date: (a,b) => (b.date||'').localeCompare(a.date||'') || (b.createdAt||0)-(a.createdAt||0),
  rating: (a,b) => (b.rating||0)-(a.rating||0) || (b.date||'').localeCompare(a.date||''),
  price: (a,b) => (a.price === '' || a.price == null ? Infinity : Number(a.price)) - (b.price === '' || b.price == null ? Infinity : Number(b.price)),
  shop: (a,b) => (a.shop||'').localeCompare(b.shop||'','ja'),
};
const matches = (fields, q) => fields.join(' ').toLowerCase().includes(q);

/* ---------- cards ---------- */
function cardsHTML(arr){
  const t = T();
  return arr.map(e => `
    <button type="button" class="ticket" data-id="${esc(e.id)}">
      ${e.sample ? '<span class="sample-mark">見本</span>' : ''}
      <img class="ph" src="${e.photo || placeholder(cur.tmpl)}" alt="" loading="lazy">
      <span class="tbody">
        <span class="tmain">
          <span class="shop">${esc(e.shop)}</span>
          <span class="item">${esc(dishNames(e, true) ? 'おすすめ：' + dishNames(e, true) : (e.sub || dishNames(e) || '—'))}</span>
          ${t.shop && areaText(e) ? `<span class="area">${PIN}<span>${esc(areaText(e))}</span></span>` : ''}
          ${!t.shop && e.where ? `<span class="area">${PIN}<span>${esc(e.where)}</span></span>` : ''}
          <span style="margin-top:3px">${starsHTML(e.rating || 0, 15)}</span>
          <span class="meta">${e.again ? `<span class="heart" aria-label="${esc(t.again)}">♥</span>` : ''}${tagsOf(e).slice(0, 3).map(x => `<span class="tag">${esc(x)}</span>`).join('')}${e.nomi ? '<span class="tag">飲み放題</span>' : ''}${e.people ? `<span>${esc(e.people)}人</span>` : ''}<span>${fmtDate(e.date)}</span></span>
        </span>
        <span class="stub"><span class="num">${(e.rating || 0).toFixed(1)}</span><small>評価</small>${t.price && e.price !== '' && e.price != null ? `<span class="yen">${yen(e.price)}</span><small>1人あたり</small>` : ''}</span>
      </span>
    </button>`).join('');
}
function wishHTML(arr){
  const t = T();
  return arr.map(w => `
    <div class="wish" data-wid="${esc(w.id)}" role="button" tabindex="0">
      ${w.sample ? '<span class="sample-mark">見本</span>' : ''}
      <span class="wicon">${FLAG}</span>
      <span class="wmain">
        <span class="shop">${esc(w.shop)}</span>
        ${w.menu ? `<span class="item">気になる：${esc(w.menu)}</span>` : ''}
        ${areaText(w) ? `<span class="area">${PIN}<span>${esc(areaText(w))}</span></span>` : ''}
      </span>
      ${w.sample ? '' : `<button type="button" class="went" data-went="${esc(w.id)}">${esc(t.went)}</button>`}
    </div>`).join('');
}

/* ---------- renders ---------- */
function renderStats(){
  // just the number of memos next to the genre name (見本 are not counted)
  $('#catCount').textContent = `${catRecords('visit').length}${T().unit}`;
}
function renderAllView(){
  const t = T(), q = query.toLowerCase();
  const isSample = !catRecords('visit').length && (SAMPLES[cur.id] || {}).visit;
  $('#sampleNote').hidden = !isSample || !!q;
  $('#sampleNote').textContent = `いま表示しているのは見本です。右下の「${t.fab}」から最初の1${t.unit}を登録すると、見本は消えて自分の記録だけになります。`;
  let arr = shownRecords('visit').slice();
  if (q) arr = arr.filter(e => matches([e.shop, e.sub, e.where, dishNames(e), e.pref, e.place, e.memo, e.mood, tagsOf(e).join(' '), e.nomi ? '飲み放題' : '', e.resv], q));
  arr.sort(sorters[sortBy] || sorters.date);
  $('#searchHead').hidden = !q; $('#searchHeadLabel').textContent = t.visited; $('#searchCount').textContent = `${arr.length}件`;
  $('#list').innerHTML = arr.length ? cardsHTML(arr)
    : `<p class="empty">${q ? '見つかりませんでした' : `まだ記録がありません。右下の「${esc(t.fab)}」から追加できます`}</p>`;
  if (q) {
    const ws = shownRecords('wish').filter(w => matches([w.shop, w.menu, w.pref, w.place, w.memo], q));
    $('#searchWish').hidden = false; $('#searchWishLabel').textContent = t.wish; $('#searchWishCount').textContent = `${ws.length}件`;
    $('#searchWishList').innerHTML = ws.length ? wishHTML(ws) : `<p class="empty">${esc(t.wish)}には見つかりませんでした</p>`;
  } else $('#searchWish').hidden = true;
}
function renderAgain(){
  const t = T(); const arr = shownRecords('visit').filter(e => e.again).sort(sorters.rating);
  $('#againTitle').textContent = t.again;
  $('#againSub').textContent = arr.length ? `${arr.length}件・評価が高い順` : '';
  $('#againList').innerHTML = arr.length ? cardsHTML(arr) : `<p class="empty">記録で「${esc(t.again)}」をオンにしたものがここに並びます</p>`;
}
function renderWish(){
  const t = T(); const real = catRecords('wish');
  $('#wishTitle2').textContent = t.wish;
  $('#wishSub').textContent = cur.tmpl === 'work' ? '気になるものをメモ。記録したら「記録する」で記録に変わります。' : '気になるところをメモ。行ったら「行った！」で記録に変わります。';
  const arr = shownRecords('wish').slice().sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
  $('#wishSampleNote').hidden = !!real.length || !arr.length;
  $('#wishList').innerHTML = arr.length ? wishHTML(arr) : `<p class="empty">まだありません。右下のボタンから追加できます</p>`;
}
function renderTypes(){
  const t = T(), arr = shownRecords('visit');
  const tags = cur.tags || [];
  const count = k => k === 'all' ? arr.length : arr.filter(e => tagsOf(e).includes(k)).length;
  if (typeSel !== 'all' && !tags.includes(typeSel)) typeSel = 'all';
  $('#typesTitle').textContent = t.tags;
  const tabs = [['all','全表示'], ...tags.map(x => [x, x])];
  $('#ttabs').innerHTML = tabs.map(([k,l]) => {
    const canDel = typeEdit && k !== 'all', armed = armedType === k;
    return `<button type="button" role="tab" class="ttab${armed ? ' armed' : ''}" data-t="${esc(k)}" aria-selected="${!typeEdit && k === typeSel}">${canDel ? '<span class="x" aria-hidden="true">×</span>' : ''}${armed ? '削除する？' : esc(l)}${canDel ? '' : `<span class="cnt">${count(k)}</span>`}</button>`;
  }).join('') + (typeEdit ? '' : '<button type="button" class="ttab addtab" data-add>＋追加</button>');
  $('#typeEditBtn').textContent = typeEdit ? '完了' : '編集';
  $('#editHint').hidden = !typeEdit;
  const list = (typeSel === 'all' ? arr : arr.filter(e => tagsOf(e).includes(typeSel))).slice().sort(sorters.date);
  const rated = list.filter(e => e.rating > 0);
  $('#typeSum').innerHTML = `<b>${esc(typeSel === 'all' ? '全表示' : typeSel)}</b><span>${list.length}件</span>${rated.length ? `<span>平均★${(rated.reduce((a,e)=>a+e.rating,0)/rated.length).toFixed(1)}</span>` : ''}`;
  $('#typeList').innerHTML = list.length ? cardsHTML(list) : `<p class="empty">「${esc(typeSel === 'all' ? '全表示' : typeSel)}」の記録はまだありません</p>`;
}
function renderNudge(){
  const el = $('#backupNudge'); const last = Number(lsGet('gm-backup')) || 0;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  const n = records.filter(r => r.list === 'visit').length;
  if (n >= 3 && (days === null || days >= 30)) {
    el.textContent = days === null ? `${n}件たまりました。一度書き出しておきましょう。` : `前回の書き出しから${days}日たっています。`;
    el.hidden = false;
  } else el.hidden = true;
}
function renderAll(){
  if ($('#app').hidden) return;
  renderStats(); renderAllView(); renderAgain(); renderWish(); renderTypes(); renderNudge();
  if (view === 'map') renderMap(false);
  if (view === 'search') renderSearch();
}

/* ---------- tab bar & pages ---------- */
const TAB_ICONS = {
  all:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  again:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  wish:'<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  types:'<path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
};
function renderTabbar(){
  const t = T();
  const tabs = [['all','すべて'],['again',t.again],['wish',t.wish]];
  if (t.shop) tabs.push(['map','地図']);
  tabs.push(['search','検索']);
  tabs.push(['types', t.tags]);
  $('#tabbar').innerHTML = tabs.map(([k,l]) => `<button type="button" data-view="${k}"${k === view ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${TAB_ICONS[k]}</svg>${esc(l)}</button>`).join('');
}
$('#tabbar').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
let lastListView = 'all';
function setView(v){
  if (v === 'map' && !T().shop) v = 'all';
  if (v !== 'map') lastListView = v;
  view = v;
  document.querySelectorAll('#app .view').forEach(s => s.hidden = s.id !== 'view-' + v);
  document.querySelectorAll('#tabbar button').forEach(b => { if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#fabLabel').textContent = v === 'wish' ? `${T().wish}を追加` : T().fab;
  $('#fab').hidden = v === 'map';
  if (v !== 'types' && typeEdit) { typeEdit = false; armedType = null; renderTypes(); }
  window.scrollTo(0, 0);
  if (v === 'map') renderMap(true);
  if (v === 'search') renderSearch();
}

/* ---------- tags tab: select / add / delete ---------- */
$('#ttabs').addEventListener('click', async e => {
  if (e.target.closest('[data-add]')) { $('#addTypeForm').hidden = false; $('#typeErr').hidden = true; $('#newType').value = ''; $('#newType').focus(); return; }
  const b = e.target.closest('[data-t]'); if (!b) return;
  const k = b.dataset.t;
  if (typeEdit) {
    if (k === 'all') return;
    if (armedType === k) {
      clearTimeout(armTimer); armedType = null;
      cur.tags = (cur.tags || []).filter(x => x !== k); await saveCats();
      if (typeSel === k) typeSel = 'all';
      renderTypes(); toast(`「${k}」を消しました`);
    } else { armedType = k; clearTimeout(armTimer); armTimer = setTimeout(() => { armedType = null; renderTypes(); }, 3000); renderTypes(); }
    return;
  }
  typeSel = k; renderTypes();
});
$('#typeEditBtn').addEventListener('click', () => { typeEdit = !typeEdit; armedType = null; $('#addTypeForm').hidden = true; renderTypes(); });
$('#addTypeForm').addEventListener('submit', e => {
  e.preventDefault();
  const err = addTag($('#newType').value);
  if (err) { $('#typeErr').textContent = err; $('#typeErr').hidden = false; return; }
  typeSel = cleanName($('#newType').value);
  $('#addTypeForm').hidden = true; $('#typeErr').hidden = true; renderTypes(); toast(`「${typeSel}」を追加しました`);
});
$('#cancelType').addEventListener('click', () => { $('#addTypeForm').hidden = true; $('#typeErr').hidden = true; });

/* ---------- taps on cards ---------- */
document.addEventListener('click', e => {
  if ($('#app').hidden) return;
  const went = e.target.closest('[data-went]');
  if (went) { const w = catRecords('wish').find(x => x.id === went.dataset.went); if (w) wentTo(w); return; }
  const tk = e.target.closest('#app .ticket'); if (tk) { openDetail(tk.dataset.id); return; }
  const w = e.target.closest('#app .wish');
  if (w) { const item = shownRecords('wish').find(x => x.id === w.dataset.wid); if (!item) return; if (item.sample) { toast('見本です。右下から追加できます'); return; } openWish(item); }
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('wish')) { e.preventDefault(); e.target.click(); } });
$('#fab').addEventListener('click', () => { if (view === 'wish') openWish(null); else openEdit(null); });
$('#q').addEventListener('input', e => { query = e.target.value.trim(); renderAllView(); });
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('#sort').addEventListener('change', e => { sortBy = e.target.value; lsSet('gm-sort', sortBy); renderAllView(); });

/* ---------- hero (top banner; video for built-ins, any photo you like) ---------- */
let heroDraft = null;
function applyHero(){
  const vid = $('#heroVid'), img = $('#heroImg'), empty = $('#heroEmpty');
  const h = cur.hero;
  vid.hidden = true; img.hidden = true; empty.hidden = true;
  if (h && h.photo) { img.src = h.photo; img.hidden = false; try { vid.pause(); } catch {} }
  else if (cur.bg) { if (vid.getAttribute('src') !== cur.bg) { vid.src = cur.bg; vid.poster = cur.bgPoster || ''; } vid.hidden = false; vid.play().catch(() => {}); }
  else if (cur.cover) { img.src = cur.cover; img.hidden = false; }
  else { empty.textContent = cur.name.slice(0, 1); empty.hidden = false; }
  $('#heroCap').textContent = (h && h.caption) || (cur.id === 'kissa' ? 'Kissa & Coffee' : cur.id === 'izakaya' ? 'Izakaya' : cur.name);
}
function renderHeroPicks(){
  const list = records.filter(e => e.cat === cur.id && e.photo && e.photo.startsWith('data:image/jpeg'));
  $('#heroNoPicks').hidden = list.length > 0;
  $('#heroPicks').innerHTML = list.map(e => `<button type="button" class="hpick" data-hid="${esc(e.id)}" aria-pressed="${!!(heroDraft && heroDraft.photo === e.photo)}"><img src="${e.photo}" alt=""><span>${esc(e.shop)}</span></button>`).join('');
  $('#heroPrev').hidden = !heroDraft.photo; $('#heroPrevHint').hidden = !!heroDraft.photo;
  if (heroDraft.photo) $('#heroPrev').src = heroDraft.photo;
}
$('#heroEdit').addEventListener('click', () => {
  heroDraft = cur.hero ? {...cur.hero} : {photo:'', caption:''};
  $('#heroText').value = heroDraft.caption || '';
  renderHeroPicks(); show($('#heroSheet'));
});
$('#heroPicks').addEventListener('click', e => {
  const b = e.target.closest('[data-hid]'); if (!b) return;
  const en = records.find(x => x.id === b.dataset.hid); if (!en) return;
  heroDraft.photo = en.photo; if (!$('#heroText').value.trim()) $('#heroText').value = en.shop; renderHeroPicks();
});
const heroTake = async files => { const out = await compressAll(files.slice(0, 1), 1400); if (out[0]) { heroDraft.photo = out[0]; renderHeroPicks(); } };
$('#heroCamBtn').addEventListener('click', () => pickPhotos({camera:true}).then(heroTake));
$('#heroLibBtn').addEventListener('click', () => pickPhotos({}).then(heroTake));
$('#heroSave').addEventListener('click', async () => {
  if (!heroDraft.photo) { toast('写真を選んでください'); return; }
  cur.hero = {photo:heroDraft.photo, caption:cleanName($('#heroText').value)};
  await saveCats(); applyHero(); hide($('#heroSheet')); toast('トップの写真を変えました');
});
$('#heroReset').addEventListener('click', async () => { cur.hero = null; await saveCats(); applyHero(); hide($('#heroSheet')); toast('最初の表示に戻しました'); });

/* ---------- switching genres ---------- */
function otherCats(){ return cats.filter(c => c.id !== cur.id); }
function renderSwitchLabel(){
  const o = otherCats();
  $('#switchLabel').textContent = o.length === 1 ? `${o[0].name}へ` : '切替';
}
$('#switchBtn').addEventListener('click', () => {
  const o = otherCats();
  if (o.length === 1) { enterCat(o[0].id); return; }   // only two genres: swap straight away
  $('#switchList').innerHTML = cats.map(c => `<button type="button" class="swrow${c.id === cur.id ? ' cur' : ''}" data-cid="${esc(c.id)}">${coverThumb(c)}<b>${esc(c.name)}</b>${c.id === cur.id ? '<span class="hint">表示中</span>' : ''}</button>`).join('');
  show($('#switchSheet'));
});
$('#switchList').addEventListener('click', e => { const b = e.target.closest('[data-cid]'); if (!b) return; hide($('#switchSheet')); enterCat(b.dataset.cid); });
$('#switchHome').addEventListener('click', () => { hide($('#switchSheet')); goHome(); });
$('#homeBtn').addEventListener('click', () => goHome());
function coverThumb(c){ const src = c.cover || c.tile; return src ? `<img src="${src}" alt="">` : `<span class="ph-empty">${esc(c.name.slice(0,1))}</span>`; }

function enterCat(id, startView){
  const c = cats.find(x => x.id === id); if (!c) return;
  cur = c; lsSet('gm-last', c.id);
  document.documentElement.dataset.theme = c.theme || 'izakaya';
  document.body.classList.remove('dark-stage');
  $('#select').hidden = true; $('#app').hidden = false;
  openSheets.slice().forEach(hide);
  $('#catTitle').textContent = c.name;
  $('#sortPrice').hidden = !T().price; if (!T().price && sortBy === 'price') { sortBy = 'date'; $('#sort').value = 'date'; }
  $('#q').value = ''; query = ''; typeSel = 'all'; typeEdit = false;
  $('#sq').value = ''; dQuery = ''; dTab = 'pick';
  view = startView || 'all';
  renderTabbar(); renderSwitchLabel(); applyHero(); setView(view); renderAll();
  const tip = $('#installTip'); tip.hidden = isStandalone() || lsGet('gm-tip') === 'off';
}
$('#installClose').addEventListener('click', () => { $('#installTip').hidden = true; lsSet('gm-tip', 'off'); });

/* ---------- settings ---------- */
$('#moreBtn').addEventListener('click', () => {
  $('#cVisit').value = colors.visit; $('#cWish').value = colors.wish; $('#cAgain').value = colors.again;
  renderNudge(); show($('#moreSheet'));
});
async function saveColors(){ try { await setMeta('colors', colors); } catch {} if (view === 'map') renderMap(false); }
[['#cVisit','visit'],['#cWish','wish'],['#cAgain','again']].forEach(([id, k]) => $(id).addEventListener('input', e => { colors[k] = e.target.value; saveColors(); }));
$('#cReset').addEventListener('click', () => { colors = {...DEFAULT_COLORS}; $('#cVisit').value = colors.visit; $('#cWish').value = colors.wish; $('#cAgain').value = colors.again; saveColors(); toast('最初の色に戻しました'); });
$('#editCatBtn').addEventListener('click', () => openCatSheet(cur));
$('#toHomeBtn').addEventListener('click', () => { hide($('#moreSheet')); goHome(); });

/* backup: every genre in one file; also reads files from the older 居酒屋メモ / 喫茶 pages */
const blobToDataURL = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
async function dataURLtoBlob(u){ return (await fetch(u)).blob(); }
async function doExport(withVideos){
  if (!records.length) { toast('まだ記録がありません'); return; }
  let list = records;
  if (withVideos) {
    const total = records.reduce((a, r) => a + (r.videos || []).reduce((b, v) => b + (v.blob ? v.blob.size : 0), 0), 0);
    if (!total) { toast('動画の入った記録がありません。「記録を書き出す」で大丈夫です'); return; }
    if (total > 400 * 1048576) { toast(`動画が大きすぎて1つのファイルにできません（${Math.round(total / 1048576)}MB）`); return; }
    toast(`動画（${Math.round(total / 1048576)}MB）を書き出しています…`);
    list = [];
    for (const r of records) list.push(r.videos && r.videos.length ? {...r, videos:await Promise.all(r.videos.map(async v => ({id:v.id, type:v.type, poster:v.poster, data:v.blob ? await blobToDataURL(v.blob) : ''})))} : r);
  } else list = records.map(r => r.videos && r.videos.length ? {...r, videos:[]} : r);   // keeps the file small
  const name = `stash-${today()}${withVideos ? '-動画入り' : ''}.json`;
  const json = JSON.stringify({app:'gurumemo', version:2, exportedAt:new Date().toISOString(), cats, colors, records:list});
  const file = new File([json], name, {type:'application/json'});
  const done = () => { lsSet('gm-backup', String(Date.now())); renderNudge(); toast('書き出しました'); };
  if (navigator.canShare && navigator.canShare({files:[file]})) {
    try { await navigator.share({files:[file], title:'Stashのバックアップ'}); done(); return; }
    catch (err) { if (err && err.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); done();
}
$('#exportBtn').addEventListener('click', () => doExport(false));
$('#exportVidBtn').addEventListener('click', () => doExport(true));
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text()); let n = 0;
    if (data.app === 'gurumemo' && Array.isArray(data.records)) {
      if (Array.isArray(data.cats)) for (const c of data.cats) { if (c && c.id && !cats.find(x => x.id === c.id)) cats.push(c); }
      if (data.colors) colors = {...colors, ...data.colors};
      for (const r of data.records) {
        if (!(r && r.id && r.cat && r.shop && !r.sample)) continue;
        if (Array.isArray(r.videos)) r.videos = (await Promise.all(r.videos.map(async v => v && v.data ? {id:v.id, type:v.type, poster:v.poster, blob:await dataURLtoBlob(v.data)} : null))).filter(Boolean);
        const old = records.find(x => x.id === r.id); if (old && old.videos && old.videos.length && !(r.videos && r.videos.length)) r.videos = old.videos;
        await dbPut(r); n++;
      }
      await saveCats(); await setMeta('colors', colors);
    } else {   // older single-genre files → into the genre you are in now
      const list = Array.isArray(data) ? data : data.entries;
      if (!Array.isArray(list)) throw 0;
      for (const x of list) { if (x && x.id && x.shop && !x.sample) { await dbPut({...x, cat:cur.id, list:'visit', tags:tagsOf(x)}); n++; } }
      for (const w of (data.wishes || [])) { if (w && w.id && w.shop && !w.sample) { await dbPut({...w, cat:cur.id, list:'wish'}); n++; } }
      if (Array.isArray(data.types)) { data.types.forEach(t => { if (typeof t === 'string' && t && !(cur.tags || []).includes(t)) cur.tags = [...(cur.tags || []), t]; }); await saveCats(); }
    }
    records = await dbAll(); renderAll(); toast(`${n}件を戻しました`);
  } catch { toast('Stashのバックアップファイルではないようです'); }
});
