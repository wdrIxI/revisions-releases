// TD corrigés : liste par thème, puis un exercice par écran (énoncé d'un côté, questions de l'autre)
const Td = {
  ui: {},   // état d'affichage de la session : cours:n -> repère -> { hint, steps, draft }
  list() { return course.td.exercices.map((e) => (e.q ? e : { ...e, intro: [e.enonce], q: [{ k: '', t: '', i: e.indice, s: e.correction, r: '' }] })); },
  // Ordre d'affichage : thèmes dans l'ordre d'apparition
  order() { const l = this.list(); return [...new Set(l.map((e) => e.theme))].flatMap((t) => l.filter((e) => e.theme === t)); },
  get(n) { return this.list().find((e) => String(e.n) === String(n)); },
  st(e) { return Store.data.td[tk(e.n)]; },
  q(n, k) { const o = (this.ui[tk(n)] = this.ui[tk(n)] || {}); return (o[k] = o[k] || { hint: false, steps: 0 }); },
  drafts() { try { return JSON.parse(localStorage.getItem('revTd')) || {}; } catch (e) { return {}; } },
  saveDraft(key, v) { const d = this.drafts(); if (v.trim()) d[key] = v; else delete d[key]; try { localStorage.setItem('revTd', JSON.stringify(d)); } catch (e) { /* stockage indisponible */ } },

  // Texte : `code`, _indice, ^exposant
  sub: (s) => s.replace(/([_^])(?:\{((?:[^{}]|\{[^{}]*\})+)\}|([\p{L}\p{N}*#]))/gu, (_m, t, a, b) => { const g = t === '_' ? 'sub' : 'sup'; return `<${g}>${a ? Td.sub(a) : b}</${g}>`; }),
  txt(s) { return String(s).split('`').map((p, i) => (i % 2 ? `<code>${esc(p)}</code>` : this.sub(esc(p)))).join(''); },
  block(b) {
    if (typeof b === 'string') return `<p>${this.txt(b)}</p>`;
    if (b.t === 'fig') return `<figure class="td-fig">${b.s}${b.c ? `<figcaption>${this.txt(b.c)}</figcaption>` : ''}</figure>`;
    if (b.t === 'pl') return `<div class="td-pl">${b.l.map((l) => `<div>${this.txt(l) || ' '}</div>`).join('')}</div>`;
    if (b.t === 'tab') return `${b.c ? `<div class="td-cap">${this.txt(b.c)}</div>` : ''}<div class="td-tab"><table><thead><tr>${b.h.map((x) => `<th>${this.txt(x)}</th>`).join('')}</tr></thead><tbody>${b.r.map((r) => `<tr>${r.map((x) => `<td>${this.txt(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return '';
  },
  plain(b) { return typeof b === 'string' ? b : b.t === 'tab' ? [b.h, ...b.r].flat().join(' ') : (b.l || []).join(' '); },

  question(e, q, drafts) {
    const u = this.q(e.n, q.k), done = u.steps >= q.s.length, key = `${tk(e.n)}:${q.k}`, a = `data-n="${e.n}" data-k="${esc(q.k)}"`;
    const showDraft = u.draft || drafts[key];
    // Les étapes sont numérotées ; un tableau, un calcul ou une figure complète l'étape qui précède
    const steps = [];
    q.s.slice(0, u.steps).forEach((b) => { if (typeof b === 'string' || !steps.length) steps.push([b]); else steps[steps.length - 1].push(b); });
    const sg = done ? siglesHtml([this.plain(q.t), q.r, ...q.s.map((b) => this.plain(b))], 6) : '';
    return `<section class="panel tdq ${done ? 'done' : ''}">
      ${q.t || q.k ? `<div class="tdq-t">${q.k ? `<span class="tdq-k">${esc(q.k)}</span>` : ''}<div>${this.txt(q.t)}</div></div>` : ''}
      ${showDraft ? `<textarea class="tdq-draft" data-draft="${esc(key)}" rows="3" placeholder="Ton brouillon (gardé sur cet appareil)" spellcheck="false">${esc(drafts[key] || '')}</textarea>` : ''}
      ${u.hint && q.i ? `<div class="td-hint"><span class="ico" data-i="bulb"></span><div>${this.txt(q.i)}</div></div>` : ''}
      ${steps.length ? `<ol class="steps">${steps.map((s) => `<li>${s.map((b) => this.block(b)).join('')}</li>`).join('')}</ol>` : ''}
      ${done && q.r ? `<div class="td-res"><span class="ico" data-i="check"></span><div>${this.txt(q.r)}</div></div>` : ''}
      ${sg ? `<div class="td-sig">${sg}</div>` : ''}
      ${done ? gridHtml(key, q.s) : ''}
      <div class="row tdq-act">
        ${done ? `<button class="btn sm ghost" data-act="tdHide" ${a}><span class="ico" data-i="rotate"></span>Cacher la correction</button>` : `
        <button class="btn sm primary" data-act="tdStep" ${a}><span class="ico" data-i="eye"></span>${u.steps ? 'Étape suivante' : 'Voir la correction'}</button>
        ${q.s.length > 1 ? `<button class="btn sm ghost" data-act="tdAll" ${a}>Tout afficher</button>` : ''}`}
        ${q.i && !u.hint && !done ? `<button class="btn sm" data-act="tdHint" ${a}><span class="ico" data-i="bulb"></span>Indice</button>` : ''}
        ${showDraft ? '' : `<button class="btn sm ghost" data-act="tdDraft" ${a}><span class="ico" data-i="pencil"></span>Brouillon</button>`}
        ${Ink.btn('td:' + key)}
        ${done ? flouBtn(`TD ${e.n} (${e.titre})${q.k ? `, question ${q.k}` : ''}`) : ''}
      </div>
      ${Ink.pad('td:' + key)}
    </section>`;
  },
  file(e) { return e.pdf || course.td.pdf; },
  canSubject(e) { return window.api.platform !== 'web' || !!((course.td.pages || {})[this.file(e).replace('.pdf', '')]); },
  // Avance d'une étape : une phrase et le tableau ou calcul qui la suit
  step(q, u) { u.steps++; while (u.steps < q.s.length && typeof q.s[u.steps] !== 'string') u.steps++; }
};

VIEWS.td = () => {
  const all = Td.order(), f = view.filter || 'tous';
  const by = { tous: all, faire: all.filter((e) => !Td.st(e)), revoir: all.filter((e) => Td.st(e) === 'revoir'), ok: all.filter((e) => Td.st(e) === 'ok') };
  const list = by[f] || all, next = by.faire[0] || by.revoir[0];
  const tabs = [['tous', 'Tous'], ['faire', 'À faire'], ['revoir', 'À revoir'], ['ok', 'Réussis']];
  return `<div class="page td-page">
    <div class="head-row"><div><div class="h-eyebrow">Travaux dirigés</div><h1>TD corrigés</h1><p class="sub">Cherche d’abord seul, demande un indice, puis ouvre la correction étape par étape.</p></div>
      ${next ? `<button class="btn primary lg" data-act="tdOpen" data-n="${next.n}"><span class="ico" data-i="play"></span>${by.ok.length || by.revoir.length ? 'Continuer' : 'Commencer'} : exercice ${next.n}</button>` : ''}</div>
    <div class="td-prog"><div class="td-prog-bar"><i class="ok" style="width:${(by.ok.length / all.length) * 100}%"></i><i class="re" style="width:${(by.revoir.length / all.length) * 100}%"></i></div><span>${by.ok.length} / ${all.length} réussis</span></div>
    <div class="td-filters">${tabs.map(([k, l]) => `<button class="chip ${f === k ? 'acc' : ''}" data-act="tdFilter" data-f="${k}">${l} (${by[k].length})</button>`).join('')}</div>
    ${list.length ? [...new Set(list.map((e) => e.theme))].map((t) => {
      const l = list.filter((e) => e.theme === t);
      return `<div class="td-theme"><h2>${esc(t)}</h2><span class="muted">${l.filter((e) => Td.st(e) === 'ok').length} / ${l.length}</span></div>
      <div class="td-grid">${l.map((e) => {
        const s = Td.st(e);
        return `<button class="panel td-card ${s || ''}" data-act="tdOpen" data-n="${e.n}"><span class="td-n">${s === 'ok' ? '<span class="ico" data-i="check"></span>' : e.n}</span><span class="td-ct"><span class="t">${Td.txt(e.titre)}</span><span class="d">${e.q.length > 1 ? `${e.q.length} questions` : '1 question'}${e.pts ? ` · ${esc(e.pts)}` : ''}${s === 'revoir' ? ' · à revoir' : ''}</span></span><span class="ico td-go" data-i="arrowR"></span></button>`;
      }).join('')}</div>`;
    }).join('') : '<div class="empty">Aucun exercice ici pour l’instant.</div>'}
  </div>`;
};

VIEWS.tdEx = () => {
  const e = Td.get(view.n);
  if (!e) return VIEWS.td();
  const ord = Td.order(), i = ord.findIndex((x) => x.n === e.n), prev = ord[i - 1], next = ord[i + 1], s = Td.st(e), drafts = Td.drafts();
  const nav = (x, ico, label) => `<button class="btn sm ghost" ${x ? `data-act="tdOpen" data-n="${x.n}"` : 'disabled'} title="${label}" aria-label="${label}"><span class="ico" data-i="${ico}"></span></button>`;
  return `<div class="page wide tdx">
    <div class="tdx-top"><button class="btn ghost sm" data-act="go" data-v="td"><span class="ico" data-i="layers"></span>Tous les TD</button><span class="muted">${i + 1} / ${ord.length}</span><div class="tdx-nav">${nav(prev, 'arrowL', 'Exercice précédent')}${nav(next, 'arrowR', 'Exercice suivant')}</div></div>
    <div class="tdx-head"><div class="h-eyebrow">${esc(e.theme)} · exercice ${e.n}${e.pts ? ` · ${esc(e.pts)}` : ''}</div><h1>${Td.txt(e.titre)}</h1>${e.obj ? `<p class="sub">${Td.txt(e.obj)}</p>` : ''}</div>
    <div class="tdx-cols">
      <aside class="panel tdx-sub"><div class="tdx-st"><h3>Énoncé</h3>${Td.canSubject(e) ? `<button class="btn sm ghost" data-act="tdPdf" data-n="${e.n}"><span class="ico" data-i="file"></span>Sujet original</button>` : ''}${e.cor && Td.canSubject({ pdf: e.cor }) ? `<button class="btn sm ghost" data-act="tdCor" data-n="${e.n}"><span class="ico" data-i="check"></span>Corrigé du prof</button>` : ''}</div>${e.intro.map((b) => Td.block(b)).join('')}</aside>
      <div class="tdx-qs">
        ${e.q.map((q) => Td.question(e, q, drafts)).join('')}
        ${e.m ? `<div class="td-mem"><div class="td-cap">À retenir</div>${Td.txt(e.m)}</div>` : ''}
        <div class="panel td-mark"><div>Comment ça s’est passé ?</div><div class="row">
          <button class="btn ${s === 'revoir' ? 'primary' : ''}" data-act="tdMark" data-n="${e.n}" data-s="revoir">À revoir</button>
          <button class="btn ${s === 'ok' ? 'primary' : ''}" data-act="tdMark" data-n="${e.n}" data-s="ok"><span class="ico" data-i="check"></span>Réussi</button>
          ${next ? `<button class="btn ghost" data-act="tdOpen" data-n="${next.n}">Exercice suivant<span class="ico" data-i="arrowR"></span></button>` : ''}</div>${s === 'revoir' ? errPick('td:' + tk(e.n)) : ''}</div>
      </div>
    </div>
  </div>`;
};

/* Sujet original : PDF sur ordinateur, images sur téléphone et tablette (Safari n'affiche pas les PDF intégrés) */
VIEWS.tdPdf = () => {
  const base = view.file.replace('.pdf', ''), total = (course.td.pages || {})[base] || 1, web = window.api.platform === 'web';
  return `<div class="page ${web ? 'wide' : ''}">
    <div class="tdx-top">${view.back ? `<button class="btn ghost sm" data-act="annaleGo" data-id="${view.back}"><span class="ico" data-i="arrowL"></span>Retour à l’épreuve</button>` : `<button class="btn ghost sm" data-act="tdOpen" data-n="${view.n}"><span class="ico" data-i="arrowL"></span>Retour à l’exercice</button>`}
      ${web ? `<span class="muted">Page ${view.page} / ${total}</span><div class="tdx-nav"><button class="btn sm ghost" aria-label="Page précédente" data-act="tdPage" data-p="${view.page - 1}" ${view.page > 1 ? '' : 'disabled'}><span class="ico" data-i="arrowL"></span></button><button class="btn sm ghost" aria-label="Page suivante" data-act="tdPage" data-p="${view.page + 1}" ${view.page < total ? '' : 'disabled'}><span class="ico" data-i="arrowR"></span></button></div>`
    : `<span class="muted">${esc(view.file)}</span><div class="tdx-nav"><button class="btn sm ghost" data-act="pdfExt" data-file="${esc(view.file)}"><span class="ico" data-i="external"></span>Lecteur PDF</button></div>`}</div>
    <div class="${web ? 'td-img' : 'pdf-wrap'}" id="pdfWrap" ${web ? '' : 'style="height:calc(100vh - 2.75rem - 6.875rem)"'}></div></div>`;
};
VIEWS_AFTER.tdPdf = async () => {
  const v = view, web = window.api.platform === 'web';
  const url = web ? await Account.imgUrl(course.id, `${v.file.replace('.pdf', '')}-${v.page}`) : await Account.pdfUrl(course.id, v.file);
  const w = $('#pdfWrap');
  if (!w || view !== v) return;
  w.innerHTML = !url ? '<div class="empty">Sujet indisponible : connecte-toi à internet pour le télécharger une première fois.</div>'
    : web ? `<img src="${url}" alt="Page ${v.page} du sujet">` : `<iframe src="${url}#page=${v.page || 1}&view=FitH"></iframe>`;
};

Object.assign(ACTIONS, {
  tdFilter: (el) => { view.filter = el.dataset.f; keepScroll(); },
  tdOpen: (el) => go('tdEx', { n: Number(el.dataset.n) }),
  tdHint: (el) => { Td.q(el.dataset.n, el.dataset.k).hint = true; keepScroll(); },
  tdStep: (el) => { const q = Td.get(el.dataset.n).q.find((x) => x.k === el.dataset.k); Td.step(q, Td.q(el.dataset.n, el.dataset.k)); keepScroll(); },
  tdAll: (el) => { Td.q(el.dataset.n, el.dataset.k).steps = Td.get(el.dataset.n).q.find((x) => x.k === el.dataset.k).s.length; keepScroll(); },
  tdHide: (el) => { Object.assign(Td.q(el.dataset.n, el.dataset.k), { steps: 0, hint: false }); keepScroll(); },
  tdDraft: (el) => { const { n, k } = el.dataset; Td.q(n, k).draft = true; keepScroll(); const t = document.querySelector(`[data-draft="${CSS.escape(`${tk(n)}:${k}`)}"]`); if (t) t.focus(); },
  tdMark: (el) => {
    const n = tk(el.dataset.n), s = el.dataset.s;
    if (Store.data.td[n] === s) delete Store.data.td[n];
    else { Store.data.td[n] = s; if (s === 'ok') { Game.event('td'); Rev.ok('td:' + n); Niv.fromTd(el.dataset.n); } else Rev.fail('td:' + n); }
    Store.save(); keepScroll();
  },
  tdPdf: (el) => { const e = Td.get(el.dataset.n); go('tdPdf', { n: e.n, page: e.page, file: Td.file(e) }); },
  tdCor: (el) => go('tdPdf', { n: Number(el.dataset.n), file: Td.get(el.dataset.n).cor, page: 1 }),
  tdPage: (el) => go('tdPdf', { n: view.n, file: view.file, back: view.back, page: Number(el.dataset.p) })
});
document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.draft) Td.saveDraft(e.target.dataset.draft, e.target.value); });
