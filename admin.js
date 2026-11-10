// Halaman admin: PIN dulu, baru menu petugas / acak / edit jadwal / tes kirim.
// URL Web App ada di config.js (const API)
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let pin = '', daftar = [], asli = [], dirty = false;   // asli = nama saat dimuat/disimpan (untuk melacak perbaikan nama)
let imamSet = new Set();                                // nama petugas yang khusus jadi imam

const bulanIni = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
$('bulanAcak').value = bulanIni();

// urutan abjad A-Z (tidak peduli huruf besar/kecil)
const urutAbjad = (a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' });

// fetch dengan batas waktu, supaya tidak muter selamanya
async function fetchTimeout(url, opt, ms){
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms || 40000);
  try{
    return await fetch(url, Object.assign({signal: ctl.signal}, opt || {}));
  }catch(e){
    if(e.name === 'AbortError') throw new Error('Server terlalu lama merespons, coba lagi');
    throw new Error('Gagal terhubung ke server');
  }finally{ clearTimeout(t); }
}

async function api(body){
  const r = await fetchTimeout(API, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(Object.assign({pin}, body))});
  return r.json();
}
function setMsg(t, ok){ const m=$('admMsg'); m.textContent=t||''; m.className='msg'+(ok?' ok':''); }
function showStep(admin){
  $('stLogin').style.display = admin ? 'none' : 'grid';
  $('stAdmin').style.display = admin ? 'grid' : 'none';
}

// ---------- login ----------
async function login(){
  const b=$('btnLogin'); pin=$('pinIn').value.trim();
  if(!pin){ $('loginMsg').textContent='PIN wajib diisi'; return; }
  b.disabled=true; b.textContent='Memeriksa…';
  try{
    const r = await api({aksi:'daftar'});
    if(r.error){ pin=''; $('loginMsg').textContent=r.error; }
    else{
      daftar=r.petugas||[]; asli=daftar.slice(); imamSet=new Set(r.imamSaja||[]); dirty=false;
      renderDaftar(); setMsg(''); showStep(true);
    }
  }catch(e){ pin=''; $('loginMsg').textContent=e.message || 'Gagal terhubung ke server'; }
  b.disabled=false; b.textContent='Masuk';
}
$('btnLogin').onclick = login;
$('pinIn').onkeydown = e => { if(e.key==='Enter') login(); };
$('btnKeluar').onclick = () => { pin=''; daftar=[]; asli=[]; imamSet=new Set(); dirty=false; location.replace('index.html'); };

// ---------- petugas ----------
function renderDaftar(){
  $('jml').textContent = daftar.length;
  // urutkan hanya tampilan; i tetap indeks asli supaya edit/hapus/flag tidak tertukar
  const urut = daftar.map((n,i)=>i).sort((x,y)=>urutAbjad(daftar[x], daftar[y]));
  $('chips').innerHTML = daftar.length
    ? urut.map(i=>{
        const n = daftar[i];
        const im = imamSet.has(n);
        return `<span class="chip${im?' im':''}"><span class="nm" data-e="${i}" title="Klik untuk memperbaiki nama">${esc(n)}</span>${im?'<span class="bdg">Imam saja</span>':''}<button class="fl${im?' on':''}" data-f="${i}" aria-label="Khusus imam" title="${im?'Khusus imam (klik untuk batalkan)':'Jadikan khusus imam'}">🎤</button><button class="ed" data-e="${i}" aria-label="Ubah nama" title="Ubah nama">✎</button><button data-i="${i}" aria-label="Hapus">✕</button></span>`;
      }).join('')
    : '<span class="hint">Belum ada petugas</span>';
}
$('chips').onclick = e => {
  const t = e.target.dataset || {};
  if(t.i !== undefined){ imamSet.delete(daftar[+t.i]); daftar.splice(+t.i,1); asli.splice(+t.i,1); dirty=true; renderDaftar(); return; }
  if(t.f !== undefined){
    const n = daftar[+t.f];
    imamSet.has(n) ? imamSet.delete(n) : imamSet.add(n);
    dirty = true; renderDaftar();
    setMsg('Flag diubah. Klik "Simpan daftar petugas" agar tersimpan.', true);
    return;
  }
  if(t.e !== undefined){
    const i = +t.e;
    const baru = (prompt('Perbaiki nama petugas:', daftar[i]) || '').trim();
    if(!baru || baru === daftar[i]) return;
    if(daftar.some((x,k)=>k!==i && x.toLowerCase()===baru.toLowerCase())){ setMsg('Nama "'+baru+'" sudah ada di daftar'); return; }
    if(imamSet.has(daftar[i])){ imamSet.delete(daftar[i]); imamSet.add(baru); }
    daftar[i] = baru; dirty = true; renderDaftar();
    setMsg('Nama diubah. Klik "Simpan daftar petugas" agar tersimpan (nama di jadwal ikut diperbaiki).', true);
  }
};
function tambah(n){
  n = String(n||'').trim();
  if(n && !daftar.some(x=>x.toLowerCase()===n.toLowerCase())){ daftar.push(n); asli.push(''); dirty=true; return true; }
  return false;
}
$('btnTambah').onclick = () => { if(tambah($('namaBaru').value)){ $('namaBaru').value=''; renderDaftar(); } };
$('namaBaru').onkeydown = e => { if(e.key==='Enter') $('btnTambah').click(); };

function muatXlsx(){
  return window.XLSX ? Promise.resolve() : new Promise((ok,no)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=ok; s.onerror=no; document.head.appendChild(s);
  });
}
$('xl').onchange = async e => {
  const f=e.target.files[0]; if(!f) return;
  try{
    await muatXlsx();
    const wb = XLSX.read(await f.arrayBuffer(), {type:'array'});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1});
    let n=0; rows.slice(1).forEach(r=>{ if(tambah(r[0])) n++; });
    renderDaftar(); setMsg(n+' nama ditambahkan. Klik "Simpan daftar petugas".', true);
  }catch(err){ setMsg('Gagal membaca file Excel'); }
  e.target.value='';
};

async function simpan(){
  // pasangan nama lama -> nama baru (perbaikan typo), supaya jadwal yang sudah ada ikut diperbaiki
  const ganti = {};
  daftar.forEach((n,i) => { if(asli[i] && asli[i] !== n) ganti[asli[i]] = n; });
  const imamSaja = daftar.filter(n => imamSet.has(n));
  const r = await api({aksi:'petugas', data:daftar, ganti, imamSaja});
  if(r.error) throw new Error(r.error);
  asli = daftar.slice(); dirty = false; return r;
}
async function jalankan(btn, label, fn){
  btn.disabled=true; const t=btn.textContent; btn.textContent=label; setMsg('');
  try{ await fn(); }catch(e){ setMsg(e.message||'Gagal'); }
  btn.disabled=false; btn.textContent=t;
}

$('btnSimpan').onclick = () => jalankan($('btnSimpan'),'Menyimpan…', async () => {
  const r = await simpan();
  setMsg('Tersimpan ('+r.jumlah+' petugas, '+(r.imamSaja||0)+' khusus imam)' + (r.diganti ? '. Nama diperbaiki di '+r.diganti+' kolom jadwal.' : ''), true);
});

// ---------- acak & tes ----------
$('btnAcak').onclick = () => {
  const b = $('bulanAcak').value;
  if(!b){ setMsg('Pilih bulan dulu'); return; }
  if(!confirm('Acak ulang jadwal '+b+'? Jadwal yang sudah lewat tidak diubah, hari kerja yang kosong akan terisi.')) return;
  jalankan($('btnAcak'),'Mengacak…', async () => {
    if(dirty) await simpan();
    const r = await api({aksi:'acak', bulan:b});
    if(r.error) throw new Error(r.error);
    const lb = (r.libur||[]).map(t => t.slice(8)).join(', ');
    setMsg('Jadwal '+b+' diacak ('+r.jumlah+' slot terisi)' + (lb ? '. Dilewati karena terbaca libur (tgl): '+lb : ''), true);
  });
};
$('btnTes').onclick = () => jalankan($('btnTes'),'Mengirim…', async () => {
  const r = await api({aksi:'tes'});
  if(r.error) throw new Error(r.error);
  if(r.status===false) throw new Error('Ditolak: '+(r.reason||'gagal'));
  setMsg('Pesan tes terkirim ke grup dummy', true);
});

// ---------- edit manual jadwal ----------
let rowsEdit = [], bulanEdit = '';
const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const tglPendek = s => { const d = new Date(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10), 12); return HARI[d.getDay()]+', '+s.slice(8)+'/'+s.slice(5,7); };
function setMd(t, ok){ const m=$('mdMsg'); m.textContent=t||''; m.className='msg'+(ok?' ok':''); }

// Opsi nama dibuat sekali saja per nama (bukan per baris) supaya ringan; urut A-Z
const opsiCache = {};
function opsi(cur){
  const list = (!cur || daftar.includes(cur) ? daftar.slice() : daftar.concat(cur)).sort(urutAbjad);
  const key = list.join('\u0001');
  if(!opsiCache[key]) opsiCache[key] = list.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  return opsiCache[key];
}

async function ambilJadwalBulan(b){
  // Cara baru: lewat POST (pakai jalur yang sama dengan login). Kalau server lama, pakai GET.
  let r = await api({aksi:'lihatJadwal', bulan:b});
  if(r && r.error && /tidak dikenal/i.test(r.error)){
    const x = await fetchTimeout(API + '?bulan=' + encodeURIComponent(b));
    r = await x.json();
  }
  if(r && r.error) throw new Error(r.error);
  if(!Array.isArray(r)) throw new Error('Gagal memuat jadwal');
  return r;
}

$('btnEdit').onclick = () => jalankan($('btnEdit'),'Memuat…', async () => {
  const b = $('bulanAcak').value;
  if(!b) throw new Error('Pilih bulan dulu');
  if(dirty) await simpan();   // supaya pilihan nama memakai daftar terbaru
  const j = await ambilJadwalBulan(b);
  if(!j.length) throw new Error('Belum ada jadwal di '+b+'. Acak dulu.');
  bulanEdit = b; rowsEdit = j;
  $('mdBulan').textContent = '(' + b + ')';
  const sel = (k, i, cur) => `<select data-k="${k}" data-r="${i}" data-v="${esc(cur)}">${opsi(cur)}</select>`;
  $('mdBody').innerHTML = '<table><thead><tr><th>Tanggal</th><th>Salat</th><th>Imam</th><th>Muazin</th></tr></thead><tbody>' +
    rowsEdit.map((x,i)=>`<tr><td>${tglPendek(x.tanggal)}</td><td>${esc(x.salat)}</td><td>${sel('imam',i,x.imam)}</td><td>${sel('muazin',i,x.muazin)}</td></tr>`).join('') +
    '</tbody></table>';
  // pilih nilai awal tiap dropdown
  document.querySelectorAll('#mdBody select').forEach(s => { s.value = s.dataset.v; });
  setMd('');
  $('mdEdit').style.display = 'flex';
});
$('mdBatal').onclick = () => { $('mdEdit').style.display = 'none'; };
$('mdSimpan').onclick = async () => {
  const b = $('mdSimpan'); b.disabled = true; b.textContent = 'Menyimpan…'; setMd('');
  try{
    document.querySelectorAll('#mdBody select').forEach(s => { rowsEdit[+s.dataset.r][s.dataset.k] = s.value; });
    const r = await api({aksi:'simpanJadwal', bulan:bulanEdit, data:rowsEdit.map(x => ({tanggal:x.tanggal, salat:x.salat, imam:x.imam, muazin:x.muazin}))});
    if(r.error) throw new Error(r.error);
    $('mdEdit').style.display = 'none';
    setMsg('Jadwal '+bulanEdit+' disimpan ('+r.diubah+' slot diubah)' + (r.peringatan ? '. '+r.peringatan : ''), true);
  }catch(e){ setMd(e.message || 'Gagal'); }
  b.disabled = false; b.textContent = 'Simpan jadwal';
};
