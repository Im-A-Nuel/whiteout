"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Mark } from "@/lib/useGame";
import { CAMERA, FOG_OPACITY, heightOf, PIT_DEPTH, TILE_BRIGHTNESS, tileState, trailDots, worldX, worldZ, type TileState } from "@/lib/world3d";
import { decor, pitKey, tileKey } from "@/lib/zones";
import { label, sheet, sprite, tiling } from "./textures";

export interface RigApi {
  rotate: (radians: number) => void;
  reset: () => void;
  /** Step through three camera angles: default, overview, horizon. */
  tilt: () => void;
}

export interface SceneProps {
  trail: number[];
  pos: number;
  dir: number | null;
  cold?: boolean;
  glint?: boolean;
  marks: Record<number, Mark>;
  taken: number[];
  onCell?: (cell: number) => void;
  reveal?: { pits: number[]; missed: number[]; cairn?: number | null; hideSprite?: boolean };
  burst?: { cell: number; id: number } | null;
  fallen?: boolean;
  reduced: boolean;
  fontFamily: string;
  api: MutableRefObject<RigApi>;
  onAzimuth: (radians: number) => void;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const CELLS = Array.from({ length: 64 }, (_, i) => i);
const WALL_H = 0.62;
const AMBER = "#ffb547";

/* ------------------------------------------------------------------------------------------------ helpers */

/** A sprite that stands upright and turns around the vertical axis to face the camera. */
function Upright({
  map,
  size = 1,
  y = 0,
  x = 0,
  z = 0,
  bob = 0,
  tint = "#ffffff",
  flip = false,
  frames = 1,
  fps = 0,
  opacity = 1,
}: {
  map: THREE.Texture;
  size?: number;
  y?: number;
  x?: number;
  z?: number;
  bob?: number;
  tint?: string;
  flip?: boolean;
  frames?: number;
  fps?: number;
  opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    const m = ref.current;
    if (!m) return;
    m.getWorldPosition(v);
    m.rotation.y = Math.atan2(camera.position.x - v.x, camera.position.z - v.z);
    m.position.y = y + (bob ? Math.sin(clock.elapsedTime * 2.2 + x * 3) * bob : 0);
    if (frames > 1 && fps > 0) map.offset.x = (Math.floor(clock.elapsedTime * fps) % frames) / frames;
  });
  return (
    <mesh ref={ref} position={[x, y, z]} scale={[flip ? -1 : 1, 1, 1]} raycast={() => null} renderOrder={4}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={map} transparent alphaTest={0.4} side={THREE.DoubleSide} color={tint} opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

/** A sprite lying flat on a surface. */
function Flat({ name, y, x = 0, z = 0, size = 1, tint = 1, blink = false }: { name: string; y: number; x?: number; z?: number; size?: number; tint?: number; blink?: boolean }) {
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: sprite(name), transparent: true, alphaTest: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    [name],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useEffect(() => {
    mat.color.setScalar(tint);
  }, [mat, tint]);
  useFrame(({ clock }) => {
    if (blink) mat.opacity = Math.floor(clock.elapsedTime / 0.6) % 2 === 0 ? 1 : 0.4;
  });
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={mat} raycast={() => null} renderOrder={2}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------------------------------------ terrain */

interface TileProps {
  cell: number;
  state: TileState;
  pit: boolean;
  revealed: boolean;
  hovered: boolean;
  interactive: boolean;
  onClick: (cell: number) => void;
  onHover: (cell: number) => void;
  reduced: boolean;
}

function Tile({ cell, state, pit, revealed, hovered, interactive, onClick, onHover, reduced }: TileProps) {
  const h = heightOf(cell);
  const key = cell === 0 ? "gate" : pit && revealed ? pitKey(cell) : tileKey(cell);
  const topMat = useMemo(() => new THREE.MeshLambertMaterial({ map: sprite(key) }), [key]);
  const sideMat = useMemo(() => new THREE.MeshLambertMaterial({ color: "#2b3166" }), []);
  const mats = useMemo(() => [sideMat, sideMat, topMat, sideMat, sideMat, sideMat], [sideMat, topMat]);
  useEffect(
    () => () => {
      topMat.dispose();
      sideMat.dispose();
    },
    [topMat, sideMat],
  );

  const target = TILE_BRIGHTNESS[state];
  const b = useRef(target);
  const mesh = useRef<THREE.Mesh>(null);
  const sink = pit && revealed ? PIT_DEPTH : 0;
  const deco = decor(cell);
  const showDeco = deco && !(pit && revealed);

  useFrame((_, dt) => {
    const k = reduced ? 1 : Math.min(1, dt * 6);
    b.current += (target - b.current) * k;
    topMat.color.setScalar(b.current);
    sideMat.color.setScalar(0.62 * b.current + 0.04);
    topMat.emissive.set(hovered && interactive ? "#4a3512" : "#000000");
    const m = mesh.current;
    if (m) m.position.y += (h / 2 - sink - m.position.y) * (reduced ? 1 : Math.min(1, dt * 3));
  });

  return (
    <group position={[worldX(cell), 0, worldZ(cell)]}>
      <mesh
        ref={mesh}
        position={[0, h / 2, 0]}
        material={mats}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 6) return; // a drag that turned the camera is not a click
          if (interactive) onClick(cell);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          if (interactive) {
            onHover(cell);
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          onHover(-1);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[0.97, h, 0.97]} />
      </mesh>
      {showDeco && <Flat name={deco!} y={h + 0.012} tint={TILE_BRIGHTNESS[state]} />}
      {state === "neighbor" && <Flat name="hint" y={h + 0.02} blink />}
    </group>
  );
}

/** Soft ground mist: one plane per tile that thins out as the tile becomes known. */
function Mist({ states, reduced }: { states: TileState[]; reduced: boolean }) {
  const mapA = useMemo(() => tiling("fogA"), []);
  const mapB = useMemo(() => tiling("fogB"), []);
  const mats = useMemo(
    () =>
      CELLS.map(
        (c) => new THREE.MeshBasicMaterial({ map: c % 2 ? mapA : mapB, transparent: true, opacity: 0, depthWrite: false, color: "#c9d6f2", toneMapped: false }),
      ),
    [mapA, mapB],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  useFrame(({ clock }, dt) => {
    if (!reduced) {
      mapA.offset.x = (clock.elapsedTime * 0.012) % 1;
      mapA.offset.y = (-clock.elapsedTime * 0.003) % 1;
      mapB.offset.x = (-clock.elapsedTime * 0.008) % 1;
      mapB.offset.y = (clock.elapsedTime * 0.005) % 1;
    }
    const k = reduced ? 1 : Math.min(1, dt * 3);
    CELLS.forEach((c) => {
      const m = mats[c];
      m.opacity += (FOG_OPACITY[states[c]] - m.opacity) * k;
    });
  });
  return (
    <>
      {CELLS.map((c) => (
        <mesh key={c} position={[worldX(c), heightOf(c) + 0.62, worldZ(c)]} rotation={[-Math.PI / 2, 0, (c % 4) * (Math.PI / 2)]} material={mats[c]} renderOrder={3} raycast={() => null}>
          <planeGeometry args={[1.35, 1.35]} />
        </mesh>
      ))}
    </>
  );
}

/** The temple wall: a low parapet with a snow cap, coordinates on top, braziers in the corners. */
function Temple({ fontFamily, reduced }: { fontFamily: string; reduced: boolean }) {
  const wallMap = useMemo(() => sprite("wallH"), []);
  const wallMat = useMemo(() => new THREE.MeshLambertMaterial({ map: wallMap, color: "#8b95d0" }), [wallMap]);
  const snowMat = useMemo(() => new THREE.MeshLambertMaterial({ color: "#8f9cc8" }), []);
  const stoneMat = useMemo(() => new THREE.MeshLambertMaterial({ color: "#3a4180" }), []);
  const slabMat = useMemo(() => new THREE.MeshLambertMaterial({ color: "#0f1230" }), []);
  const letters = useMemo(() => "ABCDEFGH".split("").map((l) => label(l, fontFamily)), [fontFamily]);
  const numbers = useMemo(() => "12345678".split("").map((l) => label(l, fontFamily)), [fontFamily]);
  useEffect(() => () => [wallMat, snowMat, stoneMat, slabMat].forEach((m) => m.dispose()), [wallMat, snowMat, stoneMat, slabMat]);

  const blocks = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = -4; i <= 4; i++) {
      out.push([i + 0.5 - 0.5, -4.5], [i + 0.5 - 0.5, 4.5]);
    }
    for (let j = -3; j <= 3; j++) out.push([-4.5, j], [4.5, j]);
    // pillars sit in the corners, walls fill the gaps between
    return out.filter(([x, z]) => !(Math.abs(x) === 4.5 && Math.abs(z) === 4.5));
  }, []);

  const flame = useMemo(() => sheet("brazierSheet", 3), []);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  useFrame(({ clock }) => {
    if (reduced) return;
    const steps = [1, 0.8, 0.94, 0.74];
    lights.current.forEach((l, i) => {
      if (l) l.intensity = 5.5 * steps[Math.floor(clock.elapsedTime / 0.45 + i) % 4];
    });
  });

  const corners: [number, number][] = [
    [-4.5, -4.5],
    [4.5, -4.5],
    [-4.5, 4.5],
    [4.5, 4.5],
  ];

  return (
    <group>
      <mesh position={[0, -0.18, 0]} material={slabMat}>
        <boxGeometry args={[10, 0.36, 10]} />
      </mesh>
      {blocks.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, WALL_H / 2, 0]} material={wallMat}>
            <boxGeometry args={[1, WALL_H, 1]} />
          </mesh>
          <mesh position={[0, WALL_H + 0.07, 0]} material={snowMat}>
            <boxGeometry args={[1.02, 0.14, 1.02]} />
          </mesh>
        </group>
      ))}
      {corners.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.55, 0]} material={stoneMat}>
            <boxGeometry args={[0.8, 1.1, 0.8]} />
          </mesh>
          <mesh position={[0, 1.13, 0]} material={snowMat}>
            <boxGeometry args={[0.86, 0.12, 0.86]} />
          </mesh>
          <Upright map={flame} size={1.15} y={1.78} frames={3} fps={reduced ? 0 : 6.7} />
          <pointLight ref={(l) => { lights.current[i] = l; }} position={[0, 1.7, 0]} color="#ff9b4a" intensity={5.5} distance={7} decay={1.7} />
        </group>
      ))}
      {letters.map((t, i) => (
        <mesh key={`l${i}`} position={[i - 3.5, WALL_H + 0.16, 4.5]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[0.62, 0.62]} />
          <meshBasicMaterial map={t} transparent alphaTest={0.3} toneMapped={false} />
        </mesh>
      ))}
      {numbers.map((t, i) => (
        <mesh key={`n${i}`} position={[-4.5, WALL_H + 0.16, i - 3.5]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[0.62, 0.62]} />
          <meshBasicMaterial map={t} transparent alphaTest={0.3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------------------------------------ pilgrim */

function Pilgrim({ pos, dir, atStart, fallen, hidden, cold, glint, reduced }: { pos: number; dir: number | null; atStart: boolean; fallen: boolean; hidden: boolean; cold: boolean; glint: boolean; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const cur = useRef(new THREE.Vector3(worldX(pos), heightOf(pos), worldZ(pos)));
  const mesh = useRef<THREE.Mesh>(null);
  const lantern = useRef<THREE.PointLight>(null);
  const frost = useRef<THREE.PointLight>(null);
  const sparks = useRef<THREE.Mesh[]>([]);
  const v = useMemo(() => new THREE.Vector3(), []);
  const maps = useMemo(() => ({ down: sheet("pilDownSheet", 2), side: sheet("pilSideSheet", 2), up: sheet("pilUpSheet", 2) }), []);
  const variant: "down" | "side" | "up" = atStart ? "down" : dir === 0 ? "up" : dir === 2 || dir === 3 ? "side" : "down";
  const flip = dir === 2 && !atStart;
  const map = maps[variant];
  const moving = useRef(false);

  useFrame(({ camera, clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const tx = worldX(pos);
    const tz = worldZ(pos);
    const ty = heightOf(pos);
    const dx = tx - cur.current.x;
    const dz = tz - cur.current.z;
    const dist = Math.hypot(dx, dz);
    if (reduced || dist < 0.002) {
      cur.current.set(tx, ty, tz);
      moving.current = false;
    } else {
      const step = Math.min(dist, 2.6 * dt);
      cur.current.x += (dx / dist) * step;
      cur.current.z += (dz / dist) * step;
      cur.current.y += (ty - cur.current.y) * Math.min(1, dt * 8);
      moving.current = true;
    }
    const hop = moving.current ? Math.abs(Math.sin(clock.elapsedTime * 11)) * 0.12 : 0;
    // snap to the sprite pixel grid (16 pixels per tile) so the motion stays chunky
    g.position.set(Math.round(cur.current.x * 16) / 16, Math.round((cur.current.y + hop) * 16) / 16, Math.round(cur.current.z * 16) / 16);

    const frame = Math.floor(clock.elapsedTime * (moving.current ? 3.4 : 0.85)) % 2;
    maps.down.offset.x = maps.side.offset.x = maps.up.offset.x = frame / 2;

    const m = mesh.current;
    if (m) {
      m.getWorldPosition(v);
      m.rotation.y = Math.atan2(camera.position.x - v.x, camera.position.z - v.z);
      m.position.y = 0.6 + (moving.current || reduced ? 0 : Math.floor(clock.elapsedTime / 0.6) % 2 === 0 ? 0 : 0.03);
    }
    if (lantern.current) lantern.current.intensity = 6.5 * [1, 0.82, 0.94, 0.76][Math.floor(clock.elapsedTime / 0.6) % 4];
    if (frost.current) frost.current.intensity += ((cold ? 5 : 0) - frost.current.intensity) * Math.min(1, dt * 5);
    sparks.current.forEach((s, i) => {
      if (!s) return;
      const t = clock.elapsedTime * 1.6 + i * 0.55;
      const on = glint && Math.sin(t * Math.PI) > 0;
      s.visible = on;
      s.position.y = 0.9 + 0.35 * i + Math.sin(t * 2) * 0.1;
    });
  });

  if (hidden) return null;
  return (
    <group ref={group}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <circleGeometry args={[0.36, 12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh ref={mesh} position={[0, 0.6, 0]} scale={[flip ? -1 : 1, 1, 1]} raycast={() => null} renderOrder={5}>
        <planeGeometry args={[1.25, 1.25]} />
        <meshBasicMaterial map={map} transparent alphaTest={0.4} side={THREE.DoubleSide} color={fallen ? "#7d7d86" : "#ffffff"} toneMapped={false} />
      </mesh>
      <pointLight ref={lantern} position={[0.25, 1.1, 0.1]} color={AMBER} intensity={6.5} distance={8} decay={1.7} />
      <pointLight ref={frost} position={[0, 1.2, 0]} color="#8fd0ff" intensity={0} distance={5} decay={2} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(s) => { if (s) sparks.current[i] = s; }} position={[[-0.55, 0.6, 0.45][i], 1, [0.2, 0.1, -0.4][i]]} visible={false}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshBasicMaterial color="#ffe9a8" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------------------------------------ overlays */

function Trail({ trail }: { trail: number[] }) {
  const dots = useMemo(() => trailDots(trail), [trail]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    dots.forEach((d, i) => {
      o.position.set(d.x, d.y + 0.07, d.z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.count = dots.length;
    m.instanceMatrix.needsUpdate = true;
  }, [dots]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 256]} raycast={() => null} frustumCulled={false}>
      <boxGeometry args={[0.13, 0.08, 0.13]} />
      <meshBasicMaterial color="#ff9b4a" toneMapped={false} />
    </instancedMesh>
  );
}

function Burst({ cell, id, reduced }: { cell: number; id: number; reduced: boolean }) {
  const parts = useRef<THREE.Mesh[]>([]);
  const born = useRef<number | null>(null);
  const dirs = useMemo(() => Array.from({ length: 7 }, (_, i) => [Math.cos((i / 7) * Math.PI * 2) * 0.8, 0.9 + (i % 3) * 0.25, Math.sin((i / 7) * Math.PI * 2) * 0.8]), []);
  useEffect(() => {
    born.current = null;
  }, [id]);
  useFrame(({ clock }) => {
    if (born.current === null) born.current = clock.elapsedTime;
    const t = (clock.elapsedTime - born.current) / 0.7;
    parts.current.forEach((p, i) => {
      if (!p) return;
      const k = reduced ? 1 : Math.min(1, t);
      p.visible = !reduced && t < 1;
      p.position.set(dirs[i][0] * k, 0.5 + dirs[i][1] * k - k * k * 0.5, dirs[i][2] * k);
      p.scale.setScalar(1 - k * 0.7);
    });
  });
  return (
    <group position={[worldX(cell), heightOf(cell), worldZ(cell)]}>
      {dirs.map((_, i) => (
        <mesh key={i} ref={(m) => { if (m) parts.current[i] = m; }}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#ffe9a8" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------------------------------------ surroundings */

function Sky() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(120, 24, 16);
    const bands = ["#0a0c22", "#0f1230", "#151945", "#232a66", "#3a4590"].map((c) => new THREE.Color(c));
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 120; // 1 at the zenith, -1 at the nadir
      // five hard bands, darkest at the top, like the title screen
      const band = bands[Math.floor((1 - Math.min(0.999, Math.max(0, y * 2.6 + 0.28))) * 5)] ?? bands[4];
      band.toArray(colors, i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo} raycast={() => null}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} toneMapped={false} />
    </mesh>
  );
}

/** The snow field around the temple, so the temple stands on something and the mountains have a base. */
function Ground() {
  const map = useMemo(() => tiling("snowA", 40), []);
  return (
    <group>
      <mesh position={[0, -1.52, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <circleGeometry args={[70, 48]} />
        <meshBasicMaterial color="#0b0f2e" toneMapped={false} />
      </mesh>
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <circleGeometry args={[70, 48]} />
        <meshBasicMaterial map={map} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Stars() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 260;
    const arr = new Float32Array(n * 3);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const e = 0.12 + rnd() * 1.2;
      const r = 100;
      arr[i * 3] = Math.cos(a) * Math.cos(e) * r;
      arr[i * 3 + 1] = Math.sin(e) * r;
      arr[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  return (
    <points geometry={geo} raycast={() => null}>
      <pointsMaterial color="#eaf1f7" size={2.5} sizeAttenuation={false} fog={false} toneMapped={false} />
    </points>
  );
}

/** Voxel mountains in three rings, far enough that the orbiting camera never ends up inside one. */
function Mountains() {
  const body = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const rings = [
      { r: 30, n: 90, color: "#12163e", base: 3.5, amp: 8 },
      { r: 38, n: 112, color: "#1a2052", base: 4.5, amp: 10 },
      { r: 47, n: 140, color: "#262e6e", base: 5.5, amp: 12 },
    ];
    const items: { x: number; z: number; w: number; h: number; ry: number; color: string }[] = [];
    rings.forEach((ring, ri) => {
      for (let k = 0; k < ring.n; k++) {
        const a = (k / ring.n) * Math.PI * 2;
        const noise = 0.55 * Math.sin(k * 0.21 + ri * 2) + 0.3 * Math.sin(k * 0.57 + ri) + 0.15 * Math.sin(k * 1.3);
        const h = ring.base + ring.amp * (0.5 + 0.5 * noise);
        items.push({ x: Math.cos(a) * ring.r, z: Math.sin(a) * ring.r, w: ((Math.PI * 2 * ring.r) / ring.n) * 1.08, h, ry: -a, color: ring.color });
      }
    });
    return items;
  }, []);
  useLayoutEffect(() => {
    const b = body.current;
    const c = caps.current;
    if (!b || !c) return;
    const o = new THREE.Object3D();
    const col3 = new THREE.Color();
    let capCount = 0;
    data.forEach((d, i) => {
      o.position.set(d.x, d.h / 2 - 1.5, d.z);
      o.rotation.set(0, d.ry, 0);
      o.scale.set(d.w, d.h, d.w * 1.7);
      o.updateMatrix();
      b.setMatrixAt(i, o.matrix);
      b.setColorAt(i, col3.set(d.color));
      if (d.h > 9) {
        o.position.set(d.x, d.h - 1.5 - 0.3, d.z);
        o.scale.set(d.w * 1.02, 0.7, d.w * 1.74);
        o.updateMatrix();
        c.setMatrixAt(capCount++, o.matrix);
      }
    });
    c.count = capCount;
    b.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
  }, [data]);
  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, data.length]} raycast={() => null} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, data.length]} raycast={() => null} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#5a66a8" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/**
 * The valley: voxel cliffs ringing the temple, with a stepped pagoda on one of them. A cliff on the camera
 * side would hide the board, so every column fades away while it is between the camera and the temple.
 */
function Valley() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const pagoda = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const N = 46;
  const columns = useMemo(() => {
    const out: { a: number; x: number; z: number; w: number; layers: { y: number; h: number; sx: number; color: string }[] }[] = [];
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const r = 13.5 + 1.6 * Math.sin(k * 1.7) + 0.8 * Math.sin(k * 0.6);
      const n = 0.5 + 0.5 * (0.6 * Math.sin(k * 0.37 + 1) + 0.4 * Math.sin(k * 0.93));
      const h = 3.6 + 6.4 * n;
      const w = ((Math.PI * 2 * r) / N) * 1.32;
      out.push({
        a,
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        w,
        layers: [
          { y: -1.4, h: h * 0.62, sx: 1, color: "#262f78" },
          { y: -1.4 + h * 0.62, h: h * 0.38, sx: 0.72, color: "#3945a0" },
          { y: -1.4 + h, h: 0.5, sx: 0.74, color: "#b4c2f0" },
        ],
      });
    }
    return out;
  }, []);
  const k = useMemo(() => new Float32Array(N).fill(1), []);
  const o = useMemo(() => new THREE.Object3D(), []);
  const col3 = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    columns.forEach((c, i) =>
      c.layers.forEach((l, j) => {
        m.setColorAt(i * 3 + j, col3.set(l.color));
      }),
    );
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [columns, col3]);

  const PAGODA_COLUMN = 31;
  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const len = Math.hypot(camera.position.x, camera.position.z) || 1;
    const cx = camera.position.x / len;
    const cz = camera.position.z / len;
    columns.forEach((c, i) => {
      const dot = (Math.cos(c.a) * cx + Math.sin(c.a) * cz);
      const target = dot > 0.2 ? 0 : 1; // on the camera side: collapse
      k[i] += (target - k[i]) * Math.min(1, dt * 5);
      const s = Math.max(0.0001, k[i]);
      c.layers.forEach((l, j) => {
        o.position.set(c.x, (l.y + (l.h * s) / 2) * 1 + (1 - s) * (l.y < 0 ? -2 : -3), c.z);
        o.rotation.set(0, -c.a, 0);
        o.scale.set(c.w * l.sx * s, l.h * s, c.w * 1.5 * l.sx * s);
        o.updateMatrix();
        m.setMatrixAt(i * 3 + j, o.matrix);
      });
    });
    m.instanceMatrix.needsUpdate = true;
    const g = pagoda.current;
    if (g) {
      const col = columns[PAGODA_COLUMN];
      const s = Math.max(0.0001, k[PAGODA_COLUMN]);
      g.visible = s > 0.05;
      g.scale.setScalar(1.05 * s);
      g.position.set(col.x, -1.4 + (col.layers[2].y + 1.4) + 0.5 * s, col.z);
    }
  });

  const mats = useMemo(
    () => ({
      wall: new THREE.MeshBasicMaterial({ color: "#2a3274", toneMapped: false }),
      roof: new THREE.MeshBasicMaterial({ color: "#8a3446", toneMapped: false }),
      snow: new THREE.MeshBasicMaterial({ color: "#eaf1f7", toneMapped: false }),
      glow: new THREE.MeshBasicMaterial({ color: AMBER, toneMapped: false }),
      gold: new THREE.MeshBasicMaterial({ color: "#f2c14e", toneMapped: false }),
    }),
    [],
  );
  const tiers: [number, number][] = [
    [3.6, 1.7],
    [2.8, 1.5],
    [2.0, 1.3],
  ];
  let y = 0;
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, N * 3]} raycast={() => null} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <group ref={pagoda} rotation={[0, 0.3, 0]}>
        {tiers.map(([wd, h], i) => {
          const base = y;
          y += h + 0.34;
          return (
            <group key={i} position={[0, base, 0]}>
              <mesh position={[0, h / 2, 0]} material={mats.wall}>
                <boxGeometry args={[wd * 0.62, h, wd * 0.62]} />
              </mesh>
              <mesh position={[0, h / 2, wd * 0.32]} material={mats.glow}>
                <boxGeometry args={[0.55, 0.6, 0.05]} />
              </mesh>
              <mesh position={[0, h + 0.14, 0]} material={mats.roof}>
                <boxGeometry args={[wd, 0.28, wd]} />
              </mesh>
              <mesh position={[0, h + 0.32, 0]} material={mats.snow}>
                <boxGeometry args={[wd * 1.02, 0.08, wd * 1.02]} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, y + 0.5, 0]} material={mats.gold}>
          <boxGeometry args={[0.13, 1.0, 0.13]} />
        </mesh>
      </group>
    </group>
  );
}

function Moon() {
  return (
    <group position={[-38, 34, -52]}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[3.2, 12, 8]} />
        <meshBasicMaterial color="#eaf1f7" fog={false} toneMapped={false} />
      </mesh>
      <mesh raycast={() => null}>
        <sphereGeometry args={[5.2, 12, 8]} />
        <meshBasicMaterial color="#8fb4d9" transparent opacity={0.16} fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Snow({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const N = 420;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(N * 3);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (rnd() - 0.5) * 20;
      arr[i * 3 + 1] = rnd() * 11;
      arr[i * 3 + 2] = (rnd() - 0.5) * 20;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame(({ clock }, dt) => {
    if (reduced) return;
    const p = geo.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      let y = p.getY(i) - dt * (0.55 + (i % 5) * 0.08);
      if (y < 0) y += 11;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t * 0.7 + i) * dt * 0.12);
    }
    p.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo} raycast={() => null} frustumCulled={false}>
      <pointsMaterial color="#ffffff" size={2.6} sizeAttenuation={false} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
    </points>
  );
}

/* ------------------------------------------------------------------------------------------------ camera */

function Rig({ pilgrimCell, api, reduced, onAzimuth }: { pilgrimCell: number; api: MutableRefObject<RigApi>; reduced: boolean; onAzimuth: (r: number) => void }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const snap = useRef(0);
  const tiltGoal = useRef<number | null>(null);
  const stop = useRef(0);
  const last = useRef(0);
  const sph = useMemo(() => new THREE.Spherical(), []);
  const off = useMemo(() => new THREE.Vector3(), []);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const delta = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    api.current = {
      rotate: (d) => {
        snap.current += d;
      },
      reset: () => {
        const c = controls.current;
        if (!c) return;
        stop.current = 0;
        tiltGoal.current = null;
        camera.position.set(c.target.x, c.target.y + CAMERA.distance * Math.cos(CAMERA.polar), c.target.z + CAMERA.distance * Math.sin(CAMERA.polar));
        c.update();
      },
      tilt: () => {
        // default, then straight down on the board, then the low cinematic angle, then back
        stop.current = (stop.current + 1) % 3;
        tiltGoal.current = [CAMERA.polar, CAMERA.overviewPolar, CAMERA.horizonPolar][stop.current];
      },
    };
  }, [api, camera]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    // follow the pilgrim: move the target and the camera by the same amount so the orbit stays put
    goal.set(worldX(pilgrimCell) * 0.16, heightOf(pilgrimCell) * 0.6, worldZ(pilgrimCell) * 0.16);
    delta.copy(goal).sub(c.target).multiplyScalar(reduced ? 1 : 0.07);
    c.target.add(delta);
    camera.position.add(delta);

    if (snap.current !== 0) {
      let step = snap.current * 0.18;
      snap.current -= step;
      if (Math.abs(snap.current) < 0.004 || reduced) {
        step += snap.current;
        snap.current = 0;
      }
      const off = camera.position.clone().sub(c.target).applyAxisAngle(Y_AXIS, step);
      camera.position.copy(c.target).add(off);
    }
    if (tiltGoal.current !== null) {
      off.copy(camera.position).sub(c.target);
      sph.setFromVector3(off);
      const d = tiltGoal.current - sph.phi;
      sph.phi = reduced || Math.abs(d) < 0.004 ? tiltGoal.current : sph.phi + d * 0.14;
      if (sph.phi === tiltGoal.current) tiltGoal.current = null;
      off.setFromSpherical(sph);
      camera.position.copy(c.target).add(off);
    }
    c.update();
    const az = c.getAzimuthalAngle();
    if (Math.abs(az - last.current) > 0.01) {
      last.current = az;
      onAzimuth(az);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping={!reduced}
      dampingFactor={0.12}
      minDistance={CAMERA.minDistance}
      maxDistance={CAMERA.maxDistance}
      minPolarAngle={CAMERA.minPolar}
      maxPolarAngle={CAMERA.maxPolar}
      rotateSpeed={0.7}
      zoomSpeed={0.7}
    />
  );
}

/* ------------------------------------------------------------------------------------------------ scene */

export function Scene(p: SceneProps) {
  const revealed = !!p.reveal;
  const visited = useMemo(() => new Set(p.trail), [p.trail]);
  const pits = useMemo(() => new Set(p.reveal?.pits ?? []), [p.reveal]);
  const missed = useMemo(() => p.reveal?.missed ?? [], [p.reveal]);
  const takenSet = useMemo(() => new Set(p.taken), [p.taken]);
  const states = useMemo(() => CELLS.map((c) => tileState(c, p.pos, visited, revealed)), [p.pos, visited, revealed]);
  const [hover, setHover] = useState(-1);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  const relicMap = useMemo(() => sprite("relicOver"), []);
  const flagMap = useMemo(() => sprite("flagOver"), []);
  const qMap = useMemo(() => sprite("qOver"), []);
  const cairnMap = useMemo(() => sprite("cairn"), []);

  const interactive = (c: number) => !!p.onCell && !revealed && c !== 0 && c !== p.pos;

  return (
    <>
      <color attach="background" args={["#0a0c22"]} />
      <ambientLight color="#9aa4ea" intensity={2.6} />
      <directionalLight color="#b5d0f0" intensity={1.3} position={[-8, 13, 7]} />

      <Sky />
      <Ground />
      <Stars />
      <Moon />
      <Mountains />
      <Valley />

      <Temple fontFamily={p.fontFamily} reduced={p.reduced} />
      {CELLS.map((c) => (
        <Tile
          key={c}
          cell={c}
          state={states[c]}
          pit={pits.has(c)}
          revealed={revealed}
          hovered={hover === c}
          interactive={interactive(c)}
          onClick={p.onCell ?? (() => undefined)}
          onHover={setHover}
          reduced={p.reduced}
        />
      ))}
      <Mist states={states} reduced={p.reduced} />

      {/* notes the player left, standing on the tiles */}
      {Object.entries(p.marks).map(([cell, mark]) => {
        const c = Number(cell);
        return <group key={c} position={[worldX(c), heightOf(c), worldZ(c)]}><Upright map={mark === 1 ? flagMap : qMap} size={0.95} y={0.55} /></group>;
      })}

      {/* collected relics leave a small mark on the tile */}
      {[...takenSet].map((c) => (
        <group key={`t${c}`} position={[worldX(c) + 0.27, heightOf(c), worldZ(c) + 0.27]}>
          <Flat name="relicIcon" y={0.03} size={0.42} />
        </group>
      ))}

      {/* the map is open: relics that were missed hover above their tiles */}
      {revealed &&
        missed.map((c) => (
          <group key={`m${c}`} position={[worldX(c), heightOf(c), worldZ(c)]}>
            <Upright map={relicMap} size={1} y={0.62} bob={0.06} />
          </group>
        ))}

      {p.reveal?.cairn != null && (
        <group position={[worldX(p.reveal.cairn), heightOf(p.reveal.cairn), worldZ(p.reveal.cairn)]}>
          <Upright map={cairnMap} size={1.15} y={0.58} />
        </group>
      )}

      <Trail trail={p.trail} />
      {p.burst && <Burst key={p.burst.id} cell={p.burst.cell} id={p.burst.id} reduced={p.reduced} />}

      <Pilgrim pos={p.pos} dir={p.dir} atStart={p.trail.length <= 1} fallen={!!p.fallen} hidden={!!p.reveal?.hideSprite} cold={!!p.cold} glint={!!p.glint} reduced={p.reduced} />

      <Snow reduced={p.reduced} />
      <Rig pilgrimCell={p.pos} api={p.api} reduced={p.reduced} onAzimuth={p.onAzimuth} />
    </>
  );
}
