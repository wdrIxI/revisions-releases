// Ateliers : choisir la méthode, modéliser, reconstruire une démonstration
VIEWS.ateliers = () => {
  const card = (id, t, d, ok) => `<button class="panel td-card ${ok ? 'ok' : ''}" data-act="atlGo" data-id="${id}"><span class="td-n">${icon(ok ? 'check' : id[0] === 'm' ? 'calc' : id[0] === 'd' ? 'layers' : 'target')}</span><span class="td-ct"><span class="t">${esc(t)}</span><span class="d">${d}</span></span><span class="ico td-go" data-i="arrowR"></span></button>`;
  const sec = (t, sub, list) => (list ? `<div class="td-theme"><h2>${t}</h2><span class="muted">${sub}</span></div><div class="td-grid">${list}</div>` : '');
  const ch = (id) => { const c = chapters.find((x) => x.id === id); return c ? esc(c.titre) : ''; };
  const list = (k, l) => (l || []).map((x, i) => card(`${k}:${i}`, x.titre, ch(x.ch), atlDone(`${k}:${i}`))).join('');
  return `<div class="page td-page">
    <div class="head-row"><div><div class="h-eyebrow">Apprendre en faisant</div><h1>Ateliers</h1><p class="sub">Choisir la bonne méthode, construire un modèle, reconstruire une démonstration, manipuler une simulation.</p></div></div>
    ${sec((course.atl || {}).k || 'Quelle méthode ?', course.atl ? 'choisir et justifier' : 'reconnaître la technique avant de calculer', course.methodes ? card('k:0', 'Dix situations', course.atl ? 'Pour chaque demande, choisis la représentation' : 'Pour chaque énoncé, choisis la technique', atlDone('k:0')) : '')}
    ${sec('Quiz', 'à savoir sans réfléchir', (course.quiz || []).map((x, i) => card(`q:${i}`, x.titre, x.sub, atlDone(`q:${i}`))).join(''))}
    ${sec('Simulations', 'à manipuler', SIMUS.filter((x) => x.c === course.id).map((x) => `<button class="panel td-card" data-act="simuGo" data-id="${x.id}"><span class="td-n">${icon('play')}</span><span class="td-ct"><span class="t">${x.t}</span><span class="d">${x.d}</span></span><span class="ico td-go" data-i="arrowR"></span></button>`).join(''))}
    ${course.atl ? course.atl.m.map(([t, sub, f]) => sec(t, sub, (course.modeles || []).map((x, i) => (x.sec === f ? card(`m:${i}`, x.titre, ch(x.ch), atlDone(`m:${i}`)) : '')).join(''))).join('') : sec(course.id === 'reseaux' ? 'Trouver le bug' : 'Modélisation', course.id === 'reseaux' ? 'du code C de sockets' : 'du texte au programme', list('m', course.modeles))}
    ${sec(course.id === 'reseaux' ? 'Code C des sockets' : (course.atl || {}).d || 'Démonstrations', 'remettre dans l’ordre, puis compléter', list('d', course.preuves))}
  </div>`;
};

// e : liste d'étapes à choix [question, bonne, pièges..., explication]
const atlAsk = (a) => { const o = shuffle(a.slice(1, -1)); return { q: a[0], o, k: o.indexOf(a[1]), e: a[a.length - 1] }; };
function startAtl(id) {
  const [k, i] = id.split(':'), x = k === 'm' ? course.modeles[i] : k === 'd' ? course.preuves[i] : k === 'q' ? { titre: course.quiz[i].titre, ch: '' } : { titre: (course.atl || {}).k || 'Quelle méthode ?', ch: '' };
  session = { type: 'atl', id, k, x, i: 0, ko: 0, pick: null, miss: [], answers: {} };
  if (k === 'd') { session.order = shuffle(x.l.map((_, n) => n)); session.put = []; session.asks = x.t.map(atlAsk); } else session.asks = (k === 'm' ? x.e : shuffle(k === 'q' ? course.quiz[i].l : course.methodes).slice(0, 10)).map(atlAsk);
  view = { name: 'atl' };
  render(); $('#main').scrollTop = 0;
}
function atlEnd() {
  const s = session, ok = s.ko <= ('kq'.includes(s.k) ? 2 : 1);
  s.end = ok ? 'ok' : 'ko';
  if (ok && !atlDone(s.id)) { Store.data.atl[`${course.id}:${s.id}`] = 1; Game.award(15, 'Atelier réussi'); confetti(90); }
  Store.bump('qcm'); Store.save();
}

VIEWS.atl = () => {
  const s = session;
  if (!s || s.type !== 'atl') return VIEWS.ateliers();
  const { x, k } = s, ordering = k === 'd' && s.put.length < x.l.length, a = !ordering && s.asks[s.i];
  const done = s.asks.slice(0, s.i).map((q) => `<li><p class="muted">${Td.txt(q.q)}</p><p>${Td.txt(q.o[q.k])}</p><p class="nv-why">${Td.txt(q.e)}</p></li>`).join('');
  const total = s.asks.length + (k === 'd' ? x.l.length : 0), at = s.i + (k === 'd' ? s.put.length : 0);
  return `<div class="page tdx"><div class="session" style="max-width:53.75rem">
    <div class="sess-top"><button class="btn ghost sm" data-act="go" data-v="ateliers"><span class="ico" data-i="arrowL"></span>Ateliers</button><div class="bar"><i style="width:${(at / total) * 100}%"></i></div><div class="sess-count">${s.ko ? plural(s.ko, 'erreur') : ''}</div></div>
    ${x.texte || x.enonce ? `<section class="panel tdq"><div class="tdx-st"><h3>${esc(x.titre)}</h3></div><p>${Td.txt(x.texte || x.enonce)}</p>${x.code ? Td.block({ t: 'pl', l: x.code }) : ''}${x.fig ? Td.block({ t: 'fig', s: x.fig }) : ''}</section>` : `<h2 class="mx-h">${esc(x.titre)}</h2>`}
    ${k === 'd' && s.put.length ? `<section class="panel tdq"><ol class="steps">${s.put.map((n) => `<li><p>${Td.txt(x.l[n])}</p></li>`).join('')}</ol></section>` : ''}
    ${ordering ? `<section class="panel tdq"><p class="muted" style="margin-bottom:0.625rem">${s.put.length ? 'Quelle ligne vient ensuite ?' : 'Par quelle ligne faut-il commencer ?'}</p><div class="choices">${s.order.filter((n) => !s.put.includes(n)).map((n) => `<button class="choice ${s.miss.includes(n) ? 'ko' : ''}" data-act="atlPut" data-n="${n}"><span>${Td.txt(x.l[n])}</span></button>`).join('')}</div></section>` : ''}
    ${done && k === 'm' ? `<section class="panel tdq"><ol class="steps">${done}</ol></section>` : ''}
    ${a && !s.end ? `<section class="panel tdq"><div class="nv-q">${Td.txt(a.q)}</div><div class="choices">${a.o.map((t, n) => `<button class="choice ${s.pick === null ? '' : n === a.k ? 'ok' : n === s.pick ? 'ko' : 'off'}" data-act="atlPick" data-n="${n}" ${s.pick === null ? '' : 'disabled'}><span>${Td.txt(t)}</span></button>`).join('')}</div>
      ${s.pick === null ? '' : `<div class="nv-fb ${s.pick === a.k ? 'ok' : 'ko'}"><div>${s.pick === a.k ? 'Juste.' : 'Pas tout à fait.'}</div><p>${Td.txt(a.e)}</p></div><div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="atlNext" autofocus>Continuer</button></div>`}</section>` : ''}
    ${s.end ? `${x.fin ? `<section class="panel tdq"><div class="tdx-st"><h3>${typeof x.fin === 'string' ? 'Le diagramme corrigé' : 'Le modèle complet'}</h3></div>${typeof x.fin === 'string' ? Td.block({ t: 'fig', s: x.fin }) : Td.block({ t: 'pl', l: x.fin })}</section>` : ''}<div class="panel td-mark"><div>${s.end === 'ok' ? 'Réussi.' : 'Encore un essai : il y a eu plusieurs erreurs.'} ${s.ko ? plural(s.ko, 'erreur') + '.' : 'Aucune erreur.'}</div><div class="row"><button class="btn" data-act="atlGo" data-id="${s.id}"><span class="ico" data-i="rotate"></span>Recommencer</button><button class="btn primary" data-act="go" data-v="ateliers">Autres ateliers</button></div></div>` : ''}
    ${flouBtn(`Atelier « ${x.titre} »`)}
  </div></div>`;
};
VIEWS_AFTER.atl = () => { const s = session; if (s && (s.i || s.pick !== null || (s.put && s.put.length))) { const l = [...document.querySelectorAll('.session > *')].slice(-2)[0]; if (l) setTimeout(() => l.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30); } };

Object.assign(ACTIONS, {
  atlGo: (el) => startAtl(el.dataset.id),
  atlPut: (el) => {
    const s = session, n = Number(el.dataset.n);
    if (n === s.put.length) { s.put.push(n); s.miss = []; Sound.play('ok'); } else if (!s.miss.includes(n)) { s.miss.push(n); if (s.miss.length === 1) s.ko += 0.5; Sound.play('ko'); toast('Une autre ligne vient avant'); }
    s.ko = Math.round(s.ko * 2) / 2;
    keepScroll();
  },
  atlPick: (el) => { const s = session; if (s.pick !== null) return; s.pick = Number(el.dataset.n); const ok = s.pick === s.asks[s.i].k; if (!ok) s.ko++; Sound.play(ok ? 'ok' : 'ko'); keepScroll(); },
  atlNext: () => { const s = session; s.pick = null; s.i++; if (s.i >= s.asks.length) atlEnd(); keepScroll(); }
});
document.addEventListener('keydown', (e) => {
  if (view.name !== 'atl' || !session || e.ctrlKey || e.metaKey) return;
  const s = session, a = s.asks && s.asks[s.i];
  if (e.key === 'Enter' && s.pick !== null) { e.preventDefault(); ACTIONS.atlNext(); } else if (a && s.pick === null && !s.end && !(s.put && s.put.length < s.x.l.length) && Number(e.key) >= 1 && Number(e.key) <= a.o.length) ACTIONS.atlPick({ dataset: { n: Number(e.key) - 1 } });
});
