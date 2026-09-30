(() => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=24', {scope: '/'})
      .then(reg => console.log('[GLOW AI] PWA service worker registered.', reg.scope))
      .catch(err => console.warn('[GLOW AI] PWA registration unavailable.', err));
  });
})();