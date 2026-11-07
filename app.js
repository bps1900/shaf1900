// Halaman jadwal. URL Web App ada di config.js (const API)
const TZ = 'Asia/Jakarta';
const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const $ = id => document.getElementById(id);

const todayStr = () => new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const parse = s => new Date(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10), 12);
const indo = s => { const d = parse(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const keyBulan = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');

const TODAY = todayStr();
const cache = {};
let cur = [];
$('bulan').value = TODAY.slice(0,7);

async function getMonth(key){
  if(cache[key]) return cache[key];
  const r = await fetch(API + '?bulan=' + key);
  const j = await r.json();
  if(!Array.isArray(j)) throw new Error('bad');
  return cache[key] = j;
}

function group(rows){
  const m = {};
  rows.forEach(r => (m[r.tanggal] ||= []).push(r));
  return Object.keys(m).sort().map(t => ({tgl:t, items:m[t]}));
}
const urutSlot = items => ['Zuhur','Ashar'].map(n => items.find(i => i.salat === n)).filter(Boolean);

function slotHtml(it){
  return `<div class="sl"><div class="t"><small>${esc(it.salat)}</small>${esc(it.jam||'-')}</div><div class="im">${esc(it.imam)}</div><div class="mu">${esc(it.muazin)}</div></div>`;
}

// jadwal terdekat (hari ini kalau ada, kalau tidak berikutnya)
let nextP = null;
function cariNext(){
  return nextP ||= (async () => {
    try{
      const d = parse(TODAY);
      for(let k=0; k<3; k++){
        const key = keyBulan(new Date(d.getFullYear(), d.getMonth()+k, 1));
        const g = group(await getMonth(key)).find(g => g.tgl >= TODAY);
        if(g) return g;
      }
    }catch(e){}
    return null;
  })();
}

async function renderBanner(){
  const g = await cariNext();
  if(!g){ $('banner').innerHTML = '<small>JADWAL</small><h2>Belum ada jadwal</h2>'; return; }
  const label = g.tgl === TODAY ? 'JADWAL HARI INI' : 'JADWAL BERIKUTNYA';
  $('banner').innerHTML = `<small>${label}</small><h2>${indo(g.tgl)}</h2><div class="bn-slots">${urutSlot(g.items).map(slotHtml).join('')}</div>`;
}

// susun minggu (Senin-Jumat) untuk satu bulan
function susunMinggu(key){
  const y = +key.slice(0,4), m = +key.slice(5,7);
  const last = new Date(y, m, 0).getDate();
  const weeks = []; let wk = null;
  for(let t=1; t<=last; t++){
    const dow = new Date(y, m-1, t).getDay();
    if(dow === 0 || dow === 6) continue;
    if(dow === 1 || !wk){ wk = [null,null,null,null,null]; weeks.push(wk); }
    wk[dow-1] = key + '-' + String(t).padStart(2,'0');
  }
  return weeks;
}

async function render(){
  const key = $('bulan').value;
  const q = $('cari').value.trim().toLowerCase();
  const nx = await cariNext();
  const first = nx ? nx.tgl : null;
  const by = {};
  group(cur).forEach(g => by[g.tgl] = g.items);

  if(!cur.length){ $('list').innerHTML = '<div class="kosong">Belum ada jadwal bulan ini.</div>'; renderBanner(); return; }

  const weeks = susunMinggu(key);
  const shown = weeks;

  const cell = tgl => {
    if(!tgl) return '<div class="cell blank"></div>';
    const d = parse(tgl), items = by[tgl];
    if(!items) return `<div class="cell libur"><b>${d.getDate()}</b><span>Tidak ada jadwal</span></div>`;
    let cls = 'cell', tag = '';
    if(tgl < TODAY) cls += ' past';
    if(tgl === first){ cls += ' first'; tag = tgl === TODAY ? 'HARI INI' : 'BERIKUTNYA'; }
    if(q){ cls += items.some(i => (i.imam+' '+i.muazin).toLowerCase().includes(q)) ? ' hit' : ' dim'; }
    return `<div class="${cls}"><div class="ch"><b>${d.getDate()}</b><span class="d-desk">${BULAN[d.getMonth()].slice(0,3)}</span><span class="d-mob">${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}</span>${tag?`<span class="tag">${tag}</span>`:''}</div>${urutSlot(items).map(slotHtml).join('')}</div>`;
  };

  let html = '';
  html += '<div class="hd"><div>Senin</div><div>Selasa</div><div>Rabu</div><div>Kamis</div><div>Jumat</div></div>';
  shown.forEach(w => html += `<div class="wk">${w.map(cell).join('')}</div>`);
  $('list').innerHTML = html;

  renderBanner();
}

async function load(key){
  $('list').innerHTML = '<div class="kosong">Memuat…</div>';
  try{ cur = await getMonth(key); }
  catch(e){ cur = []; $('list').innerHTML = '<div class="kosong">Gagal memuat jadwal.</div>'; return; }
  render();
}

function geser(n){
  const [y,m] = $('bulan').value.split('-').map(Number);
  $('bulan').value = keyBulan(new Date(y, m-1+n, 1));
  load($('bulan').value);
}
$('bPrev').onclick = () => geser(-1);
$('bNext').onclick = () => geser(1);
$('bulan').onchange = () => $('bulan').value && load($('bulan').value);
$('cari').oninput = render;

load($('bulan').value);
