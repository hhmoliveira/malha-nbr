/* Service worker — Malha NBR 5101 (offline em campo).
   Para publicar uma nova versão do app, altere VERSAO: os aparelhos baixam o novo index.html e descartam o cache antigo. */
const VERSAO = 'malha-nbr5101-v1';
const SHELL = ['./', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon-180.png'];
const XLSX = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    await c.addAll(SHELL);
    try { await c.add(new Request(XLSX, {mode:'no-cors'})); } catch (_) {}   // biblioteca de planilhas, se houver rede
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSAO) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                   // POSTs (ex.: API de leitura por IA) passam direto
  if (url.origin !== location.origin && url.href !== XLSX) return;    // só cuida do próprio app e do XLSX

  if (req.mode === 'navigate') {                                      // abrir o app: cache primeiro (funciona sem sinal), atualiza ao fundo
    e.respondWith((async () => {
      const c = await caches.open(VERSAO);
      const cached = await c.match('./index.html');
      const rede = fetch(req).then(r => { if (r && r.ok) c.put('./index.html', r.clone()); return r; }).catch(() => null);
      if (cached) { e.waitUntil(rede); return cached; }
      return (await rede) || new Response('Sem conexão e o app ainda não foi salvo no aparelho.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
    })());
    return;
  }
  e.respondWith((async () => {                                        // demais arquivos: cache primeiro, com atualização ao fundo
    const c = await caches.open(VERSAO);
    const cached = await c.match(req);
    const rede = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
    if (cached) { e.waitUntil(rede); return cached; }
    return (await rede) || Response.error();
  })());
});
