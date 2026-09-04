// 极简 Service Worker：让网站可被“添加到主屏幕”，像 App 一样全屏打开。
// 策略：
//  - 页面跳转：网络优先（始终最新），离线时回退到缓存的登录页。
//  - 静态资源(_next/、图标)：成功即入缓存，离线可秒开外壳。
//  - 其它(含 API、RSC 数据)：只走网络，不入缓存，避免缓存到个人训练数据。
const CACHE = "tiku-shell-v1";
const FALLBACK = "/login";
const STATIC_PREFIX = ["/_next/", "/icons/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([FALLBACK, "/manifest.webmanifest"]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(FALLBACK)));
    return;
  }

  const isStatic = STATIC_PREFIX.some((p) => url.pathname.startsWith(p));
  if (!isStatic) return; // API / 数据请求：浏览器正常联网

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
