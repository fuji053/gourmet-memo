/* Stash — カレンダー: 記録した日に印。タップでその日の記録を開く (今のジャンルだけ) */
'use strict';

let calY, calM, calSel = '';
const pad2 = n => String(n).padStart(2, '0');
function calByDay(){
  const m = new Map();
  for (const r of shownRecords('visit')) { if (!r.date) continue; if (!m.has(r.date)) m.set(r.date, []); m.get(r.date).push(r); }
  return m;
}
function renderCal(){
  const days = calByDay(), first = new Date(calY, calM, 1), n = new Date(calY, calM + 1, 0).getDate(), lead = first.getDay();
  const ym = `${calY}-${pad2(calM + 1)}`, td = today(), unit = T().unit || '件';
  $('#calTitle').textContent = `${cur.name}のカレンダー`;
  $('#calMonth').textContent = `${calY}年${calM + 1}月`;
  let html = ['日', '月', '火', '水', '木', '金', '土'].map((d, i) => `<div class="dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${d}</div>`).join('');
  html += '<div></div>'.repeat(lead);
  let monthCount = 0;
  for (let d = 1; d <= n; d++) {
    const key = `${ym}-${pad2(d)}`, list = days.get(key) || [];
    monthCount += list.length;
    const pic = list.find(r => r.photo && r.photo.startsWith('data:image'));
    html += `<button type="button" class="day${list.length ? ' has' : ''}${key === td ? ' today' : ''}${key === calSel ? ' sel' : ''}" data-day="${key}"${list.length ? '' : ' disabled'} aria-label="${calM + 1}月${d}日${list.length ? `・${list.length}${unit}` : ''}">${pic ? `<img src="${pic.photo}" alt="">` : ''}<span>${d}</span>${list.length > 1 ? `<i class="cnt">${list.length}</i>` : ''}</button>`;
  }
  $('#calGrid').innerHTML = html;
  const sel = calSel && calSel.startsWith(ym) ? (days.get(calSel) || []) : [];
  $('#calSum').textContent = sel.length ? `${Number(calSel.slice(5, 7))}月${Number(calSel.slice(8))}日：${sel.length}${unit}`
    : monthCount ? `${calM + 1}月は${monthCount}${unit}。日付をタップするとその日の記録が開きます` : `${calM + 1}月の記録はまだありません`;
  $('#calList').innerHTML = sel.length > 1 ? cardsHTML(sel) : '';
}
$('#calBtn').addEventListener('click', () => {
  const t = today(); calY = Number(t.slice(0, 4)); calM = Number(t.slice(5, 7)) - 1; calSel = '';
  renderCal(); show($('#calSheet'));
});
$('#calPrev').addEventListener('click', () => { calM--; if (calM < 0) { calM = 11; calY--; } calSel = ''; renderCal(); });
$('#calNext').addEventListener('click', () => { calM++; if (calM > 11) { calM = 0; calY++; } calSel = ''; renderCal(); });
$('#calGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-day]'); if (!b || b.disabled) return;
  const list = calByDay().get(b.dataset.day) || [];
  calSel = b.dataset.day; renderCal();
  if (list.length === 1) openDetail(list[0].id);   // 1件 → そのまま開く / 複数 → 下に並べる
});
$('#calList').addEventListener('click', e => { const tk = e.target.closest('.ticket'); if (tk) openDetail(tk.dataset.id); });

/* 記録を直したり消したりしたら、開いているカレンダーも書き直す */
{
  const base = renderAll;
  renderAll = function(){ base(); if (!$('#calSheet').hidden && calY != null) renderCal(); };
}
