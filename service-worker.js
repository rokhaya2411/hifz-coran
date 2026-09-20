const CACHE="hifz-v1";
const APP=["./","./index.html","./style.css","./app.js","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP))));
self.addEventListener("fetch",e=>{
  if(e.request.url.startsWith(self.location.origin))
    e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request)));
});
