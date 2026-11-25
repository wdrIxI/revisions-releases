// Simulations à manipuler
const sx = (w, h, b) => `<figure class="td-fig simu"><svg viewBox="0 0 ${w} ${h}" role="img">${b}</svg></figure>`;
const st = (x, y, s, o = 'class="nt"') => `<text x="${x}" y="${y}" ${o}>${s}</text>`;

const SIMUS = [
  {
    id: 'gbn', c: 'reseaux', t: 'Trame perdue', d: 'Go-Back-N ou Selective Repeat : qu’est-ce qui est renvoyé ?',
    init: () => ({ mode: 'gbn', lost: 2 }),
    view(s) {
      // Fenêtre de 5 trames, une perdue ; puis renvoi
      const y = (i) => 44 + i * 30, A = 110, B = 420; let b = st(A, 22, 'Émetteur') + st(B, 22, 'Récepteur') + `<line class="ax" x1="${A}" y1="30" x2="${A}" y2="410"/><line class="ax" x1="${B}" y1="30" x2="${B}" y2="410"/>`;
      const send = (n, i, lost, note, cl) => {
        const y0 = y(i), x1 = lost ? (A + B) / 2 : B, y1 = lost ? y0 + 22 : y0 + 44;
        b += `<line class="${lost ? 'ob' : 'dr'}" x1="${A}" y1="${y0}" x2="${x1}" y2="${y1}"/>` + st(A - 34, y0 + 5, n) + (lost ? st(x1 + 14, y1 + 6, 'perdue', 'class="lb"') : st(B + 10, y1 + 4, note, `class="${cl || 'ln'}"`));
      };
      const re = s.lost < 0 ? [] : s.mode === 'gbn' ? [0, 1, 2, 3, 4].filter((n) => n >= s.lost) : [s.lost];
      for (let n = 0; n < 5; n++) send(n, n, n === s.lost, s.lost < 0 || n < s.lost ? 'acceptée' : s.mode === 'gbn' ? 'jetée' : 'gardée');
      re.forEach((n, k) => send(n, 6 + k, false, 'acceptée'));
      if (re.length) b += st(A - 34, y(5) + 12, 'timeout', 'class="lb"');
      return `<div class="row simu-c"><div class="seg">${[['gbn', 'Go-Back-N'], ['sr', 'Selective Repeat']].map(([k, l]) => `<button class="${s.mode === k ? 'on' : ''}" data-act="simu" data-k="mode" data-val="${k}">${l}</button>`).join('')}</div>
        <div class="seg">${[-1, 0, 1, 2, 3, 4].map((n) => `<button class="${s.lost === n ? 'on' : ''}" data-act="simu" data-k="lost" data-val="${n}">${n < 0 ? 'Aucune perte' : `Perdre ${n}`}</button>`).join('')}</div></div>
        ${sx(560, 420, b)}<p>${s.lost < 0 ? 'Tout arrive : rien à renvoyer.' : s.mode === 'gbn' ? `Le récepteur n’accepte que dans l’ordre : il jette ce qui suit la trame ${s.lost}. L’émetteur renvoie ${re.length} trame${re.length > 1 ? 's' : ''}.` : `Le récepteur garde les trames suivantes. L’émetteur renvoie seulement la trame ${s.lost}.`}</p>`;
    }
  },
  {
    id: 'route', c: 'reseaux', t: 'Le voyage d’un paquet', d: 'Adresses MAC, adresses IP et TTL à chaque saut',
    init: () => ({ i: 0, nat: 0 }),
    view(s) {
      const N = [['PC', '10.0.0.5', 'aa:01'], ['R1', '10.0.0.1 / 81.2.3.4', 'bb:01 / bb:02'], ['R2', '81.2.3.9 / 94.0.0.1', 'cc:01 / cc:02'], ['Serveur', '94.0.0.80', 'dd:01']], mac = [['aa:01', 'bb:01'], ['bb:02', 'cc:01'], ['cc:02', 'dd:01']], i = Math.min(2, s.i);
      let b = N.map(([n, ip], k) => `${k < 3 ? `<line class="${k === i ? 'dr' : 'gr'}" x1="${80 + k * 180}" y1="70" x2="${260 + k * 180}" y2="70"/>` : ''}`).join('') + N.map(([n, ip, m], k) => `<circle class="nd" cx="${80 + k * 180}" cy="70" r="26"/>${st(80 + k * 180, 75, n)}${st(80 + k * 180, 120, ip)}${st(80 + k * 180, 138, m)}`).join('') + `<rect class="bn" x="${146 + i * 180}" y="38" width="48" height="24" rx="5"/>${st(170 + i * 180, 55, 'paquet')}`;
      const src = s.nat && i > 0 ? '81.2.3.4' : '10.0.0.5';
      return `<div class="row simu-c"><button class="btn" data-act="simu" data-k="i" data-val="${Math.max(0, i - 1)}" ${i ? '' : 'disabled'}>Lien précédent</button><button class="btn primary" data-act="simu" data-k="i" data-val="${i + 1}" ${i < 2 ? '' : 'disabled'}>Lien suivant</button><div class="seg">${['Sans NAT', 'NAT sur R1'].map((l, k) => `<button class="${s.nat === k ? 'on' : ''}" data-act="simu" data-k="nat" data-val="${k}">${l}</button>`).join('')}</div></div>
        ${sx(700, 160, b)}${Td.block({ t: 'tab', h: ['Champ', 'Source', 'Destination', 'Ce qui se passe'], r: [['Trame (MAC)', mac[i][0], mac[i][1], 'refaite à chaque lien'], ['Paquet (IP)', src, '94.0.0.80', s.nat ? (i ? 'source remplacée par R1' : 'adresse privée') : 'ne change pas'], ['TTL', String(64 - i), '', 'baisse de 1 à chaque routeur'], ['Port', s.nat && i ? '40001' : '51000', '80', s.nat && i ? 'changé par le PAT' : 'ne change pas']] })}`;
    }
  },
  {
    id: 'bfs', c: 'algo', t: 'Bellman-Ford animé', d: 'Relâche les arêtes une par une',
    init: () => ({ k: 0 }),
    view(s) {
      const P = { A: [60, 130], B: [220, 50], C: [220, 210], D: [390, 50], E: [390, 210] }, E = [['D', 'E', 3], ['B', 'D', 5], ['C', 'B', -2], ['C', 'E', 7], ['A', 'B', 4], ['A', 'C', 2]], d = { A: 0, B: Infinity, C: Infinity, D: Infinity, E: Infinity };
      let log = '', cur = null, chg = false, lastChg = -1;
      const tot = Math.min(s.k, E.length * 4);
      for (let i = 0; i < tot; i++) { cur = E[i % E.length]; const [u, v, w] = cur; chg = d[u] + w < d[v]; log = `Tour ${Math.floor(i / E.length) + 1}, arête ${u} → ${v} (${w}) : ${d[u] === Infinity ? `${u} est à ∞, rien à faire` : `${d[u]} + ${w} = ${d[u] + w} ${chg ? `< ${d[v] === Infinity ? '∞' : d[v]}, on met à jour` : `n’améliore pas ${d[v]}`}`}.`; if (chg) { d[v] = d[u] + w; lastChg = i; } }
      const end = tot - 1 - lastChg >= E.length || tot >= E.length * 4;
      const b = E.map((e) => { const [x1, y1] = P[e[0]], [x2, y2] = P[e[1]]; return `<line class="${e === cur ? 'ob2' : 'ar'}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polygon class="fp" points="${(() => { const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, X = x2 - ux * 26, Y = y2 - uy * 26; return `${X},${Y} ${X - ux * 11 - uy * 6},${Y - uy * 11 + ux * 6} ${X - ux * 11 + uy * 6},${Y - uy * 11 - ux * 6}`; })()}"/>`; }).join('')
        + E.map((e) => { const [x1, y1] = P[e[0]], [x2, y2] = P[e[1]]; return st((x1 + x2) / 2, (y1 + y2) / 2 - 4, e[2], 'class="lb"'); }).join('')
        + Object.entries(P).map(([n, [x, y]]) => `<circle class="nd" cx="${x}" cy="${y}" r="24"/>${st(x, y - 2, n)}${st(x, y + 14, d[n] === Infinity ? '∞' : d[n])}`).join('');
      return `<div class="row simu-c"><button class="btn primary" data-act="simu" data-k="k" data-val="${tot + 1}" ${end ? 'disabled' : ''}>Arête suivante</button><button class="btn" data-act="simu" data-k="k" data-val="${(Math.floor(tot / E.length) + 1) * E.length}" ${end ? 'disabled' : ''}>Finir le tour</button><button class="btn ghost" data-act="simu" data-k="k" data-val="0">Recommencer</button></div>
        ${sx(460, 260, b)}<p>${log || 'Départ : 0 pour A, ∞ ailleurs. Les arêtes sont traitées dans un ordre volontairement mauvais.'}</p>${end && tot ? '<p>Un tour complet sans changement : c’est fini.</p>' : ''}`;
    }
  },
  {
    id: 'lpg', c: 'opti', t: 'Simplexe en image', d: 'Change l’objectif et regarde le sommet optimal sauter',
    init: () => ({ a: 3, b: 5 }),
    view(s) {
      const V = [[0, 0], [5, 0], [3.6, 4.2], [0, 6]], z = V.map(([x, y]) => s.a * x + s.b * y), m = Math.max(...z), best = V.filter((_, i) => Math.abs(z[i] - m) < 1e-9);
      const X = (v) => 40 + v * 60, Y = (v) => 400 - v * 50; let b = `<polygon class="pg" points="${V.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}"/><line class="ax" x1="40" y1="400" x2="440" y2="400"/><line class="ax" x1="40" y1="400" x2="40" y2="60"/>`;
      b += `<line class="dr" x1="${X(5)}" y1="${Y(0)}" x2="${X(2.8)}" y2="${Y(6.6)}"/><line class="dr" x1="${X(0)}" y1="${Y(6)}" x2="${X(6)}" y2="${Y(3)}"/>`;
      // Droite z = m, coupée aux bords
      if (s.a || s.b) { const pts = []; if (s.b) { pts.push([0, m / s.b], [6.6, (m - 6.6 * s.a) / s.b]); } else pts.push([m / s.a, 0], [m / s.a, 6.6]); b += `<line class="ob" x1="${X(pts[0][0])}" y1="${Y(pts[0][1])}" x2="${X(pts[1][0])}" y2="${Y(pts[1][1])}"/>`; }
      b += V.map(([x, y], i) => `<circle class="${best.includes(V[i]) ? 'fp' : 'pt'}" cx="${X(x)}" cy="${Y(y)}" r="${best.includes(V[i]) ? 8 : 5}"/>${st(X(x) + 10, Y(y) - 8, `z = ${String(Math.round(z[i] * 10) / 10).replace('.', ',')}`, 'class="lg"')}`).join('');
      const sl = (k, l) => `<label class="simu-s"><span>${l} = ${s[k]}</span><input type="range" min="0" max="9" step="1" value="${s[k]}" data-simu="${k}"></label>`;
      return `<div class="row simu-c">${sl('a', 'c1')}${sl('b', 'c2')}</div>${Td.block({ t: 'pl', l: [`max ${s.a}x_1 + ${s.b}x_2`, 's.c. x_1 + 2x_2 ≤ 12', '     3x_1 + x_2 ≤ 15', '     x_1, x_2 ≥ 0'] })}
        ${sx(480, 430, `<clipPath id="lpc"><rect x="30" y="50" width="440" height="360"/></clipPath><g clip-path="url(#lpc)">${b}</g>`)}<p>${best.length > 1 ? 'La droite de l’objectif est parallèle à une contrainte : toute l’arête est optimale.' : `Optimum en (${best[0].map((v) => String(v).replace('.', ',')).join(' ; ')}), z = ${String(Math.round(m * 10) / 10).replace('.', ',')}. C’est un sommet : c’est pour cela que le simplexe ne visite que les coins.`}</p>`;
    }
  }
];

VIEWS.simu = () => {
  const s = SIMUS.find((x) => x.id === view.id);
  if (!view.s) view.s = s.init();
  return `<div class="page tdx"><div class="session" style="max-width:51.25rem"><div class="sess-top"><button class="btn ghost sm" data-act="go" data-v="ateliers"><span class="ico" data-i="arrowL"></span>Ateliers</button></div>
    <div class="tdx-head"><h1>${s.t}</h1><p class="sub">${s.d}</p></div><section class="panel tdq">${s.view(view.s)}</section></div></div>`;
};
Object.assign(ACTIONS, {
  simuGo: (el) => go('simu', { id: el.dataset.id }),
  simu: (el) => { const v = el.dataset.val; view.s[el.dataset.k] = Number.isNaN(Number(v)) ? v : Number(v); keepScroll(); }
});
document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.simu;
  if (!k) return;
  view.s[k] = Number(e.target.value); keepScroll();
  const n = document.querySelector(`[data-simu="${k}"]`); if (n) n.focus();
});
