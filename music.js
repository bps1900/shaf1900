// Musik latar: lanjut terus di semua halaman (jadwal & admin), looping otomatis.
// File lagu: sound.mp3 (satu folder dengan index.html)
(function(){
  const SRC = 'sound.mp3';
  const KEY = 'musik_state';
  const a = new Audio(SRC);
  a.loop = true;          // selesai -> otomatis ulang
  a.preload = 'auto';

  // sessionStorage: hanya berlaku di tab ini. Tab baru / buka ulang = mulai dari awal.
  // Kunjungan baru (ketik alamat, bookmark, link dari luar situs) juga direset.
  // Pindah halaman di dalam situs (jadwal <-> admin) atau reload tetap lanjut.
  try{
    const nav = performance.getEntriesByType('navigation')[0];
    const tipe = nav ? nav.type : 'navigate';
    let dalamSitus = false;
    try{ dalamSitus = !!document.referrer && new URL(document.referrer).origin === location.origin; }catch(e){}
    if(tipe === 'reload' || (tipe === 'navigate' && !dalamSitus)) sessionStorage.removeItem(KEY);
  }catch(e){}

  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch(e){ return {}; } };
  const save = () => {
    try{ sessionStorage.setItem(KEY, JSON.stringify({t: a.currentTime, at: Date.now(), on: !a.paused})); }catch(e){}
  };

  // lanjutkan dari posisi terakhir (ditambah selisih waktu saat pindah halaman)
  let siap = false;
  a.addEventListener('loadedmetadata', () => {
    const s = load();
    if(typeof s.t === 'number' && a.duration){
      const lompat = s.on ? Math.max(0, (Date.now() - s.at) / 1000) : 0;
      try{ a.currentTime = (s.t + lompat) % a.duration; }catch(e){}
    }
    siap = true;
    coba();
  });

  function coba(){
    if(!siap || !a.paused) return;
    a.play().then(() => { off(); }).catch(() => { /* diblokir browser, tunggu interaksi */ });
  }

  // browser memblokir suara otomatis sebelum ada interaksi -> mulai di interaksi pertama
  const ev = ['pointerdown','click','touchstart','touchend','keydown','wheel','scroll','mousemove'];
  const on = () => ev.forEach(e => window.addEventListener(e, coba, {passive:true}));
  const off = () => ev.forEach(e => window.removeEventListener(e, coba));
  on();

  setInterval(() => { if(!a.paused) save(); }, 500);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if(document.hidden) save(); else coba(); });
  a.load();
})();
