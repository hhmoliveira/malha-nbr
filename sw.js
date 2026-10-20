/* Service worker: guarda a ferramenta no aparelho para abrir sem internet.
   Ao publicar uma versão nova, troque o número em VERSAO. */
const VERSAO = 'malha-nbr5101-v4';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;   // IA, planilhas e CDN passam direto
  e.respondWith(
    fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('./index.html')))
  );
});
