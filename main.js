import { THREE, clamp, lerp, win, ease, easeOut } from './core.js';
import { buildScene } from './scene.js';

const $ = id => document.getElementById(id);
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  $('nogl').style.display = 'grid';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const { scene, update, labels: LDEF, hot: HDEF } = buildScene(renderer);
const camera = new THREE.PerspectiveCamera(9, 1, 0.5, 300);
const V = a => new THREE.Vector3(...a);

// ---- capitoli (testi dal diagramma "Evoluzione del Sistema")
const CH = [
  { a: 0.05, n: '01', t: 'Maglia strutturale', s: '7,50 · 7,80 · 8,00 m' },
  { a: 0.16, n: '02', t: 'Modulo camera a 2 p.l.', s: 'zona letti + servizio igienico' },
  { a: 0.27, n: '03', t: 'Parete testaletto', s: 'lunghezza 5,50 – 5,70 m' },
  { a: 0.38, n: '04', t: 'Portale', s: 'trave + montanti' },
  { a: 0.49, n: '05', t: 'Impianti integrati', s: 'gas medicali e luce indiretta' },
  { a: 0.58, n: '06', t: 'Armadi a innesto', s: 'moduli agganciati ai montanti' },
  { a: 0.66, n: '07', t: 'Armadi integrati', s: 'il portale diventa arredo' },
  { a: 0.74, n: '08', t: 'Letti e comodini', s: '2 posti letto' },
  { a: 0.85, n: '09', t: 'Soluzione finale', s: 'entra nella camera' },
];
const ticks = $('ticks');
CH.forEach(() => ticks.appendChild(document.createElement('i')));
let curCh = -2;
function setChapter(i) {
  if (i === curCh) return;
  curCh = i;
  const cap = $('caption');
  cap.classList.add('off');
  setTimeout(() => {
    if (i >= 0) { $('cNum').textContent = CH[i].n; $('cTitle').textContent = CH[i].t; $('cSub').textContent = CH[i].s; cap.classList.remove('off'); }
  }, 180);
  [...ticks.children].forEach((el, k) => { el.className = k === i ? 'on' : (k < i ? 'done' : ''); });
}

// ---- etichette 3D (HTML proiettato)
const labelsEl = $('labels');
const LB = LDEF.map(d => {
  const el = document.createElement('div');
  el.className = 'lbl' + (d.big ? ' big' : '') + (d.gray ? ' gray' : '');
  el.innerHTML = d.t;
  labelsEl.appendChild(el);
  return { d, el, a: V(d.a), b: d.b ? V(d.b) : null };
});
const hotsEl = $('hots');
const HT = HDEF.map(d => {
  const el = document.createElement('div');
  el.className = 'hot';
  el.innerHTML = `<i></i><span>${d.t}</span>`;
  el.addEventListener('click', () => openInfo(d.k));
  hotsEl.appendChild(el);
  return { el, a: V(d.a) };
});

// ---- schede con foto reale (clic sulle etichette)
const FAV = 'https://www.favero.it/it/prodotti/';
const INFO = {
  armadio: { t: 'Armadio di degenza', img: 'assets/armadio.jpg', p: 'Armadio con ante blu laccate, mostrato chiuso, aperto con i ripiani interni e di lato. Si aggancia ai montanti del portale e ne segue il filo superiore.', d: [['Ingombro', '0,58 × 0,70 m'], ['Altezza', '2,03 m']] },
  comodino: { t: 'Comodino', img: 'assets/comodino.jpg', p: 'Comodino della serie Rotomoulding: cassetto, anta e piano d\'appoggio a ponte, su ruote. Nel progetto sta accanto all\'armadio, con il lato blu rivolto verso la camera.', d: [['Ingombro', '0,74 × 0,49 m'], ['Piano', 'h 0,77 m']], link: FAV + 'degenza/comodini/rotomoulding' },
  letto: { t: 'Letto di degenza', img: 'assets/letto.jpg', p: 'Letto specialistico con pesatura Ingenious HighCare Precision (9LI70LTS), con sponde laterali e comandi integrati. Testata rivolta verso il portale.', d: [['Ingombro', '2,20 × 0,93 m']], link: FAV + 'letti-specialistici/letti-con-pesatura-1/ingenious-highcare-precision-9li70lts' },
  portale: { t: 'Portale testaletto', img: 'assets/portale.jpg', k: 'Render', p: 'Due montanti e una trave in un unico elemento: porta i gas medicali nei montanti e la luce indiretta sotto la trave. Gli armadi si agganciano ai montanti.', d: [['Larghezza', '5,60 m'], ['Sotto trave', '2,03 m'], ['Altezza', '2,48 m']] },
  colonna: { t: 'Colonna centrale', img: 'assets/colonna.jpg', p: 'Colonna con due ante al centro del portale, tra i due posti letto; completa il sistema con i gas medicali sul lato.', d: [['Larghezza', '0,90 m'], ['Altezza', '2,03 m']] },
};
const $i = id => document.getElementById(id);
function openInfo(key) {
  const f = INFO[key]; if (!f) return;
  $i('iT').textContent = f.t; $i('iP').textContent = f.p; $i('iK').textContent = f.k || 'Foto reale';
  $i('iD').innerHTML = f.d.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  const L = $i('iL'); if (f.link) { L.href = f.link; L.style.display = ''; } else L.style.display = 'none';
  const fig = $i('fig'), img = $i('iImg'); fig.classList.remove('empty');
  img.onerror = () => fig.classList.add('empty'); img.alt = f.t; img.src = f.img;
  $i('info').classList.add('on'); $i('info').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeInfo() { $i('info').classList.remove('on'); $i('info').setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
$i('x').addEventListener('click', closeInfo);
$i('info').addEventListener('click', e => { if (e.target === $i('info')) closeInfo(); });
function openZoom() { const s = $i('iImg').src; if (!s || $i('fig').classList.contains('empty')) return; $i('zImg').src = s; $i('zoom').classList.add('on'); $i('zoom').setAttribute('aria-hidden', 'false'); }
function closeZoom() { $i('zoom').classList.remove('on'); $i('zoom').setAttribute('aria-hidden', 'true'); }
$i('iImg').addEventListener('click', openZoom);
$i('zoom').addEventListener('click', closeZoom);
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if ($i('zoom').classList.contains('on')) closeZoom(); else closeInfo(); });

// ---- camera: chiavi (iso con lente lunga, poi lente che si apre e si entra in camera)
const DIR = new THREE.Vector3(1, 0.78, 1).normalize();
const iso = (t, size, fov) => ({ t, size, fov });
const ISO_B = iso([-0.7, 0.9, -2.3], 9.6, 9);
const KEYS = [
  { p: 0.0, ...iso([0, 0.4, 0], 16, 9) },
  { p: 0.16, ...iso([0, 0.4, 0], 13.5, 9) },
  { p: 0.3, ...iso([-0.7, 0.8, -2.0], 11.2, 9) },
  { p: 0.5, ...ISO_B },
  { p: 0.9, ...ISO_B },
  { p: 0.94, pos: [4.7, 4.4, 7.8], look: [-0.9, 1.2, -2.45], fov: 30 },
  { p: 0.97, pos: [-0.9, 1.7, 4.6], look: [-0.9, 1.4, -3.5], fov: 50 },
  { p: 1.0, pos: [-0.9, 1.6, 1.15], look: [-0.9, 1.45, -3.5], fov: 62 },
];
function resolve(k, aspect) {
  if (k.pos) return { pos: V(k.pos), look: V(k.look), fov: k.fov };
  const d = (k.size / 2) / Math.tan((k.fov * Math.PI) / 360) * Math.max(1, 1.25 / aspect);
  const t = V(k.t);
  return { pos: t.clone().addScaledVector(DIR, d), look: t, fov: k.fov };
}
function camAt(p, aspect) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const A = KEYS[i], B = KEYS[i + 1];
  const u = ease(clamp((p - A.p) / (B.p - A.p)));
  const a = resolve(A, aspect), b = resolve(B, aspect);
  return { pos: a.pos.lerp(b.pos, u), look: a.look.lerp(b.look, u), fov: lerp(a.fov, b.fov, u) };
}

// ---- input
let fixed = null;
window.__setP = v => { fixed = v; };
const Q = new URLSearchParams(location.search);
if (Q.has('p')) fixed = parseFloat(Q.get('p'));
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', e => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; });
let W = 1, Hh = 1;
function resize() {
  W = innerWidth; Hh = innerHeight;
  renderer.setSize(W, Hh, false);
  camera.aspect = W / Hh; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let p = 0, qs = 0;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function project(v, out) {
  out.copy(v).project(camera);
  return { x: (out.x * 0.5 + 0.5) * W, y: (-out.y * 0.5 + 0.5) * Hh, z: out.z };
}
function frame() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const raw = fixed != null ? fixed : clamp(scrollY / max);
  const target = raw < 0.62 ? raw / 0.62 * 0.9 : raw < 0.68 ? 0.9 : 0.9 + clamp((raw - 0.68) / 0.27) * 0.1;
  qs += (win(raw, 0.63, 0.655) - qs) * (fixed != null ? 1 : 0.09);
  const q = qs;
  p += (target - p) * (fixed != null ? 1 : 0.09);
  if (Math.abs(target - p) < 0.0002) p = target;

  update(p, q);
  const c = camAt(p, W / Hh);
  // sguardo libero durante la camminata
  mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
  const wlk = win(p, 0.97, 0.995);
  if (wlk > 0) {
    const f = tmp2.copy(c.look).sub(c.pos);
    f.applyAxisAngle(new THREE.Vector3(0, 1, 0), -mouse.sx * 0.55 * wlk);
    const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
    f.applyAxisAngle(right, -mouse.sy * 0.25 * wlk);
    c.look.copy(c.pos).add(f);
  }
  camera.position.copy(c.pos);
  camera.fov = c.fov; camera.updateProjectionMatrix();
  camera.lookAt(c.look);
  camera.updateMatrixWorld();
  renderer.render(scene, camera);

  // interfaccia
  $('hero').style.opacity = String(1 - win(p, 0.025, 0.065));
  $('pct').textContent = String(Math.round(p * 100)).padStart(2, '0');
  let ch = -1;
  CH.forEach((k, i) => { if (p >= k.a) ch = i; });
  setChapter(ch);
  $('caption').style.visibility = p > 0.96 ? 'hidden' : 'visible';
  $('hint').style.opacity = String(win(p, 0.97, 0.99));
  $('tagline').style.opacity = String(win(p, 0.97, 0.99));


  for (const L of LB) {
    const [a0, a1, b0, b1] = L.d.vis;
    const o = win(p, a0, a1) * (1 - win(p, b0, b1));
    L.el.style.opacity = String(o);
    if (o < 0.01) continue;
    const s = project(L.a, tmp);
    if (s.z > 1) { L.el.style.opacity = '0'; continue; }
    let ang = 0;
    if (L.b) {
      const e = project(L.b, tmp);
      ang = Math.atan2(e.y - s.y, e.x - s.x);
      if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
    }
    L.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-50%) rotate(${ang}rad)`;
  }
  const ho = win(p, 0.985, 1.0);
  for (const H of HT) {
    H.el.style.opacity = String(ho);
    H.el.style.pointerEvents = ho > 0.6 ? 'auto' : 'none';
    if (ho < 0.01) continue;
    const s = project(H.a, tmp);
    if (s.z > 1) { H.el.style.opacity = '0'; continue; }
    H.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-6px,-50%)`;
  }
  requestAnimationFrame(frame);
}
frame();
