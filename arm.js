// Anatomical forearm and hand pair, rigged from BodyParts3D meshes (CC BY-SA 2.1 Japan).
// BodyParts3D, (c) The Database Center for Life Science, licensed under CC Attribution-Share Alike 2.1 Japan.
// Right arm is the scanned model; the left arm is its mirror. Coordinates below are the dataset's (mm):
// z runs up the body (fingers point toward -z), y is front/back (palm is toward -y), x is side to side.
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const C = { seamless: 0xAEBBC0, bone: 0xEDE4D0, muscle: 0x7B2D2B, tendon: 0xCDBB95, pulse: 0xF2A93B };
const CLIP_Z = 835;           // muscle meshes are drawn from here up; tendons below are drawn as moving tubes

function muscleMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: C.muscle, roughness: 0.55, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const u = { uAct: { value: 0 } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uAct = u.uAct;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uAct;\nvarying float vZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZ = position.z;\nfloat belly = smoothstep(840.0, 940.0, position.z) * (1.0 - smoothstep(1010.0, 1070.0, position.z));\ntransformed += normal * uAct * belly * 5.5;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vZ;')
      .replace('void main() {', 'void main() {\n if (vZ < ' + CLIP_Z.toFixed(1) + ') discard;');
  };
  return m;
}

export async function createArm(el, opts = {}) {
  const base = opts.base || 'assets/anatomy/';
  const rig = await (await fetch(base + 'rig.json')).json();
  const loader = new STLLoader();
  const ids = new Set([...rig.carpals, ...rig.forearm, ...Object.values(rig.muscles), ...rig.thumb.ids, ...Object.values(rig.fingers).flatMap((f) => f.ids)]);
  const geo = {};
  let done = 0;
  await Promise.all([...ids].map(async (id) => {
    let g = await loader.loadAsync(`${base}FMA${id}.stl`);
    if (Object.values(rig.muscles).includes(id)) {
      g.deleteAttribute('normal');
      g = mergeVertices(g, 0.05);
    }
    g.computeVertexNormals();
    geo[id] = g;
    if (opts.onProgress) opts.onProgress(++done / ids.size);
  }));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(opts.background ?? C.seamless);
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 600);
  camera.position.set(0, -10, 112);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -10, 0);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 40; controls.maxDistance = 420;
  controls.minPolarAngle = 0.5; controls.maxPolarAngle = 2.3;
  controls.minAzimuthAngle = -1.3; controls.maxAzimuthAngle = 1.3;

  scene.add(new THREE.HemisphereLight(0xF4F1EC, 0x7C8A90, 1.0));
  const key = new THREE.DirectionalLight(0xFFF3E2, 2.3);
  key.position.set(-30, 50, 60); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 10, far: 220 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xCFDCE6, 0.7); fill.position.set(40, 10, 40); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floor.position.z = -4; floor.receiveShadow = true; scene.add(floor);   // shadow lands on a wall behind the arms

  const boneMat = new THREE.MeshStandardMaterial({ color: C.bone, roughness: 0.68, metalness: 0 });
  const W = V(rig.wrist);

  function buildArm(mirror) {
    const outer = new THREE.Group();
    outer.rotation.order = 'YXZ'; outer.rotation.set(Math.PI / 2, Math.PI, 0);
    outer.scale.set(mirror ? -0.1 : 0.1, 0.1, 0.1);
    const inner = new THREE.Group(); inner.position.copy(W).negate(); outer.add(inner);
    const mesh = (id, mat = boneMat, shadow = true) => { const m = new THREE.Mesh(geo[id], mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
    [...rig.carpals, ...rig.forearm].forEach((id) => inner.add(mesh(id)));

    const joints = [];
    function chain(parent, ids, pivots) {
      // ids: bone meshes after the metacarpal; pivots: joint centres in order; returns the joint groups
      const groups = []; let prevPivot = new THREE.Vector3(0, 0, 0); let host = parent;
      pivots.forEach((p, i) => {
        const g = new THREE.Group(); g.position.copy(p).sub(prevPivot); host.add(g);
        if (ids[i]) { const m = mesh(ids[i]); m.position.copy(p).negate(); g.add(m); }
        groups.push(g); host = g; prevPivot = p;
      });
      return groups;
    }
    const fingers = Object.entries(rig.fingers).map(([name, f]) => {
      inner.add(mesh(f.ids[0]));
      const g = chain(inner, [f.ids[1], f.ids[2], f.ids[3], null], [V(f.mcp), V(f.pip), V(f.dip), V(f.tip)]);
      return { name, mcp: g[0], pip: g[1], dip: g[2], tip: g[3] };
    });
    // thumb: metacarpal turns at the carpometacarpal joint, then proximal phalanx, then distal
    const t = rig.thumb;
    const tg = chain(inner, [t.ids[0], t.ids[1], t.ids[2], null], [V(t.cmc), V(t.mcp), V(t.ip), V(t.tip)]);
    const thumb = { cmc: tg[0], mcp: tg[1], ip: tg[2], tip: tg[3] };

    const mats = [];
    const muscles = {};
    Object.entries(rig.muscles).forEach(([k, id]) => {
      const mat = muscleMaterial(); mats.push(mat);
      const m = mesh(id, mat, false); m.renderOrder = 2; inner.add(m); muscles[k] = mat;
    });

    const tendonMat = new THREE.MeshStandardMaterial({ color: C.tendon, roughness: 0.4, emissive: new THREE.Color(C.pulse), emissiveIntensity: 0 });
    const tendons = fingers.map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), tendonMat); m.castShadow = true; inner.add(m); return m; });
    const thumbTendon = new THREE.Mesh(new THREE.BufferGeometry(), tendonMat); inner.add(thumbTendon);
    const toInner = (g, off) => inner.worldToLocal(g.localToWorld(off.clone()));
    const front = (mm) => new THREE.Vector3(0, -mm, 0);

    const arm = { outer, act: 0 };
    arm.set = (a, pulse = 0) => {
      arm.act = a;
      const e = a * a * (3 - 2 * a);
      fingers.forEach((f, i) => {
        const k = [1.0, 1.05, 1.0, 0.92][i];
        f.mcp.rotation.x = -(-0.12 + e * 1.35) * k;
        f.pip.rotation.x = -(e * 1.75) * k;
        f.dip.rotation.x = -(e * 1.05) * k;
      });
      thumb.cmc.rotation.set(-e * 0.28, -e * 0.55, 0);
      thumb.mcp.rotation.set(-e * 0.35, -e * 0.45, 0);
      thumb.ip.rotation.set(-e * 0.30, -e * 0.40, 0);
      muscles.fdp.userData.u.uAct.value = e; muscles.fpl.userData.u.uAct.value = e; muscles.fcr.userData.u.uAct.value = e * 0.7;
      muscles.br.userData.u.uAct.value = e * 0.3; muscles.ed.userData.u.uAct.value = e * 0.12;
      mats.forEach((m) => { m.opacity = 0.42 + 0.34 * e; });
      muscles.ed.opacity = 0.42;
      tendonMat.emissiveIntensity = pulse * (0.55 + 0.25 * Math.sin(performance.now() / 70));
      outer.updateMatrixWorld(true);
      fingers.forEach((f, i) => {
        const x0 = THREE.MathUtils.lerp(W.x, f.mcp.position.x + 0, 0.0);
        const pts = [
          new THREE.Vector3(THREE.MathUtils.lerp(W.x, rig.fingers[f.name].mcp[0], 0.45), W.y - 14, CLIP_Z + 6),
          new THREE.Vector3(THREE.MathUtils.lerp(W.x, rig.fingers[f.name].mcp[0], 0.7), W.y - 15, W.z + 4),
          toInner(f.mcp, front(7)), toInner(f.pip, front(5.5)), toInner(f.dip, front(4.5)), toInner(f.tip, front(3.5)),
        ];
        tendons[i].geometry.dispose();
        tendons[i].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.9, 6, false);
      });
      const tp = [new THREE.Vector3(W.x - 12, W.y - 14, CLIP_Z + 6), new THREE.Vector3(W.x - 16, W.y - 14, W.z + 2), toInner(thumb.mcp, front(6)), toInner(thumb.ip, front(5)), toInner(thumb.tip, front(3.5))];
      thumbTendon.geometry.dispose();
      thumbTendon.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tp), 24, 0.9, 6, false);
    };
    arm.set(0);
    return arm;
  }

  const right = buildArm(false), left = buildArm(true);
  left.outer.position.x = -17; right.outer.position.x = 17;
  scene.add(left.outer, right.outer);

  function resize() {
    const w = el.clientWidth || 800, h = el.clientHeight || 600;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    // keep both arms (about +/-32 mm... scene units) inside the frame on narrow columns
    const dist = Math.max(112, 32 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
  }
  new ResizeObserver(resize).observe(el); resize();

  const state = { left: 0, right: 0, pulseL: 0, pulseR: 0 };
  let running = true;
  function loop() {
    if (!running) return;
    left.set(state.left, state.pulseL); right.set(state.right, state.pulseR);
    controls.update(); renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return {
    // side is 'left' or 'right' (the patient's hand); a is 0 (open) to 1 (closed); pulse is 0 or 1 (stimulation on)
    set(side, a, pulse = 0) { if (side === 'left') { state.left = a; state.pulseL = pulse; } else { state.right = a; state.pulseR = pulse; } },
    camera, controls, renderer, scene,
    dispose() { running = false; renderer.dispose(); },
  };
}
