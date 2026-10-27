/* Service worker — Academia Dulces Placeres
   - La app (index.html) se busca primero en internet: así las alumnas siempre ven la versión nueva.
     Si no hay conexión, abre la última copia guardada.
   - Firebase (inicio de sesión, base de datos, fotos y archivos) NUNCA se guarda en caché:
     siempre va directo a la nube, para que los datos estén al día y no se mezclen cuentas.
   - Las letras de Google Fonts sí se guardan, para que cargue rápido.
   Cambia VERSION cada vez que subas una versión nueva: borra las copias viejas. */
const VERSION = 'adp-2026-10-27';
const CACHE = 'academia-' + VERSION;
const BASICOS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICOS)).catch(() => {}));
  self.skipWaiting();   // la versión nueva toma el control sin esperar
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Nunca en caché: Firebase, Google APIs, Apps Script (Sheets) y WhatsApp
const SIN_CACHE = /firebase|firestore|googleapis\.com\/(identitytoolkit|securetoken)|firebasestorage|script\.google|gstatic\.com\/firebasejs|wa\.me|api\.whatsapp/i;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (SIN_CACHE.test(url.href)) return;   // directo a la red

  // Páginas de la app: primero internet, si falla la copia guardada
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Letras de Google Fonts y archivos propios (manifest, íconos): primero la copia guardada
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.host) || url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(g => g || fetch(req).then(r => {
        if (r.ok || r.type === 'opaque') { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return r;
      }))
    );
  }
});
