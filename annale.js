// Annale en conditions réelles : sujet et chrono, puis correction notée par question.
// L'état est gardé sur l'appareil : on peut fermer l'app pendant l'épreuve.
const Annale = {
  get(id) { return (course.annales || []).find((a) => a.id === id); },
  all() { try { return JSON.parse(localStorage.getItem('revAnnale')) || {}; } catch (e) { return {}; } },
  st(id) { return this.all()[id] || null; },
  set(id, v) { const d = this.all(); if (v) d[id] = v; else delete d[id]; try { localStorage.setItem('revAnnale', JSON.stringify(d)); } catch (e) { /* stockage indisponible */ } },
  left(a, s) { return s.start + a.minutes * 60000 - Date.now(); },
  time(ms) { const t = Math.max(0, Math.ceil(ms / 1000)), p = (x) => String(x).padStart(2, '0'); return `${Math.floor(t / 3600)} h ${p(Math.floor(t / 60) % 60)} min ${p(t % 60)}`; },
  total(a) { return (a.qcmPts || 0) + a.ex.flatMap((e) => e.pts).reduce((x, y) => x + y, 0); },
  // Questions de cours : points par bonne réponse, retrait à partir de la 4e erreur, jamais sous 0
  qcm(a) { return a.qcm ? allQcm.filter((q) => q.annale === a.qcm).sort((x, y) => x.num - y.num) : []; },
  qScore(a, s) {
    const l = this.qcm(a), v = l.length ? a.qcmPts / l.length : 0, ans = s.qa || {};
    const ok = l.filter((q, i) => ans[i] === q.a).length, ko = l.filter((q, i) => ans[i] !== undefined && ans[i] !== q.a).length;
    return { ok, ko, n: l.length, pts: Math.max(0, v * (ok - Math.max(0, ko - 3))) };
  },
  score(a, s) { return (a.qcm ? this.qScore(a, s).pts : 0) + a.ex.reduce((t, e) => t + e.pts.reduce((x, p, i) => x + p * ((s.g && s.g[`${e.e ? e.e.n : e.n}-${i}`]) || 0), 0), 0); },
  f: (x) => String(Math.round(x * 100) / 100).replace('.', ','),
  dur(a) { const h = Math.floor(a.minutes / 60), m = a.minutes % 60; return m ? `${h} h ${m}` : `${h} heure${h > 1 ? 's' : ''}`; },
  end(id) { const s = this.st(id); if (s && !s.end) this.set(id, { ...s, end: Date.now() }); },
  cards() {
    return (course.annales || []).map((a) => {
      const s = this.st(a.id);
      return `<div class="panel picker annale-card"><h3>${esc(a.titre)}</h3><p class="sub" style="margin:0.5rem 0 1rem">${a.qcm ? 'Questions de cours et ' : ''}${a.ex.length} exercices sur ${this.f(this.total(a))} points, en ${this.dur(a)}, ${a.type ? 'sujet type' : a.ind ? 'barème indicatif' : 'avec le vrai barème'}. Tu composes sur papier, puis tu notes ta copie avec la correction.</p>
        <button class="btn primary lg" data-act="annaleGo" data-id="${a.id}"><span class="ico" data-i="play"></span>${s ? (s.end ? 'Voir ma copie' : 'Reprendre l’épreuve') : 'Voir le sujet'}</button></div>`;
    }).join('');
  }
};

VIEWS.annale = () => {
  const a = Annale.get(view.id);
  if (!a) return VIEWS.examSetup();
  let s = Annale.st(a.id);
  if (s && !s.end && Annale.left(a, s) <= 0) { Annale.end(a.id); s = Annale.st(a.id); }
  const done = s && s.end;
  if (!s) {
    return `<div class="page"><div class="session" style="max-width:51.25rem">
      <div class="sess-top"><button class="btn ghost sm" data-act="go" data-v="examSetup"><span class="ico" data-i="arrowL"></span>Examens</button></div>
      <div class="panel tdq"><div class="h-eyebrow">${esc(course.titre)}</div><h1 style="margin-bottom:0.875rem">${esc(a.titre)}</h1><p>Durée : ${Annale.dur(a)}. Total : ${Annale.f(Annale.total(a))} points.</p>
      <ul class="f-points" style="margin:0.875rem 0 1.25rem">${a.consignes.map((x) => `<li>${esc(x)}</li>`).join('')}<li>Le chrono continue même si tu fermes l’app.</li></ul>
      <button class="btn primary lg" data-act="annaleStart" data-id="${a.id}"><span class="ico" data-i="play"></span>Commencer</button></div></div></div>`;
  }
  const score = Annale.score(a, s), tot = Annale.total(a);
  return `<div class="page tdx"><div class="session" style="max-width:940px">
    <div class="sess-top mx-top"><button class="btn ghost sm" data-act="go" data-v="examSetup"><span class="ico" data-i="arrowL"></span>Examens</button><div style="flex:1"></div>${done ? `<span class="mx-n">${Annale.f(score)} / ${Annale.f(tot)}</span>` : `<span class="chip acc"><span class="ico" data-i="timer"></span><span id="anT">${Annale.time(Annale.left(a, s))}</span></span><button class="btn sm" data-act="annaleEnd" data-id="${a.id}">J’ai fini</button>`}</div>
    ${done ? `<div class="panel wk"><div>Soit ${Annale.f((score * 20) / tot)} / 20. Note chaque exercice en comparant ta copie à la correction.</div><div class="row">${s.saved ? '<span class="chip good">Note enregistrée</span>' : `<button class="btn primary" data-act="annaleSave" data-id="${a.id}">Enregistrer ma note</button>`}<button class="btn ghost" data-act="annaleReset" data-id="${a.id}">Repasser</button></div></div>` : ''}
    ${a.pdf && Td.canSubject({ pdf: a.pdf }) ? `<button class="btn sm ghost" data-act="annalePdf" data-id="${a.id}"><span class="ico" data-i="file"></span>Voir le sujet original</button>` : ''}
    ${a.qcm ? `<h2 class="mx-h">Questions de cours (${Annale.f(a.qcmPts)} points)</h2>${done ? (() => { const z = Annale.qScore(a, s); return `<div class="panel wk"><div>${z.ok} justes, ${z.ko} fausses, ${z.n - z.ok - z.ko} sans réponse : ${Annale.f(z.pts)} / ${Annale.f(a.qcmPts)}</div></div>`; })() : ''}
      ${Annale.qcm(a).map((q, i) => { const g = (s.qa || {})[i]; return `<div class="panel q-card mx-q"><div class="q-text">${i + 1}. ${esc(q.q)}</div><div class="choices">${q.c.map((t, k) => `<button class="choice ${done ? (k === q.a ? 'ok' : k === g ? 'ko' : 'off') : g === k ? 'sel' : ''}" data-act="annaleQ" data-id="${a.id}" data-i="${i}" data-k="${k}" ${done ? 'disabled' : ''}><span class="key">${'ABCD'[k]}</span>${esc(t)}</button>`).join('')}</div>${done && g !== q.a ? `<div class="explain"><div>${esc(q.e)}${g !== undefined && q.faux && q.faux[q.c[g]] ? `<div class="muted" style="margin-top:0.375rem">Ta réponse : ${esc(q.faux[q.c[g]])}</div>` : ''}</div></div>` : ''}</div>`; }).join('')}` : ''}
    ${a.ex.map((x) => {
    const e = x.e || Td.get(x.n), id = x.e ? x.e.n : x.n;
    return `<h2 class="mx-h">${Td.txt(e.titre)} (${Annale.f(x.pts.reduce((p, q) => p + q, 0))} points)</h2><div class="panel tdq">${e.intro.map((b) => Td.block(b)).join('')}</div>
      ${e.q.map((q, i) => { const k = `${id}-${i}`, g = s.g && s.g[k]; return `<section class="panel tdq an-q"><div class="tdq-t">${q.k ? `<span class="tdq-k">${esc(q.k)}</span>` : ''}<div style="flex:1">${Td.txt(q.t)}</div><span class="muted an-p">${Annale.f(x.pts[i])} pt${x.pts[i] > 1 ? 's' : ''}</span></div>
        ${done ? `<ol class="steps">${q.s.map((b) => `<li>${Td.block(b)}</li>`).join('')}</ol>${q.r ? `<div class="td-res"><span class="ico" data-i="check"></span><div>${Td.txt(q.r)}</div></div>` : ''}
        <div class="row"><span class="muted">Ta note</span><div class="seg">${[[0, '0'], [0.5, Annale.f(x.pts[i] / 2)], [1, Annale.f(x.pts[i])]].map(([v, l]) => `<button class="${g === v ? 'on' : ''}" data-act="annaleNote" data-id="${a.id}" data-k2="${k}" data-g="${v}">${l}</button>`).join('')}</div></div>` : ''}</section>`; }).join('')}`;
  }).join('')}
    ${done ? '' : `<div class="row" style="justify-content:center;margin:1.25rem 0"><button class="btn primary lg" data-act="annaleEnd" data-id="${a.id}">J’ai fini</button></div>`}
  </div></div>`;
};
setInterval(() => {
  const el = document.getElementById('anT');
  if (!el || view.name !== 'annale') return;
  const a = Annale.get(view.id), s = a && Annale.st(a.id);
  if (!s) return;
  if (Annale.left(a, s) <= 0) render(); else el.textContent = Annale.time(Annale.left(a, s));
}, 1000);

let anSure = '';
// Deux appuis pour les actions sans retour
const anConfirm = (key, msg) => { if (anSure === key) { anSure = ''; return true; } anSure = key; toast(msg); setTimeout(() => { anSure = ''; }, 3000); return false; };
Object.assign(ACTIONS, {
  annaleGo: (el) => go('annale', { id: el.dataset.id }),
  annaleStart: (el) => { Annale.set(el.dataset.id, { start: Date.now() }); render(); $('#main').scrollTop = 0; },
  annaleEnd: (el) => { if (!anConfirm('end', 'Reclique pour rendre la copie')) return; Annale.end(el.dataset.id); render(); $('#main').scrollTop = 0; },
  annaleQ: (el) => { const s = Annale.st(el.dataset.id), qa = { ...(s.qa || {}) }, i = el.dataset.i, k = Number(el.dataset.k); if (s.end) return; if (qa[i] === k) delete qa[i]; else qa[i] = k; Annale.set(el.dataset.id, { ...s, qa }); keepScroll(); },
  annalePdf: (el) => go('tdPdf', { file: Annale.get(el.dataset.id).pdf, page: 1, back: el.dataset.id }),
  annaleNote: (el) => { const s = Annale.st(el.dataset.id); if (s.saved) return; Annale.set(el.dataset.id, { ...s, g: { ...(s.g || {}), [el.dataset.k2]: Number(el.dataset.g) } }); keepScroll(); },
  annaleSave: (el) => {
    const a = Annale.get(el.dataset.id), s = Annale.st(a.id);
    Annale.set(a.id, { ...s, saved: true });
    Store.data.exams.push({ course: course.id, annale: a.id, date: Date.now(), score: Math.round(Annale.score(a, s) * 100) / 100, total: Annale.total(a), duree: s.end - s.start });
    Game.event('exam', Annale.score(a, s), Annale.total(a)); Store.save(); keepScroll();
  },
  annaleReset: (el) => { if (!anConfirm('reset', 'Reclique pour effacer cette copie et repasser l’épreuve')) return; Annale.set(el.dataset.id, null); render(); $('#main').scrollTop = 0; }
});
