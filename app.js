// Butuh config.js (const API) dimuat lebih dulu.
const $ = id => document.getElementById(id);
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hariIni = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });   // yyyy-MM-dd
const keDate = s => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), 12);
const tglPanjang = s => { const d = keDate(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };

let data = [];   // baris jadwal bulan terpilih

// ---------- Tampilan ----------
const slot = (c, nama, jumat) => c
  ? `<div class="slot"><div class="sh"><span class="sn">${nama}</span><span class="jam">${esc(c.jam || '-')}</span></div>
      <div class="row"><small>Imam</small><b>${esc(c.imam)}</b></div>
      <div class="row"><small>Muazin</small><b>${esc(c.muazin)}</b></div></div>`
  : `<div class="slot kosong"><div class="sh"><span class="sn">${nama}</span></div>
      <p>${jumat && nama === 'Zuhur' ? 'Salat Jumat' : 'Tidak ada jadwal'}</p></div>`;

function render() {
  const per = {};
  data.forEach(r => (per[r.tanggal] ??= {})[r.salat] = r);
  const semua = Object.keys(per).sort();
  const today = hariIni();
  const q = $('cari').value.trim().toLowerCase();

  $('pMendatang').textContent = `Mendatang: ${semua.filter(t => t >= today).length}`;
  $('pSelesai').textContent = `Selesai: ${semua.filter(t => t < today).length}`;
  $('pSemua').textContent = `Semua: ${semua.length}`;

  const tampil = semua.filter(t => !q || Object.values(per[t]).some(c => `${c.imam} ${c.muazin}`.toLowerCase().includes(q)));
  $('daftar').innerHTML = tampil.length
    ? tampil.map(t => {
        const d = keDate(t), jumat = d.getDay() === 5;
        const kelas = t === today ? 'sekarang' : t < today ? 'lewat' : '';
        return `<article class="day ${kelas}">
          <div class="date"><b>${d.getDate()}</b><span>${HARI[d.getDay()]}</span><span>${BULAN[d.getMonth()]}</span>${t === today ? '<em>Hari ini</em>' : ''}</div>
          ${slot(per[t].Zuhur, 'Zuhur', jumat)}${slot(per[t].Ashar, 'Ashar', false)}
        </article>`;
      }).join('')
    : `<div class="kosong-box">${data.length ? 'Tidak ada nama yang cocok.' : 'Belum ada jadwal untuk bulan ini.'}</div>`;

  renderHariIni(per, semua, today);
}

function renderHariIni(per, semua, today) {
  const el = $('hariIni');
  if (!today.startsWith($('bulan').value)) { el.hidden = true; return; }   // hanya saat melihat bulan berjalan
  el.hidden = false;
  const p = per[today];
  if (p) {
    el.innerHTML = `<h2>Petugas hari ini</h2><div class="tgl">${tglPanjang(today)}</div>
      <div class="grid">${slot(p.Zuhur, 'Zuhur', keDate(today).getDay() === 5)}${slot(p.Ashar, 'Ashar', false)}</div>`;
  } else {
    const next = semua.find(t => t > today);
    el.innerHTML = `<h2>Hari ini</h2><div class="tgl">${tglPanjang(today)}</div>
      <p class="kosong">Tidak ada jadwal hari ini (akhir pekan atau libur).${next ? ' Jadwal berikutnya: ' + tglPanjang(next) + '.' : ''}</p>`;
  }
}

async function muat() {
  if (!$('bulan').value) $('bulan').value = hariIni().slice(0, 7);
  $('hariIni').hidden = true;
  if (API.includes('GANTI')) { $('daftar').innerHTML = '<div class="kosong-box">URL API belum diisi di config.js</div>'; return; }
  $('daftar').innerHTML = '<div class="kosong-box">Memuat jadwal…</div>';
  try {
    const res = await fetch(`${API}?bulan=${$('bulan').value}`);
    data = await res.json();
    if (!Array.isArray(data)) throw new Error('format tidak dikenal');
    render();
  } catch (e) {
    data = [];
    $('daftar').innerHTML = '<div class="kosong-box">Gagal memuat jadwal. Coba muat ulang halaman.</div>';
  }
}

function geser(n) {
  const [y, m] = $('bulan').value.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  $('bulan').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  muat();
}

// ---------- Admin (klik logo BPS) ----------
const dlg = $('admin');
$('logo').onclick = () => dlg.showModal();
dlg.onclick = e => { if (e.target === dlg) dlg.close(); };

let timer;
function toast(msg, ok = true) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'show' + (ok ? '' : ' err');
  clearTimeout(timer);
  timer = setTimeout(() => t.className = '', 4000);
}

const ringkas = (aksi, j) =>
  aksi === 'petugas' ? `${j.jumlah} petugas tersimpan. Klik "Acak ulang" untuk membuat jadwal.`
  : aksi === 'acak' ? `Jadwal ${j.bulan} dibuat (${j.jumlah} slot).`
  : 'Pesan tes terkirim ke grup dummy.';

async function kirim(body, tombol) {
  body.pin = $('pin').value;
  if (!body.pin) return toast('Isi PIN dulu', false);
  if (tombol) tombol.disabled = true;
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.error) toast(j.error, false);
    else if (j.status === false) toast('Fonnte menolak: ' + (j.reason || 'cek token / grup'), false);
    else toast(ringkas(body.aksi, j));
    muat();
  } catch (e) {
    toast('Gagal terhubung ke server', false);
  } finally {
    if (tombol) tombol.disabled = false;
  }
}

$('btnAcak').onclick = e => confirm('Acak ulang jadwal bulan terpilih (mulai hari ini)?') && kirim({ aksi: 'acak', bulan: $('bulan').value }, e.target);
$('btnTes').onclick = e => kirim({ aksi: 'tes' }, e.target);
$('filePetugas').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = ev => {
    const wb = XLSX.read(ev.target.result, { type: 'array' });
    const nama = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1).map(r => r[0]).filter(Boolean);
    if (!nama.length) return toast('Tidak ada nama di kolom A', false);
    kirim({ aksi: 'petugas', data: nama });
  };
  fr.readAsArrayBuffer(file);
  e.target.value = '';
};

// ---------- Mulai ----------
$('bulan').value = hariIni().slice(0, 7);
$('bulan').onchange = muat;
$('prev').onclick = () => geser(-1);
$('next').onclick = () => geser(1);
$('cari').oninput = render;
muat();
