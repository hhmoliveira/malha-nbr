/* Service worker — Malha de Medição NBR 5101
   - Guarda o app no aparelho na instalação: abre e funciona sem internet.
   - Página: rede primeiro (pega a versão nova quando há sinal), cópia guardada quando está offline.
   - Ícones e demais arquivos do app: cópia guardada, atualizada em segundo plano.
   - Biblioteca de planilhas (SheetJS, cdnjs): guardada na primeira vez que for usada com internet.
   - Chamadas à API (leitura por IA) e qualquer POST: nunca passam pelo cache.
   Para publicar uma versão nova, troque VERSAO: o app mostra "Nova versão disponível". */
const VERSAO = 'malha5101-2026-10-27a';
const NUCLEO = [
  './', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png',
  './icons/apple-touch-icon-180.png', './icons/favicon-32.png'
];
const EXTERNOS = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
const CDN = 'https://cdnjs.cloudflare.com';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    await c.addAll(NUCLEO);
    for (const u of EXTERNOS) {   // sem internet ou sinal fraco: não trava a instalação; guarda no primeiro uso
      try { const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 6000); const r = await fetch(u, {mode:'cors', signal:ctrl.signal}); clearTimeout(t); if (r.ok) await c.put(u, r); } catch (_) {}
    }
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSAO) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

async function redePrimeiro(req){
  const c = await caches.open(VERSAO);
  try {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 4000);   // sinal fraco em campo: não fica esperando
    const r = await fetch(req, {signal:ctrl.signal}); clearTimeout(t);
    if (r.ok) await c.put('./index.html', r.clone());
    return r;
  } catch (_) {
    return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
  }
}
async function cacheAtualiza(req){
  const c = await caches.open(VERSAO), hit = await c.match(req);
  const rede = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await rede) || Response.error();
}
async function cachePrimeiro(req){
  const c = await caches.open(VERSAO), hit = await c.match(req.url);
  if (hit) return hit;
  const r = await fetch(req); if (r.ok) await c.put(req.url, r.clone()); return r;
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate' && url.origin === location.origin) { e.respondWith(redePrimeiro(req)); return; }
  if (url.origin === location.origin) { e.respondWith(cacheAtualiza(req)); return; }
  if (url.origin === CDN) { e.respondWith(cachePrimeiro(req)); return; }
  /* demais origens (API da IA, links externos): direto na rede */
});
