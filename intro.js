/* JoeBro Field Notes: intro sequence + live 3D "j" (three.js lazy-loaded, poster fallback) */
const d = document, root = d.documentElement, W = window;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = d.querySelector('.logo-stage'), slot = d.querySelector('.hero-logo');
const canvas = stage && stage.querySelector('canvas'), poster = stage && stage.querySelector('.logo-poster');
const stack = d.querySelector('.stack');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const bounce = t => { const n = 7.5625, k = 2.75; if (t < 1 / k) return n * t * t; if (t < 2 / k) return n * (t -= 1.5 / k) * t + .75; if (t < 2.5 / k) return n * (t -= 2.25 / k) * t + .9375; return n * (t -= 2.625 / k) * t + .984375; };
const go = () => W.jbGo && W.jbGo();

let seen = false; try { seen = !!sessionStorage.getItem('jb-intro'); } catch (e) {}
const playIntro = !reduce && !seen && root.classList.contains('intro-on');

if (!stage || reduce) { root.classList.remove('intro-on'); go(); }
else start();

function start() {
  /* ---------- live stage: lives on <body> so page fades never hide it ---------- */
  d.body.appendChild(stage);
  stage.classList.add('live');
  const mobile = () => innerWidth < 700;
  const introSize = () => Math.min(innerWidth * .78, innerHeight * .56);
  let S = 0;
  const sizeStage = () => { S = Math.round(Math.max(introSize(), slot.getBoundingClientRect().width, 200)); stage.style.setProperty('--S', S + 'px'); if (gl) gl.resize(S); };

  let mode = playIntro ? 'intro' : 'scroll', t0 = performance.now(), flyStart = 0, introBox, fromBox;
  const heroBox = () => { const r = slot.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, s: r.width, o: 1 }; };
  const getIntroBox = () => ({ cx: innerWidth / 2, cy: innerHeight * (mobile() ? .38 : .40), s: introSize(), o: 1 });
  function scrollBox() {
    const h = heroBox();
    if (!stack) return h;
    const top = stack.offsetTop, y = scrollY, vh = innerHeight;
    const show = { cx: innerWidth / 2, cy: vh * (mobile() ? .17 : .185), s: vh * (mobile() ? .17 : .22), o: 1 };
    const t = easeInOut(clamp(y / Math.max(1, top)));
    const b = { cx: lerp(h.cx, show.cx, t), cy: lerp(h.cy, show.cy, t), s: lerp(h.s, show.s, t), o: 1 };
    const end = top + stack.offsetHeight - vh;
    if (y > end) { b.cy = show.cy - (y - end); b.o = clamp(1 - (y - end) / (vh * .45)); }
    return b;
  }
  function place(b) {
    stage.style.transform = `translate3d(${(b.cx - S / 2).toFixed(1)}px,${(b.cy - S / 2).toFixed(1)}px,0) scale(${(b.s / S).toFixed(4)})`;
    stage.style.opacity = b.o.toFixed(3);
    stage.style.visibility = b.o < .01 ? 'hidden' : 'visible';
    stage.classList.toggle('passive', scrollY > 40 || mode !== 'scroll');
  }

  /* ---------- intro overlay ---------- */
  let overlay = null, title = null;
  if (playIntro) {
    const h1 = d.querySelector('.mega');
    const words = [...h1.querySelectorAll('.w')].map((w, i) => `<span class="w" style="--i:${i}">${w.innerHTML}</span>`).join(' ');
    overlay = d.createElement('div'); overlay.className = 'intro'; overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="wall"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div><div class="glasspane glass"></div><div class="sweepband"></div>' +
      `<p class="intro-title">${words}<span class="sphere"></span></p><button class="intro-skip" type="button">Skip intro</button>`;
    d.body.appendChild(overlay); title = overlay.querySelector('.intro-title');
    stage.classList.add('intro-mode');
    requestAnimationFrame(() => overlay.classList.add('on'));
    const skip = () => { if (mode === 'intro' || mode === 'wait') { t0 = performance.now() - 2200; if (mode === 'wait') begin(); } };
    overlay.addEventListener('click', skip);
    addEventListener('keydown', e => { if (e.key !== 'Tab') skip(); }, { once: true });
    addEventListener('wheel', skip, { once: true, passive: true });
    mode = 'wait';
  } else {
    root.classList.remove('intro-on'); go();
  }

  /* ---------- three.js (lazy) ---------- */
  let gl = null;
  sizeStage();
  const glReady = loadGL().then(g => { gl = g; sizeStage(); stage.classList.add('gl'); return true; }).catch(err => { console.info('3D logo fallback:', err && err.message); stage.classList.add('no-gl'); return false; });
  if (playIntro) {
    Promise.race([glReady, new Promise(r => setTimeout(() => r(false), 1600))]).then(ok => {
      if (!ok && !gl) stage.classList.add('no-gl', 'tumble');
      begin();
    });
  }
  function begin() { if (mode !== 'wait') return; mode = 'intro'; t0 = performance.now(); }
  addEventListener('resize', sizeStage);

  /* pointer + interaction */
  let px = 0, py = 0, spin = 0, spinV = 0;
  addEventListener('pointermove', e => { px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  stage.addEventListener('click', () => { spinV += 0.32; if (gl) gl.hop(); });
  addEventListener('jb:spin', e => { spinV += 0.32 * ((e.detail && e.detail.turns) || 1); if (gl) gl.hop(); });
  addEventListener('jb:accent', () => gl && gl.retint());

  /* ---------- main loop ---------- */
  let titleShown = false, sweepShown = false;
  function frame(now) {
    const t = (now - t0) / 1000;
    let box, intro = null;
    if (mode === 'wait') { box = getIntroBox(); box.o = 0; }
    else if (mode === 'intro') {
      box = getIntroBox(); intro = t;
      if (t > 1.0 && !sweepShown) { sweepShown = true; overlay.classList.add('sweep'); }
      if (t > 1.25 && !titleShown) { titleShown = true; title.classList.add('go'); }
      if (t > 2.3) { mode = 'fly'; flyStart = now; fromBox = box; overlay.classList.add('out'); root.classList.remove('intro-on'); setTimeout(go, 150); try { sessionStorage.setItem('jb-intro', '1'); } catch (e) {} }
    } else if (mode === 'fly') {
      const k = easeInOut(clamp((now - flyStart) / 950)); const h = scrollBox();
      box = { cx: lerp(fromBox.cx, h.cx, k), cy: lerp(fromBox.cy, h.cy, k), s: lerp(fromBox.s, h.s, k), o: 1 };
      intro = 2.3 + k;
      if (k >= 1) { mode = 'scroll'; stage.classList.remove('intro-mode', 'tumble'); overlay && overlay.remove(); }
    } else box = scrollBox();
    place(box);

    spin += spinV; spinV *= .94;
    const scrollSpin = scrollY * 0.0035;
    if (gl && box.o > 0.01 && !d.hidden) gl.render(now / 1000, { intro, px, py, spin: spin * Math.PI * 2 / 0.32 / 16 + scrollSpin, live: mode === 'scroll' });
    if (!gl) { stage.style.setProperty('--rx', (px * 14).toFixed(2) + 'deg'); stage.style.setProperty('--ry', (-py * 10 + Math.sin(spin) * 20).toFixed(2) + 'deg'); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  async function loadGL() {
    const test = d.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
    const head = await fetch('assets/joebro-logo.glb', { method: 'HEAD' });
    if (!head.ok) throw new Error('glb missing');
    const THREE = await import('three');
    const [{ GLTFLoader }, { RoomEnvironment }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'), import('three/addons/environments/RoomEnvironment.js')]);
    const accentColor = () => { const v = getComputedStyle(root).getPropertyValue('--accent').trim() || '#619efa'; try { return new THREE.Color(v); } catch (e) { return new THREE.Color(0x619efa); } };
    const accent2Color = () => { const v = getComputedStyle(root).getPropertyValue('--accent2').trim() || '#9b6bf2'; try { return new THREE.Color(v); } catch (e) { return new THREE.Color(0x9b6bf2); } };
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const panelGeo = new THREE.PlaneGeometry(1, 1);
    const pA = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), pB = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    pA.scale.set(5, 9, 1); pA.position.set(-6.5, 1.5, 3); pA.lookAt(0, 0, 0);
    pB.scale.set(7, 4, 1); pB.position.set(5.5, -4, 2); pB.lookAt(0, 0, 0);
    room.add(pA, pB);
    let envRT = null;
    const buildEnv = () => {
      pA.material.color.copy(accentColor()).multiplyScalar(5); pB.material.color.copy(accent2Color()).multiplyScalar(4);
      const old = envRT; envRT = pmrem.fromScene(room, 0.03); scene.environment = envRT.texture; if (old) old.dispose();
    };
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100); camera.position.set(0, 0, 7.2);
    const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(2, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x619efa, 4); rim.position.set(-3, 1.5, -3); scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0x9b6bf2, 2.5); rim2.position.set(3, -1, -2.5); scene.add(rim2);
    const sweep = new THREE.PointLight(0xffffff, 0, 8, 1.6); sweep.position.set(-5, 1, 2.5); scene.add(sweep);

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('assets/joebro-logo.glb');
    const model = gltf.scene;
    model.traverse(o => { if (o.isMesh && o.material) { o.material.envMapIntensity = 2.4; } });

    /* fit a tall, narrow glyph by height */
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const scale = 2.75 / Math.max(size.y, size.x * 1.15, 0.001);
    model.position.sub(c); const pivot = new THREE.Group(); pivot.add(model); model.position.multiplyScalar(1); pivot.scale.setScalar(scale);
    const holder = new THREE.Group(); holder.add(pivot); scene.add(holder);

    /* find the dot (named node, or the smallest top-most mesh when there are several) */
    let dot = null;
    model.traverse(o => { if (!dot && o !== model && /dot|sphere|ball|tittle|ball/i.test(o.name || '')) dot = o; });
    if (!dot) {
      const meshes = []; model.traverse(o => { if (o.isMesh) meshes.push(o); });
      if (meshes.length > 1) {
        const info = meshes.map(m => { const b = new THREE.Box3().setFromObject(m); const s = b.getSize(new THREE.Vector3()); return { m, vol: s.x * s.y * s.z, y: b.getCenter(new THREE.Vector3()).y }; });
        info.sort((a, b) => a.vol - b.vol);
        if (info[0].y > c.y) dot = info[0].m;
      }
    }
    const dotHome = dot ? dot.position.clone() : null;
    const dotDrop = dot ? size.y * 1.1 : 0;

    let hopT = -9;
    let tintUntil = 0;
    let envTimer = 0;
    const retint = () => { tintUntil = performance.now() + 1100; clearTimeout(envTimer); envTimer = setTimeout(buildEnv, 800); };
    buildEnv();
    rim.color.copy(accentColor()); rim2.color.copy(accent2Color());

    let rx = 0, ry = 0, lastNow = 0;
    return {
      resize(px) { renderer.setSize(px, px, false); camera.aspect = 1; camera.updateProjectionMatrix(); },
      hop() { hopT = performance.now() / 1000; },
      retint,
      render(time, s) {
        if (performance.now() < tintUntil) { rim.color.lerp(accentColor(), .2); rim2.color.lerp(accent2Color(), .2); }
        let z = 0, tx = 0, tyRot = 0, extraY = 0, dotY = 0, sweepI = 0;
        if (s.intro !== null) {
          const t = s.intro;
          const a = easeOut(clamp(t / 1.25));
          z = lerp(-34, 0, a);
          tyRot = lerp(-Math.PI * 5, 0, a);
          tx = lerp(1.3, 0, a);
          holder.rotation.z = lerp(.6, 0, a);
          if (dot) { const k = clamp((t - .95) / .7); dotY = k <= 0 ? dotDrop * 3 : (1 - bounce(k)) * dotDrop; dot.visible = k > 0; }
          const sw = clamp((t - 1.05) / .85); sweep.position.x = lerp(-4.5, 4.5, easeInOut(sw)); sweepI = Math.sin(sw * Math.PI) * 60;
        } else {
          holder.rotation.z *= .9;
          if (dot) dot.visible = true;
          const h = time - hopT;
          if (h < 1.1 && dot) dotY = Math.sin(clamp(h / .55) * Math.PI) * dotDrop * .35 + (h > .55 ? (1 - bounce(clamp((h - .55) / .55))) * dotDrop * .08 : 0);
          extraY = Math.sin(time * 1.1) * .06;
        }
        const targetY = s.live ? s.px * .55 + s.spin : tyRot;
        const targetX = s.live ? s.py * .28 : tx;
        if (s.intro !== null) { ry = targetY; rx = targetX; } else { ry += (targetY - ry) * .08; rx += (targetX - rx) * .08; }
        holder.rotation.y = ry; holder.rotation.x = rx;
        holder.position.set(0, extraY, z);
        if (dot && dotHome) { dot.position.copy(dotHome); dot.position.y += dotY; }
        sweep.intensity = sweepI;
        renderer.render(scene, camera);
      }
    };
  }
}
