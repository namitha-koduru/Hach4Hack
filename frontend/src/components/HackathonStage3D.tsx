import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface CubieEntry {
  mesh: THREE.Mesh;
  grid: THREE.Vector3; // integer coordinates in {-1, 0, 1}
  basePos: THREE.Vector3;
  isCore: boolean;
  targetScale: number;
  targetEmissive: number;
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
    ctx.fillStyle = accent ? '#d4ff33' : '#181c17';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = accent ? '#080a08' : 'rgba(212, 255, 51, 0.42)';
    ctx.lineWidth = 10;
    ctx.strokeRect(26, 26, 460, 460);

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

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    camera.position.set(3.45, 2.55, 3.85);
    camera.lookAt(0, 0, 0);

    // 4. OrbitControls — mouse-only 360 orbit, no zoom required
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.045;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.85;

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

    // 6. Stage Group
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
              targetScale: 1,
              targetEmissive: 2.2,
            });
            continue;
          }

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

          const edgesGeo = new THREE.EdgesGeometry(cubieGeo);
          const edgeColor = isCenterFace ? 0xd4ff33 : 0x2f362c;
          const edgesMat = new THREE.LineBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: isCenterFace ? 0.55 : 0.45,
          });
          mesh.add(new THREE.LineSegments(edgesGeo, edgesMat));

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
            targetScale: 1,
            targetEmissive: isCenterFace ? 0.3 : 0,
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

    // Interaction & animation state
    let activeTwist: TwistAnim | null = null;
    const _axisVec = new THREE.Vector3();
    const _targetPos = new THREE.Vector3();
    const _pointer = new THREE.Vector2(99, 99);
    const _raycaster = new THREE.Raycaster();
    let pointerInsideCanvas = false;
    let proximityFactor = 0; // 0 (far) -> 1 (near cube center)
    let currentExplode = 0;
    let pointerDownPos = { x: 0, y: 0 };
    let pointerIsDown = false;
    let hoveredMesh: THREE.Mesh | null = null;
    let spinSpeed = prefersReducedMotion ? 0 : 0.36;

    const startTwist = (
      axis: 'x' | 'y' | 'z',
      layer: -1 | 0 | 1,
      direction: 1 | -1 = 1
    ) => {
      if (activeTwist) return;
      const group = new THREE.Group();
      cubeAssembly.add(group);

      const sliceEntries = cubies.filter(
        (c) => !c.isCore && Math.round(c.grid[axis]) === layer
      );
      for (const entry of sliceEntries) {
        group.attach(entry.mesh);
      }

      activeTwist = {
        axis,
        layer,
        direction,
        progress: 0,
        group,
        entries: sliceEntries,
      };
    };

    const resolveTapLayer = (entry: CubieEntry, hitFaceNormal?: THREE.Vector3) => {
      // Pick axis matching tapped face normal or dominant grid edge so tapping any layer twists it intuitively
      if (hitFaceNormal) {
        const worldNormal = hitFaceNormal
          .clone()
          .transformDirection(entry.mesh.matrixWorld)
          .transformDirection(cubeAssembly.matrixWorld.clone().invert());
        const ax = Math.abs(worldNormal.x);
        const ay = Math.abs(worldNormal.y);
        const az = Math.abs(worldNormal.z);
        if (ay >= ax && ay >= az) {
          return { axis: 'y' as const, layer: Math.round(entry.grid.y) as -1 | 0 | 1 };
        }
        if (ax >= ay && ax >= az) {
          return { axis: 'x' as const, layer: Math.round(entry.grid.x) as -1 | 0 | 1 };
        }
        return { axis: 'z' as const, layer: Math.round(entry.grid.z) as -1 | 0 | 1 };
      }

      const gx = Math.abs(entry.grid.x);
      const gy = Math.abs(entry.grid.y);
      const gz = Math.abs(entry.grid.z);
      if (gy >= gx && gy >= gz) {
        return { axis: 'y' as const, layer: Math.round(entry.grid.y) as -1 | 0 | 1 };
      }
      if (gx >= gy && gx >= gz) {
        return { axis: 'x' as const, layer: Math.round(entry.grid.x) as -1 | 0 | 1 };
      }
      return { axis: 'z' as const, layer: Math.round(entry.grid.z) as -1 | 0 | 1 };
    };

    // Track pointer anywhere in window so approaching the cube smoothly increases explode
    const handleWindowPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const inside = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1;
      pointerInsideCanvas = inside;

      if (inside) {
        _pointer.set(nx, ny);
      }

      // Compute smooth proximity to cube center (works even as pointer approaches canvas edges)
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dx = (e.clientX - cx) / (rect.width * 0.62);
      const dy = (e.clientY - cy) / (rect.height * 0.62);
      const dist = Math.hypot(dx, dy);

      const raw = THREE.MathUtils.clamp(1 - dist / 1.15, 0, 1);
      // Smoothstep curve for organic acceleration near the core
      proximityFactor = raw * raw * (3 - 2 * raw);
    };

    const handleCanvasPointerLeave = () => {
      pointerInsideCanvas = false;
      if (hoveredMesh) {
        hoveredMesh = null;
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerIsDown = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = 'grabbing';
    };

    const handlePointerUp = (e: PointerEvent) => {
      pointerIsDown = false;
      renderer.domElement.style.cursor = hoveredMesh ? 'pointer' : 'grab';

      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moveDist < 7 && !activeTwist) {
        // Raycast at exact tap/click coordinate (works cleanly for both mouse click & touch tap)
        const rect = renderer.domElement.getBoundingClientRect();
        const tapPtr = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        _raycaster.setFromCamera(tapPtr, camera);
        const hits = _raycaster.intersectObjects(interactiveMeshes, false);
        if (hits.length > 0) {
          const hit = hits[0];
          const entry = cubies.find((c) => c.mesh === hit.object);
          if (entry) {
            const { axis, layer } = resolveTapLayer(entry, hit.face?.normal);
            startTwist(axis, layer, 1);
          }
        }
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    renderer.domElement.addEventListener('pointerleave', handleCanvasPointerLeave);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

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

    // Smooth animation loop
    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let isDisposed = false;

    const animate = (now: number) => {
      if (isDisposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      controls.update();

      // Smoothly pause auto-spin while dragging, then ramp back up effortlessly
      const targetSpin = prefersReducedMotion ? 0 : pointerIsDown ? 0 : 0.36;
      spinSpeed = THREE.MathUtils.damp(spinSpeed, targetSpin, 5, dt);
      cubeAssembly.rotation.y += dt * spinSpeed;
      if (!prefersReducedMotion) {
        cubeAssembly.rotation.x = THREE.MathUtils.damp(
          cubeAssembly.rotation.x,
          Math.sin(elapsed * 0.45) * 0.14,
          4,
          dt
        );
      }

      orbitRing1.rotation.z += dt * 0.3;
      orbitRing2.rotation.z -= dt * 0.22;

      // Smooth cursor parallax tilt
      const targetStageRx = pointerInsideCanvas ? -_pointer.y * 0.16 : 0;
      const targetStageRz = pointerInsideCanvas ? -_pointer.x * 0.14 : 0;
      stageGroup.rotation.x = THREE.MathUtils.damp(stageGroup.rotation.x, targetStageRx, 5.5, dt);
      stageGroup.rotation.z = THREE.MathUtils.damp(stageGroup.rotation.z, targetStageRz, 5.5, dt);

      if (!prefersReducedMotion) {
        stageGroup.position.y = Math.sin(elapsed * 1.35) * 0.06;
      }

      // Proximity-driven explode: going closer to the cube smoothly expands layers outward
      const targetExplode = prefersReducedMotion
        ? 0
        : hoveredMesh
        ? Math.max(proximityFactor * 0.92, 0.62)
        : proximityFactor * 0.92;
      currentExplode = THREE.MathUtils.damp(currentExplode, targetExplode, 4.8, dt);

      // Update cubies & glowing core smoothly
      if (!activeTwist) {
        for (const entry of cubies) {
          if (entry.isCore) {
            const pulse = 1 + currentExplode * 0.5 + Math.sin(elapsed * 3) * 0.04;
            entry.mesh.scale.setScalar(pulse);
            entry.mesh.rotation.y += dt * (1.2 + currentExplode * 1.4);
            entry.mesh.rotation.x += dt * 0.7;
            coreMat.emissiveIntensity = 2.0 + currentExplode * 1.4;
          } else {
            _targetPos.copy(entry.basePos).multiplyScalar(1 + currentExplode * 0.76);
            entry.mesh.position.x = THREE.MathUtils.damp(entry.mesh.position.x, _targetPos.x, 8, dt);
            entry.mesh.position.y = THREE.MathUtils.damp(entry.mesh.position.y, _targetPos.y, 8, dt);
            entry.mesh.position.z = THREE.MathUtils.damp(entry.mesh.position.z, _targetPos.z, 8, dt);

            const s = THREE.MathUtils.damp(entry.mesh.scale.x, entry.targetScale, 10, dt);
            entry.mesh.scale.setScalar(s);

            if (entry.mesh.material instanceof THREE.MeshStandardMaterial) {
              entry.mesh.material.emissiveIntensity = THREE.MathUtils.damp(
                entry.mesh.material.emissiveIntensity,
                entry.targetEmissive,
                10,
                dt
              );
            }
          }
        }
      }

      // Silky-smooth easeInOutCubic 90-degree slice twist
      if (activeTwist) {
        activeTwist.progress = Math.min(1, activeTwist.progress + dt * 2.45);
        const t = activeTwist.progress;
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const angle = eased * (Math.PI / 2) * activeTwist.direction;
        activeTwist.group.rotation[activeTwist.axis] = angle;

        if (activeTwist.progress >= 1) {
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
            entry.mesh.position.copy(entry.basePos).multiplyScalar(1 + currentExplode * 0.76);
          }

          cubeAssembly.remove(activeTwist.group);
          activeTwist = null;
        }
      }

      // Raycaster hover inspection (smooth highlight transition)
      if (pointerInsideCanvas && !activeTwist && !pointerIsDown) {
        _raycaster.setFromCamera(_pointer, camera);
        const hits = _raycaster.intersectObjects(interactiveMeshes, false);
        const topHit = hits.length > 0 ? (hits[0].object as THREE.Mesh) : null;

        if (topHit !== hoveredMesh) {
          if (hoveredMesh) {
            const prevEntry = cubies.find((c) => c.mesh === hoveredMesh);
            if (prevEntry && hoveredMesh.material instanceof THREE.MeshStandardMaterial) {
              const wasCenter = hoveredMesh.userData.isCenterFace;
              hoveredMesh.material.emissive.setHex(wasCenter ? 0x2d3a04 : 0x000000);
              prevEntry.targetEmissive = wasCenter ? 0.3 : 0;
              prevEntry.targetScale = 1;
            }
          }
          hoveredMesh = topHit;
          if (hoveredMesh) {
            const nextEntry = cubies.find((c) => c.mesh === hoveredMesh);
            if (nextEntry && hoveredMesh.material instanceof THREE.MeshStandardMaterial) {
              hoveredMesh.material.emissive.setHex(0xd4ff33);
              nextEntry.targetEmissive = 0.35;
              nextEntry.targetScale = 1.05;
              renderer.domElement.style.cursor = 'pointer';
            }
          } else {
            renderer.domElement.style.cursor = 'grab';
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
      window.removeEventListener('pointermove', handleWindowPointerMove);
      renderer.domElement.removeEventListener('pointerleave', handleCanvasPointerLeave);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
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
    <div className="relative flex items-center justify-center w-full">
      <div className="relative w-full h-[360px] sm:h-[430px] flex items-center justify-center">
        <div
          ref={mountRef}
          className="w-full h-full select-none touch-none"
          aria-label="Interactive 3D TeamForge Cube — move near to explode layers, drag to rotate, tap any layer to twist"
        />
      </div>
    </div>
  );
};
