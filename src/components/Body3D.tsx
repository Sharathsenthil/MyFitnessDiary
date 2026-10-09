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
  attribute float aKind;
  varying vec3 vPos;
  varying vec3 vView;
  varying float vKind;
  void main() {
    vPos = position;
    vKind = aKind;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// Holographic look: glowing rim, fine horizontal scan lines, a sweeping band, and per-muscle heat tint.
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
  varying vec3 vView;
  varying float vKind;

  float smoothSide(float s, float d) {
    if (s == 0.0) return 1.0;
    return smoothstep(-0.004, 0.012, s * d);
  }

  void main() {
    vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
    float fres = pow(1.0 - abs(n.z), 1.6);

    float kind = vKind;
    vec3 base = kind > 1.5 ? vec3(0.30, 0.68, 1.0) : (kind > 0.5 ? vec3(0.55, 0.92, 1.0) : vec3(0.06, 0.32, 0.95));
    float alpha = kind > 1.5 ? 0.6 : (kind > 0.5 ? 0.75 : 0.14 + 0.4 * fres);

    vec3 col = base * (0.42 + 0.85 * fres);
    float lines = 0.6 + 0.4 * step(0.5, fract(vPos.y * 150.0 - uTime * 0.4 * uMotion));
    col *= lines;

    // heat tint from the muscle zones
    float tint = 0.0;
    vec3 tintCol = vec3(0.0);
    float glow = 0.0;
    for (int i = 0; i < NZ; i++) {
      vec3 p = vec3(abs(vPos.x), vPos.y, vPos.z);
      vec3 q = (p - uZC[i]) / uZR[i];
      float w = clamp((1.0 - dot(q, q)) * 2.0, 0.0, 1.0) * smoothSide(uZSide[i], vPos.z);
      if (uWorked[i] > 0.5) { tintCol += uZColor[i] * w; tint += w; }
      if (i == uActive) glow += w;
    }
    tint = min(tint, 1.0);
    if (tint > 0.0) {
      vec3 mixed = tintCol / max(tint, 0.0001);
      col = mix(col, mixed * (0.75 + 0.45 * fres), tint * 0.92);
      alpha = mix(alpha, min(1.0, alpha + 0.3), tint);
    }
    col += glow * vec3(0.22, 0.26, 0.34);
    alpha = min(1.0, alpha + glow * 0.4);

    // sweeping scan band
    float sweep = smoothstep(0.035, 0.0, abs(fract(uTime * 0.14 * uMotion) * 1.2 - 0.1 - vPos.y));
    col += sweep * vec3(0.35, 0.6, 1.0) * uMotion;
    gl_FragColor = vec4(col, alpha);
  }
`;

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
    const DIST = 2.55;
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
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });

    let pickMesh: THREE.Mesh | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let disposed = false;

    new GLTFLoader().load(`/Models/${gender}_hologram_body.glb`, gltf => {
      if (disposed) return;
      // Y-up, 1 unit tall, feet on y = 0, front facing +z (the files are Z-up with the front at -y)
      const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      gltf.scene.updateMatrixWorld(true);
      const parts: THREE.BufferGeometry[] = [];
      const solids: THREE.BufferGeometry[] = [];
      gltf.scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const g = m.geometry.clone();
        g.applyMatrix4(m.matrixWorld).applyMatrix4(rot);
        for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
        const matName = (Array.isArray(m.material) ? m.material[0] : m.material).name;
        const kind = matName === 'ScanlineBlue' ? 2 : matName === 'CyanGlow' ? 1 : 0;
        g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(kind), 1));
        parts.push(g);
        if (kind === 0) solids.push(g.clone());
      });
      const merged = mergeGeometries(parts, false);
      const solid = mergeGeometries(solids.map(s => { s.deleteAttribute('aKind'); return s; }), false);
      parts.forEach(p => p.dispose());
      if (!merged || !solid) { cb.current.onFail(); return; }
      merged.computeBoundingBox();
      const bb = merged.boundingBox!;
      const s = 1 / (bb.max.y - bb.min.y);
      const fit = new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(0, -bb.min.y, 0));
      merged.applyMatrix4(fit); solid.applyMatrix4(fit);
      geometry = merged;
      scene.add(new THREE.Mesh(merged, material));
      pickMesh = new THREE.Mesh(solid, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
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
      return hit ? muscleAt(hit.point.x, hit.point.y, hit.point.z) : null;
    };
    let down: { x: number; y: number; t: number } | null = null;
    const canvas = renderer.domElement;
    const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse' && e.buttons === 0) cb.current.onHover(muscleUnder(e)); };
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
      geometry?.dispose(); pickMesh?.geometry.dispose(); material.dispose(); renderer.dispose();
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
