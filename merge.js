// Fusion de deux progressions (PC et téléphone) à partir de leur dernier état commun.
// Avec un état commun : les compteurs s'additionnent (+3 ici, +2 là-bas = +5) et les suppressions sont respectées.
// Sans état commun : on garde le maximum et on ne supprime rien, donc refusionner deux fois ne double rien.
const Merge = (() => {
  const LOCAL = ['last', 'course'];              // propres à chaque appareil
  const LOCAL_SETTINGS = ['sound', 'theme'];
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const same = (a, b) => {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
    if (!isObj(a) || !isObj(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && same(a[k], b[k]));
  };
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

  const COUNTERS = [
    /^activity\.[^.]+\.\w+$/, /^qstat\..+\.(ok|ko)$/, /^train\.[^.]+\.(ok|total)$/,
    /^game\.xp$/, /^game\.stats\.\w+$/, /^path\..+\.n$/, /^err\..+$/
  ];

  function leaf(b, l, r, p, hasBase) {
    if (typeof l === 'number' && typeof r === 'number') {
      if (COUNTERS.some((x) => x.test(p))) return hasBase ? Math.max(0, l + r - (typeof b === 'number' ? b : 0)) : Math.max(l, r);
      if (p.startsWith('settings.')) return l;
      if (p.startsWith('game.badges.') || p.startsWith('game.bosses.')) return Math.min(l, r);
      return Math.max(l, r);
    }
    if (typeof l === 'boolean' && typeof r === 'boolean' && p.startsWith('read.')) return l || r;
    return l;
  }

  function quests(l, r) {
    if (l.day !== r.day) return clone(l.day > r.day ? l : r);
    return {
      day: l.day,
      items: l.items.map((q) => {
        const o = r.items.find((x) => x.id === q.id);
        return o ? { ...q, p: Math.max(q.p, o.p), done: q.done || o.done } : clone(q);
      })
    };
  }

  function rec(b, l, r, p, hasBase) {
    if (same(l, r)) return clone(l);
    if (hasBase) {
      if (same(l, b)) return clone(r);
      if (same(r, b)) return clone(l);
    }
    // Modifié d'un côté, absent de l'autre : on garde ce qui existe
    if (l === undefined || l === null) return clone(r);
    if (r === undefined || r === null) return clone(l);
    if (p === 'game.quests') return quests(l, r);
    if (/^srs\.[^.]+$/.test(p)) return clone((l.last || 0) >= (r.last || 0) ? l : r); // carte : la révision la plus récente
    if (Array.isArray(l) && Array.isArray(r)) {
      const J = (x) => JSON.stringify(x);
      const B = new Set((b || []).map(J)), L = new Set(l.map(J)), R = new Set(r.map(J));
      const out = new Map();
      [...l, ...r].forEach((x) => {
        const k = J(x);
        if (hasBase && B.has(k) && !(L.has(k) && R.has(k))) return; // supprimé d'un côté
        out.set(k, clone(x));
      });
      return [...out.values()].sort((x, y) => ((x && x.date) || 0) - ((y && y.date) || 0));
    }
    if (isObj(l) && isObj(r)) {
      const out = {};
      new Set([...Object.keys(l), ...Object.keys(r)]).forEach((k) => {
        const v = rec(isObj(b) ? b[k] : undefined, l[k], r[k], p ? `${p}.${k}` : k, hasBase);
        if (v !== undefined) out[k] = v;
      });
      return out;
    }
    return leaf(b, l, r, p, hasBase);
  }

  // Partie partagée de la progression (sans les réglages propres à l'appareil)
  function shared(d) {
    const x = clone(d);
    LOCAL.forEach((k) => delete x[k]);
    if (x.settings) LOCAL_SETTINGS.forEach((k) => delete x.settings[k]);
    return x;
  }
  function withLocal(data, mine) {
    const x = clone(data);
    LOCAL.forEach((k) => { x[k] = mine[k] === undefined ? null : clone(mine[k]); });
    x.settings = x.settings || {};
    LOCAL_SETTINGS.forEach((k) => { if (mine.settings && mine.settings[k] !== undefined) x.settings[k] = mine.settings[k]; });
    return x;
  }
  return { merge: (base, l, r) => rec(base || undefined, l, r, '', !!base), shared, withLocal, same, clone };
})();
