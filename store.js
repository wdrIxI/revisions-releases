// Persistance de la progression (fichier JSON dans le dossier utilisateur via IPC)
// + algorithme de repetition espacee (inspire de SM-2)
const DAY = 86400000;

const Store = {
  data: null,
  timer: null,

  defaults() {
    return {
      version: 2,
      srs: {},          // id carte -> { ease, interval (jours), due (ms), reps, lapses, last }
      qcm: {},          // id chapitre -> { best, attempts, total, correct }
      wrong: {},        // id question -> nombre d'erreurs non corrigees
      read: {},         // id section -> true
      td: {},           // id exercice -> 'ok' | 'revoir'
      train: {},        // id entraineur -> { ok, total }
      exams: [],        // { date, score, total, duree }
      activity: {},     // 'AAAA-MM-JJ' -> { cards, qcm, ms }
      settings: { newPerDay: 20 },
      last: null,       // derniere vue
      course: null      // cours affiche
    };
  },

  async init() {
    let d = null;
    try { d = await window.api.load(); } catch (e) { d = null; }
    this.data = Object.assign(this.defaults(), d || {});
    this.data.settings = Object.assign(this.defaults().settings, this.data.settings || {});
    // Migration v1 (un seul cours, Reseaux) : prefixer les cles de fiche et de TD par l'id du cours
    if (this.data.version < 2) {
      const read = {}, td = {};
      Object.keys(this.data.read).forEach((k) => { read[k.startsWith('reseaux:') ? k : 'reseaux:' + k] = this.data.read[k]; });
      Object.keys(this.data.td).forEach((k) => { td[k.includes(':') ? k : 'reseaux:' + k] = this.data.td[k]; });
      this.data.exams.forEach((e) => { e.course = e.course || 'reseaux'; });
      this.data.read = read; this.data.td = td; this.data.version = 2;
    }
  },

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => window.api.save(this.data), 300);
  },

  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  bump(field, n = 1) {
    const k = this.today();
    const a = this.data.activity[k] || { cards: 0, qcm: 0, ms: 0 };
    a[field] = (a[field] || 0) + n;
    this.data.activity[k] = a;
    this.save();
  },

  streak() {
    let n = 0;
    const d = new Date();
    // La serie n'est pas cassee si on n'a pas encore travaille aujourd'hui
    const key = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const active = (x) => { const a = this.data.activity[key(x)]; return a && (a.cards + a.qcm + (a.lessons || 0)) > 0; };
    if (!active(d)) d.setDate(d.getDate() - 1);
    while (active(d)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },

  newSeenToday() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return Object.values(this.data.srs).filter((s) => s.first && s.first >= start.getTime()).length;
  }
};

const SRS = {
  // Note : 1 = a revoir, 2 = difficile, 3 = bien, 4 = facile
  preview(state, grade) {
    const s = state ? { ...state } : { ease: 2.5, interval: 0, reps: 0, lapses: 0 };
    let interval;
    if (grade === 1) {
      interval = 0; // revient dans 10 minutes
      s.ease = Math.max(1.3, s.ease - 0.2);
      s.lapses++;
      s.reps = 0;
    } else {
      if (s.reps === 0) interval = grade === 2 ? 1 : grade === 3 ? 1 : 4;
      else if (s.reps === 1) interval = grade === 2 ? 2 : grade === 3 ? 3 : 6;
      else {
        const mult = grade === 2 ? 1.2 : grade === 3 ? s.ease : s.ease * 1.3;
        interval = Math.max(s.interval + 1, Math.round(s.interval * mult));
      }
      if (grade === 2) s.ease = Math.max(1.3, s.ease - 0.15);
      if (grade === 4) s.ease = s.ease + 0.15;
      s.reps++;
    }
    s.interval = interval;
    return s;
  },

  apply(id, grade) {
    const prev = Store.data.srs[id];
    const s = this.preview(prev, grade);
    const now = Date.now();
    s.due = s.interval === 0 ? now + 10 * 60000 : now + s.interval * DAY;
    s.last = now;
    s.first = prev && prev.first ? prev.first : now;
    Store.data.srs[id] = s;
    if (grade === 1) Store.data.wrong[id] = (Store.data.wrong[id] || 0) + 1;
    else if (Store.data.wrong[id] && grade >= 3) delete Store.data.wrong[id];
    Store.bump('cards');
    if (typeof Game !== 'undefined') Game.event('card', grade);
  },

  label(state, grade) {
    const s = this.preview(state, grade);
    if (s.interval === 0) return '10 min';
    if (s.interval < 30) return `${s.interval} j`;
    if (s.interval < 365) return `${Math.round(s.interval / 30)} mois`;
    return `${(s.interval / 365).toFixed(1)} an`;
  },

  isDue(id) {
    const s = Store.data.srs[id];
    return s && s.due <= Date.now();
  },

  level(id) {
    const s = Store.data.srs[id];
    if (!s) return 0;           // nouvelle
    if (s.interval >= 21) return 3; // maitrisee
    if (s.interval >= 4) return 2;  // en cours
    return 1;                    // en apprentissage
  }
};
