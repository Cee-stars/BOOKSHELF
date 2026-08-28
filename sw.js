// BOOKSHELF — オフライン用のキャッシュ
const CACHE = "bookshelf-v4";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ネットがあれば最新を取り、無ければキャッシュを返す
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // このサイト以外（GitHub API など）には手を出さない。
  // 横取りするとトークン付きの応答をキャッシュしてしまい、
  // 通信に失敗したときには index.html が返ってしまうため。
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => {
        if (r) return r;
        // ページを開こうとしたときだけ、控えの index.html を返す
        if (req.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      }))
  );
});
