/**
 * Generates a lightweight premium anatomical human GLB (license-free, self-authored)
 * into `public/models/human-anatomy.glb`.
 *
 * Usage:  node scripts/make-body-model.mjs
 *
 * The model is a reusable studio-quality "digital twin" torso built from PBR
 * primitives. Every part is exported under a stable node name so the runtime can
 * find meshes for breathing, materials and shading.
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

if (!globalThis.FileReader) {
  class FileReaderShim {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.();
      });
    }
  }
  globalThis.FileReader = FileReaderShim;
}
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKIN = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#d9a07a'),
  roughness: 0.42,
  metalness: 0.0,
});
const HAIR = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#4a3627'),
  roughness: 0.85,
  metalness: 0.0,
});

const root = new THREE.Group();

/* ------------------------------------------------------------------ */
/*  Torso (smooth, tapered)                                            */
/* ------------------------------------------------------------------ */
function lathe() {
  const profile = [
    new THREE.Vector2(0.20, 0.76),
    new THREE.Vector2(0.30, 0.80),
    new THREE.Vector2(0.34, 0.86),
    new THREE.Vector2(0.34, 0.94),
    new THREE.Vector2(0.28, 1.04),
    new THREE.Vector2(0.27, 1.12),
    new THREE.Vector2(0.31, 1.24),
    new THREE.Vector2(0.35, 1.33),
    new THREE.Vector2(0.33, 1.38),
    new THREE.Vector2(0.17, 1.40),
    new THREE.Vector2(0.09, 1.46),
  ];
  const geo = new THREE.LatheGeometry(profile, 48);
  geo.computeVertexNormals();
  return geo;
}

function part(name, geometry, material, x = 0, y = 0, z = 0, scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.geometry.computeVertexNormals();
  return mesh;
}

const torso = part('Torso', lathe(), SKIN, 0, 0, 0, [1, 1, 0.72]);
root.add(torso);

/* ── Chest volume highlight (adds mass) ── */
const chest = part('Chest', new THREE.SphereGeometry(0.16, 32, 24), SKIN, 0, 1.22, 0, [1.45, 1.2, 0.5]);
root.add(chest);

/* ── Neck ── */
root.add(part('Neck', new THREE.CylinderGeometry(0.06, 0.09, 0.16, 40), SKIN, 0, 1.52, 0));

/* ── Head ── */
const head = part('Head', new THREE.SphereGeometry(0.17, 48, 32), SKIN, 0, 1.66, 0, [1, 1.12, 0.92]);
root.add(head);
/* hair cap */
root.add(
  part(
    'Hair',
    new THREE.SphereGeometry(0.175, 48, 24),
    HAIR,
    0,
    1.72,
    -0.01,
    [1, 0.62, 0.96],
  ),
);

/* ── Arms (both sides) ── */
const upperArmGeo = new THREE.CapsuleGeometry(0.055, 0.26, 8, 14);
const foreArmGeo = new THREE.CapsuleGeometry(0.045, 0.22, 8, 14);
for (const side of [-1, 1]) {
  const sign = side;
  root.add(part(`Arm${side > 0 ? 'R' : 'L'}_Upper`, upperArmGeo, SKIN, sign * 0.30, 1.2, 0.02));
  root.add(part(`Arm${side > 0 ? 'R' : 'L'}_Fore`, foreArmGeo, SKIN, sign * 0.29, 0.9, 0.02));
  root.add(part(`Arm${side > 0 ? 'R' : 'L'}_Hand`, new THREE.SphereGeometry(0.05, 24, 18), SKIN, sign * 0.29, 0.64, 0.02));
}

/* ── Legs ── */
const thighGeo = new THREE.CapsuleGeometry(0.085, 0.34, 8, 14);
const shinGeo = new THREE.CapsuleGeometry(0.06, 0.3, 8, 14);
for (const side of [-1, 1]) {
  const sign = side;
  root.add(part(`Leg${side > 0 ? 'R' : 'L'}_Thigh`, thighGeo, SKIN, sign * 0.14, 0.55, 0));
  root.add(part(`Leg${side > 0 ? 'R' : 'L'}_Shin`, shinGeo, SKIN, sign * 0.14, 0.22, 0));
  root.add(
    part(
      `Leg${side > 0 ? 'R' : 'L'}_Foot`,
      new THREE.BoxGeometry(0.11, 0.05, 0.24),
      SKIN,
      sign * 0.14,
      0.05,
      0.02,
    ),
  );
}

/* ── Sync all matrixWorld for export ── */
root.updateMatrixWorld(true);

const exporter = new GLTFExporter();
exporter.parse(
  root,
  (gltf) => {
    const out = resolve(__dirname, '../public/models', 'human-anatomy.glb');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(gltf));
    console.log('Wrote', out, `(${Buffer.byteLength(gltf) / 1024 | 0} KB)`);
  },
  (err) => {
    console.error('Export failed', err);
    process.exit(1);
  },
  { binary: true, onlyVisible: true },
);