// Helpers condivisi: easing, toni di colore, e la classe Part (un gruppo di solidi con spigoli a inchiostro
// che si "disegna" con un fronte di rivelazione e atterra dall'alto).
import * as THREE from 'three';
export { THREE };

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const win = (p, a, b) => clamp((p - a) / (b - a));

export const INK = '#1d1c19';
export const RED = '#b5332f';

// [faccia superiore, faccia x, faccia z] come nel diagramma
export const TONES = {
  base:   ['#ffffff', '#ececec', '#d8d8d8'],
  acc:    ['#eef2fb', '#cfdaf1', '#b4c3e6'],
  zone:   ['#e3ebf8', '#cfd9ee', '#bcc8e3'],
  slab:   ['#fbfbfb', '#e4e4e4', '#cdcdcd'],
  dark:   ['#a4a4a4', '#888888', '#727272'],
  purple: ['#8d8fc8', '#5e61a8', '#4b4e91'],
  bed:    ['#c3cdec', '#a3b3df', '#8c9ed4'],
  wall:   ['#f7f7f5', '#e8e8e6', '#d3d3d1'],
};

export class Part {
  constructor({ dir = [0, 1, 0], drop = 0 } = {}) {
    this.group = new THREE.Group();
    this.drop = drop;
    this.U = {
      uP: { value: 0 }, uMin: { value: 0 }, uMax: { value: 1 }, uOff: { value: 0 },
      uDir: { value: new THREE.Vector3(...dir).normalize() },
    };
    this.tones = {};            // chiave -> [mat top, mat x, mat z]
    this.lineMat = this._patch(new THREE.LineBasicMaterial({ color: INK, transparent: true }));
    this.extra = [];            // materiali non toccati dal fronte (opacita' gestita da fuori)
    this.group.visible = false;
  }

  _patch(m) {
    const U = this.U;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vC;\nuniform float uOff;\nuniform vec3 uDir;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvC = dot((modelMatrix * vec4(position, 1.0)).xyz - vec3(0.0, uOff, 0.0), uDir);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vC;\nuniform float uP;\nuniform float uMin;\nuniform float uMax;')
        .replace('void main() {', 'void main() {\n  if (uP < 0.999 && vC > uMin + uP * (uMax - uMin) + 0.002) discard;');
    };
    return m;
  }

  tone(key) {
    if (!this.tones[key]) {
      this.tones[key] = TONES[key].map(c => this._patch(new THREE.MeshBasicMaterial({ color: c })));
    }
    return this.tones[key];
  }

  // box con spigoli: coordinate assolute (x0,y0,z0,x1,y1,z1)
  box(x0, y0, z0, x1, y1, z1, tone = 'base', edges = true) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const [t, x, z] = this.tone(tone);
    const mesh = new THREE.Mesh(g, [x, x, t, t, z, z]);
    this.group.add(mesh);
    if (edges) {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(g), this.lineMat);
      this.group.add(l);
    }
    return mesh;
  }

  // cilindretto rivolto verso +z (punti dei gas medicali)
  // axis 'z': disco sulla faccia frontale; axis 'x': disco sulla faccia laterale (+x)
  dot(x, y, z, r, color = RED, axis = 'z') {
    const g = new THREE.CylinderGeometry(r, r, 0.02, 16);
    if (axis === 'x') g.rotateZ(Math.PI / 2); else g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    const m = this._patch(new THREE.MeshBasicMaterial({ color }));
    this.group.add(new THREE.Mesh(g, m));
  }

  // tratteggio tra coppie di punti
  dashed(pairs, color = RED, dash = 0.18, gap = 0.12) {
    const pts = [];
    for (const [a, b] of pairs) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
      const len = A.distanceTo(B), dir = B.clone().sub(A).normalize();
      for (let d = 0; d < len; d += dash + gap) {
        pts.push(A.clone().addScaledVector(dir, d), A.clone().addScaledVector(dir, Math.min(d + dash, len)));
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = this._patch(new THREE.LineBasicMaterial({ color, transparent: true }));
    const ls = new THREE.LineSegments(g, m);
    this.group.add(ls);
    return ls;
  }

  // calcola l'intervallo del fronte lungo uDir e aggiunge il gruppo alla scena
  finish(scene) {
    scene.add(this.group);
    this.group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(this.group);
    const d = this.U.uDir.value;
    let mn = Infinity, mx = -Infinity;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const c = x * d.x + y * d.y + z * d.z;
      mn = Math.min(mn, c); mx = Math.max(mx, c);
    }
    this.U.uMin.value = mn - 0.01;
    this.U.uMax.value = mx;
    return this;
  }

  // p: 0..1 (rivelazione), con atterraggio dall'alto
  setP(p) {
    p = clamp(p);
    this.U.uP.value = p;
    this.group.visible = p > 0.001;
    const off = (1 - easeOut(p)) * this.drop;
    this.group.position.y = off;
    this.U.uOff.value = off;
  }

  // trasparenza: o = opacita' delle facce, lineO = opacita' degli spigoli
  fade(o, lineO = o) {
    for (const arr of Object.values(this.tones)) {
      for (const m of arr) { m.transparent = true; m.opacity = o; m.depthWrite = o >= 0.999; }
    }
    this.lineMat.opacity = lineO;
  }

  // sfuma i toni da una chiave a un'altra
  morph(from, to, t) {
    const m = this.tones[from];
    if (!m) return;
    for (let i = 0; i < 3; i++) {
      m[i].color.set(TONES[from][i]).lerp(new THREE.Color(TONES[to][i]), clamp(t));
    }
  }
}
