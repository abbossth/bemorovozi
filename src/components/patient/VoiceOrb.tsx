"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type OrbPhase = "idle" | "listening" | "thinking" | "speaking" | "error";

export type VoiceOrbHandle = {
  /** 0..1 smoothed audio amplitude, pushed every animation frame from the caller's analyser loop. */
  setLevel: (level: number) => void;
};

type Props = {
  phase: OrbPhase;
  size?: number;
};

type Palette = {
  base: number;
  mid: number;
  bright: number;
  fleck: number;
};

// listening = the app's own brand teal/mint (this is the "default" look — the
// patient being listened to). thinking reuses the existing amber token.
// speaking is blue to visually read as "the AI, not you" while it talks.
const PALETTES: Record<OrbPhase, Palette> = {
  idle: { base: 0x0b5548, mid: 0x0f6e5c, bright: 0xeafbf6, fleck: 0x35c29b },
  listening: { base: 0x0f6e5c, mid: 0x35c29b, bright: 0xeafbf6, fleck: 0xe5534b },
  thinking: { base: 0x92620e, mid: 0xd97706, bright: 0xfff4d6, fleck: 0xffffff },
  speaking: { base: 0x1e3a8a, mid: 0x3d6be0, bright: 0xdce8ff, fleck: 0x5b8def },
  error: { base: 0x7a2420, mid: 0xe5534b, bright: 0xffd9d5, fleck: 0xe5534b },
};

// Base rotation speed per phase (rad/s) — deliberately slow while listening
// and fast while speaking/thinking, independent of audio level.
const ROTATION_BASE: Record<OrbPhase, number> = {
  idle: 0.05,
  listening: 0.12,
  thinking: 1.0,
  speaking: 0.75,
  error: 0.03,
};

const COUNT = 3200;

export const VoiceOrb = forwardRef<VoiceOrbHandle, Props>(function VoiceOrb({ phase, size = 190 }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const levelRef = useRef(0);
  const phaseRef = useRef<OrbPhase>(phase);

  useImperativeHandle(ref, () => ({
    setLevel: (level: number) => {
      levelRef.current = level;
    },
  }));

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    let disposed = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let frameId = 0;
    let cleanupInner: (() => void) | null = null;

    (async () => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch {
        return; // no WebGL bundle available — the CSS glow fallback stays visible behind the canvas
      }
      if (disposed || !containerRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 3.8;

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return; // WebGL unavailable on this device — degrade to the plain glow div
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size, size, true);
      containerRef.current.appendChild(renderer.domElement);

      function makeSpriteTexture() {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const ctx = c.getContext("2d")!;
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.25, "rgba(255,255,255,0.9)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      }
      const spriteTex = makeSpriteTexture();

      const GROUP_RADIUS = 1.15;
      const positions = new Float32Array(COUNT * 3);
      const basePositions = new Float32Array(COUNT * 3);
      const normals = new Float32Array(COUNT * 3);
      const seeds = new Float32Array(COUNT);
      const colorsByPhase: Record<OrbPhase, Float32Array> = {
        idle: new Float32Array(COUNT * 3),
        listening: new Float32Array(COUNT * 3),
        thinking: new Float32Array(COUNT * 3),
        speaking: new Float32Array(COUNT * 3),
        error: new Float32Array(COUNT * 3),
      };
      const rolls = new Float32Array(COUNT);

      function fibonacciSpherePoint(i: number, n: number) {
        const offset = 2 / n;
        const increment = Math.PI * (3 - Math.sqrt(5));
        const y = i * offset - 1 + offset / 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const phi = (i % n) * increment;
        return { x: Math.cos(phi) * r, y, z: Math.sin(phi) * r };
      }

      for (let i = 0; i < COUNT; i++) {
        const p = fibonacciSpherePoint(i, COUNT);
        const radial = GROUP_RADIUS * (0.97 + Math.random() * 0.05);
        const jx = (Math.random() - 0.5) * 0.02;
        const jy = (Math.random() - 0.5) * 0.02;
        const jz = (Math.random() - 0.5) * 0.02;
        const x = p.x * radial + jx;
        const y = p.y * radial + jy;
        const z = p.z * radial + jz;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        basePositions[i * 3] = x;
        basePositions[i * 3 + 1] = y;
        basePositions[i * 3 + 2] = z;
        normals[i * 3] = p.x;
        normals[i * 3 + 1] = p.y;
        normals[i * 3 + 2] = p.z;
        seeds[i] = Math.random() * Math.PI * 2;
        rolls[i] = Math.random();
      }

      const tmpColor = new THREE.Color();
      (Object.keys(PALETTES) as OrbPhase[]).forEach((ph) => {
        const pal = PALETTES[ph];
        const arr = colorsByPhase[ph];
        for (let i = 0; i < COUNT; i++) {
          const roll = rolls[i];
          const hex = roll < 0.04 ? pal.fleck : roll < 0.18 ? pal.bright : roll < 0.55 ? pal.mid : pal.base;
          tmpColor.setHex(hex);
          arr[i * 3] = tmpColor.r;
          arr[i * 3 + 1] = tmpColor.g;
          arr[i * 3 + 2] = tmpColor.b;
        }
      });

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colorsByPhase.idle.slice(), 3));

      const material = new THREE.PointsMaterial({
        size: 0.085,
        map: spriteTex,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      const particleSystem = new THREE.Points(geometry, material);
      const orbGroup = new THREE.Group();
      orbGroup.add(particleSystem);
      scene.add(orbGroup);

      const CORE_COUNT = 7;
      const coreGeom = new THREE.BufferGeometry();
      const corePos = new Float32Array(CORE_COUNT * 3);
      for (let k = 0; k < CORE_COUNT; k++) {
        const ang = (k / CORE_COUNT) * Math.PI * 2;
        const rad = 0.21 + Math.random() * 0.33;
        corePos[k * 3] = Math.cos(ang) * rad;
        corePos[k * 3 + 1] = (Math.random() - 0.5) * 0.42;
        corePos[k * 3 + 2] = Math.sin(ang) * rad;
      }
      coreGeom.setAttribute("position", new THREE.BufferAttribute(corePos, 3));
      const coreColorAttr = new Float32Array(CORE_COUNT * 3);
      coreGeom.setAttribute("color", new THREE.BufferAttribute(coreColorAttr, 3));
      const coreMat = new THREE.PointsMaterial({
        size: 0.5,
        map: spriteTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const coreSystem = new THREE.Points(coreGeom, coreMat);
      orbGroup.add(coreSystem);

      function setCoreColor(hex: number) {
        tmpColor.setHex(hex);
        for (let k = 0; k < CORE_COUNT; k++) {
          coreColorAttr[k * 3] = tmpColor.r;
          coreColorAttr[k * 3 + 1] = tmpColor.g;
          coreColorAttr[k * 3 + 2] = tmpColor.b;
        }
        coreGeom.attributes.color.needsUpdate = true;
      }
      setCoreColor(PALETTES.idle.bright);

      // Smoothly cross-fades the particle colors + rotation speed target when
      // `phase` changes, instead of snapping — the orb should read as one
      // living thing shifting mood, not a hard cut between three components.
      let colorFrom: Float32Array = colorsByPhase.idle;
      let colorTo: Float32Array = colorsByPhase.idle;
      let colorT = 1;
      let lastPhase: OrbPhase = "idle";
      let rotSpeed = ROTATION_BASE.idle;
      let rotationY = 0;
      let smoothedLevel = 0;
      let elapsed = 0;
      let lastTime = performance.now();

      function animate() {
        frameId = requestAnimationFrame(animate);
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        elapsed += dt;
        const t = elapsed;
        const currentPhase = phaseRef.current;

        if (currentPhase !== lastPhase) {
          colorFrom = colorTo;
          colorTo = colorsByPhase[currentPhase];
          colorT = 0;
          lastPhase = currentPhase;
          setCoreColor(PALETTES[currentPhase].bright);
        }
        if (colorT < 1) {
          colorT = Math.min(1, colorT + dt / 0.45);
          const arr = geometry.attributes.color.array as Float32Array;
          for (let i = 0; i < arr.length; i++) {
            arr[i] = colorFrom[i] + (colorTo[i] - colorFrom[i]) * colorT;
          }
          geometry.attributes.color.needsUpdate = true;
        }

        smoothedLevel += (levelRef.current - smoothedLevel) * 0.2;
        const reactiveLevel = smoothedLevel > 0.045 ? smoothedLevel : 0;
        const audioReactive = currentPhase === "listening" || currentPhase === "speaking";
        const speakLevel = audioReactive ? reactiveLevel : 0;

        // Rotation: always turning, base speed set per phase (slow listening,
        // fast speaking/thinking) with a modest audio-reactive boost.
        const boost = currentPhase === "listening" ? speakLevel * 0.6 : currentPhase === "speaking" ? speakLevel * 1.2 : 0;
        rotSpeed += (ROTATION_BASE[currentPhase] + boost - rotSpeed) * 0.08;
        rotationY += rotSpeed * dt;
        orbGroup.rotation.y = rotationY;

        // Scale: audio-reactive pulse while listening/speaking; a gentle
        // idle breathing while connecting; a distinct tighter/faster
        // "considering" shimmer while thinking (no live audio to react to).
        let scale = 1;
        const pos = geometry.attributes.position.array as Float32Array;
        if (currentPhase === "thinking") {
          const shimmer = Math.sin(t * 3.4) * 0.05;
          scale = 1 + shimmer;
          for (let i = 0; i < COUNT; i++) {
            const wobble = 1 + Math.sin(t * 2.2 + seeds[i]) * 0.035;
            pos[i * 3] = basePositions[i * 3] * wobble;
            pos[i * 3 + 1] = basePositions[i * 3 + 1] * wobble;
            pos[i * 3 + 2] = basePositions[i * 3 + 2] * wobble;
          }
          geometry.attributes.position.needsUpdate = true;
        } else {
          for (let i = 0; i < COUNT; i++) {
            pos[i * 3] = basePositions[i * 3];
            pos[i * 3 + 1] = basePositions[i * 3 + 1];
            pos[i * 3 + 2] = basePositions[i * 3 + 2];
          }
          geometry.attributes.position.needsUpdate = true;
          if (currentPhase === "idle") {
            scale = 1 + Math.sin(t * 1.1) * 0.04;
          } else if (audioReactive) {
            const pulse = Math.sin(t * 10.0) * speakLevel * 0.35;
            scale = 1 + speakLevel * 0.4 + pulse;
          } else if (currentPhase === "error") {
            scale = 1 + Math.sin(t * 0.8) * 0.02;
          }
        }
        orbGroup.scale.setScalar(scale);

        coreMat.opacity = 0.3 + speakLevel * 0.55 + (currentPhase === "thinking" ? 0.25 : 0);
        material.opacity = 0.85 + speakLevel * 0.15;

        renderer!.render(scene, camera);
      }
      animate();

      cleanupInner = () => {
        cancelAnimationFrame(frameId);
        geometry.dispose();
        material.dispose();
        coreGeom.dispose();
        coreMat.dispose();
        spriteTex.dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      if (cleanupInner) cleanupInner();
      else {
        renderer?.dispose();
        renderer?.domElement.remove();
      }
    };
  }, [size]);

  return <div ref={containerRef} style={{ width: size, height: size }} className="pointer-events-none" />;
});
