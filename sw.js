/* Service worker da Malha NBR 5101: deixa a ferramenta funcionando sem internet em campo.
   - Arquivos da própria ferramenta: responde do cache na hora e atualiza em segundo plano
     (a versão nova vale a partir da próxima abertura).
   - Biblioteca de planilhas (cdnjs, usada só para .xls/.ods): guardada no primeiro uso.
   - Chamadas à API de leitura por IA e qualquer outro endereço: sempre direto na rede, nunca em cache.
   Ao publicar uma versão nova do index.html, aumente o número em VERSAO. */
const VERSAO = 'malha-nbr5101-v3';
const ARQUIVOS = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.href.startsWith(CDN)) {   // biblioteca externa: cache primeiro
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); }
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;   // API e demais endereços: rede direta

  e.respondWith(caches.open(VERSAO).then(async c => {
    const chave = req.mode === 'navigate' ? 'index.html' : req;
    const cache = await c.match(chave, {ignoreSearch: req.mode === 'navigate'});
    const rede = fetch(req).then(res => {
      if (res.ok && res.type === 'basic') c.put(chave, res.clone());
      return res;
    }).catch(() => null);
    if (cache) { e.waitUntil(rede); return cache; }
    return (await rede) || new Response('Sem conexão e sem cópia em cache.', {status: 503, headers: {'content-type': 'text/plain; charset=utf-8'}});
  }));
});
