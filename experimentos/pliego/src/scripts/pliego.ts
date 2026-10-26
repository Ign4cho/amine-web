// Escena del pliego: un leporello de 6 paneles que se despliega con el
// scroll (horizontal en desktop, vertical en mobile), iluminado por una luz
// que sigue al cursor o a la inclinación del teléfono. Al final se vuelve a
// plegar y sale volando como avión de papel.
//
// Todo el estado visual es función del progreso `p` del scroll, así que
// subir y bajar recorre la misma animación en los dos sentidos.

import * as THREE from 'three/webgpu';
import { color, frontFacing, mix, PI, positionLocal, select, sin, texture, uniform, uv, vec2, vec3 } from 'three/tsl';
import Lenis from 'lenis';
import { INK, PANEL_COUNT, TH, TW, paperNormal, printPanels, type PrintData } from './print';

type RawData = Omit<PrintData, 'images'> & { images: Record<keyof PrintData['images'], string> };

const W = 1;
const H = TH / TW;
const CLOSED = Math.PI * 0.985;
const P_MAX = 7.6; // ver la línea de tiempo en `timeline`
const SCROLL_PER_P = 1.15; // pantallas de scroll por unidad de p

const root = document.documentElement;
const stage = document.querySelector<HTMLElement>('[data-stage]')!;
const track = document.querySelector<HTMLElement>('[data-track]')!;
const canvasEl = document.querySelector<HTMLCanvasElement>('[data-canvas]')!;
const captions = [...document.querySelectorAll<HTMLElement>('[data-cap]')];
const counter = document.querySelector<HTMLElement>('[data-counter]');
const lightBtn = document.querySelector<HTMLButtonElement>('[data-light]');

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

async function loadImages(urls: RawData['images']) {
  const entries = await Promise.all(
    Object.entries(urls).map(async ([k, src]) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return [k, img] as const;
    }),
  );
  return Object.fromEntries(entries) as PrintData['images'];
}

async function loadFonts() {
  await Promise.all(
    ['400 100px "Bebas Neue"', '400 20px "Courier Prime"', '700 20px "Courier Prime"', '400 20px Outfit', '500 20px Outfit', '600 20px Outfit'].map((f) =>
      document.fonts.load(f).catch(() => null),
    ),
  );
}

const isVertical = () => innerWidth <= 760 || (innerHeight > innerWidth && innerWidth <= 1100);
// Teléfono acostado o ventanas muy bajas: el texto no entra al lado ni debajo del pliego.
const tooShort = () => innerHeight < 520;

async function main() {
  const raw: RawData = JSON.parse(document.getElementById('pliego-data')!.textContent!);
  const [images] = await Promise.all([loadImages(raw.images), loadFonts()]);
  const data: PrintData = { ...raw, images };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer: THREE.WebGPURenderer | null = null;
  const short = tooShort();
  if (!reduced && !short) {
    try {
      renderer = new THREE.WebGPURenderer({ canvas: canvasEl, antialias: true, alpha: true });
      await renderer.init();
    } catch (e) {
      console.warn('Sin WebGPU ni WebGL2, se muestra el pliego abierto', e);
      renderer = null;
    }
  }

  // Resolución de impresión según el tamaño real del panel en pantalla.
  const panelPx = isVertical() ? Math.min(innerWidth * 0.8, innerHeight * 0.4) : innerHeight * 0.6;
  const scale = clamp((panelPx * Math.min(devicePixelRatio, 2)) / TW, 0.7, 1.4);
  const printed = printPanels(data, renderer ? scale : 0.9);

  if (!renderer) {
    flat(printed);
    // si el teléfono se endereza, recargar para mostrar el 3D
    if (short && !reduced) addEventListener('resize', () => { if (!tooShort()) location.reload(); });
    return;
  }
  try {
    root.classList.add('is-3d');
    scene3d(renderer, printed);
  } catch (e) {
    console.error('Falló el 3D, se muestra el pliego abierto:', e instanceof Error ? e.message : e);
    root.classList.remove('is-3d');
    flat(printed);
  }
}

// Versión sin 3D: el pliego se muestra abierto, panel por panel.
function flat(printed: ReturnType<typeof printPanels>) {
  root.classList.add('is-flat');
  captions.forEach((cap) => {
    const i = Number(cap.dataset.cap);
    const slot = cap.querySelector('[data-proof]');
    if (!slot || !printed[i]) return;
    const c = printed[i].proof();
    c.setAttribute('aria-hidden', 'true');
    slot.append(c);
  });
}

function scene3d(renderer: THREE.WebGPURenderer, printed: ReturnType<typeof printPanels>) {
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'webgpu' : 'webgl2';
  root.dataset.backend = backend;
  renderer.setPixelRatio(Math.min(devicePixelRatio, isVertical() ? 1.75 : 2));
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight(0xfff6e8, 0.62));
  const key = new THREE.PointLight(0xfff0d0, 2.6, 0, 0);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2a8, 0.3);
  rim.position.set(-2, 3, 2);
  scene.add(rim);

  // ── Materiales: papel + dos tintas desfasadas ──────────────────
  const mis = uniform(0.0015);
  const axisU = uniform(1);
  const normalTex = new THREE.CanvasTexture(paperNormal());
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(2, 2 * H);
  normalTex.colorSpace = THREE.NoColorSpace;
  const anisotropy = renderer.getMaxAnisotropy();

  function material(mask: HTMLCanvasElement) {
    const tex = new THREE.CanvasTexture(mask);
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = anisotropy;
    const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.78, metalness: 0, side: THREE.DoubleSide });
    const off = vec2(mis, mis.mul(-0.6));
    const a = texture(tex, uv().add(off)).r;
    const b = texture(tex, uv().sub(off)).g;
    const front = color(INK.paper)
      .mul(mix(vec3(1), color(INK.mustard), a))
      .mul(mix(vec3(1), color(INK.ink), b.mul(0.97)));
    m.colorNode = select(frontFacing, front, color(INK.back));
    m.normalMap = normalTex;
    m.normalScale = new THREE.Vector2(0.45, 0.45);
    const bend = uniform(0);
    const along = mix(uv().y, uv().x, axisU);
    m.positionNode = positionLocal.add(vec3(0, 0, bend.mul(sin(along.mul(PI)))));
    return { m, bend, tex };
  }

  // ── Leporello ─────────────────────────────────────────────────
  const sheet = new THREE.Group();
  scene.add(sheet);
  const geo = new THREE.PlaneGeometry(W, H, 18, 18);
  const pivots: THREE.Group[] = [];
  const meshes: THREE.Mesh[] = [];
  const bends: { value: number }[] = [];
  let parent: THREE.Object3D = sheet;
  for (let i = 0; i < PANEL_COUNT; i++) {
    const pivot = new THREE.Group();
    parent.add(pivot);
    const { m, bend } = material(printed[i].mask);
    const mesh = new THREE.Mesh(geo, m);
    pivot.add(mesh);
    pivots.push(pivot);
    meshes.push(mesh);
    bends.push(bend);
    parent = pivot;
  }

  // ── Avión de papel: 6 triángulos que cubren el panel de portada ──
  const k = 0.12 * W;
  const FLAT = {
    N: [0, H / 2, 0], LN: [-W / 2, H / 2, 0], RN: [W / 2, H / 2, 0],
    LT: [-W / 2, -H / 2, 0], RT: [W / 2, -H / 2, 0], T: [0, -H / 2, 0],
    LK: [-k, -H / 2, 0], RK: [k, -H / 2, 0],
  } as const;
  type V = keyof typeof FLAT;
  const FOLD: Record<V, number[]> = {
    N: [0, H / 2, 0], LN: [-0.1 * W, H * 0.22, 0.012], RN: [0.1 * W, H * 0.22, 0.012],
    LT: [-0.4 * W, -H / 2, 0.06], RT: [0.4 * W, -H / 2, 0.06], T: [0, -H / 2, -0.17 * W],
    LK: [-0.006, -H / 2, 0], RK: [0.006, -H / 2, 0],
  };
  // antihorario visto de frente, para que la cara impresa quede hacia la cámara
  const TRIS: V[][] = [['N', 'LN', 'LT'], ['N', 'LT', 'LK'], ['N', 'LK', 'T'], ['N', 'RT', 'RN'], ['N', 'RK', 'RT'], ['N', 'T', 'RK']];
  const planeGeo = new THREE.BufferGeometry();
  const planePos = new Float32Array(TRIS.length * 9);
  const planeUv = new Float32Array(TRIS.length * 6);
  TRIS.flat().forEach((v, i) => {
    planeUv[i * 2] = FLAT[v][0] / W + 0.5;
    planeUv[i * 2 + 1] = FLAT[v][1] / H + 0.5;
  });
  planeGeo.setAttribute('position', new THREE.BufferAttribute(planePos, 3));
  planeGeo.setAttribute('uv', new THREE.BufferAttribute(planeUv, 2));
  const planeMat = material(printed[0].mask);
  const plane = new THREE.Mesh(planeGeo, planeMat.m);
  plane.visible = false;
  sheet.add(plane);

  function morphPlane(m: number) {
    const keel = smooth(0, 0.6, m);
    const wing = smooth(0.3, 1, m);
    TRIS.flat().forEach((v, i) => {
      const t = v === 'LT' || v === 'RT' || v === 'LN' || v === 'RN' ? wing : keel;
      for (let c = 0; c < 3; c++) planePos[i * 3 + c] = lerp(FLAT[v][c], FOLD[v][c], t);
    });
    planeGeo.attributes.position.needsUpdate = true;
    planeGeo.computeVertexNormals();
  }

  // ── Layout según orientación ─────────────────────────────────
  let vertical = isVertical();
  const view = { w: 0, h: 0, visW: 0, visH: 0, dist: 0, offX: 0, offY: 0 };
  const PANEL_TOP = 64; // px por debajo del header en mobile

  function layout() {
    vertical = isVertical();
    root.classList.toggle('is-vertical', vertical);
    axisU.value = vertical ? 0 : 1;
    pivots.forEach((pv, i) => {
      if (i > 0) pv.position.set(vertical ? 0 : W, vertical ? -H : 0, 0);
      meshes[i].position.set(vertical ? 0 : W / 2, vertical ? -H / 2 : 0, 0);
      pv.rotation.set(0, 0, 0);
    });
    plane.position.copy(meshes[0].position);

    view.w = innerWidth;
    view.h = innerHeight;
    renderer.setSize(view.w, view.h, false);
    camera.aspect = view.w / view.h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let panelPxH: number;
    if (vertical) {
      // en pantallas bajas el panel se achica para dejarle lugar al texto
      const panelPxW = Math.min(view.w * 0.8, (view.h * (view.h < 700 ? 0.36 : 0.46)) / H);
      panelPxH = panelPxW * H;
      view.visW = (W * view.w) / panelPxW;
      view.visH = view.visW / camera.aspect;
      // centro del panel: debajo del header
      const cy = PANEL_TOP + panelPxH / 2;
      view.offX = 0;
      view.offY = (cy / view.h - 0.5) * view.visH; // el panel queda arriba del centro
      root.style.setProperty('--cap-top', `${Math.round(PANEL_TOP + panelPxH + 20)}px`);
    } else {
      panelPxH = Math.min(view.h * 0.76, (view.w * 0.42) / 0.75);
      view.visH = (H * view.h) / panelPxH;
      view.visW = view.visH * camera.aspect;
      view.offX = (0.5 - 0.36) * view.visW;
      view.offY = 0;
      const panelRight = view.w * 0.36 + (panelPxH * 0.75) / 2;
      root.style.setProperty('--cap-left', `${Math.round(panelRight + Math.max(32, view.w * 0.04))}px`);
      // en la portada el pliego está centrado: el texto usa el margen izquierdo
      root.style.setProperty('--hero-w', `${Math.round((view.w - panelPxH * 0.75) / 2 - Math.max(32, view.w * 0.04) * 1.6)}px`);
    }
    root.style.setProperty('--panel-h', `${Math.round(panelPxH)}px`);
    view.dist = view.visH / 2 / tan;
    camera.updateProjectionMatrix();
    track.style.height = `${Math.round((P_MAX * SCROLL_PER_P + 1) * view.h)}px`;
  }
  layout();
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (tooShort()) return location.reload(); // pasa al pliego abierto (ver main)
    // en mobile la barra de direcciones cambia el alto: solo re-maquetar si cambia el ancho
    if (innerWidth === lastW && isVertical() === vertical && Math.abs(innerHeight - view.h) < 160) return;
    lastW = innerWidth;
    layout();
  });

  // ── Entrada: cursor, inclinación o luz automática ─────────────
  const pointer = { x: 0.35, y: -0.25, tx: 0.35, ty: -0.25, last: -1e9 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    pointer.last = performance.now();
  });
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    pointer.tx = clamp(e.gamma / 35, -1, 1);
    pointer.ty = clamp((e.beta - 45) / 35, -1, 1);
    pointer.last = performance.now();
  };
  type DOE = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
  const DOEc = (window as { DeviceOrientationEvent?: DOE }).DeviceOrientationEvent;
  if (DOEc) {
    addEventListener('deviceorientation', onTilt);
    // iOS no manda la inclinación hasta que se da permiso. Android y otros sí:
    // el botón aparece solo si después de un segundo no llegó ningún dato.
    if (typeof DOEc.requestPermission === 'function' && matchMedia('(pointer: coarse)').matches) {
      setTimeout(() => {
        if (pointer.last > 0) return;
        lightBtn?.removeAttribute('hidden');
        lightBtn?.addEventListener('click', async () => {
          try {
            if ((await DOEc.requestPermission!()) === 'granted') {
              lightBtn.setAttribute('aria-pressed', 'true');
              lightBtn.querySelector('span')!.textContent = 'Luz encendida';
            }
          } catch { /* sin permiso: sigue la luz automática */ }
        });
      }, 1000);
    }
  }

  // ── Scroll ────────────────────────────────────────────────────
  // las notas abiertas en <dialog> scrollean solas, sin Lenis
  const lenis = new Lenis({ autoRaf: true, lerp: 0.09, prevent: (node) => !!node.closest?.('dialog') });
  const readP = () => {
    const top = track.getBoundingClientRect().top;
    return clamp(-top / (view.h * SCROLL_PER_P), 0, P_MAX);
  };
  const scrollToP = (p: number) => {
    const y = track.offsetTop + p * view.h * SCROLL_PER_P;
    lenis.scrollTo(y, { duration: 1.4 });
  };
  document.querySelectorAll<HTMLElement>('[data-goto]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToP(Number(el.dataset.goto));
    }),
  );
  // Teclado: si el foco entra a un texto que no está a la vista, llevar el pliego hasta ahí.
  captions.forEach((cap) =>
    cap.addEventListener('focusin', () => {
      if (!cap.classList.contains('on')) scrollToP(Number(cap.dataset.at));
    }),
  );

  // ── Línea de tiempo ──────────────────────────────────────────
  //  0 – 1     portada
  //  i - .45 → i + .15   se abre el panel i (1…5); lectura hasta i + .55
  //  5.8 – 6.4 se vuelve a plegar
  //  6.35 – 6.7 se transforma en avión; 6.7 – 7.05 vuela; desde 7 el cierre
  function timeline(p: number) {
    const open = pivots.map((_, i) => {
      if (i === 0) return 1;
      const o = smooth(i - 0.45, i + 0.15, p);
      // se repliega de a uno, del último al primero: cada pliegue termina
      // antes de que empiece el anterior (ver el cambio de lado en el loop)
      const from = 5.8 + (PANEL_COUNT - 1 - i) * 0.11;
      const c = smooth(from, from + 0.11, p);
      return o * (1 - c);
    });
    const unfolded = open.slice(1).reduce((s, o) => s + o, 0);
    return {
      open,
      focus: unfolded, // índice (fraccional) del panel que se mira
      morph: smooth(6.35, 6.7, p),
      fly: smooth(6.7, 7.05, p),
      intro: smooth(0.15, 0.9, p), // de portada centrada a pliego con texto al lado
    };
  }

  let caption = -1;
  function setCaption(p: number) {
    let next = -1;
    captions.forEach((cap, i) => {
      const at = Number(cap.dataset.at);
      // cada texto dura hasta que entra el siguiente, salvo que diga otra cosa
      const until = Number(cap.dataset.until ?? (captions[i + 1] ? Number(captions[i + 1].dataset.at) - 0.25 : Infinity));
      if (p >= at - 0.25 && p < until) next = Number(cap.dataset.cap);
    });
    const n = p < 0.75 ? 0 : p >= 6.9 ? 6 : Math.min(5, Math.floor(p + 0.25));
    const label = n === 0 ? 'Portada' : n === 6 ? 'Fin' : `${String(n).padStart(2, '0')} / 05`;
    if (counter && counter.textContent !== label) counter.textContent = label;
    if (next === caption) return;
    caption = next;
    captions.forEach((cap) => cap.classList.toggle('on', Number(cap.dataset.cap) === next));
  }

  // ── Loop ─────────────────────────────────────────────────────
  let pS = readP();
  let last = performance.now();
  let misS = 0;
  const target = new THREE.Vector3();
  const lightTarget = new THREE.Vector3();
  const start = performance.now();

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - start) / 1000;

    const p = readP();
    const prev = pS;
    pS += (p - pS) * (1 - Math.exp(-dt * 9));
    const vel = Math.abs(pS - prev) / Math.max(dt, 1e-3);
    misS += (Math.min(0.016, 0.0016 + vel * 0.012) - misS) * (1 - Math.exp(-dt * 6));
    mis.value = misS;

    const tl = timeline(pS);
    setCaption(pS);

    // pliegues: lo que sigue doblado queda siempre detrás del último panel
    // abierto (+) y en zigzag hacia atrás a partir de ahí (±). El cambio de
    // lado ocurre cuando el panel anterior está de canto, así no se nota.
    let sign = 1;
    pivots.forEach((pv, i) => {
      if (i === 0) return;
      if (i > 1) sign = tl.open[i - 1] >= 0.5 ? 1 : -sign;
      const a = sign * CLOSED * (1 - tl.open[i]);
      if (vertical) pv.rotation.x = a;
      else pv.rotation.y = a;
      bends[i].value = Math.sin(tl.open[i] * Math.PI) * 0.07 * sign;
    });

    // cámara: sigue al panel en foco
    const focus = tl.focus;
    if (vertical) target.set(W / 2 - W / 2, -focus * H - H / 2, 0);
    else target.set(focus * W + W / 2, 0, 0);
    // en desktop la portada arranca centrada y se corre para dejar lugar al texto
    const intro = vertical ? 1 : tl.intro * (1 - tl.morph);
    const cx = target.x + view.offX * intro;
    const cy = target.y + view.offY * intro;
    camera.position.set(cx, cy, view.dist);
    camera.lookAt(cx, cy, 0);

    // luz: cursor/inclinación o recorrido automático si no hay entrada
    const idle = now - pointer.last > 3500;
    if (idle) {
      pointer.tx = Math.sin(t * 0.45) * 0.7;
      pointer.ty = Math.cos(t * 0.31) * 0.5 - 0.15;
    }
    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * (idle ? 1.5 : 6)));
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * (idle ? 1.5 : 6)));
    lightTarget.set(
      camera.position.x + pointer.x * view.visW * 0.55,
      camera.position.y - pointer.y * view.visH * 0.55,
      0.75,
    );
    key.position.copy(lightTarget);
    root.style.setProperty('--lx', `${(pointer.x * 0.5 + 0.5) * 100}%`);
    root.style.setProperty('--ly', `${(pointer.y * 0.5 + 0.5) * 100}%`);

    // el pliego flota y se inclina hacia la luz
    const calm = 1 - smooth(0.4, 1.1, pS) * (1 - tl.morph);
    sheet.rotation.x = (Math.sin(t * 0.8) * 0.03 + pointer.y * 0.12) * calm;
    sheet.rotation.y = (Math.cos(t * 0.6) * 0.04 + pointer.x * 0.18) * calm;
    sheet.position.y = Math.sin(t * 0.9) * 0.015 * calm;

    // final: avión de papel
    const isPlane = tl.morph > 0;
    meshes.forEach((m) => (m.visible = !isPlane));
    plane.visible = isPlane && tl.fly < 1;
    if (isPlane) {
      morphPlane(tl.morph);
      const f = tl.fly;
      const e = f * f;
      plane.position.set(
        meshes[0].position.x + e * view.visW * 0.9,
        meshes[0].position.y + e * view.visH * 0.75,
        -e * 3,
      );
      plane.rotation.set(-0.15 * tl.morph - f * 0.9, f * 0.4, -0.35 * tl.morph - f * 0.5);
    }
    root.style.setProperty('--p', pS.toFixed(3));

    renderer.render(scene, camera);
  });
}

main().catch((e) => {
  console.error('No se pudo armar el pliego:', e instanceof Error ? e.message : e);
  root.classList.add('is-flat');
});
