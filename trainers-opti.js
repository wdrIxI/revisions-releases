// Générateurs du cours d'optimisation combinatoire (calculs exacts en fractions)
const gcdQ = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcdQ(n, d); return { n: n / g, d: d / g }; };
const qadd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const qsub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const qmul = (a, b) => Q(a.n * b.n, a.d * b.d);
const qdiv = (a, b) => Q(a.n * b.d, a.d * b.n);
const qv = (a) => a.n / a.d;
const qs = (a) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`).replace('-', '−');
const qneg = (a) => Q(-a.n, a.d);

// Écrit une expression linéaire : 3x1 − x2 + 2x3
function linExpr(coefs, names) {
  let s = '';
  coefs.forEach((c, i) => {
    if (!c) return;
    const a = Math.abs(c), sign = c < 0 ? (s ? ' − ' : '−') : (s ? ' + ' : '');
    s += sign + (a === 1 ? '' : a) + names[i];
  });
  return s || '0';
}

// Tableau du simplexe pour max cx, Ax ≤ b (b ≥ 0), base de départ = variables d'écart
function simplexStart(c, A, b) {
  const m = A.length, n = c.length;
  return {
    names: [...c.map((_, j) => 'x' + (j + 1)), ...A.map((_, i) => 'e' + (i + 1))],
    T: A.map((row, i) => [...row.map((v) => Q(v)), ...A.map((_, k) => Q(k === i ? 1 : 0))]),
    t: b.map((v) => Q(v)),
    d: [...c.map((v) => Q(v)), ...A.map(() => Q(0))],
    z: Q(0),
    base: A.map((_, i) => n + i)
  };
}
function simplexChoose(S) {
  let s = -1;
  S.d.forEach((v, j) => { if (qv(v) > 1e-12 && (s < 0 || qv(v) > qv(S.d[s]))) s = j; });
  if (s < 0) return { s: -1 };
  let r = -1, best = null, tie = false;
  S.T.forEach((row, i) => {
    if (qv(row[s]) <= 1e-12) return;
    const ratio = qv(S.t[i]) / qv(row[s]);
    if (best === null || ratio < best - 1e-12) { best = ratio; r = i; tie = false; } else if (Math.abs(ratio - best) < 1e-12) tie = true;
  });
  const dTie = S.d.filter((v) => s >= 0 && Math.abs(qv(v) - qv(S.d[s])) < 1e-12).length > 1;
  return { s, r, tie, dTie };
}
function simplexPivot(S, r, s) {
  const p = S.T[r][s];
  const T = S.T.map((row) => row.slice()), t = S.t.slice();
  T[r] = T[r].map((v) => qdiv(v, p)); t[r] = qdiv(t[r], p);
  T.forEach((row, i) => {
    if (i === r) return;
    const f = row[s];
    T[i] = row.map((v, j) => qsub(v, qmul(f, T[r][j])));
    t[i] = qsub(t[i], qmul(f, t[r]));
  });
  const f = S.d[s];
  const d = S.d.map((v, j) => qsub(v, qmul(f, T[r][j])));
  const z = qadd(S.z, qmul(f, t[r]));
  const base = S.base.slice(); base[r] = s;
  return { names: S.names, T, t, d, z, base };
}
function tableauHtml(S) {
  const head = `<tr><th>Base</th>${S.names.map((x) => `<th>${x}</th>`).join('')}<th>t</th></tr>`;
  const rows = S.T.map((row, i) => `<tr><td>${S.names[S.base[i]]}</td>${row.map((v) => `<td>${qs(v)}</td>`).join('')}<td>${qs(S.t[i])}</td></tr>`).join('');
  const last = `<tr class="tab-d"><td>(d, −z)</td>${S.d.map((v) => `<td>${qs(v)}</td>`).join('')}<td>${qs(qneg(S.z))}</td></tr>`;
  return `<div class="tab-wrap"><table class="tab-simplex">${head}${rows}${last}</table></div>`;
}
function plHtml(c, A, b) {
  const names = c.map((_, j) => 'x' + (j + 1));
  return `<div class="pl-box mono">max ${linExpr(c, names)}<br>${A.map((row, i) => `s.c. ${linExpr(row, names)} ≤ ${b[i]}`).join('<br>').replace(/<br>s\.c\./g, '<br><span style="visibility:hidden">s.c.</span>')}<br><span style="visibility:hidden">s.c.</span> ${names.join(', ')} ≥ 0</div>`;
}

// Sac à dos 0-1 : relaxation de Dantzig et heuristique gloutonne du cours
function knapInstance(n) {
  for (;;) {
    const items = [];
    for (let j = 0; j < n; j++) items.push({ j: j + 1, c: rnd(3, 20), a: rnd(2, 14) });
    const ratios = items.map((x) => x.c / x.a);
    if (new Set(ratios.map((r) => r.toFixed(6))).size < n) continue;
    const sum = items.reduce((s, x) => s + x.a, 0);
    const b = Math.round(sum * (0.45 + Math.random() * 0.15));
    if (Math.max(...items.map((x) => x.a)) > b || b >= sum) continue;
    const order = items.slice().sort((x, y) => y.c / y.a - x.c / x.a);
    const R = dantzig(order, b);
    if (R.s && R.frac.n !== 0) return { items, b, order };
  }
}
function dantzig(order, cap, skip = new Set()) {
  let rest = cap, val = Q(0);
  const C = [];
  for (const it of order) {
    if (skip.has(it.j)) continue;
    if (it.a <= rest) { C.push(it); rest -= it.a; val = qadd(val, Q(it.c)); continue; }
    const frac = Q(rest, it.a);
    return { C, s: it, frac, val: qadd(val, qmul(Q(it.c), frac)), rest };
  }
  return { C, s: null, frac: Q(0), val, rest };
}
function greedy(order, b, R) {
  let rest = b - R.C.reduce((s, x) => s + x.a, 0), val = R.C.reduce((s, x) => s + x.c, 0);
  const taken = R.C.map((x) => x.j), steps = [];
  const after = order.slice(order.indexOf(R.s) + 1);
  for (const it of after) {
    if (it.a <= rest) { taken.push(it.j); rest -= it.a; val += it.c; steps.push(`x${it.j} (a = ${it.a}) entre, capacité résiduelle ${rest}`); }
    else steps.push(`x${it.j} (a = ${it.a}) ne rentre pas`);
  }
  return { val, taken, steps };
}
const knapHtml = (items, b) => `<div class="pl-box mono">max ${linExpr(items.map((x) => x.c), items.map((x) => 'x' + x.j))}<br>s.c. ${linExpr(items.map((x) => x.a), items.map((x) => 'x' + x.j))} ≤ ${b}<br>xj ∈ {0, 1}</div>`;
const ratioLine = (order) => 'Ratios cj/aj décroissants : ' + order.map((x) => `x${x.j} (${fmt(x.c / x.a)})`).join(', ') + '.';

TRAINERS.push(
  {
    id: 'pivot', titre: 'Simplexe : une itération', theme: 'Simplexe', icon: 'calc',
    desc: 'Variable entrante, variable sortante et nouvelle valeur de l’objectif à partir du tableau initial.',
    gen() {
      for (;;) {
        const n = rnd(2, 3), m = rnd(2, 3);
        const c = Array.from({ length: n }, () => rnd(1, 9));
        const A = Array.from({ length: m }, () => Array.from({ length: n }, () => rnd(0, 6)));
        const b = Array.from({ length: m }, () => rnd(4, 24));
        if (A.some((row) => row.every((v) => !v))) continue;
        const S = simplexStart(c, A, b);
        const ch = simplexChoose(S);
        if (ch.s < 0 || ch.r < 0 || ch.tie || ch.dTie) continue;
        const S2 = simplexPivot(S, ch.r, ch.s);
        const ent = S.names[ch.s], sor = S.names[S.base[ch.r]];
        return {
          raw: { c, A, b, S, S2, ch, n },
          prompt: `Programme linéaire :${plHtml(c, A, b)}<div style="margin-top:0.625rem">Tableau initial (base des variables d’écart) :</div>${tableauHtml(S)}<div class="muted" style="margin-top:0.375rem">Règle : entre la variable de plus grand coût réduit d positif, sort celle du plus petit rapport ti / Tis (Tis > 0).</div>`,
          fields: [
            { k: 'in', label: 'Variable entrante', type: 'choice', options: S.names.slice(0, n) },
            { k: 'out', label: 'Variable sortante', type: 'choice', options: S.names.slice(n) },
            { k: 'z', label: 'Valeur de l’objectif après le pivot', ph: 'ex. 24 ou 15/2', num: true, tol: 0.001, disp: qs(S2.z) }
          ],
          expected: { in: ent, out: sor, z: qv(S2.z) },
          solution: [
            `Coûts réduits : ${S.d.slice(0, n).map((v, j) => `d${j + 1} = ${qs(v)}`).join(', ')}. Le plus grand est ${qs(S.d[ch.s])} : ${ent} entre.`,
            `Rapports ti / Tis : ${S.T.map((row, i) => (qv(row[ch.s]) > 0 ? `${S.names[S.base[i]]} : ${qs(S.t[i])} / ${qs(row[ch.s])} = ${qs(qdiv(S.t[i], row[ch.s]))}` : `${S.names[S.base[i]]} : Tis ≤ 0, ignoré`)).join(' ; ')}. Le minimum désigne ${sor}, qui sort.`,
            `Pivot sur ${qs(S.T[ch.r][ch.s])} : z passe de 0 à d × t = ${qs(S.d[ch.s])} × ${qs(qdiv(S.t[ch.r], S.T[ch.r][ch.s]))} = ${qs(S2.z)}.`,
            'Nouveau tableau :', tableauHtml(S2)
          ]
        };
      }
    }
  },
  {
    id: 'simplexe', titre: 'Simplexe complet', theme: 'Simplexe', icon: 'rotate',
    desc: 'Dérouler l’algorithme primal jusqu’au tableau optimal et lire la solution.',
    gen() {
      for (;;) {
        const n = 2, m = rnd(2, 3);
        const c = Array.from({ length: n }, () => rnd(1, 8));
        const A = Array.from({ length: m }, () => Array.from({ length: n }, () => rnd(1, 5)));
        const b = Array.from({ length: m }, () => rnd(6, 30));
        let S = simplexStart(c, A, b);
        const steps = [], hist = [];
        let ok = true;
        for (let it = 0; it < 6; it++) {
          const ch = simplexChoose(S);
          if (ch.s < 0) break;
          if (ch.r < 0 || ch.tie) { ok = false; break; }
          const ent = S.names[ch.s], sor = S.names[S.base[ch.r]];
          hist.push({ S, ch });
          S = simplexPivot(S, ch.r, ch.s);
          steps.push(`Itération ${steps.length + 1} : ${ent} entre, ${sor} sort, z = ${qs(S.z)}.`);
        }
        if (!ok || steps.length < 2 || simplexChoose(S).s >= 0) continue;
        const nonBase = S.d.filter((_, j) => !S.base.includes(j));
        if (nonBase.some((v) => qv(v) > -1e-12)) continue; // optimum unique
        const x = [0, 1].map((j) => { const i = S.base.indexOf(j); return i < 0 ? Q(0) : S.t[i]; });
        return {
          raw: { c, A, b, hist, S, x },
          prompt: `Résoudre par l’algorithme primal du simplexe (départ : base des variables d’écart, plus grand coût réduit pour entrer) :${plHtml(c, A, b)}`,
          fields: [
            { k: 'z', label: 'Valeur optimale v(P)', ph: 'ex. 46/3', num: true, tol: 0.001, disp: qs(S.z) },
            { k: 'x1', label: 'x1 à l’optimum', ph: 'nombre', num: true, tol: 0.001, disp: qs(x[0]) },
            { k: 'x2', label: 'x2 à l’optimum', ph: 'nombre', num: true, tol: 0.001, disp: qs(x[1]) }
          ],
          expected: { z: qv(S.z), x1: qv(x[0]), x2: qv(x[1]) },
          solution: [...steps, `Tous les coûts réduits sont ≤ 0 : la base est optimale. x = (${qs(x[0])}, ${qs(x[1])}), v(P) = ${qs(S.z)}.`, 'Tableau optimal :', tableauHtml(S)]
        };
      }
    }
  },
  {
    id: 'dualw', titre: 'Écrire le dual', theme: 'Dualité', icon: 'shuffle',
    desc: 'Signe de chaque variable duale et sens de chaque contrainte duale, d’après les règles d’écriture.',
    gen() {
      const max = Math.random() < 0.6;
      const n = 3, m = rnd(2, 3);
      const names = ['x1', 'x2', 'x3'];
      const nz = () => pick([-3, -2, -1, 1, 2, 3, 4, 5]);
      const c = Array.from({ length: n }, nz);
      const A = Array.from({ length: m }, () => Array.from({ length: n }, () => (Math.random() < 0.2 ? 0 : nz())));
      const b = Array.from({ length: m }, () => rnd(1, 12));
      const rel = A.map(() => pick(['≤', '≥', '=']));
      const sg = names.map(() => pick(['≥ 0', '≥ 0', '≤ 0', 'libre']));
      // max : contrainte ≤ → u ≥ 0, ≥ → u ≤ 0 ; variable ≥ 0 → contrainte duale ≥
      // min : contrainte ≥ → u ≥ 0, ≤ → u ≤ 0 ; variable ≥ 0 → contrainte duale ≤
      const uSign = rel.map((r) => (r === '=' ? 'libre' : (r === '≤') === max ? '≥ 0' : '≤ 0'));
      const cRel = sg.map((s) => (s === 'libre' ? '=' : (s === '≥ 0') === max ? '≥' : '≤'));
      const un = A.map((_, i) => 'u' + (i + 1));
      const dualCons = names.map((x, j) => `${linExpr(A.map((row) => row[j]), un)} ${cRel[j]} ${c[j]}`);
      return {
        raw: { max, c, A, b, rel, sg, uSign, cRel, names, un },
        prompt: `Primal :<div class="pl-box mono">${max ? 'max' : 'min'} ${linExpr(c, names)}<br>${A.map((row, i) => `${i ? '<span style="visibility:hidden">s.c.</span>' : 's.c.'} ${linExpr(row, names)} ${rel[i]} ${b[i]}`).join('<br>')}<br>${names.map((x, j) => (sg[j] === 'libre' ? `${x} libre` : `${x} ${sg[j]}`)).join(', ')}</div>Écrire le dual (D) : variables u1..u${m} associées aux contraintes, une contrainte duale par variable primale.`,
        fields: [
          ...un.map((u, i) => ({ k: u, label: `Signe de ${u} (contrainte ${i + 1})`, type: 'choice', options: ['≥ 0', '≤ 0', 'libre'] })),
          ...names.map((x, j) => ({ k: 'c' + j, label: `Contrainte duale associée à ${x}`, type: 'choice', options: ['≥', '≤', '='] }))
        ],
        expected: Object.fromEntries([...un.map((u, i) => [u, uSign[i]]), ...names.map((x, j) => ['c' + j, cRel[j]])]),
        solution: [
          max ? 'Primal en max : le dual est un min. Contrainte ≤ donne u ≥ 0, contrainte ≥ donne u ≤ 0 (signe contraire), égalité donne u libre. Variable ≥ 0 donne une contrainte duale ≥, variable ≤ 0 donne ≤, variable libre donne =.'
            : 'Primal en min : le dual est un max. Contrainte ≥ donne u ≥ 0, contrainte ≤ donne u ≤ 0, égalité donne u libre. Variable ≥ 0 donne une contrainte duale ≤, variable ≤ 0 donne ≥, variable libre donne =.',
          `(D) : ${max ? 'min' : 'max'} ${linExpr(b, un)}`,
          ...dualCons.map((s, j) => `Colonne de ${names[j]} : ${s}`),
          un.map((u, i) => (uSign[i] === 'libre' ? `${u} libre` : `${u} ${uSign[i]}`)).join(', ') + '.'
        ]
      };
    }
  },
  {
    id: 'sadrelax', titre: 'Sac à dos : encadrement', theme: 'Sac à dos 0-1', icon: 'layers',
    desc: 'Relaxation continue (Dantzig), majorant entier et minorant glouton du cours.',
    gen() {
      const { items, b, order } = knapInstance(7);
      const R = dantzig(order, b);
      const G = greedy(order, b, R);
      const maj = Math.floor(qv(R.val) + 1e-9);
      return {
        raw: { items, b, order, R, G, maj },
        prompt: `Prétraitement du sac à dos 0-1 :${knapHtml(items, b)}`,
        fields: [
          { k: 'v', label: 'Valeur de la relaxation continue', ph: 'ex. 65,5', num: true, tol: 0.002, disp: `${qs(R.val)} (≈ ${fmt(qv(R.val))})` },
          { k: 'maj', label: 'Majorant entier de v(P)', ph: 'entier' },
          { k: 'g', label: 'Valeur de la solution gloutonne', ph: 'entier' }
        ],
        expected: { v: qv(R.val), maj: String(maj), g: String(G.val) },
        solution: [
          ratioLine(order),
          `On remplit dans cet ordre : ${R.C.map((x) => 'x' + x.j).join(', ')} entrent à 1, capacité résiduelle ${R.rest}. L’objet critique est x${R.s.j} (a = ${R.s.a}) : x${R.s.j} = ${R.rest}/${R.s.a}.`,
          `v(relaxation) = ${R.C.reduce((s, x) => s + x.c, 0)} + ${R.s.c} × ${qs(R.frac)} = ${qs(R.val)} ≈ ${fmt(qv(R.val))}. Les données sont entières : v(P) ≤ ${maj}.`,
          `Glouton : on garde ${R.C.map((x) => 'x' + x.j).join(', ')}, on met x${R.s.j} à 0, puis on complète dans l’ordre des ratios. ${G.steps.join(' ; ') || 'Aucun objet ne rentre'}.`,
          `Solution gloutonne de valeur ${G.val}, donc ${G.val} ≤ v(P) ≤ ${maj}.`
        ]
      };
    }
  },
  {
    id: 'sadfix', titre: 'Sac à dos : fixation de variables', theme: 'Sac à dos 0-1', icon: 'target',
    desc: 'Forcer une variable à l’opposé de sa valeur dans la relaxation et comparer au minorant.',
    gen() {
      const { items, b, order } = knapInstance(7);
      const R = dantzig(order, b);
      const G = greedy(order, b, R);
      const inC = R.C.map((x) => x.j);
      const cands = order.filter((x) => x !== R.s);
      const it = pick(cands);
      const at1 = inC.includes(it.j);
      let bound;
      if (at1) bound = dantzig(order, b, new Set([it.j])).val;
      else bound = qadd(Q(it.c), dantzig(order, b - it.a, new Set([it.j])).val);
      const fix = qv(bound) <= G.val + 1e-9;
      return {
        raw: { items, b, order, R, G, it, at1, bound, fix },
        prompt: `Sac à dos 0-1 :${knapHtml(items, b)}Minorant (glouton) : v = ${G.val}. Dans la relaxation continue, x${it.j} vaut ${at1 ? 1 : 0}. On tente de fixer x${it.j} à ${at1 ? 1 : 0}.`,
        fields: [
          { k: 'v', label: `Valeur de la relaxation avec x${it.j} = ${at1 ? 0 : 1}`, ph: 'nombre', num: true, tol: 0.002, disp: `${qs(bound)} (≈ ${fmt(qv(bound))})` },
          { k: 'f', label: `Peut-on fixer x${it.j} à ${at1 ? 1 : 0} ?`, type: 'choice', options: ['oui', 'non'] }
        ],
        expected: { v: qv(bound), f: fix ? 'oui' : 'non' },
        solution: [
          ratioLine(order),
          at1 ? `On suppose x${it.j} = 0 : on refait la relaxation de Dantzig sans l’objet ${it.j}.` : `On suppose x${it.j} = 1 : on gagne ${it.c}, il reste une capacité de ${b - it.a} pour la relaxation des autres objets.`,
          `Majorant obtenu : ${qs(bound)} ≈ ${fmt(qv(bound))}.`,
          fix ? `${fmt(qv(bound))} ≤ ${G.val} : aucune solution strictement meilleure que le minorant n’a x${it.j} = ${at1 ? 0 : 1}. On fixe x${it.j} = ${at1 ? 1 : 0}.`
            : `${fmt(qv(bound))} > ${G.val} : on ne peut rien conclure, x${it.j} reste libre (échec de la tentative de fixation).`
        ]
      };
    }
  },
  {
    id: 'sadpd', titre: 'Sac à dos : programmation dynamique', theme: 'Programmation dynamique', icon: 'chart',
    desc: 'Construire fl(y) colonne par colonne (version 0-1 ou variables entières).',
    gen() {
      const n = 4, entier = Math.random() < 0.4;
      const c = Array.from({ length: n }, () => rnd(1, 8));
      const a = Array.from({ length: n }, () => rnd(1, 5));
      const b = rnd(5, 9);
      const f = [Array.from({ length: b + 1 }, (_, y) => (entier ? c[0] * Math.floor(y / a[0]) : (y >= a[0] ? c[0] : 0)))];
      for (let l = 1; l < n; l++) {
        const col = [];
        for (let y = 0; y <= b; y++) {
          if (y < a[l]) col.push(f[l - 1][y]);
          else col.push(Math.max(f[l - 1][y], c[l] + (entier ? col[y - a[l]] : f[l - 1][y - a[l]])));
        }
        f.push(col);
      }
      const names = c.map((_, j) => 'x' + (j + 1));
      return {
        raw: { c, a, b, f, entier },
        prompt: `<div class="pl-box mono">max ${linExpr(c, names)}<br>s.c. ${linExpr(a, names)} ≤ ${b}<br>${entier ? 'xj ∈ ℕ (entiers non bornés)' : 'xj ∈ {0, 1}'}</div>Calculer les fonctions knapsack fl(y) pour y = 0..${b}.`,
        fields: [
          { k: 'f3', label: `f3(${b})`, ph: 'entier' },
          { k: 'f4', label: `v(K) = f4(${b})`, ph: 'entier' }
        ],
        expected: { f3: String(f[2][b]), f4: String(f[3][b]) },
        solution: [
          entier ? 'Version 2 (variables entières) : f1(y) = c1 ⌊y/a1⌋ puis fl(y) = fl−1(y) si y < al, sinon max{fl−1(y), cl + fl(y − al)} (on reste sur la même colonne).'
            : 'Version 0-1 : f1(y) = c1 si y ≥ a1, 0 sinon, puis fl(y) = fl−1(y) si y < al, sinon max{fl−1(y), cl + fl−1(y − al)}.',
          `<div class="tab-wrap"><table class="tab-simplex"><tr><th>y</th>${f.map((_, l) => `<th>f${l + 1}</th>`).join('')}</tr>${Array.from({ length: b + 1 }, (_, y) => `<tr><td>${y}</td>${f.map((col) => `<td>${col[y]}</td>`).join('')}</tr>`).join('')}</table></div>`,
          `Complexité O(nb) : pseudo-polynomiale. v(K) = ${f[3][b]}.`
        ]
      };
    }
  },
  {
    id: 'sensb', titre: 'Sensibilité d’un second membre', theme: 'Post-optimisation', icon: 'flag',
    desc: 'Créneau de variation de al pour lequel la base optimale reste réalisable.',
    gen() {
      const vals = [Q(-2), Q(-1), Q(-1, 2), Q(-1, 3), Q(1, 5), Q(1, 2), Q(1), Q(2), Q(3, 2), Q(0)];
      for (;;) {
        const m = 3;
        const t = Array.from({ length: m }, () => Q(rnd(1, 15)));
        const col = Array.from({ length: m }, () => pick(vals));
        const pos = col.filter((v) => qv(v) > 0).length, neg = col.filter((v) => qv(v) < 0).length;
        if (!pos || !neg) continue;
        const l = rnd(1, 3), al = rnd(5, 40);
        let lo = null, hi = null;
        const lines = [];
        col.forEach((v, i) => {
          if (!v.n) { lines.push(`ligne ${i + 1} : coefficient nul, aucune condition`); return; }
          const r = qdiv(qneg(t[i]), v);
          if (qv(v) > 0) { lines.push(`ligne ${i + 1} : ${qs(t[i])} + λ × ${qs(v)} ≥ 0 donne λ ≥ ${qs(r)}`); if (!lo || qv(r) > qv(lo)) lo = r; }
          else { lines.push(`ligne ${i + 1} : ${qs(t[i])} + λ × (${qs(v)}) ≥ 0 donne λ ≤ ${qs(r)}`); if (!hi || qv(r) < qv(hi)) hi = r; }
        });
        return {
          raw: { t, col, l, al, lo, hi },
          prompt: `À l’optimum, les variables de base valent t = (${t.map(qs).join(', ')}). La colonne ${l} de (A<sub>I</sub>)<sup>−1</sup> vaut (${col.map(qs).join(', ')}). Le second membre a${l} vaut ${al}. On pose a${l}(λ) = a${l} + λ.`,
          fields: [
            { k: 'lo', label: 'λ minimal', ph: 'ex. −10', num: true, tol: 0.001, disp: qs(lo) },
            { k: 'hi', label: 'λ maximal', ph: 'ex. 22', num: true, tol: 0.001, disp: qs(hi) }
          ],
          expected: { lo: qv(lo), hi: qv(hi) },
          solution: [
            'La base reste optimale (d ne dépend pas de a) ; elle reste réalisable tant que t(λ) = t + λ × colonne ≥ 0.',
            ...lines,
            `Donc ${qs(lo)} ≤ λ ≤ ${qs(hi)}, soit ${qs(qadd(Q(al), lo))} ≤ a${l} ≤ ${qs(qadd(Q(al), hi))}.`
          ]
        };
      }
    }
  }
);
