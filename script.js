// A 3D bee that flies across the page as you scroll: built from three.js
// primitives (no model file to download), with flapping wings and a hover bob.
import * as THREE from "three";

const container = document.getElementById("container3D");
const still = window.matchMedia("(prefers-reduced-motion: reduce)");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 13;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xfff6d8, 0x1b2410, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(3, 5, 6);
scene.add(key);
const rim = new THREE.DirectionalLight(0xd1ff48, 1.4);
rim.position.set(-4, 2, -5);
scene.add(rim);

// ---------- materials ----------
function stripes() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d");
  const bands = ["#f4b400", "#1a1408", "#f4b400", "#1a1408", "#f4b400", "#1a1408", "#1a1408"];
  bands.forEach((color, i) => {
    g.fillStyle = color;
    g.fillRect(0, (i * c.height) / bands.length, c.width, c.height / bands.length + 1);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const fuzz = new THREE.MeshStandardMaterial({ color: 0xe9a90c, roughness: 0.95 });
const dark = new THREE.MeshStandardMaterial({ color: 0x17120a, roughness: 0.6 });
const glossy = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.15, metalness: 0.3 });
const striped = new THREE.MeshStandardMaterial({ map: stripes(), roughness: 0.85 });
const wingMat = new THREE.MeshPhysicalMaterial({
  color: 0xe8fbff,
  roughness: 0.1,
  transparent: true,
  opacity: 0.38,
  side: THREE.DoubleSide,
  iridescence: 1,
  iridescenceIOR: 1.3,
  depthWrite: false,
});
const veinMat = new THREE.LineBasicMaterial({ color: 0x3a3320, transparent: true, opacity: 0.55 });

// ---------- the bee (head points along +x) ----------
const bee = new THREE.Group();
const body = new THREE.Group();
bee.add(body);

const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), fuzz);
thorax.scale.set(1.05, 0.95, 0.95);
body.add(thorax);

const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 32), striped);
abdomen.rotation.z = Math.PI / 2; // poles along x, so the texture bands wrap the body
abdomen.scale.set(1, 1.45, 1);
abdomen.position.set(-0.68, -0.06, 0);
body.add(abdomen);

const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 16), dark);
stinger.rotation.z = Math.PI / 2;
stinger.position.set(-1.22, -0.1, 0);
body.add(stinger);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 24), dark);
head.position.set(0.42, 0.02, 0);
body.add(head);

for (const side of [1, -1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), glossy);
  eye.scale.set(0.8, 1.25, 0.7);
  eye.position.set(0.5, 0.06, 0.14 * side);
  body.add(eye);

  // antenna: a bent tube ending in a small knob
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.55, 0.18, 0.06 * side),
    new THREE.Vector3(0.7, 0.42, 0.12 * side),
    new THREE.Vector3(0.88, 0.48, 0.2 * side),
  ]);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.013, 8, false), dark));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), dark);
  knob.position.copy(curve.getPoint(1));
  body.add(knob);

  // three legs per side, each with a femur and a tibia
  [0.15, 0, -0.15].forEach((x, i) => {
    const hip = new THREE.Group();
    hip.position.set(x, -0.2, 0.12 * side);
    hip.rotation.x = side * (0.9 + i * 0.1);
    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.26, 8), dark);
    femur.position.y = -0.13;
    hip.add(femur);
    const knee = new THREE.Group();
    knee.position.y = -0.26;
    knee.rotation.x = -side * 1.2;
    knee.rotation.z = (i - 1) * 0.35;
    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 8), dark);
    tibia.position.y = -0.15;
    knee.add(tibia);
    hip.add(knee);
    body.add(hip);
  });
}

// wings: an elliptical membrane with a few veins, hinged at the thorax
function wing(length, width) {
  const shape = new THREE.Shape();
  shape.absellipse(length / 2, 0, length / 2, width / 2, 0, Math.PI * 2, false, 0);
  const g = new THREE.Group();
  const membrane = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), wingMat);
  g.add(membrane);
  const veins = [];
  for (const k of [-0.25, 0, 0.25]) {
    veins.push(new THREE.Vector3(0.02, 0, 0), new THREE.Vector3(length * 0.92, k * width, 0));
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(veins), veinMat));
  return g;
}
const wings = [];
for (const side of [1, -1]) {
  [
    [0.9, 0.36, 0.08, 0],
    [0.6, 0.26, -0.1, 0.25],
  ].forEach(([len, wid, x, sweep]) => {
    const hinge = new THREE.Group();
    hinge.position.set(x, 0.22, 0.1 * side);
    const w = wing(len, wid);
    w.rotation.x = -Math.PI / 2; // lie flat
    w.rotation.z = side * (Math.PI / 2 + 0.35 + sweep); // point out and back
    hinge.add(w);
    hinge.userData.side = side;
    body.add(hinge);
    wings.push(hinge);
  });
}

bee.scale.setScalar(0.42);
scene.add(bee);

// ---------- where the bee sits for each section ----------
const poses = {
  banner: { position: { x: 0.35, y: -0.2, z: 0 }, rotation: { x: 0.15, y: -0.6, z: 0 } },
  intro: { position: { x: -0.85, y: -0.55, z: -2 }, rotation: { x: 0.35, y: -0.5, z: 0.1 } },
  description: { position: { x: 0.85, y: -0.1, z: -2 }, rotation: { x: 0.2, y: -2.6, z: -0.1 } },
  how: { position: { x: 0.35, y: 0.78, my: 1.0, z: -2 }, rotation: { x: 0.25, y: 0.5, z: 0 } },
  city: { position: { x: 0.6, y: 0.78, my: 1.0, z: -2 }, rotation: { x: 0.3, y: -2.5, z: 0 } },
  contact: { position: { x: -0.75, y: 0.3, z: 0 }, rotation: { x: 0.3, y: -0.4, z: 0 } },
};
let target = poses.banner;

function pickSection() {
  let current = "banner";
  for (const section of document.querySelectorAll(".section")) {
    if (section.getBoundingClientRect().top <= window.innerHeight / 3) current = section.id;
  }
  target = poses[current] ?? target;
}
window.addEventListener("scroll", pickSection, { passive: true });

// On narrow screens keep the bee nearer the middle and a little smaller.
function fit() {
  const narrow = window.innerWidth < 768;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.position.z = narrow ? 18 : 13;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", fit);
fit();

const clock = new THREE.Clock();
const ease = (from, to, k) => from + (to - from) * k;
function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  const t = clock.elapsedTime;
  const k = still.matches ? 1 : 1 - Math.exp(-dt * 2.2);
  const narrow = window.innerWidth < 768 ? 0.45 : 1;
  bee.position.x = ease(bee.position.x, target.position.x * narrow, k);
  bee.position.y = ease(bee.position.y, narrow < 1 && target.position.my !== undefined ? target.position.my : target.position.y, k);
  bee.position.z = ease(bee.position.z, target.position.z, k);
  bee.rotation.x = ease(bee.rotation.x, target.rotation.x, k);
  bee.rotation.y = ease(bee.rotation.y, target.rotation.y, k);
  bee.rotation.z = ease(bee.rotation.z, target.rotation.z, k);

  if (!still.matches) {
    body.position.y = Math.sin(t * 2.2) * 0.06;
    body.rotation.z = Math.sin(t * 1.3) * 0.05;
    const flap = Math.sin(t * 38) * 0.75;
    for (const w of wings) w.rotation.x = w.userData.side * (0.25 + flap);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
pickSection();
frame();
