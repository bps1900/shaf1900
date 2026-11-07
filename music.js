// Musik latar: lanjut terus di semua halaman (jadwal & admin), looping otomatis.
// File lagu: sound.mp3 (satu folder dengan index.html)
(function(){
  const SRC = 'sound.mp3';
  const KEY = 'musik_state';
  const a = new Audio(SRC);
  a.loop = true;          // selesai -> otomatis ulang
  a.preload = 'auto';

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ return {}; } };
  const save = () => {
    try{ localStorage.setItem(KEY, JSON.stringify({t: a.currentTime, at: Date.now(), on: !a.paused})); }catch(e){}
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
