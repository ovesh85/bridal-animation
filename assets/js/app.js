/* Naqsh Bridal Couture: app.js
   Edit LOOKS and CHAPTERS below. FILM is written by the build script. */
(() => {
'use strict';
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const MOBILE = matchMedia('(max-width: 760px)').matches;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const conn = navigator.connection || {};
const LOWRES = !!(conn.saveData || /(^|-)2g/.test(conn.effectiveType || ''));

/* ---------- film data (frame counts filled by build) ---------- */
const FILM = { count: 445, legs: [0,58,115,172,211,331,388] };   // legs = first frame of each of the 7 legs
const CHAPTERS = [
  { leg: 0, t: 'It begins as chalk.', p: 'Our naqqash pounces the design through a pierced paper khaka. A line of white dust is all that marks where the gold will go.' },
  { leg: 1, t: 'Then, the gold.', p: 'Dabka coils, salma wire, sitara and kundan, couched one by one with an aari needle. One panel holds about 1,20,000 stitches.' },
  { leg: 3, t: 'Cut once, and only once.', p: 'The master cutter divides the panel into six kalis so the lotus meets itself at every seam.' },
  { leg: 4, t: 'Sewn to her measure.', p: 'The kalis are joined into a full flare and hand-finished on the inside, so nothing scratches on the day.' },
  { leg: 5, t: 'It takes her shape.', p: 'On the form the lehenga gets its can-can, its latkans and the gold border of its dupatta.' },
  { leg: 6, t: 'And it waits for her.', p: 'Every piece rests in our haveli until the bride comes in for her first trial.' }
];
const LOOKS = [
  { id: 'gulnaar', name: 'Gulnaar', dev: 'गुलनार', occ: 'wedding', occL: 'Wedding', img: 'p1', hours: 640, price: 480000, fabric: 'Crimson raw silk', tech: 'Dabka, salma, sitara, kundan', weeks: 14,
    desc: 'Our signature bridal red. A full lotus medallion on every kali, a nine-inch scalloped border and a net dupatta finished in sitara.' },
  { id: 'shabnam', name: 'Shabnam', dev: 'शबनम', occ: 'reception', occL: 'Reception', img: 'p2', hours: 410, price: 320000, fabric: 'Blush organza', tech: 'Dabka, moti, sitara', weeks: 12,
    desc: 'Dew-light for the reception. Fine dabka vines with seed pearls, and silver-gold sitara scattered like stars.' },
  { id: 'zumurrud', name: 'Zumurrud', dev: 'ज़ुमुर्रद', occ: 'sangeet', occL: 'Sangeet', img: 'p3', hours: 520, price: 390000, fabric: 'Emerald silk velvet', tech: 'Dabka, salma, kundan', weeks: 13,
    desc: 'Made to move. Chinar leaves and paisleys in antique gold on a velvet that holds its flare through every dance.' },
  { id: 'noor', name: 'Noor', dev: 'नूर', occ: 'day', occL: 'Day wedding', img: 'p4', hours: 580, price: 440000, fabric: 'Ivory tissue silk', tech: 'Dabka, salma, moti', weeks: 14,
    desc: 'For a wedding in the sun. A gold jaal grid with lotus buttis and pearl latkans that sway as you walk.' }
];
const MAX_HOURS = 640, STITCHES = 120000;
const P0 = 0.05, P1 = 0.94;           // intro hold before, showroom hold after
const inr = n => '₹' + n.toLocaleString('en-IN');

/* ---------- toast ---------- */
const toastEl = $('#toast'); let toastT;
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600); }

/* ---------- smooth scroll ---------- */
let lenis = null;
if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
if (!REDUCED && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
  if (window.gsap) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  }
  lenis.stop();
}
function scrollToY(y) { lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' }); }
function scrollToEl(el) { if (!el) return; scrollToY(el.getBoundingClientRect().top + scrollY - (el.id === 'making' ? 0 : 70)); }
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); const el = id === '#top' ? document.body : $(id);
  if (!el) return; e.preventDefault(); closeMenu();
  id === '#top' ? scrollToY(0) : scrollToEl(el);
});

/* ---------- mobile menu ---------- */
const menuBtn = $('#menuBtn'), mnav = $('#mnav');
function closeMenu() { mnav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => { const o = !mnav.classList.contains('is-open'); mnav.classList.toggle('is-open', o); menuBtn.setAttribute('aria-expanded', String(o)); });

/* =========================================================
   SeqFilm: image-sequence film on canvas
   fetch -> Blob -> createImageBitmap (off main thread),
   sliding bitmap window, file:// falls back to <img>.
   ========================================================= */
class SeqFilm {
  constructor(canvas, n, base) {
    this.c = canvas; this.x = canvas.getContext('2d', { alpha: false }); this.n = n; this.base = base;
    this.blob = new Array(n); this.bmp = new Array(n); this.st = new Uint8Array(n); // 0 none,1 loading,2 have data
    this.useFetch = location.protocol !== 'file:' && 'createImageBitmap' in window && !/[?&]nobmp/.test(location.search);
    this.ahead = MOBILE ? 14 : 16; this.behind = 6; this.dir = 1; this.play = 0; this.drawn = -1; this.inflight = 0;
    this.max = 8; this.order = this.coarse(); this.oi = 0; this.firstPass = this.order.slice(0, Math.ceil(n / 16) + 1);
    this.onProgress = null; this.decoding = new Set();
    this.resize(); addEventListener('resize', () => { this.resize(); this.drawn = -1; this.draw(Math.round(this.play)); });
  }
  url(i) { return `${this.base}/f${String(i + 1).padStart(4, '0')}.webp`; }
  coarse() {
    const seen = new Uint8Array(this.n), out = [];
    for (const s of [16, 8, 4, 2, 1]) for (let i = 0; i < this.n; i += s) if (!seen[i]) { seen[i] = 1; out.push(i); }
    if (!seen[this.n - 1]) out.splice(1, 0, this.n - 1);
    return LOWRES ? out.filter(i => i % 2 === 0 || i === this.n - 1) : out;
  }
  resize() {
    const r = this.c.getBoundingClientRect(); const cap = (MOBILE ? 1.0e6 : 1.6e6) * (LOWRES ? .5 : 1);
    let d = Math.min(devicePixelRatio || 1, 2); while (r.width * r.height * d * d > cap && d > .75) d -= .05;
    this.c.width = Math.round(r.width * d); this.c.height = Math.round(r.height * d);
  }
  inWin(i) { const p = Math.round(this.play); return this.dir > 0 ? (i >= p - this.behind && i <= p + this.ahead) : (i <= p + this.behind && i >= p - this.ahead); }
  next() {
    const p = Math.round(this.play);
    for (let k = 0; k <= this.ahead; k++) { const i = p + k * this.dir; if (i >= 0 && i < this.n && !this.st[i]) return i; }
    for (let k = 1; k <= this.behind; k++) { const i = p - k * this.dir; if (i >= 0 && i < this.n && !this.st[i]) return i; }
    while (this.oi < this.order.length) { const i = this.order[this.oi++]; if (!this.st[i]) return i; }
    return -1;
  }
  pump() {
    while (this.inflight < this.max) { const i = this.next(); if (i < 0) return; this.load(i); }
  }
  async load(i) {
    this.st[i] = 1; this.inflight++;
    try {
      if (this.useFetch) {
        const res = await fetch(this.url(i)); if (!res.ok) throw 0;
        this.blob[i] = await res.blob(); this.st[i] = 2;
        if (this.inWin(i) || this.drawn < 0) await this.decode(i);
      } else {
        const img = new Image(); img.decoding = 'async'; img.src = this.url(i);
        await img.decode(); this.bmp[i] = img; this.st[i] = 2;
      }
    } catch (e) {
      this.fails = (this.fails || 0) + 1;
      if (this.useFetch && this.fails > 2 && !this.blob.some(Boolean)) {
        // fetch is blocked here (some file:// or privacy setups): switch to <img> and retry everything
        this.useFetch = false; this.st.fill(0); this.oi = 0;
      } else this.st[i] = 3;   // give up on this one frame; neighbours cover it
    }
    this.inflight--;
    if (this.onProgress) this.onProgress();
    if (this.drawn < 0 || Math.abs(i - this.play) < 3) this.draw(Math.round(this.play), true);
    this.pump();
  }
  async decode(i) {
    if (this.bmp[i] || !this.blob[i] || this.decoding.has(i)) return;
    this.decoding.add(i);
    try { this.bmp[i] = await createImageBitmap(this.blob[i]); } catch (e) { }
    this.decoding.delete(i);
  }
  trim() {
    if (!this.useFetch) return;
    const p = Math.round(this.play);
    for (let i = 0; i < this.n; i++) {
      if (this.bmp[i] && !this.inWin(i) && i !== this.drawn && Math.abs(i - p) > this.ahead + 4) { this.bmp[i].close && this.bmp[i].close(); this.bmp[i] = null; }
    }
    for (let k = -this.behind; k <= this.ahead; k++) { const i = p + k * this.dir; if (i >= 0 && i < this.n && this.blob[i] && !this.bmp[i]) this.decode(i).then(() => { if (Math.round(this.play) === i) this.draw(i, true); }); }
  }
  loadedCount(list) { let c = 0; for (const i of list) if (this.st[i] >= 2) c++; return c; }
  nearest(f) {
    if (this.bmp[f]) return f;
    for (let k = 1; k < this.n; k++) { const a = f - k * this.dir, b = f + k * this.dir; if (a >= 0 && a < this.n && this.bmp[a]) return a; if (b >= 0 && b < this.n && this.bmp[b]) return b; }
    return -1;
  }
  draw(f, force) {
    f = clamp(f, 0, this.n - 1);
    const i = this.nearest(f); if (i < 0 || (i === this.drawn && !force)) return;
    const im = this.bmp[i], iw = im.width || im.naturalWidth, ih = im.height || im.naturalHeight;
    const cw = this.c.width, ch = this.c.height, s = Math.max(cw / iw, ch / ih);
    const w = iw * s, h = ih * s;
    this.x.drawImage(im, (cw - w) * .5, (ch - h) * .5, w, h);
    this.drawn = i;
  }
  seek(f) {
    const d = Math.sign(f - this.play); if (d) this.dir = d;
    this.play = f; this.trim(); this.pump();
  }
}

/* ---------- film controller ---------- */
const film = $('#making'), canvas = $('#film');
const seq = new SeqFilm(canvas, FILM.count, `assets/seq/film/${MOBILE ? 'm' : 'd'}`);
const intro = $('#filmIntro'), rail = $('#rail'), railT = $('.rail__thread'), railGold = $('#railGold');
const chap = $('#chap'), chapN = $('#chapN'), chapT = $('#chapT'), chapP = $('#chapP');
const gauge = $('#gauge'), gH = $('#gHours'), gS = $('#gStitch'), filmThread = $('#filmThread');
const legEnd = k => (k + 1 < FILM.legs.length ? FILM.legs[k + 1] : FILM.count - 1);
const chapStart = CHAPTERS.map(c => FILM.legs[c.leg]);
let target = 0, cur = 0, curCh = -1, filmTop = 0, filmLen = 1;
const set = (el, k, v) => { if (el[k] !== v) el[k] = v; };

function measure() { const r = film.getBoundingClientRect(); filmTop = r.top + scrollY; filmLen = Math.max(1, film.offsetHeight - innerHeight); }
function progress() { return clamp((scrollY - filmTop) / filmLen); }
const p2f = p => clamp((p - P0) / (P1 - P0)) * (FILM.count - 1);
const f2p = f => P0 + (f / (FILM.count - 1)) * (P1 - P0);

function hud(p, f) {
  const io = clamp((p - .012) / .045);
  intro.style.opacity = String(1 - io); intro.style.transform = `translate3d(0,${-io * 40}px,0)`;
  intro.style.visibility = io >= 1 ? 'hidden' : 'visible';
  const on = p > .04;
  rail.classList.toggle('is-on', on); railT.classList.toggle('is-on', on); chap.classList.toggle('is-on', on); gauge.classList.toggle('is-on', on);
  let ch = 0; for (let k = 0; k < chapStart.length; k++) if (f >= chapStart[k] - .5) ch = k;
  if (ch !== curCh) {
    curCh = ch; const c = CHAPTERS[ch];
    chapN.textContent = String(ch + 1).padStart(2, '0'); chapT.textContent = c.t; chapP.textContent = c.p;
    chap.classList.remove('swap'); void chap.offsetWidth; chap.classList.add('swap');
    chap.classList.toggle('is-last', ch === CHAPTERS.length - 1);
    $$('li', rail).forEach((li, k) => li.classList.toggle('is-active', k === ch));
  }
  railGold.style.transform = `scaleY(${clamp(f / (FILM.count - 1)).toFixed(4)})`;
  filmThread.style.strokeDashoffset = String(1 - p);
  const hours = Math.round(MAX_HOURS * clamp(f / FILM.legs[5]));
  const stitch = Math.round(STITCHES * clamp((f - FILM.legs[1]) / (FILM.legs[3] - FILM.legs[1])) / 10) * 10;
  set(gH, 'textContent', hours.toLocaleString('en-IN')); set(gS, 'textContent', stitch.toLocaleString('en-IN'));
}

function tick() {
  const p = progress(); target = p2f(p);
  const k = lenis ? .35 : .22;
  cur += (target - cur) * k; if (Math.abs(target - cur) < .02) cur = target;
  const f = Math.round(cur);
  seq.seek(cur); seq.draw(f);
  hud(p, cur);
  requestAnimationFrame(tick);
}
$$('button', rail).forEach((b, k) => b.addEventListener('click', () => { measure(); scrollToY(filmTop + f2p(chapStart[k] + 1) * filmLen); }));
addEventListener('resize', measure);

/* ---------- loader ---------- */
const loader = $('#loader'), lGold = $('#loaderGold'), lPct = $('#loaderPct');
let shown = 0, released = false;
const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
let fontsOk = false; fontsReady.then(() => { fontsOk = true; });
function loaderTick() {
  if (released) return;
  const want = seq.loadedCount(seq.firstPass) / seq.firstPass.length;
  shown += (want - shown) * .12;
  lGold.style.strokeDashoffset = String(1 - shown); lPct.textContent = Math.round(shown * 100);
  if ((want >= 1 && fontsOk && shown > .97) || performance.now() > 9000) release(); else requestAnimationFrame(loaderTick);
}
function release() {
  released = true; lGold.style.strokeDashoffset = '0'; lPct.textContent = '100';
  setTimeout(() => {
    loader.classList.add('is-done'); document.body.classList.remove('is-loading');
    if (lenis) lenis.start();
    measure(); if (window.ScrollTrigger) ScrollTrigger.refresh();
    const it = $('#introThread');
    if (window.gsap && !REDUCED) gsap.to(it, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', delay: .2 }); else it.style.strokeDashoffset = 0;
  }, 250);
}
seq.pump(); measure(); requestAnimationFrame(tick); requestAnimationFrame(loaderTick);

/* ---------- header theme ---------- */
const hdr = $('#hdr');
const themed = $$('.sec--light, .sec--dark, .sec--plum, .visit, .ftr');
function hdrTheme() {
  const y = 40; let light = false, past = scrollY > filmTop + filmLen + innerHeight * .5;
  for (const s of themed) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) { light = s.classList.contains('sec--light'); break; } }
  hdr.classList.toggle('is-light', past && light); hdr.classList.toggle('is-solid', past && !light);
}
addEventListener('scroll', hdrTheme, { passive: true }); hdrTheme();

/* ---------- statement words + counters ---------- */
const st = $('#statement');
st.innerHTML = st.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
const words = $$('.w', st);
if (window.gsap && !REDUCED) {
  ScrollTrigger.create({ trigger: st, start: 'top 82%', end: 'bottom 45%', scrub: true,
    onUpdate: s => { const n = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); } });
} else words.forEach(w => w.classList.add('on'));
const countIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; countIO.unobserve(e.target);
  const el = e.target, to = +el.dataset.count, t0 = performance.now(), dur = REDUCED ? 1 : 1600;
  const step = t => { const k = clamp((t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = v.toLocaleString('en-IN'); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), { threshold: .6 });
$$('[data-count]').forEach(el => countIO.observe(el));

/* ---------- techniques accordion ---------- */
const accItems = $$('.acc__item');
function openAcc(it) { accItems.forEach(a => a.classList.toggle('is-open', a === it)); }
accItems.forEach(it => {
  it.addEventListener('click', () => openAcc(it));
  it.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAcc(it); } });
  if (!MOBILE) it.addEventListener('mouseenter', () => openAcc(it));
});

/* ---------- collection ---------- */
const grid = $('#grid'); const saved = new Set();
try { JSON.parse(localStorage.getItem('naqsh-saved') || '[]').forEach(id => saved.add(id)); } catch (e) { }
const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
grid.innerHTML = LOOKS.map(l => `
  <article class="card" data-occ="${l.occ}" data-id="${l.id}">
    <button class="card__save" data-save="${l.id}" aria-pressed="${saved.has(l.id)}" aria-label="Save ${l.name}">${heart}</button>
    <button class="card__media" data-open="${l.id}" aria-label="View ${l.name}">
      <img src="assets/img/${l.img}-s.webp" srcset="assets/img/${l.img}-s.webp 520w, assets/img/${l.img}.webp 960w" sizes="(max-width:760px) 50vw, 25vw" alt="${l.name}, ${l.fabric.toLowerCase()} ${l.occL.toLowerCase()} lehenga with hand zardozi" loading="lazy">
    </button>
    <div class="card__top"><h3 class="card__name">${l.name}</h3><span class="card__dev" aria-hidden="true">${l.dev}</span></div>
    <p class="card__meta">${l.occL}, ${l.fabric.toLowerCase()}</p>
    <div class="hours"><div class="hours__bar"><i data-w="${(l.hours / MAX_HOURS * 100).toFixed(1)}"></i></div><span class="hours__lbl">${l.hours} hours of handwork</span></div>
    <p class="card__price">From ${inr(l.price)}</p>
  </article>`).join('');
const barIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.style.width = e.target.dataset.w + '%'; barIO.unobserve(e.target); } }), { threshold: 1 });
$$('.hours__bar i', grid).forEach(i => barIO.observe(i));

const savedCount = $('#savedCount'), savedBtn = $('#savedBtn');
function syncSaved() {
  savedCount.textContent = saved.size;
  $$('[data-save]').forEach(b => b.setAttribute('aria-pressed', String(saved.has(b.dataset.save))));
  try { localStorage.setItem('naqsh-saved', JSON.stringify([...saved])); } catch (e) { }
}
function toggleSave(id) {
  const l = LOOKS.find(x => x.id === id); if (!l) return;
  if (saved.has(id)) { saved.delete(id); toast(`Removed ${l.name} from saved`); } else { saved.add(id); toast(`Saved ${l.name}`); }
  syncSaved(); savedBtn.classList.remove('bump'); void savedBtn.offsetWidth; savedBtn.classList.add('bump');
  shSave.textContent = saved.has(curLook) ? 'Saved' : 'Save';
}
savedBtn.addEventListener('click', () => {
  if (!saved.size) { toast('Tap the heart on a lehenga to save it'); return; }
  toast(`Saved: ${[...saved].map(id => LOOKS.find(l => l.id === id).name).join(', ')}`);
  scrollToEl($('#collection'));
});
$$('.chip').forEach(c => c.addEventListener('click', () => {
  $$('.chip').forEach(x => { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', String(x === c)); });
  const f = c.dataset.f;
  $$('.card', grid).forEach(card => card.classList.toggle('is-hidden', f !== 'all' && card.dataset.occ !== f));
  if (window.ScrollTrigger) ScrollTrigger.refresh();
}));

/* ---------- detail sheet ---------- */
const sheet = $('#sheet'), shSave = $('#shSave'); let curLook = null, lastFocus = null;
function openSheet(id) {
  const l = LOOKS.find(x => x.id === id); if (!l) return; curLook = id; lastFocus = document.activeElement;
  $('#shImg').src = `assets/img/${l.img}.webp`; $('#shImg').alt = `${l.name} lehenga`;
  $('#shDev').textContent = l.dev; $('#shT').textContent = l.name; $('#shPrice').textContent = `From ${inr(l.price)}`;
  $('#shDesc').textContent = l.desc;
  $('#shDl').innerHTML = [['Occasion', l.occL], ['Fabric', l.fabric], ['Techniques', l.tech], ['Handwork', `${l.hours} hours`], ['Made in', `${l.weeks} weeks, to your measure`]]
    .map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  shSave.textContent = saved.has(id) ? 'Saved' : 'Save';
  sheet.hidden = false; lenis && lenis.stop(); document.documentElement.style.overflow = 'hidden';
  $('.sheet__x', sheet).focus();
}
function closeSheet() { sheet.hidden = true; lenis && lenis.start(); document.documentElement.style.overflow = ''; lastFocus && lastFocus.focus(); }
grid.addEventListener('click', e => {
  const s = e.target.closest('[data-save]'); if (s) { toggleSave(s.dataset.save); return; }
  const o = e.target.closest('[data-open]'); if (o) openSheet(o.dataset.open);
});
sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!sheet.hidden) closeSheet(); closeMenu(); } });
shSave.addEventListener('click', () => toggleSave(curLook));
$('#shBook').addEventListener('click', () => { $('#fLook').value = curLook; closeSheet(); setTimeout(() => scrollToEl($('#trial')), 60); });
syncSaved();

/* ---------- journey thread + parallax ---------- */
if (window.gsap && !REDUCED) {
  gsap.to('#tlThread', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.tl', start: 'top 80%', end: 'bottom 55%', scrub: true } });
  gsap.fromTo('.karigar__fig img', { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.karigar', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.visit__bg img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.visit', start: 'top bottom', end: 'bottom top', scrub: true } });
} else { const t = $('#tlThread'); if (t) t.style.strokeDashoffset = 0; }

/* ---------- trial form ---------- */
const lookSel = $('#fLook');
LOOKS.forEach(l => lookSel.insertAdjacentHTML('beforeend', `<option value="${l.id}">${l.name} (${l.occL})</option>`));
const days = $('#days'); const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short' }), monFmt = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const opts = []; const d0 = new Date(); d0.setHours(12, 0, 0, 0);
for (let k = 1; opts.length < 6 && k < 14; k++) { const d = new Date(d0); d.setDate(d0.getDate() + k); if (d.getDay() !== 2) opts.push(d); }
days.innerHTML = opts.map((d, i) => `<label><input type="radio" name="day" value="${d.toISOString().slice(0, 10)}" ${i === 0 ? 'checked' : ''}><span>${dayFmt.format(d)}<b>${d.getDate()}</b>${monFmt.format(d)}</span></label>`).join('');
const wed = $('#fWed'); wed.min = new Date(d0.getTime() + 864e5).toISOString().slice(0, 10);
const form = $('#form'), err = $('#formErr'), done = $('#done');
form.addEventListener('submit', e => {
  e.preventDefault(); err.textContent = ''; $$('.bad', form).forEach(x => x.classList.remove('bad'));
  const name = $('#fName').value.trim(), phone = $('#fPhone').value.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  const fail = (el, msg) => { el.classList.add('bad'); el.focus(); err.textContent = msg; };
  if (name.length < 2) return fail($('#fName'), 'Add your name so we know who to expect.');
  if (!/^[6-9]\d{9}$/.test(phone)) return fail($('#fPhone'), 'Enter a 10-digit Indian mobile number.');
  if (!wed.value) return fail(wed, 'Add your wedding date. An approximate one is fine.');
  const wd = new Date(wed.value + 'T12:00'); const daysLeft = Math.round((wd - d0) / 864e5);
  if (daysLeft < 1) return fail(wed, 'Choose a wedding date in the future.');
  const day = new Date(form.day.value + 'T12:00'), time = form.time.value;
  const look = LOOKS.find(l => l.id === lookSel.value);
  const when = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(day);
  const first = name.split(' ')[0];
  const plan = daysLeft >= 98 ? `Your wedding is ${daysLeft} days away, which leaves comfortable time for a fourteen-week lehenga.`
    : `Your wedding is ${daysLeft} days away. That is tight for a full commission, so we will also show you pieces we can alter to your measure.`;
  $('#doneT').textContent = `See you on ${when}, ${first}.`;
  $('#doneP').textContent = `${time} at the haveli${look ? `, with ${look.name} ready on the form` : ''}. ${plan}`;
  form.hidden = true; done.hidden = false; toast('Trial booked');
  if (window.ScrollTrigger) ScrollTrigger.refresh();
});
$('#doneAgain').addEventListener('click', () => { form.reset(); form.hidden = false; done.hidden = true; $('input[name=day]', days).checked = true; });
['fName', 'fPhone', 'fWed'].forEach(id => $('#' + id).addEventListener('input', e => e.target.classList.remove('bad')));

/* refresh after fonts settle (pin positions depend on text height) */
fontsReady.then(() => { measure(); window.ScrollTrigger && ScrollTrigger.refresh(); });
})();
