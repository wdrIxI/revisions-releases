// Application de revision : routage, vues et sessions
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pct = (x) => Math.round(x * 100);
const plural = (n, s, p) => `${n} ${n > 1 ? (p || s + 's') : s}`;

const COLORS = ['#ffc44d', '#5cc8ff', '#b3a8ff', '#ff8fb1', '#45e3a5', '#ff9d5c', '#7fd3ff', '#d6a8ff', '#c6e86b'];

let course, chapters, allCards, allQcm, allHard; // allHard : banque difficile, jamais utilisée par le parcours, l'Arène ni l'examen
let view = { name: 'today' };
let session = null;      // session en cours (flash, qcm, exam, trainer)
let lastInput = Date.now();

/* ---------- Donnees ---------- */
const myExams = () => Store.data.exams.filter((e) => (e.course || 'reseaux') === course.id);
const myTrainers = () => TRAINERS.filter((t) => (course.trainers || []).includes(t.id));
const rk = (ch, i) => `${course.id}:${ch.id}:s:${i}`;   // section lue
const tk = (n) => `${course.id}:${n}`;                   // exercice de TD
let courseMenu = false;

function buildIndex() {
  course = window.COURSES.find((c) => c.id === Store.data.course) || window.COURSES[0];
  Store.data.course = course.id;
  chapters = course.chapitres;
  allCards = []; allQcm = []; allHard = [];
  chapters.forEach((ch, ci) => {
    ch.color = COLORS[ci % COLORS.length];
    ch.num = ci + 1;
    ch.cartes.forEach((c) => allCards.push({ ...c, id: `${course.id}:${ch.id}:c:${hash(c.q)}`, chap: ch }));
    ch.qcm.forEach((q) => allQcm.push({ ...q, id: `${course.id}:${ch.id}:q:${hash(q.q)}`, chap: ch }));
    (ch.difficile || []).forEach((q) => allHard.push({ ...q, id: `${course.id}:${ch.id}:h:${hash(q.q)}`, chap: ch, hard: true }));
  });
}
// Niveau du mode QCM : normal, difficile ou les deux mélangés
const qcmLevel = () => { const s = Store.data.settings; return !allHard.length ? 'normal' : s.qcmLevel || (s.qcmHard ? 'hard' : 'normal'); };
const qcmPool = () => ({ normal: allQcm, hard: allHard, mix: anyQcm() })[qcmLevel()];
const anyQcm = () => [...allQcm, ...allHard];

// Sigles présents dans ces textes, avec leur signification (lexique du cours)
function sigles(texts, max = 8) {
  const g = course.glossaire;
  if (!g) return [];
  if (!course._sig) {
    const keys = Object.keys(g).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
    course._sig = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${keys.join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
  }
  const found = new Set();
  texts.forEach((t) => { for (const m of String(t || '').matchAll(course._sig)) found.add(m[0]); });
  return [...found].slice(0, max).map((k) => [k, g[k]]);
}
const siglesHtml = (texts, max) => sigles(texts, max).map(([k, v]) => `<div class="sigle"><span>${esc(k)}</span> ${esc(v)}</div>`).join('');

const qstat = () => (Store.data.qstat = Store.data.qstat || {});

function chapStats(ch) {
  const cards = allCards.filter((c) => c.chap === ch);
  const lv = [0, 0, 0, 0];
  cards.forEach((c) => lv[SRS.level(c.id)]++);
  const w = [0, 0.25, 0.6, 1];
  const cardScore = cards.length ? cards.reduce((a, c) => a + w[SRS.level(c.id)], 0) / cards.length : 0;
  const qs = allQcm.filter((q) => q.chap === ch);
  const st = qstat();
  const qOk = qs.filter((q) => st[q.id] && st[q.id].lastOk).length;
  const qDone = qs.filter((q) => st[q.id]).length;
  const qScore = qs.length ? qOk / qs.length : 0;
  const due = cards.filter((c) => SRS.isDue(c.id)).length;
  const secs = ch.fiche.length, read = ch.fiche.filter((_, i) => Store.data.read[rk(ch, i)]).length;
  return { cards: cards.length, lv, cardScore, qcm: qs.length, qOk, qDone, qScore, due, secs, read, mastery: pct(0.55 * cardScore + 0.45 * qScore) };
}

function globalStats() {
  const per = chapters.map(chapStats);
  const cards = allCards.length;
  const mastered = per.reduce((a, s) => a + s.lv[3], 0);
  const seen = cards - per.reduce((a, s) => a + s.lv[0], 0);
  const due = per.reduce((a, s) => a + s.due, 0);
  const st = qstat();
  const answered = Object.keys(st).filter((k) => k.startsWith(course.id + ":")).map((k) => st[k]);
  const okRate = answered.length ? answered.filter((x) => x.lastOk).length / answered.length : 0;
  const mastery = Math.round(per.reduce((a, s) => a + s.mastery, 0) / per.length);
  const newLeft = Math.max(0, Store.data.settings.newPerDay - Store.newSeenToday());
  const newAvail = Math.min(newLeft, cards - seen);
  return { per, cards, mastered, seen, due, okRate, mastery, newAvail, answered: answered.length };
}

/* ---------- Navigation ---------- */
function go(name, params = {}) {
  if (session && session.timerId) clearInterval(session.timerId);
  if (!['flash', 'qcm', 'exam', 'trainer', 'lesson', 'tuto', 'niv', 'mixte'].includes(name)) session = null;
  view = { name, ...params };
  if (['path', 'dashboard', 'chapter', 'td', 'train', 'stats', 'weak'].includes(name)) { Store.data.last = view; Store.save(); }
  render();
  $('#main').scrollTop = 0;
}

function render() {
  renderSidebar();
  const v = VIEWS[view.name] || VIEWS.dashboard;
  $('#main').innerHTML = v();
  hydrateIcons($('#main'));
  if (VIEWS_AFTER[view.name]) VIEWS_AFTER[view.name]();
}

function renderSidebar() {
  const inChap = view.name === 'chapter';
  $('#sidebar').innerHTML = `
    <button class="course-card ${courseMenu ? 'open' : ''}" data-act="courseMenu" title="Changer de cours">
      <div class="course-ava">${esc(course.titre[0])}</div>
      <div style="min-width:0;flex:1;text-align:left"><div class="t1">${esc(course.titre)}</div><div class="t2">${esc(course.sousTitre)}</div></div>
      <span class="ico" data-i="shuffle"></span>
    </button>
    ${courseMenu ? `<div class="course-menu">${window.COURSES.map((c) => `<button class="nav-item ${c === course ? 'active' : ''}" data-act="switchCourse" data-id="${c.id}"><span class="course-ava sm">${esc(c.titre[0])}</span>${esc(c.titre)}</button>`).join('')}</div>` : ''}
    ${menuHtml()}
    <button class="nav-item" data-act="openTheme"><span class="ico" data-i="size"></span>Taille et thème</button>
    <div class="nav-label">Chapitres</div>
    ${chapters.map((ch) => `<button class="nav-item ${inChap && view.id === ch.id ? 'active' : ''}" data-act="chap" data-id="${ch.id}"><span class="dot" style="background:${ch.color}"></span>${esc(ch.titre)}</button>`).join('')}
    <div class="side-foot">
      <div class="streak-box"><span class="ico" data-i="flame"></span><div><div class="n">${Store.streak()}</div><div class="l">${Store.streak() > 1 ? 'jours de suite' : 'jour de série'}</div></div></div>
    </div>`;
  hydrateIcons($('#sidebar'));
  $('#tbCourse').textContent = `${course.titre} · ${chapters.length} chapitres · ${allCards.length} cartes · ${allQcm.length} questions`;
}

function ring(p, color) {
  const r = 18, c = 2 * Math.PI * r;
  return `<div class="ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="${r}" fill="none" style="stroke:var(--surface-3)" stroke-width="4"/><circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c * p) / 100} ${c}" ${p ? '' : 'opacity="0"'}/></svg><span>${p}%</span></div>`;
}

function levelBar(lv, total) {
  const cols = ['var(--surface-3)', '#5cc8ff', '#b3a8ff', '#45e3a5'];
  return `<div class="bar">${[1, 2, 3].map((i) => `<i style="width:${(lv[i] / total) * 100}%;background:${cols[i]}"></i>`).join('')}</div>`;
}

/* ---------- Vues ---------- */
const VIEWS = {};
const VIEWS_AFTER = {};

VIEWS.dashboard = () => {
  const g = globalStats();
  const h = new Date().getHours();
  const hello = (h < 6 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir') + ', prêt à réviser ?';
  const todo = g.due + g.newAvail;
  const last = Store.data.last && Store.data.last.name === 'chapter' ? chapters.find((c) => c.id === Store.data.last.id) : null;
  return `<div class="page">
    <div class="home-top">
      ${Game.playerCard()}
      <button class="arena-cta" data-act="go" data-v="arena">
        <div class="arena-cta-boss">${bossSvg(chapters[(new Date().getDate()) % chapters.length].color)}</div>
        <div><div class="arena-cta-t">Entrer dans l’Arène</div><div class="arena-cta-d">Boss, Blitz et Survie sur ${esc(course.titre)}</div></div>
      </button>
    </div>
    <div class="section-title"><h2>Quêtes du jour</h2><span class="muted">Renouvelées chaque matin</span></div>
    ${Game.questsHtml()}
    <div class="today">
      <div>
        <h2>${hello}</h2>
        <p class="sub">${todo ? `${plural(g.due, 'carte')} à revoir et ${plural(g.newAvail, 'nouvelle carte', 'nouvelles cartes')} aujourd’hui, environ ${Math.max(2, Math.round(todo * 0.25))} minutes.` : 'Tes flashcards sont à jour. Fais un QCM, un examen blanc ou une partie dans l’Arène.'}</p>
      </div>
      <div class="row">
        <button class="btn primary lg" data-act="startDaily" ${todo ? '' : 'disabled'}><span class="ico" data-i="play"></span>Révision du jour (${todo})</button>
        <button class="btn lg" data-act="seance"><span class="ico" data-i="timer"></span>Séance de 10 min</button>
        <button class="btn lg" data-act="quickQcm"><span class="ico" data-i="quiz"></span>QCM rapide</button>
        ${last ? `<button class="btn ghost lg" data-act="chap" data-id="${last.id}"><span class="ico" data-i="book"></span>Reprendre ${esc(last.titre)}</button>` : ''}
      </div>
    </div>

    <div class="grid g4" style="margin-top:0.875rem">
      <div class="panel stat"><div class="k"><span class="ico" data-i="target"></span>Maîtrise globale</div><div class="v">${g.mastery}%</div><div class="s">cartes + QCM, tous chapitres</div></div>
      <div class="panel stat"><div class="k"><span class="ico" data-i="cards"></span>Cartes maîtrisées</div><div class="v">${g.mastered}<span class="muted" style="font-size:1rem"> / ${g.cards}</span></div><div class="s">${g.seen} déjà vues</div></div>
      <div class="panel stat"><div class="k"><span class="ico" data-i="quiz"></span>Réussite QCM</div><div class="v">${g.answered ? pct(g.okRate) + '%' : '-'}</div><div class="s">${g.answered} / ${allQcm.length} questions tentées</div></div>
      <div class="panel stat"><div class="k"><span class="ico" data-i="flame"></span>Série</div><div class="v">${plural(Store.streak(), 'jour')}</div><div class="s">${minutesToday()} min aujourd’hui</div></div>
    </div>

    <div class="section-title"><h2>Chapitres</h2><span class="legend"><span><i style="background:#5cc8ff"></i>Apprentissage</span><span><i style="background:#b3a8ff"></i>En cours</span><span><i style="background:#45e3a5"></i>Maîtrisé</span></span></div>
    <div class="grid g3">
      ${chapters.map((ch, i) => { const s = g.per[i]; return `
        <button class="panel chap-card" data-act="chap" data-id="${ch.id}">
          <div class="chap-top">
            <div class="chap-num" style="color:${ch.color}">${String(ch.num).padStart(2, '0')}</div>
            <div style="min-width:0"><div class="ttl">${esc(ch.titre)}</div><div class="rs">${esc(ch.resume)}</div></div>
            ${ring(s.mastery, ch.color)}
          </div>
          ${levelBar(s.lv, s.cards)}
          <div class="chap-meta">
            <span class="chip">${s.cards} cartes</span><span class="chip">${s.qcm} QCM</span>
            ${s.due ? `<span class="chip warn">${s.due} à revoir</span>` : ''}
            ${s.read === s.secs ? '<span class="chip good">Fiche lue</span>' : `<span class="chip">Fiche ${s.read}/${s.secs}</span>`}
          </div>
        </button>`; }).join('')}
    </div>

    <div class="grid g2" style="margin-top:1.75rem">
      <div class="panel" style="padding:1.125rem 1.25rem">
        <div class="row between" style="margin-bottom:0.875rem"><h3>Activité</h3><span class="muted" style="font-size:0.75rem">18 dernières semaines</span></div>
        ${heatmap()}
      </div>
      <div class="grid" style="gap:0.625rem">
        <button class="panel quick" data-act="go" data-v="examSetup"><div class="qi" style="background:var(--blue-soft);color:var(--accent-2)"><span class="ico" data-i="timer"></span></div><div><div class="t">Examen blanc</div><div class="d">30 questions mélangées, 30 minutes, correction à la fin</div></div></button>
        <button class="panel quick" data-act="go" data-v="td"><div class="qi" style="background:var(--warn-soft);color:var(--warn)"><span class="ico" data-i="pencil"></span></div><div><div class="t">TD corrigés</div><div class="d">${course.td.exercices.length} exercices avec indice et correction pas à pas</div></div></button>
        <button class="panel quick" data-act="go" data-v="train"><div class="qi" style="background:var(--accent-soft);color:var(--accent)"><span class="ico" data-i="calc"></span></div><div><div class="t">Entraînement calcul</div><div class="d">${myTrainers().length} types d’exercices générés à l’infini, corrigés automatiquement</div></div></button>
      </div>
    </div>
  </div>`;
};

function minutesToday() {
  const a = Store.data.activity[Store.today()];
  return a ? Math.round((a.ms || 0) / 60000) : 0;
}

function heatmap() {
  const days = 18 * 7;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 17 * 7); // lundi d'il y a 17 semaines
  let html = '<div class="heat">';
  for (let i = 0; i < days; i++) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const a = Store.data.activity[k];
    const n = a ? a.cards + a.qcm : 0;
    const l = n === 0 ? '' : n < 10 ? 'l1' : n < 30 ? 'l2' : n < 60 ? 'l3' : 'l4';
    html += `<i class="${l}" title="${d.toLocaleDateString('fr-FR')} : ${n} révisions"></i>`;
    d.setDate(d.getDate() + 1);
  }
  return html + '</div>';
}

/* ---------- Chapitre ---------- */
VIEWS.chapter = () => {
  const ch = chapters.find((c) => c.id === view.id);
  const s = chapStats(ch);
  const tab = view.tab || 'fiche';
  const tabs = [['fiche', 'book', 'Fiche de révision'], ['cartes', 'cards', `Flashcards (${s.cards})`], ['qcm', 'quiz', `QCM (${s.qcm})`], ['pdf', 'file', 'Diapositives']];
  let body = '';
  if (tab === 'fiche') {
    body = `<div class="fiche-layout">
      <div class="toc">${ch.fiche.map((f, i) => `<button class="${Store.data.read[rk(ch, i)] ? 'done' : ''}" data-act="toc" data-i="${i}"><span class="tk"></span>${esc(f.titre)}</button>`).join('')}</div>
      <div>${ch.fiche.map((f, i) => { const on = Store.data.read[rk(ch, i)]; return `
        <section class="panel f-sec" id="sec-${i}">
          <div class="f-sec-head"><h3>${esc(f.titre)}</h3>
            <button class="readbtn" data-act="pdfAt" data-page="${f.page}"><span class="ico" data-i="file"></span>PDF p. ${f.page}</button>
            <button class="readbtn ${on ? 'on' : ''}" data-act="read" data-i="${i}"><span class="ico" data-i="check"></span>${on ? 'Lu' : 'Marquer lu'}</button>
          </div>
          ${f.formule ? `<div class="f-formula">${esc(f.formule)}</div>` : ''}
          ${f.fig ? `<figure class="td-fig">${f.fig}${f.leg ? `<figcaption>${esc(f.leg)}</figcaption>` : ''}</figure>` : ''}<ul class="f-points">${f.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          ${noteHtml(rk(ch, i))}
        </section>`; }).join('')}
        <div class="row" style="justify-content:center;margin-top:1.25rem">
          <button class="btn primary" data-act="chapFlash" data-id="${ch.id}"><span class="ico" data-i="cards"></span>Réviser les cartes</button>
          <button class="btn" data-act="chapQcm" data-id="${ch.id}"><span class="ico" data-i="quiz"></span>Faire le QCM</button>
        </div>
      </div></div>`;
  } else if (tab === 'cartes') {
    const cards = allCards.filter((c) => c.chap === ch);
    const lbl = ['Nouvelle', 'Apprentissage', 'En cours', 'Maîtrisée'], cls = ['', 'acc', 'warn', 'good'];
    body = `<div class="row between" style="margin:1.375rem 0 0.875rem">
        <div class="row">${['Nouvelles', 'Apprentissage', 'En cours', 'Maîtrisées'].map((l, i) => `<span class="chip ${cls[i]}">${s.lv[i]} ${l.toLowerCase()}</span>`).join('')}</div>
        <div class="row"><button class="btn" data-act="chapFlashAll" data-id="${ch.id}"><span class="ico" data-i="shuffle"></span>Toutes (mode libre)</button><button class="btn primary" data-act="chapFlash" data-id="${ch.id}"><span class="ico" data-i="play"></span>Réviser (${s.due + Math.min(cards.filter((c) => !Store.data.srs[c.id]).length, Math.max(0, Store.data.settings.newPerDay - Store.newSeenToday()))})</button></div>
      </div>
      <div class="panel">${cards.map((c) => { const l = SRS.level(c.id); return `<div class="list-row"><div class="lt"><div>${esc(c.q)}</div><div class="a">${esc(c.r)}</div></div><span class="chip ${cls[l]}">${lbl[l]}</span></div>`; }).join('')}</div>`;
  } else if (tab === 'qcm') {
    const qs = allQcm.filter((q) => q.chap === ch), st = qstat();
    body = `<div class="row between" style="margin:1.375rem 0 0.875rem">
        <div class="row"><span class="chip good">${s.qOk} réussies</span><span class="chip bad">${s.qDone - s.qOk} ratées</span><span class="chip">${s.qcm - s.qDone} jamais tentées</span></div>
        <button class="btn primary" data-act="chapQcm" data-id="${ch.id}"><span class="ico" data-i="play"></span>Lancer le QCM du chapitre</button>
      </div>
      <div class="panel">${qs.map((q) => { const x = st[q.id]; return `<div class="list-row"><div class="lt"><div>${esc(q.q)}</div><div class="a">${esc(q.c[q.a])}</div></div>${x ? `<span class="chip ${x.lastOk ? 'good' : 'bad'}">${x.lastOk ? 'Réussie' : 'Ratée'}</span>` : '<span class="chip">Non tentée</span>'}</div>`; }).join('')}</div>`;
  } else {
    body = `<div class="row between" style="margin-top:1.125rem"><span class="muted">${esc(ch.pdf)}</span><button class="btn sm" data-act="pdfExt" data-file="${esc(ch.pdf)}"><span class="ico" data-i="external"></span>Ouvrir dans le lecteur PDF</button></div><div class="pdf-wrap" id="pdfWrap"></div>`;
  }
  return `<div class="page">
    <div class="head-row">
      <div>
        <div class="h-eyebrow" style="color:${ch.color}">Chapitre ${ch.num}</div>
        <h1>${esc(ch.titre)}</h1>
        <p class="sub">${esc(ch.resume)}</p>
      </div>
      <div class="row">${ring(s.mastery, ch.color)}</div>
    </div>
    <div class="tabs">${tabs.map(([k, i, l]) => `<button class="tab ${tab === k ? 'active' : ''}" data-act="tab" data-tab="${k}"><span class="ico" data-i="${i}"></span>${l}</button>`).join('')}</div>
    ${body}
  </div>`;
};

VIEWS_AFTER.chapter = async () => {
  if ((view.tab || 'fiche') === 'pdf') {
    const ch = chapters.find((c) => c.id === view.id);
    const url = await Account.pdfUrl(course.id, ch.pdf);
    const w = $('#pdfWrap');
    if (!w) return;
    w.innerHTML = url ? `<iframe src="${url}#page=${view.page || 1}&toolbar=1&view=FitH"></iframe>` : '<div class="empty">PDF indisponible : connecte-toi à internet pour le télécharger une première fois.</div>';
  }
  if (view.scrollTo !== undefined) {
    const el = $(`#sec-${view.scrollTo}`);
    if (el) el.scrollIntoView({ block: 'start' });
    view.scrollTo = undefined;
  }
};

/* ---------- Choix de chapitres ---------- */
function chapPicker(selected, counter) {
  return `<div class="chk-grid">${chapters.map((ch) => `<button class="chk ${selected.includes(ch.id) ? 'on' : ''}" data-act="pick" data-id="${ch.id}"><span class="box"></span>${esc(ch.titre)}<span class="cnt">${counter(ch)}</span></button>`).join('')}</div>`;
}

function selectedChaps() {
  if (!view.sel) view.sel = chapters.map((c) => c.id);
  return view.sel;
}

/* ---------- Flashcards ---------- */
VIEWS.flashSetup = () => {
  const sel = selectedChaps();
  const mode = view.mode || 'jour';
  const q = buildFlashQueue(sel, mode);
  return `<div class="page">
    <div class="head-row"><div><div class="h-eyebrow">Répétition espacée</div><h1>Flashcards</h1><p class="sub">Les cartes reviennent au bon moment selon ta note : celles que tu rates reviennent vite, celles que tu maîtrises s’espacent.</p></div></div>
    <div class="panel picker">
      <div class="row between">
        <h3>Mode</h3>
        <div class="seg">${[['jour', 'Révision du jour'], ['tout', 'Toutes les cartes'], ['faibles', 'Points faibles']].map(([k, l]) => `<button class="${mode === k ? 'on' : ''}" data-act="mode" data-mode="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="row between" style="margin-top:1.125rem"><h3>Chapitres</h3><div class="row"><button class="btn sm ghost" data-act="pickAll">Tout</button><button class="btn sm ghost" data-act="pickNone">Aucun</button></div></div>
      ${chapPicker(sel, (ch) => { const s = chapStats(ch); return mode === 'jour' ? `${s.due} dues` : `${s.cards}`; })}
      <div class="row between">
        <span class="muted">${q.length ? `${plural(q.length, 'carte')} dans cette session` : mode === 'jour' ? 'Rien à réviser pour ces chapitres aujourd’hui.' : 'Aucune carte.'}</span>
        <button class="btn primary lg" data-act="startFlash" ${q.length ? '' : 'disabled'}><span class="ico" data-i="play"></span>Commencer</button>
      </div>
    </div>
    <div class="kbd-hint"><span><kbd>Espace</kbd> retourner</span><span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> noter</span><span><kbd>Échap</kbd> quitter</span></div>
  </div>`;
};

function buildFlashQueue(sel, mode) {
  const pool = allCards.filter((c) => sel.includes(c.chap.id));
  if (mode === 'tout') return shuffle(pool);
  if (mode === 'faibles') return shuffle(pool.filter((c) => Store.data.wrong[c.id] || (Store.data.srs[c.id] && Store.data.srs[c.id].lapses > 0)));
  const due = pool.filter((c) => SRS.isDue(c.id)).sort((a, b) => Store.data.srs[a.id].due - Store.data.srs[b.id].due);
  const left = Math.max(0, Store.data.settings.newPerDay - Store.newSeenToday());
  // Nouvelles cartes dans l'ordre du cours, en alternant les chapitres
  const fresh = pool.filter((c) => !Store.data.srs[c.id]).slice(0, left);
  const out = [];
  let i = 0, j = 0;
  while (i < due.length || j < fresh.length) {
    if (i < due.length) out.push(due[i++]);
    if (i < due.length) out.push(due[i++]);
    if (j < fresh.length) out.push(fresh[j++]);
  }
  return out;
}

function startFlash(queue, label) {
  session = { type: 'flash', queue: [...queue], done: 0, total: queue.length, flipped: false, stats: [0, 0, 0, 0, 0], label };
  view = { name: 'flash' };
  render();
}

VIEWS.flash = () => {
  const s = session;
  if (!s.queue.length) {
    const ok = s.stats[3] + s.stats[4];
    return `<div class="page"><div class="session"><div class="panel result">
      <div class="h-eyebrow">Session terminée</div>
      <div class="score">${s.done}</div><div class="sub">cartes révisées</div>
      <div class="row" style="justify-content:center;margin-top:1.125rem"><span class="chip bad">${s.stats[1]} à revoir</span><span class="chip warn">${s.stats[2]} difficiles</span><span class="chip good">${s.stats[3]} bien</span><span class="chip acc">${s.stats[4]} faciles</span></div>
      <p class="sub" style="margin-top:1rem">${s.done ? `${pct(ok / Math.max(1, s.stats.slice(1).reduce((a, b) => a + b, 0)))} % de bonnes réponses du premier coup ou après relecture.` : ''}</p>
      <div class="row" style="justify-content:center;margin-top:1.375rem"><button class="btn primary" data-act="go" data-v="dashboard">Tableau de bord</button><button class="btn" data-act="go" data-v="qcmSetup">Enchaîner sur un QCM</button></div>
    </div></div></div>`;
  }
  const c = s.queue[0];
  const st = Store.data.srs[c.id];
  const lvl = SRS.level(c.id);
  const lbl = ['Nouvelle', 'Apprentissage', 'En cours', 'Maîtrisée'][lvl];
  const prog = (s.done / (s.done + s.queue.length)) * 100;
  return `<div class="page"><div class="session">
    <div class="sess-top">
      <button class="btn ghost sm" data-act="go" data-v="flashSetup"><span class="ico" data-i="arrowL"></span>Quitter</button>
      <div class="bar"><i style="width:${prog}%"></i></div>
      <div class="sess-count">${s.done} / ${s.done + s.queue.length}</div>
    </div>
    <div class="flash ${s.flipped ? 'flipped' : ''}" data-act="flip">
      <div class="flash-inner">
        <div class="face front">
          <span class="tag" style="color:${c.chap.color}">${esc(c.chap.titre)}</span>
          <span class="lvl chip">${lbl}</span>
          <div class="q">${esc(c.q)}</div>
          <div class="hint"><kbd>Espace</kbd> afficher la réponse</div>
        </div>
        <div class="face back">
          <span class="tag" style="color:${c.chap.color}">${esc(c.chap.titre)}</span>
          <div class="muted" style="font-size:0.8125rem;margin-bottom:0.875rem;max-width:37.5rem">${esc(c.q)}</div>
          <div class="a">${esc(c.r)}${c.e ? `<div class="card-why">${esc(c.e)}</div>` : ''}<div class="sigles">${siglesHtml([c.q, c.r], 4)}</div></div>
        </div>
      </div>
    </div>
    <div class="grades" style="visibility:${s.flipped ? 'visible' : 'hidden'}">
      ${[[1, 'À revoir'], [2, 'Difficile'], [3, 'Bien'], [4, 'Facile']].map(([g, l]) => `<button class="grade g${g}" data-act="grade" data-g="${g}"><span class="gl">${l}</span><span class="gi">${SRS.label(st, g)}</span><span class="gk">${g}</span></button>`).join('')}
    </div>
    ${s.flipped ? '' : '<div class="kbd-hint"><span>Essaie de formuler la réponse avant de retourner la carte.</span></div>'}
  </div></div>`;
};

function gradeCard(g) {
  const s = session, c = s.queue.shift();
  SRS.apply(c.id, g);
  s.stats[g]++;
  if (g === 1) s.queue.splice(Math.min(3, s.queue.length), 0, c); // revient dans la session
  else s.done++;
  s.flipped = false;
  Store.save();
  render();
}

/* ---------- QCM ---------- */
// Filtre de l'écran de choix : toutes, jamais faites ou ratées au dernier essai
const qcmFilter = (pool, only) => { const st = qstat(); return only === 'new' ? pool.filter((q) => !st[q.id]) : only === 'ko' ? pool.filter((q) => st[q.id] && !st[q.id].lastOk) : pool; };
VIEWS.qcmSetup = () => {
  const sel = selectedChaps();
  const n = view.n || 10, only = view.only || 'all', level = qcmLevel();
  const inSel = qcmPool().filter((q) => sel.includes(q.chap.id)), pool = qcmFilter(inSel, only);
  const seg = (act, cur, list) => `<div class="seg">${list.map(([k, l]) => `<button class="${String(cur) === String(k) ? 'on' : ''}" data-act="${act}" data-v="${k}">${l}</button>`).join('')}</div>`;
  const count = (k) => qcmFilter(inSel, k).length;
  const what = { normal: 'Les questions habituelles.', hard: 'Quatre réponses sur la même notion, avec des pièges proches.', mix: 'Questions normales et difficiles mélangées.' }[level];
  return `<div class="page">
    <div class="head-row"><div><div class="h-eyebrow">Entraînement</div><h1>QCM</h1><p class="sub">Correction après chaque réponse. Une question ratée revient à la fin de la série, jusqu’à ce qu’elle soit juste.</p></div></div>
    <div class="panel picker">
      ${allHard.length ? `<div class="row between q-opt"><div><h3>Difficulté</h3><div class="muted" style="font-size:0.8125rem;margin-top:0.1875rem">${what}</div></div>${seg('qLevel', level, [['normal', 'Normal'], ['hard', 'Difficile'], ['mix', 'Mélange']])}</div>` : ''}
      <div class="row between q-opt"><h3>Questions</h3>${seg('qOnly', only, [['all', `Toutes (${count('all')})`], ['new', `Nouvelles (${count('new')})`], ['ko', `Ratées (${count('ko')})`]])}</div>
      <div class="row between"><h3>Nombre de questions</h3>
        <div class="seg">${[[10, '10'], [20, '20'], [40, '40'], [999, 'Toutes']].map(([k, l]) => `<button class="${n === k ? 'on' : ''}" data-act="qn" data-n="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="row between" style="margin-top:1.125rem"><h3>Chapitres</h3><div class="row"><button class="btn sm ghost" data-act="pickAll">Tout</button><button class="btn sm ghost" data-act="pickNone">Aucun</button></div></div>
      ${chapPicker(sel, (ch) => `${qcmFilter(qcmPool().filter((q) => q.chap === ch), only).length}`)}
      <div class="row between">
        <span class="muted">${pool.length ? `${plural(Math.min(n, pool.length), 'question')} sur ${pool.length}${only === 'all' ? ', les jamais tentées et les ratées en priorité' : ''}` : only === 'ko' ? 'Aucune question ratée dans ces chapitres.' : only === 'new' ? 'Tu as déjà fait toutes les questions de ces chapitres.' : 'Choisis au moins un chapitre.'}</span>
        <button class="btn primary lg" data-act="startQcm" ${pool.length ? '' : 'disabled'}><span class="ico" data-i="play"></span>Commencer</button>
      </div>
    </div>
    <div class="kbd-hint"><span><kbd>1</kbd> à <kbd>4</kbd> répondre</span><span><kbd>0</kbd> je ne sais pas</span><span><kbd>Entrée</kbd> question suivante</span></div>
  </div>`;
};

function pickQuestions(pool, n) {
  const st = qstat();
  // Priorite : jamais tentees, puis ratees, puis reussies ; melange dans chaque groupe
  const groups = [[], [], []];
  pool.forEach((q) => groups[!st[q.id] ? 0 : st[q.id].lastOk ? 2 : 1].push(q));
  return [...shuffle(groups[0]), ...shuffle(groups[1]), ...shuffle(groups[2])].slice(0, n);
}

function prepQ(q) {
  const order = q.fixe ? q.c.map((_, i) => i) : shuffle(q.c.map((_, i) => i));
  return { ...q, order, answer: order.indexOf(q.a) };
}

// Réponses rééquilibrées (data/qcm-pieges.js), seulement dans ce mode
const qcmQ = (q) => prepQ(q.pieges ? { ...q, c: q.pieges, a: 0 } : q);
function startQcm(list, label) {
  session = { type: 'qcm', list: shuffle(list).map(qcmQ), i: 0, picked: null, results: [], label };
  session.total = session.list.length;
  view = { name: 'qcm' };
  render();
}

function recordAnswer(q, ok, silent) {
  const st = qstat();
  const x = st[q.id] || { ok: 0, ko: 0 };
  ok ? x.ok++ : x.ko++;
  x.lastOk = ok;
  st[q.id] = x;
  if (!ok) Store.data.wrong[q.id] = (Store.data.wrong[q.id] || 0) + 1;
  else if (Store.data.wrong[q.id]) delete Store.data.wrong[q.id];
  if (ok) Rev.ok(q.id); else Rev.fail(q.id);
  Store.bump('qcm');
  if (!silent) if (typeof Game !== 'undefined') Game.event('qcm', ok);
}

// Correction : explication, ce que l'élève a répondu, passage du cours et sigles
function qcmExplain(s, q) {
  const ok = s.picked === q.answer, x = typeof courseExtract === 'function' ? courseExtract(q.chap, q.q, q.c[q.a]) : null;
  const pts = x ? x.points.filter((t) => fold(t) !== fold(q.e) && fold(t) !== fold(q.c[q.a])) : [];
  return `<div class="explain q-why"><span class="ico" data-i="bulb"></span><div>
    <div class="qw-t" style="color:var(--${ok ? 'good' : 'bad'})">${ok ? 'Bonne réponse' : s.picked < 0 ? 'La bonne réponse' : 'Raté'}</div>
    ${ok ? '' : `<div class="qw-r">${esc(q.c[q.a])}</div>`}
    <div>${esc(q.e)}</div>
    ${q.faux ? `<div class="qw-c"><div class="muted">Pourquoi les autres sont fausses</div>${q.order.map((ci, k) => [ci, k]).filter(([ci, k]) => k !== q.answer && q.faux[q.c[ci]]).sort((a, b) => (b[1] === s.picked) - (a[1] === s.picked)).map(([ci, k]) => `<div class="qw-f ${k === s.picked ? 'mine' : ''}"><div>${esc(q.c[ci])}${k === s.picked ? '<span class="muted"> (ta réponse)</span>' : ''}</div><div class="muted">${esc(q.faux[q.c[ci]])}</div></div>`).join('')}</div>` : ''}
    ${pts.length ? `<div class="qw-c"><div class="muted">Dans le cours : ${esc(x.titre)}${x.page ? `, page ${x.page} du PDF` : ''}</div>${pts.map((t) => `<p>${esc(t)}</p>`).join('')}</div>` : ''}
    ${siglesHtml([q.q, ...q.c, q.e, ...pts])}
    ${!ok ? '<div class="muted qw-n">Cette question reviendra à la fin de la série.</div>' : ''}
    ${linksHtml(q.chap, x && q.chap.fiche.findIndex((f) => f.titre === x.titre))}
    ${flouBtn(q.q)}
  </div></div>`;
}

VIEWS.qcm = () => {
  const s = session;
  if (s.i >= s.list.length) return qcmResult(s.results, 'QCM terminé');
  const q = s.list[s.i];
  const answered = s.picked !== null, left = s.list.length - s.total;
  return `<div class="page"><div class="session">
    <div class="sess-top">
      <button class="btn ghost sm" data-act="go" data-v="qcmSetup"><span class="ico" data-i="arrowL"></span>Quitter</button>
      <div class="bar"><i style="width:${((s.i + (answered ? 1 : 0)) / s.list.length) * 100}%"></i></div>
      <div class="sess-count">${q.again ? `Reprise ${s.i - s.total + 1} / ${left}` : `${s.i + 1} / ${s.total}`}</div>
    </div>
    <div class="panel q-card">
      <div class="q-meta"><span class="chip" style="color:${q.chap.color}">${esc(q.chap.titre)}</span>${q.hard ? '<span class="chip warn">Difficile</span>' : ''}${q.again ? '<span class="chip warn">Déjà ratée</span>' : ''}<span class="chip good">${plural(s.results.filter((r) => r.ok).length, 'juste')}</span><span class="chip bad">${plural(s.results.filter((r) => !r.ok).length, 'fausse')}</span></div>
      <div class="q-text">${esc(q.q)}</div>
      <div class="choices">${q.order.map((ci, k) => {
        let cls = '';
        if (answered) { if (k === q.answer) cls = 'ok'; else if (k === s.picked) cls = 'ko'; else cls = 'off'; }
        return `<button class="choice ${cls}" data-act="answer" data-k="${k}" ${answered ? 'disabled' : ''}><span class="key">${k + 1}</span>${esc(q.c[ci])}</button>`;
      }).join('')}</div>
      ${answered ? qcmExplain(s, q) : ''}
      <div class="q-foot ${answered ? 'stick' : ''}">${answered ? `<span></span><button class="btn primary lg" data-act="nextQ">${s.i + 1 < s.list.length ? 'Suivante' : 'Voir le résultat'}<span class="ico" data-i="arrowR"></span></button>` : '<span class="muted" style="font-size:0.75rem">Choisis une réponse</span><button class="btn ghost" data-act="answer" data-k="-1">Je ne sais pas</button>'}</div>
    </div>
  </div></div>`;
};

// k = -1 : « Je ne sais pas », compté comme faux
function answerQ(k) {
  const s = session;
  if (s.picked !== null) return;
  const q = s.list[s.i];
  s.picked = k;
  const ok = k === q.answer;
  // La note et les statistiques ne comptent que le premier essai
  if (!q.again) {
    s.results.push({ q, ok, picked: k < 0 ? null : q.order[k] });
    recordAnswer(q, ok);
    Store.save();
  }
  if (!ok) s.list.push({ ...qcmQ({ ...q, pieges: null }), again: true });
  const m = $('#main'), top = m ? m.scrollTop : 0;
  render();
  if (m) m.scrollTop = top;
  const w = document.querySelector('.q-why');
  if (!w || !m) return;
  // Montre l'explication sans faire sortir les réponses colorées de l'écran (le bouton Suivante reste collé en bas)
  const y = m.getBoundingClientRect().top, first = document.querySelector('.choice.ok, .choice.ko').getBoundingClientRect().top - y - 16;
  const need = w.getBoundingClientRect().bottom - y - m.clientHeight + 90;
  if (need > 0 && first > 0) m.scrollBy({ top: Math.min(need, first), behavior: 'smooth' });
}

function qcmResult(results, title, extra = '') {
  const ok = results.filter((r) => r.ok).length;
  const p = results.length ? pct(ok / results.length) : 0;
  const msg = p >= 90 ? 'Excellent, c’est maîtrisé.' : p >= 70 ? 'Solide, revois les erreurs ci-dessous.' : p >= 50 ? 'Correct, mais il reste des notions à consolider.' : 'À retravailler : relis les fiches des chapitres concernés.';
  const by = chapters.map((ch) => { const l = results.filter((r) => r.q.chap === ch); return { ch, n: l.length, ok: l.filter((r) => r.ok).length }; }).filter((x) => x.n).sort((a, b) => a.ok / a.n - b.ok / b.n);
  const item = (r) => `<div class="review-item ${r.ok ? 'good' : 'bad'}"><div class="rq">${esc(r.q.q)}</div>
      ${r.ok ? '' : `<div class="ra" style="color:var(--bad)">Ta réponse : ${r.picked === null ? 'aucune' : esc(r.q.c[r.picked])}</div>`}
      ${!r.ok && r.picked !== null && r.q.faux && r.q.faux[r.q.c[r.picked]] ? `<div class="ra muted">${esc(r.q.faux[r.q.c[r.picked]])}</div>` : ''}
      <div class="ra" style="color:var(--good)">Bonne réponse : ${esc(r.q.c[r.q.a])}</div>
      <div class="ra" style="margin-top:0.25rem">${esc(r.q.e)}</div></div>`;
  const bad = results.filter((r) => !r.ok), good = results.filter((r) => r.ok);
  return `<div class="page"><div class="session">
    <div class="panel result">
      <div class="h-eyebrow">${title}</div>
      <div class="score" style="color:${p >= 70 ? 'var(--good)' : p >= 50 ? 'var(--warn)' : 'var(--bad)'}">${p}%</div>
      <div class="sub">${ok} / ${results.length} bonnes réponses${session && session.type === 'qcm' ? ' au premier essai' : ''}${extra}. ${msg}</div>
      <div class="row" style="justify-content:center;margin-top:1.375rem">
        ${bad.length ? '<button class="btn primary" data-act="retryWrong"><span class="ico" data-i="rotate"></span>Refaire les erreurs</button>' : ''}
        <button class="btn" data-act="go" data-v="qcmSetup">Nouveau QCM</button>
        <button class="btn ghost" data-act="go" data-v="dashboard">Tableau de bord</button>
      </div>
    </div>
    ${by.length > 1 ? `<div class="panel q-by"><h3>Par chapitre</h3>${by.map((x) => `<div class="qb"><div class="qb-t">${esc(x.ch.titre)}</div><div class="bar"><i style="width:${pct(x.ok / x.n)}%;background:${x.ch.color}"></i></div><div class="qb-n">${x.ok} / ${x.n}</div></div>`).join('')}</div>` : ''}
    ${bad.length ? `<h3 class="q-h">À revoir (${bad.length})</h3><div class="review-list">${bad.map(item).join('')}</div>` : ''}
    ${good.length ? `<details class="q-good" ${bad.length ? '' : 'open'}><summary>Réussies (${good.length})</summary><div class="review-list">${good.map(item).join('')}</div></details>` : ''}
  </div></div>`;
}

/* ---------- Examen blanc ---------- */
VIEWS.examSetup = () => {
  const ex = myExams().slice(-6).reverse();
  return `<div class="page">
    <div class="head-row"><div><div class="h-eyebrow">Conditions réelles</div><h1>Examen blanc</h1><p class="sub">30 questions tirées dans tous les chapitres, 30 minutes. Pas de correction avant la fin : tu peux naviguer et changer tes réponses.</p></div></div>
    <div class="grid g2">
      <div class="panel picker">
        <h3>Règles</h3>
        <ul class="f-points" style="margin:0.875rem 0 1.375rem">
          <li>Questions réparties proportionnellement entre les ${chapters.length} chapitres.</li>
          <li>Chrono de 30 minutes, l’examen est rendu automatiquement à la fin.</li>
          <li>Une question sans réponse compte comme fausse.</li>
        </ul>
        <button class="btn primary lg" data-act="startExam"><span class="ico" data-i="play"></span>Lancer l’examen</button>
      </div>
      ${myTrainers().length ? `<div class="panel picker">
        <h3>Examen complet</h3>
        <p class="sub" style="margin:0.5rem 0 1rem">12 questions (6 points), 3 calculs (9 points) et un exercice de TD à rédiger (5 points), en 1 h 30. Tu notes ta rédaction avec la grille de correction.</p>
        <button class="btn primary lg" data-act="startMixte"><span class="ico" data-i="play"></span>Lancer l’examen complet</button>
      </div>` : ''}
      ${Annale.cards()}
      ${allQcm.some((q) => q.annale) ? `<div class="panel picker annale-card">
        <h3>Annale : examen Réseaux (CC)</h3>
        <p class="sub" style="margin:0.5rem 0 1rem">Les 30 questions de cours seules, dans l’ordre et avec les choix d’origine, en 30 minutes. Les exercices de l’annale (satellite, masque, plan d’adressage, CRC, code correcteur, RIP) sont corrigés dans les TD, thème « Annale CC ».</p>
        <div class="row"><button class="btn primary lg" data-act="startExam" data-annale="cc"><span class="ico" data-i="play"></span>Passer l’annale</button><button class="btn lg" data-act="go" data-v="td">Voir les exercices corrigés</button></div>
      </div>` : ''}
      <div class="panel picker">
        <h3>Derniers résultats</h3>
        ${ex.length ? `<div style="margin-top:0.75rem">${ex.map((e) => `<div class="list-row" style="padding:0.625rem 0"><div class="lt">${new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}<div class="a">${Math.round(e.duree / 60000)} min</div></div><span class="chip ${e.score / e.total >= 0.7 ? 'good' : e.score / e.total >= 0.5 ? 'warn' : 'bad'}">${e.score} / ${e.total}</span></div>`).join('')}</div>` : '<p class="sub" style="margin-top:0.75rem">Aucun examen passé pour le moment.</p>'}
      </div>
    </div>
  </div>`;
};

function startExam(annale) {
  let list = [];
  if (annale) {
    list = allQcm.filter((q) => q.annale === annale).sort((a, b) => a.num - b.num);
  } else {
    const pool = allQcm.filter((q) => !q.annale);
    const per = Math.max(2, Math.floor(30 / chapters.length));
    chapters.forEach((ch) => { list.push(...shuffle(pool.filter((q) => q.chap === ch)).slice(0, per)); });
    const rest = shuffle(pool.filter((q) => !list.includes(q)));
    list = shuffle([...list, ...rest.slice(0, Math.max(0, 30 - list.length))]).slice(0, 30);
  }
  session = { type: 'exam', annale, list: list.map(prepQ), i: 0, answers: {}, start: Date.now(), limit: 30 * 60000, done: false };
  session.timerId = setInterval(() => {
    const el = $('#examTimer');
    const left = session.limit - (Date.now() - session.start);
    if (left <= 0) { finishExam(); return; }
    if (el) el.textContent = fmtTime(left);
  }, 1000);
  view = { name: 'exam' };
  render();
}

const fmtTime = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

function finishExam() {
  const s = session;
  if (!s || s.done) return;
  clearInterval(s.timerId);
  s.done = true;
  s.results = s.list.map((q, i) => {
    const k = s.answers[i];
    const ok = k === q.answer;
    recordAnswer(q, ok, true);
    return { q, ok, picked: k === undefined ? null : q.order[k] };
  });
  s.duree = Date.now() - s.start;
  Store.data.exams.push({ course: course.id, annale: s.annale || null, date: Date.now(), score: s.results.filter((r) => r.ok).length, total: s.list.length, duree: s.duree });
  if (typeof Game !== 'undefined') Game.event('exam', s.results.filter((r) => r.ok).length, s.list.length);
  Store.save();
  render();
}

VIEWS.exam = () => {
  const s = session;
  if (s.done) {
    if (!s.annale) return qcmResult(s.results, 'Examen blanc', ` en ${Math.round(s.duree / 60000)} min`);
    const ok = s.results.filter((r) => r.ok).length;
    const ko = s.results.filter((r) => !r.ok && r.picked !== null).length;
    const note = Math.max(0, 0.3 * ok - 0.3 * Math.max(0, ko - 3));
    return qcmResult(s.results, 'Annale CC : questions de cours', ` en ${Math.round(s.duree / 60000)} min. Note estimée : ${note.toFixed(1).replace('.', ',')} / 9 (0,3 par bonne réponse, chaque erreur au-delà de la 3e retire 0,3, une question sans réponse ne retire rien ; hypothèse, le barème exact du CC n’est pas précisé)`);
  }
  const q = s.list[s.i];
  const left = s.limit - (Date.now() - s.start);
  const answeredN = Object.keys(s.answers).length;
  return `<div class="page"><div class="session">
    <div class="sess-top">
      <span class="chip timer-chip ${left < 300000 ? 'bad' : 'acc'}"><span class="ico" data-i="timer"></span><span id="examTimer">${fmtTime(left)}</span></span>
      <div class="bar"><i style="width:${(answeredN / s.list.length) * 100}%"></i></div>
      <div class="sess-count">${answeredN} / ${s.list.length}</div>
    </div>
    <div class="panel q-card">
      <div class="q-meta"><span class="chip">Question ${s.i + 1}</span>${s.annale ? '<span class="chip gold">Annale CC</span>' : `<span class="chip" style="color:${q.chap.color}">${esc(q.chap.titre)}</span>`}</div>
      <div class="q-text">${esc(q.q)}</div>
      <div class="choices">${q.order.map((ci, k) => `<button class="choice ${s.answers[s.i] === k ? 'sel' : ''}" data-act="examPick" data-k="${k}"><span class="key">${s.annale ? 'ABCD'[k] : k + 1}</span>${esc(q.c[ci])}</button>`).join('')}</div>
      <div class="q-foot">
        <button class="btn" data-act="examNav" data-d="-1" ${s.i === 0 ? 'disabled' : ''}><span class="ico" data-i="arrowL"></span>Précédente</button>
        ${s.i + 1 < s.list.length ? '<button class="btn primary" data-act="examNav" data-d="1">Suivante<span class="ico" data-i="arrowR"></span></button>' : '<button class="btn primary" data-act="examEnd">Rendre la copie</button>'}
      </div>
    </div>
    <div class="row" style="justify-content:center;gap:0.3125rem;margin-top:1rem">${s.list.map((_, i) => `<button class="chip ${i === s.i ? 'acc' : s.answers[i] !== undefined ? 'good' : ''}" style="width:1.875rem;justify-content:center;padding:0" data-act="examGo" data-i="${i}">${i + 1}</button>`).join('')}</div>
    <div class="row" style="justify-content:center;margin-top:1rem"><button class="btn ghost sm" data-act="examEnd">Rendre la copie maintenant</button></div>
  </div></div>`;
};

/* ---------- Entrainement ---------- */
VIEWS.train = () => {
  const all = myTrainers(), f = view.diff || 0, list = all.filter((t) => !f || diffOf(t.id) === f);
  return `<div class="page">
  <div class="head-row"><div><div class="h-eyebrow">Exercices générés à l’infini</div><h1>Entraînement calcul</h1><p class="sub">Cinq niveaux par méthode : regarder, compléter, trouver l’erreur, faire seul, puis type examen.</p></div></div>
  <div class="seg diff-f">${[0, 1, 2, 3].map((d) => `<button class="${f === d ? 'on' : ''}" data-act="trDiff" data-d="${d}">${d ? DIFF_T[d] : 'Tous'} (${d ? all.filter((t) => diffOf(t.id) === d).length : all.length})</button>`).join('')}</div>
  <div class="grid g3">${list.map((t) => { const l = Niv.get(t.id); return `
    <div class="panel tr-card"><button class="tr-go" data-act="trainer" data-id="${t.id}">
      <div class="row between"><div class="ti"><span class="ico" data-i="${t.icon}"></span></div><span class="chip ${l >= 4 ? 'good' : l ? 'warn' : ''}">${l ? `Niveau ${l} / 5` : 'Nouveau'}</span></div>
      <div><div style="font-weight:500">${esc(t.titre)}</div><div class="muted" style="font-size:0.75rem">${esc(t.theme)}</div></div>
      <div class="d">${esc(t.desc)}</div>
      ${diffHtml(t.id)}
      <div class="nv-dots">${NIV.map((_, i) => `<i class="${l > i ? 'on' : ''}"></i>`).join('')}</div>
    </button></div>`; }).join('')}</div>
</div>`;
};

// lv : niveau 4 (seul, avec indices) ou 5 (type examen, sans aide) ; sinon entraînement libre
function newProblem(id, lv) {
  const t = TRAINERS.find((x) => x.id === id), was = session && session.type === 'trainer' && session.t.id === id && session.lv === lv ? session : null;
  session = { type: 'trainer', t, lv, p: t.gen(lv === 5 && t.gen.length ? 2 : undefined), answers: {}, checked: null, streak: was ? was.streak : 0, method: !lv && !!(was && was.method) };
  session.steps = Niv.steps(id, session.p);
  view = { name: 'trainer' };
  render();
  const first = $('.field input');
  if (first && !('ontouchstart' in window)) first.focus();
}

VIEWS.trainer = () => {
  const { t, p, checked } = session;
  const allOk = checked && Object.values(checked).every(Boolean);
  return `<div class="page"><div class="session" style="max-width:53.75rem">
    <div class="sess-top"><button class="btn ghost sm" data-act="tuto" data-id="${t.id}"><span class="ico" data-i="arrowL"></span>Niveaux</button><div style="flex:1"></div>${session.lv ? `<span class="chip acc">${session.lv}. ${NIV[session.lv - 1][0]}</span>` : ''}${session.streak ? `<span class="chip good">${session.streak} d’affilée</span>` : ''}${session.lv ? '' : `<button class="btn sm ${session.method ? '' : 'ghost'}" data-act="trMethod">Méthode</button>`}</div>
    ${session.method ? `<div class="panel tdx-sub tdx" style="margin-bottom:0.875rem">${tutoMethod(TUTOS[t.id])}</div>` : ''}
    <div class="panel q-card">
      <div class="q-meta"><span class="chip acc">${esc(t.titre)}</span><span class="chip">${esc(t.theme)}</span>${diffHtml(t.id)}</div>
      <div class="tr-prompt">${p.prompt}</div>
      <div class="fields">${p.fields.map((f) => {
        const st = checked ? (checked[f.k] ? 'ok' : 'ko') : '';
        const val = session.answers[f.k] || '';
        const input = f.type === 'choice'
          ? `<div class="seg">${f.options.map((o) => `<button class="${val === o ? 'on' : ''}" data-act="trChoice" data-k="${f.k}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`
          : `<input data-k="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" spellcheck="false" ${checked ? 'readonly' : ''}>`;
        return `<div class="field ${st}"><label>${esc(f.label)}</label>${input}${checked && !checked[f.k] ? `<div class="exp">${esc(formatExpected(p, f.k))}</div>` : ''}</div>`;
      }).join('')}</div>
      ${!checked && session.hints ? `<div class="td-hint nv-hints"><span class="ico" data-i="bulb"></span><div>${session.steps.slice(0, session.hints).map((x) => `<p>${x.ask ? Td.txt(x.ask) + ' : ' : ''}${Td.txt(x.why)}</p>`).join('')}</div></div>` : ''}
      ${checked ? `<div class="tdx nv-sol"><div style="margin-bottom:0.625rem;color:${allOk ? 'var(--good)' : 'var(--bad)'}">${allOk ? 'Tout est juste.' : 'Il y a des erreurs, voici la résolution avec tes nombres :'}</div>
        ${allOk && !session.sol ? '<button class="btn sm ghost" data-act="trSol">Voir la résolution</button>' : `<ol class="steps">${session.steps.map((x) => `<li class="${x.k && !checked[x.k] ? 'ko' : ''}">${Niv.step(x)}</li>`).join('')}</ol>`}
        ${allOk ? '' : errPick('t:' + t.id)}</div>` : ''}
      <div class="q-foot"><span class="muted" style="font-size:0.75rem">Valide avec <kbd>Entrée</kbd></span>${!checked && session.lv !== 5 && (session.hints || 0) < session.steps.length ? '<button class="btn ghost" data-act="trHint">Indice</button>' : ''}
        ${checked ? '<button class="btn primary" data-act="trNext">Exercice suivant<span class="ico" data-i="arrowR"></span></button>' : '<button class="btn primary" data-act="trCheck"><span class="ico" data-i="check"></span>Vérifier</button>'}
      </div>
    </div>
    ${Ink.html('tr:' + t.id)}
    ${checked ? flouBtn(`Calcul « ${t.titre} »`) : ''}
  </div></div>`;
};

function checkCurrentTrainer() {
  const s = session;
  document.querySelectorAll('.field input').forEach((i) => { s.answers[i.dataset.k] = i.value; });
  s.checked = checkTrainer(s.p, s.answers);
  const ok = Object.values(s.checked).every(Boolean);
  const r = Store.data.train[s.t.id] || { ok: 0, total: 0 };
  r.total++; if (ok) r.ok++;
  Store.data.train[s.t.id] = r;
  s.streak = ok ? s.streak + 1 : 0;
  if (ok) Rev.ok('t:' + s.t.id); else Rev.fail('t:' + s.t.id);
  if (ok && s.lv === 4 && s.streak >= 2) Niv.pass(s.t.id, 4);
  if (ok && s.lv === 5) Niv.pass(s.t.id, 5);
  Store.bump('qcm');
  if (typeof Game !== 'undefined') Game.event('train', ok);
  render();
}

/* ---------- Points faibles ---------- */
VIEWS.weak = () => {
  const ids = Object.keys(Store.data.wrong).filter((k) => k.startsWith(course.id + ":"));
  const cards = allCards.filter((c) => ids.includes(c.id));
  const qs = anyQcm().filter((q) => ids.includes(q.id));
  const tdR = course.td.exercices.filter((e) => Store.data.td[tk(e.n)] === 'revoir');
  const byChap = chapters.map((ch) => ({ ch, n: cards.filter((c) => c.chap === ch).length + qs.filter((q) => q.chap === ch).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  const extra = weakExtra();
  if (!ids.length && !tdR.length && !extra) {
    return `<div class="page"><div class="head-row"><div><div class="h-eyebrow">Ciblage</div><h1>Points faibles</h1></div></div><div class="panel empty"><span class="ico" data-i="star"></span><div>Aucun point faible pour l’instant. Les cartes notées « À revoir » et les questions ratées apparaîtront ici.</div></div></div>`;
  }
  return `<div class="page">
    <div class="head-row"><div><div class="h-eyebrow">Ciblage</div><h1>Points faibles</h1><p class="sub">Ce que tu as raté récemment. Un élément disparaît dès que tu le réussis.</p></div>
      <div class="row">${cards.length ? `<button class="btn" data-act="weakFlash"><span class="ico" data-i="cards"></span>Réviser ${cards.length} cartes</button>` : ''}${qs.length ? `<button class="btn primary" data-act="weakQcm"><span class="ico" data-i="quiz"></span>Refaire ${qs.length} questions</button>` : ''}</div></div>
    ${extra}
    ${byChap.length ? `<div class="panel" style="padding:1rem 1.25rem;margin-bottom:0.875rem"><h3 style="margin-bottom:0.5rem">Par chapitre</h3>${byChap.map((x) => `<div class="chart-row"><span class="cl">${esc(x.ch.titre)}</span><div class="bar"><i style="width:${(x.n / byChap[0].n) * 100}%;background:${x.ch.color}"></i></div><span class="cv">${x.n}</span></div>`).join('')}</div>` : ''}
    <div class="grid g2">
      <div class="panel"><div class="list-row"><h3>Questions ratées (${qs.length})</h3></div>${qs.map((q) => `<div class="list-row"><div class="lt"><div>${esc(q.q)}</div><div class="a">${esc(q.c[q.a])}</div></div><span class="chip bad">${Store.data.wrong[q.id]}×</span></div>`).join('') || '<div class="list-row muted">Aucune</div>'}</div>
      <div class="panel"><div class="list-row"><h3>Cartes à revoir (${cards.length})</h3></div>${cards.map((c) => `<div class="list-row"><div class="lt"><div>${esc(c.q)}</div><div class="a">${esc(c.r)}</div></div></div>`).join('') || '<div class="list-row muted">Aucune</div>'}
      ${tdR.length ? `<div class="list-row"><h3>TD à revoir</h3></div>${tdR.map((e) => `<div class="list-row"><div class="lt">Exercice ${e.n} : ${esc(e.titre)}</div><button class="btn sm" data-act="tdOpen" data-n="${e.n}">Ouvrir</button></div>`).join('')}` : ''}</div>
    </div>
  </div>`;
};

/* ---------- Statistiques ---------- */
VIEWS.stats = () => {
  const g = globalStats();
  const act = Object.values(Store.data.activity);
  const totalCards = act.reduce((a, x) => a + (x.cards || 0), 0);
  const totalQ = act.reduce((a, x) => a + (x.qcm || 0), 0);
  const totalMin = Math.round(act.reduce((a, x) => a + (x.ms || 0), 0) / 60000);
  const days = []; const d = new Date();
  for (let i = 13; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); const k = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; const a = Store.data.activity[k] || {}; days.push({ x, n: (a.cards || 0) + (a.qcm || 0) }); }
  const maxD = Math.max(10, ...days.map((x) => x.n));
  // Prevision des cartes dues sur 7 jours
  const fc = [];
  for (let i = 0; i < 7; i++) { const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() + i); const start = new Date(end); start.setHours(0, 0, 0, 0); fc.push({ d: end, n: Object.keys(Store.data.srs).filter((k) => k.startsWith(course.id + ":")).map((k) => Store.data.srs[k]).filter((s) => (i === 0 ? s.due <= end.getTime() : s.due >= start.getTime() && s.due <= end.getTime())).length }); }
  const maxF = Math.max(5, ...fc.map((x) => x.n));
  return `<div class="page">
    <div class="head-row"><div><div class="h-eyebrow">Progression</div><h1>Statistiques</h1></div></div>
    <div class="grid g4">
      <div class="panel stat"><div class="k">Temps de révision</div><div class="v">${totalMin >= 60 ? `${Math.floor(totalMin / 60)} h ${totalMin % 60}` : `${totalMin} min`}</div><div class="s">temps actif dans le logiciel</div></div>
      <div class="panel stat"><div class="k">Cartes révisées</div><div class="v">${totalCards}</div><div class="s">${g.seen} cartes différentes</div></div>
      <div class="panel stat"><div class="k">Réponses QCM et calculs</div><div class="v">${totalQ}</div><div class="s">${g.answered ? pct(g.okRate) + ' % de réussite au dernier essai' : 'aucune'}</div></div>
      <div class="panel stat"><div class="k">Examens blancs</div><div class="v">${myExams().length}</div><div class="s">${myExams().length ? `meilleur : ${Math.max(...myExams().map((e) => pct(e.score / e.total)))} %` : 'aucun'}</div></div>
    </div>
    <div style="margin-top:0.875rem">${readyHtml()}</div>
    <div class="grid g2" style="margin-top:0.875rem">
      <div class="panel" style="padding:1.125rem 1.25rem"><h3 style="margin-bottom:1rem">Activité des 14 derniers jours</h3>
        <div style="display:flex;align-items:flex-end;gap:0.375rem;height:8.75rem">${days.map((x) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.375rem;height:100%;justify-content:flex-end"><div title="${x.n}" style="width:100%;border-radius:0.3125rem 0.3125rem 0.125rem 0.125rem;background:${x.n ? '#ffc44d' : 'var(--surface-3)'};height:${Math.max(3, (x.n / maxD) * 110)}px"></div><span class="muted" style="font-size:0.6563rem">${x.x.toLocaleDateString('fr-FR', { weekday: 'narrow' })}</span></div>`).join('')}</div></div>
      <div class="panel" style="padding:1.125rem 1.25rem"><h3 style="margin-bottom:1rem">Cartes à revoir dans les 7 prochains jours</h3>
        <div style="display:flex;align-items:flex-end;gap:0.625rem;height:8.75rem">${fc.map((x, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.375rem;height:100%;justify-content:flex-end"><span class="muted" style="font-size:0.6875rem">${x.n}</span><div style="width:100%;border-radius:0.3125rem 0.3125rem 0.125rem 0.125rem;background:${i === 0 ? '#ffb547' : '#5cc8ff'};height:${Math.max(3, (x.n / maxF) * 100)}px"></div><span class="muted" style="font-size:0.6563rem">${i === 0 ? 'Auj.' : x.d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span></div>`).join('')}</div></div>
    </div>
    <div class="panel" style="padding:1.125rem 1.375rem;margin-top:0.875rem">
      <div class="row between" style="margin-bottom:0.5rem"><h3>Maîtrise par chapitre</h3><span class="legend"><span><i style="background:#5cc8ff"></i>Apprentissage</span><span><i style="background:#b3a8ff"></i>En cours</span><span><i style="background:#45e3a5"></i>Maîtrisé</span></span></div>
      ${chapters.map((ch, i) => { const s = g.per[i]; return `<div class="chart-row"><span class="cl">${esc(ch.titre)}</span><div>${levelBar(s.lv, s.cards)}<div class="bar" style="margin-top:0.25rem;height:0.25rem"><i style="width:${s.qScore * 100}%;background:${ch.color};opacity:.7"></i></div></div><span class="cv">${s.mastery}%</span></div>`; }).join('')}
      <p class="muted" style="font-size:0.75rem;margin-top:0.5rem">Barre du haut : état des flashcards. Barre du bas : questions de QCM réussies au dernier essai.</p>
    </div>
    <div class="panel" style="padding:1.125rem 1.375rem;margin-top:0.875rem">
      <div class="row between"><div><h3>Réglages</h3><div class="muted" style="font-size:0.7813rem;margin-top:0.125rem">Nouvelles cartes introduites par jour dans la révision du jour</div></div>
        <div class="seg">${[10, 20, 30, 50].map((n) => `<button class="${Store.data.settings.newPerDay === n ? 'on' : ''}" data-act="setNew" data-n="${n}">${n}</button>`).join('')}</div></div>
      <div style="margin-top:1.125rem"><div>Thème de couleur</div><div class="muted" style="font-size:0.7813rem;margin-bottom:0.625rem">Aussi accessible avec l’icône de palette en haut à droite.</div>${Theme.picker()}</div>
      <div id="syncPanel" style="margin-top:1.375rem">${Account.panel()}</div>
      <div class="row between" style="margin-top:1.375rem"><div><div>Réinitialiser la progression</div><div class="muted" style="font-size:0.7813rem">Efface cartes, QCM, fiches lues, TD et examens de ce cours.</div></div><button class="btn sm" data-act="reset">${view.confirmReset ? 'Confirmer la réinitialisation' : 'Réinitialiser'}</button></div>
    </div>
  </div>`;
};

/* ---------- Recherche ---------- */
let searchIndex = [], palSel = 0, palRes = [];
function buildSearch() {
  searchIndex = [];
  chapters.forEach((ch) => {
    ch.fiche.forEach((f, i) => {
      searchIndex.push({ t: f.titre, d: `Fiche · ${ch.titre}`, txt: f.titre + ' ' + (f.formule || '') + ' ' + f.points.join(' '), go: () => go('chapter', { id: ch.id, tab: 'fiche', scrollTo: i }) });
      f.points.forEach((p) => searchIndex.push({ t: p, d: `${ch.titre} · ${f.titre}`, txt: p, go: () => go('chapter', { id: ch.id, tab: 'fiche', scrollTo: i }) }));
    });
    ch.cartes.forEach((c) => searchIndex.push({ t: c.q, d: `Flashcard · ${ch.titre} · ${c.r}`, txt: c.q + ' ' + c.r, go: () => go('chapter', { id: ch.id, tab: 'cartes' }) }));
  });
  course.td.exercices.forEach((e) => searchIndex.push({ t: `Exercice ${e.n} : ${e.titre}`, d: `TD · ${e.theme}`, txt: e.titre + ' ' + e.enonce, go: () => go('tdEx', { n: e.n }) }));
  searchIndex.forEach((x) => { x.f = fold(x.txt); });
}

function runSearch(q) {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) { palRes = []; }
  else {
    palRes = searchIndex.filter((x) => words.every((w) => x.f.includes(w)))
      .map((x) => ({ ...x, score: (fold(x.t).includes(words[0]) ? 2 : 0) + (x.d.startsWith('Fiche') ? 1 : 0) - x.t.length / 400 }))
      .sort((a, b) => b.score - a.score).slice(0, 40);
  }
  palSel = 0;
  drawPalette(words);
}

function highlight(text, words) {
  let out = esc(text.length > 160 ? text.slice(0, 160) + '…' : text);
  words.forEach((w) => {
    if (w.length < 3) return;
    const f = fold(out);
    const idx = f.indexOf(w);
    if (idx >= 0) out = out.slice(0, idx) + '<mark>' + out.slice(idx, idx + w.length) + '</mark>' + out.slice(idx + w.length);
  });
  return out;
}

function drawPalette(words = []) {
  const box = $('#paletteResults');
  if (!palRes.length) { box.innerHTML = `<div class="p-empty">${$('#paletteInput').value ? 'Aucun résultat.' : 'Tape un mot-clé : la recherche couvre fiches, flashcards et TD.'}</div>`; return; }
  box.innerHTML = palRes.map((r, i) => `<button class="p-res ${i === palSel ? 'on' : ''}" data-pi="${i}"><span class="pt">${highlight(r.t, words)}</span><span class="pd">${esc(r.d.length > 110 ? r.d.slice(0, 110) + '…' : r.d)}</span></button>`).join('');
  const on = box.querySelector('.p-res.on');
  if (on) on.scrollIntoView({ block: 'nearest' });
}

function openPalette() {
  $('#paletteBack').hidden = false;
  const i = $('#paletteInput');
  i.value = ''; runSearch(''); i.focus();
}
function closePalette() { $('#paletteBack').hidden = true; }

/* ---------- Actions ---------- */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = icon('check') + esc(msg);
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

const ACTIONS = {
  go: (el) => go(el.dataset.v),
  courseMenu: () => { courseMenu = !courseMenu; renderSidebar(); },
  switchCourse: (el) => {
    courseMenu = false;
    Store.data.course = el.dataset.id; Store.data.last = null; Store.save();
    buildIndex(); buildSearch();
    go('path');
    toast(`Cours : ${course.titre}`);
  },
  chap: (el) => go('chapter', { id: el.dataset.id, tab: 'fiche' }),
  tab: (el) => { view.tab = el.dataset.tab; render(); },
  toc: (el) => { const s = $(`#sec-${el.dataset.i}`); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  read: (el) => {
    const k = rk(chapters.find((c) => c.id === view.id), el.dataset.i);
    if (Store.data.read[k]) delete Store.data.read[k]; else { Store.data.read[k] = true; if (typeof Game !== 'undefined') Game.event('read'); }
    Store.save();
    const y = $('#main').scrollTop; render(); $('#main').scrollTop = y;
  },
  pdfAt: (el) => { view.tab = 'pdf'; view.page = Number(el.dataset.page); render(); },
  pdfExt: async (el) => { if (await Account.pdfUrl(course.id, el.dataset.file)) window.api.pdfExternal(course.id, el.dataset.file); else toast('PDF indisponible sans connexion'); },
  startDaily: () => { const q = buildFlashQueue(chapters.map((c) => c.id), 'jour'); if (q.length) startFlash(q, 'Révision du jour'); },
  quickQcm: () => startQcm(pickQuestions(qcmPool(), 10), 'QCM rapide'),
  chapFlash: (el) => {
    const q = buildFlashQueue([el.dataset.id], 'jour');
    if (q.length) startFlash(q); else { toast('Rien de dû ici, passage en mode libre'); startFlash(buildFlashQueue([el.dataset.id], 'tout')); }
  },
  chapFlashAll: (el) => startFlash(buildFlashQueue([el.dataset.id], 'tout')),
  chapQcm: (el) => startQcm(allQcm.filter((q) => q.chap.id === el.dataset.id)),
  mode: (el) => { view.mode = el.dataset.mode; render(); },
  qn: (el) => { view.n = Number(el.dataset.n); render(); },
  pick: (el) => { const s = selectedChaps(); const i = s.indexOf(el.dataset.id); i >= 0 ? s.splice(i, 1) : s.push(el.dataset.id); render(); },
  pickAll: () => { view.sel = chapters.map((c) => c.id); render(); },
  pickNone: () => { view.sel = []; render(); },
  startFlash: () => startFlash(buildFlashQueue(selectedChaps(), view.mode || 'jour')),
  flip: () => { if (session && session.type === 'flash' && session.queue.length) { session.flipped = !session.flipped; render(); } },
  grade: (el, e) => { e.stopPropagation(); gradeCard(Number(el.dataset.g)); },
  qLevel: (el) => { Store.data.settings.qcmLevel = el.dataset.v; Store.data.settings.qcmHard = el.dataset.v === 'hard'; Store.save(); keepScroll(); },
  qOnly: (el) => { view.only = el.dataset.v; keepScroll(); },
  startQcm: () => startQcm(pickQuestions(qcmFilter(qcmPool().filter((q) => selectedChaps().includes(q.chap.id)), view.only), view.n || 10)),
  answer: (el) => answerQ(Number(el.dataset.k)),
  nextQ: () => { session.i++; session.picked = null; render(); const m = $('#main'); if (m) m.scrollTop = 0; },
  retryWrong: () => { const w = session.results.filter((r) => !r.ok).map((r) => anyQcm().find((q) => q.id === r.q.id)); startQcm(w, 'Erreurs'); },
  startExam: (el) => startExam(el.dataset.annale),
  examPick: (el) => { session.answers[session.i] = Number(el.dataset.k); render(); },
  examNav: (el) => { session.i = Math.max(0, Math.min(session.list.length - 1, session.i + Number(el.dataset.d))); render(); },
  examGo: (el) => { session.i = Number(el.dataset.i); render(); },
  examEnd: () => finishExam(),
  trChoice: (el) => { if (session.checked) return; document.querySelectorAll('.field input').forEach((i) => { session.answers[i.dataset.k] = i.value; }); session.answers[el.dataset.k] = el.dataset.o; render(); },
  trCheck: () => checkCurrentTrainer(),
  trDiff: (el) => { view.diff = Number(el.dataset.d); keepScroll(); },
  trNext: () => { newProblem(session.t.id, session.lv); $('#main').scrollTop = 0; },
  weakFlash: () => startFlash(shuffle(allCards.filter((c) => Store.data.wrong[c.id])), 'Points faibles'),
  weakQcm: () => startQcm(anyQcm().filter((q) => Store.data.wrong[q.id]), 'Points faibles'),
  setNew: (el) => { Store.data.settings.newPerDay = Number(el.dataset.n); Store.save(); keepScroll(); },
  reset: () => {
    if (!view.confirmReset) { view.confirmReset = true; keepScroll(); return; }
    const pre = course.id + ':', d = Store.data;
    ['srs', 'wrong', 'read', 'td'].forEach((f) => Object.keys(d[f]).forEach((k) => { if (k.startsWith(pre)) delete d[f][k]; }));
    Object.keys(qstat()).forEach((k) => { if (k.startsWith(pre)) delete d.qstat[k]; });
    (course.trainers || []).forEach((t) => delete d.train[t]);
    d.exams = d.exams.filter((e) => (e.course || 'reseaux') !== course.id);
    view.confirmReset = false; Store.save();
    toast('Progression réinitialisée'); go('dashboard');
  }
};

function keepScroll() { const y = $('#main').scrollTop; render(); $('#main').scrollTop = y; }

document.addEventListener('click', (e) => {
  lastInput = Date.now();
  const pr = e.target.closest('.p-res');
  if (pr) { const r = palRes[Number(pr.dataset.pi)]; closePalette(); r.go(); return; }
  if (e.target === $('#paletteBack')) { closePalette(); return; }
  const el = e.target.closest('[data-act]');
  if (el && ACTIONS[el.dataset.act]) ACTIONS[el.dataset.act](el, e);
});

document.addEventListener('keydown', (e) => {
  lastInput = Date.now();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
  if (!$('#paletteBack').hidden) {
    if (e.key === 'Escape') closePalette();
    else if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palRes.length - 1, palSel + 1); drawPalette(fold($('#paletteInput').value).split(/\s+/)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); drawPalette(fold($('#paletteInput').value).split(/\s+/)); }
    else if (e.key === 'Enter' && palRes[palSel]) { const r = palRes[palSel]; closePalette(); r.go(); }
    return;
  }
  const inInput = e.target.tagName === 'INPUT';
  if (view.name === 'flash' && session && session.queue.length) {
    if (e.code === 'Space') { e.preventDefault(); session.flipped = !session.flipped; render(); }
    else if (session.flipped && ['1', '2', '3', '4'].includes(e.key)) gradeCard(Number(e.key));
    else if (e.key === 'Escape') go('flashSetup');
  } else if (view.name === 'qcm' && session && session.i < session.list.length) {
    const n = Number(e.key);
    if (n >= 1 && n <= session.list[session.i].c.length && session.picked === null) answerQ(n - 1);
    else if (e.key === '0' && !e.ctrlKey && !e.metaKey && session.picked === null) answerQ(-1);
    else if (e.key === 'Enter' && session.picked !== null) { e.preventDefault(); ACTIONS.nextQ(); }
    else if (e.key === 'Escape') go('qcmSetup');
  } else if (view.name === 'exam' && session && !session.done) {
    const n = Number(e.key);
    if (n >= 1 && n <= session.list[session.i].c.length) { session.answers[session.i] = n - 1; render(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') ACTIONS.examNav({ dataset: { d: '1' } });
    else if (e.key === 'ArrowLeft') ACTIONS.examNav({ dataset: { d: '-1' } });
  } else if (view.name === 'trainer' && session && e.key === 'Enter') {
    e.preventDefault();
    session.checked ? newProblem(session.t.id, session.lv) : checkCurrentTrainer();
  } else if (!inInput && e.key === 'Escape' && view.name !== 'today') {
    go('today');
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'paletteInput') runSearch(e.target.value);
  else if (e.target.dataset && e.target.dataset.k && session) session.answers[e.target.dataset.k] = e.target.value;
});

// Temps actif : compte 30 s si la fenetre a le focus et qu'il y a eu une interaction recente
setInterval(() => {
  if (document.hasFocus() && Date.now() - lastInput < 120000) Store.bump('ms', 30000);
}, 30000);

/* ---------- Demarrage ---------- */
window.addEventListener("DOMContentLoaded", async function boot() {
  hydrateIcons();
  if (window.api.platform === 'darwin') {
    document.body.classList.add('mac');
    document.querySelectorAll('kbd').forEach((k) => { k.textContent = k.textContent.replace('Ctrl ', '⌘ '); });
  }
  $('#wcMin').onclick = () => window.api.minimize();
  $('#wcMax').onclick = () => window.api.maximize();
  $('#wcClose').onclick = () => { window.api.save(Store.data).then(() => Account.flush()).finally(() => window.api.close()); };
  $('#openSearch').onclick = openPalette;
  await Store.init();
  if (!(await Account.loadContent())) { Account.gate(); return; }
  buildIndex();
  buildSearch();
  render();
  Account.start();
});
