import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Gender, MuscleId } from '../types';
import { ZONES, muscleAt } from '../lib/muscleZones';

const NZ = ZONES.length;
const vec = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);

const VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Holographic look: glowing rim, fine horizontal contour lines, a sweeping band, and per-muscle heat tint.
const FRAG = /* glsl */ `
  #define NZ ${NZ}
  uniform float uTime;
  uniform float uMotion;
  uniform vec3 uZC[NZ];
  uniform vec3 uZR[NZ];
  uniform float uZSide[NZ];
  uniform float uWorked[NZ];
  uniform vec3 uZColor[NZ];
  uniform int uActive;
  varying vec3 vPos;
  varying vec3 vNormal;

  float smoothSide(float s, float d) {
    if (s == 0.0) return 1.0;
    return smoothstep(-0.004, 0.012, s * d);
  }

  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float fres = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.2);

    // fine horizontal contour lines (anti-aliased)
    float v = vPos.y * 120.0 - uTime * 0.5 * uMotion;
    float dist = min(fract(v), 1.0 - fract(v));
    float line = 1.0 - smoothstep(0.06, 0.06 + fwidth(v) * 1.4, dist);

    vec3 base = vec3(0.16, 0.5, 1.0);
    vec3 col = base * (0.10 + 0.55 * line) + vec3(0.45, 0.8, 1.0) * fres * 1.1;
    float alpha = 0.16 + 0.5 * line + 0.55 * fres;

    // heat tint from the muscle zones
    float tint = 0.0;
    vec3 tintCol = vec3(0.0);
    float glow = 0.0;
    vec3 p = vec3(abs(vPos.x), vPos.y, vPos.z);
    for (int i = 0; i < NZ; i++) {
      vec3 q = (p - uZC[i]) / uZR[i];
      float w = clamp((1.0 - dot(q, q)) * 2.0, 0.0, 1.0) * smoothSide(uZSide[i], vPos.z);
      if (uWorked[i] > 0.5) { tintCol += uZColor[i] * w; tint += w; }
      if (i == uActive) glow += w;
    }
    tint = min(tint, 1.0);
    if (tint > 0.0) {
      vec3 mixed = tintCol / max(tint, 0.0001);
      col = mix(col, mixed * (0.45 + 0.5 * line + 0.5 * fres), tint * 0.9);
      alpha = mix(alpha, max(alpha, 0.55 + 0.3 * line), tint);
    }
    col += glow * vec3(0.2, 0.25, 0.32);
    alpha = min(1.0, alpha + glow * 0.35);

    // sweeping scan band
    float sweep = smoothstep(0.035, 0.0, abs(fract(uTime * 0.14 * uMotion) * 1.2 - 0.1 - vPos.y));
    col += sweep * vec3(0.3, 0.55, 1.0) * uMotion;
    gl_FragColor = vec4(col, alpha);
  }
`;

// Which file each body uses. `flip` turns a model that faces away from the camera (-z) round to face +z.
const MODELS: Record<Gender, { file: string; flip: boolean }> = {
  male: { file: 'human_body_base_mesh_male.glb', flip: false },
  female: { file: 'female_base_mesh.glb', flip: true },
};

/** A model exported with a mirrored transform can have its triangles wound inside-out; turn them back. */
function faceOutward(g: THREE.BufferGeometry) {
  const pos = g.attributes.position, idx = g.index;
  const n = idx ? idx.count : pos.count;
  const at = (i: number) => (idx ? idx.getX(i) : i);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let volume = 0;
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, at(i)); b.fromBufferAttribute(pos, at(i + 1)); c.fromBufferAttribute(pos, at(i + 2));
    volume += a.dot(b.cross(c));
  }
  if (volume >= 0 || !idx) return;
  for (let i = 0; i < n; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
  idx.needsUpdate = true;
}

const heatColor = (t: number) => new THREE.Color().setHSL((205 - 205 * t) / 360, 1, 0.62 - 0.08 * t);

export interface Body3DProps {
  gender: Gender;
  /** Per muscle: -1 = not worked, otherwise 0-1 relative intensity */
  heat: Record<MuscleId, number>;
  active: MuscleId | null;
  onHover: (m: MuscleId | null) => void;
  onPick: (m: MuscleId | null) => void;
  onFail: () => void;
}

/** Rotatable 3D hologram of the body. Drag to spin it; hover or tap a muscle. */
export default function Body3D({ gender, heat, active, onHover, onPick, onFail }: Body3DProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setHeat: (h: Record<MuscleId, number>, a: MuscleId | null) => void; turnTo: (az: number) => void } | null>(null);
  const cb = useRef({ onHover, onPick, onFail });
  cb.current = { onHover, onPick, onFail };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch { cb.current.onFail(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'holo3d-canvas';
    el.appendChild(renderer.domElement);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    const target = new THREE.Vector3(0, 0.5, 0);
    let DIST = 2.6;
    camera.position.set(0, 0.5, DIST);
    camera.lookAt(target);

    // Spin around the body only: vertical drags are left to the page so scrolling still works on a phone.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enablePan = false; controls.enableZoom = false;
    controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2;
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.9;
    controls.autoRotate = motion === 1; controls.autoRotateSpeed = 1.6;
    renderer.domElement.style.touchAction = 'pan-y';
    let idleTimer = 0;
    controls.addEventListener('start', () => { controls.autoRotate = false; window.clearTimeout(idleTimer); });
    controls.addEventListener('end', () => { if (motion) idleTimer = window.setTimeout(() => { controls.autoRotate = true; }, 5000); });

    const uniforms = {
      uTime: { value: 0 }, uMotion: { value: motion },
      uZC: { value: ZONES.map(z => vec(z.c)) }, uZR: { value: ZONES.map(z => vec(z.r)) },
      uZSide: { value: ZONES.map(z => z.side as number) },
      uWorked: { value: ZONES.map(() => 0) }, uZColor: { value: ZONES.map(() => new THREE.Color(0x3b82f6)) },
      uActive: { value: -1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    });

    // Depth pre-pass: only the nearest surface glows, so the far side never shows through the body
    const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
    let pickMesh: THREE.Mesh | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let disposed = false;

    const model = MODELS[gender];
    new GLTFLoader().load(`/Models/${model.file}`, gltf => {
      if (disposed) return;
      gltf.scene.updateMatrixWorld(true);
      const parts: THREE.BufferGeometry[] = [];
      gltf.scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || /eye/i.test(m.name)) return;
        const g = m.geometry.clone();
        g.applyMatrix4(m.matrixWorld);
        if (model.flip) g.rotateY(Math.PI);
        for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        if (!g.attributes.normal) g.computeVertexNormals();
        parts.push(g);
      });
      const merged = parts.length ? mergeGeometries(parts, false) : null;
      parts.forEach(p => p.dispose());
      if (!merged) { cb.current.onFail(); return; }
      faceOutward(merged);
      // 1 unit tall, feet on y = 0, centred on x, and on z at the middle of the torso (front faces +z)
      merged.computeBoundingBox();
      const bb = merged.boundingBox!;
      const s = 1 / (bb.max.y - bb.min.y);
      merged.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, 0).scale(s, s, s);
      const pos = merged.attributes.position;
      let zMin = Infinity, zMax = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y > 0.55 && y < 0.7) { zMin = Math.min(zMin, pos.getZ(i)); zMax = Math.max(zMax, pos.getZ(i)); }
      }
      if (isFinite(zMin)) merged.translate(0, 0, -(zMin + zMax) / 2);
      geometry = merged;
      pickMesh = new THREE.Mesh(merged, material);
      pickMesh.renderOrder = 1;
      scene.add(new THREE.Mesh(merged, depthOnly), pickMesh);
      pickMesh.updateMatrixWorld(true);
      setLoading(false);
    }, undefined, () => { if (!disposed) cb.current.onFail(); });

    // ----- picking -----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const muscleUnder = (e: PointerEvent): MuscleId | null => {
      if (!pickMesh) return null;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(pickMesh, false)[0];
      return hit ? muscleAt(hit.point.x, hit.point.y, hit.point.z, hit.face?.normal.z ?? 0) : null;
    };
    let down: { x: number; y: number; t: number } | null = null;
    const canvas = renderer.domElement;
    let moveRaf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.buttons !== 0 || moveRaf) return;
      moveRaf = requestAnimationFrame(() => { moveRaf = 0; cb.current.onHover(muscleUnder(e)); });
    };
    const onLeave = () => cb.current.onHover(null);
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    const onUp = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 500) cb.current.onPick(muscleUnder(e));
      down = null;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);

    // ----- sizing, turning, render loop (paused while off screen) -----
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      // far enough back that the whole body and the outstretched arms fit
      const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      DIST = Math.max(1.12 / (2 * half), 1.05 / (2 * half * camera.aspect));
      const dir = camera.position.clone().sub(target).normalize();
      camera.position.copy(target).addScaledVector(dir, DIST);
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let turn: { from: number; to: number; t0: number } | null = null;
    api.current = {
      setHeat: (h, a) => {
        ZONES.forEach((z, i) => {
          const v = h[z.id] ?? -1;
          uniforms.uWorked.value[i] = v >= 0 ? 1 : 0;
          if (v >= 0) uniforms.uZColor.value[i].copy(heatColor(v));
        });
        uniforms.uActive.value = a ? ZONES.findIndex(z => z.id === a) : -1;
      },
      turnTo: az => {
        controls.autoRotate = false;
        let from = controls.getAzimuthalAngle(), to = az;
        while (to - from > Math.PI) to -= 2 * Math.PI;
        while (to - from < -Math.PI) to += 2 * Math.PI;
        turn = { from, to, t0: performance.now() };
      },
    };

    let visible = true, raf = 0;
    const clock = new THREE.Clock();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      uniforms.uTime.value = clock.getElapsedTime();
      if (turn) {
        const k = Math.min(1, (performance.now() - turn.t0) / 600), e = k * k * (3 - 2 * k);
        const a = turn.from + (turn.to - turn.from) * e;
        camera.position.set(target.x + Math.sin(a) * DIST, target.y, target.z + Math.cos(a) * DIST);
        camera.lookAt(target);
        if (k === 1) turn = null;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    frame();
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.05 });
    io.observe(el);

    return () => {
      disposed = true; api.current = null;
      cancelAnimationFrame(raf); window.clearTimeout(idleTimer);
      io.disconnect(); ro.disconnect(); controls.dispose();
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp);
      geometry?.dispose(); material.dispose(); depthOnly.dispose(); renderer.dispose();
      canvas.remove();
    };
  }, [gender]);

  useEffect(() => { api.current?.setHeat(heat, active); }, [heat, active, loading]);

  return (
    <div className="holo3d" ref={host}>
      {loading && <div className="holo3d-loading">Loading 3D body…</div>}
      <div className="holo3d-bar">
        <button type="button" className="chip" onClick={() => api.current?.turnTo(0)}>Front</button>
        <button type="button" className="chip" onClick={() => api.current?.turnTo(Math.PI / 2)}>Side</button>
        <button type="button" className="chip" onClick={() => api.current?.turnTo(Math.PI)}>Back</button>
      </div>
      <span className="holo3d-hint">Drag to rotate</span>
    </div>
  );
}
