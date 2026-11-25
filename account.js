// Compte par code : ouvre l'accès aux cours (téléchargés après le code, puis gardés hors ligne)
// et synchronise la progression entre les appareils.
const Account = {
  API: window.api.server || API_URL,
  SITE: 'https://wdrixi.github.io/revisions-releases/',
  c: null, busy: null, again: false, timer: null, error: '', started: false,

  cfg() {
    if (!this.c) { try { this.c = JSON.parse(localStorage.getItem('revAccount')) || {}; } catch (e) { this.c = {}; } }
    return this.c;
  },
  keep() { try { localStorage.setItem('revAccount', JSON.stringify(this.c)); } catch (e) { /* stockage indisponible */ } },
  on() { return !!this.cfg().code; },
  norm: (t) => String(t).toUpperCase().replace(/[^A-Z0-9]/g, ''),
  show: (t) => (t.match(/.{1,4}/g) || []).join('-'),

  async call(path, opt = {}, code = this.cfg().code) {
    const r = await fetch(this.API + path, { cache: 'no-store', signal: AbortSignal.timeout(opt.ms || 20000), method: opt.method || 'GET', body: opt.body, headers: { Authorization: `Bearer ${code}`, ...(opt.headers || {}) } });
    if (r.ok) return r;
    let body = {};
    try { body = await r.json(); } catch (e) { /* réponse d'un proxy ou d'un wifi public */ }
    const e = new Error(`HTTP ${r.status}`);
    e.status = r.status; e.kind = body.error;
    throw e;
  },
  refused: (e) => e.status === 401 && e.kind === 'code', // seul notre serveur répond ça : un wifi public ne peut pas verrouiller l'app
  explain(e) {
    return this.refused(e) ? 'Ce code n’est pas reconnu ou a été bloqué.'
      : e.status === 429 ? 'Trop d’essais, attends une minute.'
        : e.status ? `Le serveur a répondu une erreur (${e.status}).`
          : e instanceof SyntaxError ? 'Réponse du serveur illisible, rien n’a été modifié.'
            : 'Pas de connexion : nouvel essai automatique plus tard.';
  },

  /* ---------- Cours ---------- */
  async loadContent() {
    const dev = window.api.devCourses ? await window.api.devCourses() : null;
    if (dev) { window.COURSES = dev; return true; }
    if (!this.on()) return false;
    const c = await window.api.contentLoad();
    if (!c || !Array.isArray(c.courses) || !c.courses.length) return false;
    window.COURSES = c.courses; this.version = c.version;
    return true;
  },
  async download(code) {
    const c = await (await this.call('/content', { ms: 60000 }, code)).json();
    if (!Array.isArray(c.courses) || !c.courses.length) throw new Error('contenu vide');
    await window.api.contentSave(c);
    return c;
  },
  // PDF : copie locale si elle existe, sinon téléchargement puis copie locale
  async pdfUrl(courseId, file) {
    const have = await window.api.pdfUrl(courseId, file);
    if (have || !this.on()) return have;
    try {
      const r = await this.call(`/pdf/${courseId}/${file}`, { ms: 120000 });
      await window.api.pdfSave(courseId, file, new Uint8Array(await r.arrayBuffer()));
      return await window.api.pdfUrl(courseId, file);
    } catch (e) { return null; }
  },
  // Page de sujet en image (téléphone et tablette), gardée hors ligne
  async imgUrl(courseId, name) {
    const key = `/sujet/${courseId}/${name}.webp`;
    try {
      let b = await window.api.fileLoad(key);
      if (!b && this.on()) { b = await (await this.call(key, { ms: 60000 })).blob(); await window.api.fileSave(key, b); }
      return b ? URL.createObjectURL(b) : null;
    } catch (e) { return null; }
  },
  // Nouvelle version des cours : prise en compte au prochain démarrage
  async refresh() {
    try {
      const me = await (await this.call('/me')).json();
      if (me.version && this.version && me.version !== this.version) {
        const c = await this.download();
        this.version = c.version;
        if (!session && ['path', 'today'].includes(view.name)) { window.COURSES = c.courses; buildIndex(); buildSearch(); render(); } else toast('Cours mis à jour, visibles au prochain démarrage');
      }
    } catch (e) { if (this.refused(e)) await this.lock(); }
  },

  // Code bloqué : les cours sont retirés de l'appareil, la progression reste
  async lock() {
    clearTimeout(this.timer);
    this.c = { ...this.cfg(), code: null };
    this.keep();
    await window.api.contentClear();
    location.reload();
  },

  async login(raw) {
    const code = this.norm(raw);
    if (code.length !== 12) return 'Un code fait 12 caractères, par exemple ABCD-EFGH-JKLM.';
    try {
      const me = await (await this.call('/me', {}, code)).json();
      if (!me.id) throw new Error('réponse');
      await this.download(code);
      const old = this.cfg();
      // Autre personne sur cet appareil : sa progression ne doit pas se mélanger à la précédente
      if (old.id && old.id !== me.id) {
        clearTimeout(Store.timer);
        localStorage.setItem(`revBackup:${old.id}`, JSON.stringify(Store.data));
        const mine = localStorage.getItem(`revBackup:${me.id}`);
        const fresh = mine ? JSON.parse(mine) : Store.defaults();
        fresh.settings = { ...fresh.settings, theme: Store.data.settings.theme, sound: Store.data.settings.sound };
        Store.data = fresh;
        await window.api.save(fresh);
      }
      const same = old.id === me.id;
      this.c = { code, id: me.id, name: me.name, base: same ? old.base : null, rev: same ? old.rev : null };
      this.keep();
      return '';
    } catch (e) { return this.explain(e); }
  },

  gate() {
    document.body.classList.add('locked');
    const g = document.createElement('div');
    g.className = 'gate';
    g.innerHTML = `<form class="gate-box">${mascot('happy', 96)}
      <h1>Révisions</h1><p>Entre ton code pour ouvrir les cours et retrouver ta progression.</p>
      <input id="gateIn" placeholder="ABCD-EFGH-JKLM" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Code d’accès">
      <div class="gate-err" role="alert"></div>
      <button class="bigbtn" type="submit">Ouvrir</button></form>`;
    document.body.appendChild(g);
    // Tant que l'app est verrouillée, les raccourcis clavier ne font rien
    g.addEventListener('keydown', (e) => e.stopPropagation());
    window.addEventListener('keydown', (e) => { if (!(e.target instanceof Node) || !g.contains(e.target)) e.stopImmediatePropagation(); }, true);
    const input = g.querySelector('input'), err = g.querySelector('.gate-err'), btn = g.querySelector('button');
    input.addEventListener('input', () => { if (input.selectionStart === input.value.length) input.value = this.show(this.norm(input.value).slice(0, 12)); });
    g.querySelector('form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (btn.disabled) return;
      btn.disabled = true; btn.textContent = 'Connexion...'; err.textContent = '';
      const problem = await this.login(input.value);
      if (!problem) { location.reload(); return; }
      btn.disabled = false; btn.textContent = 'Ouvrir'; err.textContent = problem;
    });
    const linked = this.linkCode();
    if (linked) { input.value = this.show(linked); g.querySelector('form').requestSubmit(); } else input.focus();
  },
  // Lien du QR code : #code=... (retiré de l'adresse aussitôt)
  linkCode() {
    const m = location.hash.match(/^#code=([A-Za-z0-9-]+)$/);
    if (!m) return null;
    history.replaceState(null, '', location.pathname + location.search);
    const c = this.norm(m[1]);
    return c.length === 12 ? c : null;
  },

  /* ---------- Synchronisation ---------- */
  schedule(ms = 15000) {
    if (!this.on() || !this.started) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run(), ms);
  },
  run() {
    if (!this.on() || !Store.data || !this.started) return Promise.resolve(false);
    if (this.busy) { this.again = true; return this.busy; }
    this.busy = this.exchange().finally(() => {
      this.busy = null;
      if (this.again) { this.again = false; this.schedule(3000); }
      this.panelRefresh();
    });
    return this.busy;
  },
  async exchange() {
    const c = this.cfg();
    try {
      let snap, merged, rev;
      for (let turn = 0; ; turn++) {
        const r = await this.call('/progress');
        rev = Number(r.headers.get('X-Rev'));
        const remote = await r.json();
        if (!Number.isInteger(rev) || r.headers.get('X-Rev') === null) throw new Error('réponse');
        snap = Merge.shared(Store.data);
        const known = c.base && Number.isInteger(c.rev) && c.rev <= rev;
        merged = remote ? Merge.merge(known ? c.base : null, snap, remote) : snap;
        if (remote && Merge.same(merged, remote)) break;
        try {
          rev = (await (await this.call('/progress', { method: 'PUT', body: JSON.stringify(merged), headers: { 'X-Rev': String(rev) } })).json()).rev;
          break;
        } catch (e) { if (e.status !== 409 || turn >= 3) throw e; } // l'autre appareil vient d'écrire : on refusionne
      }
      if (this.c !== c) return false; // changement de code pendant l'échange
      // Ce qui a été fait ici pendant l'échange réseau est conservé
      const now = Merge.shared(Store.data);
      const next = Merge.same(now, snap) ? merged : Merge.merge(snap, now, merged);
      const changed = !Merge.same(next, now);
      if (changed) {
        Store.data = Merge.withLocal(next, Store.data);
        Store.data.settings = Object.assign(Store.defaults().settings, Store.data.settings);
        await window.api.save(Store.data);
      }
      Object.assign(c, { base: merged, rev, at: Date.now() });
      this.error = '';
      this.keep();
      if (!Merge.same(next, merged)) this.again = true;
      const typing = document.activeElement && document.activeElement.tagName === 'INPUT';
      if (changed) { Game.hud(); if (!session && !typing) keepScroll(); }
      return true;
    } catch (e) {
      this.error = this.explain(e);
      if (this.refused(e) && this.c === c) await this.lock();
      return false;
    }
  },
  // Avant de fermer la fenêtre : dernier envoi, sans bloquer plus de 3 secondes
  flush() { return this.on() ? Promise.race([this.run(), new Promise((r) => setTimeout(r, 3000))]) : Promise.resolve(); },

  panel() {
    const c = this.cfg();
    if (!this.on()) return '<h3>Compte</h3><div class="muted sync-p">Aucun code sur cet appareil.</div>';
    const st = this.error ? `<span style="color:var(--bad)">${esc(this.error)}</span>`
      : c.at ? `Dernière synchronisation : ${new Date(c.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Pas encore synchronisé.';
    return `<h3>Compte de ${esc(c.name || '')}</h3>
      <div class="muted sync-p">${st}</div>
      <div class="sync-row"><button class="btn sm primary" data-act="accNow">Synchroniser maintenant</button>
      <button class="btn sm" data-act="accQr">${view.qr ? 'Cacher le code' : 'Connecter un autre appareil'}</button>
      <button class="btn sm ghost" data-act="accOut">${view.out ? 'Confirmer' : 'Changer de code'}</button></div>
      ${view.out ? '<div class="muted sync-p" style="margin-top:0.625rem">Ta progression reste enregistrée sur ton compte.</div>' : ''}
      ${view.qr ? `<div class="sync-qr"><div class="qr">${this.qr()}</div><p class="muted"><span class="mono code-show">${this.show(c.code)}</span><br>Tape ce code sur l’autre appareil, ou scanne le QR code avec le téléphone. Sur iPhone, ajoute d’abord le site à l’écran d’accueil, puis tape le code dans l’app. Ne le partage pas : il ouvre ton compte.</p></div>` : ''}`;
  },
  qr() {
    const q = qrcode(0, 'M');
    q.addData(`${this.SITE}#code=${this.show(this.cfg().code)}`);
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: 12, scalable: true });
  },
  panelRefresh() { const el = document.getElementById('syncPanel'); if (el) el.innerHTML = this.panel(); },

  start() {
    this.started = true;
    this.linkCode(); // déjà connecté : on retire juste le code de l'adresse
    document.addEventListener('visibilitychange', () => this.run());
    window.addEventListener('online', () => this.schedule(1000));
    setInterval(() => { if (!document.hidden) this.run(); }, 5 * 60000);
    if (this.on()) this.run().then(() => this.refresh());
  }
};

Object.assign(ACTIONS, {
  accNow: async () => { if (await Account.run()) toast('Synchronisé'); else if (Account.error) toast(Account.error); },
  accQr: () => { view.qr = !view.qr; Account.panelRefresh(); },
  accOut: async () => {
    if (!view.out) { view.out = true; Account.panelRefresh(); return; }
    await Account.flush();
    await Account.lock();
  }
});

// Après chaque enregistrement local, envoi groupé
const storeSave = Store.save;
Store.save = function save() { storeSave.call(this); Account.schedule(); };
