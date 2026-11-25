// Menu en groupes, pages de groupe et écran « Aujourd'hui »
const GROUPS = [
  { v: 'today', i: 'home', t: 'Aujourd’hui', on: [], sub: [] },
  { v: 'path', i: 'route', t: 'Parcours', on: ['lesson', 'play'], sub: [['arena', 'sword', 'Arène', 'Boss, Blitz et Survie']] },
  { v: 'hubTrain', i: 'calc', t: 'S’entraîner', on: ['trainer', 'tuto', 'niv', 'atl', 'simu', 'tdEx', 'tdPdf'], sub: [['train', 'calc', 'Calculs', 'Cinq niveaux par méthode'], ['ateliers', 'layers', 'Ateliers', 'Méthodes, modèles, démonstrations, simulations'], ['td', 'pencil', 'TD corrigés', 'Les exercices de tes profs, étape par étape']] },
  { v: 'hubRev', i: 'cards', t: 'Réviser', on: ['flash', 'qcm', 'chapter'], sub: [['flashSetup', 'cards', 'Flashcards', 'Les notions, au bon moment'], ['qcmSetup', 'quiz', 'QCM', 'Normal, difficile ou mélangé'], ['formules', 'book', 'Formules', 'Formules et méthodes à imprimer']] },
  { v: 'hubExam', i: 'timer', t: 'Examen', on: ['exam', 'mixte', 'annale'], sub: [['plan', 'target', 'Préparer l’examen', 'La date, et ce qu’il reste par jour'], ['examSetup', 'timer', 'Examen blanc', 'QCM, examen complet, annale']] },
  { v: 'hubProg', i: 'chart', t: 'Progrès', on: [], sub: [['dashboard', 'home', 'Tableau de bord', 'Quêtes, chapitres et activité'], ['weak', 'flag', 'Points faibles', 'Ce qui revient, et pourquoi'], ['stats', 'chart', 'Statistiques', 'Chiffres et réglages du compte']] }
];
// Un cours sans calcul (ACL) n'affiche pas la page des calculs
const subsOf = (g) => g.sub.filter(([v]) => v !== 'train' || myTrainers().length);
const groupOf = (name) => GROUPS.find((g) => g.v === name || g.on.includes(name) || g.sub.some((s) => s[0] === name)) || GROUPS[0];

function menuBadges() {
  const g = globalStats(), due = Rev.due();
  return { flashSetup: g.due + g.newAvail, weak: Object.keys(Store.data.wrong).filter((k) => k.startsWith(course.id + ':')).length, today: due.qs.length + due.tr.length + due.td.length };
}
function menuHtml() {
  const cur = groupOf(view.name), b = menuBadges();
  const count = (n) => (n ? `<span class="count">${n}</span>` : '');
  return GROUPS.map((g) => `<button class="nav-item ${g === cur ? 'active' : ''}" data-act="go" data-v="${g.v}"><span class="ico" data-i="${g.i}"></span>${g.t}${count(b[g.v])}</button>
    ${g === cur && g.sub.length ? `<div class="nav-subs">${subsOf(g).map(([v, , t]) => `<button class="nav-sub ${v === view.name ? 'on' : ''}" data-act="go" data-v="${v}">${t}${count(b[v])}</button>`).join('')}</div>` : ''}`).join('');
}

GROUPS.filter((g) => g.v.startsWith('hub')).forEach((g) => {
  VIEWS[g.v] = () => {
    const b = menuBadges();
    return `<div class="page">
      <div class="head-row"><div><div class="h-eyebrow">${esc(course.titre)}</div><h1>${g.t}</h1></div></div>
      <div class="hub">${subsOf(g).map(([v, i, t, d]) => `<button class="panel hub-card" data-act="go" data-v="${v}"><span class="hub-i">${icon(i)}</span><span class="td-ct"><span class="t">${t}</span><span class="d">${d}</span></span>${b[v] ? `<span class="chip acc">${b[v]}</span>` : ''}<span class="ico td-go" data-i="arrowR"></span></button>`).join('')}</div>
      ${g.v === 'hubRev' ? `<div class="section-title"><h2>Fiches des chapitres</h2></div><div class="td-grid">${chapters.map((ch) => { const s = chapStats(ch); return `<button class="panel td-card" data-act="chap" data-id="${ch.id}"><span class="td-n" style="color:${ch.color}">${ch.num}</span><span class="td-ct"><span class="t">${esc(ch.titre)}</span><span class="d">${s.read} / ${s.secs} parties lues</span></span><span class="ico td-go" data-i="arrowR"></span></button>`; }).join('')}</div>` : ''}
    </div>`;
  };
});

VIEWS.today = () => {
  const h = new Date().getHours(), a = Store.data.activity[Store.today()] || {}, g = globalStats(), due = Rev.due(), nd = due.qs.length + due.tr.length + due.td.length;
  const flat = Path.flat(), cur = Path.current(flat), dateS = ((Store.data.settings.exams || {})[course.id]) || '';
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const days = dateS ? Math.round((new Date(dateS + 'T00:00') - d0) / DAY) : null;
  // Le calcul conseillé : celui du chapitre en cours, sinon le premier pas encore au niveau 4
  const left = myTrainers().filter((t) => Niv.get(t.id) < 4), tr = (cur && left.find((t) => TR_CH[t.id] === cur.ch.id)) || left[0];
  const td = Td.order().find((e) => Td.st(e) !== 'ok'), cards = g.due + g.newAvail;
  const items = [];
  if (nd) items.push(['rotate', 'Revoir tes erreurs', plural(nd, 'élément'), due.qs.length ? 'data-act="revQcm"' : 'data-act="go" data-v="weak"', false]);
  if (cur) items.push(['route', cur.kind === 'review' ? 'Révision de l’unité' : `Leçon ${cur.k + 1} sur ${cur.L}`, cur.ch.titre, `data-act="startLesson" data-key="${cur.key}"`, (a.lessons || 0) > 0]);
  if (tr) items.push(['calc', tr.titre, `Niveau ${Math.min(5, Niv.get(tr.id) + 1)} : ${NIV[Math.min(4, Niv.get(tr.id))][0].toLowerCase()}`, `data-act="nivGo" data-id="${tr.id}" data-lv="${Niv.get(tr.id) + 1}"`, false]);
  if (cards) items.push(['cards', 'Cartes du jour', plural(cards, 'carte'), 'data-act="startDaily"', false]);
  if (td && (course.id !== 'reseaux' || days !== null)) items.push(['pencil', `TD : ${td.titre}`, td.theme, `data-act="tdOpen" data-n="${td.n}"`, false]);
  const goal = Store.data.settings.goal || 20, xp = Path.xpToday();
  return `<div class="page today-p">
    <div class="head-row"><div><h1>${h < 6 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir'}</h1><p class="sub">${days === null ? 'Voici quoi faire aujourd’hui.' : days > 0 ? `Examen dans ${plural(days, 'jour')}.` : days === 0 ? 'L’examen est aujourd’hui. Bon courage.' : 'Voici quoi faire aujourd’hui.'}</p></div>
      <div class="seg">${window.COURSES.map((c) => `<button class="${c === course ? 'on' : ''}" data-act="todayCourse" data-id="${c.id}">${esc(c.court || c.titre)}</button>`).join('')}</div></div>
    <button class="panel hub-card today-go" data-act="seance"><span class="hub-i">${icon('timer')}</span><span class="td-ct"><span class="t">Séance de 10 minutes</span><span class="d">Un mélange de questions, de cartes et de calculs, choisi pour toi</span></span><span class="ico td-go" data-i="arrowR"></span></button>
    <div class="section-title"><h2>À faire</h2><span class="muted">${xp} / ${goal} XP, série de ${plural(Store.streak(), 'jour')}</span></div>
    <div class="hub">${items.map(([i, t, d, act, ok]) => `<button class="panel hub-card ${ok ? 'ok' : ''}" ${act}><span class="hub-i">${icon(ok ? 'check' : i)}</span><span class="td-ct"><span class="t">${Td.txt(t)}</span><span class="d">${esc(d)}</span></span><span class="ico td-go" data-i="arrowR"></span></button>`).join('') || '<div class="empty">Tout est fait pour aujourd’hui.</div>'}</div>
    <div class="today-b">
      ${days === null ? '<button class="btn" data-act="go" data-v="plan"><span class="ico" data-i="target"></span>Donner la date de l’examen</button>' : '<button class="btn" data-act="go" data-v="plan"><span class="ico" data-i="target"></span>Mon plan</button>'}
      <button class="btn" data-act="go" data-v="arena"><span class="ico" data-i="sword"></span>Arène</button>
      <button class="btn" data-act="go" data-v="hubProg"><span class="ico" data-i="chart"></span>Mes progrès</button>
      <button class="btn" data-act="openTheme"><span class="ico" data-i="size"></span>Taille et thème</button>
    </div>
  </div>`;
};
Object.assign(ACTIONS, {
  todayCourse: (el) => { Store.data.course = el.dataset.id; Store.data.last = null; Store.save(); buildIndex(); buildSearch(); go('today'); }
});
