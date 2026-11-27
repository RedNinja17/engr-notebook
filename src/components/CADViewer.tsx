import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Layers, UploadCloud } from 'lucide-react';

interface CADViewerProps {
  nodeId?: string;
  fileUrl?: string;
}

interface OCCTMeshData {
  attributes: {
    position: { array: ArrayLike<number> };
    normal?: { array: ArrayLike<number> };
  };
  index?: { array: ArrayLike<number> };
}

interface OCCTResult {
  success: boolean;
  meshes: OCCTMeshData[];
}

interface OCCTInstance {
  ReadStepFile(bytes: Uint8Array, params?: Record<string, unknown>): OCCTResult;
}

declare global {
  interface Window {
    occtimportjs?: (options?: { locateFile?: (file: string) => string }) => Promise<OCCTInstance>;
  }
}

const fileCache = new Map<string, { bytes: Uint8Array; name: string }>();

function toFloat32(values: ArrayLike<number>): Float32Array {
  return values instanceof Float32Array ? values : Float32Array.from(values);
}

function toIndexArray(values: ArrayLike<number>): Uint16Array | Uint32Array {
  if (values instanceof Uint16Array || values instanceof Uint32Array) return values;
  let max = 0;
  for (let i = 0; i < values.length; i++) max = Math.max(max, values[i]);
  return max <= 65535 ? Uint16Array.from(values) : Uint32Array.from(values);
}

export const CADViewer: React.FC<CADViewerProps> = ({ nodeId, fileUrl }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meshCount, setMeshCount] = useState(0);
  const [explodeFactor, setExplodeFactor] = useState(0);

  const cached = nodeId ? fileCache.get(nodeId) : undefined;
  const [stepBytes, setStepBytes] = useState<Uint8Array | null>(cached?.bytes || null);
  const [fileName, setFileName] = useState<string | null>(cached?.name || null);

  const assemblyGroupRef = useRef<THREE.Group | null>(null);
  const meshCentersRef = useRef(new Map<THREE.Mesh, THREE.Vector3>());
  const controlsRef = useRef<OrbitControls | null>(null);
  const assemblyCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const maxDimensionRef = useRef<number>(100);

  useEffect(() => {
    if (nodeId) {
      const existing = fileCache.get(nodeId);
      if (existing) {
        setStepBytes(existing.bytes);
        setFileName(existing.name);
      } else if (!fileUrl) {
        setStepBytes(null);
        setFileName(null);
      }
    }
  }, [nodeId]);

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not fetch CAD file (${res.status}).`);
        return res.arrayBuffer();
      })
      .then((buf) => {
        if (cancelled) return;
        const bytes = new Uint8Array(buf);
        const name = fileUrl.split('/').pop() || 'Example STEP file';
        setStepBytes(bytes);
        setFileName(name);
        if (nodeId) fileCache.set(nodeId, { bytes, name });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load CAD file.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fileUrl, nodeId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setFileName(file.name);
      setStepBytes(bytes);
      if (nodeId) {
        fileCache.set(nodeId, { bytes, name: file.name });
      }
    } catch {
      setError('Failed to read the selected STEP file.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !stepBytes) return;

    let isMounted = true;
    let animationFrameId = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);

    const camera = new THREE.PerspectiveCamera(45, Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1), 0.1, 10000);
    camera.position.set(150, 150, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.DOLLY,
    };
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(200, 300, 250);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-200, -150, -200);
    scene.add(fillLight);

    const animate = () => {
      if (!isMounted) return;
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!isMounted) return;
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const processCAD = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!window.occtimportjs) {
          throw new Error('OCCT loader was not found. Check public/vendor/occt-import-js and index.html.');
        }
        const occt = await window.occtimportjs({
          locateFile: (file) => file.endsWith('.wasm') ? '/vendor/occt-import-js/occt-import-js.wasm' : file,
        });
        const result = occt.ReadStepFile(stepBytes, { linearDeflection: 0.1, angularDeflection: 0.5 });
        if (!isMounted) return;
        if (!result?.success || !Array.isArray(result.meshes) || result.meshes.length === 0) {
          throw new Error('OCCT could not find renderable geometry in this STEP file.');
        }

        const group = new THREE.Group();
        const centerMap = new Map<THREE.Mesh, THREE.Vector3>();
        const bounds = new THREE.Box3();
        let count = 0;

        for (const meshData of result.meshes) {
          const geometry = new THREE.BufferGeometry();
          const positions = toFloat32(meshData.attributes.position.array);
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          if (meshData.attributes.normal?.array) {
            geometry.setAttribute('normal', new THREE.BufferAttribute(toFloat32(meshData.attributes.normal.array), 3));
          } else {
            geometry.computeVertexNormals();
          }
          if (meshData.index?.array) geometry.setIndex(new THREE.BufferAttribute(toIndexArray(meshData.index.array), 1));
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          const material = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.35,
            roughness: 0.4,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material);
          bounds.expandByObject(mesh);
          group.add(mesh);
          count++;
        }

        const assemblyCenter = new THREE.Vector3();
        const size = new THREE.Vector3();
        bounds.getCenter(assemblyCenter);
        bounds.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z, 1);

        assemblyCenterRef.current = assemblyCenter;
        maxDimensionRef.current = maxDimension;

        // Compute true world center for each mesh to base explosion vectors on
        group.children.forEach((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const box = new THREE.Box3().setFromObject(child);
          const mCenter = new THREE.Vector3();
          box.getCenter(mCenter);
          centerMap.set(child, mCenter);
        });

        scene.add(group);
        assemblyGroupRef.current = group;
        meshCentersRef.current = centerMap;
        setMeshCount(count);
        setExplodeFactor(0);

        const gridHelper = new THREE.GridHelper(maxDimension * 3, 30, 0x3f3f46, 0x27272a);
        gridHelper.position.set(assemblyCenter.x, bounds.min.y, assemblyCenter.z);
        scene.add(gridHelper);

        camera.near = Math.max(maxDimension / 1000, 0.01);
        camera.far = maxDimension * 100;
        controls.target.copy(assemblyCenter);
        camera.position.set(assemblyCenter.x + maxDimension * 1.5, assemblyCenter.y + maxDimension * 1.5, assemblyCenter.z + maxDimension * 1.5);
        controls.update();
      } catch (err: unknown) {
        console.error('CAD Load Error:', err);
        if (isMounted) setError(err instanceof Error ? err.message : 'Could not render STEP assembly.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void processCAD();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      assemblyGroupRef.current = null;
      meshCentersRef.current.clear();
    };
  }, [stepBytes]);

  const handleExplodeChange = (value: number) => {
    setExplodeFactor(value);
    const group = assemblyGroupRef.current;
    if (!group) return;

    const assemblyCenter = assemblyCenterRef.current;
    const maxDim = maxDimensionRef.current;

    group.children.forEach((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      if (value === 0) {
        child.position.set(0, 0, 0);
        return;
      }

      const meshWorldCenter = meshCentersRef.current.get(child);
      if (!meshWorldCenter) return;

      // Calculate distance from assembly center to give tightly packed parts (like fins) proportional spacing
      const distFromCenter = meshWorldCenter.distanceTo(assemblyCenter);
      const distanceFactor = Math.max(distFromCenter / (maxDim * 0.25), 0.4);

      const dir = meshWorldCenter.clone().sub(assemblyCenter);
      if (dir.lengthSq() === 0) {
        dir.set(0, 1, 0);
      } else {
        dir.normalize();
      }

      // Multiply by distanceFactor so inner stacked components scale outward cleanly without overlapping
      const offset = dir.multiplyScalar(value * (maxDim * 0.6) * distanceFactor);
      child.position.copy(offset);
    });
  };

  return (
    <div className="relative flex h-64 w-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <div ref={mountRef} className="h-full w-full flex-1 cursor-grab active:cursor-grabbing" />
      {!stepBytes && !loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-4 text-center">
          <UploadCloud className="mb-2 h-8 w-8 text-cyan-400" />
          <span className="mb-1 text-xs font-medium text-zinc-200">Load STEP Assembly</span>
          <span className="mb-3 text-[10px] text-zinc-500">Choose a local .step or .stp file to preview</span>
          <label className="cursor-pointer rounded bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-cyan-400">
            Browse STEP File
            <input type="file" accept=".step,.stp" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>
      )}
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-xs font-mono text-cyan-400">Loading CAD assembly...</div>}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-4 text-center">
          <span className="mb-1 text-xs font-medium text-rose-400">CAD Preview Error</span>
          <span className="text-[10px] text-zinc-400">{error}</span>
          <label className="mt-3 cursor-pointer rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700">
            Choose another STEP file
            <input type="file" accept=".step,.stp" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>
      )}
      {!loading && !error && meshCount > 0 && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/90 p-2 text-[11px] text-zinc-300 backdrop-blur-md">
          <div className="flex max-w-[140px] items-center gap-1.5 truncate font-mono text-cyan-400" title={fileName || ''}>
            <Layers className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{fileName || `${meshCount} Parts`}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400">Explode:</span>
            <input type="range" min="0" max="2" step="0.05" value={explodeFactor} onChange={(event) => handleExplodeChange(Number(event.target.value))} className="w-24 cursor-pointer accent-cyan-400" />
          </div>
        </div>
      )}
    </div>
  );
};