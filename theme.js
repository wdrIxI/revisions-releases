// Thèmes de couleur : chaque thème redéfinit les variables CSS sur <html data-theme="...">
const THEMES = [
  { id: 'arcade', t: 'Arcade', d: 'Violet nuit et or', sw: ['#15112b', '#6f5cff', '#ffc44d'] },
  { id: 'ocean', t: 'Océan', d: 'Bleu profond et cyan', sw: ['#0d1726', '#2f8cff', '#8fd3ff'] },
  { id: 'foret', t: 'Forêt', d: 'Vert sombre et menthe', sw: ['#0f1a15', '#2fae6b', '#9be8b8'] },
  { id: 'braise', t: 'Braise', d: 'Rouge sombre et ambre', sw: ['#1c0f10', '#e8553f', '#ffb199'] },
  { id: 'sakura', t: 'Sakura', d: 'Prune et rose', sw: ['#1d1020', '#d94fa8', '#ffb3e1'] },
  { id: 'graphite', t: 'Graphite', d: 'Gris neutre et bleu', sw: ['#131416', '#4f7cff', '#c9cdd6'] }
];

const Theme = {
  current() { return (Store.data && Store.data.settings.theme) || 'arcade'; },
  apply(id = this.current()) {
    document.documentElement.dataset.theme = id;
    try { localStorage.setItem('theme', id); } catch (e) { /* stockage indisponible */ }
  },
  set(id) {
    Store.data.settings.theme = id;
    Store.save();
    this.apply(id);
    document.querySelectorAll('[data-theme-pick]').forEach((b) => b.classList.toggle('on', b.dataset.themePick === id));
  },
  picker() {
    const cur = this.current();
    return `<div class="themes">${THEMES.map((t) => `
      <button class="theme-opt ${t.id === cur ? 'on' : ''}" data-act="setTheme" data-theme-pick="${t.id}">
        <span class="theme-sw">${t.sw.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
        <span class="theme-t">${t.t}</span><span class="theme-d">${t.d}</span>
      </button>`).join('')}</div>`;
  },
  open() {
    const o = document.createElement('div');
    o.className = 'modal-back';
    o.innerHTML = `<div class="help theme-modal"><h2>Affichage</h2><p class="sub" style="margin:0 0 0.375rem">Le changement s’applique tout de suite et reste enregistré.</p>${TextSize.html()}${this.picker()}<button class="btn" data-close>Fermer</button></div>`;
    o.addEventListener('click', (e) => { if (e.target === o || e.target.hasAttribute('data-close')) o.remove(); });
    document.body.appendChild(o);
  }
};

// Taille de l'affichage, propre à chaque appareil : zoom de la fenêtre sur ordinateur, taille de base (rem) sur la version web
const TextSize = {
  steps: [['Petit', 0.88], ['Normal', 1], ['Grand', 1.12], ['Très grand', 1.26], ['Énorme', 1.36]],
  idx() { try { const n = Number(localStorage.getItem('taille') ?? 1); return this.steps[n] ? n : 1; } catch (e) { return 1; } },
  value() { return this.steps[this.idx()][1]; },
  apply() { if (window.layout) window.layout(); else if (window.api.zoom) window.api.zoom(this.value()); },
  html() { return `<div class="size-row"><div class="muted">Taille de l’affichage, sur cet appareil</div><div class="seg">${this.steps.map(([t], i) => `<button class="${i === this.idx() ? 'on' : ''}" data-size="${i}">${t}</button>`).join('')}</div></div>`; },
  set(i) {
    i = Math.max(0, Math.min(this.steps.length - 1, i));
    try { localStorage.setItem('taille', i); } catch (e) { /* stockage indisponible */ }
    this.apply();
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', Number(b.dataset.size) === i));
  }
};
document.addEventListener('click', (e) => { const b = e.target.closest('[data-size]'); if (b) TextSize.set(Number(b.dataset.size)); });
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || !['+', '=', '-', '0'].includes(e.key)) return;
  e.preventDefault();
  TextSize.set(e.key === '0' ? 1 : TextSize.idx() + (e.key === '-' ? -1 : 1));
});
ICONS.size = '<path d="M3 19 8.5 5h1L15 19M5 14.5h8"/><path d="M16 19l2.7-7h.6L22 19M17 16.7h4"/>';
TextSize.apply();

// Thème mémorisé appliqué dès le chargement, avant la lecture de la progression (évite un flash)
try { document.documentElement.dataset.theme = localStorage.getItem('theme') || 'arcade'; } catch (e) { /* rien */ }

ICONS.palette = '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/>';

Object.assign(ACTIONS, {
  setTheme: (el) => Theme.set(el.dataset.themePick),
  openTheme: () => Theme.open()
});

// Chaque rendu réapplique le thème enregistré (utile au démarrage)
const _renderT = render;
render = function () {
  _renderT();
  Theme.apply();
  // Bouton de taille aussi pendant les exercices, là où la barre du haut est masquée
  const top = document.querySelector('.sess-top, .lz-top');
  if (top) top.insertAdjacentHTML('beforeend', `<button class="size-btn" data-act="openTheme" title="Taille de l’affichage" aria-label="Taille de l’affichage">${icon('size')}</button>`);
};
