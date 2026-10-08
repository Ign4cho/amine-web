export const SITE_NAME = "Amine Social Media";
export const SITE_URL = "https://espacioamine.com";
export const SITE_DESCRIPTION = "Agencia de marketing digital con estructura freelancer profesional.";
export const WHATSAPP_NUMBER = "5492645827270";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const CONTACT_EMAIL = "espacioamine@gmail.com";
export const INSTAGRAM_URL = "https://www.instagram.com/guadasancheznph";
export const TIKTOK_URL = "https://www.tiktok.com/@espacio.amine";
export const ADMIN_PASSWORD = "Espacio1234";

// Set to false to remove the "En construcción" overlay from the homepage
export const UNDER_CONSTRUCTION = false;

// ── Flags reversibles (propuesta octubre 2026) ────────────────────────
// Cada uno vuelve al estado anterior cambiando el valor a false, sin
// revertir commits. Ver `design-refs/decisiones-octubre.md`.

/** true  → /blogcito es el feed de notas y el home muestra las últimas 2.
 *  false → vuelve el cartel "próximamente" en ambos lugares. */
export const BLOGCITO_ENABLED = true;

/** true  → About Us con fondo plano (sin la textura rotada + blur).
 *  false → vuelve la textura `home-footer-bg.png` borrosa. */
export const ABOUTUS_FLAT_BG = true;

/** Cuántas notas se muestran en el preview del home. */
export const BLOGCITO_HOME_PREVIEW_COUNT = 2;
