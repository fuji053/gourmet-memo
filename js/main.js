/* グルメモ — opening, genre picker, genre editor, start-up */
'use strict';

/* ---------- genre picker ---------- */
let selEditing = false, bgTimer = null;
function tileArt(c){
  const src = c.cover || c.tile;
  const sw = (THEMES[c.theme] || THEMES.izakaya).swatch;
  return src ? `<span class="art"><img src="${src}" alt=""></span>`
    : `<span class="art" style="background:linear-gradient(135deg,${sw[0]},${sw[1]})"><span class="ph-empty">${esc(c.name.slice(0, 1))}</span></span>`;
}
function renderSelect(){
  $('#catGrid').innerHTML = cats.map((c, i) => `
    <button class="tile" type="button" data-cid="${esc(c.id)}">
      ${selEditing && cats.length > 1 ? `<span class="tdel" data-del aria-label="${esc(c.name)}を削除">×</span>` : ''}
      ${selEditing ? `<span class="tools"><span data-move="-1" aria-label="前へ" ${i === 0 ? 'style="visibility:hidden"' : ''}>◀</span><span data-move="1" aria-label="後ろへ" ${i === cats.length - 1 ? 'style="visibility:hidden"' : ''}>▶</span></span>` : ''}
      ${tileArt(c)}
      <span class="label">${esc(c.name)}</span>
      ${c.sub ? `<span class="sub">${esc(c.sub)}</span>` : ''}
    </button>`).join('');
  $('#selEdit').textContent = selEditing ? '完了' : '編集';
  $('#selTitle').textContent = selEditing ? 'タップで編集・◀▶で並べ替え' : 'ジャンルを選ぶ';
  $('#selTitle').className = selEditing ? 'hint-on' : 'vh';
}
/* home background: the genres' own videos (default), your photos, or your video */
const BG_DEFAULT = {mode:'genre', photos:[], video:null, blur:4, dim:35};
let homeBg = {...BG_DEFAULT}, bgUrl = null;
function bgLayers(bg){
  if (bg.mode === 'photos' && bg.photos.length) return bg.photos.map(u => `<div class="layer"><img src="${u}" alt=""></div>`);
  if (bg.mode === 'video' && bg.video) {
    if (bgUrl && bgUrl.blob !== bg.video) { URL.revokeObjectURL(bgUrl.url); bgUrl = null; }
    if (!bgUrl) bgUrl = {blob:bg.video, url:URL.createObjectURL(bg.video)};
    return [`<div class="layer"><video src="${bgUrl.url}" autoplay muted loop playsinline preload="auto"></video></div>`];
  }
  return cats.map(c => c.bg ? `<div class="layer"><video src="${c.bg}" poster="${c.bgPoster || ''}" autoplay muted loop playsinline preload="auto"></video></div>`
    : (c.cover || c.tile) ? `<div class="layer"><img src="${c.cover || c.tile}" alt=""></div>` : '').filter(Boolean);
}
const bgFilter = (el, bg) => { el.style.setProperty('--bgblur', bg.blur + 'px'); el.style.setProperty('--bgbright', String(1 - bg.dim / 100)); };
function renderSelBg(){
  const box = $('#selBg');
  box.innerHTML = bgLayers(homeBg).join(''); bgFilter(box, homeBg);
  const els = [...box.children]; let i = 0;
  clearInterval(bgTimer);
  if (!els.length) return;
  els[0].classList.add('on');
  els.forEach(l => { const v = l.querySelector('video'); if (v) v.play().catch(() => {}); });
  if (els.length > 1) bgTimer = setInterval(() => { els[i].classList.remove('on'); i = (i + 1) % els.length; els[i].classList.add('on'); }, 4500);
}

let bgDraft = null;
const BG_MODES = [['genre', 'ジャンルの映像', '居酒屋・喫茶などが順番に流れる'], ['photos', '自分の写真', '好きな写真を何枚でも'], ['video', '自分の動画', '好きな動画を1本']];
function openBgSheet(){
  bgDraft = {...homeBg, photos:homeBg.photos.slice()};
  renderBgDraft(); show($('#bgSheet'));
}
function renderBgDraft(){
  const d = bgDraft;
  $('#bgMode').innerHTML = BG_MODES.map(([k, l, t]) => `<button type="button" class="tmpl" data-bgm="${k}" aria-pressed="${d.mode === k}"><b>${l}</b><span>${t}</span></button>`).join('');
  $('#bgPhotosWrap').hidden = d.mode !== 'photos'; $('#bgVideoWrap').hidden = d.mode !== 'video';
  $('#bgThumbs').innerHTML = d.photos.map((u, i) => `<div><img src="${u}" alt="背景の写真 ${i + 1}"><button type="button" data-bgdel="${i}" aria-label="外す">×</button></div>`).join('');
  $('#bgLib').disabled = $('#bgCam').disabled = d.photos.length >= 10;
  $('#bgVidInfo').textContent = d.video ? `動画を設定済み（${(d.video.size / 1048576).toFixed(1)}MB）。別の動画を選ぶと入れ替わります。` : '短め（30秒・50MBくらいまで）の動画がおすすめです。';
  $('#bgBlur').value = d.blur; $('#bgBlurOut').textContent = d.blur ? d.blur : 'なし';
  $('#bgDim').value = d.dim; $('#bgDimOut').textContent = d.dim + '%';
  const prev = $('#bgPrev'), first = bgLayers(d)[0] || '';
  prev.innerHTML = first.replace('class="layer"', 'class="pl" style="position:absolute;inset:0;filter:blur(var(--bgblur)) brightness(var(--bgbright))"') + '<div class="wm wordmark">Stash</div>';
  bgFilter(prev, d);
  const v = prev.querySelector('video'); if (v) v.play().catch(() => {});
}
$('#selBgBtn').addEventListener('click', openBgSheet);
$('#bgMode').addEventListener('click', e => { const b = e.target.closest('[data-bgm]'); if (!b) return; bgDraft.mode = b.dataset.bgm; renderBgDraft(); });
$('#bgThumbs').addEventListener('click', e => { const b = e.target.closest('[data-bgdel]'); if (!b) return; bgDraft.photos.splice(Number(b.dataset.bgdel), 1); renderBgDraft(); });
const bgAddPhotos = async files => {
  const room = 10 - bgDraft.photos.length; if (!files.length || room <= 0) return;
  toast('写真を読み込んでいます…');
  const out = await compressAll(files.slice(0, room), 1600);
  bgDraft.photos.push(...out); renderBgDraft();
  if (files.length > room) toast('写真は10枚までです');
};
$('#bgLib').addEventListener('click', () => pickPhotos({multiple:true}).then(bgAddPhotos));
$('#bgCam').addEventListener('click', () => pickPhotos({camera:true}).then(bgAddPhotos));
$('#bgVid').addEventListener('click', () => {
  const input = $('#pickVid');
  input.onchange = () => {
    const f = input.files && input.files[0]; input.value = ''; if (!f) return;
    if (f.size > 120 * 1048576) { toast('動画が大きすぎます（120MBまで）。短く切ってから選んでください'); return; }
    bgDraft.video = f; renderBgDraft();
  };
  input.click();
});
$('#bgBlur').addEventListener('input', () => { bgDraft.blur = Number($('#bgBlur').value); renderBgDraft(); });
$('#bgDim').addEventListener('input', () => { bgDraft.dim = Number($('#bgDim').value); renderBgDraft(); });
$('#bgReset').addEventListener('click', () => { bgDraft = {...BG_DEFAULT, photos:[]}; renderBgDraft(); });
$('#bgSave').addEventListener('click', async () => {
  const d = bgDraft;
  if (d.mode === 'photos' && !d.photos.length) { toast('写真を1枚以上選んでください'); return; }
  if (d.mode === 'video' && !d.video) { toast('動画を選んでください'); return; }
  // keep only what the chosen mode uses, so storage stays small
  const save = {mode:d.mode, blur:d.blur, dim:d.dim, photos:d.mode === 'photos' ? d.photos : [], video:d.mode === 'video' ? d.video : null};
  try { await setMeta('homeBg', save); } catch { toast('保存できませんでした。iPhoneの空き容量を確認してください'); return; }
  homeBg = save; hide($('#bgSheet')); renderSelBg(); toast('背景を変えました');
});

function goHome(){
  $('#app').hidden = true; openSheets.slice().forEach(hide);
  document.body.classList.add('dark-stage');
  selEditing = false; $('#select').classList.remove('going');
  $('#select').hidden = false; renderSelect(); renderSelBg();
}
$('#selEdit').addEventListener('click', () => { selEditing = !selEditing; renderSelect(); });
$('#selAdd').addEventListener('click', () => openCatSheet(null));
$('#catGrid').addEventListener('click', async e => {
  if (e.target.closest('[data-addcat]')) { openCatSheet(null); return; }
  const tile = e.target.closest('[data-cid]'); if (!tile) return;
  const i = cats.findIndex(c => c.id === tile.dataset.cid); if (i < 0) return;
  if (selEditing && e.target.closest('[data-del]')) { askDeleteCat(cats[i]); return; }
  const mv = e.target.closest('[data-move]');
  if (selEditing && mv) {
    const j = i + Number(mv.dataset.move); if (j < 0 || j >= cats.length) return;
    [cats[i], cats[j]] = [cats[j], cats[i]]; await saveCats(); renderSelect(); return;
  }
  if (selEditing) { openCatSheet(cats[i]); return; }
  if ($('#select').classList.contains('going')) return;
  tile.classList.add('picked'); $('#select').classList.add('going');
  setTimeout(() => { clearInterval(bgTimer); enterCat(cats[i].id); $('#select').classList.remove('going'); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
});

/* ---------- genre add / edit ---------- */
const DEFAULT_TAGS = {place:['ひとりで','みんなで','デート向け'], work:[], izakaya:['大衆店','高級店','デート向け'], kissa:['喫煙可','禁煙','賑やか','落ち着いている']};
const TMPL_CHOICES = [['place','お店・場所','観光地・温泉・サウナ・カフェなど。地図あり'],['work','作品・もの','映画・お酒・本など。地図なし'],['izakaya','居酒屋と同じ形','金額・人数・飲み放題・お品書き'],['kissa','喫茶と同じ形','店内・メニュー表・ショーケース']];
let catDraft = null, catEditing = null;
function openCatSheet(c){
  catEditing = c;
  catDraft = c ? {name:c.name, sub:c.sub || '', tmpl:c.tmpl, theme:c.theme, cover:c.cover || '', links:(c.links || defaultLinks(c)).slice(), streaming:!!c.streaming}
    : {name:'', sub:'', tmpl:'place', theme:'umi', cover:'', links:null, streaming:false};
  $('#linkCustom').hidden = true;
  $('#catSheetTitle').textContent = c ? 'ジャンルを編集' : 'ジャンルを追加';
  $('#catName').value = catDraft.name; $('#catSubIn').value = catDraft.sub; $('#catNameErr').hidden = true;
  $('#tmplWrap').hidden = !!c;
  $('#catDelWrap').hidden = !c || cats.length <= 1; $('#catDelHint').hidden = !c || cats.length <= 1;
  const del = $('#catDelete'); del.classList.remove('armed'); del.textContent = 'このジャンルを削除'; del.dataset.armed = '';
  renderCatDraft(); show($('#catSheet'));
}
function renderCatDraft(){
  $('#tmplPick').innerHTML = TMPL_CHOICES.map(([k, l, d]) => `<button type="button" class="tmpl" data-tm="${k}" aria-pressed="${catDraft.tmpl === k}"><b>${l}</b><span>${d}</span></button>`).join('');
  $('#themePick').innerHTML = Object.entries(THEMES).map(([k, t]) => `<button type="button" class="swatch" data-th="${k}" aria-pressed="${catDraft.theme === k}"><i style="background:linear-gradient(135deg,${t.swatch[0]} 50%,${t.swatch[1]} 50%)"></i>${t.name}</button>`).join('');
  const builtinTile = catEditing && catEditing.tile;
  const src = catDraft.cover || builtinTile || '';
  $('#catCoverPrev').hidden = !src; $('#catCoverHint').hidden = !!src; if (src) $('#catCoverPrev').src = src;
  $('#catCoverReset').hidden = !catDraft.cover;
  $('#catCoverReset').textContent = builtinTile ? '最初の表紙に戻す' : '表紙を外す';
  renderLinkList();
}
/* until the user touches the buttons of a new genre, follow its name and form */
const draftLinks = () => catDraft.links || defaultLinks({name:$('#catName').value, tmpl:catDraft.tmpl});
function renderLinkList(){
  const ls = draftLinks();
  $('#linkList').innerHTML = ls.length ? ls.map((l, i) => {
    const info = linkInfo(l); if (!info) return '';
    const where = info.special === 'ig' ? 'アプリで名前を検索' : info.special === 'tt' ? 'アプリで名前を検索' : info.url.replace(/^https?:\/\//, '').split('/')[0];
    return `<div class="lrow">${lbtnHTML(info)}<span class="lurl"><b style="color:var(--ink)">${esc(info.label)}</b> · ${esc(where)}</span>
      <button type="button" class="ctl" data-lmv="-1" data-i="${i}" aria-label="上へ" ${i === 0 ? 'style="visibility:hidden"' : ''}>▲</button>
      <button type="button" class="ctl" data-lmv="1" data-i="${i}" aria-label="下へ" ${i === ls.length - 1 ? 'style="visibility:hidden"' : ''}>▼</button>
      <button type="button" class="ctl" data-ldel data-i="${i}" aria-label="${esc(info.label)}を外す">×</button></div>`;
  }).join('') : '<p class="hint" style="margin:0">ボタンなし</p>';
  const work = catDraft.tmpl === 'work';
  $('#catStreamingWrap').hidden = !work;
  const st = catEditing ? catDraft.streaming : (catDraft.streamingSet ? catDraft.streaming : wantsStreaming({name:$('#catName').value, tmpl:catDraft.tmpl}));
  $('#catStreaming').checked = !!st;
  $('#catStreamingSub').textContent = tmdbReady() ? '映画・ドラマ・アニメ向け。いま見られるサービスのアイコンを表示' : '映画・ドラマ・アニメ向け。※作った人の設定（TMDB）が終わると表示されます';
}
$('#catName').addEventListener('input', () => { if (!catDraft.links || !catEditing) renderLinkList(); });
$('#catStreaming').addEventListener('change', () => { catDraft.streaming = $('#catStreaming').checked; catDraft.streamingSet = true; });
$('#linkList').addEventListener('click', e => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  const ls = draftLinks().slice(), i = Number(b.dataset.i);
  if (b.dataset.lmv) { const j = i + Number(b.dataset.lmv); if (j < 0 || j >= ls.length) return; [ls[i], ls[j]] = [ls[j], ls[i]]; }
  else if (b.hasAttribute('data-ldel')) ls.splice(i, 1);
  catDraft.links = ls; renderLinkList();
});
$('#linkAdd').addEventListener('click', () => {
  const ls = draftLinks();
  const acts = Object.entries(LINK_PRESETS).filter(([k]) => !ls.includes(k)).map(([k, p]) => ({label:p.label, fn:() => { catDraft.links = [...draftLinks(), k]; renderLinkList(); }}));
  acts.unshift({label:'＋ 自分で作る（ほかのサイト）', fn:() => {
    $('#lcName').value = ''; $('#lcUrl').value = ''; $('#lcColor').value = '#3A6EA5'; $('#lcErr').hidden = true;
    $('#linkCustom').hidden = false; $('#lcName').focus();
  }});
  actionSheet('追加するボタン', acts);
});
$('#lcCancel').addEventListener('click', () => { $('#linkCustom').hidden = true; });
$('#lcSave').addEventListener('click', () => {
  const label = cleanName($('#lcName').value), err = m => { $('#lcErr').textContent = m; $('#lcErr').hidden = false; };
  if (!label) { err('ボタンの名前を入れてください'); return; }
  const t = toTemplate($('#lcUrl').value);
  if (t.err) { err(t.err); return; }
  catDraft.links = [...draftLinks(), {label, url:t.url, color:$('#lcColor').value}];
  $('#linkCustom').hidden = true; renderLinkList(); toast(`「${label}」ボタンを追加しました`);
});
$('#tmplPick').addEventListener('click', e => { const b = e.target.closest('[data-tm]'); if (!b) return; catDraft.tmpl = b.dataset.tm; renderCatDraft(); });
$('#themePick').addEventListener('click', e => { const b = e.target.closest('[data-th]'); if (!b) return; catDraft.theme = b.dataset.th; renderCatDraft(); });
const catCover = async files => { const out = await compressAll(files.slice(0, 1), 900); if (out[0]) { catDraft.cover = out[0]; renderCatDraft(); } };
$('#catCam').addEventListener('click', () => pickPhotos({camera:true}).then(catCover));
$('#catLib').addEventListener('click', () => pickPhotos({}).then(catCover));
$('#catCoverReset').addEventListener('click', () => { catDraft.cover = ''; renderCatDraft(); });
$('#catSave').addEventListener('click', async () => {
  const name = cleanName($('#catName').value);
  if (!name) { $('#catNameErr').hidden = false; $('#catName').focus(); return; }
  const sub = cleanName($('#catSubIn').value);
  if (catEditing) {
    Object.assign(catEditing, {name, sub, theme:catDraft.theme, cover:catDraft.cover, links:draftLinks().slice(), streaming:catEditing.tmpl === 'work' && $('#catStreaming').checked});
    await saveCats(); hide($('#catSheet'));
    if (!$('#app').hidden && cur.id === catEditing.id) { enterCat(cur.id, view); hide($('#moreSheet')); }
    else { renderSelect(); renderSelBg(); }
    toast('保存しました');
  } else {
    const c = {id:newId('c'), name, sub, tmpl:catDraft.tmpl, theme:catDraft.theme, cover:catDraft.cover, tags:(DEFAULT_TAGS[catDraft.tmpl] || []).slice(), hero:null, links:draftLinks().slice(), streaming:catDraft.tmpl === 'work' && $('#catStreaming').checked};
    cats.push(c); await saveCats(); hide($('#catSheet'));
    renderSelect(); renderSelBg(); toast(`「${name}」を追加しました`);
  }
});
async function deleteCat(id){
  for (const r of records.filter(x => x.cat === id)) { try { await dbDel(r.id); } catch {} }
  records = records.filter(x => x.cat !== id);
  cats = cats.filter(c => c.id !== id); await saveCats();
}
function askDeleteCat(c){
  if (cats.length <= 1) { toast('ジャンルは1つ以上必要です'); return; }
  const n = records.filter(x => x.cat === c.id).length;
  actionSheet(`「${c.name}」を削除しますか？${n ? `\n記録${n}件も一緒に消えます（元に戻せません）` : ''}`, [
    {label:`「${c.name}」を削除する`, danger:true, fn:async () => { const keepEdit = selEditing; await deleteCat(c.id); toast('削除しました'); goHome(); selEditing = keepEdit && cats.length > 1; renderSelect(); }},
  ]);
}
$('#catDelete').addEventListener('click', async () => {
  const b = $('#catDelete'); if (!catEditing) return;
  if (!b.dataset.armed) { b.dataset.armed = '1'; b.classList.add('armed'); b.textContent = '記録も消えます。もう一度押すと削除'; setTimeout(() => { b.dataset.armed = ''; b.classList.remove('armed'); b.textContent = 'このジャンルを削除'; }, 3500); return; }
  await deleteCat(catEditing.id);
  hide($('#catSheet')); toast('削除しました'); goHome();
});

/* ---------- opening ---------- */
function runOpening(after){
  const op = $('#opening'), logo = $('#opLogo');
  const timers = []; let done = false;
  const finish = () => { if (done) return; done = true; timers.forEach(clearTimeout); op.classList.add('out'); setTimeout(() => op.remove(), 500); after(); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { logo.classList.add('write'); timers.push(setTimeout(finish, 900)); return; }
  op.addEventListener('click', finish);
  timers.push(setTimeout(() => logo.classList.add('write'), 150));
  timers.push(setTimeout(finish, 1650));
}

/* ---------- start ---------- */
(async () => {
  idb = await openDB('gurumemo', 1, r => {
    const d = r.result;
    if (!d.objectStoreNames.contains('records')) d.createObjectStore('records', {keyPath:'id'});
    if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
  });
  if (!idb) { memOnly = true; $('#storeWarn').hidden = false; }
  try {
    const saved = !memOnly && await getMeta('cats');
    cats = Array.isArray(saved) && saved.length ? saved : BUILTIN.map(c => ({...c, tags:c.tags.slice(), hero:null}));
    for (const c of cats) { const b = BUILTIN.find(x => x.id === c.id); if (b) Object.assign(c, {tile:b.tile, bg:b.bg, bgPoster:b.bgPoster, tmpl:b.tmpl, builtin:true}); if (!Array.isArray(c.links)) c.links = defaultLinks(c); }
    const col = !memOnly && await getMeta('colors'); if (col) colors = {...DEFAULT_COLORS, ...col};
    const hb = !memOnly && await getMeta('homeBg'); if (hb && hb.mode) homeBg = {...BG_DEFAULT, ...hb, photos:hb.photos || []};
  } catch {}
  let moved = 0; try { moved = await migrateOld(); } catch {}
  try { records = await dbAll(); } catch { records = []; }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
  if (moved) setTimeout(() => toast(`これまでの記録（${moved}件）を引き継ぎました`), 2200);

  const hash = location.hash;
  const share = hash.startsWith('#add=') ? parseShare(hash) : null;
  if (share || hash === '#select') history.replaceState(null, '', location.pathname);
  const startHome = () => { goHome(); if (share) openIncoming(share); };
  if (hash === '#select') { $('#opening').remove(); startHome(); }
  else runOpening(startHome);
})();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', {updateViaCache:'none'}).then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  });
}
