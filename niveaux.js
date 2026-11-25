// Les cinq niveaux de chaque calcul : regarder, compléter, trouver l'erreur, faire seul, type examen
const NIV = [
  ['Regarder', 'Un exemple expliqué étape par étape.'],
  ['Compléter', 'La même résolution avec des trous à remplir.'],
  ['Trouver l’erreur', 'Une étape est fausse, à toi de la repérer.'],
  ['Faire seul', 'Deux exercices justes d’affilée, avec des indices si besoin.'],
  ['Type examen', 'Un exercice sans aucune aide, ou un TD réussi sur ce thème.']
];
// Chapitre et thème de TD de chaque calcul
const TR_CH = { cidr: 'reseau', mask: 'reseau', same: 'reseau', lpm: 'reseau', rip: 'reseau', crc: 'liaison', stuff: 'liaison', hamming: 'liaison', decode: 'liaison', delay: 'physique', shannon: 'physique', bdp: 'transport', landau: 'intro', knap: 'progdyn', bf: 'progdyn', ls: 'approx', round: 'schemas', greedysc: 'dual', tree: 'baker', pivot: 'simplexe', simplexe: 'simplexe', dualw: 'dual', sensb: 'postopt', sadrelax: 'sac', sadfix: 'sac', sadpd: 'pd' };
const TR_TD = { cidr: 'IPv4', mask: 'IPv4', same: 'IPv4', lpm: 'Routage', rip: 'Routage', crc: 'Détection', stuff: 'Liaison', hamming: 'Correction', decode: 'Correction', delay: 'Performance', bdp: 'Performance', ls: 'Approximation', round: 'Schémas', greedysc: 'Dual fitting', pivot: 'Simplexe', simplexe: 'Simplexe', dualw: 'Dualité', sensb: 'Post-optimisation', sadrelax: 'Examen 2019', sadfix: 'Examen 2019' };

// Difficulté de chaque calcul : 1 facile, 2 moyen, 3 difficile
const DIFF = { 1: 'mask same lpm stuff landau decode delay gbn treedec graph2 bbn cplexs', 2: 'cidr crc hamming bdp shannon rip agreg fen ligne knap bf ls greedysc tree etats seuil pivot sadrelax sadpd artif sensb sensc', 3: 'vlsm round pdsc elag simplexe dualw sadfix dualsimp ecarts' };
const DIFF_T = ['', 'Facile', 'Moyen', 'Difficile'];
const diffOf = (id) => Number(Object.keys(DIFF).find((k) => DIFF[k].split(' ').includes(id))) || 2;
const diffHtml = (id) => { const d = diffOf(id); return `<span class="diff d${d}" title="Difficulté : ${DIFF_T[d].toLowerCase()}"><span class="diff-b">${[1, 2, 3].map((i) => `<i class="${i <= d ? 'on' : ''}"></i>`).join('')}</span>${DIFF_T[d]}</span>`; };

const Niv = {
  get(id) { const d = (Store.data.niv = Store.data.niv || {}); return d[id] || 0; },
  pass(id, lv) {
    if (this.get(id) >= lv) return false;
    Store.data.niv[id] = lv; Store.save();
    Game.award(5 + 5 * lv, `${NIV[lv - 1][0]} : niveau validé`);
    confetti(80);
    return true;
  },
  steps(id, p) { return PAS[id](p.raw); },
  // Une étape affichée : phrase, raison, bloc
  step(x, v, o = {}) { return `<p>${Td.txt(x.s(v === undefined ? x.v : v))}</p>${o.why === false ? '' : `<div class="nv-why">${(x.d || [x.why]).map((b) => Td.block(b)).join('')}</div>`}${x.b && o.block !== false ? Td.block(x.b) : ''}`; },
  num(s) { const t = norm(s).replace(/−/g, '-'), m = t.match(/^(-?[\d.]+)\/(-?[\d.]+)$/); return m ? Number(m[1]) / Number(m[2]) : /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN; },
  same(x, a) {
    if (x.opt) return a === x.v;
    if (x.num) return numOk(a, this.num(x.v), x.tol || 0.02);
    const u = this.num(a), w = this.num(x.v);
    return norm(a).replace(/−/g, '-') === norm(x.v).replace(/−/g, '-') || (!/^[01]{2,}$/.test(x.v) && Number.isFinite(u) && u === w);
  },
  // Un TD réussi sur le même thème valide le niveau 5 (une fois le niveau 4 atteint)
  fromTd(n) { const e = Td.get(n); myTrainers().filter((t) => e && TR_TD[t.id] === e.theme && this.get(t.id) === 4).forEach((t) => this.pass(t.id, 5)); },
  tds(id) { return TR_TD[id] ? Td.order().filter((e) => e.theme === TR_TD[id]) : []; }
};

/* ---------- Page d'un calcul : idée, méthode, niveaux ---------- */
VIEWS.tuto = () => {
  const t = TRAINERS.find((x) => x.id === view.id), u = TUTOS[view.id], l = Niv.get(t.id), tds = Niv.tds(t.id);
  const back = session && session.type === 'trainer' && session.t.id === t.id;
  return `<div class="page wide tdx">
    <div class="tdx-top"><button class="btn ghost sm" data-act="go" data-v="train"><span class="ico" data-i="arrowL"></span>Exercices</button>${back ? '<div class="tdx-nav"><button class="btn sm primary" data-act="tutoBack">Retour à mon exercice</button></div>' : ''}</div>
    <div class="tdx-head"><div class="h-eyebrow">${esc(t.theme)}</div><h1>${esc(t.titre)}</h1><p class="sub">${Td.txt(u.but)}</p>${diffHtml(t.id)}</div>
    <div class="tdx-cols">
      <div class="tdx-qs">
        <section class="panel tdq"><div class="tdx-st"><h3>L’idée</h3></div><p class="nv-idee">${Td.txt(IDEES[t.id])}</p></section>
        <section class="panel tdq"><div class="tdx-st"><h3>La méthode</h3></div>${tutoMethod(u)}</section>
      </div>
      <div class="tdx-qs nv-col">
        <div class="nv-list">${NIV.map(([n, d], i) => { const lv = i + 1, ok = l >= lv, open = l >= i; return `<button class="panel nv-card ${ok ? 'ok' : open ? 'cur' : 'lock'}" ${open ? `data-act="nivGo" data-id="${t.id}" data-lv="${lv}"` : 'disabled'}><span class="nv-n">${ok ? icon('check') : open ? lv : icon('lock')}</span><span class="td-ct"><span class="t">${n}</span><span class="d">${d}</span></span>${open ? '<span class="ico td-go" data-i="arrowR"></span>' : ''}</button>`; }).join('')}</div>
        <button class="btn" data-act="trainerGo" data-id="${t.id}"><span class="ico" data-i="rotate"></span>Entraînement libre</button>
        ${tds.length ? `<section class="panel tdq"><div class="tdx-st"><h3>Dans les TD</h3></div>${tds.map((e) => `<button class="nv-td" data-act="tdOpen" data-n="${e.n}"><span class="ico" data-i="${Td.st(e) === 'ok' ? 'check' : 'pencil'}"></span>${Td.txt(e.titre)}</button>`).join('')}</section>` : ''}
      </div>
    </div></div>`;
};

/* ---------- Niveaux 1 à 3 ---------- */
function startNiv(id, lv, d) {
  const t = TRAINERS.find((x) => x.id === id);
  if (lv >= 4) { session = null; newProblem(id, lv); $('#main').scrollTop = 0; return; }
  const dd = t.gen.length ? (d === undefined ? (lv === 1 ? 0 : 1) : d) : undefined, p = t.gen(dd), steps = Niv.steps(id, p);
  session = { type: 'niv', t, lv, d: dd, p, steps, i: 0, ok: 0, ko: 0, answers: {} };
  const ask = steps.map((x, i) => i).filter((i) => steps[i].v !== undefined);
  if (lv === 2) {
    // Au plus 8 trous, répartis sur toute la résolution
    session.ask = new Set(ask.length <= 8 ? ask : ask.filter((_, k) => k === 0 || Math.floor((k * 8) / ask.length) !== Math.floor(((k - 1) * 8) / ask.length)));
    skipPlain();
  }
  if (lv === 3) { session.bad = pick(ask); session.badV = pick(steps[session.bad].bad); }
  view = { name: 'niv' };
  render();
  $('#main').scrollTop = 0;
}
function skipPlain() { const s = session; while (s.i < s.steps.length && !s.ask.has(s.i)) s.i++; }

VIEWS.niv = () => {
  const s = session;
  if (!s || s.type !== 'niv') return VIEWS.train();
  const { t, p, steps, lv } = s, done = s.end;
  let body = '';
  const li = (x) => `<li>${Niv.step(x)}</li>`;
  if (lv === 1) {
    body = `${s.i ? `<ol class="steps">${steps.slice(0, s.i).map(li).join('')}</ol>` : ''}
      ${s.i < steps.length ? `<div class="row tdq-act"><button class="btn primary" data-act="nivNext"><span class="ico" data-i="eye"></span>${s.i ? `Étape suivante (${s.i} / ${steps.length})` : 'Commencer'}</button><button class="btn ghost" data-act="nivAll">Tout afficher</button></div>` : ''}`;
  } else if (lv === 2) {
    const x = steps[s.i];
    const ans = !x ? '' : s.fb ? `<div class="nv-fb ${s.fb.ok ? 'ok' : 'ko'}"><div>${s.fb.ok ? 'Juste.' : `Faux, la réponse était ${esc(x.v)}.`}</div>${Niv.step(x)}</div><button class="btn primary" data-act="nivCont" id="nvGo">Continuer</button>`
      : x.opt ? `<div class="seg">${x.opt.map((o) => `<button data-act="nivOpt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`
        : `<div class="row"><input class="nv-in" id="nvIn" placeholder="Ta réponse" autocomplete="off" spellcheck="false"><button class="btn primary" data-act="nivCheck">Vérifier</button>${s.hint ? '' : '<button class="btn ghost" data-act="nivHint">Indice</button>'}</div>${s.hint ? `<div class="td-hint"><span class="ico" data-i="bulb"></span><div>${Td.txt(x.why)}</div></div>` : ''}`;
    body = `<ol class="steps">${steps.slice(0, s.i).map(li).join('')}</ol>${x && !done ? `<div class="nv-ask"><div class="nv-q">${Td.txt(x.ask)}</div>${ans}</div>` : ''}`;
  } else {
    body = `${done ? '' : '<p class="muted" style="margin-bottom:0.75rem">Une seule de ces étapes est fausse. Touche-la.</p>'}<ol class="steps nv-find">${steps.map((x, i) => `<li class="${done ? (i === s.bad ? 'ko' : '') : 'pick'} ${s.tried && s.tried.includes(i) ? 'tried' : ''}" ${done ? '' : `data-act="nivPick" data-i="${i}"`}>${Niv.step(x, i === s.bad ? s.badV : undefined, { why: false, block: i !== s.bad })}${done && i === s.bad ? `<div class="nv-fb ok"><div>L’étape juste :</div>${Niv.step(x)}</div>` : ''}</li>`).join('')}</ol>`;
  }
  const end = done ? `<div class="panel td-mark"><div>${done === 'ok' ? 'Niveau validé.' : done === 'seen' ? 'Exemple terminé.' : 'Pas encore : refais-en un avec d’autres nombres.'}${lv === 2 ? ` ${s.ok} juste${s.ok > 1 ? 's' : ''}, ${s.ko} erreur${s.ko > 1 ? 's' : ''}.` : ''}</div><div class="row">
      <button class="btn" data-act="nivAgain"><span class="ico" data-i="rotate"></span>${lv === 1 ? 'Un autre exemple' : 'Recommencer'}</button>
      ${done !== 'ko' ? `<button class="btn primary" data-act="nivGo" data-id="${t.id}" data-lv="${lv + 1}">${NIV[lv][0]}<span class="ico" data-i="arrowR"></span></button>` : ''}</div></div>` : '';
  return `<div class="page tdx"><div class="session" style="max-width:53.75rem">
    <div class="sess-top"><button class="btn ghost sm" data-act="tuto" data-id="${t.id}"><span class="ico" data-i="arrowL"></span>Niveaux</button><div class="bar"><i style="width:${(Math.min(s.i, steps.length) / steps.length) * 100}%"></i></div><span class="chip acc">${lv}. ${NIV[lv - 1][0]}</span></div>
    ${lv === 1 && t.gen.length ? `<div class="seg nv-d">${['Facile', 'Normal', 'Piège'].map((n, i) => `<button class="${s.d === i ? 'on' : ''}" data-act="nivD" data-d="${i}">${n}</button>`).join('')}</div>` : ''}
    <section class="panel tdq nv-en"><div class="h-eyebrow">${esc(t.titre)}</div><div class="tr-prompt">${p.prompt}</div></section>
    <section class="panel tdq nv-body">${body}</section>
    ${end}
    ${flouBtn(`Calcul « ${t.titre} », niveau ${NIV[lv - 1][0]}`)}
  </div></div>`;
};
VIEWS_AFTER.niv = () => {
  const s = session;
  if (!s) return;
  const el = document.getElementById('nvIn') || document.getElementById('nvGo');
  if (el && !('ontouchstart' in window)) el.focus({ preventScroll: true });
  const a = document.querySelector('.nv-ask') || document.querySelector('.nv-body .tdq-act');
  if (a && s.i && !s.end && s.lv < 3) setTimeout(() => a.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
};

function nivAnswer(v) {
  const s = session, x = s.steps[s.i];
  if (s.fb || !String(v || '').trim()) return;
  const ok = Niv.same(x, v);
  if (ok) s.ok++; else s.ko++;
  s.fb = { ok }; Sound.play(ok ? 'ok' : 'ko');
  if (!ok) Rev.fail('t:' + s.t.id);
  Store.bump('qcm');
  keepScroll();
}
const keepFields = () => document.querySelectorAll('.field input').forEach((i) => { session.answers[i.dataset.k] = i.value; });

Object.assign(ACTIONS, {
  trainer: (el) => { session = null; go('tuto', { id: el.dataset.id }); },
  trainerGo: (el) => { session = null; newProblem(el.dataset.id); $('#main').scrollTop = 0; },
  tuto: (el) => {
    if (session && session.type === 'trainer') { if (!session.checked) keepFields(); } else session = null;
    go('tuto', { id: el.dataset.id });
  },
  tutoBack: () => { view = { name: 'trainer' }; render(); $('#main').scrollTop = 0; },
  trMethod: () => { keepFields(); session.method = !session.method; keepScroll(); },
  trHint: () => { keepFields(); session.hints = (session.hints || 0) + 1; keepScroll(); },
  trSol: () => { session.sol = true; keepScroll(); },
  nivGo: (el) => startNiv(el.dataset.id, Number(el.dataset.lv)),
  nivD: (el) => startNiv(session.t.id, 1, Number(el.dataset.d)),
  nivAgain: () => { const s = session; startNiv(s.t.id, s.lv, s.d === undefined ? undefined : s.lv === 1 ? Math.min(2, s.d + 1) : s.d); },
  nivNext: () => { const s = session; s.i++; if (s.i >= s.steps.length) { s.end = 'seen'; Niv.pass(s.t.id, 1); } keepScroll(); },
  nivAll: () => { const s = session; s.i = s.steps.length; s.end = 'seen'; Niv.pass(s.t.id, 1); keepScroll(); },
  nivOpt: (el) => nivAnswer(el.dataset.o),
  nivCheck: () => nivAnswer($('#nvIn').value),
  nivHint: () => { const v = $('#nvIn').value; session.hint = true; keepScroll(); $('#nvIn').value = v; },
  nivCont: () => {
    const s = session;
    s.fb = null; s.hint = false; s.i++; skipPlain();
    if (s.i >= s.steps.length) { s.end = s.ko <= Math.ceil(s.ask.size / 5) ? 'ok' : 'ko'; if (s.end === 'ok') Niv.pass(s.t.id, 2); }
    keepScroll();
  },
  nivPick: (el) => {
    const s = session, i = Number(el.dataset.i);
    if (s.end) return;
    if (i === s.bad) { s.end = s.ko < 2 ? 'ok' : 'ko'; Sound.play('ok'); if (s.end === 'ok') Niv.pass(s.t.id, 3); Store.bump('qcm'); }
    else { s.ko++; s.tried = [...(s.tried || []), i]; Sound.play('ko'); toast('Cette étape est juste, cherche encore'); }
    keepScroll();
  }
});
document.addEventListener('keydown', (e) => {
  if (view.name !== 'niv' || !session || e.key !== 'Enter' || session.lv !== 2) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (session.fb) ACTIONS.nivCont(); else if ($('#nvIn')) ACTIONS.nivCheck();
}, true);
