/* Stash — videos on records (飲食店・場所): stored as Blobs in IndexedDB, shown muted & looping, full screen with sound */
'use strict';

const VID_MAX_MB = 50, VID_MAX_N = 10;
const vidUrls = new WeakMap();
function vidUrl(blob){
  if (!(blob instanceof Blob)) return '';
  let u = vidUrls.get(blob); if (!u) { u = URL.createObjectURL(blob); vidUrls.set(blob, u); }
  return u;
}
/* first frame → small JPEG, used as poster / thumbnail */
function videoPoster(blob){
  return new Promise(res => {
    const v = document.createElement('video'); let done = false;
    const finish = out => { if (done) return; done = true; v.removeAttribute('src'); v.load(); res(out); };
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = vidUrl(blob);
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.2, (v.duration || 1) / 2); } catch { finish(''); } };
    v.onseeked = () => {
      try {
        const w = v.videoWidth || 360, h = v.videoHeight || 640, k = Math.min(1, 480 / Math.max(w, h));
        const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        finish(c.toDataURL('image/jpeg', .75));
      } catch { finish(''); }
    };
    v.onerror = () => finish('');
    setTimeout(() => finish(''), 6000);
  });
}
function pickVideos(camera){
  const input = camera ? $('#pickVidCam') : $('#pickVidLib');
  return new Promise(res => {
    const done = files => { input.onchange = input.oncancel = null; input.value = ''; res(files); };
    input.onchange = () => done([...(input.files || [])]);
    input.oncancel = () => done([]);
    input.click();
  });
}
async function addVideoFiles(files, arr){
  let skipped = 0;
  for (const f of files) {
    if (arr.length >= VID_MAX_N) { toast(`動画は${VID_MAX_N}本までです`); break; }
    if (f.size > VID_MAX_MB * 1048576) { skipped++; continue; }
    toast('動画を読み込んでいます…');
    arr.push({id:newId('v'), blob:f, type:f.type || 'video/mp4', poster:await videoPoster(f)});
  }
  if (skipped) toast(`${VID_MAX_MB}MBを超える動画（${skipped}本）は入れられませんでした。短く切ってから選んでください`);
}

/* ---------- record form ---------- */
function renderVideoShots(){
  $('#videoShots').innerHTML = (F.videos || []).map((v, i) => `<button type="button" class="shot" data-vi="${i}" aria-label="動画${i + 1}本目">${v.poster ? `<img src="${v.poster}" alt="">` : '<span class="ph-empty"></span>'}<span class="play">▶</span><span class="no">${i + 1}</span></button>`).join('');
}
$('#vidCam').addEventListener('click', () => pickVideos(true).then(async f => { await addVideoFiles(f, F.videos); renderVideoShots(); }));
$('#vidLib').addEventListener('click', () => pickVideos(false).then(async f => { await addVideoFiles(f, F.videos); renderVideoShots(); }));
$('#videoShots').addEventListener('click', e => {
  const b = e.target.closest('[data-vi]'); if (!b) return;
  const arr = F.videos, i = Number(b.dataset.vi);
  const acts = [{label:'再生する', fn:() => openViewerVideo(arr[i].blob)}];
  if (i > 0) acts.push({label:'← 前へ', fn:() => { [arr[i-1], arr[i]] = [arr[i], arr[i-1]]; renderVideoShots(); }});
  if (i < arr.length - 1) acts.push({label:'次へ →', fn:() => { [arr[i+1], arr[i]] = [arr[i], arr[i+1]]; renderVideoShots(); }});
  acts.push({label:'この動画を削除', danger:true, fn:() => { arr.splice(i, 1); renderVideoShots(); }});
  actionSheet(`動画 ${i + 1}本目`, acts);
});

/* ---------- detail page ---------- */
function videosHTML(list){
  const vs = (list || []).filter(v => v && v.blob instanceof Blob);
  if (!vs.length) return '';
  return `<section class="dsec"><h4>動画</h4><div class="mgrid v ${vs.length <= 3 ? 'n' + vs.length : 'many'}">${vs.map((v, i) => `<button type="button" data-vfull="${i}" aria-label="動画${i + 1}本目を大きく再生"><video src="${vidUrl(v.blob)}" ${v.poster ? `poster="${v.poster}"` : ''} muted loop playsinline autoplay preload="metadata"></video></button>`).join('')}</div><p class="hint">タップで大きく・音ありで再生</p></section>`;
}
function bindVideos(root, list){
  const vs = (list || []).filter(v => v && v.blob instanceof Blob);
  root.querySelectorAll('[data-vfull]').forEach(b => b.onclick = () => openViewerVideo(vs[Number(b.dataset.vfull)].blob));
  root.querySelectorAll('.mgrid.v video').forEach(v => v.play && v.play().catch(() => {}));
}

/* ---------- full screen viewer (photo or video) ---------- */
function openViewerVideo(blob){
  const v = $('#viewerVid');
  $('#viewerImg').hidden = true; v.hidden = false; v.muted = false; v.src = vidUrl(blob);
  $('#viewerHint').textContent = '✕で閉じる';
  $('#viewer').hidden = false; v.play().catch(() => {});
}
function closeViewer(){
  const v = $('#viewerVid'); v.pause(); v.removeAttribute('src'); v.load(); v.hidden = true;
  $('#viewerImg').hidden = false; $('#viewerImg').removeAttribute('src');
  $('#viewerHint').textContent = 'タップで閉じる';
  $('#viewer').hidden = true;
}

/* first video or best photo of a record, for the search grid */
function recMedia(r){
  const v = (r.videos || []).find(x => x && x.blob instanceof Blob);
  if (v) return {video:vidUrl(v.blob), poster:v.poster || ''};
  const real = u => typeof u === 'string' && u.startsWith('data:image');
  const pics = [r.photo, ...(r.gallery || []), ...(r.interior || []), ...(r.dishes || []).map(d => d.photo)].filter(real);
  return pics.length ? {img:pics[0]} : null;
}
