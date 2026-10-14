/* JoeBro site: shared interactions. Vanilla, on-demand: nothing runs per frame while the page is idle. */
(() => {
  const d = document, root = d.documentElement, W = window;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js');
  if (!reduce) root.classList.add('motion');
  setTimeout(() => { if (root.classList.contains('intro-on') && !d.querySelector('.intro')) { root.classList.remove('intro-on'); W.jbGo && W.jbGo(); } }, 2500);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const store = { set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const boing = s => { s.classList.remove('boing'); void s.offsetWidth; s.classList.add('boing'); };

  /* one rAF scheduler: tasks run once per frame only when something asked for it */
  const jobs = new Set(); let queued = false;
  const ask = fn => { jobs.add(fn); if (!queued) { queued = true; requestAnimationFrame(run); } };
  function run(t) { queued = false; const list = [...jobs]; jobs.clear(); list.forEach(fn => fn(t)); }
  W.jbAsk = ask;

  /* ---------- accent switcher ---------- */
  const pick = d.querySelector('.accent-pick');
  const setChecked = () => d.querySelectorAll('[data-set-accent]').forEach(b => b.setAttribute('aria-checked', String((root.dataset.accent || 'blue') === b.dataset.setAccent)));
  if (pick) {
    const btn = pick.querySelector('.accent-btn');
    const close = () => { pick.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => { e.stopPropagation(); btn.setAttribute('aria-expanded', pick.classList.toggle('open')); });
    d.addEventListener('click', e => { if (!pick.contains(e.target)) close(); });
    d.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  {
    d.querySelectorAll('[data-set-accent]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.setAccent;
      if (v === 'blue') delete root.dataset.accent; else root.dataset.accent = v;
      store.set('jb-accent', v); setChecked();
      W.dispatchEvent(new CustomEvent('jb:accent'));
      if (!reduce) d.querySelectorAll('.mega .sphere, .bighead .sphere, .cardhead .sphere').forEach(boing);
      dots && dots.recolor();
      if (pick) pick.classList.remove('open');
    }));
    setChecked();
  }

  /* ---------- refraction on the (small) nav pill only, Chromium only ---------- */
  const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands && navigator.userAgentData.brands.some(b => /Chrom/.test(b.brand)));
  if (chromium && !reduce && fine) {
    d.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="lg-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7" result="n"/><feGaussianBlur in="n" stdDeviation="2" result="nb"/><feDisplacementMap in="SourceGraphic" in2="nb" scale="34" xChannelSelector="R" yChannelSelector="G"/></filter></svg>');
    root.classList.add('refract');
  }

  /* ---------- reveals (IntersectionObserver, one-shot) ---------- */
  if (!reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    const add = (el, n) => { el.classList.add('rv'); el.style.setProperty('--d', n); io.observe(el); };
    d.querySelectorAll('.strip > *, .points > *, .topo > *').forEach((el, n) => add(el, n % 4));
    d.querySelectorAll('.block-head > :not(h2), .mac, .net, .cloak, .chips, #privacy .note, .related.center').forEach(el => add(el, 0));
    d.querySelectorAll('.cards').forEach(g => [...g.children].forEach((c, j) => add(c, j % 3)));
    d.querySelectorAll('.article-head > *').forEach((el, n) => add(el, n));
    d.querySelectorAll('.prose > figure, .prose > .note, .prose > .repo-box, .toc, .next-note > *').forEach(el => add(el, 0));
    d.querySelectorAll('.bighead').forEach(h => {
      const sph = h.querySelector('.sphere'); const t = h.textContent.trim();
      h.setAttribute('aria-label', t);
      h.innerHTML = t.split(' ').map((x, i) => `<span class="kw" aria-hidden="true" style="--i:${i}">${x.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
      if (sph) h.lastElementChild.appendChild(sph);
      h.classList.add('kinetic'); io.observe(h);
    });
  }

  /* ---------- pointer: coalesced to one rAF ---------- */
  let pe = null;
  const tiltSel = '.card, .macwin, .nn';
  function onPointer() {
    const e = pe; if (!e) return;
    const g = e.target.closest && e.target.closest('.glass, .card, .nn');
    if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    if (reduce || e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest(tiltSel);
    if (t) { const r = t.getBoundingClientRect(); const k = t.classList.contains('macwin') ? 3 : 4;
      t.style.setProperty('--tilt-x', (((e.clientX - r.left) / r.width - .5) * k).toFixed(2));
      t.style.setProperty('--tilt-y', (-((e.clientY - r.top) / r.height - .5) * k).toFixed(2)); }
  }
  d.addEventListener('pointermove', e => { pe = e; ask(onPointer); }, { passive: true });
  d.addEventListener('pointerout', e => { const t = e.target.closest && e.target.closest(tiltSel); if (t && !t.contains(e.relatedTarget)) { t.style.removeProperty('--tilt-x'); t.style.removeProperty('--tilt-y'); } });

  if (!reduce && fine) d.querySelectorAll('.btn, .repo-links a, .accent-btn, .back').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * .25).toFixed(1) + 'px'); b.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * .35).toFixed(1) + 'px'); });
    b.addEventListener('pointerleave', () => { b.style.removeProperty('--tx'); b.style.removeProperty('--ty'); });
  });
  d.addEventListener('pointerdown', e => {
    if (reduce) return;
    const b = e.target.closest && e.target.closest('.btn, .repo-links a, .nn, .back, .chip');
    if (!b) return;
    const r = b.getBoundingClientRect(), s = d.createElement('span');
    s.className = 'ripple'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
    b.appendChild(s); setTimeout(() => s.remove(), 750);
  });

  /* ---------- custom cursor (desktop only), animates only while catching up ---------- */
  if (fine && !reduce) {
    const c = d.createElement('div'), dot = d.createElement('div');
    c.className = 'cursor hide'; dot.className = 'cursor-dot hide'; d.body.append(c, dot); root.classList.add('has-cursor');
    let tx = -100, ty = -100, cx = -100, cy = -100;
    const step = () => {
      cx += (tx - cx) * .25; cy += (ty - cy) * .25;
      c.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`; dot.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > .4) ask(step);
    };
    d.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY; c.classList.remove('hide'); dot.classList.remove('hide');
      const el = e.target.closest ? e.target : null;
      const card = el && el.closest('.card, .macwin, .nn, .phone, .mcard');
      const link = el && el.closest('a, button, .sphere, .ball, canvas');
      c.classList.toggle('glass-c', !!card); c.classList.toggle('link', !card && !!link);
      ask(step);
    }, { passive: true });
    d.addEventListener('pointerdown', () => c.classList.add('down'));
    d.addEventListener('pointerup', () => c.classList.remove('down'));
    root.addEventListener('pointerleave', () => { c.classList.add('hide'); dot.classList.add('hide'); });
  }

  /* ---------- dot field: dots turn to face the cursor (one canvas, redrawn on pointer move only) ---------- */
  let dots = null;
  const cv = d.querySelector('.wall .dots');
  if (cv && fine && !reduce) {
    const ctx = cv.getContext('2d');
    const G = 22, SIG = 190, dpr = Math.min(devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, mx = -9999, my = -9999, col = '', acc = '';
    const recolor = () => { const cs = getComputedStyle(root); col = cs.getPropertyValue('--dot').trim() || 'rgba(0,0,0,.09)'; acc = cs.getPropertyValue('--accent').trim() || '#619efa'; ask(draw); };
    const size = () => { w = innerWidth; h = innerHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ask(draw); };
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = col; ctx.beginPath();
      const R = SIG * 2.6, near = [];
      for (let y = G / 2; y < h; y += G) for (let x = G / 2; x < w; x += G) {
        const dx = mx - x, dy = my - y;
        if (Math.abs(dx) < R && Math.abs(dy) < R) near.push(x, y, dx, dy); else { ctx.moveTo(x + 1.1, y); ctx.arc(x, y, 1.1, 0, 6.2832); }
      }
      ctx.fill();
      ctx.lineCap = 'round';
      for (let i = 0; i < near.length; i += 4) {
        const x = near[i], y = near[i + 1], dx = near[i + 2], dy = near[i + 3];
        const dist = Math.hypot(dx, dy) || 1, k = Math.exp(-(dist * dist) / (2 * SIG * SIG));
        const len = 1.1 + k * 5.5, ux = dx / dist, uy = dy / dist;
        ctx.globalAlpha = 1; ctx.strokeStyle = k > .25 ? acc : col; ctx.globalAlpha = k > .25 ? .25 + k * .55 : 1;
        ctx.lineWidth = 2.2 - k * .6;
        ctx.beginPath(); ctx.moveTo(x - ux * len * .5, y - uy * len * .5); ctx.lineTo(x + ux * len * .5, y + uy * len * .5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    d.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; ask(draw); }, { passive: true });
    root.addEventListener('pointerleave', () => { mx = my = -9999; ask(draw); });
    addEventListener('resize', size);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
    root.classList.add('dotfield'); size(); recolor();
    dots = { recolor: () => setTimeout(recolor, 750) };
  }

  /* ---------- scroll: progress, stack scrub, blob parallax, marquee velocity (all coalesced) ---------- */
  const prog = d.querySelector('.progress'), article = d.querySelector('.prose');
  const stack = d.querySelector('.stack'), blobs = d.querySelectorAll('.wall > i');
  const drum = d.querySelector('.drum'), dws = d.querySelectorAll('.dw'), ticks = d.querySelectorAll('.drum-ticks i');
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const pinned = () => root.classList.contains('motion') && innerWidth >= 900;
  function onScroll() {
    const y = scrollY;
    if (prog && article) {
      const r = article.getBoundingClientRect();
      const p = clamp((innerHeight * .35 - r.top) / (r.height - innerHeight * .4));
      prog.style.setProperty('--p', p.toFixed(4)); prog.style.setProperty('--po', p > .005 && p < .999 ? 1 : 0);
    }
    if (stack && pinned()) {
      const r = stack.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) {
        const p = clamp(-r.top / (r.height - innerHeight));
        stack.style.setProperty('--e', ss(.05, .5, p).toFixed(4));
        stack.style.setProperty('--ph-p', ss(.4, .85, p).toFixed(4));
      }
    }
    if (!reduce) blobs.forEach((b, i) => b.style.setProperty('--sy', (-y * (.04 + i * .025)).toFixed(1) + 'px'));
    if (drum && !reduce) {
      const r = drum.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) {
        const p = clamp(-r.top / (r.height - innerHeight)), n = dws.length;
        const idx = clamp(p * 1.25 * (n - 1), 0, n - 1);
        dws.forEach((w, i) => { const o = i - idx, a = Math.abs(o);
          w.style.transform = `rotateX(${(o * -78).toFixed(2)}deg)`; w.style.opacity = clamp(1 - a * 1.25).toFixed(3); });
        ticks.forEach((t, i) => t.style.setProperty('--f', clamp(idx - i + 1).toFixed(3)));
        drum.style.setProperty('--foot', ss(.8, .95, p).toFixed(3));
      }
    }
  }
  W.addEventListener('scroll', () => ask(onScroll), { passive: true });
  W.addEventListener('resize', () => ask(onScroll)); onScroll();
  /* pause looping CSS animations while offscreen */
  const vis = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('off', !e.isIntersecting)));
  d.querySelectorAll('.net').forEach(el => vis.observe(el));

  const toc = [...d.querySelectorAll('.toc a[href^="#"]')];
  if (toc.length) {
    const map = new Map(toc.map(a => [d.getElementById(a.getAttribute('href').slice(1)), a]));
    const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { toc.forEach(a => a.classList.remove('on')); map.get(e.target)?.classList.add('on'); } }), { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((a, h) => h && tio.observe(h));
  }


  /* ---------- features: Mac window tabs, typing memory file, theme swap ---------- */
  const tabs = [...d.querySelectorAll('.ftab')];
  const mdPre = d.querySelector('.md-type'), mdText = mdPre ? mdPre.dataset.text : '';
  let typer = 0, macVisible = false;
  const typeMd = () => {
    clearTimeout(typer); if (!mdPre) return;
    if (reduce) { mdPre.textContent = mdText; return; }
    let i = 0; mdPre.textContent = '';
    const tick = () => { if (!macVisible) return; i = Math.min(mdText.length, i + 1 + (Math.random() < .3 ? 1 : 0)); mdPre.textContent = mdText.slice(0, i); if (i < mdText.length) typer = setTimeout(tick, mdText[i] === '\n' ? 160 : 26); };
    typer = setTimeout(tick, 350);
  };
  function selectTab(t, focus) {
    const key = t.id.replace('tab-', '');
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; d.getElementById(x.getAttribute('aria-controls')).classList.toggle('on', on); });
    d.querySelectorAll('.fdesc').forEach(f => f.hidden = f.dataset.for !== key);
    if (focus) t.focus();
    if (key === 'memory') typeMd(); else clearTimeout(typer);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => { const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (k) { e.preventDefault(); selectTab(tabs[(i + k + tabs.length) % tabs.length], true); } });
  });
  const macwin = d.querySelector('.macwin');
  if (macwin) new IntersectionObserver(es => { macVisible = es[0].isIntersecting; if (macVisible && d.querySelector('#tab-memory[aria-selected="true"]') && mdPre.textContent.length < mdText.length) typeMd(); }).observe(macwin);
  const themeImg = d.querySelector('.theme-img');
  const THEME = { blue: '05_theming', purple: '01_workspace', ocean: '02_theme', forest: '04_git_mcp', sunset: '03_theme', graphite: '05_agent_actions' };
  const setTheme = () => { if (!themeImg) return; const n = THEME[root.dataset.accent || 'blue']; const src = `assets/w/win_${n}.webp`; if (themeImg.getAttribute('src') === src) return;
    themeImg.classList.add('swap'); setTimeout(() => { themeImg.src = src; themeImg.onload = () => themeImg.classList.remove('swap'); }, reduce ? 0 : 200); };
  W.addEventListener('jb:accent', setTheme); setTheme();

  /* ---------- privacy: Cloak Mode demo ---------- */
  const cloak = d.querySelector('.cloak');
  if (cloak) {
    const tog = cloak.querySelector('.cloak-toggle');
    const set = on => { cloak.classList.toggle('cloaked', on); tog.setAttribute('aria-pressed', on); if (on && !reduce) { cloak.classList.remove('scanning'); void cloak.offsetWidth; cloak.classList.add('scanning'); } };
    if (reduce) set(true);
    else new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); setTimeout(() => set(true), 700); } }, { threshold: .5 }).observe(cloak);
    tog.addEventListener('click', () => set(!cloak.classList.contains('cloaked')));
    cloak.querySelectorAll('[data-k]').forEach(el => {
      const mates = () => cloak.querySelectorAll(`[data-k="${el.dataset.k}"]`);
      el.addEventListener('pointerenter', () => mates().forEach(m => m.classList.add('hot')));
      el.addEventListener('pointerleave', () => mates().forEach(m => m.classList.remove('hot')));
    });
  }

  /* ---------- article filters (same-document view transition when available) ---------- */
  const chips = d.querySelectorAll('.chip');
  chips.forEach(c => c.addEventListener('click', () => {
    const f = c.dataset.filter;
    const apply = () => {
      chips.forEach(x => { const on = x === c; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      d.querySelectorAll('.cards .card').forEach(card => { card.hidden = !(f === 'all' || card.dataset.topic === f); card.classList.add('in'); });
    };
    if (d.startViewTransition && !reduce) d.startViewTransition(apply); else apply();
  }));

  /* ---------- page transition fallback (no cross-document view transitions) ---------- */
  if (!('onpagereveal' in W) && !reduce) {
    root.classList.add('fallback-vt');
    d.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button || a.target) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname === location.pathname) return;
      e.preventDefault(); root.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, 180);
    });
    W.addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('leaving'); });
  }

  /* ---------- hero headline entrance (intro.js triggers it on the home page) ---------- */
  const mega = d.querySelector('.mega');
  W.jbGo = () => mega && mega.classList.add('go');
  if (mega && reduce) mega.classList.add('go');

  /* ---------- flick the chrome sphere (physics runs only while it moves) ---------- */
  const home = d.querySelector('.mega .sphere');
  if (home && !reduce) {
    let ball = null, x, y, vx, vy, drag = false, hist = [], idle = 0;
    const size = () => home.getBoundingClientRect().width || 40;
    function spawn(e) {
      const r = home.getBoundingClientRect(), s = r.width;
      ball = d.createElement('b'); ball.className = 'sphere ball'; ball.setAttribute('aria-hidden', 'true');
      ball.style.width = ball.style.height = s + 'px'; d.body.appendChild(ball);
      x = r.left; y = r.top; vx = vy = 0; home.classList.add('gone');
      ball.addEventListener('pointerdown', grab); grab(e);
    }
    function grab(e) { e.preventDefault(); drag = true; idle = 0; hist = []; ball.setPointerCapture?.(e.pointerId); ask(step); }
    d.addEventListener('pointermove', e => { if (!drag || !ball) return; const s = size(); x = e.clientX - s / 2; y = e.clientY - s / 2; hist.push([e.clientX, e.clientY, performance.now()]); if (hist.length > 6) hist.shift(); ask(step); });
    d.addEventListener('pointerup', () => {
      if (!drag || !ball) return; drag = false;
      if (hist.length > 1) { const a = hist[0], b = hist[hist.length - 1], dt = Math.max(16, b[2] - a[2]); vx = (b[0] - a[0]) / dt * 16; vy = (b[1] - a[1]) / dt * 16; }
      ask(step);
    });
    function step() {
      if (!ball) return;
      const s = size(), wv = innerWidth, hv = innerHeight;
      if (!drag) {
        vy += .9; vx *= .995; x += vx; y += vy;
        if (x < 0) { x = 0; vx = -vx * .78; } if (x > wv - s) { x = wv - s; vx = -vx * .78; }
        if (y < 0) { y = 0; vy = -vy * .78; } if (y > hv - s) { y = hv - s; vy = -vy * .72; vx *= .96; if (Math.abs(vy) < 1.2) vy = 0; }
        idle = Math.abs(vx) + Math.abs(vy) < .3 ? idle + 1 : 0;
      }
      ball.style.transform = `translate3d(${x}px,${y}px,0) rotate(${x * 1.2}deg)`;
      if (idle > 90) return goHome();
      if (!drag) ask(step);
    }
    function goHome() {
      const r = home.getBoundingClientRect(), b = ball; ball = null;
      b.style.transition = 'transform .8s cubic-bezier(.34,1.56,.64,1)';
      b.style.transform = `translate3d(${r.left}px,${r.top}px,0)`;
      setTimeout(() => { home.classList.remove('gone'); b.remove(); }, 820);
    }
    home.addEventListener('pointerdown', e => { if (!ball) spawn(e); });
  }

  /* ---------- easter egg: type "joe" ---------- */
  let buf = '';
  d.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return;
    buf = (buf + (e.key || '')).slice(-3).toLowerCase();
    if (buf !== 'joe') return;
    buf = '';
    let t = d.querySelector('.toast');
    if (!t) { t = d.createElement('div'); t.className = 'toast glass'; t.setAttribute('role', 'status');
      const img = d.querySelector('.brand img'); t.innerHTML = `<img src="${img ? img.getAttribute('src') : ''}" alt="">Hey, it’s Joe. Thanks for reading.`; d.body.appendChild(t); }
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => t.classList.remove('show'), 2600);
    W.dispatchEvent(new CustomEvent('jb:spin', { detail: { turns: 2 } }));
    if (reduce) return;
    root.classList.add('party');
    d.querySelectorAll('.sphere').forEach((s, i) => setTimeout(() => boing(s), i * 30));
    const seq = ['purple', 'ocean', 'forest', 'sunset'], was = root.dataset.accent;
    seq.forEach((a, i) => setTimeout(() => { root.dataset.accent = a; }, i * 260));
    setTimeout(() => { if (was) root.dataset.accent = was; else delete root.dataset.accent; root.classList.remove('party'); W.dispatchEvent(new CustomEvent('jb:accent')); dots && dots.recolor(); }, seq.length * 260 + 200);
  });
})();
