// Stylised 3D brain with a 16-electrode EEG headset, driven by scroll progress.
// An illustration: procedural folds, not scanned anatomy. C3 and C4 sit over the motor areas.
import * as THREE from 'three';

function hash(x, y, z) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf), l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
}
const sm = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));

function ridged(x, y, z) { return 1 - Math.abs(2 * vnoise(x, y, z) - 1); }
function hemisphere(side) {
  const g = new THREE.SphereGeometry(1, 220, 160), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const sx = 0.56, sy = 0.78, sz = 1.2, deep = new THREE.Color(0x58353a), mid = new THREE.Color(0xd2aaa8), light = new THREE.Color(0xf3dad3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const lat = Math.abs(x);
    // lobes: narrow frontal pole, full parietal, temporal lobe hanging low and lateral, flat base
    let ys = sy, zs = sz, xs = sx;
    zs *= 1 + 0.06 * Math.max(0, z) * (y > 0 ? 1 : 0);
    if (z > 0.5) xs *= 1 - 0.18 * (z - 0.5);
    const temporal = Math.exp(-(((z + 0.05) / 0.55) ** 2)) * Math.exp(-(((y + 0.55) / 0.4) ** 2)) * lat;
    let Y = y * ys;
    if (y < -0.3) Y = -0.3 * ys + (y + 0.3) * ys * 0.55;
    // domain-warped folds
    const wx = (vnoise(x * 1.7 + 4, y * 1.7, z * 1.7) - 0.5) * 0.9, wy = (vnoise(x * 1.7, y * 1.7 + 7, z * 1.7) - 0.5) * 0.9, wz = (vnoise(x * 1.7, y * 1.7, z * 1.7 + 3) - 0.5) * 0.9;
    const px = (x + wx + side * 3.1) * 3.3, py = (y + wy) * 3.3, pz = (z + wz) * 3.3;
    const f1 = ridged(px, py, pz), f2 = ridged(px * 2.1 + 9, py * 2.1, pz * 2.1), fold = 0.65 * f1 + 0.35 * f2;
    // named grooves: lateral fissure and central sulcus
    const lf = Math.exp(-(((y + 0.12 - 0.22 * z) / 0.07) ** 2)) * (z > -0.55 && z < 0.8 ? 1 : 0) * smoothLat(lat);
    const cs = Math.exp(-(((z - 0.1 + 0.28 * (0.9 - y)) / 0.045) ** 2)) * (y > 0.05 ? 1 : 0);
    const d = 1 + 0.085 * fold - 0.11 * lf - 0.07 * cs + 0.1 * temporal;
    let X = x * xs * d; Y = Y * d; const Z = z * zs * d;
    if (side * X < 0) X *= 0.05;
    pos.setXYZ(i, X + side * 0.04, Y - 0.1 * temporal, Z);
    const shade = Math.min(1, Math.max(0, fold * 1.15 - 0.25)), gr = Math.min(1, lf + cs);
    c.copy(deep).lerp(mid, Math.min(1, shade * 2)).lerp(light, Math.max(0, shade * 2 - 1)).lerp(deep, gr * 0.7);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.35 }));
}
function smoothLat(l) { return Math.min(1, Math.max(0, (l - 0.35) / 0.3)); }
function hemisphereOld(side) {
  const g = new THREE.SphereGeometry(1, 150, 110), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const sx = 0.56, sy = 0.8, sz = 1.18, deep = new THREE.Color(0x4a2326), light = new THREE.Color(0xeab5ad), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), px = x + side * 3.1;
    const f1 = 1 - Math.abs(2 * vnoise(px * 2.4, y * 2.4, z * 2.4) - 1), f2 = 1 - Math.abs(2 * vnoise(px * 5.8 + 9, y * 5.8, z * 5.8) - 1);
    const d = 1 + 0.07 * f1 + 0.03 * f2;
    let X = x * d * sx; const Y = y * d * sy, Z = z * d * sz;
    if (side * X < 0) X *= 0.06;
    pos.setXYZ(i, X + side * 0.05, Y, Z);
    c.copy(deep).lerp(light, Math.min(1, 0.25 + 0.75 * Math.pow(f1, 0.7)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 }));
}

// 10-20 style positions: [name, colatitude from the top (deg), azimuth from the front, positive = right (deg)]
const SITES = [['Fp1', 75, -20], ['Fp2', 75, 20], ['F7', 75, -55], ['F3', 40, -45], ['F4', 40, 45], ['F8', 75, 55], ['T7', 75, -90], ['C3', 40, -90],
  ['Cz', 0, 0], ['C4', 40, 90], ['T8', 75, 90], ['P3', 40, -135], ['Pz', 40, 180], ['P4', 40, 135], ['O1', 75, -160], ['O2', 75, 160]];
const RAD = new THREE.Vector3(1.14, 1.1, 1.44);

export function createBrain(el, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0d0d0d);
  el.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xfff0e6, 0x2a1a1a, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9b0, 0.6); rim.position.set(-4, 1, -3); scene.add(rim);

  const brain = new THREE.Group();
  const hl = hemisphere(-1), hr = hemisphere(1);
  brain.add(hl, hr);
  const cb = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ color: 0xc98f88, roughness: 0.7 }));
  cb.scale.set(0.5, 0.28, 0.42); cb.position.set(0, -0.62, -0.95);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.7, 24), new THREE.MeshStandardMaterial({ color: 0xd9a39c, roughness: 0.7 }));
  stem.position.set(0, -0.78, -0.3); stem.rotation.x = -0.35;
  brain.add(cb, stem);
  scene.add(brain);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: 0xfff4e6, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  cap.scale.copy(RAD).multiplyScalar(0.97); scene.add(cap);

  const device = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.2), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.4, metalness: 0.3 }));
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: 0xf2a93b }));
  led.position.set(0.2, 0.1, 0.105); device.add(box, led);
  device.position.set(0, 0.35, -2.05); scene.add(device);

  const elecGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 20);
  const electrodes = SITES.map(([name, th, ph]) => {
    const t = th * Math.PI / 180, p = ph * Math.PI / 180;
    const dir = new THREE.Vector3(Math.sin(t) * Math.sin(p), Math.cos(t), Math.sin(t) * Math.cos(p));
    const base = dir.clone().multiply(RAD);
    const nrm = new THREE.Vector3(dir.x / (RAD.x * RAD.x), dir.y / (RAD.y * RAD.y), dir.z / (RAD.z * RAD.z)).normalize();
    const motor = name === 'C3' || name === 'C4';
    const mat = new THREE.MeshStandardMaterial({ color: motor ? 0xf2a93b : 0xfff4e6, emissive: motor ? 0xf2a93b : 0x000000, emissiveIntensity: 0.2, roughness: 0.4 });
    const mesh = new THREE.Mesh(elecGeo, mat);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    scene.add(mesh);
    const wirePts = new Float32Array(25 * 3), wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.BufferAttribute(wirePts, 3));
    const wire = new THREE.Line(wg, new THREE.LineBasicMaterial({ color: motor ? 0xf2a93b : 0x8a8a8a, transparent: true, opacity: 0 }));
    wire.frustumCulled = false; scene.add(wire);
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0 }));
    scene.add(pulse);
    const glow = motor ? new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })) : null;
    if (glow) { glow.position.copy(dir.clone().multiply(new THREE.Vector3(0.9, 0.9, 1.15))); scene.add(glow); }
    return { name, dir, base, nrm, motor, mesh, wire, wirePts, pulse, glow, end: device.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, -0.12, 0.05)), seed: Math.random() };
  });
  const byName = Object.fromEntries(electrodes.map((e) => [e.name, e]));

  function resize() {
    const w = el.clientWidth || 600, h = el.clientHeight || 600;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el); resize();

  const v3 = new THREE.Vector3(), curveA = new THREE.Vector3(), curveB = new THREE.Vector3();
  function curvePoint(e, cur, t, out) {
    const ctrl = curveA.copy(cur).add(e.end).multiplyScalar(0.5).add(curveB.copy(e.nrm).multiplyScalar(0.55));
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    out.set(cur.x * a + ctrl.x * b + e.end.x * c, cur.y * a + ctrl.y * b + e.end.y * c, cur.z * a + ctrl.z * b + e.end.z * c);
  }
  function project(obj, name) {
    if (!opts.onLabel) return;
    v3.copy(obj).project(camera);
    opts.onLabel(name, (v3.x * 0.5 + 0.5) * (el.clientWidth || 1), (-v3.y * 0.5 + 0.5) * (el.clientHeight || 1), v3.z < 1);
  }

  let step = -1;
  const tmp = new THREE.Vector3(), cur = new THREE.Vector3();
  function render(p, time) {
    const capA = sm(0.36, 0.5, p), devA = sm(0.34, 0.5, p), mu = sm(0.55, 0.7, p), decode = sm(0.78, 0.9, p);
    cap.material.opacity = capA * 0.13;
    device.scale.setScalar(Math.max(0.001, devA));
    led.visible = Math.sin(time * 6) > -0.3;
    electrodes.forEach((e, i) => {
      const a = sm(0.12 + i * 0.008, 0.26 + i * 0.008, p), out = 1 + (1 - a) * 1.7;
      cur.copy(e.base).multiplyScalar(out);
      e.mesh.position.copy(cur); e.mesh.scale.setScalar(Math.max(0.001, a));
      const arr = e.wirePts;
      for (let k = 0; k <= 24; k++) { curvePoint(e, cur, k / 24, tmp); arr[k * 3] = tmp.x; arr[k * 3 + 1] = tmp.y; arr[k * 3 + 2] = tmp.z; }
      e.wire.geometry.attributes.position.needsUpdate = true;
      e.wire.material.opacity = devA * a * (e.motor ? 0.9 : 0.45);
      const live = p > 0.5 ? 1 : 0;
      const t = ((time * 0.55 + e.seed) % 1);
      curvePoint(e, cur, t, tmp); e.pulse.position.copy(tmp);
      e.pulse.material.opacity = live * devA * (e.motor ? 1 : 0.35) * (e.name === 'C4' ? 1 - decode * 0.85 : 1);
      if (e.glow) {
        const q = e.name === 'C4' ? 1 - decode * 0.85 : 1;
        const beat = 0.5 + 0.5 * Math.sin(time * 9 + (e.name === 'C4' ? 1.3 : 0));
        e.glow.material.opacity = mu * q * (0.3 + 0.3 * beat);
        e.mesh.material.emissiveIntensity = 0.2 + mu * q * (0.6 + 0.6 * beat);
      }
    });
    const ang = -0.75 + p * 2.6, elev = 0.42 - p * 0.12, dist = 6.2;
    camera.position.set(Math.sin(ang) * Math.cos(elev) * dist, Math.sin(elev) * dist + 0.2, Math.cos(ang) * Math.cos(elev) * dist);
    camera.lookAt(0, -0.35, -0.2);
    renderer.render(scene, camera);
    project(byName.C3.glow.position, 'C3'); project(byName.C4.glow.position, 'C4'); project(device.position, 'amp');
    const s = p < 0.12 ? 0 : p < 0.3 ? 1 : p < 0.46 ? 2 : p < 0.62 ? 3 : p < 0.8 ? 4 : 5;
    if (s !== step) { step = s; if (opts.onStep) opts.onStep(s); }
  }
  return { render, resize };
}
