const API = 'https://script.google.com/macros/s/AKfycbyTP2Nqci51c-DnKeGsW9qhTjr2CRr7rbJZzpuHiSh5p87-D_Tq-Fl3wtxuScYrgFje-A/exec';   // URL Web App (/exec)
const $ = id => document.getElementById(id);
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hariIni = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });  // yyyy-MM-dd

async function muat() {
  $('info').textContent = 'Memuat…';
  try {
    const rows = await (await fetch(`${API}?bulan=${$('bulan').value}`)).json();
    const per = {};
    rows.forEach(r => (per[r.tanggal] ??= {})[r.salat] = r);
    const sel = c => c ? `${esc(c.jam)}<br>Imam: ${esc(c.imam)}<br>Muazin: ${esc(c.muazin)}` : '-';
    const today = hariIni();
    $('tabel').innerHTML = '<tr><th>Tanggal</th><th>Zuhur</th><th>Ashar</th></tr>' +
      Object.keys(per).sort().map(t => {
        const d = new Date(t + 'T12:00:00');
        return `<tr class="${t === today ? 'hariini' : ''}"><td>${HARI[d.getDay()]}, ${t.slice(8)}/${t.slice(5, 7)}</td><td>${sel(per[t].Zuhur)}</td><td>${sel(per[t].Ashar)}</td></tr>`;
      }).join('');
    $('info').textContent = rows.length ? '' : 'Belum ada jadwal untuk bulan ini.';
  } catch (e) { $('info').textContent = 'Gagal memuat jadwal.'; }
}

async function kirim(body) {
  body.pin = $('pin').value;
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
  const j = await r.json();
  alert(j.error ? '❌ ' + j.error : '✅ ' + JSON.stringify(j));
  muat();
}

$('bulan').value = hariIni().slice(0, 7);
$('bulan').onchange = muat;
$('bukaAdmin').onclick = e => { e.preventDefault(); $('admin').hidden = !$('admin').hidden; };
$('btnAcak').onclick = () => confirm('Acak ulang jadwal bulan ini (mulai hari ini)?') && kirim({ aksi: 'acak', bulan: $('bulan').value });
$('btnTes').onclick = () => kirim({ aksi: 'tes' });
$('filePetugas').onchange = e => {
  const fr = new FileReader();
  fr.onload = ev => {
    const wb = XLSX.read(ev.target.result, { type: 'array' });
    const nama = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1).map(r => r[0]).filter(Boolean);
    kirim({ aksi: 'petugas', data: nama });
  };
  fr.readAsArrayBuffer(e.target.files[0]);
};
muat();
