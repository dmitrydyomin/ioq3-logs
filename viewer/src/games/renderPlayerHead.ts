import {
  AmbientLight,
  Box3,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';

interface HeadAsset {
  surfaces: {
    name: string;
    positions: number[];
    normals: number[];
    indices: number[];
    uv: number[];
  }[];
  skins: Record<string, Record<string, string>>;
}

export async function renderPlayerHead(
  canvas: HTMLCanvasElement,
  character: string,
  skin: string,
  direction: number,
  signal: AbortSignal,
) {
  const path = `/player-heads/${character}/`;
  const response = await fetch(`${path}head.json`, { signal });
  if (!response.ok) return;
  const { surfaces, skins }: HeadAsset = await response.json();
  const textures = Object.prototype.hasOwnProperty.call(skins, skin) ? skins[skin] : undefined;
  if (!textures) return;

  const loader = new TextureLoader();
  const head = new Group();
  const meshes: Mesh<BufferGeometry, MeshLambertMaterial>[] = [];
  const disposeMeshes = () => {
    for (const { geometry, material } of meshes) {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    }
  };

  let renderer: WebGLRenderer;
  try {
    const loaded = await Promise.allSettled(surfaces.map(async ({ name, positions, normals, indices, uv }) => {
      const filename = textures[name];
      if (!filename) return;

      const texture = await loader.loadAsync(path + filename);
      if (signal.aborted) {
        texture.dispose();
        return;
      }
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false;
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices);
      const mesh = new Mesh(geometry, new MeshLambertMaterial({ map: texture, alphaTest: 0.5 }));
      meshes.push(mesh);
      head.add(mesh);
    }));
    if (signal.aborted || !meshes.length || loaded.some((result) => result.status === 'rejected')) {
      disposeMeshes();
      return;
    }
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (error) {
    disposeMeshes();
    throw error;
  }

  const bounds = new Box3().setFromObject(head);
  head.position.sub(bounds.getCenter(new Vector3()));
  const pivot = new Group();
  pivot.add(head);

  const extent = bounds.getSize(new Vector3());
  const halfSize = Math.max(extent.y, extent.z) * 0.62;
  const camera = new OrthographicCamera(-halfSize, halfSize, halfSize, -halfSize, 1, 200);
  camera.up.set(0, 0, 1);
  camera.position.set(100, 0, 4);
  camera.lookAt(0, 0, 0);

  const scene = new Scene();
  const key = new DirectionalLight(0xffffff, 1.5);
  key.position.set(2, -1, 3);
  scene.add(pivot, new AmbientLight(0xffffff, 1.6), key);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(96, 96, false);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let visible = false;
  let contextLost = false;
  const draw = (time: number) => {
    const phase = reducedMotion.matches ? 0 : time / 900;
    pivot.rotation.z = direction * (0.22 + Math.sin(phase) * 0.16);
    pivot.rotation.y = Math.sin(phase * 0.75) * 0.035;
    renderer.render(scene, camera);
    if (visible && !reducedMotion.matches) frame = requestAnimationFrame(draw);
  };
  const refresh = () => {
    cancelAnimationFrame(frame);
    if (!contextLost) draw(performance.now());
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    refresh();
  });
  const showFallback = () => {
    contextLost = true;
    cancelAnimationFrame(frame);
    canvas.hidden = true;
  };
  const showHead = () => {
    contextLost = false;
    refresh();
    canvas.hidden = false;
  };

  observer.observe(canvas.parentElement!);
  reducedMotion.addEventListener('change', refresh);
  canvas.addEventListener('webglcontextlost', showFallback);
  canvas.addEventListener('webglcontextrestored', showHead);
  showHead();

  return () => {
    showFallback();
    observer.disconnect();
    reducedMotion.removeEventListener('change', refresh);
    canvas.removeEventListener('webglcontextlost', showFallback);
    canvas.removeEventListener('webglcontextrestored', showHead);
    disposeMeshes();
    renderer.dispose();
  };
}
