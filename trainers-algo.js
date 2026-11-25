// Generateurs d'exercices du cours d'algorithmique
const ORDERS = [
  ['1', 'constante 7'], ['log n', '3 log n'], ['√n', '5√n'], ['n', '4n + 2'], ['n log n', 'n log n + n'],
  ['n²', '3n² + n'], ['n³', 'n³ + 10n²'], ['2^n', '2^n + n³']
];
const showInf = (x) => (x === Infinity ? '∞' : x);

TRAINERS.push(
  {
    id: 'landau', titre: 'Notations de Landau', theme: 'Complexité', icon: 'chart',
    desc: 'Comparer deux fonctions : O, Θ ou Ω ?',
    gen() {
      const i = rnd(0, ORDERS.length - 1);
      const j = Math.random() < 0.35 ? i : rnd(0, ORDERS.length - 1);
      const f = ORDERS[i], g = ORDERS[j];
      const fe = pick([f[1], f[0]]);
      const ge = j === i ? pick(['2·' + g[0], g[1]]) : g[0];
      const ans = i < j ? 'O seulement' : i === j ? 'Θ' : 'Ω seulement';
      return {
        raw: { fe, ge, i, j, ans },
        prompt: `f(n) = <span class="mono hl">${fe}</span> et g(n) = <span class="mono hl">${ge}</span>. Quelle relation a-t-on ?`,
        fields: [{ k: 'r', label: 'f = ? (g)', type: 'choice', options: ['O seulement', 'Θ', 'Ω seulement'] }],
        expected: { r: ans },
        solution: [
          `Terme dominant de f : ${f[0]}. Terme dominant de g : ${g[0]}.`,
          ans === 'Θ' ? 'Même ordre à une constante près : f = Θ(g), donc aussi O et Ω.'
            : ans === 'O seulement' ? 'f croît strictement moins vite : f = O(g) mais pas Ω(g).'
              : 'f croît strictement plus vite : f = Ω(g) mais pas O(g).'
        ]
      };
    }
  },
  {
    id: 'knap', titre: 'Sac à dos (PD)', theme: 'Programmation dynamique', icon: 'layers',
    desc: 'Remplir le tableau F(j, V) et trouver la valeur optimale.',
    gen() {
      const n = 4, items = [];
      for (let i = 0; i < n; i++) items.push({ v: rnd(2, 7), w: rnd(3, 15) });
      const Vmax = rnd(8, 13);
      const F = [Array(Vmax + 1).fill(0)];
      for (let j = 1; j <= n; j++) {
        F[j] = [];
        const it = items[j - 1];
        for (let V = 0; V <= Vmax; V++) F[j][V] = Math.max(F[j - 1][V], it.v <= V ? F[j - 1][V - it.v] + it.w : -1);
      }
      return {
        raw: { items, Vmax, F },
        prompt: `Vmax = <span class="hl">${Vmax}</span>. Objets (volume, utilité) :<div class="mini-table">${items.map((it, i) => `<div><span>Objet ${i + 1}</span><span class="mono">v = ${it.v}, w = ${it.w}</span></div>`).join('')}</div>`,
        fields: [
          { k: 'f2', label: `F(2, ${Vmax})`, ph: 'nombre' },
          { k: 'opt', label: `OPT = F(4, ${Vmax})`, ph: 'nombre' }
        ],
        expected: { f2: String(F[2][Vmax]), opt: String(F[n][Vmax]) },
        solution: ['F(j, V) = max( F(j-1, V), F(j-1, V - vj) + wj ). Lignes du tableau (V de 0 à Vmax) :', ...F.map((row, j) => `j = ${j} : ${row.join(' ')}`)]
      };
    }
  },
  {
    id: 'bf', titre: 'Bellman-Ford', theme: 'Programmation dynamique', icon: 'arrowR',
    desc: 'Distances depuis A en relâchant les arêtes |V| - 1 fois.',
    gen() {
      const N = ['A', 'B', 'C', 'D', 'E'];
      const E = [];
      const add = (u, v) => { if (u !== v && !E.some((e) => e[0] === u && e[1] === v)) E.push([u, v, rnd(1, 9)]); };
      for (let i = 1; i < 5; i++) add(rnd(0, i - 1), i);
      for (let t = 0; t < 4; t++) add(rnd(0, 4), rnd(1, 4));
      const SP = [0, Infinity, Infinity, Infinity, Infinity];
      const rows = [`k = 0 : ${SP.map(showInf).join(' ')}`], hist = [[...SP]];
      for (let k = 1; k <= 4; k++) {
        const prev = [...SP];
        E.forEach(([u, v, w]) => { if (prev[u] + w < SP[v]) SP[v] = prev[u] + w; });
        hist.push([...SP]);
        rows.push(`k = ${k} : ${SP.map(showInf).join(' ')}`);
      }
      return {
        raw: { E, hist, N },
        prompt: `Graphe orienté, source A. Arêtes :<div class="mini-table">${E.map(([u, v, w]) => `<div><span class="mono">${N[u]} → ${N[v]}</span><span>${w}</span></div>`).join('')}</div>`,
        fields: N.slice(1).map((x) => ({ k: x, label: `Distance A → ${x}`, ph: 'nombre' })),
        expected: Object.fromEntries(N.slice(1).map((x, i) => [x, String(SP[i + 1])])),
        solution: ['Tableau SP[v] dans l’ordre A B C D E, itération par itération :', ...rows]
      };
    }
  },
  {
    id: 'ls', titre: 'List Scheduling et LPT', theme: 'Approximation', icon: 'timer',
    desc: 'Makespan de List Scheduling (ordre donné) et de LPT, borne inférieure.',
    gen() {
      const m = pick([2, 3]), n = rnd(6, 8);
      const p = Array.from({ length: n }, () => rnd(1, 9));
      const run = (order) => {
        const l = Array(m).fill(0), log = [], tr = [];
        order.forEach((x) => { const i = l.indexOf(Math.min(...l)); l[i] += x; tr.push({ x, i, l: [...l] }); log.push(`${x} → M${i + 1}`); });
        return { c: Math.max(...l), l, log, tr };
      };
      const a = run(p), b = run([...p].sort((x, y) => y - x));
      const L = p.reduce((s, x) => s + x, 0);
      const lb = Math.ceil(Math.max(L / m, Math.max(...p)));
      return {
        raw: { m, p, a, b, L, lb },
        prompt: `<span class="hl">m = ${m}</span> machines, durées dans l’ordre : <span class="mono hl">${p.join(', ')}</span>. Chaque tâche va sur la machine la moins chargée (la plus petite en cas d’égalité).`,
        fields: [
          { k: 'ls', label: 'Cmax List Scheduling', ph: 'nombre' },
          { k: 'lpt', label: 'Cmax LPT', ph: 'nombre' },
          { k: 'lb', label: '⌈max(L/m, pmax)⌉', ph: 'nombre' }
        ],
        expected: { ls: String(a.c), lpt: String(b.c), lb: String(lb) },
        solution: [
          `LS : ${a.log.join(', ')}. Charges ${a.l.join(' / ')}, Cmax = ${a.c}.`,
          `LPT (tri décroissant) : ${b.log.join(', ')}. Charges ${b.l.join(' / ')}, Cmax = ${b.c}.`,
          `L = ${L}, L/m = ${fmt(L / m)}, pmax = ${Math.max(...p)} : OPT ≥ ${lb}.`
        ]
      };
    }
  },
  {
    id: 'round', titre: 'Arrondis additif et multiplicatif', theme: 'Schémas', icon: 'calc',
    desc: 'Calculer K et p# (additif) ou k et v# (multiplicatif).',
    gen() {
      if (Math.random() < 0.5) {
        const m = pick([2, 3]), n = rnd(4, 6), eps = pick([0.5, 0.25, 0.1]);
        const p = Array.from({ length: n }, () => rnd(3, 30));
        const L = p.reduce((s, x) => s + x, 0), K = eps * (L / m) / n, j = rnd(0, n - 1), ps = K * Math.ceil(p[j] / K - 1e-9);
        return {
          raw: { add: true, m, n, eps, p, L, K, pj: p[j], ps },
          prompt: `Arrondi additif pour P${m} || Cmax : ε = <span class="hl">${String(eps).replace('.', ',')}</span>, durées <span class="mono hl">${p.join(', ')}</span>. Arrondir la tâche de durée <span class="hl">${p[j]}</span>.`,
          fields: [{ k: 'K', label: 'K = ε · (L/m) / n', ph: 'nombre', num: true }, { k: 'ps', label: 'p# = K ⌈p / K⌉', ph: 'nombre', num: true }],
          expected: { K, ps },
          solution: [`L = ${L}, LB = L/m = ${fmt(L / m)}.`, `K = ${fmt(eps)} × ${fmt(L / m)} / ${n} = ${fmt(K, 3)}.`, `⌈${p[j]} / ${fmt(K, 3)}⌉ = ${Math.round(ps / K)}, donc p# = ${fmt(ps, 3)}.`]
        };
      }
      const eps = pick([0.5, 1, 0.25]), v = rnd(3, 60);
      const k = Math.ceil(Math.log(v) / Math.log(1 + eps) - 1e-9), vs = (1 + eps) ** k;
      return {
        raw: { eps, v, k, vs },
        prompt: `Arrondi multiplicatif : ε = <span class="hl">${String(eps).replace('.', ',')}</span>, v = <span class="hl">${v}</span>.`,
        fields: [{ k: 'k', label: 'k = ⌈log_{1+ε} v⌉', ph: 'entier' }, { k: 'vs', label: 'v# = (1+ε)^k', ph: 'nombre', num: true }],
        expected: { k: String(k), vs },
        solution: [`log_${fmt(1 + eps)}(${v}) = ln ${v} / ln ${fmt(1 + eps)} = ${fmt(Math.log(v) / Math.log(1 + eps), 3)}, donc k = ${k}.`, `v# = ${fmt(1 + eps)}^${k} = ${fmt(vs, 3)}, et ${v} ≤ v# < ${fmt((1 + eps) * v)}.`]
      };
    }
  },
  {
    id: 'greedysc', titre: 'Glouton pour Set Cover', theme: 'Dualité', icon: 'target',
    desc: 'Dérouler le glouton et calculer les prix des éléments (dual fitting).',
    gen() {
      let sets;
      do {
        sets = Array.from({ length: 5 }, () => { const s = new Set(); const sz = rnd(2, 4); while (s.size < sz) s.add(rnd(1, 8)); return [...s].sort((a, b) => a - b); });
      } while (new Set(sets.flat()).size < 8);
      const R = new Set([1, 2, 3, 4, 5, 6, 7, 8]), chosen = [], price = {}, log = [], tours = [];
      while (R.size) {
        let best = -1, bn = 0;
        sets.forEach((s, i) => { const c = s.filter((e) => R.has(e)).length; if (c > bn) { bn = c; best = i; } });
        const nw = sets[best].filter((e) => R.has(e));
        nw.forEach((e) => { price[e] = 1 / nw.length; R.delete(e); });
        tours.push({ s: best + 1, nw, counts: sets.map((s) => s.filter((e) => R.has(e) || nw.includes(e)).length) });
        chosen.push(`S${best + 1}`);
        log.push(`S${best + 1} couvre ${nw.join(', ')} : prix 1/${nw.length} chacun`);
      }
      return {
        raw: { sets, tours, price },
        prompt: `U = {1..8}. En cas d’égalité, prendre le plus petit indice.<div class="mini-table">${sets.map((s, i) => `<div><span>S${i + 1}</span><span class="mono">{ ${s.join(', ')} }</span></div>`).join('')}</div>`,
        fields: [
          { k: 'seq', label: 'Ensembles choisis dans l’ordre', ph: 'ex. S2,S4' },
          { k: 'p1', label: 'Prix de l’élément 1', ph: 'ex. 0,5', num: true, tol: 0.01 }
        ],
        expected: { seq: chosen.join(','), p1: price[1] },
        solution: [...log, `|C| = ${chosen.length} = somme des prix.`]
      };
    }
  },
  {
    id: 'tree', titre: 'Stable maximum dans un arbre', theme: 'Baker', icon: 'layers',
    desc: 'Programmation dynamique in[v] / out[v] sur un arbre enraciné.',
    gen() {
      const n = rnd(7, 9), par = [0, 0];
      for (let v = 2; v <= n; v++) par[v] = rnd(1, v - 1);
      const inn = [], out = [];
      for (let v = n; v >= 1; v--) {
        const ch = [];
        for (let c = 2; c <= n; c++) if (par[c] === v) ch.push(c);
        inn[v] = 1 + ch.reduce((s, c) => s + out[c], 0);
        out[v] = ch.reduce((s, c) => s + Math.max(inn[c], out[c]), 0);
      }
      const edges = [];
      for (let v = 2; v <= n; v++) edges.push(`${par[v]}–${v}`);
      return {
        raw: { n, par, inn, out },
        prompt: `Arbre enraciné en 1, arêtes parent–enfant : <span class="mono hl">${edges.join(', ')}</span>`,
        fields: [{ k: 'a', label: 'α(T)', ph: 'nombre' }, { k: 'in1', label: 'in[1]', ph: 'nombre' }],
        expected: { a: String(Math.max(inn[1], out[1])), in1: String(inn[1]) },
        solution: ['in[v] = 1 + Σ out[c] et out[v] = Σ max(in[c], out[c]), en partant des feuilles :', ...Array.from({ length: n }, (_, i) => n - i).map((v) => `v = ${v} : in = ${inn[v]}, out = ${out[v]}`), `α(T) = max(${inn[1]}, ${out[1]}) = ${Math.max(inn[1], out[1])}.`]
      };
    }
  }
);
