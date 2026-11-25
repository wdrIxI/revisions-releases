// Parcours façon apprentissage de langue : chaque chapitre est une unité, découpée en courtes leçons
// à débloquer dans l'ordre. Leçon = une dizaine d'exercices générés à partir des cartes et des QCM,
// 5 cœurs, les erreurs reviennent à la fin, XP et série à la clé.

ICONS.trophy = '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>';
ICONS.lock = '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
ICONS.bolt = '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>';
ICONS.route = '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>';

const HEARTS = 5;
const GOALS = [{ xp: 10, t: 'Tranquille' }, { xp: 20, t: 'Normal' }, { xp: 30, t: 'Sérieux' }, { xp: 50, t: 'Intense' }];

/* ---------- Mascotte : Hexo, un hexagone doré ---------- */
function mascot(mood = 'happy', size = 64) {
  const mouth = {
    happy: '<path d="M25 39q7 7 14 0" stroke="#3a2a05" stroke-width="3" fill="none" stroke-linecap="round"/>',
    sad: '<path d="M25 43q7-6 14 0" stroke="#3a2a05" stroke-width="3" fill="none" stroke-linecap="round"/>',
    wow: '<ellipse cx="32" cy="41" rx="4.5" ry="5.5" fill="#3a2a05"/>'
  }[mood];
  const eyes = mood === 'sad'
    ? '<path d="M19 26l8-3M45 26l-8-3" stroke="#3a2a05" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="33" r="3.5" fill="#3a2a05"/><circle cx="40" cy="33" r="3.5" fill="#3a2a05"/>'
    : '<circle cx="24" cy="30" r="4.5" fill="#3a2a05"/><circle cx="40" cy="30" r="4.5" fill="#3a2a05"/><circle cx="25.5" cy="28.5" r="1.5" fill="#fff"/><circle cx="41.5" cy="28.5" r="1.5" fill="#fff"/>';
  return `<svg class="mascot m-${mood}" width="${size}" height="${size}" viewBox="0 0 64 64">
    <path d="M32 3 57 17.5v29L32 61 7 46.5v-29z" fill="#e0a52f"/>
    <path d="M32 3 57 17.5v26L32 58 7 43.5v-26z" fill="#ffc44d"/>
    <path d="M32 9 51 20" stroke="#ffe3a3" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    ${eyes}${mood === 'happy' ? '<circle cx="17" cy="38" r="3" fill="#ff8f6b" opacity=".55"/><circle cx="47" cy="38" r="3" fill="#ff8f6b" opacity=".55"/>' : ''}${mouth}
  </svg>`;
}

/* ---------- Données du parcours ---------- */
const Path = {
  d() {
    Store.data.path = Store.data.path || {};
    if (!Store.data.settings.goal) Store.data.settings.goal = 20;
    return Store.data.path;
  },

  // Unités et nœuds du cours affiché, calculés à partir des chapitres
  units() {
    return chapters.map((ch) => {
      const cards = allCards.filter((c) => c.chap === ch);
      const qs = allQcm.filter((q) => q.chap === ch);
      const L = Math.max(2, Math.ceil(cards.length / 6));
      const nodes = [];
      for (let k = 0; k < L; k++) {
        nodes.push({
          key: `${course.id}:${ch.id}:${k}`, ch, k, L, kind: 'lesson',
          cards: cards.slice(Math.floor((k * cards.length) / L), Math.floor(((k + 1) * cards.length) / L)),
          qcm: qs.slice(Math.floor((k * qs.length) / L), Math.floor(((k + 1) * qs.length) / L))
        });
      }
      // Exercices du chapitre : facultatifs, ils ne bloquent pas la suite
      const work = chapWork(ch);
      if (work.length) nodes.push({ key: `${course.id}:${ch.id}:x`, ch, k: L, L, kind: 'exo', cards: [], qcm: [], work });
      nodes.push({ key: `${course.id}:${ch.id}:r`, ch, k: L, L, kind: 'review', cards, qcm: qs });
      return { ch, nodes };
    });
  },

  flat() { return this.units().flatMap((u) => u.nodes); },
  done(key) {
    if (key.endsWith(':x')) { const ch = chapters.find((c) => `${course.id}:${c.id}:x` === key); return !!ch && chapWork(ch).every((w) => w.done()); }
    return !!(this.d()[key] && this.d()[key].n);
  },

  // Premier nœud non terminé : c'est la leçon « en cours »
  current(flat = this.flat()) { return flat.find((n) => n.kind !== 'exo' && !this.done(n.key)) || null; },

  unlocked(node, flat = this.flat()) {
    if (node.kind === 'exo') return this.unlocked(flat.find((n) => n.ch === node.ch), flat);
    flat = flat.filter((n) => n.kind !== 'exo');
    const i = flat.findIndex((n) => n.key === node.key);
    return i === 0 || this.done(node.key) || this.done(flat[i - 1].key);
  },

  xpToday() { const a = Store.data.activity[Store.today()]; return (a && a.xp) || 0; },

  finish(node, acc) {
    const p = this.d();
    const x = p[node.key] || { n: 0, best: 0 };
    x.n++; x.best = Math.max(x.best, acc); x.last = Date.now();
    p[node.key] = x;
    Store.bump('lessons');
  },

  // Saut d'unité réussi : tout ce qui précède est validé
  skipTo(unitIdx) {
    const p = this.d();
    this.units().slice(0, unitIdx).forEach((u) => u.nodes.forEach((n) => { if (n.kind !== 'exo' && !p[n.key]) p[n.key] = { n: 1, best: 0, skipped: true }; }));
    Store.save();
  }
};

/* ---------- Génération des exercices ---------- */
const short = (s, n) => s.length <= n;

const STOP = new Set('quelle quel quels quelles comment pourquoi dans pour avec sans une des les est que qui sur par son ses aux elle sont plus entre'.split(' '));
const words = (t) => new Set(fold(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));
const common = (a, b) => [...a].filter((w) => b.has(w)).length;

// Mauvaises réponses proches : même chapitre, mêmes mots, même tournure de question, longueur voisine
function distractors(card, pool, n) {
  const wq = words(card.q), wr = words(card.r), start = fold(card.q).split(' ')[0];
  const score = (c) => {
    const q2 = words(c.q), r2 = words(c.r);
    const ratio = Math.min(c.r.length, card.r.length) / Math.max(c.r.length, card.r.length);
    return 2 * common(wq, q2) + common(wr, r2) + common(wq, r2) + 2 * ratio
      + (fold(c.q).split(' ')[0] === start ? 1 : 0) + (c.chap === card.chap ? 2 : 0) + Math.random();
  };
  // Deux cartes proches (question ou réponse) donneraient deux bonnes réponses
  const near = (x, y, min, part) => { const n = common(x, y); return n >= min && n >= part * Math.min(x.size, y.size); };
  const twin = (c) => near(wq, words(c.q), 2, 0.6) || near(wr, words(c.r), 3, 0.65) || near(wr, words(c.r), 1, 1);
  const seen = new Set([fold(card.r)]);
  return pool.filter((c) => c.id !== card.id && !twin(c)).map((c) => [score(c), c.r]).sort((x, y) => y[0] - x[0])
    .filter(([, r]) => !seen.has(fold(r)) && seen.add(fold(r))).slice(0, n).map(([, r]) => r);
}

/* ---------- Explications après la réponse ---------- */
// Passage de la fiche le plus proche de la notion (mots rares du chapitre = plus de poids)
function courseExtract(ch, text, answer) {
  if (!ch._pts) {
    const pts = ch.fiche.flatMap((f) => f.points.map((t) => ({ f, t, w: words(t), tw: words(f.titre) })));
    const df = {};
    pts.forEach((x) => new Set([...x.w, ...x.tw]).forEach((k) => { df[k] = (df[k] || 0) + 1; }));
    ch._pts = { pts, idf: (k) => Math.log(1 + pts.length / (df[k] || 1)) };
  }
  const { pts, idf } = ch._pts;
  const wq = words(text), wa = words(answer);
  const all = new Set([...wq, ...wa]);
  const total = [...all].reduce((a, k) => a + idf(k), 0) || 1;
  const sum = (set, f) => [...set].reduce((a, k) => a + (all.has(k) ? f(k) : 0), 0);
  const ranked = pts.map((x) => ({ ...x, s: sum(x.w, idf) + 0.5 * sum(x.tw, (k) => (x.w.has(k) ? 0 : idf(k))), n: common(all, x.w) })).sort((a, b) => b.s - a.s);
  const best = ranked[0];
  if (!best || best.n < 2 || best.s / total < 0.3) return null; // rien d'assez proche : mieux vaut ne rien afficher
  const second = ranked.find((x) => x !== best && x.f === best.f && x.n >= 2 && x.s >= 0.6 * best.s);
  return { titre: best.f.titre, page: best.f.page, points: second ? [best.t, second.t] : [best.t] };
}

// Explication principale, affichée dans le bandeau de réponse
function lessonWhy(e) {
  if (e.type === 'match') return '';
  if (e.type === 'calc') return e.x.why.replace(/[`{}]/g, '');
  return (e.card ? e.card.e : (e.type === 'qcm' ? e.q : e.src).e) || '';
}
function lessonExplain(s, e) {
  const wrap = (rows) => (rows.length ? `<div class="lz-why">${rows.map(([k, v]) => `<div class="lw-row"><div class="lw-k">${k}</div><div class="lw-v">${v}</div></div>`).join('')}</div>` : '');
  if (e.type === 'match') {
    const rows = [['Les explications', e.pairs.map((p) => `<div class="lw-other"><div>${esc(p.q)} <span class="hl">${esc(p.r)}</span></div>${p.e ? `<div class="muted">${esc(p.e)}</div>` : ''}</div>`).join('')]];
    const sg = siglesHtml(e.pairs.flatMap((p) => [p.q, p.r]));
    if (sg) rows.push(['Les sigles', sg]);
    return wrap(rows);
  }
  if (e.type === 'calc') return wrap([['L’étape', `<div class="tdx">${Niv.step(e.x, undefined, { why: false })}</div>`]]);
  const q = e.type === 'qcm' ? e.q : e.src;
  const ch = e.card ? e.card.chap : q.chap;
  const right = e.card ? e.card.r : q.c[q.a];
  const rows = [];
  if (e.type === 'def') {
    // Chaque mauvaise réponse est la bonne réponse d'une autre carte : on dit laquelle
    const from = (r) => allCards.find((c) => c.r === r && c.chap === ch) || allCards.find((c) => c.r === r);
    const others = e.opts.map((r, k) => ({ r, k, c: from(r) })).filter((x) => x.k !== e.answer && x.c);
    if (!s.ok && s.pick >= 0) others.sort((a, b) => (b.k === s.pick) - (a.k === s.pick));
    if (others.length) rows.push(['Les autres réponses', others.map((x) => `<div class="lw-other ${!s.ok && x.k === s.pick ? 'mine' : ''}"><div class="muted">${!s.ok && x.k === s.pick ? 'Ta réponse' : `Réponse ${x.k + 1}`}, elle répond à :</div><div>${esc(x.c.q)}</div></div>`).join('')]);
  }
  if (e.type === 'tf' && e.answer === 1) rows.push(['La bonne réponse', esc(e.tf.right)]);
  const x = courseExtract(ch, e.card ? e.card.q : q.q, right);
  // Inutile de répéter mot pour mot la bonne réponse
  const same = x && x.points.length === 1 && fold(x.points[0]).length < fold(right).length + 25 && common(words(x.points[0]), words(right)) >= 0.8 * words(right).size;
  if (x && !same) rows.push(['Dans le cours', `${x.points.map((t) => `<p>${esc(t)}</p>`).join('')}<span class="muted">${esc(x.titre)}${x.page ? `, page ${x.page} du PDF` : ''}</span>`]);
  // La question et les réponses d'abord, puis le reste de l'explication
  const choices = e.type === 'def' ? e.opts : e.type === 'qcm' ? q.c : [e.tf.shown];
  const sg = siglesHtml([e.card ? e.card.q : q.q, right, ...choices, lessonWhy(e), ...(x && !same ? x.points : [])]);
  if (sg) rows.push(['Les sigles', sg]);
  return wrap(rows);
}

function buildLesson(node, mode = 'lesson') {
  const ex = [];
  const cards = node.kind === 'review' || mode === 'jump' ? shuffle(node.cards).slice(0, 8) : node.cards;
  const qcm = node.kind === 'review' || mode === 'jump' ? pickQuestions(node.qcm, 5) : node.qcm;
  cards.forEach((c) => {
    const opts = shuffle([c.r, ...distractors(c, allCards, 3)]);
    ex.push({ type: 'def', card: c, opts, answer: opts.indexOf(c.r) });
  });
  const uniq = qcm.filter((q, i) => qcm.findIndex((x) => x.id === q.id) === i); // même énoncé présent deux fois (cours et annale)
  const asQcm = (q) => { const p = prepQ(q); return { type: 'qcm', q: p, answer: p.answer }; };
  const asTf = (q) => { const t = makeTf(q); return t ? { type: 'tf', tf: t, src: q, answer: t.answer } : null; };
  uniq.forEach((q, i) => ex.push((i % 3 === 2 && asTf(q)) || asQcm(q)));
  // Deux vrai ou faux de plus, sur d'autres questions du chapitre
  const tfs = shuffle(allQcm.filter((q) => q.chap === node.ch && !qcm.some((x) => x.id === q.id))).map(asTf).filter(Boolean).slice(0, 2);
  const keep = (mode === 'jump' ? 12 : 11) - tfs.length;
  let lesson = shuffle([...shuffle(ex).slice(0, keep), ...tfs]);
  // Une étape de calcul, si le chapitre a des exercices
  const calc = calcEx(node.ch);
  if (calc) lesson.splice(Math.floor(lesson.length * 0.6), 0, calc);
  // Une association de paires par leçon, avec les cartes à réponse courte
  const ok = (c) => short(c.q, 90) && short(c.r, 110);
  const own = shuffle(node.cards.filter(ok));
  const pairs = [...own, ...shuffle(allCards.filter((c) => c.chap === node.ch && ok(c) && !own.includes(c)))].slice(0, 4);
  if (pairs.length >= 3) lesson.splice(Math.min(lesson.length, 3 + Math.floor(Math.random() * 3)), 0, { type: 'match', pairs, right: shuffle(pairs.map((_, i) => i)), done: [], sel: null });
  return lesson;
}

/* ---------- Session de leçon ---------- */
function startLesson(key, mode = 'lesson') {
  const flat = Path.flat();
  let node = flat.find((n) => n.key === key);
  if (mode === 'jump') {
    // Test de saut : questions de toute l'unité visée
    const u = Path.units().find((x) => x.ch.id === key);
    node = { ...u.nodes[u.nodes.length - 1], key: 'jump:' + key };
  }
  if (!node) return;
  const wasActive = (() => { const a = Store.data.activity[Store.today()]; return !!(a && (a.cards + a.qcm + (a.lessons || 0)) > 0); })();
  session = {
    type: 'lesson', mode, node, list: buildLesson(node, mode), i: 0, total: 0,
    hearts: mode === 'jump' ? 3 : HEARTS, pick: null, checked: false, ok: null,
    mistakes: 0, answered: 0, t0: Date.now(), wasActive, streak0: Store.streak(), end: null
  };
  session.total = session.list.length;
  session.test = mode === 'jump' && Path.unlocked(Path.units().find((u) => u.ch.id === key).nodes[0]);
  Game.combo = 0;
  view = { name: 'lesson' };
  render();
}

const curEx = () => session.list[session.i];

function lessonCheck() {
  const s = session, e = curEx();
  if (s.checked || s.pick === null || e.type === 'match') return;
  s.checked = true;
  s.ok = s.pick === e.answer;
  s.answered++;
  if (e.card) markCard(e.card.id, s.ok);
  if (e.type === 'calc') { if (s.ok) Rev.ok('t:' + e.t.id); else Rev.fail('t:' + e.t.id); }
  if (e.q) { recordAnswer(e.q, s.ok, true); if (s.ok) Game.progress('qcmOk'); }
  // Un vrai ou faux réussi peut être de la chance : seule l'erreur compte dans les points faibles
  if (e.src && !s.ok) recordAnswer(e.src, false, true);
  Game.hit(s.ok);
  if (s.ok) Sound.play('ok');
  else {
    Sound.play('ko');
    s.mistakes++;
    s.hearts--;
    s.list.push({ ...e, retry: true }); // l'erreur revient à la fin de la leçon
    shake($('.lz-body'));
  }
  Store.save();
  render();
}

function lessonNext() {
  const s = session;
  if (!s.checked) return;
  if (s.hearts <= 0) { s.end = 'fail'; Sound.play('lose'); render(); return; }
  s.i++; s.pick = null; s.checked = false; s.ok = null;
  if (s.i >= s.list.length) return lessonFinish();
  render();
}

function lessonFinish() {
  const s = session;
  const acc = s.answered ? (s.answered - s.mistakes) / s.answered : 1;
  const ms = Date.now() - s.t0;
  if (s.mode === 'jump') {
    const idx = Path.units().findIndex((u) => u.ch.id === s.node.ch.id);
    Path.skipTo(s.test ? idx + 1 : idx);
    s.xp = 20;
  } else if (s.mode === 'mix') s.xp = 15;
  else {
    Path.finish(s.node, acc);
    s.xp = (s.node.kind === 'review' ? 20 : 10) + (s.mistakes === 0 ? 5 : 0);
  }
  s.acc = acc; s.ms = ms; s.end = 'win';
  Game.award(s.xp, s.mode === 'jump' ? 'Unité validée' : 'Leçon terminée');
  Sound.play('win');
  confetti(s.mistakes === 0 ? 180 : 110);
  render();
}

// Répétition espacée sans déclencher l'XP par carte (la leçon donne son XP à la fin)
function markCard(id, ok) {
  const prev = Store.data.srs[id];
  if (prev && !SRS.isDue(id) && ok) return; // carte déjà planifiée : on ne la pousse pas plus loin
  const st = SRS.preview(prev, ok ? 3 : 1);
  const now = Date.now();
  st.due = st.interval === 0 ? now + 10 * 60000 : now + st.interval * DAY;
  st.last = now;
  st.first = prev && prev.first ? prev.first : now;
  Store.data.srs[id] = st;
  if (!ok) Store.data.wrong[id] = (Store.data.wrong[id] || 0) + 1;
  else if (Store.data.wrong[id]) delete Store.data.wrong[id];
  Store.bump('cards');
  Game.progress('cards');
}

/* ---------- Vue : le chemin ---------- */
const WAVE = [0, 56, 84, 56, 0, -56, -84, -56];

VIEWS.path = () => {
  Path.d();
  const units = Path.units(), flat = units.flatMap((u) => u.nodes);
  const cur = Path.current(flat);
  const pop = view.pop;
  let idx = 0;
  const body = units.map((u, ui) => {
    const unitOpen = Path.unlocked(u.nodes[0], flat);
    const main = u.nodes.filter((n) => n.kind !== 'exo'), doneN = main.filter((n) => Path.done(n.key)).length;
    const banner = `<div class="unit" style="--uc:${u.ch.color}">
      <div class="unit-l"><div class="unit-k">Unité ${ui + 1} · ${doneN} / ${main.length}</div><div class="unit-t">${esc(u.ch.titre)}</div><div class="unit-d">${esc(u.ch.resume)}</div></div>
      <div class="unit-r">
        <button class="unit-btn" data-act="chap" data-id="${u.ch.id}"><span class="ico" data-i="book"></span>Fiche</button>
        ${!unitOpen ? `<button class="unit-btn" data-act="jumpUnit" data-id="${u.ch.id}"><span class="ico" data-i="bolt"></span>Sauter ici</button>` : cur && cur.ch === u.ch ? `<button class="unit-btn" data-act="jumpUnit" data-id="${u.ch.id}"><span class="ico" data-i="bolt"></span>Je connais déjà</button>` : ''}
      </div>
    </div>`;
    const nodes = u.nodes.map((n) => {
      const off = WAVE[idx++ % WAVE.length];
      const done = Path.done(n.key), open = Path.unlocked(n, flat), isCur = cur && cur.key === n.key;
      const st = isCur ? 'cur' : done ? 'done' : open ? 'open' : 'locked';
      const ic = n.kind === 'exo' ? (done ? 'check' : open ? 'calc' : 'lock') : n.kind === 'review' ? 'trophy' : done ? 'check' : open ? 'star' : 'lock';
      const best = Store.data.path[n.key];
      const popHtml = pop === n.key ? `<div class="node-pop" style="--uc:${u.ch.color}">
          <div class="np-t">${n.kind === 'exo' ? 'Exercices du chapitre' : n.kind === 'review' ? 'Révision de l’unité' : `Leçon ${n.k + 1} sur ${n.L}`}</div>
          <div class="np-d">${n.kind === 'exo' ? `${n.work.filter((w) => w.done()).length} / ${n.work.length} réussis. Facultatif, mais c’est ce qui prépare le mieux.` : open ? (n.kind === 'review' ? 'Toute l’unité mélangée, pour graver le chapitre.' : `${plural(n.cards.length, 'notion')} et ${plural(n.qcm.length, 'question')} de QCM.`) : 'Termine les leçons précédentes pour débloquer celle-ci.'}</div>
          ${best && best.n ? `<div class="np-d">Faite ${best.n} fois${best.skipped ? ' (unité sautée)' : `, meilleure précision ${pct(best.best)} %`}</div>` : ''}
          ${n.kind === 'exo' ? n.work.map((w) => `<button class="np-w ${w.done() ? 'ok' : ''}" ${open ? `data-act="${w.act}" data-id="${esc(w.id)}"` : 'disabled'}><span>${esc(w.t)}</span><span>${esc(w.s())}</span></button>`).join('') : open ? `<button class="bigbtn" data-act="startLesson" data-key="${n.key}">${done ? 'Refaire' : 'Commencer'} +${n.kind === 'review' ? 20 : 10} XP</button>` : '<button class="bigbtn off" disabled>Verrouillée</button>'}
        </div>` : '';
      return `<div class="node-row" style="transform:translateX(${off}px)">
        ${isCur && pop !== n.key ? '<div class="node-tip">Commencer</div>' : ''}
        <button class="node ${st} ${n.kind}" style="--uc:${u.ch.color}" data-act="nodePop" data-key="${n.key}" title="${n.kind === 'exo' ? 'Exercices du chapitre' : n.kind === 'review' ? 'Révision de l’unité' : `Leçon ${n.k + 1}`}">${icon(ic)}</button>
        ${popHtml}
      </div>`;
    }).join('');
    return `${banner}<div class="nodes">${nodes}</div>`;
  }).join('');

  const goal = Store.data.settings.goal, xpT = Path.xpToday();
  const r = 26, c = 2 * Math.PI * r, gp = Math.min(1, xpT / goal);
  const main = flat.filter((n) => n.kind !== 'exo'), totalDone = main.filter((n) => Path.done(n.key)).length;
  return `<div class="path-page">
    <div class="path-main">
      <div class="path-head">
        <div><div class="ph-k">Parcours</div><h1>${esc(course.titre)}</h1></div>
        <div class="ph-prog">${totalDone} / ${main.length} leçons</div>
      </div>
      ${cur ? '' : `<div class="path-done">${mascot('wow', 72)}<div><h3>Parcours terminé</h3><p class="muted">Tu peux refaire n’importe quelle leçon, ou passer à l’examen blanc.</p></div></div>`}
      ${body}
    </div>
    <aside class="path-rail">
      <div class="rail-card streak-card">
        <span class="ico big-flame" data-i="flame"></span>
        <div><div class="rc-n">${Store.streak()}</div><div class="rc-l">${Store.streak() > 1 ? 'jours de suite' : 'jour de série'}</div></div>
      </div>
      <div class="rail-card">
        <div class="rc-h">Objectif du jour</div>
        <div class="goal">
          <svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="7"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${gp >= 1 ? 'var(--good)' : 'var(--gold)'}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c * gp} ${c}" transform="rotate(-90 32 32)"/></svg>
          <div><div class="rc-n sm">${Math.min(xpT, goal)} / ${goal} XP</div><div class="rc-l">${gp >= 1 ? 'Objectif atteint' : `encore ${goal - xpT} XP`}</div></div>
        </div>
        <div class="goal-pick">${GOALS.map((g) => `<button class="${g.xp === goal ? 'on' : ''}" data-act="setGoal" data-xp="${g.xp}" title="${g.t}">${g.xp}</button>`).join('')}</div>
      </div>
      <div class="rail-card">
        <div class="rc-h">Quêtes du jour</div>
        ${Game.questsHtml()}
      </div>
      <div class="rail-card hexo-card">${mascot(xpT ? 'happy' : 'wow', 54)}<p>${xpT >= goal ? 'Objectif rempli. Une leçon de plus pour prendre de l’avance ?' : cur ? `Prochaine étape : ${esc(cur.ch.titre)}, ${cur.kind === 'review' ? 'révision de l’unité' : `leçon ${cur.k + 1}`}.` : 'Tout est fait. Bravo.'}</p></div>
    </aside>
  </div>`;
};

VIEWS_AFTER.path = () => {
  const el = document.querySelector('.node.cur');
  if (el && !view.pop && !view.scrolled) { view.scrolled = true; el.scrollIntoView({ block: 'center' }); }
};

// Les réponses colorées restent visibles ; l'explication principale est dans le bandeau, le détail se lit en descendant
VIEWS_AFTER.lesson = () => { const m = $('#main'); m.scrollTop = 0; setTimeout(() => { if (view.name === 'lesson') m.scrollTop = 0; }, 60); };

/* ---------- Vue : la leçon ---------- */
VIEWS.lesson = () => {
  const s = session;
  if (!s) return VIEWS.path();
  if (s.end === 'win') return lessonEnd();
  if (s.end === 'fail') return `<div class="lz"><div class="lz-end">
      ${mascot('sad', 120)}
      <h1>Plus de cœurs</h1>
      <p class="muted">Pas grave : relis la fiche du chapitre puis retente la leçon. Les erreurs ont été ajoutées à tes points faibles.</p>
      <div class="lz-end-btns">
        ${s.node.ch ? `<button class="bigbtn ghost" data-act="chap" data-id="${s.node.ch.id}">Lire la fiche</button>` : ''}
        <button class="bigbtn" data-act="retryLesson">Réessayer</button>
      </div>
    </div></div>`;
  const e = curEx();
  const progress = s.i / s.list.length;
  let title = '', content = '';
  if (e.type === 'def') {
    title = 'Choisis la bonne réponse';
    content = `<div class="lz-q">${esc(e.card.q)}</div>${opts(e.opts, e)}`;
  } else if (e.type === 'tf') {
    title = 'Cette réponse est-elle juste ?';
    content = `<div class="lz-q">${esc(e.tf.text)}</div><div class="lz-shown">${esc(e.tf.shown)}</div>${opts(['Oui, c’est juste', 'Non, c’est faux'], e, true)}`;
  } else if (e.type === 'qcm') {
    title = 'QCM';
    content = `<div class="lz-q">${esc(e.q.q)}</div>${opts(e.q.order.map((ci) => e.q.c[ci]), e)}`;
  } else if (e.type === 'calc') {
    title = `Calcul : ${e.t.titre}`;
    content = `<div class="tr-prompt lz-calc">${e.p.prompt}</div><div class="lz-q">${Td.txt(e.x.ask)}</div>${opts(e.opts, e)}`;
  } else {
    title = 'Associe les paires';
    content = `<div class="match">
      <div class="mcol">${e.pairs.map((p, i) => `<button class="mbtn ${e.done.includes(i) ? 'gone' : ''} ${e.sel && e.sel.side === 'l' && e.sel.i === i ? 'sel' : ''}" data-act="matchPick" data-side="l" data-i="${i}" ${e.done.includes(i) ? 'disabled' : ''}>${esc(p.q)}</button>`).join('')}</div>
      <div class="mcol">${e.right.map((i) => `<button class="mbtn ${e.done.includes(i) ? 'gone' : ''} ${e.sel && e.sel.side === 'r' && e.sel.i === i ? 'sel' : ''}" data-act="matchPick" data-side="r" data-i="${i}" ${e.done.includes(i) ? 'disabled' : ''}>${esc(e.pairs[i].r)}</button>`).join('')}</div>
    </div>`;
  }
  const right = e.type === 'def' ? `Bonne réponse : ${e.card.r}` : e.type === 'tf' ? (e.answer === 0 ? 'Cette réponse était juste.' : `Cette réponse était fausse. La bonne : ${e.tf.right}`) : e.type === 'qcm' ? `Bonne réponse : ${e.q.c[e.q.a]}` : e.type === 'calc' ? `Bonne réponse : ${e.x.v}` : '';
  const foot = s.checked
    ? `<div class="lz-foot ${s.ok ? 'good' : 'bad'}"><div class="lz-foot-in">
        ${mascot(s.ok ? 'happy' : 'sad', 58)}
        <div class="lz-fb"><div class="lz-fb-t">${s.ok ? pick(['Bien joué', 'Excellent', 'Parfait', 'Exactement', 'Bravo']) : 'Pas tout à fait'}</div>
          ${s.ok ? '' : `<div class="lz-fb-d">${esc(right)}</div>`}
          ${lessonWhy(e) ? `<div class="lz-fb-w">${esc(lessonWhy(e))}</div>` : ''}</div>
        <button class="bigbtn ${s.ok ? '' : 'red'}" data-act="lessonNext" autofocus>Continuer</button>
      </div></div>`
    : `<div class="lz-foot"><div class="lz-foot-in">
        <button class="bigbtn ghost" data-act="lessonSkip">Passer</button>
        <span class="lz-hint">${e.type === 'match' ? 'Clique une notion puis sa réponse' : 'Touches 1 à 4, puis Entrée'}</span>
        <button class="bigbtn" data-act="lessonCheck" ${s.pick === null || e.type === 'match' ? 'disabled' : ''}>Vérifier</button>
      </div></div>`;
  return `<div class="lz">
    <div class="lz-top">
      <button class="lz-x" data-act="lessonQuit" title="Quitter (Échap)">${icon('x')}</button>
      <div class="lz-bar"><i style="width:${Math.max(3, progress * 100)}%"></i></div>
      <div class="lz-hearts ${s.hearts <= 1 ? 'low' : ''}">${icon('heart')}<span>${s.hearts}</span></div>
    </div>
    <div class="lz-body">
      ${e.retry ? '<div class="lz-retry">Erreur précédente</div>' : ''}
      ${s.mode === 'jump' && s.i === 0 ? `<div class="lz-retry">Test pour sauter à « ${esc(s.node.ch.titre)} » : 3 cœurs seulement</div>` : ''}
      <div class="lz-title">${title}</div>
      ${content}
      ${s.checked ? lessonExplain(s, e) : ''}
    </div>
    ${foot}
  </div>`;
};

function opts(list, e, tf) {
  const s = session;
  return `<div class="lz-opts ${tf ? 'tf' : ''}">${list.map((t, k) => {
    let cls = s.pick === k ? 'sel' : '';
    if (s.checked) cls = k === e.answer ? 'ok' : s.pick === k ? 'ko' : 'dim';
    return `<button class="lz-opt ${cls}" data-act="lessonPick" data-k="${k}" ${s.checked ? 'disabled' : ''}><span class="k">${k + 1}</span><span>${esc(t)}</span></button>`;
  }).join('')}</div>`;
}

function lessonEnd() {
  const s = session;
  const streakNew = !s.wasActive;
  const st = Store.streak();
  const sec = Math.round(s.ms / 1000);
  return `<div class="lz"><div class="lz-end">
    ${mascot('happy', 130)}
    <h1>${s.mode === 'mix' ? 'Séance terminée' : s.mode === 'jump' ? 'Unité débloquée' : s.mistakes === 0 ? 'Leçon parfaite' : 'Leçon terminée'}</h1>
    <div class="end-tiles">
      <div class="end-tile gold"><div class="et-k">XP gagnée</div><div class="et-v">${icon('bolt')}${s.xp}</div></div>
      <div class="end-tile green"><div class="et-k">Précision</div><div class="et-v">${icon('target')}${pct(s.acc)} %</div></div>
      <div class="end-tile blue"><div class="et-k">Temps</div><div class="et-v">${icon('timer')}${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</div></div>
    </div>
    ${streakNew ? `<div class="end-streak">${icon('flame')}<span>${st > 1 ? `${st} jours de suite, la série continue` : 'Série lancée : reviens demain pour la prolonger'}</span></div>` : ''}
    <div class="lz-end-btns"><button class="bigbtn" data-act="lessonDone" autofocus>Continuer</button></div>
  </div></div>`;
}

/* ---------- Actions ---------- */
Object.assign(ACTIONS, {
  nodePop: (el) => { view.pop = view.pop === el.dataset.key ? null : el.dataset.key; keepScroll(); },
  startLesson: (el) => startLesson(el.dataset.key),
  jumpUnit: (el) => startLesson(el.dataset.id, 'jump'),
  setGoal: (el) => { Store.data.settings.goal = Number(el.dataset.xp); Store.save(); keepScroll(); },
  lessonPick: (el) => { if (session.checked) return; session.pick = Number(el.dataset.k); Sound.play('tick'); render(); },
  lessonCheck: () => lessonCheck(),
  lessonNext: () => lessonNext(),
  lessonSkip: () => {
    const s = session, e = curEx();
    if (s.checked) return;
    if (e.type === 'match') { s.i++; s.pick = null; if (s.i >= s.list.length) lessonFinish(); else render(); return; }
    s.pick = -1; lessonCheck();
  },
  lessonQuit: () => {
    if (session && session.answered && !session.end && !window.confirmQuit) {
      window.confirmQuit = true;
      toast('Reclique sur la croix pour quitter : la progression de cette leçon sera perdue');
      setTimeout(() => { window.confirmQuit = false; }, 2500);
      return;
    }
    window.confirmQuit = false;
    go('path');
  },
  lessonDone: () => go('path'),
  retryLesson: () => { const s = session; if (s.mode === 'mix') return startSeance(); startLesson(s.mode === 'jump' ? s.node.ch.id : s.node.key, s.mode); },
  matchPick: (el) => {
    const s = session, e = curEx();
    const side = el.dataset.side, i = Number(el.dataset.i);
    if (!e.sel || e.sel.side === side) { e.sel = { side, i }; Sound.play('tick'); render(); return; }
    if (e.sel.i === i) {
      e.done.push(i); e.sel = null; Sound.play('ok');
      markCard(e.pairs[i].id, true);
      if (e.done.length === e.pairs.length) { s.checked = true; s.ok = true; s.answered++; Game.hit(true); }
      render();
    } else {
      e.sel = null; e.miss = (e.miss || 0) + 1; Sound.play('ko');
      render(); shake($('.match'));
    }
  }
});

/* ---------- Clavier pendant une leçon ---------- */
document.addEventListener('keydown', (ev) => {
  if (view.name !== 'lesson' || !session || session.type !== 'lesson') return;
  if (!$('#paletteBack').hidden || ev.ctrlKey || ev.metaKey) return;
  ev.stopImmediatePropagation();
  const s = session;
  if (ev.key === 'Escape') { ACTIONS.lessonQuit(); return; }
  if (s.end) { if (ev.key === 'Enter') { ev.preventDefault(); s.end === 'win' ? go('path') : ACTIONS.retryLesson(); } return; }
  const e = curEx();
  if (ev.key === 'Enter') { ev.preventDefault(); s.checked ? lessonNext() : lessonCheck(); return; }
  if (s.checked || e.type === 'match') return;
  const n = Number(ev.key);
  const count = e.type === 'tf' ? 2 : e.opts ? e.opts.length : e.q.c.length;
  if (n >= 1 && n <= count) { s.pick = n - 1; Sound.play('tick'); render(); }
}, true);
