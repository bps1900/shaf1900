// Halaman admin: PIN dulu, baru menu petugas / acak / tes kirim.
// URL Web App ada di config.js (const API)
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let pin = '', daftar = [], dirty = false;

const bulanIni = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
$('bulanAcak').value = bulanIni();

async function api(body){
  const r = await fetch(API, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(Object.assign({pin}, body))});
  return r.json();
}
function setMsg(t, ok){ const m=$('admMsg'); m.textContent=t||''; m.className='msg'+(ok?' ok':''); }
function showStep(admin){
  $('stLogin').style.display = admin ? 'none' : 'grid';
  $('stAdmin').style.display = admin ? 'grid' : 'none';
  $('mt').textContent = admin ? 'Panel Admin' : 'Masuk Admin';
}

// ---------- login ----------
async function login(){
  const b=$('btnLogin'); pin=$('pinIn').value.trim();
  if(!pin){ $('loginMsg').textContent='PIN wajib diisi'; return; }
  b.disabled=true; b.textContent='Memeriksa…';
  try{
    const r = await api({aksi:'daftar'});
    if(r.error){ pin=''; $('loginMsg').textContent=r.error; }
    else{ daftar=r.petugas||[]; dirty=false; renderDaftar(); setMsg(''); showStep(true); }
  }catch(e){ pin=''; $('loginMsg').textContent='Gagal terhubung ke server'; }
  b.disabled=false; b.textContent='Masuk';
}
$('btnLogin').onclick = login;
$('pinIn').onkeydown = e => { if(e.key==='Enter') login(); };
$('btnKeluar').onclick = () => { pin=''; daftar=[]; dirty=false; $('pinIn').value=''; $('loginMsg').textContent=''; showStep(false); };

// ---------- petugas ----------
function renderDaftar(){
  $('jml').textContent = daftar.length;
  $('chips').innerHTML = daftar.length
    ? daftar.map((n,i)=>`<span class="chip">${esc(n)}<button data-i="${i}" aria-label="Hapus">✕</button></span>`).join('')
    : '<span class="hint">Belum ada petugas</span>';
}
$('chips').onclick = e => {
  const i = e.target.dataset && e.target.dataset.i; if(i===undefined) return;
  daftar.splice(+i,1); dirty=true; renderDaftar();
};
function tambah(n){
  n = String(n||'').trim();
  if(n && !daftar.some(x=>x.toLowerCase()===n.toLowerCase())){ daftar.push(n); dirty=true; return true; }
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
  const r = await api({aksi:'petugas', data:daftar});
  if(r.error) throw new Error(r.error);
  dirty=false; return r;
}
async function jalankan(btn, label, fn){
  btn.disabled=true; const t=btn.textContent; btn.textContent=label; setMsg('');
  try{ await fn(); }catch(e){ setMsg(e.message||'Gagal'); }
  btn.disabled=false; btn.textContent=t;
}

$('btnSimpan').onclick = () => jalankan($('btnSimpan'),'Menyimpan…', async () => {
  const r = await simpan(); setMsg('Tersimpan ('+r.jumlah+' petugas)', true);
});

// ---------- acak & tes ----------
$('btnAcak').onclick = () => {
  const b = $('bulanAcak').value;
  if(!b){ setMsg('Pilih bulan dulu'); return; }
  if(!confirm('Acak ulang jadwal '+b+'? Hari yang sudah lewat tidak berubah.')) return;
  jalankan($('btnAcak'),'Mengacak…', async () => {
    if(dirty) await simpan();
    const r = await api({aksi:'acak', bulan:b});
    if(r.error) throw new Error(r.error);
    setMsg('Jadwal '+b+' diacak ('+r.jumlah+' slot)', true);
  });
};
$('btnTes').onclick = () => jalankan($('btnTes'),'Mengirim…', async () => {
  const r = await api({aksi:'tes'});
  if(r.error) throw new Error(r.error);
  if(r.status===false) throw new Error('Ditolak: '+(r.reason||'gagal'));
  setMsg('Pesan tes terkirim ke grup dummy', true);
});
