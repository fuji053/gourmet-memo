/* グルメモ — core: helpers, genre templates, themes, storage, photos */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => ymd(new Date());
const yen = n => (n === '' || n == null) ? '—' : '¥' + Number(n).toLocaleString('ja-JP');
const fmtDate = s => { if (!s) return ''; const [y,m,d] = s.split('-'); return `${y}.${m}.${d}`; };
const prefShort = p => p ? p.replace(/(都|府|県)$/, '') : '';
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const cleanName = s => (s || '').trim().replace(/\s+/g, ' ');
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

const PREFS = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const STAR = '<path d="M12 2.6l2.85 6.05 6.65.82-4.9 4.58 1.28 6.58L12 17.35l-5.88 3.28 1.28-6.58-4.9-4.58 6.65-.82z" fill="currentColor"/>';
const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>';
const FLAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/></svg>';
const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const LIB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>';
const SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
const MAPI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>';
const IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>';
const TT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 3c.4 2.3 1.9 3.8 4.2 4v3.1a8 8 0 0 1-4.1-1.3v6.3a6 6 0 1 1-6-6c.3 0 .6 0 .9.1v3.2a2.9 2.9 0 1 0 2 2.7V3z"/></svg>';

/* ---------- genre templates (what a record holds and how it is shown) ---------- */
const TEMPLATES = {
  izakaya: { label:'居酒屋', desc:'', shop:true, items:true, price:true, resv:true, nomi:true, interior:false, menus:false, gallery:false, sub:false, where:false, display:'board',
    unit:'軒', fab:'来店記録', name:'店名', cover:'外観', itemsLabel:'頼んだもの・おすすめ', date:'来店日', visited:'行った店', wish:'行ってみたい', again:'また行きたい', tags:'種類', went:'行った！' },
  kissa:   { label:'喫茶', desc:'', shop:true, items:true, price:false, resv:false, nomi:false, interior:true, menus:true, gallery:false, sub:false, where:false, display:'showcase',
    unit:'軒', fab:'来店記録', name:'店名', cover:'外観', itemsLabel:'頼んだもの・おすすめ', date:'来店日', visited:'行った店', wish:'行ってみたい', again:'また行きたい', tags:'特徴', went:'行った！' },
  place:   { label:'お店・場所', desc:'観光地・温泉・サウナ・カフェなど。地図あり', shop:true, items:true, price:true, resv:false, nomi:false, interior:false, menus:false, gallery:true, sub:false, where:false, display:'gallery',
    unit:'件', fab:'記録する', name:'名前', cover:'メイン写真', itemsLabel:'よかったもの・おすすめ', date:'行った日', visited:'行った場所', wish:'行ってみたい', again:'また行きたい', tags:'種類', went:'行った！' },
  work:    { label:'作品・もの', desc:'映画・お酒・本など。地図なし', shop:false, items:false, price:false, resv:false, nomi:false, interior:false, menus:false, gallery:true, sub:true, where:true, display:'gallery',
    unit:'件', fab:'記録する', name:'タイトル・名前', cover:'メイン写真', itemsLabel:'', date:'日付', visited:'記録', wish:'気になる', again:'もう一度', tags:'種類', went:'記録する' },
};
const T = () => TEMPLATES[cur.tmpl] || TEMPLATES.place;

/* ---------- themes (light / dark per genre) ---------- */
const THEMES = {
  izakaya:{name:'提灯', font:'"Dela Gothic One","Hiragino Sans",sans-serif', dw:400, swatch:['#1A2030','#C8442B'],
    light:'#F2F3F6,#FFFFFF,#1A2030,#5F6577,#D8DBE4,#C8442B,#FBE3DC,#B03A2E,#1C2232,#FFB347,#D3D6DF,#E0A126',
    dark:'#10131B,#191D29,#ECEEF3,#9AA0B2,#2C3242,#E5603F,#3A221D,#E8705E,#0A0D14,#FFBE5C,#363C4D,#F0B440'},
  kissa:{name:'喫茶', font:'"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif', dw:800, swatch:['#2A1F19','#1E6B4F'],
    light:'#EEEBE5,#FBFAF7,#2A1F19,#6F625A,#DAD3C9,#1E6B4F,#DCEBE3,#A3312A,#2A1F19,#E6C27A,#D8D0C5,#C3922E',
    dark:'#14100D,#1E1814,#EFE7DC,#A79A8E,#352C25,#4DB088,#1B3029,#E06A5E,#0D0A08,#E9C784,#3E352E,#D9A845'},
  sumi:{name:'墨', font:'"Shippori Mincho B1","Hiragino Mincho ProN",serif', dw:800, swatch:['#161616','#C99A2E'],
    light:'#F1F0EC,#FFFFFF,#161616,#66625C,#DCD8D0,#A8781F,#F2E7CF,#B23A2C,#161616,#E8C268,#D6D2CA,#C99A2E',
    dark:'#0E0E0E,#191919,#EEEAE2,#9C978E,#2D2B28,#D9A94A,#2E2614,#E06A5E,#000000,#E8C268,#3A3733,#D9A94A'},
  mori:{name:'森', font:'"Zen Kaku Gothic New","Hiragino Sans",sans-serif', dw:700, swatch:['#1C2A20','#2F7D4A'],
    light:'#EEF2EC,#FFFFFF,#1C2A20,#5D6B60,#D3DDD4,#2F7D4A,#DCEEDF,#B03A2E,#1C2A20,#CDE7A0,#D2DBD3,#C9A227',
    dark:'#0F1511,#18211A,#E8EFE9,#93A496,#2A372D,#5FBF7F,#1A3022,#E8705E,#08100A,#CDE7A0,#33403A,#D9B640'},
  umi:{name:'海', font:'"Dela Gothic One","Hiragino Sans",sans-serif', dw:400, swatch:['#13243A','#1F6FB2'],
    light:'#EDF2F7,#FFFFFF,#13243A,#5A6B80,#D2DCE8,#1F6FB2,#DCEAF7,#B03A2E,#13243A,#8FD3FF,#D0D9E4,#E0A126',
    dark:'#0C1420,#142033,#E7EEF7,#8FA2BA,#26354B,#4FA3E8,#16304A,#E8705E,#070D16,#8FD3FF,#2E3D52,#F0B440'},
  sakura:{name:'桜', font:'"Shippori Mincho B1","Hiragino Mincho ProN",serif', dw:800, swatch:['#2E1A22','#C04A73'],
    light:'#F7EEF0,#FFFFFF,#2E1A22,#7A5E68,#EBD6DC,#C04A73,#F8DDE6,#B03A2E,#2E1A22,#FFB7CC,#E6D3D9,#D9A23A',
    dark:'#170D11,#22151B,#F4E6EB,#B395A0,#3A2730,#E57BA0,#3A1B27,#E8705E,#0D0609,#FFB7CC,#43303A,#E8B54A'},
  yoru:{name:'夜', font:'"Dela Gothic One","Hiragino Sans",sans-serif', dw:400, swatch:['#1E1A33','#6A3FD1'],
    light:'#F0EEF6,#FFFFFF,#1E1A33,#625D7A,#DAD6E8,#6A3FD1,#E6DEFA,#B03A2E,#1E1A33,#C9B6FF,#D8D4E6,#E0A126',
    dark:'#0F0D1A,#1A1729,#ECEAF5,#9C97B5,#2C2840,#9C7BFF,#2A2150,#E8705E,#08070F,#C9B6FF,#36324D,#F0B440'},
};
(function injectThemes(){
  const keys = ['--bg','--surface','--ink','--muted','--line','--yolk','--yolk-soft','--chili','--led-bg','--led','--star-off','--gold'];
  const block = (csv, barAlpha) => { const v = csv.split(','); const bg = v[0];
    const r = parseInt(bg.slice(1,3),16), g = parseInt(bg.slice(3,5),16), b = parseInt(bg.slice(5,7),16);
    return keys.map((k,i) => `${k}:${v[i]}`).join(';') + `;--bar:rgba(${r},${g},${b},${barAlpha})`; };
  let css = '';
  for (const [id, t] of Object.entries(THEMES)) {
    css += `[data-theme="${id}"]{${block(t.light,.94)};--f-display:${t.font};--dw:${t.dw}}\n`;
    css += `@media (prefers-color-scheme: dark){[data-theme="${id}"]{${block(t.dark,.94)}}}\n`;
  }
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

/* ---------- built-in genres ---------- */
const BUILTIN = [
  {id:'izakaya', name:'居酒屋', sub:'提灯の灯る夜に', tmpl:'izakaya', theme:'izakaya', tile:'media/izakaya.jpg', bg:'media/bg-izakaya.mp4', bgPoster:'media/bg-izakaya.jpg', tags:['大衆店','高級店','デート向け'], builtin:true},
  {id:'kissa', name:'喫茶', sub:'珈琲とひと休み', tmpl:'kissa', theme:'kissa', tile:'media/kissa.jpg', bg:'media/bg-kissa.mp4', bgPoster:'media/bg-kissa.jpg', tags:['喫煙可','禁煙','賑やか','落ち着いている'], builtin:true},
];
const DEFAULT_COLORS = {visit:'#4FC3F7', wish:'#9B5DE5', again:'#E53935'};

/* ---------- small UI helpers ---------- */
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2400); }
let openSheets = [];
function show(sheet){
  sheet.hidden = false; sheet.scrollTop = 0;
  openSheets = openSheets.filter(s => s !== sheet); openSheets.push(sheet);
  openSheets.forEach((s, i) => { s.style.zIndex = String(50 + i); });
  document.body.style.overflow = 'hidden';
}
function hide(sheet){ sheet.hidden = true; openSheets = openSheets.filter(s => s !== sheet); if (!openSheets.length) document.body.style.overflow = ''; }
document.addEventListener('click', e => { const b = e.target.closest('[data-close]'); if (b) hide(b.closest('.sheet')); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#act').hidden) closeAct(); else if (openSheets.length) hide(openSheets[openSheets.length - 1]); } });

/* action sheet: actions = [{label, fn, danger}] */
function actionSheet(title, actions){
  $('#actIn').innerHTML = (title ? `<h4>${esc(title)}</h4>` : '') + actions.map((a, i) => `<button type="button" data-i="${i}" class="${a.danger ? 'danger' : ''}">${esc(a.label)}</button>`).join('') + '<button type="button" class="cancel" data-i="-1">やめる</button>';
  $('#act').hidden = false;
  $('#actIn').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const i = Number(b.dataset.i); closeAct(); if (i >= 0) actions[i].fn(); };
}
function closeAct(){ $('#act').hidden = true; }
$('#act').addEventListener('click', e => { if (e.target.id === 'act') closeAct(); });

function starsHTML(v, size){
  const one = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${STAR}</svg>`;
  const five = one.repeat(5);
  return `<span class="stars" style="width:${size*5}px;height:${size}px"><span class="base">${five}</span><span class="fill" style="width:${(v/5)*100}%">${five}</span></span>`;
}
const word = v => v >= 5 ? '殿堂入り' : v >= 4.5 ? '最高' : v >= 4 ? 'また来たい' : v >= 3 ? 'よかった' : v >= 2 ? 'もう一歩' : v > 0 ? '合わなかった' : '星を左右になぞって評価';

/* placeholder art for records without a photo */
function placeholder(tmpl, hue = 40){
  const bg = `hsl(${hue},32%,86%)`;
  const art = {
    izakaya:`<path d='M60 4v12' stroke='#1A2030' stroke-width='2'/><rect x='48' y='14' width='24' height='9' rx='2' fill='#1A2030'/><ellipse cx='60' cy='60' rx='32' ry='38' fill='#C8442B'/><ellipse cx='50' cy='48' rx='8' ry='16' fill='rgba(255,255,255,.22)'/><rect x='48' y='96' width='24' height='9' rx='2' fill='#1A2030'/>`,
    kissa:`<ellipse cx='58' cy='86' rx='40' ry='9' fill='#FBFAF7' stroke='#2A1F19' stroke-width='2.5'/><path d='M30 50h52v14a24 24 0 0 1-24 24h-4a24 24 0 0 1-24-24z' fill='#FBFAF7' stroke='#2A1F19' stroke-width='3'/><path d='M82 56h4a9 9 0 0 1 0 18h-6' fill='none' stroke='#2A1F19' stroke-width='3'/><ellipse cx='56' cy='50' rx='26' ry='5' fill='#5A3A26'/><path d='M46 38c-4-5 4-8 0-13M58 38c-4-5 4-8 0-13M70 38c-4-5 4-8 0-13' fill='none' stroke='#1E6B4F' stroke-width='2.5' stroke-linecap='round'/>`,
    place:`<path d='M60 100s-26-24-26-46a26 26 0 0 1 52 0c0 22-26 46-26 46z' fill='#1F6FB2'/><circle cx='60' cy='54' r='10' fill='#fff'/>`,
    work:`<rect x='28' y='26' width='64' height='68' rx='6' fill='#1E1A33'/><rect x='36' y='34' width='48' height='34' rx='3' fill='#9C7BFF'/><path d='M36 78h48M36 86h30' stroke='#fff' stroke-width='4' stroke-linecap='round'/>`,
  }[tmpl] || '';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='${bg}'/>${art}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ---------- storage (IndexedDB; memory fallback) ---------- */
let idb = null, memOnly = false;
const mem = {records:new Map(), meta:new Map()};
function openDB(name, version, upgrade){
  return new Promise(res => {
    try {
      const r = indexedDB.open(name, version);
      r.onupgradeneeded = e => upgrade(r, e);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    } catch { res(null); }
  });
}
function tx(db, store, mode, fn){
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode); const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
}
const dbAll = async () => memOnly ? [...mem.records.values()] : ((await tx(idb,'records','readonly', s => s.getAll())) || []);
const dbPut = async o => { if (memOnly) { mem.records.set(o.id, o); return; } await tx(idb,'records','readwrite', s => s.put(o)); };
const dbDel = async id => { if (memOnly) { mem.records.delete(id); return; } await tx(idb,'records','readwrite', s => s.delete(id)); };
const getMeta = async k => memOnly ? mem.meta.get(k) : tx(idb,'meta','readonly', s => s.get(k));
const setMeta = async (k, v) => { if (memOnly) { mem.meta.set(k, v); return; } await tx(idb,'meta','readwrite', s => s.put(v, k)); };

/* Move records from the earlier separate 居酒屋 / 喫茶 pages (one-time). */
async function migrateOld(){
  if (memOnly || (await getMeta('migrated'))) return 0;
  let n = 0;
  for (const [dbName, catId] of [['gourmet-izakaya','izakaya'],['gourmet-kissa','kissa']]) {
    const old = await openDB(dbName, 1, r => { try { r.transaction.abort(); } catch {} });   // never create an empty one
    if (!old) continue;
    try {
      const names = [...old.objectStoreNames];
      if (names.includes('bowls')) for (const e of (await tx(old,'bowls','readonly', s => s.getAll())) || []) {
        await dbPut({...e, cat:catId, list:'visit', tags: Array.isArray(e.tags) ? e.tags : (e.soup ? [e.soup] : [])}); n++;
      }
      if (names.includes('wish')) for (const w of (await tx(old,'wish','readonly', s => s.getAll())) || []) {
        await dbPut({...w, cat:catId, list:'wish'}); n++;
      }
      if (names.includes('meta')) {
        const types = await tx(old,'meta','readonly', s => s.get('types'));
        const hero = await tx(old,'meta','readonly', s => s.get('hero'));
        const c = cats.find(x => x.id === catId);
        if (c && Array.isArray(types)) c.tags = types;
        if (c && hero && hero.photo) c.hero = hero;
      }
    } catch {}
    old.close();
  }
  await saveCats(); await setMeta('migrated', true);
  return n;
}

/* ---------- photos ---------- */
async function compress(file, max = 1280){
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w*s); c.height = Math.round(h*s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', .82);
  } finally { URL.revokeObjectURL(url); }
}
/* shooting date from JPEG EXIF (DateTimeOriginal) */
async function exifDate(file){
  try {
    const v = new DataView(await file.slice(0, 262144).arrayBuffer());
    if (v.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while (off + 10 < v.byteLength) {
      const marker = v.getUint16(off), len = v.getUint16(off + 2);
      if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) {
        const t = off + 10, le = v.getUint16(t) === 0x4949;
        const u16 = o => v.getUint16(t + o, le), u32 = o => v.getUint32(t + o, le);
        const str = (o, n) => { let s = ''; for (let i = 0; i < n; i++) { const c = v.getUint8(t + o + i); if (!c) break; s += String.fromCharCode(c); } return s; };
        const find = (ifd, tag) => { const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === tag) return e; } return -1; };
        const ifd0 = u32(4); let raw = null;
        const ptr = find(ifd0, 0x8769);
        if (ptr >= 0) { const e = find(u32(ptr + 8), 0x9003); if (e >= 0) raw = str(u32(e + 8), 19); }
        if (!raw) { const e = find(ifd0, 0x0132); if (e >= 0) raw = str(u32(e + 8), 19); }
        const m = raw && raw.match(/^(\d{4}):(\d{2}):(\d{2})/);
        return m && m[1] !== '0000' ? `${m[1]}-${m[2]}-${m[3]}` : null;
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      off += 2 + len;
    }
  } catch {}
  return null;
}
/* Open the camera or the photo library. Must be called inside a tap. Resolves with File[] (empty if cancelled). */
function pickPhotos({camera = false, multiple = false} = {}){
  const input = camera ? $('#pickCam') : (multiple ? $('#pickLibMulti') : $('#pickLib'));
  return new Promise(res => {
    const done = files => { input.onchange = input.oncancel = null; input.value = ''; res(files); };
    input.onchange = () => done([...(input.files || [])]);
    input.oncancel = () => done([]);
    input.click();
  });
}
/* Compress several files one after another (keeps memory low on iPhone). */
async function compressAll(files, max, onEach){
  const out = [];
  for (const f of files) { try { const d = await compress(f, max); out.push(d); onEach && onEach(d, f); } catch {} }
  if (out.length < files.length) toast(`${files.length - out.length}枚は読み込めませんでした`);
  return out;
}
function dataURLtoFile(url, name){
  const [head, b64] = url.split(','); const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new File([u8], name, {type: head.match(/:(.*?);/)[1]});
}

/* ---------- shared state ---------- */
let cats = [];            // genres (order = display order)
let colors = {...DEFAULT_COLORS};
let records = [];         // every record of every genre
let cur = BUILTIN[0];     // current genre
async function saveCats(){ try { await setMeta('cats', cats); } catch { toast('保存できませんでした'); } }
const catRecords = (list) => records.filter(r => r.cat === cur.id && r.list === list);
const mapUrl = (name, pref, place) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([name, pref, place].filter(Boolean).join(' '));
const areaText = e => [prefShort(e.pref), e.place].filter(Boolean).join(' · ');
const tagsOf = e => Array.isArray(e.tags) ? e.tags : (e.soup ? [e.soup] : []);
const dishNames = (e, recOnly) => (e.dishes || []).filter(d => d.name && (!recOnly || d.rec)).map(d => d.name).join('、');
const perPerson = (total, people) => total === '' || total == null ? '' : Math.round(Number(total) / (Number(people) || 1));
