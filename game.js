// Couche de jeu : XP, niveaux, quêtes du jour, badges, sons, effets et Arène (boss, blitz, survie)
// Ajoutée par-dessus l'application existante : rien n'est retiré, tout passe par Game.event().

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const RANKS = ['Débutant', 'Curieux', 'Studieux', 'Assidu', 'Solide', 'Affûté', 'Expert', 'Virtuose', 'Maître', 'Légende'];

const QUEST_TYPES = [
  { id: 'cards', n: 15, xp: 40, t: (n) => `Réviser ${n} flashcards` },
  { id: 'qcmOk', n: 8, xp: 40, t: (n) => `Réussir ${n} questions de QCM` },
  { id: 'arena', n: 1, xp: 60, t: () => 'Gagner une partie dans l’Arène' },
  { id: 'train', n: 3, xp: 40, t: (n) => `Réussir ${n} exercices de calcul` },
  { id: 'read', n: 3, xp: 30, t: (n) => `Marquer ${n} parties de fiche comme lues` },
  { id: 'combo', n: 8, xp: 50, t: (n) => `Enchaîner ${n} bonnes réponses d’affilée` }
];

const BADGES = [
  { id: 'first', icon: 'cards', t: 'Premier pas', d: 'Réviser sa première flashcard' },
  { id: 'cards100', icon: 'layers', t: 'Centurion', d: 'Réviser 100 flashcards' },
  { id: 'streak3', icon: 'flame', t: 'Sur la lancée', d: '3 jours de suite' },
  { id: 'streak7', icon: 'flame', t: 'Semaine parfaite', d: '7 jours de suite' },
  { id: 'perfect', icon: 'star', t: 'Sans faute', d: 'Un QCM d’au moins 10 questions sans erreur' },
  { id: 'boss1', icon: 'target', t: 'Chasseur', d: 'Vaincre un premier boss' },
  { id: 'bossAll', icon: 'flag', t: 'Conquérant', d: 'Vaincre tous les boss d’un cours' },
  { id: 'blitz', icon: 'timer', t: 'Éclair', d: 'Marquer 200 points en Blitz' },
  { id: 'survie', icon: 'flame', t: 'Increvable', d: 'Survivre à 15 questions' },
  { id: 'exam80', icon: 'check', t: 'Prêt pour le partiel', d: 'Au moins 80 % à un examen blanc' },
  { id: 'calc25', icon: 'calc', t: 'Calculatrice humaine', d: 'Réussir 25 exercices de calcul' },
  { id: 'lvl5', icon: 'star', t: 'Niveau 5', d: 'Atteindre le niveau 5' },
  { id: 'lvl10', icon: 'star', t: 'Niveau 10', d: 'Atteindre le niveau 10' }
];

let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
document.addEventListener('pointerdown', (e) => { const z = Number(document.documentElement.style.getPropertyValue('--z')) || 1; pointer = { x: e.clientX / z, y: e.clientY / z }; }, true);

const Game = {
  combo: 0,

  d() {
    if (!Store.data.game) Store.data.game = { xp: 0, badges: {}, quests: null, records: {}, bosses: {}, stats: { calcOk: 0, cards: 0 } };
    const g = Store.data.game;
    if (Store.data.settings.sound === undefined) Store.data.settings.sound = true;
    return g;
  },

  level(xp = this.d().xp) {
    let lvl = 1, need = 120, rest = xp;
    while (rest >= need) { rest -= need; lvl++; need = 120 + 60 * (lvl - 1); }
    return { lvl, rest, need, rank: RANKS[Math.min(RANKS.length - 1, Math.floor((lvl - 1) / 2))] };
  },

  /* ---------- Quêtes du jour ---------- */
  quests() {
    const g = this.d(), day = Store.today();
    if (!g.quests || g.quests.day !== day) {
      let seed = day.split('-').reduce((a, x) => a * 31 + Number(x), 7);
      const pool = [...QUEST_TYPES], items = [];
      while (items.length < 3) { seed = (seed * 9301 + 49297) % 233280; items.push(pool.splice(seed % pool.length, 1)[0]); }
      g.quests = { day, items: items.map((q) => ({ id: q.id, n: q.n, xp: q.xp, p: 0, done: false })) };
    }
    return g.quests.items;
  },

  progress(id, amount = 1, absolute = false) {
    this.quests().forEach((q) => {
      if (q.id !== id || q.done) return;
      q.p = absolute ? Math.max(q.p, amount) : q.p + amount;
      if (q.p >= q.n) {
        q.p = q.n; q.done = true;
        const T = QUEST_TYPES.find((x) => x.id === q.id);
        setTimeout(() => { this.award(q.xp, 'Quête terminée'); notify('flag', `Quête terminée : ${T.t(q.n)} (+${q.xp} XP)`); Sound.play('quest'); }, 350);
      }
    });
  },

  /* ---------- XP et badges ---------- */
  award(xp, label) {
    if (!xp) return;
    const g = this.d();
    const before = this.level().lvl;
    g.xp += xp;
    const goal = Store.data.settings.goal || 20, before0 = (Store.data.activity[Store.today()] || {}).xp || 0;
    Store.bump('xp', xp);
    if (before0 < goal && before0 + xp >= goal) setTimeout(() => { notify('target', `Objectif du jour atteint : ${goal} XP`); Sound.play('quest'); }, 900);
    floatText(`+${xp} XP`, label);
    const after = this.level();
    if (after.lvl > before) {
      setTimeout(() => levelUp(after), 400);
      if (after.lvl >= 5) this.badge('lvl5');
      if (after.lvl >= 10) this.badge('lvl10');
    }
    Store.save();
    this.hud();
  },

  badge(id) {
    const g = this.d();
    if (g.badges[id]) return;
    g.badges[id] = Date.now();
    const b = BADGES.find((x) => x.id === id);
    setTimeout(() => { notify(b.icon, `Badge débloqué : ${b.t}`); Sound.play('badge'); confetti(60); }, 700);
    Store.save();
  },

  hit(ok) {
    if (ok) {
      this.combo++;
      this.progress('combo', this.combo, true);
      if ([3, 5, 10, 15, 20].includes(this.combo)) comboPop(this.combo);
    } else this.combo = 0;
  },

  // Point d'entrée unique appelé par l'application
  event(type, a, b) {
    const g = this.d();
    switch (type) {
      case 'card': {
        g.stats.cards = (g.stats.cards || 0) + 1;
        this.award([0, 1, 2, 3, 3][a] || 1);
        this.progress('cards');
        this.badge('first');
        if (g.stats.cards >= 100) this.badge('cards100');
        const s = Store.streak();
        if (s >= 3) this.badge('streak3');
        if (s >= 7) this.badge('streak7');
        break;
      }
      case 'qcm':
        this.hit(a);
        if (a) { this.award(6); this.progress('qcmOk'); Sound.play('ok'); } else { this.award(1); Sound.play('ko'); }
        break;
      case 'qcmEnd':
        if (a.length >= 10 && a.every((r) => r.ok)) { this.badge('perfect'); confetti(); }
        break;
      case 'train':
        this.hit(a);
        if (a) {
          g.stats.calcOk = (g.stats.calcOk || 0) + 1;
          this.award(10); this.progress('train'); Sound.play('ok');
          if (g.stats.calcOk >= 25) this.badge('calc25');
        } else Sound.play('ko');
        break;
      case 'td': this.award(25, 'Exercice réussi'); Sound.play('quest'); break;
      case 'read': this.award(5); this.progress('read'); break;
      case 'exam':
        this.award(a * 4, 'Examen blanc');
        if (b && a / b >= 0.8) { this.badge('exam80'); confetti(); }
        break;
      default: break;
    }
    Store.save();
  },

  /* ---------- Rendu ---------- */
  hud() {
    const el = document.getElementById('hud');
    if (!el || !Store.data) return;
    const L = this.level();
    el.innerHTML = `
      <button class="hud-lvl" data-act="go" data-v="arena" title="${L.rank}, ${L.rest} / ${L.need} XP">
        <span class="hex sm"><span>${L.lvl}</span></span>
        <span class="hud-bar"><i style="width:${(L.rest / L.need) * 100}%"></i></span>
      </button>
      <button class="wc" data-act="openTheme" title="Taille de l’affichage et thème">${icon('size')}</button>
      <button class="wc" data-act="toggleSound" title="${Store.data.settings.sound ? 'Couper le son' : 'Activer le son'}">${icon(Store.data.settings.sound ? 'sound' : 'mute')}</button>
      <button class="wc" data-act="help" title="Raccourcis clavier (?)">${icon('keys')}</button>`;
  },

  playerCard() {
    const L = this.level(), g = this.d();
    const nb = Object.keys(g.badges).length;
    const ticks = Array.from({ length: 9 }, (_, i) => `<b style="left:${(i + 1) * 10}%"></b>`).join('');
    return `<section class="player">
      <div class="hex big"><span>${L.lvl}</span></div>
      <div class="player-main">
        <div class="player-rank">${L.rank}</div>
        <div class="player-sub">Niveau ${L.lvl} · ${g.xp} XP au total · ${plural(nb, 'badge')}</div>
        <div class="xp-gauge"><i style="width:${(L.rest / L.need) * 100}%"></i>${ticks}</div>
        <div class="player-next">${L.need - L.rest} XP avant le niveau ${L.lvl + 1}</div>
      </div>
      <div class="player-streak"><span class="ico" data-i="flame"></span><span class="n">${Store.streak()}</span><span class="l">${Store.streak() > 1 ? 'jours de suite' : 'jour de série'}</span></div>
    </section>`;
  },

  questsHtml() {
    return `<div class="quests">${this.quests().map((q) => {
      const T = QUEST_TYPES.find((x) => x.id === q.id);
      return `<div class="quest ${q.done ? 'done' : ''}">
        <div class="quest-top"><span class="quest-t">${T.t(q.n)}</span><span class="quest-xp">+${q.xp} XP</span></div>
        <div class="quest-bar"><i style="width:${(q.p / q.n) * 100}%"></i></div>
        <div class="quest-p">${q.done ? 'Terminée' : `${q.p} / ${q.n}`}</div>
      </div>`;
    }).join('')}</div>`;
  }
};

/* ---------- Sons (synthétisés, aucun fichier) ---------- */
const Sound = {
  ctx: null,
  play(kind) {
    if (!Store.data || !Store.data.settings.sound) return;
    try {
      this.ctx = this.ctx || new AudioContext();
      const seq = {
        ok: [[660, 0, 0.07], [990, 0.07, 0.12]],
        ko: [[200, 0, 0.18, 'square']],
        hit: [[320, 0, 0.05, 'sawtooth'], [180, 0.05, 0.1, 'sawtooth']],
        quest: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.18]],
        badge: [[784, 0, 0.1], [988, 0.1, 0.1], [1319, 0.2, 0.25]],
        level: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.35]],
        win: [[392, 0, 0.12], [523, 0.12, 0.12], [659, 0.24, 0.12], [784, 0.36, 0.4]],
        lose: [[330, 0, 0.2, 'triangle'], [247, 0.2, 0.2, 'triangle'], [196, 0.4, 0.4, 'triangle']],
        tick: [[1200, 0, 0.03]]
      }[kind] || [];
      const t0 = this.ctx.currentTime;
      seq.forEach(([f, start, dur, type]) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type || 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + start);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
        o.connect(g).connect(this.ctx.destination);
        o.start(t0 + start); o.stop(t0 + start + dur + 0.02);
      });
    } catch (e) { /* audio indisponible */ }
  }
};

/* ---------- Effets visuels ---------- */
function floatText(text, label) {
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = label ? `${text} · ${label}` : text;
  el.style.left = `${Math.min(window.innerWidth - 140, pointer.x)}px`;
  el.style.top = `${Math.max(60, pointer.y - 20)}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function comboPop(n) {
  const el = document.createElement('div');
  el.className = 'combo-pop';
  el.innerHTML = `<span>Série de ${n}</span>`;
  document.body.appendChild(el);
  Sound.play('quest');
  setTimeout(() => el.remove(), 1300);
}

function notify(ic, msg) {
  const t = document.createElement('div');
  t.className = 'toast toast-game';
  t.innerHTML = icon(ic) + esc(msg);
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

function confetti(count = 140) {
  if (REDUCED) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = window.innerWidth; c.height = window.innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const cols = ['#ffc44d', '#6f5cff', '#45e3a5', '#ff6f7e', '#5cc8ff', '#b3a8ff'];
  const P = Array.from({ length: count }, () => ({
    x: c.width / 2 + (Math.random() - 0.5) * 200, y: c.height * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)]
  }));
  let f = 0;
  (function step() {
    ctx.clearRect(0, 0, c.width, c.height);
    P.forEach((p) => {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    if (++f < 110) requestAnimationFrame(step); else c.remove();
  })();
}

function shake(el) {
  if (!el || REDUCED) return;
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
}

function levelUp(L) {
  Sound.play('level');
  confetti(180);
  const o = document.createElement('div');
  o.className = 'modal-back';
  o.innerHTML = `<div class="levelup"><div class="hex big pop"><span>${L.lvl}</span></div><h2>Niveau ${L.lvl}</h2><p>Nouveau rang : ${L.rank}</p><button class="btn primary">Continuer</button></div>`;
  o.addEventListener('click', () => o.remove());
  document.body.appendChild(o);
}

function showHelp() {
  const rows = [
    [window.api && window.api.platform === 'darwin' ? '⌘ K' : 'Ctrl K', 'Rechercher dans le cours'], ['?', 'Afficher cette aide'], ['P', 'Parcours'], ['D', 'Tableau de bord'], ['A', 'Arène'],
    ['F', 'Flashcards'], ['Q', 'QCM'], ['T', 'TD corrigés'], ['E', 'Entraînement calcul'],
    ['Espace', 'Retourner une flashcard'], ['1 à 4', 'Noter une carte ou répondre'], ['V / F', 'Vrai ou faux dans l’Arène'],
    ['Entrée', 'Continuer, valider'], ['Échap', 'Quitter la session en cours']
  ];
  const o = document.createElement('div');
  o.className = 'modal-back';
  o.innerHTML = `<div class="help"><h2>Raccourcis clavier</h2><div class="help-grid">${rows.map(([k, l]) => `<kbd>${k}</kbd><span>${l}</span>`).join('')}</div><button class="btn">Fermer</button></div>`;
  o.addEventListener('click', (e) => { if (e.target === o || e.target.tagName === 'BUTTON') o.remove(); });
  document.body.appendChild(o);
}

/* ---------- Vrai ou faux ---------- */
// La réponse proposée vient des choix du QCM (écrits pour être plausibles), jamais d'une autre carte.
// On écarte ce qui serait ambigu hors contexte : tournures négatives, « toutes les réponses »,
// mauvais choix contenu dans le bon, ou affirmation techniquement vraie (borne moins bonne).
const TF_META = /^aucun|^toutes? les|^les deux|^rien|^ça dépend|^on ne peut|réponses|^vrai$|^faux$/i;
const TF_NEG = /n’(est|utilise|admet) pas|ne vérifie pas|est fausse|bonne définition|majorant utilisable/i;
function tfWrongs(q) {
  if (TF_NEG.test(q.q) || TF_META.test(q.c[q.a]) || q.c.some((x) => /^vrai$/i.test(x))) return [];
  const right = fold(q.c[q.a]);
  return q.c.filter((x, i) => i !== q.a && !TF_META.test(x) && !/approximation|APX/.test(x) && !right.includes(fold(x)));
}
function makeTf(q) {
  const wrongs = tfWrongs(q);
  if (!wrongs.length) return null;
  const truth = Math.random() < 0.5;
  return { text: q.q, shown: truth ? q.c[q.a] : pick(wrongs), right: q.c[q.a], answer: truth ? 0 : 1 };
}

/* ---------- Arène ---------- */
function arenaPool(chs) {
  const ids = chs.map((c) => c.id);
  const qs = allQcm.filter((q) => ids.includes(q.chap.id)).map((q) => {
    const p = prepQ(q);
    return { type: 'qcm', text: q.q, opts: p.order.map((i) => q.c[i]), ans: p.answer, exp: q.e, chap: q.chap, src: q };
  });
  // Une question sur trois passe en vrai ou faux (jamais les deux formes dans la même partie)
  return shuffle(qs.map((x) => {
    const t = Math.random() < 0.34 ? makeTf(x.src) : null;
    return t ? { type: 'vf', text: t.text, claim: t.shown, opts: ['Vrai', 'Faux'], ans: t.answer, exp: `Bonne réponse : ${t.right}. ${x.exp}`, chap: x.chap, src: x.src } : x;
  }));
}

const MODES = {
  boss: { t: 'Combat de boss', d: 'Choisis un chapitre et vide la barre de vie de son gardien. Trois erreurs et tu perds.' },
  blitz: { t: 'Blitz 60 secondes', d: 'Un maximum de bonnes réponses en une minute. Les séries multiplient les points, une erreur coûte 3 secondes.' },
  survie: { t: 'Survie', d: 'Trois vies, et le temps par question diminue à chaque réponse. Jusqu’où tiens-tu ?' }
};

function bossName(ch) { return `Gardien du chapitre « ${ch.titre} »`; }

function bossSvg(color, state = '') {
  const eyes = state === 'dead'
    ? '<path d="M38 44l10 10M48 44 38 54M72 44l10 10M82 44 72 54" stroke="#15112b" stroke-width="5" stroke-linecap="round"/>'
    : '<circle cx="44" cy="50" r="8" fill="#15112b"/><circle cx="76" cy="50" r="8" fill="#15112b"/><circle cx="46" cy="47" r="2.5" fill="#fff"/><circle cx="78" cy="47" r="2.5" fill="#fff"/><path d="M32 36l20 6M88 36 68 42" stroke="#15112b" stroke-width="5" stroke-linecap="round"/>';
  return `<svg class="boss-svg ${state}" viewBox="0 0 120 120"><path d="M60 6 106 32v56L60 114 14 88V32z" fill="${color}"/><path d="M60 6 106 32v56L60 114z" fill="#000" opacity=".12"/>${eyes}<path d="M44 78q16 ${state === 'dead' ? '-8' : '10'} 32 0" stroke="#15112b" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
}

function records() {
  const g = Game.d();
  g.records[course.id] = g.records[course.id] || { blitz: 0, survie: 0 };
  return g.records[course.id];
}

VIEWS.arena = () => {
  const g = Game.d(), rec = records();
  const beaten = chapters.filter((c) => g.bosses[`${course.id}:${c.id}`]).length;
  return `<div class="page">
    <div class="head-row"><div><h1>Arène</h1><p class="sub">Des parties courtes pour réviser ${esc(course.titre)} en jouant. Les questions viennent de tes QCM et de tes flashcards.</p></div></div>
    <div class="modes">
      <div class="mode mode-boss">
        <div class="mode-head"><h2>${MODES.boss.t}</h2><span class="chip">${beaten} / ${chapters.length} vaincus</span></div>
        <p>${MODES.boss.d}</p>
        <div class="boss-grid">${chapters.map((c) => { const dead = g.bosses[`${course.id}:${c.id}`]; return `
          <button class="boss-tile ${dead ? 'dead' : ''}" data-act="startBoss" data-id="${c.id}" title="${esc(bossName(c))}">
            ${bossSvg(c.color, dead ? 'dead' : '')}
            <span>${esc(c.titre)}</span>
            ${dead ? '<em>Vaincu</em>' : ''}
          </button>`; }).join('')}</div>
      </div>
      <div class="mode-col">
        <button class="mode mode-blitz" data-act="startBlitz">
          <div class="mode-head"><h2>${MODES.blitz.t}</h2><span class="chip gold">Record ${rec.blitz}</span></div>
          <p>${MODES.blitz.d}</p>
          <span class="btn primary">Lancer le Blitz</span>
        </button>
        <button class="mode mode-survie" data-act="startSurvie">
          <div class="mode-head"><h2>${MODES.survie.t}</h2><span class="chip gold">Record ${rec.survie}</span></div>
          <p>${MODES.survie.d}</p>
          <span class="btn primary">Lancer la survie</span>
        </button>
      </div>
    </div>
    <div class="section-title"><h2>Badges</h2><span class="muted">${Object.keys(g.badges).length} / ${BADGES.length}</span></div>
    <div class="badges">${BADGES.map((b) => `<div class="badge ${g.badges[b.id] ? 'on' : ''}"><div class="badge-ico">${icon(b.icon)}</div><div><div class="badge-t">${b.t}</div><div class="badge-d">${b.d}</div></div></div>`).join('')}</div>
  </div>`;
};

function startArena(mode, chapId) {
  const chs = chapId ? chapters.filter((c) => c.id === chapId) : chapters;
  const s = {
    type: 'arena', mode, chap: chapId ? chs[0] : null, pool: arenaPool(chs), idx: 0,
    lives: 3, score: 0, mult: 1, streak: 0, count: 0, xp: 0, locked: false, picked: null, done: false,
    bossHp: 100, timeLeft: 60000, qLimit: 15000, qStart: Date.now(), last: Date.now()
  };
  s.cur = s.pool[0];
  session = s;
  view = { name: 'play' };
  render();
  if (mode !== 'boss') {
    s.timerId = setInterval(() => tick(s), 100);
  }
}

function tick(s) {
  if (session !== s || s.done) { clearInterval(s.timerId); return; }
  const now = Date.now(), dt = now - s.last; s.last = now;
  if (s.mode === 'blitz') {
    s.timeLeft -= dt;
    const bar = document.getElementById('arenaTime');
    if (bar) bar.style.width = `${Math.max(0, s.timeLeft / 600)}%`;
    const txt = document.getElementById('arenaTimeTxt');
    if (txt) txt.textContent = `${Math.max(0, Math.ceil(s.timeLeft / 1000))} s`;
    if (s.timeLeft <= 0) endArena(s, true);
  } else if (s.mode === 'survie' && !s.locked) {
    const left = s.qLimit - (now - s.qStart);
    const bar = document.getElementById('arenaTime');
    if (bar) { bar.style.width = `${Math.max(0, (left / s.qLimit) * 100)}%`; bar.classList.toggle('low', left < 3000); }
    if (left <= 0) answerArena(-1);
  }
}

function nextArena(s) {
  if (session !== s || s.done) return;
  s.idx++;
  if (s.idx >= s.pool.length) { s.pool = shuffle(s.pool); s.idx = 0; }
  s.cur = s.pool[s.idx];
  s.locked = false; s.picked = null; s.qStart = Date.now();
  render();
}

function answerArena(k) {
  const s = session;
  if (!s || s.type !== 'arena' || s.locked || s.done) return;
  s.locked = true; s.picked = k;
  const q = s.cur, ok = k === q.ans;
  if (q.type === 'qcm') recordAnswer(q.src, ok);
  else { Game.hit(ok); Sound.play(ok ? 'ok' : 'ko'); }
  if (ok) { s.xp += 4; Game.d().xp += 4; }
  let end = false;
  if (s.mode === 'boss') {
    if (ok) { const dmg = 14 + Math.min(Game.combo, 5) * 3; s.bossHp = Math.max(0, s.bossHp - dmg); s.lastDmg = dmg; Sound.play('hit'); end = s.bossHp === 0; }
    else { s.lives--; end = s.lives === 0; }
  } else if (s.mode === 'blitz') {
    if (ok) { s.streak++; s.mult = Math.min(4, 1 + Math.floor(s.streak / 3)); s.score += 10 * s.mult; }
    else { s.streak = 0; s.mult = 1; s.timeLeft -= 3000; }
  } else {
    if (ok) { s.count++; s.qLimit = Math.max(5000, s.qLimit - 500); } else { s.lives--; end = s.lives === 0; }
  }
  Store.save();
  render();
  if (!ok) shake(document.querySelector('.arena-q'));
  if (ok && s.mode === 'boss') { const b = document.querySelector('.arena-boss .boss-svg'); if (b) { b.classList.remove('hurt'); void b.getBoundingClientRect(); b.classList.add('hurt'); } }
  if (end) { setTimeout(() => { if (session === s) endArena(s, s.mode === 'boss' ? s.bossHp === 0 : false); }, ok ? 700 : 1400); return; }
  // Bonne réponse : on enchaîne vite. Erreur : on laisse lire la correction (Entrée pour passer).
  if (ok) setTimeout(() => nextArena(s), s.mode === 'blitz' ? 380 : 650);
  else if (s.mode === 'blitz') setTimeout(() => nextArena(s), 1100);
}

function endArena(s, win) {
  if (s.done) return;
  s.done = true; s.win = win;
  clearInterval(s.timerId);
  const g = Game.d(), rec = records();
  s.newRecord = false;
  if (s.mode === 'boss' && win) {
    const first = !g.bosses[`${course.id}:${s.chap.id}`];
    g.bosses[`${course.id}:${s.chap.id}`] = Date.now();
    Game.award(first ? 120 : 50, first ? 'Boss vaincu' : 'Boss revaincu');
    Game.badge('boss1');
    if (chapters.every((c) => g.bosses[`${course.id}:${c.id}`])) Game.badge('bossAll');
    Game.progress('arena');
  }
  if (s.mode === 'blitz') {
    if (s.score > rec.blitz) { rec.blitz = s.score; s.newRecord = s.score > 0; }
    Game.award(Math.round(s.score / 5), 'Blitz');
    if (s.score >= 100) Game.progress('arena');
    if (s.score >= 200) Game.badge('blitz');
  }
  if (s.mode === 'survie') {
    if (s.count > rec.survie) { rec.survie = s.count; s.newRecord = s.count > 0; }
    Game.award(s.count * 5, 'Survie');
    if (s.count >= 10) Game.progress('arena');
    if (s.count >= 15) Game.badge('survie');
  }
  Sound.play(win || s.newRecord ? 'win' : 'lose');
  if (win || s.newRecord) confetti();
  Store.save();
  render();
}

VIEWS.play = () => {
  const s = session;
  if (!s || s.type !== 'arena') return VIEWS.arena();
  if (s.done) {
    const title = s.mode === 'boss' ? (s.win ? 'Boss vaincu' : 'Le gardien a gagné') : s.mode === 'blitz' ? 'Temps écoulé' : 'Plus de vies';
    const big = s.mode === 'boss' ? `${100 - s.bossHp} dégâts` : s.mode === 'blitz' ? `${s.score} points` : `${s.count} questions`;
    return `<div class="page"><div class="session"><div class="arena-end ${s.win || s.newRecord ? 'win' : ''}">
      ${s.mode === 'boss' ? bossSvg(s.chap.color, s.win ? 'dead' : '') : `<div class="hex big"><span>${s.mode === 'blitz' ? s.score : s.count}</span></div>`}
      <h1>${title}</h1>
      <div class="arena-big">${big}</div>
      <p class="sub">${s.newRecord ? 'Nouveau record. ' : ''}${s.mode === 'boss' && !s.win ? 'Relis la fiche du chapitre puis retente ta chance.' : `+${s.xp} XP gagnés pendant la partie.`}</p>
      <div class="row" style="justify-content:center;margin-top:1.375rem">
        <button class="btn primary lg" data-act="replay">Rejouer</button>
        ${s.mode === 'boss' && !s.win ? `<button class="btn lg" data-act="chap" data-id="${s.chap.id}">Ouvrir la fiche</button>` : ''}
        <button class="btn ghost lg" data-act="go" data-v="arena">Retour à l’Arène</button>
      </div>
    </div></div></div>`;
  }
  const q = s.cur;
  const hearts = (n) => Array.from({ length: 3 }, (_, i) => `<span class="heart ${i < n ? '' : 'lost'}">${icon('heart')}</span>`).join('');
  let hud = '';
  if (s.mode === 'boss') {
    hud = `<div class="arena-boss">
      ${bossSvg(s.chap.color)}
      <div class="boss-info">
        <div class="boss-name">${esc(bossName(s.chap))}</div>
        <div class="hp"><i style="width:${s.bossHp}%"></i><span>${s.bossHp} PV</span></div>
        <div class="row between"><div class="hearts">${hearts(s.lives)}</div>${Game.combo >= 2 ? `<span class="chip gold">Série ${Game.combo}</span>` : ''}</div>
      </div>
    </div>`;
  } else if (s.mode === 'blitz') {
    hud = `<div class="arena-hud">
      <div class="arena-score"><span class="n">${s.score}</span><span class="l">points</span></div>
      <div class="arena-timer"><div class="tbar"><i id="arenaTime" style="width:${Math.max(0, s.timeLeft / 600)}%"></i></div><span id="arenaTimeTxt">${Math.ceil(s.timeLeft / 1000)} s</span></div>
      <div class="mult m${s.mult}">×${s.mult}</div>
    </div>`;
  } else {
    hud = `<div class="arena-hud">
      <div class="arena-score"><span class="n">${s.count}</span><span class="l">survécues</span></div>
      <div class="arena-timer"><div class="tbar"><i id="arenaTime" style="width:100%"></i></div><span>${(s.qLimit / 1000).toFixed(1).replace('.', ',')} s par question</span></div>
      <div class="hearts">${hearts(s.lives)}</div>
    </div>`;
  }
  const answered = s.picked !== null;
  return `<div class="page"><div class="session arena">
    <div class="sess-top"><button class="btn ghost sm" data-act="go" data-v="arena">${icon('arrowL')}Abandonner</button><span class="muted">${MODES[s.mode].t}</span></div>
    ${hud}
    <div class="panel q-card arena-q">
      <div class="q-meta"><span class="chip" style="color:${q.chap.color}">${esc(q.chap.titre)}</span><span class="chip">${q.type === 'vf' ? 'Vrai ou faux' : 'QCM'}</span></div>
      <div class="q-text">${esc(q.text)}</div>
      ${q.type === 'vf' ? `<div class="claim"><span class="muted">Réponse proposée</span><div>${esc(q.claim)}</div></div>` : ''}
      <div class="choices ${q.type === 'vf' ? 'vf' : ''}">${q.opts.map((o, k) => {
        let cls = '';
        if (answered) { if (k === q.ans) cls = 'ok'; else if (k === s.picked) cls = 'ko'; }
        return `<button class="choice ${cls}" data-act="arenaAnswer" data-k="${k}" ${answered ? 'disabled' : ''}><span class="key">${q.type === 'vf' ? (k ? 'F' : 'V') : k + 1}</span>${esc(o)}</button>`;
      }).join('')}</div>
      ${answered && s.picked !== q.ans ? `<div class="explain"><span class="ico" data-i="bulb"></span><div>${s.picked === -1 ? '<span style="color:var(--bad)">Temps écoulé.</span> ' : ''}${esc(q.exp)}</div></div>
        ${s.mode !== 'blitz' && !s.done && (s.mode !== 'boss' || s.lives > 0) && (s.mode !== 'survie' || s.lives > 0) ? '<div class="q-foot"><span class="muted" style="font-size:0.75rem">Entrée pour continuer</span><button class="btn primary" data-act="arenaNext">Continuer</button></div>' : ''}` : ''}
    </div>
  </div></div>`;
};

/* ---------- Branchement sur l'application ---------- */
ICONS.heart = '<path d="M12 20s-7-4.4-9.2-8.6C1.2 8.3 3 5 6.3 5c2 0 3.2 1.1 3.7 2 .5-.9 1.7-2 3.7-2C17 5 18.8 8.3 17.2 11.4 15 15.6 12 20 12 20z" transform="translate(2 0)"/>';
ICONS.sound = '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>';
ICONS.mute = '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>';
ICONS.keys = '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>';
ICONS.sword = '<path d="M14.5 3H21v6.5L10 20.5 3.5 14z"/><path d="m3 21 4-4M6 13l5 5"/>';

Object.assign(ACTIONS, {
  toggleSound: () => { Store.data.settings.sound = !Store.data.settings.sound; Store.save(); Game.hud(); if (Store.data.settings.sound) Sound.play('ok'); },
  help: () => showHelp(),
  startBoss: (el) => startArena('boss', el.dataset.id),
  startBlitz: () => startArena('blitz'),
  startSurvie: () => startArena('survie'),
  arenaAnswer: (el) => answerArena(Number(el.dataset.k)),
  arenaNext: () => nextArena(session),
  replay: () => { const s = session; startArena(s.mode, s.chap && s.chap.id); }
});

// Fin de QCM : badge « Sans faute »
const _nextQ = ACTIONS.nextQ;
ACTIONS.nextQ = () => { _nextQ(); if (session && session.type === 'qcm' && session.i >= session.list.length) Game.event('qcmEnd', session.results); };

// Chaque rendu met aussi à jour le HUD de la barre de titre
const _render = render;
render = function () { _render(); Game.hud(); };

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || !document.getElementById('paletteBack').hidden) return;
  if (document.querySelector('.modal-back')) { if (e.key === 'Escape' || e.key === 'Enter') document.querySelector('.modal-back').remove(); return; }
  if (view.name === 'play' && session && session.type === 'arena' && !session.done) {
    const k = e.key.toLowerCase(), q = session.cur;
    if (!session.locked) {
      if (q.type === 'vf' && (k === 'v' || k === '1')) answerArena(0);
      else if (q.type === 'vf' && (k === 'f' || k === '2')) answerArena(1);
      else if (q.type === 'qcm' && Number(k) >= 1 && Number(k) <= q.opts.length) answerArena(Number(k) - 1);
    } else if (k === 'enter' && session.picked !== session.cur.ans && session.mode !== 'blitz') nextArena(session);
    return;
  }
  if (view.name === 'play' && session && session.done && e.key === 'Enter') { ACTIONS.replay(); return; }
  const busy = ['flash', 'qcm', 'exam', 'trainer', 'play'].includes(view.name);
  if (busy || e.ctrlKey || e.altKey || e.metaKey) return;
  const map = { p: 'path', d: 'dashboard', a: 'arena', f: 'flashSetup', q: 'qcmSetup', t: 'td', e: 'train' };
  if (e.key === '?') showHelp();
  else if (map[e.key.toLowerCase()]) go(map[e.key.toLowerCase()]);
});
