// Compléments : erreurs espacées, types d'erreur, « pas compris », liens, notes, stylet, séance, plan d'examen, formules, examen complet

/* ---------- Erreurs revues à 1, 3 puis 7 jours ---------- */
const Rev = {
  d() { return (Store.data.rev = Store.data.rev || {}); },
  at(days) { const x = new Date(); x.setHours(4, 0, 0, 0); return x.getTime() + days * DAY; },
  fail(id) { this.d()[id] = { d: this.at(1), n: 0 }; Store.save(); },
  ok(id) {
    const x = this.d()[id];
    if (!x || x.d > Date.now()) return;
    x.n++;
    if (x.n >= 3) delete this.d()[id]; else x.d = this.at(x.n === 1 ? 3 : 7);
    Store.save();
  },
  due() {
    const ids = Object.keys(this.d()).filter((k) => this.d()[k].d <= Date.now());
    return {
      qs: anyQcm().filter((q) => ids.includes(q.id)),
      tr: myTrainers().filter((t) => ids.includes('t:' + t.id)),
      td: course.td.exercices.filter((e) => ids.includes('td:' + tk(e.n)))
    };
  }
};

/* ---------- Pourquoi l'erreur, et « je n'ai pas compris » ---------- */
const ERR = [['calcul', 'Calcul'], ['methode', 'Méthode'], ['cours', 'Cours oublié'], ['inattention', 'Inattention']];
const errSeen = new Set();
const errPick = (key) => (errSeen.has(key) ? '<div class="muted err-row">Noté, tu le retrouves dans Points faibles.</div>'
  : `<div class="err-row"><span class="muted">Pourquoi cette erreur ?</span>${ERR.map(([k, l]) => `<button class="chip" data-act="errSet" data-key="${esc(key)}" data-e="${k}">${l}</button>`).join('')}</div>`);
const flou = () => (Store.data.flou = Store.data.flou || {});
const flouBtn = (label) => {
  const k = `${course.id}|${label}`, on = !!flou()[k];
  return `<button class="btn sm ghost flou ${on ? 'on' : ''}" data-act="flou" data-l="${esc(label)}"><span class="ico" data-i="flag"></span>${on ? 'Signalé' : 'Je n’ai pas compris'}</button>`;
};

/* ---------- Liens entre les notions, sans perdre le QCM en cours ---------- */
let stash = null;
const linksHtml = (ch, sec) => {
  const t = TRAINERS.filter((x) => (course.trainers || []).includes(x.id) && TR_CH[x.id] === ch.id)[0], td = t && Niv.tds(t.id)[0];
  return `<div class="row q-links"><button class="btn sm ghost" data-act="linkGo" data-v="chapter" data-id="${ch.id}" data-sec="${sec === undefined || sec === null || sec === false ? '' : sec}"><span class="ico" data-i="book"></span>La fiche</button>
    ${t ? `<button class="btn sm ghost" data-act="linkGo" data-v="tuto" data-id="${t.id}"><span class="ico" data-i="calc"></span>S’exercer</button>` : ''}
    ${td ? `<button class="btn sm ghost" data-act="linkGo" data-v="tdEx" data-id="${td.n}"><span class="ico" data-i="pencil"></span>En TD</button>` : ''}</div>`;
};

/* ---------- Notes personnelles sur les fiches ---------- */
const notes = () => (Store.data.notes = Store.data.notes || {});
const noteHtml = (key) => `<details class="note" ${notes()[key] ? 'open' : ''}><summary>Mes notes</summary><textarea data-note="${esc(key)}" rows="2" placeholder="Écris ici, c’est gardé sur ton compte" spellcheck="false">${esc(notes()[key] || '')}</textarea></details>`;
document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.note;
  if (!k) return;
  if (e.target.value.trim()) notes()[k] = e.target.value.slice(0, 3000); else delete notes()[k];
  Store.save();
});

/* ---------- Grille de relecture d'un TD ---------- */
const gridHtml = (key, steps) => {
  const n = steps.filter((x) => typeof x === 'string').length;
  if (!n) return '';
  const g = ((Store.data.grid = Store.data.grid || {})[key] || '').padEnd(n, '0'), ok = [...g].filter((c) => c === '1').length;
  return `<div class="grid-row"><span class="muted">Dans ta copie, quelles étapes avais-tu ?</span><div class="row">${Array.from({ length: n }, (_, i) => `<button class="chip ${g[i] === '1' ? 'good' : ''}" data-act="gridSet" data-key="${esc(key)}" data-n="${n}" data-i="${i}">${i + 1}</button>`).join('')}<span class="${ok === n ? 'grid-ok' : 'muted'}">${ok} / ${n}</span></div></div>`;
};

/* ---------- Brouillon au stylet ou à la souris ---------- */
const Ink = {
  open: new Set(), tmp: new WeakMap(), pen: false, W: 1000, H: 520,
  list(key) {
    if (key.startsWith('tr:')) { if (!this.tmp.has(session.p)) this.tmp.set(session.p, []); return this.tmp.get(session.p); }
    return ((Store.data.ink = Store.data.ink || {})[key] = Store.data.ink[key] || []);
  },
  has(key) { return !key.startsWith('tr:') && !!(Store.data.ink && Store.data.ink[key] && Store.data.ink[key].length); },
  btn(key) { return this.open.has(key) ? '' : `<button class="btn sm ghost" data-act="inkOpen" data-key="${esc(key)}"><span class="ico" data-i="pencil"></span>${this.has(key) ? 'Mon dessin' : 'Écrire à la main'}</button>`; },
  pad(key) {
    return this.open.has(key) ? `<div class="ink"><canvas class="ink-c" data-key="${esc(key)}" width="${this.W * 2}" height="${this.H * 2}"></canvas><div class="row">
      <button class="btn sm ghost" data-act="inkUndo" data-key="${esc(key)}">Annuler le trait</button><button class="btn sm ghost" data-act="inkClear" data-key="${esc(key)}">Effacer</button><button class="btn sm ghost" data-act="inkClose" data-key="${esc(key)}">Fermer</button></div></div>` : '';
  },
  html(key) { return `<div class="ink-wrap">${this.btn(key)}${this.pad(key)}</div>`; },
  draw(c, extra) {
    const g = c.getContext('2d'), k = c.width / this.W;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, 0, 0);
    g.lineWidth = 2.6; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text') || '#fff';
    [...this.list(c.dataset.key), ...(extra ? [extra] : [])].forEach((s) => { g.beginPath(); for (let i = 0; i < s.length; i += 2) g[i ? 'lineTo' : 'moveTo'](s[i], s[i + 1]); if (s.length === 2) g.lineTo(s[0] + 0.1, s[1]); g.stroke(); });
  },
  bind(c) {
    c.dataset.on = '1';
    let cur = null;
    const pt = (e) => { const r = c.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * this.W), Math.round(((e.clientY - r.top) / r.height) * this.H)]; };
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen') this.pen = true;
      if (this.pen && e.pointerType === 'touch') return; // paume posée pendant l'écriture au stylet
      e.preventDefault(); c.setPointerCapture(e.pointerId); cur = pt(e); this.draw(c, cur);
    });
    c.addEventListener('pointermove', (e) => {
      if (!cur) return;
      const [x, y] = pt(e), n = cur.length;
      if (Math.hypot(x - cur[n - 2], y - cur[n - 1]) < 3) return;
      cur.push(x, y); this.draw(c, cur);
    });
    const end = () => {
      if (!cur) return;
      const s = cur; cur = null;
      if (JSON.stringify(Store.data.ink || {}).length > 250000) { toast('Trop de dessins enregistrés : efface-en quelques-uns'); this.draw(c); return; }
      this.list(c.dataset.key).push(s); this.draw(c); Store.save();
    };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    this.draw(c);
  }
};

/* ---------- Exercices d'un chapitre (parcours) et étape de calcul dans une leçon ---------- */
const atlDone = (id) => !!((Store.data.atl = Store.data.atl || {})[`${course.id}:${id}`]);
function chapWork(ch) {
  const tr = myTrainers().filter((t) => TR_CH[t.id] === ch.id).map((t) => ({ t: t.titre, id: t.id, act: 'trainer', s: () => `${DIFF_T[diffOf(t.id)]}, ${Niv.get(t.id)} / 5`, done: () => Niv.get(t.id) >= 4 }));
  const at = [['m', course.modeles], ['d', course.preuves]].flatMap(([k, l]) => (l || []).map((x, i) => ({ x, id: `${k}:${i}` })).filter(({ x }) => x.ch === ch.id).map(({ x, id }) => ({ t: x.titre, id, act: 'atlGo', s: () => (atlDone(id) ? 'fait' : course.id === 'reseaux' ? 'code' : k === 'm' ? 'modèle' : 'preuve'), done: () => atlDone(id) })));
  return [...tr, ...at];
}
function calcEx(ch) {
  const l = myTrainers().filter((t) => !ch || TR_CH[t.id] === ch.id);
  if (!l.length) return null;
  const t = pick(l), p = t.gen(t.gen.length ? 1 : undefined), x = pick(Niv.steps(t.id, p).filter((s) => s.v !== undefined && s.bad.length).slice(0, 4));
  if (!x) return null;
  const o = shuffle([x.v, ...shuffle(x.bad).slice(0, 3)]);
  return { type: 'calc', t, p, x, opts: o, answer: o.indexOf(x.v) };
}

/* ---------- Séance de 10 minutes ---------- */
function startSeance() {
  const due = Rev.due(), wrong = (id) => (Store.data.wrong[id] ? 0 : 1);
  const qs = [...new Set([...shuffle(due.qs), ...shuffle(anyQcm()).sort((a, b) => wrong(a.id) - wrong(b.id))])].slice(0, 5);
  const cs = shuffle(allCards).sort((a, b) => (SRS.isDue(b.id) ? 2 : Store.data.srs[b.id] ? 0 : 1) - (SRS.isDue(a.id) ? 2 : Store.data.srs[a.id] ? 0 : 1)).slice(0, 5);
  const ex = [...qs.map((q) => { const z = prepQ(q); return { type: 'qcm', q: z, answer: z.answer }; }), ...cs.map((c) => { const o = shuffle([c.r, ...distractors(c, allCards, 3)]); return { type: 'def', card: c, opts: o, answer: o.indexOf(c.r) }; }), ...[calcEx(), calcEx()].filter(Boolean)];
  const a = Store.data.activity[Store.today()];
  session = { type: 'lesson', mode: 'mix', node: { key: 'mix', ch: null, kind: 'mix', cards: [], qcm: [] }, list: shuffle(ex), i: 0, total: 0, hearts: 10, pick: null, checked: false, ok: null, mistakes: 0, answered: 0, t0: Date.now(), wasActive: !!(a && a.cards + a.qcm + (a.lessons || 0) > 0), streak0: Store.streak(), end: null };
  session.total = session.list.length;
  Game.combo = 0;
  view = { name: 'lesson' };
  render();
}

/* ---------- Points faibles : compléments ---------- */
function weakExtra() {
  const due = Rev.due(), n = due.qs.length + due.tr.length + due.td.length, wait = Object.keys(Rev.d()).length;
  const er = ERR.map(([k, l]) => [k, l, ((Store.data.err || {})[`${course.id}:${k}`]) || 0]).filter((x) => x[2]).sort((a, b) => b[2] - a[2]);
  const tips = { calcul: 'Refais les calculs au niveau 2 (Compléter) et vérifie chaque étape.', methode: 'Reprends le niveau 1 (Regarder), puis l’atelier « Quelle méthode ».', cours: 'Relis la fiche du chapitre et refais ses flashcards.', inattention: 'Ralentis : relis l’énoncé et le résultat avant de valider.' };
  const fl = Object.keys(flou()).filter((k) => k.startsWith(course.id + '|'));
  return `${n ? `<div class="panel wk"><div><h3>À revoir aujourd’hui</h3><div class="muted">Les erreurs reviennent après 1, 3 puis 7 jours.</div></div><div class="row">
      ${due.qs.length ? `<button class="btn primary" data-act="revQcm">${plural(due.qs.length, 'question')}</button>` : ''}${due.tr.map((t) => `<button class="btn" data-act="trainerGo" data-id="${t.id}">${esc(t.titre)}</button>`).join('')}${due.td.map((e) => `<button class="btn" data-act="tdOpen" data-n="${e.n}">TD ${e.n}</button>`).join('')}</div></div>` : wait ? `<div class="panel wk"><div class="muted">Aucune erreur à revoir aujourd’hui : ${plural(wait, 'élément')} en attente.</div></div>` : ''}
    ${er.length ? `<div class="panel wk2"><h3>Tes types d’erreur</h3>${er.map(([, l, v]) => `<div class="chart-row"><span class="cl">${l}</span><div class="bar"><i style="width:${(v / er[0][2]) * 100}%;background:var(--warn)"></i></div><span class="cv">${v}</span></div>`).join('')}<p class="muted">${tips[er[0][0]]}</p></div>` : ''}
    ${fl.length ? `<div class="panel wk2"><div class="row between"><h3>Pas compris (${fl.length})</h3><button class="btn sm ghost" data-act="flouCopy">Copier la liste</button></div>${fl.map((k) => `<div class="list-row"><div class="lt">${esc(k.slice(course.id.length + 1))}</div><button class="btn sm ghost" data-act="flouDel" data-key="${esc(k)}">Compris</button></div>`).join('')}</div>` : ''}`;
}

/* ---------- Préparer l'examen ---------- */
const ready = (ch) => {
  const s = chapStats(ch), nodes = Path.units().find((u) => u.ch === ch).nodes.filter((n) => n.kind === 'lesson'), w = chapWork(ch);
  const parts = [['Leçons', nodes.filter((n) => Path.done(n.key)).length / nodes.length], ['Cartes', s.cardScore], ['QCM', s.qScore]];
  if (w.length) parts.push(['Exercices', w.filter((x) => x.done()).length / w.length]);
  return { parts, p: pct(parts.reduce((a, x) => a + x[1], 0) / parts.length) };
};
const readyHtml = (R = chapters.map((ch) => ({ ch, ...ready(ch) }))) => `<div class="panel wk2"><h3>Où tu en es, chapitre par chapitre</h3>${R.sort((a, z) => a.p - z.p).map((x) => `<button class="pl-ch" data-act="chap" data-id="${x.ch.id}"><span class="cl">${esc(x.ch.titre)}</span><span class="pl-parts">${x.parts.map(([n, v]) => `<span class="muted">${n} ${pct(v)} %</span>`).join('')}</span><span class="bar"><i style="width:${x.p}%;background:${x.ch.color}"></i></span><span class="cv">${x.p} %</span></button>`).join('')}</div>`;
VIEWS.plan = () => {
  const date = ((Store.data.settings.exams || {})[course.id]) || '', today = new Date(); today.setHours(0, 0, 0, 0);
  const days = date ? Math.round((new Date(date + 'T00:00') - today) / DAY) : null;
  const R = chapters.map((ch) => ({ ch, ...ready(ch) })), glob = Math.round(R.reduce((a, x) => a + x.p, 0) / R.length);
  const les = Path.flat().filter((n) => n.kind !== 'exo' && !Path.done(n.key)), cards = allCards.filter((c) => !Store.data.srs[c.id]), tr = myTrainers().filter((t) => Niv.get(t.id) < 4), td = Td.order().filter((e) => Td.st(e) !== 'ok');
  // Garde les deux derniers jours pour un examen complet et les points faibles
  const D = days === null ? 0 : Math.max(1, days - 2), q = (n) => Math.ceil(n / D);
  const row = (t, n, btn) => (n ? `<div class="list-row"><div class="lt">${t}<div class="a">${n} restant${n > 1 ? 's' : ''} en tout</div></div><span class="chip acc">${q(n)} par jour</span>${btn}</div>` : '');
  const b = (act, l, extra = '') => `<button class="btn sm" data-act="${act}" ${extra}>${l}</button>`;
  const due = Rev.due(), nd = due.qs.length + due.tr.length + due.td.length;
  return `<div class="page">
    <div class="head-row"><div><div class="h-eyebrow">${esc(course.titre)}</div><h1>Préparer l’examen</h1><p class="sub">Donne la date : le reste à faire est réparti par jour, avec deux jours de marge à la fin.</p></div>${ring(glob, 'var(--accent)')}</div>
    <div class="panel wk"><div><h3>Date de l’examen</h3>${days === null ? '' : `<div class="muted">${days < 0 ? 'Cette date est passée.' : days === 0 ? 'C’est aujourd’hui. Bon courage.' : `Dans ${plural(days, 'jour')}.`}</div>`}</div><input class="nv-in" type="date" id="examDate" value="${date}"></div>
    ${days !== null && days >= 0 ? `<div class="panel wk2"><h3>Chaque jour</h3>
      ${nd ? `<div class="list-row"><div class="lt">Erreurs à revoir</div><span class="chip warn">${nd}</span>${b('go', 'Voir', 'data-v="weak"')}</div>` : ''}
      ${days <= 2 ? `<div class="list-row"><div class="lt">Examen complet en conditions réelles</div>${b('go', 'Ouvrir', 'data-v="examSetup"')}</div>` : ''}
      ${row('Leçons du parcours', les.length, b('go', 'Ouvrir', 'data-v="path"'))}${row('Nouvelles cartes', cards.length, b('go', 'Ouvrir', 'data-v="flashSetup"'))}
      ${row('Méthodes de calcul au niveau 4', tr.length, tr[0] ? b('trainer', 'Ouvrir', `data-id="${tr[0].id}"`) : '')}${row('Exercices de TD', td.length, td[0] ? b('tdOpen', `TD ${td[0].n}`, `data-n="${td[0].n}"`) : '')}
      ${les.length + cards.length + tr.length + td.length ? '' : '<div class="list-row muted">Tout est fait : passe des examens complets.</div>'}</div>` : ''}
    ${readyHtml(R)}
  </div>`;
};
document.addEventListener('change', (e) => {
  if (e.target.id !== 'examDate') return;
  const x = (Store.data.settings.exams = { ...(Store.data.settings.exams || {}) });
  if (e.target.value) x[course.id] = e.target.value; else delete x[course.id];
  Store.save(); keepScroll();
});

/* ---------- Fiche de formules ---------- */
VIEWS.formules = () => `<div class="page fml">
  <div class="head-row"><div><div class="h-eyebrow">À imprimer ou à garder ouvert</div><h1>Formules et méthodes : ${esc(course.titre)}</h1></div><button class="btn no-print" data-act="printPage"><span class="ico" data-i="file"></span>Imprimer</button></div>
  ${chapters.map((ch) => {
    const fs = ch.fiche.filter((f) => f.formule), ts = myTrainers().filter((t) => TR_CH[t.id] === ch.id);
    return fs.length || ts.length ? `<section class="panel fml-s"><h2>${esc(ch.titre)}</h2>
      ${fs.map((f) => `<div class="fml-f"><div class="muted">${esc(f.titre)}</div><div class="f-formula">${esc(f.formule)}</div></div>`).join('')}
      ${ts.map((t) => `<div class="fml-m tdx"><h3>${esc(t.titre)}</h3><ol class="steps">${TUTOS[t.id].met.map((m) => `<li>${Td.block(m)}</li>`).join('')}</ol><p class="muted">Piège : ${Td.txt(TUTOS[t.id].piege)}</p></div>`).join('')}</section>` : '';
  }).join('')}
</div>`;

/* ---------- Examen complet : QCM, calculs et rédaction ---------- */
function startMixte() {
  const calcs = shuffle(myTrainers()).slice(0, 3).map((t) => { const p = t.gen(); return { t, p, steps: Niv.steps(t.id, p), a: {} }; });
  session = { type: 'mixte', qs: shuffle(allQcm.filter((q) => !q.annale)).slice(0, 12).map(prepQ), qa: {}, calcs, td: pick(Td.order()), grid: {}, start: Date.now(), limit: 90 * 60000, done: false, answers: {} };
  session.timerId = setInterval(() => {
    const el = $('#mxT'), left = session ? session.limit - (Date.now() - session.start) : 0;
    if (left <= 0) { endMixte(); return; }
    if (el) el.textContent = fmtTime(left);
  }, 1000);
  view = { name: 'mixte' };
  render(); $('#main').scrollTop = 0;
}
function endMixte() {
  const s = session;
  if (!s || s.type !== 'mixte' || s.done) return;
  clearInterval(s.timerId);
  s.done = true; s.duree = Date.now() - s.start;
  s.qs.forEach((q, i) => recordAnswer(q, s.qa[i] === q.answer, true));
  s.calcs.forEach((c) => { c.ok = checkTrainer(c.p, c.a); const all = Object.values(c.ok).every(Boolean); if (all) Rev.ok('t:' + c.t.id); else Rev.fail('t:' + c.t.id); });
  s.p1 = s.qs.filter((q, i) => s.qa[i] === q.answer).length * 0.5;
  s.p2 = s.calcs.reduce((a, c) => { const v = Object.values(c.ok); return a + 3 * (v.filter(Boolean).length / v.length); }, 0);
  Store.save(); render(); $('#main').scrollTop = 0;
}
const mxSteps = (e) => e.q.flatMap((q) => q.s.filter((x) => typeof x === 'string').map((x, i) => [`${q.k}-${i}`, x]));
VIEWS.mixte = () => {
  const s = session;
  if (!s || s.type !== 'mixte') return VIEWS.examSetup();
  const st = mxSteps(s.td), p3 = 5 * (st.filter(([k]) => s.grid[k]).length / st.length), n1 = (x) => x.toFixed(1).replace('.', ',');
  return `<div class="page"><div class="session" style="max-width:56.25rem">
    <div class="sess-top mx-top"><span class="chip acc"><span class="ico" data-i="timer"></span><span id="mxT">${s.done ? 'Terminé' : fmtTime(s.limit - (Date.now() - s.start))}</span></span><div style="flex:1"></div>${s.done ? `<span class="mx-n">${n1(s.p1 + s.p2 + p3)} / 20</span>` : '<button class="btn sm" data-act="mxEnd">Rendre la copie</button>'}</div>
    ${s.done ? `<div class="panel wk"><div>Questions ${n1(s.p1)} / 6, calculs ${n1(s.p2)} / 9, rédaction ${n1(p3)} / 5</div>${s.saved ? '<span class="chip good">Note enregistrée</span>' : '<button class="btn primary" data-act="mxSave">Enregistrer ma note</button>'}</div>` : ''}
    <h2 class="mx-h">1. Questions de cours (6 points)</h2>
    ${s.qs.map((q, i) => `<div class="panel q-card mx-q"><div class="q-text">${i + 1}. ${esc(q.q)}</div><div class="choices">${q.order.map((ci, k) => `<button class="choice ${s.done ? (k === q.answer ? 'ok' : k === s.qa[i] ? 'ko' : 'off') : s.qa[i] === k ? 'sel' : ''}" data-act="mxQ" data-i="${i}" data-k="${k}" ${s.done ? 'disabled' : ''}><span class="key">${k + 1}</span>${esc(q.c[ci])}</button>`).join('')}</div>${s.done && s.qa[i] !== q.answer ? `<div class="explain"><div>${esc(q.e)}</div></div>` : ''}</div>`).join('')}
    ${s.calcs.length ? '<h2 class="mx-h">2. Calculs (9 points)</h2>' : ''}
    ${s.calcs.map((c, i) => `<div class="panel q-card mx-q"><div class="q-meta"><span class="chip acc">${esc(c.t.titre)}</span></div><div class="tr-prompt">${c.p.prompt}</div><div class="fields">${c.p.fields.map((f) => `<div class="field ${s.done ? (c.ok[f.k] ? 'ok' : 'ko') : ''}"><label>${esc(f.label)}</label>${f.type === 'choice' ? `<div class="seg">${f.options.map((o) => `<button class="${c.a[f.k] === o ? 'on' : ''}" data-act="mxC" data-i="${i}" data-f="${f.k}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : `<input data-mx="${i}|${f.k}" value="${esc(c.a[f.k] || '')}" placeholder="${esc(f.ph || '')}" ${s.done ? 'readonly' : ''} spellcheck="false">`}${s.done && !c.ok[f.k] ? `<div class="exp">${esc(formatExpected(c.p, f.k))}</div>` : ''}</div>`).join('')}</div>${s.done ? `<details class="tdx nv-sol"><summary>Voir la résolution</summary><ol class="steps">${c.steps.map((x) => `<li>${Niv.step(x)}</li>`).join('')}</ol></details>` : ''}</div>`).join('')}
    <h2 class="mx-h">3. Exercice à rédiger sur papier (5 points)</h2>
    <div class="panel tdq tdx"><h3>${Td.txt(s.td.titre)}</h3>${s.td.intro.map((b) => Td.block(b)).join('')}${s.td.q.map((q) => `<p>${q.k ? `<span class="tdq-k">${esc(q.k)}</span> ` : ''}${Td.txt(q.t)}</p>`).join('')}
      ${s.done ? `<h3 style="margin-top:1.125rem">Grille : coche ce que tu as écrit</h3>${s.td.q.map((q) => { let k = -1; return `${q.k ? `<p class="muted">${esc(q.k)}</p>` : ''}${q.s.map((x) => (typeof x === 'string' ? (k++, `<button class="mx-g ${s.grid[`${q.k}-${k}`] ? 'on' : ''}" data-act="mxG" data-k2="${esc(q.k)}-${k}"><span class="mx-b">${s.grid[`${q.k}-${k}`] ? icon('check') : ''}</span><span>${Td.txt(x)}</span></button>`) : Td.block(x))).join('')}`; }).join('')}` : ''}</div>
    ${s.done ? '' : '<div class="row" style="justify-content:center;margin:1.25rem 0"><button class="btn primary lg" data-act="mxEnd">Rendre la copie</button></div>'}
  </div></div>`;
};
document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.mx;
  if (k && session && session.type === 'mixte') { const [i, f] = k.split('|'); session.calcs[i].a[f] = e.target.value; }
});

Object.assign(ACTIONS, {
  errSet: (el) => { const d = (Store.data.err = Store.data.err || {}), k = `${course.id}:${el.dataset.e}`; d[k] = (d[k] || 0) + 1; errSeen.add(el.dataset.key); Store.save(); keepFieldsIf(); keepScroll(); },
  flou: (el) => { const k = `${course.id}|${el.dataset.l}`; if (flou()[k]) delete flou()[k]; else flou()[k] = Date.now(); Store.save(); keepFieldsIf(); keepScroll(); },
  flouDel: (el) => { delete flou()[el.dataset.key]; Store.save(); keepScroll(); },
  flouCopy: () => { const t = Object.keys(flou()).filter((k) => k.startsWith(course.id + '|')).map((k) => '- ' + k.replace('|', ' : ')).join('\n'); navigator.clipboard.writeText(t).then(() => toast('Liste copiée')).catch(() => toast('Copie impossible ici')); },
  linkGo: (el) => {
    if (session && session.type === 'qcm') stash = { session, view };
    const { v, id, sec } = el.dataset;
    session = null;
    if (v === 'tdEx') go('tdEx', { n: Number(id) }); else go(v, { id });
    if (v === 'chapter' && sec !== '') { const s = document.getElementById('sec-' + sec); if (s) s.scrollIntoView({ block: 'start' }); }
  },
  stashBack: () => { const s = stash; stash = null; session = s.session; view = s.view; render(); $('#main').scrollTop = 0; },
  stashDrop: () => { stash = null; stashBar(); },
  gridSet: (el) => {
    const { key, n, i } = el.dataset, g = (Store.data.grid = Store.data.grid || {}), a = [...(g[key] || '').padEnd(Number(n), '0')];
    a[i] = a[i] === '1' ? '0' : '1'; g[key] = a.join(''); Store.save(); keepScroll();
  },
  inkOpen: (el) => { Ink.open.add(el.dataset.key); keepFieldsIf(); keepScroll(); },
  inkClose: (el) => { Ink.open.delete(el.dataset.key); keepFieldsIf(); keepScroll(); },
  inkUndo: (el) => { Ink.list(el.dataset.key).pop(); Store.save(); Ink.draw(el.closest('.ink').querySelector('canvas')); },
  inkClear: (el) => { Ink.list(el.dataset.key).length = 0; Store.save(); Ink.draw(el.closest('.ink').querySelector('canvas')); },
  seance: () => startSeance(),
  revQcm: () => startQcm(Rev.due().qs, 'Erreurs à revoir'),
  printPage: () => window.print(),
  startMixte: () => startMixte(),
  mxQ: (el) => { session.qa[el.dataset.i] = Number(el.dataset.k); keepScroll(); },
  mxC: (el) => { if (session.done) return; session.calcs[el.dataset.i].a[el.dataset.f] = el.dataset.o; keepScroll(); },
  mxG: (el) => { if (session.saved) return; const k = el.dataset.k2; session.grid[k] = !session.grid[k]; keepScroll(); },
  mxEnd: () => {
    if (!window.confirmMx) { window.confirmMx = true; toast('Reclique pour rendre la copie'); setTimeout(() => { window.confirmMx = false; }, 2500); return; }
    window.confirmMx = false; endMixte();
  },
  mxSave: () => {
    const s = session, st = mxSteps(s.td), p = s.p1 + s.p2 + 5 * (st.filter(([k]) => s.grid[k]).length / st.length);
    s.saved = true;
    Store.data.exams.push({ course: course.id, mixte: true, date: Date.now(), score: Math.round(p * 10) / 10, total: 20, duree: s.duree });
    Game.event('exam', p, 20); Store.save(); keepScroll();
  }
});
function keepFieldsIf() { if (session && session.type === 'trainer' && !session.checked) keepFields(); }

// Bandeau « reprendre le QCM » et zones de dessin, remis en place après chaque affichage
function stashBar() {
  let b = document.getElementById('stash');
  if (!stash || session) { if (b) b.remove(); return; }
  if (b) return;
  b = document.createElement('div'); b.id = 'stash';
  b.innerHTML = `<button class="btn primary" data-act="stashBack">${icon('arrowL')}Reprendre le QCM</button><button class="btn ghost" data-act="stashDrop" aria-label="Abandonner le QCM">${icon('x')}</button>`;
  document.body.appendChild(b);
}
new MutationObserver(() => { stashBar(); document.querySelectorAll('.ink-c:not([data-on])').forEach((c) => Ink.bind(c)); }).observe(document.getElementById('main'), { childList: true });
