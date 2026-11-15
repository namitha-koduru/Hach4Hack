import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RotateCw, Layers, Maximize2, RotateCcw, Sparkles } from 'lucide-react';

interface CubieEntry {
  mesh: THREE.Mesh;
  grid: THREE.Vector3; // integer coordinates in {-1, 0, 1}
  basePos: THREE.Vector3;
  isCore: boolean;
}

interface TwistAnim {
  axis: 'x' | 'y' | 'z';
  layer: -1 | 0 | 1;
  direction: 1 | -1;
  progress: number;
  group: THREE.Group;
  entries: CubieEntry[];
}

function createDecalTexture(
  renderer: THREE.WebGLRenderer,
  label: string,
  accent: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Matte ceramic / anodized shell base
    ctx.fillStyle = accent ? '#d4ff33' : '#181c17';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle inset chamfer frame
    ctx.strokeStyle = accent ? '#080a08' : 'rgba(212, 255, 51, 0.42)';
    ctx.lineWidth = 10;
    ctx.strokeRect(26, 26, 460, 460);

    // Corner precision ticks
    ctx.fillStyle = accent ? '#080a08' : '#d4ff33';
    const dotPositions = [
      [54, 54],
      [458, 54],
      [54, 458],
      [458, 458],
    ];
    for (const [dx, dy] of dotPositions) {
      ctx.beginPath();
      ctx.arc(dx, dy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center graphic / glyph
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (label === '</>') {
      ctx.fillStyle = accent ? '#080a08' : '#d4ff33';
      ctx.font = '800 176px "JetBrains Mono", monospace';
      ctx.fillText('</>', 256, 248);
      ctx.font = '700 28px "Syne", sans-serif';
      ctx.fillText('TEAMFORGE', 256, 392);
    } else {
      ctx.fillStyle = accent ? '#080a08' : '#f5f7f2';
      ctx.font = '800 54px "Syne", sans-serif';
      ctx.fillText(label, 256, 240);
      ctx.fillStyle = accent ? '#161a16' : '#d4ff33';
      ctx.font = '600 24px "JetBrains Mono", monospace';
      ctx.fillText('ATOMIC LOCK', 256, 312);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

export const HackathonStage3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [explodePct, setExplodePct] = useState(0);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [hoveredFace, setHoveredFace] = useState<string | null>(null);
  const [twistCount, setTwistCount] = useState(0);

  // Refs synced to animation loop without triggering scene re-creation
  const autoRotateRef = useRef(autoRotate);
  const explodeRef = useRef(explodePct);
  const zoomEnabledRef = useRef(zoomEnabled);
  const triggerTwistRef = useRef<((axis?: 'x' | 'y' | 'z', layer?: -1 | 0 | 1) => void) | null>(
    null
  );
  const resetViewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    explodeRef.current = explodePct / 100;
  }, [explodePct]);

  useEffect(() => {
    zoomEnabledRef.current = zoomEnabled;
  }, [zoomEnabled]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      autoRotateRef.current = false;
    }

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 420;

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software Rasterizer/i.test(String(rendererStr));

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'grab';

    // 2. Scene & Environment
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const defaultCameraPos = new THREE.Vector3(3.45, 2.55, 3.85);
    camera.position.copy(defaultCameraPos);
    camera.lookAt(0, 0, 0);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.enableZoom = zoomEnabledRef.current;
    controls.minDistance = 2.9;
    controls.maxDistance = 7.2;

    // 5. Three-Point + Lime Accent Lighting
    const keyLight = new THREE.DirectionalLight(0xf6f9ee, 2.1);
    keyLight.position.set(5, 7, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9fb8a8, 0.85);
    fillLight.position.set(-5, 2, -4);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xd4ff33, 3.6, 14);
    rimLight.position.set(-2.2, 2.6, 2.4);
    scene.add(rimLight);

    // 6. Stage Group (handles cursor parallax + gentle float)
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const cubeAssembly = new THREE.Group();
    stageGroup.add(cubeAssembly);

    // Materials & Textures
    const codeDecalTex = createDecalTexture(renderer, '</>', true);
    const lockDecalTex = createDecalTexture(renderer, 'FORGE', false);
    const scaleDecalTex = createDecalTexture(renderer, 'SCALE', false);

    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xe6ebe0,
      roughness: 0.28,
      metalness: 0.12,
    });
    const darkPlateMat = new THREE.MeshStandardMaterial({
      color: 0x171b16,
      roughness: 0.36,
      metalness: 0.52,
    });
    const codeFaceMat = new THREE.MeshStandardMaterial({
      map: codeDecalTex,
      roughness: 0.25,
      metalness: 0.14,
      emissive: new THREE.Color(0x2d3a04),
      emissiveIntensity: 0.3,
    });
    const lockFaceMat = new THREE.MeshStandardMaterial({
      map: lockDecalTex,
      roughness: 0.3,
      metalness: 0.35,
    });
    const scaleFaceMat = new THREE.MeshStandardMaterial({
      map: scaleDecalTex,
      roughness: 0.3,
      metalness: 0.35,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xd4ff33,
      emissive: 0xd4ff33,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.2,
    });

    // Build 27 sub-cubies
    const cubieSize = 0.56;
    const spacing = 0.61;
    const cubieGeo = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
    const coreGeo = new THREE.OctahedronGeometry(0.42, 1);

    const cubies: CubieEntry[] = [];
    const interactiveMeshes: THREE.Mesh[] = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const isCore = x === 0 && y === 0 && z === 0;
          if (isCore) {
            const coreMesh = new THREE.Mesh(coreGeo, coreMat);
            cubeAssembly.add(coreMesh);
            cubies.push({
              mesh: coreMesh,
              grid: new THREE.Vector3(0, 0, 0),
              basePos: new THREE.Vector3(0, 0, 0),
              isCore: true,
            });
            continue;
          }

          // Pick outer sticker treatment on center cubies & edges
          const isCenterFace = Math.abs(x) + Math.abs(y) + Math.abs(z) === 1;
          const isAccentEdge = (x + y + z) % 2 === 0;
          const baseMat = isCenterFace
            ? z === 1 || x === 1
              ? codeFaceMat.clone()
              : y === 1
              ? lockFaceMat.clone()
              : scaleFaceMat.clone()
            : isAccentEdge
            ? shellMat.clone()
            : darkPlateMat.clone();

          const mesh = new THREE.Mesh(cubieGeo, baseMat);
          const pos = new THREE.Vector3(x * spacing, y * spacing, z * spacing);
          mesh.position.copy(pos);

          // Crisp micro-edge wireframe outline for precision CAD look
          const edgesGeo = new THREE.EdgesGeometry(cubieGeo);
          const edgeColor = isCenterFace ? 0xd4ff33 : 0x2f362c;
          const edgesMat = new THREE.LineBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: isCenterFace ? 0.55 : 0.45,
          });
          const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat);
          mesh.add(edgeLines);

          mesh.userData = {
            gridX: x,
            gridY: y,
            gridZ: z,
            isCenterFace,
          };

          cubeAssembly.add(mesh);
          const entry: CubieEntry = {
            mesh,
            grid: new THREE.Vector3(x, y, z),
            basePos: pos.clone(),
            isCore: false,
          };
          cubies.push(entry);
          interactiveMeshes.push(mesh);
        }
      }
    }

    // Orbital telemetry rings around the cube
    const ringGeo1 = new THREE.TorusGeometry(1.72, 0.012, 12, isSoftwareGl ? 56 : 112);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xd4ff33,
      transparent: true,
      opacity: 0.42,
    });
    const orbitRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    orbitRing1.rotation.set(Math.PI * 0.38, Math.PI * 0.14, 0);
    stageGroup.add(orbitRing1);

    const ringGeo2 = new THREE.TorusGeometry(1.94, 0.008, 10, isSoftwareGl ? 48 : 96);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xf5f7f2,
      transparent: true,
      opacity: 0.18,
    });
    const orbitRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    orbitRing2.rotation.set(-Math.PI * 0.34, Math.PI * 0.28, 0.2);
    stageGroup.add(orbitRing2);

    // Subtle polar base disc on stage floor
    const discGeo = new THREE.RingGeometry(1.15, 1.85, 64);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xd4ff33,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const floorRing = new THREE.Mesh(discGeo, discMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -1.68;
    stageGroup.add(floorRing);

    // Twist state & helpers
    let activeTwist: TwistAnim | null = null;
    const _axisVec = new THREE.Vector3();
    const _targetPos = new THREE.Vector3();
    const _pointer = new THREE.Vector2(99, 99);
    const _raycaster = new THREE.Raycaster();
    let pointerInside = false;
    let pointerDownPos = { x: 0, y: 0 };
    let hoveredMesh: THREE.Mesh | null = null;

    const startTwist = (
      axis?: 'x' | 'y' | 'z',
      layer?: -1 | 0 | 1,
      direction?: 1 | -1
    ) => {
      if (activeTwist) return;
      const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
      const layers: (-1 | 0 | 1)[] = [-1, 1];
      const chosenAxis = axis ?? axes[Math.floor(Math.random() * axes.length)];
      const chosenLayer = layer ?? layers[Math.floor(Math.random() * layers.length)];
      const chosenDir: 1 | -1 = direction ?? (Math.random() > 0.5 ? 1 : -1);

      const group = new THREE.Group();
      cubeAssembly.add(group);

      const sliceEntries = cubies.filter(
        (c) => !c.isCore && Math.round(c.grid[chosenAxis]) === chosenLayer
      );
      for (const entry of sliceEntries) {
        group.attach(entry.mesh);
      }

      activeTwist = {
        axis: chosenAxis,
        layer: chosenLayer,
        direction: chosenDir,
        progress: 0,
        group,
        entries: sliceEntries,
      };
      setTwistCount((c) => c + 1);
    };

    triggerTwistRef.current = (axis, layer) => {
      startTwist(axis, layer, 1);
    };

    resetViewRef.current = () => {
      camera.position.copy(defaultCameraPos);
      controls.target.set(0, 0, 0);
      controls.update();
      stageGroup.rotation.set(0, 0, 0);
      setExplodePct(0);
      explodeRef.current = 0;
      setAutoRotate(true);
    };

    // Pointer event listeners for hover raycast + click-to-twist + parallax
    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerInside = true;
    };

    const handlePointerLeave = () => {
      pointerInside = false;
      if (hoveredMesh) {
        hoveredMesh = null;
        setHoveredFace(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = 'grabbing';
    };

    const handlePointerUp = (e: PointerEvent) => {
      renderer.domElement.style.cursor = hoveredMesh ? 'pointer' : 'grab';
      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moveDist < 6 && hoveredMesh && !activeTwist) {
        const entry = cubies.find((c) => c.mesh === hoveredMesh);
        if (entry) {
          // Twist along dominant face normal axis
          const ax = Math.abs(entry.grid.x);
          const ay = Math.abs(entry.grid.y);
          const az = Math.abs(entry.grid.z);
          if (ay >= ax && ay >= az && entry.grid.y !== 0) {
            startTwist('y', Math.round(entry.grid.y) as -1 | 1, 1);
          } else if (ax >= ay && ax >= az && entry.grid.x !== 0) {
            startTwist('x', Math.round(entry.grid.x) as -1 | 1, 1);
          } else if (entry.grid.z !== 0) {
            startTwist('z', Math.round(entry.grid.z) as -1 | 1, 1);
          } else {
            startTwist();
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver for crisp responsive framing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation loop
    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let isDisposed = false;

    const animate = (now: number) => {
      if (isDisposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      controls.enableZoom = zoomEnabledRef.current;
      controls.update();

      // Auto rotation & orbital ring motion
      if (autoRotateRef.current) {
        cubeAssembly.rotation.y += dt * 0.34;
        cubeAssembly.rotation.x = Math.sin(elapsed * 0.45) * 0.14;
      }

      orbitRing1.rotation.z += dt * 0.28;
      orbitRing2.rotation.z -= dt * 0.2;

      // Cursor parallax tilt on stageGroup
      const targetStageRx = pointerInside ? -_pointer.y * 0.14 : 0;
      const targetStageRz = pointerInside ? -_pointer.x * 0.12 : 0;
      stageGroup.rotation.x = THREE.MathUtils.damp(stageGroup.rotation.x, targetStageRx, 6, dt);
      stageGroup.rotation.z = THREE.MathUtils.damp(stageGroup.rotation.z, targetStageRz, 6, dt);

      // Gentle breathing levitation
      if (!prefersReducedMotion) {
        stageGroup.position.y = Math.sin(elapsed * 1.4) * 0.06;
      }

      // Explode factor interpolation when not mid-twist
      const explodeFactor = explodeRef.current;
      if (!activeTwist) {
        for (const entry of cubies) {
          if (entry.isCore) {
            const pulse = 1 + explodeFactor * 0.45 + Math.sin(elapsed * 3) * 0.04;
            entry.mesh.scale.setScalar(pulse);
            entry.mesh.rotation.y += dt * 1.2;
            entry.mesh.rotation.x += dt * 0.7;
          } else {
            _targetPos.copy(entry.basePos).multiplyScalar(1 + explodeFactor * 0.72);
            entry.mesh.position.lerp(_targetPos, Math.min(1, dt * 10));
          }
        }
      }

      // Advance active Rubik slice twist
      if (activeTwist) {
        activeTwist.progress = Math.min(1, activeTwist.progress + dt * 3.1);
        const eased = 1 - Math.pow(1 - activeTwist.progress, 3);
        const angle = eased * (Math.PI / 2) * activeTwist.direction;
        activeTwist.group.rotation[activeTwist.axis] = angle;

        if (activeTwist.progress >= 1) {
          // Finalize transforms back onto cubeAssembly
          _axisVec.set(
            activeTwist.axis === 'x' ? 1 : 0,
            activeTwist.axis === 'y' ? 1 : 0,
            activeTwist.axis === 'z' ? 1 : 0
          );
          const rotQuat = new THREE.Quaternion().setFromAxisAngle(
            _axisVec,
            (Math.PI / 2) * activeTwist.direction
          );

          for (const entry of activeTwist.entries) {
            cubeAssembly.attach(entry.mesh);
            entry.grid.applyQuaternion(rotQuat);
            entry.grid.set(
              Math.round(entry.grid.x),
              Math.round(entry.grid.y),
              Math.round(entry.grid.z)
            );
            entry.basePos.set(
              entry.grid.x * spacing,
              entry.grid.y * spacing,
              entry.grid.z * spacing
            );
            entry.mesh.position.copy(entry.basePos);
          }

          cubeAssembly.remove(activeTwist.group);
          activeTwist = null;
        }
      }

      // Raycaster hover inspection
      if (pointerInside && !activeTwist) {
        _raycaster.setFromCamera(_pointer, camera);
        const hits = _raycaster.intersectObjects(interactiveMeshes, false);
        const topHit = hits.length > 0 ? (hits[0].object as THREE.Mesh) : null;

        if (topHit !== hoveredMesh) {
          if (hoveredMesh && hoveredMesh.material instanceof THREE.MeshStandardMaterial) {
            const wasCenter = hoveredMesh.userData.isCenterFace;
            hoveredMesh.material.emissive.setHex(wasCenter ? 0x2d3a04 : 0x000000);
            hoveredMesh.material.emissiveIntensity = wasCenter ? 0.3 : 0;
            hoveredMesh.scale.setScalar(1);
          }
          hoveredMesh = topHit;
          if (hoveredMesh && hoveredMesh.material instanceof THREE.MeshStandardMaterial) {
            hoveredMesh.material.emissive.setHex(0xd4ff33);
            hoveredMesh.material.emissiveIntensity = 0.28;
            hoveredMesh.scale.setScalar(1.045);
            renderer.domElement.style.cursor = 'pointer';
            const g = hoveredMesh.userData;
            setHoveredFace(`NODE [${g.gridX}, ${g.gridY}, ${g.gridZ}] — CLICK TO TWIST`);
          } else {
            renderer.domElement.style.cursor = 'grab';
            setHoveredFace(null);
          }
        }
      }

      renderer.render(scene, camera);

      const scheduleNext = () => {
        if (!isDisposed) {
          rafId = requestAnimationFrame(animate);
        }
      };

      if (isSoftwareGl) {
        setTimeout(scheduleNext, 34);
      } else {
        scheduleNext();
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      codeDecalTex.dispose();
      lockDecalTex.dispose();
      scaleDecalTex.dispose();
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* Isolated WebGL canvas mount (no backdrop-blur overlays above this element) */}
      <div className="relative w-full h-[360px] sm:h-[420px] flex items-center justify-center">
        <div
          ref={mountRef}
          className="w-full h-full select-none touch-none"
          aria-label="Interactive 3D TeamForge Rubik Assembly — drag to orbit or click a face to twist"
        />
      </div>

      {/* Interactive hover telemetry readout (static height avoids layout shift) */}
      <div className="h-6 flex items-center justify-center mb-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#9ca396] tabular-nums">
          {hoveredFace ? (
            <span className="text-[#d4ff33]">{hoveredFace}</span>
          ) : (
            `DRAG TO ROTATE 360° · CLICK CUBE TO TWIST (${twistCount} TWISTS)`
          )}
        </span>
      </div>

      {/* Non-occluding control strip positioned cleanly below the 3D viewport */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#111411] border border-white/10">
        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wider transition-colors ${
            autoRotate
              ? 'bg-[#d4ff33] text-[#080a08] font-bold'
              : 'bg-[#161a16] text-[#9ca396] hover:text-[#f5f7f2] border border-white/10'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Auto Spin</span>
        </button>

        <button
          type="button"
          onClick={() => triggerTwistRef.current?.()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wider bg-[#161a16] text-[#f5f7f2] hover:border-[#d4ff33]/60 hover:text-[#d4ff33] border border-white/10 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-[#d4ff33]" />
          <span>Twist Layer</span>
        </button>

        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161a16] border border-white/10 font-mono text-[11px] uppercase tracking-wider text-[#9ca396]">
          <Sparkles className="w-3.5 h-3.5 text-[#d4ff33]" />
          <span>Explode</span>
          <input
            type="range"
            min={0}
            max={100}
            value={explodePct}
            onChange={(e) => setExplodePct(Number(e.target.value))}
            aria-label="Explode 3D cube layers"
            className="w-16 sm:w-20 accent-[#d4ff33] cursor-pointer"
          />
        </label>

        <button
          type="button"
          onClick={() => setZoomEnabled((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wider transition-colors ${
            zoomEnabled
              ? 'bg-[#d4ff33]/20 text-[#d4ff33] border border-[#d4ff33]/50'
              : 'bg-[#161a16] text-[#9ca396] hover:text-[#f5f7f2] border border-white/10'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Zoom</span>
        </button>

        <button
          type="button"
          onClick={() => resetViewRef.current?.()}
          title="Reset 3D view"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wider bg-[#161a16] text-[#9ca396] hover:text-[#f5f7f2] border border-white/10 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
