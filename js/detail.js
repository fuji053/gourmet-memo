/* Stash — detail page, SNS, sharing */
'use strict';

function boardHTML(e){   // 居酒屋：お品書きの短冊
  const ds = (e.dishes || []).filter(d => d.name || d.photo); if (!ds.length) return '';
  const sorted = ds.slice().sort((a, b) => (b.rec ? 1 : 0) - (a.rec ? 1 : 0));
  const tilts = [-1.5, 1, -0.5, 1.5, -1, 0.5];
  return `<section class="oshinagaki" aria-label="お品書き"><h4>お品書き</h4><div class="tanzaku-row">${sorted.map((d, i) => `
    <div class="tanzaku" style="--tilt:${tilts[i % 6]}deg">${d.rec ? '<span class="tosusume">おすすめ</span>' : ''}
      ${d.photo ? `<img class="tph" src="${d.photo}" alt="${esc(d.name)}" data-full="${d.photo}">` : '<span style="height:8px"></span>'}
      <span class="tname">${esc(d.name || '一品')}</span></div>`).join('')}</div></section>`;
}
function showcaseHTML(e){   // 喫茶：食品サンプルのショーケース
  const ds = (e.dishes || []).filter(d => d.name || d.photo); if (!ds.length) return '';
  const sorted = ds.slice().sort((a, b) => (b.rec ? 1 : 0) - (a.rec ? 1 : 0));
  return `<section class="showcase" aria-label="おすすめ"><h4>おすすめ</h4><div class="shelf">${sorted.map(d => `
    <figure class="sample">${d.photo ? `<img src="${d.photo}" alt="${esc(d.name)}" data-full="${d.photo}">` : `<div class="noph">${esc((d.name || '一品').slice(0, 1))}</div>`}
      <figcaption>${esc(d.name || '一品')}</figcaption>${d.rec ? '<span class="pick">おすすめ</span>' : ''}</figure>`).join('')}</div></section>`;
}
function galleryHTML(e){   // 追加したジャンル：シンプルなカード
  const ds = (e.dishes || []).filter(d => d.name || d.photo);
  const sorted = ds.slice().sort((a, b) => (b.rec ? 1 : 0) - (a.rec ? 1 : 0));
  let html = '';
  if (sorted.length) html += `<section class="dsec gallery"><h4>${esc(T().itemsLabel)}</h4><div class="ggrid">${sorted.map(d => `
    <figure class="gcard">${d.photo ? `<img src="${d.photo}" alt="${esc(d.name)}" data-full="${d.photo}">` : `<div class="noph">${esc((d.name || '・').slice(0, 1))}</div>`}
      <figcaption>${esc(d.name || '')}</figcaption>${d.rec ? '<span class="pick">おすすめ</span>' : ''}</figure>`).join('')}</div></section>`;
  return html;
}
function photosHTML(title, arr, cls){
  if (!arr || !arr.length) return '';
  if (cls === 'menugrid') return `<section class="dsec"><h4>${esc(title)}</h4><div class="menugrid">${arr.map((u, i) => `<img src="${u}" alt="${esc(title)} ${i + 1}枚目" data-full="${u}">`).join('')}</div><p class="hint">タップで大きく表示</p></section>`;
  return `<section class="dsec"><h4>${esc(title)}</h4><div class="mgrid p ${arr.length <= 3 ? 'n' + arr.length : 'many'}">${arr.map((u, i) => `<img src="${u}" alt="${esc(title)} ${i + 1}枚目" data-full="${u}">`).join('')}</div></section>`;
}

function openDetail(id, refreshOnly){
  const e = shownRecords('visit').find(x => x.id === id); if (!e) return;
  const t = T();
  const realPhoto = e.photo && e.photo.startsWith('data:image/jpeg');
  const board = t.display === 'board' ? boardHTML(e) : t.display === 'showcase' ? showcaseHTML(e) : galleryHTML(e);
  $('#detailBody').innerHTML = `
    ${e.sample ? '<p class="note" style="margin-top:0">これは見本です。編集や削除はできません。</p>' : ''}
    <img class="dphoto" src="${e.photo || placeholder(cur.tmpl)}" alt="${esc(e.shop)}の写真" ${realPhoto ? `data-full="${e.photo}"` : ''}>
    ${realPhoto ? '<div class="photo-row"><button class="linkbtn" type="button" id="dSave">写真をiPhoneに保存</button></div>' : ''}
    <div class="dhead">
      <div class="dtitle"><h3 id="dTitle">${esc(e.shop)}</h3></div>
      ${linkRowHTML(cur, e.shop)}
      ${e.sub ? `<p>${esc(e.sub)}</p>` : ''}
      ${dishNames(e, true) ? `<p>おすすめ：${esc(dishNames(e, true))}</p>` : ''}
      <div class="drate">${starsHTML(e.rating || 0, 26)}<b>${(e.rating || 0).toFixed(1)}</b><span style="color:var(--muted);font-size:13px">${e.rating ? esc(word(e.rating)) : '未評価'}</span></div>
    </div>
    <div class="dbtns">
      ${t.shop ? `<a class="dbtn${e.lat != null ? '' : ' full'}" href="${mapUrl(e.shop, e.pref, e.place)}" target="_blank" rel="noopener">${PIN}Googleマップ</a>
      ${e.lat != null ? `<button class="dbtn" type="button" id="dInMap">${MAPI}アプリの地図</button>` : ''}` : ''}
    </div>
    ${hoursHTML(e)}
    <dl class="dl">
      ${t.price ? `<dt>1人あたり</dt><dd>${yen(e.price)}${e.total !== '' && e.total != null ? `<span style="color:var(--muted);font-size:13px">（合計 ${yen(e.total)}）</span>` : ''}</dd>
      <dt>人数</dt><dd>${e.people ? esc(e.people) + '人' : '—'}</dd>` : ''}
      <dt>${esc(t.date)}</dt><dd>${fmtDate(e.date) || '—'}</dd>
      ${t.where ? `<dt>どこで</dt><dd>${esc(e.where || '—')}</dd>` : ''}
      ${t.shop ? `<dt>エリア</dt><dd>${esc(e.pref || '—')}${e.place ? ' · ' + esc(e.place) : ''}</dd>` : ''}
      <dt>${esc(t.tags)}</dt><dd>${esc(tagsOf(e).join('・') || '—')}</dd>
      ${t.nomi ? `<dt>飲み放題</dt><dd>${e.nomi ? 'あり' : 'なし'}</dd>` : ''}
      ${t.resv ? `<dt>予約</dt><dd>${esc(e.resv || '—')}</dd>` : ''}
      <dt>${esc(t.again)}</dt><dd>${e.again ? `<span class="heart">♥</span> ${esc(t.again)}` : '—'}</dd>
      ${e.memo ? `<dt>備考</dt><dd class="memo">${esc(e.memo)}</dd>` : ''}
    </dl>
    ${streamHTML(e)}
    ${board}
    ${t.interior ? photosHTML('店内の雰囲気', e.interior, 'strip') + (e.mood ? `<p class="mood">${esc(e.mood)}</p>` : '') : ''}
    ${t.menus ? photosHTML('メニュー表', e.menus, 'menugrid') : ''}
    ${t.gallery ? photosHTML('写真', e.gallery, 'strip') : ''}
    ${t.video ? videosHTML(e.videos) : ''}
    ${e.sample ? '' : '<div class="dactions"><button class="btn danger" type="button" id="dDel">この記録を削除</button></div>'}`;
  const body = $('#detailBody');
  if (realPhoto) $('#dSave').onclick = () => saveImage(e.photo, `${e.shop}-${e.date || today()}.jpg`);
  bindLinkRow(body, cur, e.shop);
  bindVideos(body, e.videos);
  fillHours(body, e, () => renderAll());
  fillStream(body, e, () => openDetail(e.id, true));
  if (t.shop && e.lat != null) $('#dInMap').onclick = () => { hide($('#detailSheet')); setView('map'); focusOnMap(e); };
  $('#dEditTop').hidden = !!e.sample;
  $('#dEditTop').onclick = () => openEdit(e, {inline:true});
  if (!e.sample) {
    const b = $('#dDel'); let armed = false, tm;
    b.onclick = async () => {
      if (!armed) { armed = true; b.classList.add('armed'); b.textContent = 'もう一度押すと削除'; tm = setTimeout(() => { armed = false; b.classList.remove('armed'); b.textContent = 'この記録を削除'; }, 3000); return; }
      clearTimeout(tm);
      try { await dbDel(e.id); } catch { toast('削除できませんでした'); return; }
      records = records.filter(x => x.id !== e.id);
      hide($('#detailSheet')); renderAll(); toast('削除しました');
    };
  }
  if (!refreshOnly) show($('#detailSheet'));
}

async function saveImage(dataUrl, name){
  const file = dataURLtoFile(dataUrl, name.replace(/[\\/:*?"<>|]/g, ''));
  if (navigator.canShare && navigator.canShare({files:[file]})) {
    try { await navigator.share({files:[file]}); } catch (err) { if (!err || err.name !== 'AbortError') toast('保存できませんでした'); }
    return;
  }
  const a = document.createElement('a'); a.href = dataUrl; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
}

/* full-screen photo viewer */
document.addEventListener('click', e => {
  const im = e.target.closest('#detailBody [data-full]'); if (!im) return;
  $('#viewerVid').hidden = true; $('#viewerImg').hidden = false; $('#viewerImg').src = im.dataset.full; $('#viewer').hidden = false;
});
$('#viewer').addEventListener('click', e => { if (e.target.closest('#viewerVid')) return; closeViewer(); });

/* ---------- SNS: copy the name, then open the app on that name ---------- */
async function copyText(t){
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}
function openSNS(kind, name){
  const n = cleanName(name);
  copyText(n).then(ok => { if (ok) toast(`「${n}」をコピーしました。検索窓に貼り付けもできます`); });
  const tag = n.replace(/[\s　・･\-–—_.,，。、!！?？'’"“”()（）\[\]［］【】「」『』&＆/／:：#＃]/g, '');
  const go = (app, web) => {
    let left = false;
    const onHide = () => { left = true; };
    document.addEventListener('visibilitychange', onHide, {once:true});
    window.location.href = app;                                         // opens the installed app
    setTimeout(() => { document.removeEventListener('visibilitychange', onHide); if (!left && !document.hidden) window.location.href = web; }, 1400);  // not installed → web
  };
  if (kind === 'ig') go(`instagram://tag?name=${encodeURIComponent(tag)}`, `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`);
  else go(`snssdk1233://search?keyword=${encodeURIComponent(n)}`, `https://www.tiktok.com/search?q=${encodeURIComponent(n)}`);   // TikTok app, else the web
}

/* ---------- share: text for LINE etc. + a link that adds it to the friend's 行ってみたい ---------- */
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function shareCode(e){
  return b64u(JSON.stringify({v:1, c:cur.name, t:cur.tmpl, n:e.shop, s:e.sub || '', p:e.pref || '', l:e.place || '', la:e.lat ?? null, lo:e.lng ?? null, m:dishNames(e, true) || dishNames(e) || e.menu || '', r:e.rating || 0}));
}
const appBase = () => location.origin + location.pathname.replace(/[^/]*$/, '');
function shareText(e){
  const t = T(); const lines = [`【${cur.name}】${e.shop}`];
  if (e.rating) lines.push(`評価 ★${e.rating.toFixed(1)}（${word(e.rating)}）`);
  if (e.sub) lines.push(e.sub);
  if (t.shop && (e.pref || e.place)) lines.push(`場所：${[e.pref, e.place].filter(Boolean).join(' ')}`);
  const rec = dishNames(e, true) || dishNames(e); if (rec) lines.push(`おすすめ：${rec}`);
  if (t.shop) lines.push(`地図：${mapUrl(e.shop, e.pref, e.place)}`);
  lines.push('', `Stashの「行ってみたい」に追加：${appBase()}#add=${shareCode(e)}`);
  return lines.join('\n');
}
function shareRecord(e){
  const text = shareText(e);
  const acts = [
    {label:'メモを画像にして送る（LINEなど）', fn:() => shareAsImage(e, text)},
    {label:'LINEで文章だけ送る', fn:() => { window.location.href = 'https://line.me/R/share?text=' + encodeURIComponent(text); }},
    {label:'ほかのアプリで共有（写真付き）', fn:async () => {
      const data = {title:e.shop, text};
      const real = e.photo && e.photo.startsWith('data:image/jpeg');
      if (real) { const f = dataURLtoFile(e.photo, 'photo.jpg'); if (navigator.canShare && navigator.canShare({files:[f]})) data.files = [f]; }
      if (navigator.share) { try { await navigator.share(data); } catch (err) { if (err && err.name !== 'AbortError') toast('共有できませんでした'); } }
      else { if (await copyText(text)) toast('共有する文章をコピーしました'); }
    }},
    {label:'文章をコピー', fn:async () => { toast(await copyText(text) ? 'コピーしました' : 'コピーできませんでした'); }},
  ];
  actionSheet(`「${e.shop}」をシェア`, acts);
}

/* ---------- receiving a shared link (#add=…) or a pasted code ---------- */
let incoming = null;
function parseShare(code){
  try { const s = String(code).trim(); const m = s.match(/#add=([A-Za-z0-9_-]+)/); const d = JSON.parse(unb64u(m ? m[1] : s)); return d && d.n ? d : null; } catch { return null; }
}
function openIncoming(d){
  incoming = d;
  const tm = TEMPLATES[d.t] || TEMPLATES.place;
  $('#addCard').innerHTML = `<div class="sharecard"><div class="sc-b">
    <span class="eyebrow">${esc(d.c || '')}</span><h3>${esc(d.n)}</h3>
    ${d.s ? `<p style="margin:2px 0 0;color:var(--muted)">${esc(d.s)}</p>` : ''}
    ${d.r ? `<div class="drate">${starsHTML(d.r, 20)}<b style="font-size:16px">${Number(d.r).toFixed(1)}</b></div>` : ''}
    ${d.p || d.l ? `<p style="margin:8px 0 0">${PIN.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px;color:var(--yolk)"')} ${esc([d.p, d.l].filter(Boolean).join(' '))}</p>` : ''}
    ${d.m ? `<p style="margin:4px 0 0">おすすめ：${esc(d.m)}</p>` : ''}
    ${tm.shop ? `<div class="dbtns"><a class="dbtn full" href="${mapUrl(d.n, d.p, d.l)}" target="_blank" rel="noopener">${PIN}Googleマップで見る</a></div>` : ''}
  </div></div>`;
  const options = cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  $('#addCat').innerHTML = options;
  const match = cats.find(c => c.name === d.c) || cats.find(c => c.tmpl === d.t) || cats[0];
  if (match) $('#addCat').value = match.id;
  const inApp = isStandalone();
  $('#addCopyWrap').hidden = inApp;
  $('#addGo').textContent = inApp ? '「行ってみたい」に追加' : 'このブラウザのStashに追加';
  show($('#addSheet'));
}
$('#addGo').addEventListener('click', async () => {
  if (!incoming) return;
  const catId = $('#addCat').value; const c = cats.find(x => x.id === catId); if (!c) return;
  const w = {id:newId('w'), cat:c.id, list:'wish', shop:incoming.n, pref:incoming.p || '', place:incoming.l || '', lat:incoming.la ?? null, lng:incoming.lo ?? null,
    menu:incoming.m || '', memo: incoming.s ? incoming.s : '', createdAt:Date.now(), updatedAt:Date.now()};
  try { await dbPut(w); } catch { toast('追加できませんでした'); return; }
  records.push(w); hide($('#addSheet'));
  const tm = TEMPLATES[c.tmpl] || TEMPLATES.place;
  toast(`「${c.name}」の${tm.wish}に追加しました`);
  enterCat(c.id, 'wish');
});
$('#addCopy').addEventListener('click', async () => {
  if (!incoming) return;
  const code = b64u(JSON.stringify(incoming));
  toast(await copyText(code) ? '共有コードをコピーしました。Stashの設定に貼り付けてください' : 'コピーできませんでした');
});
$('#importCodeBtn').addEventListener('click', () => {
  const d = parseShare($('#importCode').value);
  if (!d) { toast('共有コードを読み取れませんでした'); return; }
  $('#importCode').value = ''; openIncoming(d);
});
