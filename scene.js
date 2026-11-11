// La camera di degenza (metri). x verso est, z verso sud, y in alto. La parete testaletto sta a z = -1.85.
// Misure: maglia 7,80 m; zona letti 5,60 x 3,70 m; altezza portale 3,17 m e armadi 2,03 m (dal modello Revit).
import { THREE, Part, TONES, win, clamp, ease, easeOut } from './core.js';

const Y = 0.3;          // quota del piano finito
const H = 3.17;         // altezza portale
const CAB_H = 2.03;     // altezza armadi
const G = 3.9;          // mezza maglia (asse dei pilastri)
const GI = 3.7;         // filo interno dei pilastri (pilastri 0,40 m): da qui parte il tratteggio
const ZB = -1.85;       // parete testaletto
const X0 = -3.6, X1 = 2.0;   // zona letti: 5,60 m
const ZF = 1.85;             // fronte zona letti: 3,70 m di profondita'

export function buildScene() {
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
  portal.box(X0, Y, ZB, X0 + 0.4, Y + H, zf, 'acc');
  portal.box(X1 - 0.4, Y, ZB, X1, Y + H, zf, 'acc');
  portal.box(X0, Y + 2.55, ZB, X1, Y + H, zf, 'acc');
  portal.box(-1.25, Y, ZB, -0.35, Y + 2.55, ZB + 0.35, 'acc');
  portal.box(-1.17, Y + 0.05, ZB + 0.35, -0.82, Y + 2.1, ZB + 0.362, 'dark');
  portal.box(-0.78, Y + 0.05, ZB + 0.35, -0.43, Y + 2.1, ZB + 0.362, 'dark');
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
    const yt = Y + 2.55, yb = Y + 0.02, zt = zf + 0.02, zb = zf + 1.5;
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
    for (const [x, z] of [[-0.38, -1.2], [0.38, -1.2], [-0.38, 0.6], [0.38, 0.6]]) b.box(cx + x - 0.05, Y, z - 0.05, cx + x + 0.05, Y + 0.12, z + 0.05, 'dark');
    return b.finish(room);
  };
  const beds = [bedPart(-2.45), bedPart(0.7)];
  const comodino = x => {
    const c = new Part({ drop: 2 });
    c.box(x, Y, -1.3, x + 0.4, Y + 0.76, -0.88, 'base');
    c.box(x - 0.04, Y + 0.76, -1.34, x + 0.44, Y + 0.8, -0.84, 'base');
    c.box(x + 0.03, Y + 0.12, -0.88, x + 0.37, Y + 0.7, -0.872, 'purple');
    return c.finish(room);
  };
  const comodini = [comodino(-1.9), comodino(-0.25)];

  // ---- pareti dell'ambiente
  const back = new Part();
  back.box(-GI, Y, -GI - 0.12, GI, Y + 3.6, -GI, 'wall');
  back.finish(scene);
  const left = new Part();
  left.box(-GI - 0.12, Y, -GI, -GI, Y + 1.25, 0.0, 'wall');
  left.finish(scene);

  const R = (a, b, p) => win(p, a, b);

  function update(p) {
    slab.setP(R(0.03, 0.09, p));
    cols.forEach((c, i) => c.setP(R(0.05 + i * 0.012, 0.11 + i * 0.012, p) * (1 - R(0.72, 0.76, p))));
    grid.setP(R(0.09, 0.15, p) * (1 - R(0.83, 0.87, p)));

    zona.setP(R(0.17, 0.23, p));
    zona.morph('zone', 'base', R(0.27, 0.3, p));
    serv.setP(R(0.2, 0.27, p));
    serv.morph('acc', 'base', R(0.27, 0.3, p));
    // dopo la parete testaletto il servizio diventa trasparente, cosi' il resto si legge meglio
    const tr = R(0.3, 0.36, p);
    serv.fade(1 - 0.9 * tr, 1 - 0.7 * tr);
    wall.setP(R(0.28, 0.34, p) * (1 - R(0.385, 0.42, p)));

    portal.setP(R(0.4, 0.48, p));
    portal.morph('acc', 'base', R(0.49, 0.52, p));

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
    { t: 'Gas medicali integrati nei montanti', a: W(X0 + 0.42, Y + 1.55, ZB + 0.2) },
    { t: 'Luce indiretta sotto la trave', a: W(X0 + 1.0, Y + 2.5, zf + 0.5) },
    { t: 'Armadi a innesto sui montanti', a: W(X0 + 0.3, Y + 1.05, zf + 0.62) },
    { t: 'Il portale diventa arredo', a: W(-0.8, Y + 1.75, ZB + 0.37) },
  ];

  return { scene, update, labels: L, hot: HOT };
}
