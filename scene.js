// La camera di degenza (metri). x verso est, z verso sud, y in alto. La parete testaletto sta a z = -1.85.
// Misure: maglia 7,80 m; zona letti 5,60 x 3,70 m; armadi alti 2,03 m; la trave del portale parte dal filo superiore degli armadi (sotto trave = 2,03 m).
import { THREE, Part, TONES, win, clamp, ease, easeOut } from './core.js';
import * as MODELS from './models.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const Y = 0.3;          // quota del piano finito
const H = 3.17;         // altezza pilastri e parete testaletto
const CAB_H = 2.03;     // altezza armadi
const BB = CAB_H;       // quota inferiore della trave = filo superiore degli armadi
const PH = BB + 0.45;   // quota superiore del portale (trave alta 0,45 m)
const G = 3.9;          // mezza maglia (asse dei pilastri)
const GI = 3.7;         // filo interno dei pilastri (pilastri 0,40 m): da qui parte il tratteggio
const ZB = -1.85;       // parete testaletto
const X0 = -3.6, X1 = 2.0;   // zona letti: 5,60 m
const ZF = 1.85;             // fronte zona letti: 3,70 m di profondita'

export function buildScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#fafaf8');

  // Il modulo camera sta in fondo alla maglia, a filo del tratteggio (filo interno dei pilastri, x = -3,7 e z = -3,7).
  // Le parti della camera sono modellate attorno all'origine e spostate con questo gruppo.
  const OFX = -0.1, OFZ = -1.85;
  const room = new THREE.Group();
  room.position.set(OFX, 0, OFZ);
  scene.add(room);
  room.updateMatrixWorld(true);
  const W = (x, y, z) => [x + OFX, y, z + OFZ];

  // ---- solaio
  const slab = new Part({ dir: [1, 0, 1] });
  slab.box(-4.6, 0, -4.6, 4.6, Y, 4.6, 'slab');
  slab.finish(scene);

  // ---- maglia strutturale: 4 pilastri + rettangolo tratteggiato rosso
  const cols = [[-G, -G], [G, -G], [G, G], [-G, G]].map(([cx, cz]) => {
    const c = new Part({ drop: 2.6 });
    c.box(cx - 0.2, Y, cz - 0.2, cx + 0.2, Y + H, cz + 0.2, 'base');
    return c.finish(scene);
  });
  const gy = Y + 0.02;
  const grid = new Part({ dir: [1, 0, 1] });
  grid.dashed([[[-GI, gy, -GI], [GI, gy, -GI]], [[GI, gy, -GI], [GI, gy, GI]], [[GI, gy, GI], [-GI, gy, GI]], [[-GI, gy, GI], [-GI, gy, -GI]]], '#b5332f', 0.2, 0.14);
  grid.finish(scene);

  // ---- zona letti + servizio igienico
  const zona = new Part({ dir: [1, 0, 1] });
  zona.box(X0, Y, ZB, X1, Y + 0.014, ZF, 'zone');
  zona.finish(room);

  const serv = new Part();
  serv.box(1.9, Y, -GI, GI, Y + 2.3, -1.75, 'acc');
  serv.box(2.4, Y, -1.75, 3.2, Y + 2.0, -1.732, 'dark');
  serv.finish(scene);

  // ---- parete testaletto (si dissolve quando arriva il portale)
  const wall = new Part();
  wall.box(X0, Y, ZB, X1, Y + H, ZB + 0.12, 'acc');
  wall.finish(room);

  // ---- portale: due montanti, trave, colonna centrale con le ante
  const zf = ZB + 0.4;                // faccia anteriore del portale
  const portal = new Part({ drop: 2.6 });
  portal.box(X0, Y, ZB, X0 + 0.4, Y + PH, zf, 'acc');
  portal.box(X1 - 0.4, Y, ZB, X1, Y + PH, zf, 'acc');
  portal.box(X0, Y + BB, ZB, X1, Y + PH, zf, 'acc');
  portal.box(-1.25, Y, ZB, -0.35, Y + BB, ZB + 0.35, 'acc');
  portal.box(-1.17, Y + 0.05, ZB + 0.35, -0.82, Y + BB - 0.06, ZB + 0.362, 'dark');
  portal.box(-0.78, Y + 0.05, ZB + 0.35, -0.43, Y + BB - 0.06, ZB + 0.362, 'dark');
  portal.finish(room);

  // ---- impianti: punti dei gas medicali e luce indiretta
  const dots = new Part();
  // gas medicali: quattro punti sulla faccia laterale del montante sinistro e della colonna centrale
  for (let i = 0; i < 4; i++) dots.dot(X0 + 0.4 + 0.012, Y + 1.2 + i * 0.13, ZB + 0.2, 0.035, '#b5332f', 'x');
  for (let i = 0; i < 4; i++) dots.dot(-0.35 + 0.012, Y + 1.2 + i * 0.13, ZB + 0.175, 0.035, '#b5332f', 'x');
  dots.finish(room);

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 128;
    const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(243,201,107,0.75)'); gr.addColorStop(1, 'rgba(243,201,107,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
  const glows = [[X0 + 0.45, X0 + 1.55], [X1 - 1.55, X1 - 0.45]].map(([a, b]) => {
    const g = new THREE.BufferGeometry();
    const yt = Y + BB, yb = Y + 0.02, zt = zf + 0.02, zb = zf + 1.5;
    const v = new Float32Array([a, yt, zt, b, yt, zt, b + 0.5, yb, zb, a + 0.5, yb, zb]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(g, glowMat); m.visible = false; room.add(m); return m;
  });

  // ---- armadi a innesto
  const cabs = [[X0, X0 + 0.6, -1], [X1 - 0.6, X1, 1]].map(([x0, x1, side]) => {
    const c = new Part();
    c.box(x0, Y, zf, x1, Y + CAB_H, zf + 0.6, 'acc');
    c.box(x0 + 0.04, Y + 0.1, zf + 0.6, x1 - 0.04, Y + CAB_H - 0.1, zf + 0.615, 'purple');
    c.box(x0 + 0.02, Y, zf + 0.02, x1 - 0.02, Y + 0.1, zf + 0.6, 'dark');                       // zoccolo
    const hx = side < 0 ? x1 - 0.1 : x0 + 0.1;
    c.box(hx - 0.012, Y + 0.85, zf + 0.615, hx + 0.012, Y + 1.35, zf + 0.64, 'base');           // maniglia a barra
    c.box(x0 + 0.17, Y + 0.95, zf + 0.615, x1 - 0.17, Y + 1.3, zf + 0.622, 'dark');             // presa ovale
    const px = side < 0 ? X0 + 0.4 : X1 - 0.4;                                                               // sportello sul montante
    c.box(px - 0.003, Y + 0.8, ZB + 0.04, px + 0.003, Y + 1.1, ZB + 0.34, 'purple');
    c.side = side; c.finish(room);
    return c;
  });
  // sagome tratteggiate e linee di innesto
  const ghost = new Part();
  {
    const pairs = [];
    for (const [x0, x1, side] of [[X0, X0 + 0.6, -1], [X1 - 0.6, X1, 1]]) {
      const y0 = Y, y1 = Y + CAB_H, z0 = zf, z1 = zf + 0.6;
      const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      for (const [a, b] of E) pairs.push([c[a], c[b]]);
      for (const i of [4, 5, 6, 7]) pairs.push([[c[i][0], c[i][1], c[i][2] + 1.6], c[i]]);
    }
    ghost.dashed(pairs, '#1d1c19', 0.12, 0.09);
    ghost.finish(room);
  }

  // ---- letti e comodini
  const bedPart = cx => {
    const b = new Part({ drop: 3 });
    b.box(cx - 0.42, Y + 0.3, -1.3, cx + 0.42, Y + 0.45, 0.7, 'base');
    b.box(cx - 0.43, Y + 0.45, -1.25, cx + 0.43, Y + 0.68, 0.66, 'bed');
    b.box(cx - 0.47, Y + 0.3, -1.35, cx + 0.47, Y + 0.97, -1.29, 'base');
    b.box(cx - 0.47, Y + 0.3, 0.66, cx + 0.47, Y + 0.85, 0.72, 'base');
    b.box(cx - 0.48, Y + 0.55, -0.9, cx - 0.43, Y + 0.95, 0.5, 'base');
    b.box(cx + 0.43, Y + 0.55, -0.9, cx + 0.48, Y + 0.95, 0.5, 'base');
    b.box(cx - 0.35, Y + 0.5, 0.72, cx + 0.35, Y + 0.78, 0.735, 'bed');                          // inserto pediera
    b.box(cx - 0.35, Y + 0.6, -1.37, cx + 0.35, Y + 0.9, -1.35, 'bed');                          // inserto testiera
    b.box(cx + 0.48, Y + 0.8, -0.5, cx + 0.5, Y + 0.93, -0.1, 'purple');                         // comandi sponda
    b.box(cx - 0.5, Y + 0.8, -0.5, cx - 0.48, Y + 0.93, -0.1, 'purple');
    for (const [x, z] of [[-0.38, -1.2], [0.38, -1.2], [-0.38, 0.6], [0.38, 0.6]]) b.box(cx + x - 0.05, Y, z - 0.05, cx + x + 0.05, Y + 0.12, z + 0.05, 'dark');
    return b.finish(room);
  };
  const beds = [bedPart(-1.775), bedPart(0.175)];
  // comodino ruotato di 90 gradi: la faccia con sportello guarda l'armadio (side -1: verso -x, side +1: verso +x)
  const comodino = (x0, side) => {
    const c = new Part({ drop: 2 }), x1 = x0 + 0.74, za = -1.45, zb = -0.96;
    c.box(x0, Y, za, x1, Y + 0.76, zb, 'base');
    c.box(x0 - 0.02, Y + 0.76, za - 0.02, x1 + 0.02, Y + 0.8, zb + 0.02, 'base');
    const fx = side < 0 ? x0 : x1, d = side < 0 ? -1 : 1;
    c.box(Math.min(fx, fx + d * 0.012), Y + 0.12, za + 0.06, Math.max(fx, fx + d * 0.012), Y + 0.7, zb - 0.06, 'purple');
    c.box(Math.min(fx, fx + d * 0.024), Y + 0.5, za + 0.17, Math.max(fx, fx + d * 0.024), Y + 0.54, zb - 0.17, 'dark');
    for (const z of [za + 0.04, zb - 0.08]) for (const x of [x0 + 0.05, x1 - 0.09]) c.box(x, Y, z, x + 0.04, Y + 0.12, z + 0.04, 'dark');
    return c.finish(room);
  };
  const comodini = [comodino(-3.0, -1), comodino(0.66, 1)];

  // ---- pareti dell'ambiente
  const back = new Part();
  back.box(-GI, Y, -GI - 0.12, GI, Y + 3.6, -GI, 'wall');
  back.finish(scene);
  const left = new Part();
  left.box(-GI - 0.12, Y, -GI, -GI, Y + 1.25, 0.0, 'wall');
  left.finish(scene);

  // ---- modelli reali (da Revit): sostituiscono le sagome semplici alla fine
  const hi = new THREE.Group(); hi.visible = false; room.add(hi);
  const hiMats = new Set();
  const BG0 = new THREE.Color('#fafaf8'), BG1 = new THREE.Color('#e4e5e0');
  let pmrem = null;
  if (renderer) {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    try {
      pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.55;
    } catch (e) { console.warn('env', e); }
  }
  const hemi = new THREE.HemisphereLight('#ffffff', '#c9c9c4', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2.1);
  sun.position.set(5, 9, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 5; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  sun.target.position.set(-1, 0, -2.5); scene.add(sun, sun.target);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.0, transparent: true }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.set(-1, Y + 0.002, -2.5); shadowFloor.receiveShadow = true; shadowFloor.visible = false;
  scene.add(shadowFloor);
  const loader = new GLTFLoader();
  const load = b64 => new Promise(res => {
    try {
      const bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      loader.parse(buf.buffer, '', g => res(g.scene), () => res(null));
    } catch (e) { console.warn('glb', e); res(null); }
  });
  // posiziona un modello: rotazione, specchio, centro x e z (oppure z minima) e quota del piano
  function place(model, { rot = 0, mirror = 1, x, z, zmin }) {
    const w = new THREE.Group(); w.add(model.clone(true));
    w.rotation.y = rot; w.scale.x = mirror; w.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(w);
    w.position.set(x - (b.min.x + b.max.x) / 2, Y - b.min.y, zmin !== undefined ? zmin - b.min.z : z - (b.min.z + b.max.z) / 2);
    w.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; hiMats.add(o.material); } });
    hi.add(w);
  }
  Promise.all([load(MODELS.armadio), load(MODELS.letto), load(MODELS.comodino)]).then(([cab, bed, com]) => {
    if (cab) { place(cab, { x: X0 + 0.3, zmin: zf }); place(cab, { mirror: -1, x: X1 - 0.3, zmin: zf }); }
    if (bed) for (const cx of [-1.775, 0.175]) place(bed, { rot: Math.PI / 2, x: cx, z: -0.31 });
    if (com) { place(com, { rot: 0, x: -2.63, zmin: zf }); place(com, { rot: Math.PI, x: 1.03, zmin: zf }); }
  });
  const setHi = o => {
    hi.visible = o > 0.001; shadowFloor.visible = o > 0.001;
    shadowFloor.material.opacity = 0.24 * o;
    for (const m of hiMats) { m.transparent = o < 0.999; m.opacity = o; m.depthWrite = o > 0.5; }
  };
  portal.group.traverse(o => { if (o.isMesh) o.castShadow = true; });

  const R = (a, b, p) => win(p, a, b);

  function update(p, q = 0) {
    const env = 0, swap = ease(q), pm = swap;
    slab.setP(R(0.03, 0.09, p));
    cols.forEach((c, i) => c.setP(R(0.05 + i * 0.012, 0.11 + i * 0.012, p) * (1 - R(0.72, 0.76, p))));
    grid.setP(R(0.09, 0.15, p) * (1 - R(0.83, 0.87, p)));

    zona.setP(R(0.17, 0.23, p));
    zona.morph('zone', 'base', R(0.27, 0.3, p));
    serv.setP(R(0.2, 0.27, p));
    serv.morph('acc', 'base', R(0.27, 0.3, p));
    // dopo la parete testaletto il servizio diventa trasparente, cosi' il resto si legge meglio
    const tr = R(0.3, 0.36, p);
    serv.fade((1 - 0.9 * tr) * (1 - env), (1 - 0.7 * tr) * (1 - env));
    wall.setP(R(0.28, 0.34, p) * (1 - R(0.385, 0.42, p)));

    portal.setP(R(0.4, 0.48, p));
    if (pm > 0) portal.morph('base', 'steel', pm); else portal.morph('acc', 'base', R(0.49, 0.52, p));
    portal.lineMat.opacity = 1 - pm;

    dots.setP(R(0.5, 0.54, p));
    const gl = R(0.52, 0.58, p);
    glowMat.opacity = gl;
    glows.forEach(g => (g.visible = gl > 0.01));

    ghost.setP(R(0.57, 0.6, p) * (1 - R(0.65, 0.68, p)));
    const slide = ease(R(0.6, 0.66, p));
    cabs.forEach(c => {
      c.setP(R(0.58, 0.62, p));
      c.group.position.z = (1 - slide) * 1.6;   // gli armadi entrano dal fronte (a destra c'e' il servizio)
      c.morph('acc', 'base', R(0.66, 0.7, p));
    });

    beds[0].setP(R(0.76, 0.8, p));
    beds[1].setP(R(0.78, 0.82, p));
    comodini.forEach((c, i) => c.setP(R(0.81 + i * 0.01, 0.85 + i * 0.01, p)));
    back.setP(R(0.85, 0.89, p));
    left.setP(R(0.86, 0.9, p));

    // fase finale: l'ambiente si dissolve e le sagome diventano i modelli reali
    slab.fade(1 - env, 1 - env); back.fade(1 - env, 1 - env); left.fade(1 - env, 1 - env);
    if (env > 0.995) { slab.group.visible = false; back.group.visible = false; left.group.visible = false; serv.group.visible = false; }
    const lo = 1 - swap;
    [...cabs, ...beds, ...comodini].forEach(c => { c.fade(lo, lo); if (lo < 0.001) c.group.visible = false; });
    setHi(swap);
    scene.background.copy(BG0).lerp(BG1, env);
  }

  // etichette: testo, punto, punto di direzione, finestra di visibilita' [in0,in1,out0,out1]
  const L = [
    { t: '7,50 – 7,80 – 8,00 m', a: [0, Y + 0.02, GI + 0.32], b: [1, Y + 0.02, GI + 0.32], vis: [0.1, 0.14, 0.83, 0.87] },
    { t: '7,50 – 7,80 – 8,00 m', a: [GI + 0.32, Y + 0.02, 0], b: [GI + 0.32, Y + 0.02, -1], vis: [0.1, 0.14, 0.83, 0.87] },
    { t: '?', a: [0, Y + 1.3, 0], b: null, big: true, vis: [0.11, 0.15, 0.17, 0.2] },
    { t: 'ZONA LETTI', a: W(-0.8, Y + 0.02, 0.0), b: W(1, Y + 0.02, 0.0), vis: [0.22, 0.25, 0.75, 0.78] },
    { t: '3,60 < l < 3,80', a: W(X0 - 0.6, Y + 0.02, 0), b: W(X0 - 0.6, Y + 0.02, 1), vis: [0.21, 0.24, 0.4, 0.43] },
    { t: '5,50 < L < 5,70', a: W(-0.8, Y + 0.02, ZF + 0.4), b: W(1, Y + 0.02, ZF + 0.4), vis: [0.21, 0.24, 0.4, 0.43] },
    { t: 'SERVIZIO', a: [2.8, Y + 0.02, -2.2], b: [3.8, Y + 0.02, -2.2], gray: true, vis: [0.24, 0.27, 0.4, 0.43] },
    { t: 'PARETE TESTALETTO<br>5,50 – 5,70 m', a: W(-0.8, Y + H + 0.45, ZB), b: null, vis: [0.31, 0.35, 0.38, 0.41] },
  ];

  // punti interattivi della camminata
  const HOT = [
    { k: 'armadio', t: 'Armadio di degenza', a: W(X0 + 0.3, Y + 1.55, zf + 0.72) },
    { k: 'letto', t: 'Letto di degenza', a: W(-1.775, Y + 0.82, -0.31) },
    { k: 'comodino', t: 'Comodino', a: W(-2.63, Y + 1.1, zf + 0.5) },
    { k: 'portale', t: 'Portale testaletto', a: W(-0.8, Y + PH - 0.2, ZB + 0.4) },
    { k: 'colonna', t: 'Colonna centrale con ante', a: W(-0.8, Y + 1.0, ZB + 0.38) },
  ];

  return { scene, update, labels: L, hot: HOT };
}
