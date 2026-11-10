// Tombol kamera: unduh gambar jadwal SATU BULAN penuh (PNG, rasio mendekati A4 landscape, tanpa bingkai/margin)
// Memakai fungsi & data dari app.js (susunMinggu, cur, indo, esc, urutSlot, parse, BULAN, HARI, $)
(function(){
  const W = 2400;   // lebar gambar (px), cukup tajam untuk dicetak A3/A4

  const css = `
  .snap{flex:none;width:38px;height:38px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--navy);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
  .snap:hover{background:#eef3fd}
  .snap:disabled{opacity:.5;cursor:wait}
  .snap svg{width:20px;height:20px}
  #shotRoot{position:absolute;left:-10000px;top:0;width:${W}px;min-height:${Math.round(W/1.4142)}px;display:flex;flex-direction:column;background:#f3f7fb;font-family:'Poppins',system-ui,sans-serif;color:#0f172a;line-height:1.25}
  #shotRoot *{box-sizing:border-box;margin:0;padding:0}
  #shotRoot .s-top{background:linear-gradient(135deg,#0f3d8f,#2a7de1);color:#fff;padding:26px 40px;display:flex;align-items:center;justify-content:space-between}
  #shotRoot .s-top h1{font-size:54px;font-weight:800}
  #shotRoot .s-top h2{font-size:38px;font-weight:600;opacity:.95;margin-top:2px}
  #shotRoot .s-leg{display:flex;gap:28px;font-size:30px;font-weight:600}
  #shotRoot .s-leg i{display:inline-block;width:30px;height:30px;border-radius:8px;margin-right:10px;vertical-align:-4px}
  #shotRoot .s-body{flex:1;display:flex;flex-direction:column;gap:10px;padding:10px}
  #shotRoot .s-hd,#shotRoot .s-wk{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
  #shotRoot .s-wk{flex:1}
  #shotRoot .s-hd div{background:#d3e3f8;border-radius:12px;text-align:center;font-weight:700;font-size:30px;padding:8px 0;letter-spacing:.05em;text-transform:uppercase}
  #shotRoot .c{background:#fff;border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:8px;border:2px solid #e3e8f2}
  #shotRoot .c.blank{background:transparent;border-color:transparent}
  #shotRoot .c.off{background:#eceff5;color:#64748b;align-items:center;justify-content:center;text-align:center;font-size:26px;font-weight:600}
  #shotRoot .c.off b{font-size:52px;color:#64748b;line-height:1}
  #shotRoot .dh{display:flex;align-items:baseline;gap:10px}
  #shotRoot .dh b{font-size:54px;font-weight:800;color:#0f3d8f;line-height:1}
  #shotRoot .dh span{font-size:28px;font-weight:600;color:#64748b}
  #shotRoot .sl{display:flex;flex-direction:column;gap:5px}
  #shotRoot .tm{font-size:26px;font-weight:700;color:#16a34a}
  #shotRoot .tm small{font-size:24px;font-weight:600;color:#64748b;margin-right:8px}
  #shotRoot .im,#shotRoot .mu{border-radius:10px;padding:6px 12px;font-size:29px;font-weight:600}
  #shotRoot .im{background:#c6efd3}
  #shotRoot .mu{background:#ffddb3}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
  const btn = document.createElement('button');
  btn.className = 'snap'; btn.id = 'bShot'; btn.type = 'button';
  btn.title = 'Unduh gambar jadwal sebulan (untuk dicetak)'; btn.setAttribute('aria-label', 'Unduh gambar jadwal sebulan');
  btn.innerHTML = ICON;
  document.querySelector('.bar').appendChild(btn);

  function muatLib(){
    return window.html2canvas ? Promise.resolve() : new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = ok; s.onerror = () => no(new Error('Gagal memuat pustaka gambar'));
      document.head.appendChild(s);
    });
  }

  function bangun(key){
    const by = {};
    cur.forEach(r => (by[r.tanggal] ||= []).push(r));
    const y = +key.slice(0,4), m = +key.slice(5,7);
    const cell = tgl => {
      if(!tgl) return '<div class="c blank"></div>';
      const d = parse(tgl), items = by[tgl];
      if(!items) return `<div class="c off"><b>${d.getDate()}</b><span>Tidak ada jadwal</span></div>`;
      const slots = urutSlot(items).map(it =>
        `<div class="sl"><div class="tm"><small>${esc(it.salat)}</small>${esc(it.jam||'-')}</div><div class="im">${esc(it.imam)}</div><div class="mu">${esc(it.muazin)}</div></div>`).join('');
      return `<div class="c"><div class="dh"><b>${d.getDate()}</b><span>${BULAN[d.getMonth()].slice(0,3)}</span></div>${slots}</div>`;
    };
    const weeks = susunMinggu(key).map(w => `<div class="s-wk">${w.map(cell).join('')}</div>`).join('');
    return `<div class="s-top"><div><h1>Jadwal Petugas Mushola Asyakirin</h1><h2>${BULAN[m-1]} ${y}</h2></div>` +
      `<div class="s-leg"><span><i style="background:#4ade80"></i>Imam</span><span><i style="background:#fb923c"></i>Muazin</span></div></div>` +
      `<div class="s-body"><div class="s-hd"><div>Senin</div><div>Selasa</div><div>Rabu</div><div>Kamis</div><div>Jumat</div></div>${weeks}</div>`;
  }

  btn.onclick = async () => {
    const key = $('bulan').value;
    if(!key || !cur.length){ alert('Belum ada jadwal di bulan ini.'); return; }
    btn.disabled = true;
    let root;
    try{
      await muatLib();
      if(document.fonts && document.fonts.ready) await document.fonts.ready;
      root = document.createElement('div');
      root.id = 'shotRoot';
      root.innerHTML = bangun(key);
      document.body.appendChild(root);
      const canvas = await html2canvas(root, {
        scale: 1, backgroundColor: '#f3f7fb', useCORS: true,
        windowWidth: W, width: W, scrollX: 0, scrollY: 0,
        onclone: doc => { const r = doc.getElementById('shotRoot'); r.style.left = '0'; r.style.top = '0'; },
      });
      const a = document.createElement('a');
      a.download = 'jadwal-mushola-' + key + '.png';
      a.href = canvas.toDataURL('image/png');
      document.body.appendChild(a); a.click(); a.remove();
    }catch(e){
      alert(e.message || 'Gagal membuat gambar');
    }finally{
      if(root) root.remove();
      btn.disabled = false;
    }
  };
})();
