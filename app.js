/* JoeBro Field Notes: shared interactions (vanilla, no deps) */
(() => {
  const d = document, root = d.documentElement, W = window;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js');
  setTimeout(() => { if (root.classList.contains('intro-on') && !d.querySelector('.intro')) { root.classList.remove('intro-on'); W.jbGo && W.jbGo(); } }, 2500);
  if (!reduce) root.classList.add('motion');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- accent switcher ---------- */
  const pick = d.querySelector('.accent-pick');
  const setChecked = () => d.querySelectorAll('[data-set-accent]').forEach(b => b.setAttribute('aria-checked', String((root.dataset.accent || 'blue') === b.dataset.setAccent)));
  if (pick) {
    const btn = pick.querySelector('.accent-btn');
    btn.addEventListener('click', e => { e.stopPropagation(); const o = pick.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
    d.addEventListener('click', e => { if (!pick.contains(e.target)) { pick.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
    d.addEventListener('keydown', e => { if (e.key === 'Escape') pick.classList.remove('open'); });
    pick.querySelectorAll('[data-set-accent]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.setAccent;
      if (v === 'blue') delete root.dataset.accent; else root.dataset.accent = v;
      store.set('jb-accent', v); setChecked();
      W.dispatchEvent(new CustomEvent('jb:accent'));
      d.querySelectorAll('.sphere').forEach(s => { s.classList.remove('boing'); void s.offsetWidth; s.classList.add('boing'); });
    }));
    setChecked();
  }

  /* ---------- refraction filter (Chromium renders url() in backdrop-filter) ---------- */
  const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands && navigator.userAgentData.brands.some(b => /Chrom/.test(b.brand)));
  if (chromium && !reduce) {
    d.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<filter id="lg-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.018" numOctaves="2" seed="7" result="n"/><feGaussianBlur in="n" stdDeviation="2" result="nb"/><feDisplacementMap in="SourceGraphic" in2="nb" scale="38" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="lg-refract-soft" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="24" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '</defs></svg>');
    root.classList.add('refract');
  }

  /* ---------- reveals: scroll-timeline where supported, IntersectionObserver otherwise ---------- */
  const groups = [
    ['.is-home main > .note, .topline, .repo-box, main > p:last-child', 0],
    ['.cards', 1], ['.article-head > *', 2], ['.prose > figure, .prose > .note, .prose > .repo-box, .prose > blockquote', 0], ['.toc, .next-note > *', 2]
  ];
  if (!reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    groups.forEach(([sel, mode]) => d.querySelectorAll(sel).forEach((el, n) => {
      const kids = mode === 1 ? [...el.children] : [el];
      kids.forEach((k, j) => { k.classList.add('rv'); k.style.setProperty('--d', mode === 1 ? j : mode === 2 ? n : 0); io.observe(k); });
    }));
    /* kinetic section headings: split into words */
    d.querySelectorAll('.topic h2, .repo-box h2').forEach(h => {
      if (h.children.length) return;
      const t = h.textContent; h.setAttribute('aria-label', t);
      h.innerHTML = t.split(' ').map((w, i) => `<span class="kw" aria-hidden="true" style="--i:${i}">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
      h.classList.add('kinetic'); io.observe(h);
    });
  }

  /* ---------- pointer: glass sheen, card tilt, magnetic buttons ---------- */
  let px = .5, py = .5;
  const tiltSel = '.card, .shot, .nn';
  d.addEventListener('pointermove', e => {
    px = e.clientX / innerWidth; py = e.clientY / innerHeight;
    root.style.setProperty('--px', (px * 2 - 1).toFixed(3)); root.style.setProperty('--py', (py * 2 - 1).toFixed(3));
    const g = e.target.closest && e.target.closest('.glass, .card, .nn, .toc, .note');
    if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    if (reduce || e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest(tiltSel);
    if (t) { const r = t.getBoundingClientRect(); const k = t.classList.contains('shot') ? 6 : 5;
      t.style.setProperty('--tilt-x', (((e.clientX - r.left) / r.width - .5) * k).toFixed(2));
      t.style.setProperty('--tilt-y', (-((e.clientY - r.top) / r.height - .5) * k).toFixed(2)); }
  }, { passive: true });
  d.addEventListener('pointerout', e => { const t = e.target.closest && e.target.closest(tiltSel); if (t && !t.contains(e.relatedTarget)) { t.style.removeProperty('--tilt-x'); t.style.removeProperty('--tilt-y'); } });

  if (!reduce && fine) d.querySelectorAll('.btn, .repo-links a, .accent-btn, .back').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * .28).toFixed(1) + 'px'); b.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * .38).toFixed(1) + 'px'); });
    b.addEventListener('pointerleave', () => { b.style.removeProperty('--tx'); b.style.removeProperty('--ty'); });
  });

  /* ripples */
  d.addEventListener('pointerdown', e => {
    if (reduce) return;
    const b = e.target.closest && e.target.closest('.btn, .repo-links a, .nn, .back, .accent-btn, .card');
    if (!b) return;
    const r = b.getBoundingClientRect(), s = d.createElement('span');
    s.className = 'ripple'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
    b.appendChild(s); setTimeout(() => s.remove(), 750);
  });

  /* ---------- custom cursor (desktop only) ---------- */
  if (fine && !reduce) {
    const c = d.createElement('div'), dot = d.createElement('div');
    c.className = 'cursor hide'; dot.className = 'cursor-dot hide'; d.body.append(c, dot); root.classList.add('has-cursor');
    let tx = -100, ty = -100, cx = -100, cy = -100;
    d.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY; c.classList.remove('hide'); dot.classList.remove('hide');
      const el = e.target.closest ? e.target : null;
      const card = el && el.closest('.card, .shot, .nn, .phone');
      const link = el && el.closest('a, button, .sphere, .ball, canvas');
      c.classList.toggle('glass', !!card); c.classList.toggle('link', !card && !!link);
    }, { passive: true });
    d.addEventListener('pointerdown', () => c.classList.add('down'));
    d.addEventListener('pointerup', () => c.classList.remove('down'));
    d.documentElement.addEventListener('pointerleave', () => { c.classList.add('hide'); dot.classList.add('hide'); });
    (function loop() { cx += (tx - cx) * .2; cy += (ty - cy) * .2;
      c.style.transform = `translate3d(${cx}px,${cy}px,0)`; dot.style.transform = `translate3d(${tx}px,${ty}px,0)`; requestAnimationFrame(loop); })();
  }

  /* ---------- scroll: progress + sphere rider, stack scrub, marquee velocity, toc ---------- */
  const prog = d.querySelector('.progress'), article = d.querySelector('.prose');
  const stack = d.querySelector('.stack'), mqs = d.querySelectorAll('.mq-track');
  let lastY = scrollY, vel = 0, ticking = false, mqOff = 0;
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function onScroll() {
    ticking = false;
    const y = scrollY;
    if (prog && article) {
      const r = article.getBoundingClientRect();
      const p = clamp((innerHeight * .35 - r.top) / (r.height - innerHeight * .4));
      prog.style.setProperty('--p', p.toFixed(4)); prog.style.setProperty('--po', p > .005 && p < .999 ? 1 : 0);
    }
    if (stack && root.classList.contains('motion')) {
      const r = stack.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight));
      stack.style.setProperty('--e', ss(.05, .55, p).toFixed(4));
      stack.style.setProperty('--ph', ss(.45, .9, p).toFixed(4));
      stack.dataset.p = p.toFixed(4);
    }
    vel = vel * .6 + (y - lastY) * .4; lastY = y;
  }
  W.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  W.addEventListener('resize', onScroll); onScroll();
  if (mqs.length && !reduce) (function mq() {
    vel *= .92; mqOff += vel * .35;
    mqs.forEach((t, i) => t.parentElement.style.transform = `translateX(${(i ? -1 : 1) * mqOff}px) skewX(${clamp(-vel * .25, -10, 10)}deg)`);
    requestAnimationFrame(mq);
  })();

  const toc = [...d.querySelectorAll('.toc a[href^="#"]')];
  if (toc.length) {
    const map = new Map(toc.map(a => [d.getElementById(a.getAttribute('href').slice(1)), a]));
    const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { toc.forEach(a => a.classList.remove('on')); map.get(e.target)?.classList.add('on'); } }), { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((a, h) => h && tio.observe(h));
  }

  /* ---------- page transition fallback when cross-document view transitions are missing ---------- */
  const hasVT = 'onpagereveal' in W;
  if (!hasVT && !reduce) {
    root.classList.add('fallback-vt');
    d.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button || a.target) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
      e.preventDefault(); root.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, 200);
    });
    W.addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('leaving'); });
  }

  /* ---------- hero headline kinetic entrance (intro.js triggers it on the home page) ---------- */
  const mega = d.querySelector('.mega');
  if (mega && (reduce || !d.querySelector('.hero-logo'))) mega.classList.add('go');
  W.jbGo = () => mega && mega.classList.add('go');

  /* ---------- flick the chrome sphere ---------- */
  const home = d.querySelector('.mega .sphere');
  if (home && !reduce) {
    let ball = null, x, y, vx, vy, drag = false, raf, lastT, hist = [], idle = 0;
    const size = () => home.getBoundingClientRect().width || 40;
    function spawn(e) {
      const r = home.getBoundingClientRect(), s = r.width;
      ball = d.createElement('b'); ball.className = 'sphere ball'; ball.setAttribute('aria-hidden', 'true');
      ball.style.width = ball.style.height = s + 'px'; ball.style.fontSize = (s / .36) + 'px'; d.body.appendChild(ball);
      x = r.left; y = r.top; vx = vy = 0; home.classList.add('gone');
      ball.addEventListener('pointerdown', grab);
      grab(e);
    }
    function grab(e) { e.preventDefault(); drag = true; idle = 0; hist = []; ball.setPointerCapture?.(e.pointerId); ball.style.cursor = 'grabbing'; cancelAnimationFrame(raf); raf = requestAnimationFrame(step); }
    d.addEventListener('pointermove', e => { if (!drag || !ball) return; const s = size(); x = e.clientX - s / 2; y = e.clientY - s / 2; hist.push([e.clientX, e.clientY, performance.now()]); if (hist.length > 6) hist.shift(); });
    d.addEventListener('pointerup', () => {
      if (!drag || !ball) return; drag = false; ball.style.cursor = 'grab';
      if (hist.length > 1) { const a = hist[0], b = hist[hist.length - 1], dt = Math.max(16, b[2] - a[2]); vx = (b[0] - a[0]) / dt * 16; vy = (b[1] - a[1]) / dt * 16; }
    });
    function step(t) {
      const s = size(), wv = innerWidth, hv = innerHeight;
      if (!drag) {
        vy += .9; vx *= .995; x += vx; y += vy;
        if (x < 0) { x = 0; vx = -vx * .78; } if (x > wv - s) { x = wv - s; vx = -vx * .78; }
        if (y < 0) { y = 0; vy = -vy * .78; } if (y > hv - s) { y = hv - s; vy = -vy * .72; vx *= .96; if (Math.abs(vy) < 1.2) vy = 0; }
        idle = Math.abs(vx) + Math.abs(vy) < .3 ? idle + 1 : 0;
      }
      ball.style.transform = `translate3d(${x}px,${y}px,0) rotate(${x * 1.2}deg)`;
      if (idle > 150) return goHome();
      raf = requestAnimationFrame(step);
    }
    function goHome() {
      const r = home.getBoundingClientRect(), b = ball;
      b.style.transition = 'transform .8s cubic-bezier(.34,1.56,.64,1)';
      b.style.transform = `translate3d(${r.left}px,${r.top}px,0)`;
      setTimeout(() => { home.classList.remove('gone'); b.remove(); }, 820); ball = null;
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
    d.querySelectorAll('.sphere').forEach((s, i) => setTimeout(() => { s.classList.remove('boing'); void s.offsetWidth; s.classList.add('boing'); }, i * 40));
    const order = ['blue', 'purple', 'ocean', 'forest', 'sunset'], was = root.dataset.accent;
    order.forEach((a, i) => setTimeout(() => { root.dataset.accent = a; }, i * 260));
    setTimeout(() => { if (was) root.dataset.accent = was; else delete root.dataset.accent; root.classList.remove('party'); W.dispatchEvent(new CustomEvent('jb:accent')); }, order.length * 260 + 200);
  });
})();
