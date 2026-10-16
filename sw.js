// Version 42: Always obtain the latest application files from the network.
// Purge older app caches, which could keep obsolete chord-list UI visible.
const CACHE_PREFIX='biisikirja-';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method==='GET'&&new URL(event.request.url).origin===self.location.origin){
   event.respondWith(fetch(new Request(event.request,{cache:'no-store'})));
 }
});
