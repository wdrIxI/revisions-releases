// Version téléphone : remplace les fonctions Electron (preload.js) et ajoute la navigation du bas
window.api = {
  platform: 'web',
  minimize() {}, maximize() {}, close() {}, onWinState() {},
  load: async () => JSON.parse(localStorage.getItem('progression') || 'null'),
  save: async (d) => { localStorage.setItem('progression', JSON.stringify(d)); return true; },
  pdfUrl: async () => null,
  pdfExternal() {},
  pdfSave: async () => false,
  fileLoad: async (key) => { const r = await (await caches.open('cours')).match(key); return r ? r.blob() : null; },
  fileSave: async (key, b) => { await (await caches.open('cours')).put(key, new Response(b, { headers: { 'Content-Type': b.type || 'image/webp' } })); },
  server: location.hostname === 'localhost' ? 'http://localhost:8799' : null,
  contentLoad: async () => { const r = await (await caches.open('cours')).match('/cours.json'); return r ? r.json() : null; },
  contentSave: async (c) => { await (await caches.open('cours')).put('/cours.json', new Response(JSON.stringify(c), { headers: { 'Content-Type': 'application/json' } })); return true; },
  contentClear: () => caches.delete('cours')
};
// Trois mises en page selon la place : téléphone, tablette en portrait (menu en bas, colonnes) et grand écran
// (iPad en paysage : menu à gauche). Au build, les tailles CSS sont converties en rem : tout suit la taille de base.
const layout = () => {
  const w = innerWidth, pad = w >= 700 && innerHeight >= 480, c = document.documentElement.classList;
  // maxTouchPoints : reste vrai sur iPad avec un clavier ou un trackpad
  const touch = navigator.maxTouchPoints > 1 && pad;
  c.add('web');
  c.toggle('mobile', w < 1000 || !pad);
  c.toggle('tablet', w < 1000 && pad);
  c.toggle('big', touch);
  const z = (touch ? (w < 1000 ? 1.34 : w < 1300 ? 1.28 : 1.36) : 1) * (typeof TextSize === 'undefined' ? 1 : TextSize.value());
  document.documentElement.style.fontSize = `${16 * z}px`;
  document.documentElement.style.setProperty('--z', z);
};
window.layout = layout;
layout();
addEventListener('resize', layout);
document.addEventListener('DOMContentLoaded', () => {
  const TABS = GROUPS.slice(0, 5).map((g) => [g.v, g.i, g.t]);
  const bar = document.createElement('nav');
  bar.className = 'tabbar';
  bar.innerHTML = TABS.map(([v, i, l]) => `<button data-tabv="${v}">${icon(i)}<span>${l}</span></button>`).join('');
  document.body.appendChild(bar);
  const shade = document.createElement('div');
  shade.className = 'drawer-shade';
  document.body.appendChild(shade);
  const drawer = (on) => document.body.classList.toggle('drawer', on);

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tabv]');
    if (!b) return;
    drawer(false);
    go(b.dataset.tabv);
  });
  shade.addEventListener('click', () => drawer(false));
  document.getElementById('sidebar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && b.dataset.act !== 'courseMenu') drawer(false);
  });

  // Plein écran pendant une session, onglet actif sinon
  const IN = ['lesson', 'flash', 'qcm', 'exam', 'trainer', 'play', 'niv', 'atl', 'mixte'];
  const fam = () => { const g = groupOf(view.name); return g.v === 'hubProg' ? 'today' : g.v; };
  const update = () => {
    document.body.classList.toggle('in-session', IN.includes(view.name) && !!session);
    bar.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.dataset.tabv === fam());
    });
  };
  new MutationObserver(update).observe(document.getElementById('main'), { childList: true });
  update();

  // Bouton retour d'Android : revient au parcours avant de quitter (avec confirmation pendant une leçon)
  history.pushState({ rev: 1 }, '');
  window.addEventListener('popstate', () => {
    if (document.body.classList.contains('locked')) { history.back(); return; }
    const drawn = document.body.classList.contains('drawer');
    if (!drawn && view.name === 'today') { history.back(); return; }
    history.pushState({ rev: 1 }, '');
    if (drawn) drawer(false);
    else if (view.name === 'lesson') ACTIONS.lessonQuit();
    else if (view.name === 'path' && view.pop) { view.pop = null; keepScroll(); }
    else go('today');
  });

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // Nouvelle version : appliquée tout de suite si on n'est pas au milieu d'un exercice
    const had = !!navigator.serviceWorker.controller;
    let done = false;
    const busy = () => !!session || document.body.classList.contains('locked') || ['tdEx', 'tuto', 'simu', 'annale'].includes(view.name);
    const apply = () => { if (!had || done) return; if (busy()) { setTimeout(apply, 5000); return; } done = true; location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', apply);
    navigator.serviceWorker.register('sw.js').then((r) => { document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update().catch(() => {}); }); }).catch(() => {});
  }
});
