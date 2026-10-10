/* グルメモ — record form & wish form */
'use strict';

const prefOptions = '<option value="">選ぶ</option>' + PREFS.map(p => `<option value="${p}">${p}</option>`).join('');
$('#fPref').innerHTML = prefOptions; $('#wPref').innerHTML = prefOptions;
const lastPref = () => lsGet('gm-pref') || '';

/* ---------- form state ---------- */
const F = { editingId:null, fromWishId:null, rating:0, photo:'', dishes:[], interior:[], menus:[], gallery:[], tags:[], loc:null };

function applyFormLabels(){
  const t = T();
  document.querySelectorAll('#editSheet [data-need], #wishSheet [data-need]').forEach(el => {
    const need = el.dataset.need;
    const on = need === 'loc' ? t.shop : !!t[need];
    el.hidden = !on;
  });
  $('#coverLabel').textContent = t.cover;
  $('#nameLabel').textContent = t.name; $('#wNameLabel').textContent = t.name;
  $('#fShop').placeholder = cur.tmpl === 'izakaya' ? '例：炭火焼鳥 とりまる' : cur.tmpl === 'kissa' ? '例：純喫茶 みどり' : cur.tmpl === 'work' ? '例：ローマの休日' : '例：道後温泉 本館';
  $('#wShop').placeholder = $('#fShop').placeholder;
  $('#itemsLabel').textContent = t.itemsLabel;
  $('#dateLabel').textContent = t.date;
  $('#tagsLabel').textContent = t.tags + (cur.tmpl === 'izakaya' ? '' : '（当てはまるものを全部タップ）');
  $('#againToggleLabel').textContent = t.again;
  $('#againToggleSub').textContent = `「${t.again}」ページに並びます`;
  $('#galleryLabel').textContent = cur.tmpl === 'work' ? '写真（ポスター・ラベルなど）' : '写真';
  $('#photoHintText').textContent = t.shop ? '写真を入れると、撮った日が自動で入ります' : '写真を入れると、撮った日が自動で入ります';
  $('#fMemo').placeholder = cur.tmpl === 'izakaya' ? 'ちょっとしたメモに。雰囲気、席、混み具合、一緒に行った人など' : cur.tmpl === 'kissa' ? 'ちょっとしたメモに。営業時間、混み具合、Wi-Fiの有無など' : 'ちょっとしたメモに';
  $('#wMenuLabel').textContent = cur.tmpl === 'work' ? '気になるポイント' : '気になるメニュー';
  $('#wMenu').placeholder = cur.tmpl === 'work' ? '例：主演が好き' : '例：名物の〇〇';
  $('#wishTitle').textContent = t.wish;
  $('#wWent').textContent = cur.tmpl === 'work' ? '記録する' : '行った！記録する';
}

/* ---------- rating (swipe, 0.5 steps) ---------- */
$('#rateInput').innerHTML = starsHTML(0, 46);
const rateEl = $('#rateInput').firstElementChild;
Object.entries({role:'slider', tabindex:'0', 'aria-labelledby':'rateLbl', 'aria-valuemin':'0', 'aria-valuemax':'5'}).forEach(([k,v]) => rateEl.setAttribute(k, v));
function setRating(v){
  F.rating = Math.max(0, Math.min(5, Math.round(v*2)/2));
  rateEl.querySelector('.fill').style.width = (F.rating/5*100) + '%';
  rateEl.setAttribute('aria-valuenow', F.rating); rateEl.setAttribute('aria-valuetext', `星${F.rating}`);
  $('#rateNum').textContent = F.rating.toFixed(1); $('#rateWord').textContent = word(F.rating);
}
const fromX = x => { const r = rateEl.getBoundingClientRect(); const ratio = (x - r.left) / r.width; return ratio <= 0.02 ? 0 : Math.ceil(Math.min(1, ratio) * 10) / 2; };
let dragging = false;
rateEl.addEventListener('pointerdown', e => { dragging = true; try { rateEl.setPointerCapture(e.pointerId); } catch {} setRating(fromX(e.clientX)); e.preventDefault(); });
rateEl.addEventListener('pointermove', e => { if (dragging) setRating(fromX(e.clientX)); });
['pointerup','pointercancel','lostpointercapture'].forEach(t => rateEl.addEventListener(t, () => { dragging = false; }));
rateEl.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setRating(F.rating + .5); e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setRating(F.rating - .5); e.preventDefault(); }
});

/* ---------- cover photo ---------- */
function setCover(p){
  F.photo = p || '';
  $('#photoPrev').hidden = !F.photo; $('#photoHint').hidden = !!F.photo; $('#photoClear').hidden = !F.photo;
  if (F.photo) $('#photoPrev').src = F.photo; else $('#photoPrev').removeAttribute('src');
}
async function takeCover(files, fromCamera){
  const f = files[0]; if (!f) return;
  try { setCover(await compress(f)); } catch { toast('写真を読み込めませんでした'); return; }
  let date = await exifDate(f), how = '撮影した日を日付に入れました';
  if (!date && fromCamera) date = today();
  if (!date && f.lastModified && Date.now() - f.lastModified > 60000) { date = ymd(new Date(f.lastModified)); how = '写真の日付を日付に入れました'; }
  if (!date) { date = today(); how = '撮影日が読めなかったので今日の日付です。違っていたら直してください'; }
  $('#fDate').value = date;
  const h = $('#dateHint'); h.textContent = how; h.hidden = false;
  // at the shop right now: use where we are as the map position
  if (fromCamera && T().shop && !F.loc && !F.editingId) locateHere(p => { if (p && !F.loc) { F.loc = p; renderLoc(); toast('今いる場所を地図の位置に入れました'); } });
}
$('#coverCam').addEventListener('click', () => pickPhotos({camera:true}).then(f => takeCover(f, true)));
$('#coverLib').addEventListener('click', () => pickPhotos({}).then(f => takeCover(f, false)));
$('#photoClear').addEventListener('click', () => setCover(''));

/* ---------- dishes (photo + name + おすすめ, reorder) ---------- */
function renderDishes(){
  $('#dishList').innerHTML = F.dishes.map((d, i) => `
    <div class="drow" data-did="${esc(d.id)}">
      <button type="button" class="dthumb" data-photo aria-label="写真">${d.photo ? `<img src="${d.photo}" alt="">` : CAM}</button>
      <div class="dfields">
        <input class="dname" value="${esc(d.name || '')}" placeholder="名前（例：つくね）" aria-label="名前" autocomplete="off">
        <div class="dsub"><button type="button" class="recbtn" data-rec aria-pressed="${!!d.rec}">おすすめ</button></div>
      </div>
      <div class="dmove">
        <button type="button" data-up aria-label="上へ" ${i === 0 ? 'disabled style="opacity:.25"' : ''}>▲</button>
        <button type="button" data-remove aria-label="外す">×</button>
        <button type="button" data-down aria-label="下へ" ${i === F.dishes.length - 1 ? 'disabled style="opacity:.25"' : ''}>▼</button>
      </div>
    </div>`).join('');
}
const dishOf = el => { const row = el.closest('[data-did]'); return row ? F.dishes.find(d => d.id === row.dataset.did) : null; };
$('#dishList').addEventListener('input', e => { const d = dishOf(e.target); if (d && e.target.classList.contains('dname')) d.name = e.target.value; });
$('#dishList').addEventListener('click', e => {
  const d = dishOf(e.target); if (!d) return;
  const i = F.dishes.indexOf(d);
  if (e.target.closest('[data-rec]')) { d.rec = !d.rec; e.target.closest('[data-rec]').setAttribute('aria-pressed', d.rec); return; }
  if (e.target.closest('[data-remove]')) { F.dishes.splice(i, 1); renderDishes(); return; }
  if (e.target.closest('[data-up]') && i > 0) { [F.dishes[i-1], F.dishes[i]] = [F.dishes[i], F.dishes[i-1]]; renderDishes(); return; }
  if (e.target.closest('[data-down]') && i < F.dishes.length - 1) { [F.dishes[i+1], F.dishes[i]] = [F.dishes[i], F.dishes[i+1]]; renderDishes(); return; }
  if (e.target.closest('[data-photo]')) {
    const set = async files => { const out = await compressAll(files.slice(0, 1), 900); if (out[0]) { d.photo = out[0]; renderDishes(); } };
    const acts = [{label:'カメラで撮る', fn:() => pickPhotos({camera:true}).then(set)}, {label:'写真フォルダから選ぶ', fn:() => pickPhotos({}).then(set)}];
    if (d.photo) acts.push({label:'写真を外す', danger:true, fn:() => { d.photo = ''; renderDishes(); }});
    actionSheet(d.name || '写真', acts);
  }
});
function focusDish(id){ const el = document.querySelector(`[data-did="${id}"] .dname`); if (el) el.focus(); }
$('#dishCam').addEventListener('click', () => pickPhotos({camera:true}).then(async files => {
  const out = await compressAll(files, 900); out.forEach(p => F.dishes.push({id:newId('d'), name:'', rec:false, photo:p}));
  renderDishes(); if (out.length) focusDish(F.dishes[F.dishes.length - 1].id);
}));
$('#dishLib').addEventListener('click', () => pickPhotos({multiple:true}).then(async files => {
  if (!files.length) return;
  toast(`${files.length}枚を読み込み中…`);
  const out = await compressAll(files, 900); out.forEach(p => F.dishes.push({id:newId('d'), name:'', rec:false, photo:p}));
  renderDishes(); if (out.length) toast(`${out.length}品を追加しました。名前を入れてください`);
}));
$('#dishPlain').addEventListener('click', () => { const d = {id:newId('d'), name:'', rec:false, photo:''}; F.dishes.push(d); renderDishes(); focusDish(d.id); });

/* ---------- photo grids: 店内 / メニュー表 / 写真 ---------- */
const SHOTS = { interior:{box:'#interiorShots', max:1100, label:'店内'}, menu:{box:'#menuShots', max:1600, label:'メニュー表'}, gallery:{box:'#galleryShots', max:1280, label:'写真'} };
const shotArr = kind => kind === 'interior' ? F.interior : kind === 'menu' ? F.menus : F.gallery;
function renderShots(){
  for (const [kind, s] of Object.entries(SHOTS)) {
    $(s.box).innerHTML = shotArr(kind).map((u, i) => `<button type="button" class="shot" data-kind="${kind}" data-i="${i}" aria-label="${s.label}${i + 1}枚目"><img src="${u}" alt=""><span class="no">${i + 1}</span></button>`).join('');
  }
}
document.querySelectorAll('[data-shots]').forEach(box => {
  const kind = box.dataset.shots;
  box.innerHTML = `<button class="btn" type="button" data-cam>${CAM}カメラ</button><button class="btn" type="button" data-lib>${LIB}写真フォルダ</button>`;
  box.querySelector('[data-cam]').addEventListener('click', () => pickPhotos({camera:true}).then(async f => { (await compressAll(f, SHOTS[kind].max)).forEach(p => shotArr(kind).push(p)); renderShots(); }));
  box.querySelector('[data-lib]').addEventListener('click', () => pickPhotos({multiple:true}).then(async f => {
    if (!f.length) return; toast(`${f.length}枚を読み込み中…`);
    (await compressAll(f, SHOTS[kind].max)).forEach(p => shotArr(kind).push(p)); renderShots();
  }));
});
['#interiorShots','#menuShots','#galleryShots'].forEach(id => $(id).addEventListener('click', e => {
  const b = e.target.closest('.shot'); if (!b) return;
  const arr = shotArr(b.dataset.kind), i = Number(b.dataset.i), max = SHOTS[b.dataset.kind].max;
  const replace = async files => { const out = await compressAll(files.slice(0, 1), max); if (out[0]) { arr[i] = out[0]; renderShots(); } };
  const acts = [];
  if (i > 0) acts.push({label:'← 前へ', fn:() => { [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; renderShots(); }});
  if (i < arr.length - 1) acts.push({label:'次へ →', fn:() => { [arr[i+1], arr[i]] = [arr[i], arr[i+1]]; renderShots(); }});
  if (i > 0) acts.push({label:'いちばん先頭にする', fn:() => { arr.unshift(arr.splice(i, 1)[0]); renderShots(); }});
  acts.push({label:'カメラで撮り直す', fn:() => pickPhotos({camera:true}).then(replace)});
  acts.push({label:'写真フォルダから差し替え', fn:() => pickPhotos({}).then(replace)});
  acts.push({label:'この写真を削除', danger:true, fn:() => { arr.splice(i, 1); renderShots(); }});
  actionSheet(`${SHOTS[b.dataset.kind].label} ${i + 1}枚目`, acts);
}));

/* ---------- tags (multi select, add new) ---------- */
function renderTagPick(){
  const opts = (cur.tags || []).slice(); F.tags.forEach(t => { if (!opts.includes(t)) opts.push(t); });
  $('#soupPick').innerHTML = opts.map(s => `<button type="button" class="chip" data-s="${esc(s)}" aria-pressed="${F.tags.includes(s)}">${esc(s)}</button>`).join('') + '<button type="button" class="chip add" data-new>＋追加</button>';
}
$('#soupPick').addEventListener('click', e => {
  if (e.target.closest('[data-new]')) { $('#formTypeRow').hidden = false; $('#formTypeErr').hidden = true; $('#formNewType').value = ''; $('#formNewType').focus(); return; }
  const b = e.target.closest('[data-s]'); if (!b) return;
  const t = b.dataset.s;
  if (cur.tmpl === 'izakaya') F.tags = F.tags.includes(t) ? [] : [t];   // 居酒屋 keeps one 種類 like before
  else F.tags = F.tags.includes(t) ? F.tags.filter(x => x !== t) : [...F.tags, t];
  renderTagPick();
});
function addTag(name){
  name = cleanName(name);
  if (!name) return '名前を入れてください';
  if (name === '全表示') return '「全表示」は使えない名前です';
  if ((cur.tags || []).includes(name)) return `「${name}」はもうあります`;
  cur.tags = [...(cur.tags || []), name]; saveCats(); return null;
}
function formAddTag(){
  const v = $('#formNewType').value; const err = addTag(v);
  if (err) { $('#formTypeErr').textContent = err; $('#formTypeErr').hidden = false; return; }
  const n = cleanName(v); F.tags = cur.tmpl === 'izakaya' ? [n] : [...F.tags, n];
  $('#formTypeRow').hidden = true; $('#formTypeErr').hidden = true; renderTagPick(); renderTypes();
}
$('#formTypeAdd').addEventListener('click', formAddTag);
$('#formNewType').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); formAddTag(); } });

/* ---------- price ---------- */
function updatePerPerson(){
  const t = $('#fTotal').value.trim(), n = $('#fPeople').value.trim(), el = $('#perPerson');
  if (t === '') { el.textContent = '合計金額と人数を入れると、1人あたりを自動で計算します'; return; }
  el.innerHTML = `1人あたり <b>${yen(perPerson(Number(t), Number(n) || 1))}</b>（${n ? esc(n) + '人で' : '人数未入力のため1人で'}計算）`;
}
$('#fTotal').addEventListener('input', updatePerPerson);
$('#fPeople').addEventListener('input', updatePerPerson);

/* ---------- location ---------- */
function renderLoc(){
  const on = !!F.loc;
  $('#fLocBox').classList.toggle('on', on);
  $('#fLocText').textContent = on ? '地図の位置：設定済み' : '地図の位置：未設定';
  $('#fLocBtn').textContent = on ? '変更' : '地図で設定';
  syncMapLink($('#fMap'), $('#fShop').value, $('#fPref').value, $('#fPlace').value);
}
function syncMapLink(a, shop, pref, place){
  const has = cleanName(shop) || cleanName(place);
  a.hidden = !has; if (has) { a.href = mapUrl(cleanName(shop), pref, cleanName(place)); a.innerHTML = PIN + 'Googleマップで開く ↗'; }
}
['#fShop','#fPlace'].forEach(id => $(id).addEventListener('input', renderLoc)); $('#fPref').addEventListener('change', renderLoc);
$('#fLocBtn').addEventListener('click', () => pickLocation(F.loc, $('#fPref').value, p => { F.loc = p; renderLoc(); }));

/* ---------- open / save the record form ---------- */
function openEdit(entry, opts = {}){
  applyFormLabels();
  F.editingId = entry && entry.id && !opts.prefill ? entry.id : null;
  F.fromWishId = opts.fromWish || null;
  F.tmdb = entry && entry.tmdb || null;
  $('#editTitle').textContent = F.editingId ? '編集中' : T().fab;
  $('#editSheet').classList.toggle('instant', !!opts.inline);
  $('#fShop').value = entry?.shop || '';
  $('#fSub').value = entry?.sub || '';
  $('#fWhere').value = entry?.where || '';
  $('#fDate').value = entry?.date || today();
  $('#fPref').value = entry ? (entry.pref || '') : lastPref();
  $('#fPlace').value = entry?.place || '';
  $('#fMemo').value = entry?.memo || '';
  $('#fMood').value = entry?.mood || '';
  $('#fAgain').checked = !!entry?.again;
  $('#fTotal').value = entry?.total ?? '';
  $('#fPeople').value = entry?.people ?? '';
  $('#fResv').value = entry?.resv || '';
  $('#fNomi').checked = !!entry?.nomi;
  F.dishes = (entry?.dishes || []).map(d => ({...d}));
  F.interior = (entry?.interior || []).slice(); F.menus = (entry?.menus || []).slice(); F.gallery = (entry?.gallery || []).slice();
  F.videos = (entry?.videos || []).slice();
  F.tags = entry ? tagsOf(entry).slice() : (view === 'types' && typeSel !== 'all' ? [typeSel] : []);
  F.loc = entry && entry.lat != null ? {lat:entry.lat, lng:entry.lng} : null;
  $('#shopErr').hidden = true; $('#dateHint').hidden = true; $('#formTypeRow').hidden = true; $('#formTypeErr').hidden = true;
  renderDishes(); renderShots(); renderVideoShots(); renderTagPick(); setRating(entry?.rating || 0); setCover(entry?.photo || ''); updatePerPerson(); renderLoc();
  show($('#editSheet'));
}
$('#editForm').addEventListener('submit', async e => {
  e.preventDefault();
  const shop = cleanName($('#fShop').value);
  if (!shop) { $('#shopErr').hidden = false; $('#fShop').focus(); return; }
  const prev = records.find(x => x.id === F.editingId);
  const t = T();
  const totalRaw = $('#fTotal').value.trim(), peopleRaw = $('#fPeople').value.trim();
  const total = t.price && totalRaw !== '' ? Math.max(0, Math.round(Number(totalRaw))) : '';
  const people = t.price && peopleRaw !== '' ? Math.max(1, Math.round(Number(peopleRaw))) : '';
  const rec = {
    ...(prev || {}),
    id: F.editingId || newId('r'), cat: cur.id, list: 'visit',
    shop, sub: t.sub ? cleanName($('#fSub').value) : '', where: t.where ? cleanName($('#fWhere').value) : '',
    rating: F.rating, date: $('#fDate').value || today(), photo: F.photo,
    dishes: t.items ? F.dishes.filter(d => d.name || d.photo).map(d => ({id:d.id, name:cleanName(d.name), rec:!!d.rec, photo:d.photo || ''})) : [],
    interior: t.interior ? F.interior.slice() : [], menus: t.menus ? F.menus.slice() : [], gallery: t.gallery ? F.gallery.slice() : [],
    videos: t.video ? (F.videos || []).slice() : [],
    mood: t.interior ? cleanName($('#fMood').value) : '',
    total, people, price: t.price ? perPerson(total, people) : '',
    resv: t.resv ? $('#fResv').value : '', nomi: t.nomi ? $('#fNomi').checked : false,
    pref: t.shop ? $('#fPref').value : '', place: t.shop ? cleanName($('#fPlace').value) : '',
    lat: t.shop && F.loc ? F.loc.lat : null, lng: t.shop && F.loc ? F.loc.lng : null,
    tags: F.tags.slice(), again: $('#fAgain').checked, memo: $('#fMemo').value.trim(),
    createdAt: prev?.createdAt || Date.now(), updatedAt: Date.now(),
  };
  if (!rec.tmdb && F.tmdb) rec.tmdb = F.tmdb;
  delete rec.soup; delete rec.item;
  try { await dbPut(rec); } catch { toast('保存できませんでした。iPhoneの空き容量を確認してください'); return; }
  if (rec.pref) lsSet('gm-pref', rec.pref);
  const i = records.findIndex(x => x.id === rec.id);
  if (i >= 0) records[i] = rec; else records.push(rec);
  const again = catRecords('visit').filter(x => cleanName(x.shop).replace(/\s+/g, '').toLowerCase() === shop.replace(/\s+/g, '').toLowerCase()).length;
  let msg = prev ? '直しました' : again >= 2 ? `「${shop}」は${again}回目！` : `${catRecords('visit').length}${t.unit}目を記録しました`;
  if (F.fromWishId) {
    try { await dbDel(F.fromWishId); } catch {}
    records = records.filter(w => w.id !== F.fromWishId); F.fromWishId = null;
    msg = `記録して「${t.wish}」から外しました`; hide($('#wishSheet'));
  }
  hide($('#editSheet'));
  if (!$('#detailSheet').hidden) openDetail(rec.id, true);
  renderAll(); toast(msg);
  if (t.shop) autoPlace([rec]);
});

/* ---------- wish form ---------- */
const W = { editing:null, loc:null };
function renderWLoc(){
  const on = !!W.loc;
  $('#wLocBox').classList.toggle('on', on);
  $('#wLocText').textContent = on ? '地図の位置：設定済み' : '地図の位置：未設定';
  $('#wLocBtn').textContent = on ? '変更' : '地図で設定';
  syncMapLink($('#wMap'), $('#wShop').value, $('#wPref').value, $('#wPlace').value);
}
['#wShop','#wPlace'].forEach(id => $(id).addEventListener('input', renderWLoc)); $('#wPref').addEventListener('change', renderWLoc);
$('#wLocBtn').addEventListener('click', () => pickLocation(W.loc, $('#wPref').value, p => { W.loc = p; renderWLoc(); }));
function openWish(w){
  applyFormLabels();
  W.editing = w ? w.id : null;
  $('#wishTitle').textContent = w ? T().wish : `${T().wish}を追加`;
  $('#wShop').value = w?.shop || ''; $('#wPref').value = w ? (w.pref || '') : lastPref();
  $('#wPlace').value = w?.place || ''; $('#wMenu').value = w?.menu || ''; $('#wMemo').value = w?.memo || '';
  W.loc = w && w.lat != null ? {lat:w.lat, lng:w.lng} : null; renderWLoc();
  $('#wShopErr').hidden = true;
  $('#wishActions').hidden = !w;
  renderWishExtras(w);
  const b = $('#wDel'); b.classList.remove('armed'); b.textContent = '削除'; b.dataset.armed = '';
  show($('#wishSheet'));
}
$('#wishForm').addEventListener('submit', async e => {
  e.preventDefault();
  const shop = cleanName($('#wShop').value);
  if (!shop) { $('#wShopErr').hidden = false; $('#wShop').focus(); return; }
  const prev = records.find(w => w.id === W.editing);
  const shopT = T().shop;
  const w = {...(prev || {}), id: W.editing || newId('w'), cat: cur.id, list:'wish', shop,
    pref: shopT ? $('#wPref').value : '', place: shopT ? cleanName($('#wPlace').value) : '',
    lat: shopT && W.loc ? W.loc.lat : null, lng: shopT && W.loc ? W.loc.lng : null,
    menu: cleanName($('#wMenu').value), memo: $('#wMemo').value.trim(), createdAt: prev?.createdAt || Date.now(), updatedAt: Date.now() };
  try { await dbPut(w); } catch { toast('保存できませんでした'); return; }
  if (w.pref) lsSet('gm-pref', w.pref);
  const i = records.findIndex(x => x.id === w.id); if (i >= 0) records[i] = w; else records.push(w);
  hide($('#wishSheet')); renderAll(); toast(prev ? '直しました' : `「${T().wish}」に追加しました`);
  if (shopT) autoPlace([w]);
});
function renderWishExtras(w){
  const box = $('#wExtras');
  const html = w ? linkRowHTML(cur, w.shop) + streamHTML(w) : '';
  box.hidden = !html; box.innerHTML = html;
  if (!w) return;
  bindLinkRow(box, cur, w.shop);
  fillStream(box, w, () => renderWishExtras(records.find(x => x.id === w.id) || w));
}
function wentTo(w){
  openEdit({shop:w.shop, pref:w.pref, place:w.place, lat:w.lat, lng:w.lng, dishes: w.menu ? [{id:newId('d'), name:w.menu, rec:true, photo:''}] : [], memo:w.memo || '', tmdb:w.tmdb || null}, {prefill:true, fromWish:w.id});
}
$('#wWent').addEventListener('click', () => { const w = records.find(x => x.id === W.editing); if (w) wentTo(w); });
$('#wDel').addEventListener('click', async () => {
  const b = $('#wDel');
  if (!b.dataset.armed) { b.dataset.armed = '1'; b.classList.add('armed'); b.textContent = 'もう一度押すと削除'; setTimeout(() => { b.dataset.armed = ''; b.classList.remove('armed'); b.textContent = '削除'; }, 3000); return; }
  try { await dbDel(W.editing); } catch { toast('削除できませんでした'); return; }
  records = records.filter(w => w.id !== W.editing);
  hide($('#wishSheet')); renderAll(); toast('削除しました');
});
