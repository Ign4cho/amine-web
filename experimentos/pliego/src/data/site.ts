// Contenido de Amine, copiado de amine-web (constants.ts, index.astro,
// content/aliados y data/blogcito.json) para que los experimentos muestren
// lo mismo que el sitio original.
import posts from './blogcito.json';

export const WHATSAPP_URL = 'https://wa.me/5492645827270';
export const CONTACT_EMAIL = 'espacioamine@gmail.com';
export const INSTAGRAM_URL = 'https://www.instagram.com/guadasancheznph';
export const INSTAGRAM_HANDLE = '@guadasancheznph';
export const TIKTOK_URL = 'https://www.tiktok.com/@espacio.amine';
export const TIKTOK_HANDLE = '@espacio.amine';
export const MAIN_SITE = 'https://espacioamine.com';

export const TAGLINE =
  'Impulsamos marcas con creatividad, orden y visión de crecimiento.';

export const SERVICES = [
  {
    name: 'Social media manager',
    icon: 'star',
    detail: 'Planificamos, producimos y publicamos el contenido de tus redes con un calendario que se puede sostener.',
  },
  {
    name: 'Sesiones de fotos y videos',
    icon: 'camera',
    detail: 'Producción propia para que la marca tenga imágenes reales, no bancos de fotos.',
  },
  {
    name: 'Dirección creativa',
    icon: 'brush',
    detail: 'Una idea central que ordena todas las piezas, desde la campaña hasta el posteo del viernes.',
  },
  {
    name: 'Branding',
    icon: 'arrow',
    detail: 'Identidad visual pensada como sistema: paleta, tipografías, tono y reglas de uso.',
  },
  {
    name: 'Desarrollo web',
    icon: 'laptop',
    detail: 'Sitios propios, rápidos y fáciles de mantener, para no depender solo del link en la bio.',
  },
] as const;

export const TEAM = ['Guadalupe', 'Luciana', 'Agustina', 'Victoria', 'Ignacio'];

export const ABOUT =
  'Somos el equipo detrás de la agencia. Trabajamos para brindar soluciones creativas a las empresas. Nos apasiona el trabajo en equipo y colaboramos con cada cliente para ofrecer exactamente lo que necesita.';

export const ALIADOS = [
  {
    slug: 'agustina',
    name: 'Agustina Albarracín',
    area: 'Diseño',
    studio: 'Studio AA',
    description:
      'Soy Agustina Albarracín, estudiante avanzada de diseño gráfico. Me interesa crear identidades visuales desde lo simple y lo sensible, combinando un enfoque estratégico con una mirada editorial. Busco desarrollar marcas con personalidad, coherentes y cuidadas en cada detalle.',
    services: ['Identidad visual', 'Dirección de arte', 'Ilustración aplicada', 'Diseño editorial'],
    email: 'agusalbarracinb@gmail.com',
    portfolio:
      'https://www.figma.com/proto/Ihu2MIKqRgY5vWFCGfoJMD/Portfolio?page-id=0%3A1&node-id=97-401&p=f&viewport=240%2C-2%2C0.05&t=EBcRnHuERep9pXmN-1&scaling=scale-down-width&content-scaling=fixed&starting-point-node-id=97%3A401',
  },
  {
    slug: 'ignacio',
    name: 'Ignacio Colomé',
    area: 'Web',
    studio: 'Nacho Colomé soluciones informáticas',
    description:
      'Soy Ignacio Colomé, licenciado en Sistemas de Información. Me interesa construir soluciones tecnológicas que potencien el trabajo creativo, combinando criterio técnico con atención al detalle. En Amine me encargo del desarrollo web y de que cada idea del equipo tenga la plataforma que necesita para funcionar.',
    services: ['Desarrollo web', 'Análisis de datos', 'Soporte técnico a las ideas'],
    email: 'nachocolome@gmail.com',
    portfolio: 'https://ign4cho.github.io/',
  },
];

export type Post = (typeof posts)[number];

export const POSTS: Post[] = posts
  .filter((p) => p.published)
  .sort((a, b) => a.order - b.order);

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function paragraphs(body: string) {
  return body.split(/\n\n+/).filter(Boolean);
}
