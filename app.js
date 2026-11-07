
// URL Web App ada di config.js (const API)
const TZ = 'Asia/Jakarta';
const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const $ = id => document.getElementById(id);

const todayStr = () => new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const parse = s => new Date(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10), 12);
const indo = s => { const d = parse(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let data = [], showPast = false;
const TODAY = todayStr();
$('bulan').value = TODAY.slice(0,7);

async function load(bulan){
  $('list').innerHTML = '<div class="kosong">Memuat…</div>';
  try{
    const r = await fetch(API + '?bulan=' + bulan);
    data = await r.json();
  }catch(e){ data = []; $('list').innerHTML = '<div class="kosong">Gagal memuat jadwal.</div>'; return; }
  showPast = false;
  render();
}

// kelompokkan per tanggal
function group(rows){
  const m = {};
  rows.forEach(r => (m[r.tanggal] ||= []).push(r));
  return Object.keys(m).sort().map(t => ({tgl:t, items:m[t]}));
}

function slotHtml(it){
  if(!it) return '<div class="slot empty"></div>';
  return `<div class="slot">
    <div class="head"><span class="nm">${esc(it.salat)}</span><span class="jam">${esc(it.jam||'-')}</span></div>
    <div class="p"><b>Imam:</b>${esc(it.imam)}</div>
    <div class="p"><b>Muazin:</b>${esc(it.muazin)}</div>
  </div>`;
}

function rowHtml(g, cls, tag){
  const d = parse(g.tgl);
  const zu = g.items.find(i => i.salat === 'Zuhur');
  const as = g.items.find(i => i.salat === 'Ashar');
  return `<div class="row ${cls}">
    <div class="date"><div class="tgl">${d.getDate()} ${BULAN[d.getMonth()]}</div><div class="hari">${HARI[d.getDay()]}</div>${tag?`<div class="tag">${tag}</div>`:''}</div>
    ${slotHtml(zu)}${slotHtml(as)}
  </div>`;
}

async function bannerHtml(){
  // cari jadwal hari ini / berikutnya (di bulan ini, lalu bulan depan bila perlu)
  let all = group(data);
  const hariIni = all.find(g => g.tgl === TODAY);
  let next = all.find(g => g.tgl > TODAY);
  if(!hariIni && !next && $('bulan').value.slice(0,7) === TODAY.slice(0,7)){
    const d = parse(TODAY); const nb = new Date(d.getFullYear(), d.getMonth()+1, 1);
    const key = nb.getFullYear()+'-'+String(nb.getMonth()+1).padStart(2,'0');
    try{ const r = await (await fetch(API+'?bulan='+key)).json(); const g = group(r)[0]; if(g) next = g; }catch(e){}
  }
  let p;
  if(hariIni) p = 'Jadwal hari ini ada di urutan paling atas.';
  else p = 'Tidak ada jadwal hari ini (akhir pekan/libur).' + (next ? ' Berikutnya: ' + indo(next.tgl) + '.' : '');
  return `<small>HARI INI</small><h2>${indo(TODAY)}</h2><p>${p}</p>`;
}

async function render(){
  const q = $('cari').value.trim().toLowerCase();
  let groups = group(data);
  if(q) groups = groups.filter(g => g.items.some(i => (i.imam+' '+i.muazin).toLowerCase().includes(q)));

  const past = groups.filter(g => g.tgl < TODAY);
  const upc = groups.filter(g => g.tgl >= TODAY);
  const hidePast = !showPast && upc.length > 0 && past.length > 0;

  let html = '';
  if(hidePast) html += `<button class="prev" id="btnPrev">⬆ Lihat jadwal sebelumnya (${past.length} hari)</button>`;
  else if(showPast && past.length) html += `<button class="prev" id="btnPrev">⬇ Sembunyikan jadwal sebelumnya</button>`;

  const shown = hidePast ? upc : groups;
  let firstDone = false;
  shown.forEach(g => {
    const isPast = g.tgl < TODAY;
    let cls = isPast ? 'past' : '', tag = '';
    if(!isPast && !firstDone){ cls = 'first'; firstDone = true; tag = g.tgl === TODAY ? 'HARI INI' : 'BERIKUTNYA'; }
    html += rowHtml(g, cls, tag);
  });
  if(!shown.length) html += '<div class="kosong">Belum ada jadwal.</div>';
  $('list').innerHTML = html;

  const b = $('btnPrev');
  if(b) b.onclick = () => { showPast = !showPast; render(); };
  $('banner').innerHTML = await bannerHtml();
}

function geser(n){
  const [y,m] = $('bulan').value.split('-').map(Number);
  const d = new Date(y, m-1+n, 1);
  $('bulan').value = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  
}
$('bPrev').onclick = () => geser(-1);
$('bNext').onclick = () => geser(1);
$('bulan').onchange = () => $('bulan').value && load($('bulan').value);
$('cari').oninput = render;

load($('bulan').value);
