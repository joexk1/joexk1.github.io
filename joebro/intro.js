/* JoeBro: intro sequence + live 3D "j". three.js is lazy-loaded; rendering is on demand only. */
const d = document, root = d.documentElement, W = window;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const slot = d.querySelector('.hero-logo'), stage = slot && slot.querySelector('.logo-stage');
const canvas = stage && stage.querySelector('canvas');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const bounce = t => { const n = 7.5625, k = 2.75; if (t < 1 / k) return n * t * t; if (t < 2 / k) return n * (t -= 1.5 / k) * t + .75; if (t < 2.5 / k) return n * (t -= 2.25 / k) * t + .9375; return n * (t -= 2.625 / k) * t + .984375; };
const go = () => W.jbGo && W.jbGo();

let seen = false; try { seen = !!sessionStorage.getItem('jb-intro'); } catch (e) {}
const playIntro = !reduce && !seen && root.classList.contains('intro-on');

if (!stage || reduce) { root.classList.remove('intro-on'); go(); }
else start();

function start() {
  const small = innerWidth < 700;
  const SPEED = small ? .8 : 1;              /* shorter intro on phones */
  const T_SWEEP = small ? .7 : 1.0, T_TITLE = small ? 99 : 1.2, T_FLY = small ? 1.4 : 2.2, FLY_MS = small ? 650 : 900;
  let gl = null, mode = playIntro ? 'wait' : 'live', t0 = 0, flyStart = 0, visible = true, overlay = null, title = null;
  let px = 0, py = 0, spin = 0, spinV = 0, running = false;

  const introSize = () => Math.min(innerWidth * .8, innerHeight * .56);
  const introBox = () => ({ cx: innerWidth / 2, cy: innerHeight * (small ? .46 : .4), s: introSize() });
  const slotBox = () => { const r = slot.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, s: r.width }; };
  let S = 0;
  const sizeGL = () => { if (gl) gl.resize(Math.round(stage.getBoundingClientRect().width / (mode === 'live' ? 1 : (stage._scale || 1)))); };

  /* ---------- intro overlay ---------- */
  if (playIntro) {
    const h1 = d.querySelector('.mega');
    const words = [...h1.querySelectorAll('.w')].map((w, i) => `<span class="w" style="--i:${i}">${w.innerHTML}</span>`).join(' ');
    overlay = d.createElement('div'); overlay.className = 'intro'; overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="wall"><i class="b1"></i><i class="b2"></i><i class="b4"></i></div><div class="glasspane glass"></div><div class="sweepband"></div>' +
      (small ? '' : `<p class="intro-title">${words}<span class="sphere"></span></p>`) + '<button class="intro-skip" type="button">Skip intro</button>';
    d.body.appendChild(overlay); title = overlay.querySelector('.intro-title');
    S = Math.round(introSize()); stage.style.setProperty('--S', S + 'px');
    d.body.appendChild(stage); stage.classList.add('fly');
    place(introBox(), 0);
    requestAnimationFrame(() => overlay.classList.add('on'));
    const skip = () => { if (mode === 'wait') begin(); if (mode === 'intro') t0 = performance.now() - T_FLY * 1000; kick(); };
    overlay.addEventListener('click', skip);
    addEventListener('keydown', e => { if (e.key !== 'Tab') skip(); }, { once: true });
    addEventListener('wheel', skip, { once: true, passive: true });
    addEventListener('touchmove', skip, { once: true, passive: true });
  } else { root.classList.remove('intro-on'); go(); }

  function place(b, o = 1) {
    const sc = b.s / S; stage._scale = sc;
    stage.style.transform = `translate3d(${(b.cx - S / 2).toFixed(1)}px,${(b.cy - S / 2).toFixed(1)}px,0) scale(${sc.toFixed(4)})`;
    stage.style.opacity = o;
  }
  function settle() {   /* intro done: hand the stage back to the hero slot */
    overlay && overlay.remove(); overlay = null;
    slot.appendChild(stage); stage.classList.remove('fly', 'tumble'); stage.style.transform = ''; stage.style.opacity = '';
    mode = 'live'; sizeGL();
  }

  /* ---------- three.js (lazy, after first paint) ---------- */
  const glReady = new Promise(r => playIntro ? r() : W.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 800 }) : setTimeout(r, 200))
    .then(loadGL).then(g => { gl = g; sizeGL(); stage.classList.add('gl'); kick(); return true; })
    .catch(err => { console.info('3D logo fallback:', err && err.message); stage.classList.add('no-gl'); return false; });
  if (playIntro) Promise.race([glReady, new Promise(r => setTimeout(() => r(false), 1500))]).then(ok => { if (!ok && !gl) stage.classList.add('no-gl', 'tumble'); begin(); });
  function begin() { if (mode !== 'wait') return; mode = 'intro'; t0 = performance.now(); kick(); }

  /* ---------- triggers: only these wake the render loop ---------- */
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(slot);
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || !visible || mode !== 'live') return; px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  addEventListener('scroll', () => { if (visible && mode === 'live') kick(); }, { passive: true });
  addEventListener('resize', () => { if (mode === 'live') sizeGL(); kick(); });
  stage.addEventListener('click', () => { spinV += 0.3; if (gl) gl.hop(); kick(); });
  addEventListener('jb:spin', e => { spinV += 0.3 * ((e.detail && e.detail.turns) || 1); if (gl) gl.hop(); kick(); });
  addEventListener('jb:accent', () => { if (gl) gl.retint(); kick(); });
  d.addEventListener('visibilitychange', () => { if (!d.hidden) kick(); });

  function kick() { if (!running && !d.hidden) { running = true; requestAnimationFrame(frame); } }
  function frame(now) {
    running = false;
    let busy = false, intro = null;
    if (mode === 'wait') { busy = false; }
    else if (mode === 'intro') {
      const t = (now - t0) / 1000; intro = t / SPEED; busy = true;
      if (t > T_SWEEP && !overlay.classList.contains('sweep')) overlay.classList.add('sweep');
      if (title && t > T_TITLE && !title.classList.contains('go')) title.classList.add('go');
      place(introBox());
      if (t > T_FLY) { mode = 'fly'; flyStart = now; overlay.classList.add('out'); root.classList.remove('intro-on'); setTimeout(go, 120); try { sessionStorage.setItem('jb-intro', '1'); } catch (e) {} }
    } else if (mode === 'fly') {
      const k = easeInOut(clamp((now - flyStart) / FLY_MS)), a = introBox(), b = slotBox();
      place({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), s: lerp(a.s, b.s, k) });
      intro = 2.2 + k; busy = true;
      if (k >= 1) settle();
    }
    spin += spinV; spinV *= .93; if (spinV < 1e-4) spinV = 0;
    if (mode === 'live' && !gl) { stage.style.setProperty('--rx', (px * 14).toFixed(2) + 'deg'); stage.style.setProperty('--ry', (-py * 10).toFixed(2) + 'deg'); }
    if (gl && (visible || mode !== 'live')) {
      const moving = gl.render(now / 1000, { intro, px, py, spin: spin * 2.4 + scrollY * .0035, live: mode === 'live' });
      busy = busy || moving;
    }
    busy = busy || spinV > 0;
    if (busy) kick();
  }

  async function loadGL() {
    const test = d.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
    const THREE = await import('three');
    const [{ GLTFLoader }, { RoomEnvironment }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/environments/RoomEnvironment.js')]);
    const css = n => getComputedStyle(root).getPropertyValue(n).trim();
    const col = (v, f) => { try { return new THREE.Color(v || f); } catch (e) { return new THREE.Color(f); } };
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment(), geo = new THREE.PlaneGeometry(1, 1);
    const pA = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), pB = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    pA.scale.set(5, 9, 1); pA.position.set(-6.5, 1.5, 3); pA.lookAt(0, 0, 0);
    pB.scale.set(7, 4, 1); pB.position.set(5.5, -4, 2); pB.lookAt(0, 0, 0);
    room.add(pA, pB);
    let envRT = null;
    const buildEnv = () => {
      pA.material.color.copy(col(css('--accent'), '#619efa')).multiplyScalar(5); pB.material.color.copy(col(css('--accent2'), '#9b6bf2')).multiplyScalar(4);
      const old = envRT; envRT = pmrem.fromScene(room, 0.03); scene.environment = envRT.texture; if (old) old.dispose();
    };
    buildEnv();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100); camera.position.set(0, 0, 7.2);
    const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(2, 3, 4); scene.add(key);
    const sweep = new THREE.PointLight(0xffffff, 0, 8, 1.6); sweep.position.set(-5, 1, 2.5); scene.add(sweep);

    const gltf = await new GLTFLoader().loadAsync('assets/joebro-logo.glb');
    const model = gltf.scene;
    model.traverse(o => { if (o.isMesh && o.material) o.material.envMapIntensity = 2.4; });
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const scale = 2.75 / Math.max(size.y, size.x * 1.15, 0.001);
    model.position.sub(c);
    const pivot = new THREE.Group(); pivot.add(model); pivot.scale.setScalar(scale);
    const holder = new THREE.Group(); holder.add(pivot); scene.add(holder);
    let dot = null; model.traverse(o => { if (!dot && o !== model && /dot/i.test(o.name || '')) dot = o; });
    const dotHome = dot ? dot.position.clone() : null, dotDrop = size.y * .32;

    let hopT = -9, envTimer = 0, rx = 0, ry = 0;
    return {
      resize(px) { if (!px) return; renderer.setSize(px, px, false); },
      hop() { hopT = performance.now() / 1000; },
      retint() { clearTimeout(envTimer); envTimer = setTimeout(() => { buildEnv(); kick(); }, 750); },
      render(time, s) {
        let z = 0, dotY = 0, sweepI = 0, anim = false;
        if (s.intro !== null) {
          const t = s.intro, a = easeOut(clamp(t / 1.25));
          z = lerp(-34, 0, a); ry = lerp(-Math.PI * 5, 0, a); rx = lerp(1.3, 0, a); holder.rotation.z = lerp(.6, 0, a);
          if (dot) { const k = clamp((t - .95) / .7); dotY = (1 - bounce(k)) * dotDrop; dot.visible = k > 0; dot.scale.setScalar(clamp(k * 3.5)); }
          const sw = clamp((t - 1.05) / .85); sweep.position.x = lerp(-4.5, 4.5, easeInOut(sw)); sweepI = Math.sin(sw * Math.PI) * 60;
          anim = true;
        } else {
          if (dot) { dot.visible = true; dot.scale.setScalar(1); }
          if (Math.abs(holder.rotation.z) > 1e-3) { holder.rotation.z *= .85; anim = true; } else holder.rotation.z = 0;
          const h = time - hopT;
          if (h < 1.1 && dot) { dotY = Math.sin(clamp(h / .55) * Math.PI) * dotDrop * 1.1 + (h > .55 ? (1 - bounce(clamp((h - .55) / .55))) * dotDrop * .25 : 0); anim = true; }
          const ty = (fine ? s.px * .55 : 0) + s.spin, tx = fine ? s.py * .28 : 0;
          ry += (ty - ry) * .12; rx += (tx - rx) * .12;
          if (Math.abs(ty - ry) + Math.abs(tx - rx) > 1e-3) anim = true;
        }
        holder.rotation.y = ry; holder.rotation.x = rx; holder.position.set(0, 0, z);
        if (dot && dotHome) { dot.position.copy(dotHome); dot.position.y += dotY; }
        sweep.intensity = sweepI;
        renderer.render(scene, camera);
        return anim;
      }
    };
  }
}
