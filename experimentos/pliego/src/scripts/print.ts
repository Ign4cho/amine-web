// Imprenta del pliego: cada panel se dibuja en dos "tintas" (mostaza y
// tinta) como en una risografía. El resultado es una máscara RGBA donde
// R = cobertura de mostaza y G = cobertura de tinta; el shader las combina
// sobre el papel y las desfasa cuando el pliego se mueve.

export const TW = 1000; // unidades de diseño del panel
export const TH = 1333;

export const INK = { paper: '#f6efe0', mustard: '#f0c14b', ink: '#2d2a29', back: '#e6dccb' };

export interface PrintData {
  tagline: string;
  about: string;
  team: string[];
  services: { name: string; detail: string }[];
  aliados: { name: string; area: string; studio: string; services: readonly string[] }[];
  posts: { title: string; date: string; tag: string }[];
  whatsapp: string;
  email: string;
  instagram: string;
  tiktok: string;
  images: Record<'carpeta' | 'equipo' | 'agus' | 'nacho' | 'pc' | 'estrella', HTMLImageElement>;
}

type Ctx = CanvasRenderingContext2D;
interface Plate { must: Ctx; ink: Ctx }

const F = {
  display: (s: number) => `400 ${s}px "Bebas Neue", "Arial Narrow", sans-serif`,
  mono: (s: number, w = 400) => `${w} ${s}px "Courier Prime", "Courier New", monospace`,
  sans: (s: number, w = 400) => `${w} ${s}px Outfit, system-ui, sans-serif`,
};

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  return c;
}

function plate(scale: number): Plate & { canvases: HTMLCanvasElement[] } {
  const mk = () => {
    const c = canvas(TW * scale, TH * scale);
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    return ctx;
  };
  const must = mk();
  const ink = mk();
  return { must, ink, canvases: [must.canvas, ink.canvas] };
}

function text(ctx: Ctx, str: string, x: number, y: number, font: string, opts: { align?: CanvasTextAlign; maxW?: number; lh?: number; tracking?: number } = {}) {
  ctx.font = font;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  if (opts.tracking) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${opts.tracking}px`;
  if (!opts.maxW) {
    ctx.fillText(str, x, y);
  } else {
    const lh = opts.lh ?? 1.3 * parseFloat(font.split('px')[0].split(' ').pop()!);
    let line = '';
    let yy = y;
    for (const word of str.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > opts.maxW && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lh;
      } else line = test;
    }
    ctx.fillText(line, x, yy);
    y = yy;
  }
  if (opts.tracking) (ctx as Ctx & { letterSpacing: string }).letterSpacing = '0px';
  return y;
}

// Ajusta el cuerpo de una palabra para que ocupe exactamente `w` de ancho.
function fit(ctx: Ctx, str: string, w: number, family: (s: number) => string) {
  ctx.font = family(100);
  return (100 * w) / ctx.measureText(str).width;
}

function rule(ctx: Ctx, x1: number, y: number, x2: number, wgt = 3) {
  ctx.fillRect(x1, y - wgt / 2, x2 - x1, wgt);
}

// Trama de puntos a partir de la luminancia (y el alfa) de la imagen.
function halftone(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number, cell = 9, rot = 0) {
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const s = canvas(cols, rows);
  const sc = s.getContext('2d', { willReadFrequently: true })!;
  sc.drawImage(img, 0, 0, cols, rows);
  const d = sc.getImageData(0, 0, cols, rows).data;
  // niveles: estirar el rango de la imagen para que la trama tenga contraste
  let lo = 1;
  let hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    lo = Math.min(lo, l);
    hi = Math.max(hi, l);
  }
  const range = Math.max(0.2, hi - lo);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4;
      const lum = ((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255 - lo) / range;
      let dark = (1 - lum) * (d[i + 3] / 255);
      dark = Math.min(1, Math.max(0, (dark - 0.04) * 1.2)) ** 0.85;
      if (dark < 0.02) continue;
      const rad = cell * 0.56 * Math.sqrt(dark);
      const cx = -w / 2 + c * cell + cell / 2 + (r % 2 ? cell / 2 : 0);
      const cy = -h / 2 + r * cell + cell / 2;
      ctx.moveTo(cx + rad, cy);
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

// Silueta plana de la imagen (usa su alfa), para el bloque de mostaza.
function silhouette(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number, rot = 0) {
  const t = canvas(w, h);
  const tc = t.getContext('2d')!;
  tc.drawImage(img, 0, 0, w, h);
  tc.globalCompositeOperation = 'source-in';
  tc.fillStyle = '#000';
  tc.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.drawImage(t, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function header(p: Plate, n: number, label: string) {
  text(p.ink, `${String(n).padStart(2, '0')} / 05`, 70, 96, F.mono(26, 700));
  text(p.ink, label.toUpperCase(), 930, 96, F.mono(26), { align: 'right' });
  rule(p.ink, 70, 122, 930, 3);
}

function footer(p: Plate, n: number) {
  rule(p.ink, 70, 1238, 930, 2);
  text(p.ink, 'AMÍNE · PLIEGO N.º 1', 70, 1278, F.mono(22, 700));
  text(p.ink, `— ${n} —`, 930, 1278, F.mono(22), { align: 'right' });
}

const PANELS: ((p: Plate, d: PrintData) => void)[] = [
  // 0 · Portada
  (p, d) => {
    p.must.fillRect(0, 0, TW, 800);
    text(p.ink, 'PLIEGO N.º 1', 70, 96, F.mono(26, 700));
    text(p.ink, 'SAN JUAN · ARGENTINA', 930, 96, F.mono(26), { align: 'right' });
    rule(p.ink, 70, 122, 930, 3);
    const size = fit(p.ink, 'AMÍNE', 860, F.display);
    text(p.ink, 'AMÍNE', 66, 150 + size * 0.84, F.display(size));
    text(p.ink, 'SOCIAL MEDIA', 70, 150 + size * 0.84 + 70, F.mono(40, 700), { tracking: 10 });
    halftone(p.ink, d.images.carpeta, 380, 610, 560, 493, 8, -0.05);
    silhouette(p.must, d.images.carpeta, 404, 628, 560, 493, -0.05);
    text(p.ink, d.tagline, 70, 900, F.sans(34, 500), { maxW: 300, lh: 44 });
    rule(p.ink, 70, 1238, 930, 2);
    text(p.ink, 'ABRIR EL PLIEGO', 70, 1278, F.mono(22, 700));
    text(p.ink, 'ESPACIOAMINE.COM', 930, 1278, F.mono(22), { align: 'right' });
  },
  // 1 · Servicios
  (p, d) => {
    text(p.must, '01', 1010, 760, F.display(860), { align: 'right' });
    header(p, 1, 'Lo que hacemos');
    text(p.ink, 'SERVICIOS', 66, 300, F.display(190));
    let y = 400;
    d.services.forEach((s, i) => {
      rule(p.ink, 70, y, 930, 2);
      text(p.ink, `0${i + 1}`, 70, y + 66, F.mono(26, 700));
      text(p.ink, s.name.toUpperCase(), 150, y + 74, F.display(72));
      text(p.ink, s.detail, 150, y + 118, F.sans(24), { maxW: 760, lh: 30 });
      y += 165;
    });
    footer(p, 1);
  },
  // 2 · Equipo
  (p, d) => {
    header(p, 2, 'Quiénes somos');
    text(p.ink, 'EL EQUIPO', 66, 300, F.display(190));
    silhouette(p.must, d.images.equipo, 600, 352, 330, 572, 0.04);
    halftone(p.ink, d.images.equipo, 580, 336, 330, 572, 7, 0.04);
    d.team.forEach((name, i) => text(p.ink, name.toUpperCase(), 70, 440 + i * 98, F.display(96)));
    p.must.fillRect(70, 960, 860, 240);
    text(p.ink, d.about, 100, 1018, F.sans(29, 500), { maxW: 800, lh: 38 });
    footer(p, 2);
  },
  // 3 · Aliados
  (p, d) => {
    header(p, 3, 'Red de aliados');
    text(p.ink, 'ALIADOS', 66, 300, F.display(190));
    p.must.save();
    p.must.translate(310, 600);
    p.must.rotate(-0.06);
    p.must.fillRect(-215, -228, 430, 456);
    p.must.restore();
    halftone(p.ink, d.images.agus, 80, 360, 400, 422, 7, -0.06);
    halftone(p.ink, d.images.nacho, 520, 420, 400, 414, 7, 0.05);
    d.aliados.forEach((a, i) => {
      const x = 70 + i * 450;
      text(p.ink, a.name.toUpperCase(), x, 950, F.display(64), { maxW: 400, lh: 60 });
      text(p.ink, `${a.area} · ${a.studio}`.toUpperCase(), x, 1080, F.mono(22, 700), { maxW: 400, lh: 28 });
      text(p.ink, a.services.join(' / '), x, 1160, F.sans(23), { maxW: 400, lh: 30 });
    });
    footer(p, 3);
  },
  // 4 · Blogcito
  (p, d) => {
    header(p, 4, 'Notas de la agencia');
    text(p.ink, 'BLOGCITO', 66, 300, F.display(190));
    silhouette(p.must, d.images.pc, 470, 330, 470, 313);
    halftone(p.ink, d.images.pc, 450, 316, 470, 313, 7);
    text(p.ink, 'Lo que aprendemos haciendo, contado sin vueltas.', 70, 400, F.sans(34, 500), { maxW: 340, lh: 44 });
    let y = 700;
    d.posts.slice(0, 3).forEach((post) => {
      rule(p.ink, 70, y, 930, 2);
      text(p.ink, `${post.date} · ${post.tag}`.toUpperCase(), 70, y + 48, F.mono(22, 700));
      text(p.ink, post.title, 70, y + 100, F.sans(36, 600), { maxW: 860, lh: 44 });
      y += 178;
    });
    footer(p, 4);
  },
  // 5 · Contacto
  (p, d) => {
    p.must.fillRect(0, 0, TW, TH);
    header(p, 5, 'Contacto');
    const size = fit(p.ink, 'ESCRIBINOS', 860, F.display);
    text(p.ink, 'ESCRIBINOS', 66, 150 + size * 0.84, F.display(size));
    silhouette(p.ink, d.images.estrella, 760, 470, 180, 225, 0.2);
    let y = 600;
    const rows: [string, string][] = [
      ['WhatsApp', d.whatsapp],
      ['Correo', d.email],
      ['Instagram', d.instagram],
      ['TikTok', d.tiktok],
    ];
    rows.forEach(([k, v]) => {
      rule(p.ink, 70, y, 930, 2);
      text(p.ink, k.toUpperCase(), 70, y + 50, F.mono(24, 700));
      text(p.ink, v, 70, y + 118, F.display(64));
      y += 150;
    });
    rule(p.ink, 70, 1238, 930, 2);
    text(p.ink, 'AMÍNE · PLIEGO N.º 1', 70, 1278, F.mono(22, 700));
    text(p.ink, 'FIN', 930, 1278, F.mono(22, 700), { align: 'right' });
  },
];

export const PANEL_COUNT = PANELS.length;

export interface PrintedPanel {
  mask: HTMLCanvasElement; // R mostaza, G tinta
  proof: () => HTMLCanvasElement; // prueba en color (para la versión sin 3D)
}

export function printPanels(d: PrintData, scale: number): PrintedPanel[] {
  return PANELS.map((draw) => {
    const p = plate(scale);
    draw(p, d);
    const [mc, ic] = p.canvases;
    const w = mc.width;
    const h = mc.height;
    const m = p.must.getImageData(0, 0, w, h).data;
    const k = p.ink.getImageData(0, 0, w, h).data;
    const out = canvas(w, h);
    const oc = out.getContext('2d')!;
    const img = oc.createImageData(w, h);
    for (let i = 0; i < m.length; i += 4) {
      img.data[i] = 255 - m[i];
      img.data[i + 1] = 255 - k[i];
      img.data[i + 2] = 0;
      img.data[i + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    return {
      mask: out,
      proof: () => proof(img, w, h),
    };
  });
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

function proof(mask: ImageData, w: number, h: number) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  const out = ctx.createImageData(w, h);
  const [pa, mu, ik] = [hex(INK.paper), hex(INK.mustard), hex(INK.ink)];
  for (let i = 0; i < mask.data.length; i += 4) {
    const a = mask.data[i] / 255;
    const b = mask.data[i + 1] / 255;
    for (let ch = 0; ch < 3; ch++) {
      const v = pa[ch] * (1 - a + a * mu[ch]) * (1 - b + b * ik[ch]);
      out.data[i + ch] = Math.round(v * 255);
    }
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

// Relieve del papel: fibras al azar convertidas en un normal map.
export function paperNormal(size = 512) {
  const c = canvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = Math.random() * Math.PI;
    const l = 4 + Math.random() * 22;
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.05 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.2;
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l);
      ctx.stroke();
    }
  }
  const src = ctx.getImageData(0, 0, size, size).data;
  const out = ctx.createImageData(size, size);
  const hAt = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * 2.2;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * 2.2;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}
