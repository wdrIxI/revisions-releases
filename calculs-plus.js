// Seize calculs ajoutés : générateur, résolution pas à pas, idée et méthode au même endroit
(() => {
  const S = (s, o = {}) => ({ s: typeof s === 'function' ? s : () => s, ...o, v: o.v === undefined ? undefined : String(o.v), bad: (o.bad || []).map(String).filter((x, i, l) => x !== String(o.v) && l.indexOf(x) === i) });
  const T = (h, r) => ({ t: 'tab', h: h.map(String), r: r.map((l) => l.map(String)) });
  const P = (...l) => ({ t: 'pl', l });
  const f = (x, d = 3) => String(Number(x.toFixed(d))).replace('.', ',').replace('-', '−');
  const nb = (v) => [v + 1, v > 1 ? v - 1 : v + 2, v + 3];
  const others = (v, l) => l.filter((x) => x !== v);
  const box = (l) => `<div class="pl-box mono">${l.join('<br>')}</div>`;
  const mini = (r) => `<div class="mini-table">${r.map(([a, b]) => `<div><span class="mono">${a}</span><span>${b}</span></div>`).join('')}</div>`;
  const tabl = (st) => T(['Base', ...st.names, 't'], [...st.T.map((r, i) => [st.names[st.base[i]], ...r.map(qs), qs(st.t[i])]), ['(d, −z)', ...st.d.map(qs), qs(qneg(st.z))]]);
  const qn = (v) => Q(Math.round(v * 720720), 720720);
  // Ajoute un calcul : définition, cours, chapitre, thème de TD, idée, but, méthode, piège, pas à pas
  const add = (t, ch, td, idee, but, met, piege, pas) => {
    TRAINERS.push(t); PAS[t.id] = pas; IDEES[t.id] = idee; TUTOS[t.id] = { but, met, piege }; TR_CH[t.id] = ch; if (td) TR_TD[t.id] = td;
  };

  /* ---------- Réseaux ---------- */
  add({
    id: 'vlsm', titre: 'Découpage VLSM', theme: 'Couche réseau', icon: 'layers', desc: 'Découper un /24 en sous-réseaux de tailles différentes, du plus grand au plus petit.',
    gen(d) {
      const R = { 25: [63, 126], 26: [31, 62], 27: [15, 30], 28: [7, 14], 29: [3, 6] };
      const ps = pick(d === 0 ? [[25, 26], [26, 27]] : d === 2 ? [[26, 26, 27, 28], [25, 27, 27, 28], [26, 27, 28, 29]] : [[25, 26, 27], [25, 27, 28], [26, 26, 27]]), x = rnd(0, 255);
      const needs = ps.map((p) => ({ p, h: Math.random() < 0.3 ? R[p][1] : rnd(...R[p]) })).sort((a, b) => b.h - a.h);
      let at = 0;
      needs.forEach((n, i) => { n.net = at; at += 2 ** (32 - n.p); n.name = 'ABCD'[i]; });
      const shown = [...needs].sort(() => Math.random() - 0.5);
      return {
        raw: { needs, x },
        prompt: `Réseau <span class="mono hl">192.168.${x}.0/24</span> à découper, en plaçant le plus grand d’abord, sans trou.${mini(shown.map((n) => [`Réseau ${n.name}`, `${n.h} hôtes, passerelle comprise`]))}`,
        fields: needs.map((n) => ({ k: n.name, label: `Réseau ${n.name} (adresse/préfixe)`, ph: 'a.b.c.d/p' })),
        expected: Object.fromEntries(needs.map((n) => [n.name, `192.168.${x}.${n.net}/${n.p}`]))
      };
    }
  }, 'reseau', 'IPv4', 'Chaque réseau prend le plus petit bloc qui le contient. En commençant par le plus grand, les blocs tombent toujours au bon endroit et ne se chevauchent pas.',
  'Donner à chaque réseau un bloc juste assez grand.', ['Trie les besoins du plus grand au plus petit.', 'Pour h hôtes : le plus petit k tel que 2^k − 2 ≥ h. Préfixe = 32 − k.', 'Place le bloc à la suite du précédent : prochain début = début + 2^k.'], 'N’oublie pas les deux adresses réservées : 31 hôtes ne rentrent pas dans un /27.',
  ({ needs, x }) => [S(`Ordre décroissant : ${needs.map((n) => `${n.name} (${n.h})`).join(', ')}.`, { why: 'Un grand bloc doit commencer sur un multiple de sa taille : c’est automatique si on place les grands d’abord.' }),
    ...needs.flatMap((n) => {
      const k = 32 - n.p;
      return [
        S((v) => `${n.name} : ${n.h} hôtes + 2 adresses réservées = ${n.h + 2}. Le plus petit k avec 2^k ≥ ${n.h + 2} est ${v} (2^{${k}} = ${2 ** k}).`, { v: k, bad: [k + 1, k - 1], ask: `Bits d’hôte pour ${n.h} hôtes`, why: 'On retire toujours l’adresse réseau et le broadcast.' }),
        S((v) => `Préfixe : 32 − ${k}, donc ${v}.`, { v: `/${n.p}`, bad: [`/${n.p + 1}`, `/${n.p - 1}`], opt: [n.p - 1, n.p, n.p + 1].map((p) => '/' + p), ask: `Préfixe de ${n.name}`, why: 'Le préfixe compte les bits restants.' }),
        S((v) => `Il commence où le précédent finit : ${v}. Le suivant commencera à .${n.net + 2 ** k}.`, { v: `192.168.${x}.${n.net}/${n.p}`, k: n.name, bad: [`192.168.${x}.${n.net + 2 ** k}/${n.p}`, `192.168.${x}.${n.net}/${n.p + 1}`], ask: `Réseau ${n.name} (adresse/préfixe)`, why: `Le bloc fait ${2 ** k} adresses.` })
      ];
    })]);

  add({
    id: 'agreg', titre: 'Agrégation de routes', theme: 'Couche réseau', icon: 'layers', desc: 'Remplacer plusieurs réseaux contigus par une seule route.',
    gen(d) {
      const k = d === 0 ? 1 : d === 1 ? 2 : pick([1, 2, 3]), n = 2 ** k, p = d === 2 ? pick([24, 23]) : 24, stp = p === 24 ? 1 : 2, start = rnd(0, 256 / (n * stp) - 1) * n * stp, a = pick([10, 172, 81]), b = rnd(0, 255);
      const nets = Array.from({ length: n }, (_, i) => `${a}.${b}.${start + i * stp}.0/${p}`);
      return {
        raw: { nets, k, n, p, start, stp, a, b },
        prompt: `Réseaux à agréger :${mini([...nets].sort(() => Math.random() - 0.5).map((x) => [x, '']))}`,
        fields: [{ k: 'net', label: 'Adresse de l’agrégat', ph: 'a.b.c.d' }, { k: 'p', label: 'Préfixe (sans /)', ph: 'ex. 22' }],
        expected: { net: `${a}.${b}.${start}.0`, p: String(p - k) }
      };
    }
  }, 'reseau', 'IPv4', 'Si plusieurs réseaux se suivent et ont le même début en binaire, une seule route plus courte les couvre tous.',
  'Trouver le préfixe qui couvre exactement ces réseaux.', ['Compte les réseaux : il en faut 2^k de même taille, contigus.', 'Enlève k bits au préfixe.', 'L’adresse est celle du premier réseau, qui doit être un multiple de la taille totale.'], 'Deux réseaux contigus ne s’agrègent pas toujours : 10.1.5.0 et 10.1.6.0 ne forment pas un /23.',
  ({ nets, k, n, p, start, stp, a, b }) => [
    S((v) => `Il y a ${n} réseaux = 2^k avec k = ${v}.`, { v: k, bad: nb(k), ask: 'Valeur de k', why: 'Chaque bit retiré au préfixe double la taille.' }),
    S((v) => `Taille totale dans le 3e octet : ${n} × ${stp} = ${v}.`, { v: n * stp, bad: [n * stp * 2, n * stp + 1], ask: 'Taille totale (3e octet)', why: p === 24 ? 'Un /24 occupe une valeur du 3e octet.' : 'Un /23 occupe deux valeurs du 3e octet.', b: T(['3e octet', 'en binaire'], nets.map((x) => { const o = Number(x.split('.')[2]); return [o, o.toString(2).padStart(8, '0')]; })) }),
    S((v) => `Le plus petit 3e octet est ${start}, multiple de ${n * stp} : l’agrégat commence à ${v}.`, { v: `${a}.${b}.${start}.0`, k: 'net', bad: [`${a}.${b}.${(start + stp) % 256}.0`, `${a}.${b}.0.${start + 1}`], ask: 'Adresse de l’agrégat', why: 'Un bloc commence toujours sur un multiple de sa taille.' }),
    S((v) => `Préfixe : ${p} − ${k} = ${v}.`, { v: p - k, k: 'p', bad: [p + k, p - k + 1, p - k - 1], ask: 'Préfixe', why: 'Les k derniers bits du réseau changent : ils passent dans la partie hôte.' })
  ]);

  add({
    id: 'gbn', titre: 'Perte : GBN ou SR', theme: 'Couche liaison', icon: 'rotate', desc: 'Trames renvoyées par Go-Back-N et par Selective Repeat après une perte.',
    gen() {
      const n = rnd(4, 8), l = rnd(0, n - 2);
      return {
        raw: { n, l },
        prompt: `Fenêtre envoyée : trames <span class="mono hl">0 à ${n - 1}</span>. La trame <span class="hl">${l}</span> est perdue, les autres arrivent. Aucune autre perte.`,
        fields: [{ k: 'g', label: 'Trames renvoyées en Go-Back-N', ph: 'ex. 2,3,4' }, { k: 'j', label: 'Trames jetées par le récepteur GBN (nombre)', ph: 'nombre' }, { k: 's', label: 'Trames renvoyées en Selective Repeat', ph: 'ex. 2' }],
        expected: { g: Array.from({ length: n - l }, (_, i) => l + i).join(','), j: String(n - l - 1), s: String(l) }
      };
    }
  }, 'liaison', null, 'Le récepteur Go-Back-N est exigeant : il ne prend que la trame attendue. Celui de Selective Repeat range les suivantes en attendant la manquante.',
  'Savoir ce qui est renvoyé après une perte.', ['Avant la perte : tout est accepté.', 'Go-Back-N : les trames après la perte sont jetées, on renvoie la perdue et toutes les suivantes.', 'Selective Repeat : les suivantes sont gardées, on renvoie seulement la perdue.'], 'En Go-Back-N, les trames suivantes sont bien arrivées, mais elles sont quand même renvoyées.',
  ({ n, l }) => {
    const g = Array.from({ length: n - l }, (_, i) => l + i);
    return [
      S((v) => `Avant la perte, ${v} trame${l > 1 ? 's sont acceptées' : ' est acceptée'}${l ? ` (0 à ${l - 1})` : ''}.`, { v: l, bad: nb(l), ask: 'Trames acceptées avant la perte', why: 'Elles arrivent dans l’ordre.' }),
      S((v) => `Le récepteur attend ${l} : il jette les trames ${l + 1} à ${n - 1}, soit ${v}.`, { v: n - l - 1, k: 'j', bad: nb(n - l - 1), ask: 'Trames jetées en GBN', why: 'GBN n’accepte que la trame attendue.' }),
      S((v) => `Go-Back-N renvoie la perdue et toutes les suivantes : ${v}.`, { v: g.join(','), k: 'g', bad: [String(l), Array.from({ length: n }, (_, i) => i).join(',')], ask: 'Renvoi en Go-Back-N', why: 'Les suivantes ont été jetées, il faut les renvoyer.' }),
      S((v) => `Selective Repeat renvoie seulement la perdue : ${v}.`, { v: l, k: 's', bad: [g.join(',') === String(l) ? l + 1 : g.join(','), l + 1], ask: 'Renvoi en Selective Repeat', why: 'Les suivantes ont été gardées.' })
    ];
  });

  add({
    id: 'fen', titre: 'Fenêtre et ACK TCP', theme: 'Couche transport', icon: 'chart', desc: 'Slow start, données en vol et acquittement cumulatif.',
    gen() {
      const c0 = pick([1, 2, 4, 10]), k = rnd(2, 4), r = pick([8, 12, 20, 32, 64]), cw = c0 * 2 ** k, seq = rnd(1, 9) * 1000, len = pick([500, 1000, 1460]), n = rnd(3, 5), lost = rnd(1, n - 2);
      return {
        raw: { c0, k, r, cw, seq, len, n, lost },
        prompt: `cwnd = <span class="hl">${c0} MSS</span> au départ, slow start sans perte pendant <span class="hl">${k} RTT</span>, rwnd = <span class="hl">${r} MSS</span>.<br>Ensuite, ${n} segments de ${len} octets partent à partir de Seq = <span class="mono hl">${seq}</span>. Le segment n° <span class="hl">${lost + 1}</span> est perdu, les autres arrivent (sans SACK).`,
        fields: [{ k: 'cw', label: `cwnd après ${k} RTT (MSS)`, ph: 'nombre' }, { k: 'v', label: 'En vol au maximum (MSS)', ph: 'nombre' }, { k: 'ack', label: 'ACK renvoyé après le dernier segment', ph: 'numéro' }],
        expected: { cw: String(cw), v: String(Math.min(cw, r)), ack: String(seq + lost * len) }
      };
    }
  }, 'transport', null, 'L’émetteur accélère vite au début (il double à chaque aller-retour), mais il ne dépasse jamais ce que le récepteur peut recevoir. Et l’ACK dit toujours : « voilà le premier octet qui me manque ».',
  'Calculer ce qui part et ce qui est acquitté.', ['Slow start : cwnd double à chaque RTT.', 'En vol au maximum : min(cwnd, rwnd).', 'ACK = premier octet manquant, même si la suite est arrivée.'], 'L’ACK est cumulatif : il n’avance pas au-delà d’un trou.',
  ({ c0, k, r, cw, seq, len, n, lost }) => [
    ...Array.from({ length: k }, (_, i) => S((v) => `RTT ${i + 1} : ${c0 * 2 ** i} × 2 = ${v} MSS.`, { v: c0 * 2 ** (i + 1), ...(i === k - 1 ? { k: 'cw' } : {}), bad: [c0 * 2 ** i + 1, c0 * 2 ** (i + 1) + 2], ask: `cwnd après ${i + 1} RTT`, why: 'Chaque ACK reçu augmente cwnd d’un MSS : elle double en un RTT.' })),
    S((v) => `min(${cw}, ${r}) = ${v} MSS en vol au maximum.`, { v: Math.min(cw, r), k: 'v', bad: [Math.max(cw, r), cw + r], ask: 'Données en vol (MSS)', why: 'Le réseau (cwnd) et le récepteur (rwnd) imposent chacun une limite.' }),
    S((v) => `Le segment perdu commence à ${seq} + ${lost} × ${len} = ${v}.`, { v: seq + lost * len, bad: [seq + (lost + 1) * len, seq + lost * len - 1], ask: 'Premier octet du segment perdu', why: 'Seq numérote les octets.', b: T(['Segment', 'Octets', 'Reçu'], Array.from({ length: n }, (_, i) => [i + 1, `${seq + i * len} à ${seq + (i + 1) * len - 1}`, i === lost ? 'non' : 'oui'])) }),
    S((v) => `L’ACK reste au premier octet manquant : ${v}.`, { v: seq + lost * len, k: 'ack', bad: [seq + n * len, seq + (lost + 1) * len], ask: 'ACK renvoyé', why: 'Sans SACK, l’ACK ne dit rien des segments arrivés après le trou.' })
  ]);

  const LIG = {
    AMI: ['AMI (le premier 1 vaut +)', (bits) => { let s = -1; return bits.map((b) => (b ? (s = -s, s > 0 ? '+' : '-') : '0')); }, ['+', '0', '-'], (b) => (b ? 'Un 1 prend la polarité opposée au 1 précédent.' : 'Un 0 est un niveau nul.')],
    MLT: ['MLT-3 (niveau initial 0, cycle 0, +, 0, -)', (bits) => { let i = 0; const c = ['0', '+', '0', '-']; return bits.map((b) => { if (b) i = (i + 1) % 4; return c[i]; }); }, ['+', '0', '-'], (b) => (b ? 'Un 1 avance d’un cran dans le cycle 0, +, 0, -.' : 'Un 0 garde le niveau précédent.')],
    NRZI: ['NRZI (niveau initial L)', (bits) => { let h = false; return bits.map((b) => { if (b) h = !h; return h ? 'H' : 'L'; }); }, ['H', 'L'], (b) => (b ? 'Un 1 change l’état.' : 'Un 0 conserve l’état.')],
    MC: ['Manchester, convention du cours (0 = LH, 1 = HL)', (bits) => bits.map((b) => (b ? 'HL' : 'LH')), ['HL', 'LH'], (b) => (b ? '1 : de haut en bas.' : '0 : de bas en haut.')],
    MI: ['Manchester IEEE 802.3 (0 = HL, 1 = LH)', (bits) => bits.map((b) => (b ? 'LH' : 'HL')), ['HL', 'LH'], (b) => (b ? '1 : de bas en haut.' : '0 : de haut en bas.')]
  };
  add({
    id: 'ligne', titre: 'Codages en ligne', theme: 'Couche physique', icon: 'chart', desc: 'Coder une suite de bits en AMI, MLT-3, NRZI ou Manchester.',
    gen(d) {
      const c = pick(d === 0 ? ['MC', 'MI', 'NRZI'] : d === 1 ? ['AMI', 'NRZI'] : d === 2 ? ['MLT'] : Object.keys(LIG)), n = d === 0 ? 6 : 8, bits = Array.from({ length: n }, (_, i) => (i === 1 ? 1 : rnd(0, 1))), out = LIG[c][1](bits);
      return {
        raw: { c, bits, out },
        prompt: `Bits : <span class="mono hl">${bits.join('')}</span>. Codage : <span class="hl">${LIG[c][0]}</span>.`,
        fields: [{ k: 'o', label: 'Suite codée, sans espace', ph: { AMI: 'ex. 0+-0', MLT: 'ex. 0+0-', NRZI: 'ex. LHHL' }[c] || 'ex. HLLH' }],
        expected: { o: out.join('') }
      };
    }
  }, 'physique', 'Codage', 'Le récepteur doit retrouver les bits et l’horloge. Chaque codage est une règle simple appliquée bit par bit, parfois en se souvenant du niveau précédent.',
  'Traduire les bits en niveaux.', ['Relis la convention donnée : elle change d’un livre à l’autre.', 'Avance bit par bit en notant le niveau de fin.', 'AMI : les 1 alternent. MLT-3 et NRZI : seul un 1 fait changer. Manchester : une transition au milieu de chaque bit.'], 'En AMI on alterne à chaque 1 même s’il y a des 0 entre deux.',
  ({ c, bits, out }) => [...bits.map((b, i) => S((v) => `Bit ${i + 1} = ${b}${i ? ` (avant : ${out[i - 1]})` : ''} : ${v}.`, { v: out[i], opt: LIG[c][2], bad: others(out[i], LIG[c][2]), ask: `Niveau du bit ${i + 1} (valeur ${b})`, why: LIG[c][3](b) })),
    S((v) => `Suite complète : ${v}.`, { v: out.join(''), k: 'o', bad: [out.map((x) => ({ '+': '-', '-': '+', H: 'L', L: 'H', HL: 'LH', LH: 'HL' }[x] || x)).join('')], ask: 'Suite codée', why: 'On colle les niveaux dans l’ordre.' })]);

  /* ---------- Opti ---------- */
  add({
    id: 'dualsimp', titre: 'Simplexe dual : une itération', theme: 'Simplexe', icon: 'rotate', desc: 'Base optimale mais non réalisable : variable sortante, entrante et nouvelle valeur.',
    gen() {
      for (;;) {
        const n = rnd(2, 3), m = 2, c = Array.from({ length: n }, () => rnd(1, 8)), A = Array.from({ length: m }, () => Array.from({ length: n }, () => rnd(0, 5))), b = Array.from({ length: m }, () => rnd(3, 18));
        if (A.some((r) => r.every((v) => !v)) || b[0] === b[1]) continue;
        const st = simplexStart(c.map((v) => -v), A.map((r) => r.map((v) => -v)), b.map((v) => -v));
        st.d = st.d.map((v) => Q(v.n || 0, v.d)); st.T = st.T.map((r) => r.map((v) => Q(v.n || 0, v.d)));
        const r = qv(st.t[0]) < qv(st.t[1]) ? 0 : 1, cand = st.names.map((_, j) => j).filter((j) => qv(st.T[r][j]) < 0).map((j) => ({ j, q: qdiv(st.d[j], st.T[r][j]) })).sort((x, y) => qv(x.q) - qv(y.q));
        if (cand.length < 2 || qv(cand[0].q) === qv(cand[1].q)) continue;
        const s = cand[0].j, nx = simplexPivot(st, r, s), nm = c.map((_, j) => 'x' + (j + 1));
        return {
          raw: { st, r, s, nx, cand },
          prompt: `${box([`min ${linExpr(c, nm)}`, ...A.map((row, i) => `${i ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : 's.c. '}${linExpr(row, nm)} ≥ ${b[i]}`), `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${nm.join(', ')} ≥ 0`])}<div style="margin-top:0.625rem">Forme standard en max, contraintes multipliées par −1, base des variables d’écart :</div>${tableauHtml(st)}<div class="muted" style="margin-top:0.375rem">Sort la variable de base la plus négative ; entre celle du plus petit rapport d / T sur les T strictement négatifs de la ligne.</div>`,
          fields: [{ k: 'out', label: 'Variable sortante', type: 'choice', options: ['e1', 'e2'] }, { k: 'in', label: 'Variable entrante', type: 'choice', options: nm }, { k: 'z', label: 'Valeur de z (max) après le pivot', ph: 'ex. −12 ou −7/2', num: true, tol: 0.001, disp: qs(nx.z) }],
          expected: { out: st.names[st.base[r]], in: st.names[s], z: qv(nx.z) }
        };
      }
    }
  }, 'simplexe', 'Simplexe', 'Le primal reste dans le domaine et cherche l’optimum. Le dual est déjà « trop bon » : tous les coûts sont favorables, mais le point est hors du domaine. On revient vers le domaine en perdant le moins possible.',
  'Faire une itération de l’algorithme dual.', ['Vérifie que tous les d sont ≤ 0 (base optimale).', 'Sort : la variable de base de plus petit t négatif.', 'Entre : sur cette ligne, parmi les T < 0, le plus petit rapport d / T.', 'Pivot comme d’habitude. z diminue.'], 'Ici on choisit d’abord qui sort. Et on ne garde que les coefficients négatifs de la ligne.',
  ({ st, r, s, nx, cand }) => [
    S((v) => `Tous les d sont ≤ 0 : la base est-elle optimale ? ${v}. Mais t a des valeurs négatives : elle n’est pas réalisable.`, { v: 'oui', bad: ['non'], opt: ['oui', 'non'], ask: 'La base est-elle optimale (au sens d ≤ 0) ?', why: 'C’est exactement la situation de départ du simplexe dual.', b: tabl(st) }),
    S((v) => `t = (${st.t.map(qs).join(', ')}) : la plus négative est ${v}, elle sort.`, { v: st.names[st.base[r]], k: 'out', bad: [st.names[st.base[1 - r]]], opt: ['e1', 'e2'], ask: 'Variable sortante', why: 'On corrige d’abord la plus grande violation.' }),
    S((v) => `Rapports d / T sur les T < 0 de cette ligne : ${cand.map((x) => `${st.names[x.j]} : ${qs(st.d[x.j])} / ${qs(st.T[r][x.j])} = ${qs(x.q)}`).join(' ; ')}. Le plus petit : ${v} entre.`, { v: st.names[s], k: 'in', bad: cand.slice(1).map((x) => st.names[x.j]), opt: cand.map((x) => st.names[x.j]).sort(), ask: 'Variable entrante', why: 'Le plus petit rapport garde tous les d ≤ 0.' }),
    S((v) => `z = 0 + d × t / T = ${qs(st.d[s])} × (${qs(st.t[r])} / ${qs(st.T[r][s])}) = ${v}.`, { v: qs(nx.z), k: 'z', bad: [qs(qneg(nx.z)), qs(qadd(nx.z, Q(1)))], ask: 'z après le pivot', num: true, why: 'La valeur diminue : on paie pour revenir vers le domaine.', b: tabl(nx) })
  ]);

  add({
    id: 'artif', titre: 'Variables artificielles', theme: 'Variables artificielles', icon: 'layers', desc: 'Compter écarts, surplus et artificielles, puis démarrer la phase 1.',
    gen() {
      for (;;) {
        const m = 3, n = 3, rel = Array.from({ length: m }, () => pick(['≤', '≥', '='])), A = Array.from({ length: m }, () => Array.from({ length: n }, () => rnd(0, 4))), b = Array.from({ length: m }, () => rnd(2, 12));
        const art = rel.map((r, i) => (r === '≤' ? -1 : i)).filter((i) => i >= 0);
        if (!art.length || A.some((r) => r.every((v) => !v))) continue;
        const beta = Array.from({ length: n }, (_, j) => art.reduce((a, i) => a + A[i][j], 0)), mx = Math.max(...beta);
        if (mx <= 0 || beta.filter((v) => v === mx).length > 1) continue;
        const nm = ['x1', 'x2', 'x3'];
        return {
          raw: { A, b, rel, art, beta, mx, nm },
          prompt: `Seconds membres positifs. On résout par les deux phases (phase 1 : minimiser la somme des artificielles).${box(A.map((r, i) => `${linExpr(r, nm)} ${rel[i]} ${b[i]}`).concat('x1, x2, x3 ≥ 0'))}`,
          fields: [{ k: 'e', label: 'Variables d’écart et de surplus (nombre)', ph: 'nombre' }, { k: 'a', label: 'Variables artificielles (nombre)', ph: 'nombre' }, { k: 'w', label: 'Somme des artificielles au départ', ph: 'nombre' }, { k: 'in', label: 'Première variable entrante (plus grand β)', type: 'choice', options: nm }],
          expected: { e: String(rel.filter((r) => r !== '=').length), a: String(art.length), w: String(art.reduce((s, i) => s + b[i], 0)), in: nm[beta.indexOf(mx)] }
        };
      }
    }
  }, 'artif', null, 'Le simplexe a besoin d’un point de départ. Là où aucune variable d’écart ne peut servir, on ajoute une fausse variable, puis on cherche à l’annuler.',
  'Préparer la phase 1.', ['≤ : une variable d’écart, qui sert de base.', '≥ : une variable de surplus, plus une artificielle.', '= : une artificielle seulement.', 'Au départ, chaque artificielle vaut son second membre.', 'β_j = somme de la colonne j sur les lignes artificielles ; entre le plus grand.'], 'Un surplus a le coefficient −1 : il ne peut pas servir de base de départ.',
  ({ A, b, rel, art, beta, mx, nm }) => {
    const e = rel.filter((r) => r !== '=').length, w = art.reduce((s, i) => s + b[i], 0);
    return [
      ...rel.map((r, i) => S((v) => `Ligne ${i + 1} (${r}) : ${v}.`, { v: r === '≤' ? 'écart' : r === '≥' ? 'surplus et artificielle' : 'artificielle', bad: others(r === '≤' ? 'écart' : r === '≥' ? 'surplus et artificielle' : 'artificielle', ['écart', 'surplus et artificielle', 'artificielle']), opt: ['écart', 'surplus et artificielle', 'artificielle'], ask: `Que faut-il ajouter à la ligne ${i + 1} (${r}) ?`, why: r === '≤' ? 'L’écart forme une colonne de la base.' : r === '≥' ? 'Le surplus est retranché : il faut une artificielle pour la base.' : 'Aucun écart : il faut une artificielle.' })),
      S((v) => `Écarts et surplus : une par inégalité, soit ${v}.`, { v: e, k: 'e', bad: nb(e), ask: 'Nombre d’écarts et de surplus', why: 'Une égalité n’en a pas.' }),
      S((v) => `Artificielles : une par ≥ et par =, soit ${v}.`, { v: art.length, k: 'a', bad: nb(art.length), ask: 'Nombre d’artificielles', why: 'Les lignes ≤ ont déjà leur écart.' }),
      S((v) => `Somme de départ : ${art.map((i) => b[i]).join(' + ')} = ${v}.`, { v: w, k: 'w', bad: [w + 1, b.reduce((s, x) => s + x, 0) === w ? w + 2 : b.reduce((s, x) => s + x, 0)], ask: 'Somme des artificielles', why: 'Les autres variables valent 0 : chaque artificielle vaut son second membre.' }),
      S((v) => `β : ${nm.map((x, j) => `${x} : ${art.map((i) => A[i][j]).join(' + ')} = ${beta[j]}`).join(' ; ')}. Entre ${v}.`, { v: nm[beta.indexOf(mx)], k: 'in', bad: others(nm[beta.indexOf(mx)], nm), opt: nm, ask: 'Première variable entrante', why: 'Augmenter cette variable fait baisser le plus vite la somme des artificielles.' })
    ];
  });

  add({
    id: 'ecarts', titre: 'Écarts complémentaires', theme: 'Dualité', icon: 'shuffle', desc: 'Retrouver la solution primale à partir de la solution duale.',
    gen() {
      for (;;) {
        const A = Array.from({ length: 2 }, () => Array.from({ length: 3 }, () => rnd(0, 4))), u = [rnd(1, 4), rnd(1, 4)], z = rnd(0, 2), B = [0, 1, 2].filter((j) => j !== z);
        const det = A[0][B[0]] * A[1][B[1]] - A[0][B[1]] * A[1][B[0]];
        if (!det || A.some((r) => r.filter((v) => v).length < 2)) continue;
        const lhs = [0, 1, 2].map((j) => A[0][j] * u[0] + A[1][j] * u[1]), sl = rnd(1, 4), c = lhs.map((v, j) => (j === z ? v - sl : v));
        if (c.some((v) => v <= 0)) continue;
        const x = [0, 0, 0]; B.forEach((j) => { x[j] = rnd(1, 6); });
        const b = A.map((r) => r.reduce((s, v, j) => s + v * x[j], 0)), nm = ['x1', 'x2', 'x3'];
        return {
          raw: { A, u, z, B, lhs, c, x, b, nm },
          prompt: `${box([`max ${linExpr(c, nm)}`, ...A.map((r, i) => `${i ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : 's.c. '}${linExpr(r, nm)} ≤ ${b[i]}`), '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;x1, x2, x3 ≥ 0'])}Solution optimale du dual : <span class="mono hl">u = (${u.join(', ')})</span>. Retrouver x.`,
          fields: [{ k: 'n', label: 'Variable nulle par les écarts', type: 'choice', options: nm }, ...nm.map((y, j) => ({ k: y, label: y, ph: 'nombre', num: true, tol: 0.001 })), { k: 'v', label: 'Valeur optimale', ph: 'nombre', num: true, tol: 0.001 }],
          expected: { n: nm[z], x1: x[0], x2: x[1], x3: x[2], v: b[0] * u[0] + b[1] * u[1] }
        };
      }
    }
  }, 'dual', 'Dualité', 'À l’optimum, rien n’est gaspillé : une ressource qui a un prix est entièrement utilisée, et une activité qui rapporte moins que ce qu’elle consomme n’est pas lancée.',
  'Passer de la solution duale à la solution primale.', ['Pour chaque variable x_j, calcule le membre de gauche de sa contrainte duale avec u.', 'S’il dépasse strictement c_j : x_j = 0.', 'Pour chaque u_i > 0 : la contrainte i du primal est une égalité.', 'Résous le système restant. Valeur : bᵗu.'], 'Contrainte duale saturée ne veut pas dire x_j > 0 : seulement que x_j peut être non nul.',
  ({ A, u, z, B, lhs, c, x, b, nm }) => [
    ...nm.map((y, j) => S((v) => `Contrainte duale de ${y} : ${A[0][j]} × ${u[0]} + ${A[1][j]} × ${u[1]} = ${lhs[j]}, à comparer à ${c[j]}. Saturée ? ${v}.`, { v: j === z ? 'non' : 'oui', bad: [j === z ? 'oui' : 'non'], opt: ['oui', 'non'], ask: `${A[0][j]} × ${u[0]} + ${A[1][j]} × ${u[1]} comparé à ${c[j]} : saturée ?`, why: 'On lit la colonne de la variable dans le primal.' })),
    S((v) => `La contrainte non saturée impose ${v} = 0.`, { v: nm[z], k: 'n', bad: others(nm[z], nm), opt: nm, ask: 'Quelle variable est nulle ?', why: '(Aᵗu − c) x = 0 : si le premier facteur n’est pas nul, x l’est.' }),
    S((v) => `${nm[z]} = ${v}.`, { v: 0, k: nm[z], bad: [1, 2], ask: `Valeur de ${nm[z]}`, num: true, why: 'C’est ce qu’on vient de trouver.' }),
    S(`u_1 et u_2 sont > 0 : les deux contraintes du primal sont des égalités.`, { why: '(Ax − b) u = 0 : si u n’est pas nul, la contrainte est saturée.', b: P(...A.map((r, i) => `${linExpr(B.map((j) => r[j]), B.map((j) => 'x_' + (j + 1)))} = ${b[i]}`)) }),
    ...B.map((j) => S((v) => `En résolvant ce système : ${nm[j]} = ${v}.`, { v: x[j], k: nm[j], bad: nb(x[j]), ask: `Valeur de ${nm[j]}`, num: true, tol: 0.001, why: 'Deux équations, deux inconnues : par combinaison.' })),
    S((v) => `Valeur : ${b[0]} × ${u[0]} + ${b[1]} × ${u[1]} = ${v}.`, { v: b[0] * u[0] + b[1] * u[1], k: 'v', bad: nb(b[0] * u[0] + b[1] * u[1]), ask: 'Valeur optimale', num: true, tol: 0.001, why: 'Dualité forte : bᵗu = cᵗx.' })
  ]);

  add({
    id: 'sensc', titre: 'Sensibilité d’un coût', theme: 'Post-optimisation', icon: 'flag', desc: 'Créneau de variation d’un coefficient de l’objectif, variable hors base ou en base.',
    gen() {
      const TV = [Q(-2), Q(-1), Q(-1, 2), Q(1, 2), Q(1), Q(2), Q(3, 2), Q(2, 5)], dv = () => pick([Q(-1), Q(-2), Q(-3), Q(-1, 2), Q(-4, 5), Q(-5)]);
      for (;;) {
        const nm = ['x1', 'x3', 'x5'], d = nm.map(dv), tr = nm.map(() => pick(TV));
        const pos = nm.map((_, i) => i).filter((i) => qv(tr[i]) > 0), neg = nm.map((_, i) => i).filter((i) => qv(tr[i]) < 0);
        if (!pos.length || !neg.length) continue;
        const q = tr.map((v, i) => qdiv(d[i], v)), lo = pos.map((i) => q[i]).sort((a, b) => qv(b) - qv(a))[0], hi = neg.map((i) => q[i]).sort((a, b) => qv(a) - qv(b))[0], hb = rnd(0, 2);
        return {
          raw: { nm, d, tr, q, pos, neg, lo, hi, hb },
          prompt: `Tableau optimal (max), colonnes hors base :<div class="tab-wrap"><table class="tab-simplex"><tr><th>Base</th>${nm.map((x) => `<th>${x}</th>`).join('')}</tr><tr><td>x2</td>${tr.map((v) => `<td>${qs(v)}</td>`).join('')}</tr><tr class="tab-d"><td>d</td>${d.map((v) => `<td>${qs(v)}</td>`).join('')}</tr></table></div>On fait varier un coût : c + λ.`,
          fields: [{ k: 'h', label: `Hors base : λ maximal pour ${nm[hb]}`, ph: 'nombre', num: true, tol: 0.001, disp: qs(qneg(d[hb])) }, { k: 'lo', label: 'En base : λ minimal pour x2', ph: 'nombre', num: true, tol: 0.001, disp: qs(lo) }, { k: 'hi', label: 'En base : λ maximal pour x2', ph: 'nombre', num: true, tol: 0.001, disp: qs(hi) }],
          expected: { h: qv(qneg(d[hb])), lo: qv(lo), hi: qv(hi) }
        };
      }
    }
  }, 'postopt', 'Post-optimisation', 'Changer un prix ne déplace pas le point, il change seulement l’envie de bouger. On cherche jusqu’où le point actuel reste le meilleur.',
  'Trouver de combien un coût peut varier.', ['Hors base : seul d_k change, il faut d_k + λ ≤ 0, donc λ ≤ −d_k.', 'En base : d_j(λ) = d_j − λ T_{kj} ≤ 0 pour chaque j hors base.', 'T_{kj} > 0 donne λ ≥ d_j / T_{kj} ; T_{kj} < 0 donne λ ≤ d_j / T_{kj}.', 'Garde la plus grande borne basse et la plus petite borne haute.'], 'Les d sont négatifs : une borne basse est négative, une borne haute positive.',
  ({ nm, d, tr, q, pos, neg, lo, hi, hb }) => [
    S((v) => `${nm[hb]} est hors base : ${qs(d[hb])} + λ ≤ 0 donne λ ≤ ${v}.`, { v: qs(qneg(d[hb])), k: 'h', bad: [qs(d[hb]), qs(qadd(qneg(d[hb]), Q(1)))], ask: `λ maximal pour ${nm[hb]} (hors base)`, num: true, why: 'Au-delà, son coût réduit devient positif et elle entrerait.' }),
    ...nm.map((x, j) => S((v) => `${x} : ${qs(d[j])} − λ × (${qs(tr[j])}) ≤ 0 donne λ ${qv(tr[j]) > 0 ? '≥' : '≤'} ${v}.`, { v: qs(q[j]), bad: [qs(qneg(q[j])), qs(qadd(q[j], Q(1)))], ask: `${x} : λ ${qv(tr[j]) > 0 ? '≥' : '≤'} ?`, num: true, why: qv(tr[j]) > 0 ? 'On divise par −T, négatif : le sens s’inverse, borne basse.' : 'On divise par −T, positif : borne haute.' })),
    S((v) => `Plus grande borne basse${pos.length > 1 ? ` parmi ${pos.map((i) => qs(q[i])).join(' et ')}` : ''} : ${v}.`, { v: qs(lo), k: 'lo', bad: [qs(qneg(lo)), qs(qsub(lo, Q(1)))], ask: 'λ minimal pour x2', num: true, why: 'Toutes les conditions à la fois.' }),
    S((v) => `Plus petite borne haute${neg.length > 1 ? ` parmi ${neg.map((i) => qs(q[i])).join(' et ')}` : ''} : ${v}.`, { v: qs(hi), k: 'hi', bad: [qs(qneg(hi)), qs(qadd(hi, Q(1)))], ask: 'λ maximal pour x2', num: true, why: 'Toutes les conditions à la fois.' })
  ]);

  const BBO = ['abandonner', 'nouveau minorant', 'séparer'];
  add({
    id: 'bbn', titre: 'Branch and bound : les nœuds', theme: 'Branch and bound', icon: 'shuffle', desc: 'Pour chaque nœud : l’abandonner, mettre à jour le minorant ou le séparer.',
    gen() {
      const m0 = rnd(30, 50); let m = m0;
      const nodes = Array.from({ length: 5 }, () => {
        const k = rnd(0, 4), from = m;
        if (k === 0) return { vide: true, a: 'abandonner', from, to: m };
        const frac = k === 1 || k === 2, e = k === 4, v = k === 1 ? m - rnd(0, 6) : m + rnd(e ? 1 : 1, 6), a = v <= m ? 'abandonner' : e ? 'nouveau minorant' : 'séparer';
        const shown = e || !frac ? v : v + pick([0.2, 0.5, 0.75]);
        if (a === 'nouveau minorant') m = v;
        return { v, shown: e ? v : shown === v ? v + 0.4 : shown, e, a, from, to: m };
      });
      return {
        raw: { m0, nodes, m },
        prompt: `Maximisation, coûts entiers. Meilleur minorant connu : <span class="hl">${m0}</span>. Nœuds traités dans l’ordre (le minorant évolue) :${mini(nodes.map((n, i) => [`Nœud ${i + 1}`, n.vide ? 'domaine vide' : `relaxation ${f(n.shown, 2)}, solution ${n.e ? 'entière' : 'fractionnaire'}`]))}`,
        fields: [...nodes.map((n, i) => ({ k: 'n' + i, label: `Nœud ${i + 1}`, type: 'choice', options: BBO })), { k: 'm', label: 'Minorant final', ph: 'nombre' }],
        expected: { ...Object.fromEntries(nodes.map((n, i) => ['n' + i, n.a])), m: String(m) }
      };
    }
  }, 'bb', null, 'Chaque nœud promet au mieux sa relaxation. S’il ne peut pas battre ce qu’on a déjà, on le coupe sans le regarder.',
  'Décider du sort de chaque nœud.', ['Domaine vide : abandonner.', 'Majorant = partie entière de la relaxation (coûts entiers).', 'Majorant ≤ minorant : abandonner.', 'Sinon, solution entière : nouveau minorant, nœud terminé.', 'Sinon : séparer.'], 'Le minorant change en cours de route : un nœud gardé plus tôt peut devenir inutile.',
  ({ nodes, m }) => [...nodes.map((n, i) => S((v) => `Nœud ${i + 1} (minorant ${n.from}) : ${n.vide ? 'domaine vide' : `majorant ⌊${f(n.shown, 2)}⌋ = ${n.v}, ${n.v <= n.from ? `≤ ${n.from}` : `> ${n.from} et solution ${n.e ? 'entière' : 'fractionnaire'}`}`}. Décision : ${v}.`, { v: n.a, k: 'n' + i, bad: others(n.a, BBO), opt: BBO, ask: `Nœud ${i + 1} : ${n.vide ? 'domaine vide' : `${f(n.shown, 2)}, ${n.e ? 'entière' : 'fractionnaire'}`}, minorant ${n.from}`, why: n.vide ? 'Aucune solution dans ce nœud.' : n.a === 'abandonner' ? 'Il ne peut pas faire strictement mieux.' : n.a === 'séparer' ? 'Il peut encore contenir mieux, mais on ne sait pas.' : `Meilleure solution réalisable : le minorant devient ${n.to}.` })),
    S((v) => `Minorant final : ${v}.`, { v: m, k: 'm', bad: nb(m), ask: 'Minorant final', why: 'La meilleure solution entière trouvée.' })]);

  add({
    id: 'graph2', titre: 'Résolution graphique', theme: 'PL à deux variables', icon: 'chart', desc: 'Trouver les sommets et l’optimum d’un PL à deux variables.',
    gen() {
      for (;;) {
        const p = rnd(1, 5), q = rnd(1, 5), a1 = rnd(1, 4), b1 = rnd(1, 4), a2 = rnd(1, 4), b2 = rnd(1, 4);
        if (a1 * b2 <= a2 * b1) continue;
        const c1 = a1 * p + b1 * q, c2 = a2 * p + b2 * q, o = [rnd(1, 7), rnd(1, 7)];
        const V = [[Q(0), Q(0)], [Q(c1, a1), Q(0)], [Q(p), Q(q)], [Q(0), Q(c2, b2)]], z = V.map(([x, y]) => qadd(qmul(Q(o[0]), x), qmul(Q(o[1]), y))), m = Math.max(...z.map(qv));
        if (z.filter((v) => Math.abs(qv(v) - m) < 1e-9).length > 1) continue;
        const i = z.findIndex((v) => Math.abs(qv(v) - m) < 1e-9);
        return {
          raw: { V, z, i, o, a1, b1, c1, a2, b2, c2, p, q },
          prompt: box([`max ${linExpr(o, ['x1', 'x2'])}`, `s.c. ${linExpr([a1, b1], ['x1', 'x2'])} ≤ ${c1}`, `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${linExpr([a2, b2], ['x1', 'x2'])} ≤ ${c2}`, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;x1, x2 ≥ 0']),
          fields: [{ k: 'x', label: 'x1 à l’optimum', ph: 'nombre', num: true, tol: 0.001, disp: qs(V[i][0]) }, { k: 'y', label: 'x2 à l’optimum', ph: 'nombre', num: true, tol: 0.001, disp: qs(V[i][1]) }, { k: 'z', label: 'Valeur optimale', ph: 'nombre', num: true, tol: 0.001, disp: qs(z[i]) }],
          expected: { x: qv(V[i][0]), y: qv(V[i][1]), z: qv(z[i]) }
        };
      }
    }
  }, 'bases', 'Résolution graphique', 'Le domaine est un polygone. L’objectif est une règle qu’on fait glisser : le dernier point touché est un sommet.',
  'Résoudre un PL à deux variables à la main.', ['Trace chaque contrainte en égalité et garde le bon côté.', 'Liste les sommets : origine, intersections avec les axes, intersection des deux droites.', 'Calcule l’objectif en chaque sommet.', 'Garde le plus grand.'], 'Sur chaque axe, c’est la contrainte la plus serrée qui donne le sommet.',
  ({ V, z, i, o, a1, b1, c1, a2, b2, c2, p, q }) => {
    const W = Math.max(c2 / a2, c1 / a1) * 1.08, H = Math.max(c1 / b1, c2 / b2) * 1.08, X = (v) => 36 + (v / W) * 380, Y = (v) => 290 - (v / H) * 260;
    const fig = { t: 'fig', s: `<svg viewBox="0 0 440 320" role="img"><polygon class="pg" points="${V.map(([x, y]) => `${X(qv(x))},${Y(qv(y))}`).join(' ')}"/><line class="ax" x1="36" y1="290" x2="430" y2="290"/><line class="ax" x1="36" y1="290" x2="36" y2="14"/><line class="dr" x1="${X(c1 / a1)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(c1 / b1)}"/><line class="dr" x1="${X(c2 / a2)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(c2 / b2)}"/>${V.map(([x, y]) => `<circle class="pt" cx="${X(qv(x))}" cy="${Y(qv(y))}" r="5"/><text class="lg" x="${X(qv(x)) + 8}" y="${Y(qv(y)) - 8}">(${qs(x)} ; ${qs(y)})</text>`).join('')}</svg>` };
    return [
      S((v) => `Sur l’axe x_1 (x_2 = 0) : ${c1}/${a1} et ${c2}/${a2}. Le plus petit : ${v}.`, { v: qs(V[1][0]), bad: [qs(Q(c2, a2)), qs(qadd(V[1][0], Q(1)))], ask: 'Sommet sur l’axe x1 (valeur de x1)', num: true, why: 'Il faut respecter les deux contraintes.' }),
      S((v) => `Sur l’axe x_2 (x_1 = 0) : ${c1}/${b1} et ${c2}/${b2}. Le plus petit : ${v}.`, { v: qs(V[3][1]), bad: [qs(Q(c1, b1)), qs(qadd(V[3][1], Q(1)))], ask: 'Sommet sur l’axe x2 (valeur de x2)', num: true, why: 'Il faut respecter les deux contraintes : on garde la plus petite limite.' }),
      S((v) => `Intersection des deux droites : x_1 = ${v}, x_2 = ${q}.`, { v: p, bad: nb(p), ask: 'x1 à l’intersection des deux droites', num: true, tol: 0.001, why: 'On résout le système des deux égalités.', b: fig }),
      S(`Objectif en chaque sommet : ${V.map(([x, y], k) => `(${qs(x)} ; ${qs(y)}) donne ${qs(z[k])}`).join(', ')}.`, { why: 'L’optimum d’un PL borné est atteint en un sommet.' }),
      S((v) => `Le plus grand est ${v}.`, { v: qs(z[i]), k: 'z', bad: z.map(qs), ask: 'Valeur optimale', num: true, why: `On compare ${o[0]}x_1 + ${o[1]}x_2.` }),
      S((v) => `x_1 = ${v}.`, { v: qs(V[i][0]), k: 'x', bad: [qs(qadd(V[i][0], Q(1)))], ask: 'x1 à l’optimum', num: true, why: 'Coordonnée du meilleur sommet.' }),
      S((v) => `x_2 = ${v}.`, { v: qs(V[i][1]), k: 'y', bad: [qs(qadd(V[i][1], Q(1)))], ask: 'x2 à l’optimum', num: true, why: 'Coordonnée du meilleur sommet.' })
    ];
  });

  add({
    id: 'cplexs', titre: 'Lire une sortie CPLEX', theme: 'TP CPLEX', icon: 'chart', desc: 'Répondre à des questions avec display sensitivity obj et rhs.',
    gen() {
      const p = rnd(20, 60) * 10, up = p + rnd(2, 12) * 10, dn = p - rnd(2, 10) * 10, p2 = rnd(20, 90) * 10, rc = rnd(3, 25) * 10, R = rnd(10, 40) * 50, y = rnd(4, 60) * 0.5, rup = R + rnd(4, 12) * 50, rdn = R - rnd(2, 6) * 50, k = rnd(1, (rup - R) / 50) * 50, z = rnd(40, 400) * 100, less = Math.random() < 0.4, dv = less ? -rnd(1, (R - rdn) / 50) * 50 : k;
      const tb = (h, r) => `<div class="tab-wrap"><table class="tab-simplex"><tr>${h.map((x) => `<th>${x}</th>`).join('')}</tr>${r.map((l) => `<tr>${l.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</table></div>`;
      return {
        raw: { p, up, dn, p2, rc, R, y, rup, rdn, dv, z },
        prompt: `Maximisation, valeur optimale <span class="hl">${z}</span>.<div style="margin-top:0.5rem">display sensitivity obj</div>${tb(['Variable', 'Reduced Cost', 'Down', 'Current', 'Up'], [['x1', 'zero', dn, p, up], ['x2', '−' + rc, '−infinity', p2, p2 + rc]])}<div style="margin-top:0.5rem">display sensitivity rhs</div>${tb(['Constraint', 'Dual Price', 'Down', 'Current', 'Up'], [['c1', f(y), rdn, R, rup]])}`,
        fields: [{ k: 'lo', label: 'Prix minimal de x1 sans changer de plan', ph: 'nombre', num: true, tol: 0.001 }, { k: 'x2', label: 'Prix à partir duquel x2 devient intéressant', ph: 'nombre', num: true, tol: 0.001 }, { k: 'z', label: `Nouvelle valeur si c1 passe de ${R} à ${R + dv}`, ph: 'nombre', num: true, tol: 0.0005 }, { k: 'q', label: 'Quantité maximale à acheter en plus (c1)', ph: 'nombre', num: true, tol: 0.001 }, { k: 'pm', label: 'Prix maximal à payer par unité de c1', ph: 'nombre', num: true, tol: 0.001 }],
        expected: { lo: dn, x2: p2 + rc, z: z + y * dv, q: rup - R, pm: y }
      };
    }
  }, 'postopt', 'TP CPLEX', 'CPLEX donne tout dans deux tableaux. Le premier parle des prix de vente, le second des ressources. Il suffit de regarder la bonne ligne et la bonne colonne.',
  'Répondre aux questions économiques d’un TP.', ['Prix d’un produit fabriqué : intervalle Down à Up de sensitivity obj.', 'Produit non fabriqué : prix actuel + |coût réduit| (c’est son Up).', 'Ressource : variation de z = duale × variation, si on reste entre Down et Up de sensitivity rhs.', 'Prix maximal d’une unité de ressource : sa duale. Quantité : Up − Current.'], 'Pour une variable en base, le coût réduit est nul : il ne dit rien, il faut regarder la contrainte.',
  ({ p, up, dn, p2, rc, R, y, rup, dv, z }) => [
    S((v) => `x1 est en base (coût réduit nul). Son plan reste optimal de ${v} à ${up}.`, { v: dn, k: 'lo', bad: [up, p], ask: 'Prix minimal de x1', num: true, why: 'Colonne Down de sensitivity obj.' }),
    S((v) => `x2 est hors base, coût réduit −${rc} : il faut un prix de ${p2} + ${rc} = ${v}.`, { v: p2 + rc, k: 'x2', bad: [p2 - rc, rc], ask: 'Prix à partir duquel x2 est intéressant', num: true, why: 'Il faut compenser le coût réduit. C’est aussi la colonne Up.' }),
    S((v) => `c1 varie de ${f(dv)}, et on reste entre Down et Up : z varie de ${f(y)} × (${f(dv)}) = ${v}.`, { v: f(y * dv), bad: [f(-y * dv), f(dv)], ask: 'Variation de z', num: true, why: 'La duale est le gain par unité de ressource.' }),
    S((v) => `Nouvelle valeur : ${z} + (${f(y * dv)}) = ${v}.`, { v: f(z + y * dv), k: 'z', bad: [f(z - y * dv), f((z + y * dv) * 1.1)], ask: 'Nouvelle valeur de z', num: true, tol: 0.0005, why: 'Valable tant que la base ne change pas.' }),
    S((v) => `On peut acheter jusqu’à Up : ${rup} − ${R} = ${v} unités.`, { v: rup - R, k: 'q', bad: [rup, rup - R + 50], ask: 'Quantité maximale à acheter', num: true, why: 'Au-delà, la base change et la duale aussi.' }),
    S((v) => `Une unité rapporte ${f(y)} : on peut payer jusqu’à ${v}.`, { v: f(y), k: 'pm', bad: [f(y * 2), f(y + 10)], ask: 'Prix maximal par unité', num: true, why: 'Au-dessus de la duale, on perdrait de l’argent.' })
  ]);

  /* ---------- Algo ---------- */
  add({
    id: 'pdsc', titre: 'Primal-dual pour Set Cover', theme: 'Dualité', icon: 'target', desc: 'Faire monter les variables duales et acheter les ensembles serrés (avec poids).',
    gen() {
      for (;;) {
        const E = ['a', 'b', 'c', 'd', 'e'], sets = Array.from({ length: 4 }, () => shuffle5(E).slice(0, rnd(2, 3)).sort());
        if (new Set(sets.flat()).size < 5 || new Set(sets.map((s) => s.join(''))).size < 4) continue;
        const w = sets.map(() => rnd(2, 9)), y = Object.fromEntries(E.map((e) => [e, 0])), C = [], log = [];
        const rest = (i) => w[i] - sets[i].reduce((a, e) => a + y[e], 0);
        E.forEach((e) => {
          if (C.some((i) => sets[i].includes(e))) { log.push({ e, skip: true }); return; }
          const cand = sets.map((_, i) => i).filter((i) => sets[i].includes(e)), rs = cand.map((i) => [i, rest(i)]), up = Math.min(...rs.map((r) => r[1]));
          y[e] = up;
          const tight = cand.filter((i) => rest(i) === 0 && !C.includes(i));
          C.push(...tight); log.push({ e, up, rs, tight });
        });
        if (log.some((l) => l.up === 0)) continue;
        const cost = C.reduce((a, i) => a + w[i], 0), sy = E.reduce((a, e) => a + y[e], 0), seq = [...C].sort((a, b) => a - b).map((i) => 'S' + (i + 1)).join(',');
        return {
          raw: { E, sets, w, y, C, log, cost, sy, seq },
          prompt: `Éléments a à e, traités dans l’ordre. Un ensemble est serré quand la somme des y de ses éléments atteint son poids.${mini(sets.map((s, i) => [`S${i + 1} = { ${s.join(', ')} }`, `poids ${w[i]}`]))}`,
          fields: [{ k: 'c', label: 'Ensembles choisis (ordre des indices)', ph: 'ex. S1,S3' }, { k: 'w', label: 'Poids total', ph: 'nombre' }, { k: 'y', label: 'Somme des y', ph: 'nombre' }],
          expected: { c: seq, w: String(cost), y: String(sy) }
        };
      }
    }
  }, 'dual', 'Primal-dual', 'Chaque élément non couvert met de l’argent dans une cagnotte, jusqu’à pouvoir payer un ensemble qui le contient. La somme payée est une borne inférieure de l’optimum.',
  'Dérouler l’algorithme primal-dual.', ['Prends le premier élément e non couvert.', 'Augmente y_e jusqu’à ce qu’un ensemble contenant e soit serré.', 'Ajoute tous les ensembles qui viennent de devenir serrés.', 'Recommence. Coût ≤ f × Σ y.'], 'Le reste d’un ensemble tient compte des y déjà payés par ses autres éléments.',
  ({ E, sets, w, C, log, cost, sy, seq }) => [...log.flatMap((l) => (l.skip ? [S(`${l.e} est déjà couvert : y_${l.e} = 0.`, { why: 'On n’augmente que les éléments non couverts.' })] : [
    S((v) => `${l.e} : restes ${l.rs.map(([i, r]) => `S${i + 1} : ${r}`).join(', ')}. On monte y_${l.e} à ${v}.`, { v: l.up, bad: [l.up + 1, l.up + 2], ask: `Valeur de y_${l.e}`, why: 'On s’arrête au premier ensemble serré, pour que y reste réalisable.' }),
    S((v) => `Ensembles serrés ajoutés : ${v}.`, { v: l.tight.map((i) => 'S' + (i + 1)).join(','), bad: sets.map((_, i) => 'S' + (i + 1)), ask: `Ensembles serrés grâce à ${l.e}`, why: 'Tous ceux dont le reste est tombé à 0.' })
  ])),
  S((v) => `Ensembles choisis : ${v}.`, { v: seq, k: 'c', bad: ['S1,S2,S3,S4', 'S1,S4'], ask: 'Ensembles choisis', why: 'On s’arrête quand tout est couvert.' }),
  S((v) => `Poids : ${C.map((i) => w[i]).join(' + ')} = ${v}.`, { v: cost, k: 'w', bad: nb(cost), ask: 'Poids total', why: 'Somme des poids choisis.' }),
  S((v) => `Σ y = ${v}.`, { v: sy, k: 'y', bad: nb(sy), ask: 'Somme des y', why: 'C’est une borne inférieure de OPT, par dualité faible.' })]);
  function shuffle5(a) { return [...a].sort(() => Math.random() - 0.5); }

  add({
    id: 'seuil', titre: 'Arrondi par seuil', theme: 'Arrondi LP', icon: 'check', desc: 'Calculer f, garder les ensembles au-dessus du seuil, borner le coût.',
    gen() {
      const XV = [Q(0), Q(1, 4), Q(1, 3), Q(1, 2), Q(2, 3), Q(1)];
      for (;;) {
        const sets = Array.from({ length: 5 }, () => shuffle5([1, 2, 3, 4, 5, 6]).slice(0, rnd(2, 4)).sort()), fr = [1, 2, 3, 4, 5, 6].map((e) => sets.filter((s) => s.includes(e)).length), F = Math.max(...fr);
        if (Math.min(...fr) < 1 || F < 2 || F > 3) continue;
        const x = sets.map(() => pick(XV));
        if ([1, 2, 3, 4, 5, 6].some((e) => sets.reduce((a, s, i) => a + (s.includes(e) ? qv(x[i]) : 0), 0) < 1 - 1e-9)) continue;
        const keep = x.map((v, i) => (qv(v) >= 1 / F - 1e-9 ? i : -1)).filter((i) => i >= 0), lp = x.reduce((a, v) => qadd(a, v), Q(0));
        if (keep.length === 5) continue;
        return {
          raw: { sets, fr, F, x, keep, lp },
          prompt: `Set Cover, U = {1..6}, solution optimale x* du LP :${mini(sets.map((s, i) => [`S${i + 1} = { ${s.join(', ')} }`, `x* = ${qs(x[i])}`]))}`,
          fields: [{ k: 'f', label: 'Fréquence f', ph: 'nombre' }, { k: 'c', label: 'Ensembles gardés', ph: 'ex. S1,S3' }, { k: 'n', label: 'Coût de la solution', ph: 'nombre' }, { k: 'b', label: 'Borne f × OPT_LP', ph: 'nombre', num: true, tol: 0.005, disp: qs(qmul(Q(F), lp)) }],
          expected: { f: String(F), c: keep.map((i) => 'S' + (i + 1)).join(','), n: String(keep.length), b: F * qv(lp) }
        };
      }
    }
  }, 'lp', 'Arrondi LP', 'Le LP prend des morceaux d’ensembles. On garde les gros morceaux : chaque élément en a forcément un, puisque ses f morceaux au plus font au moins 1.',
  'Arrondir une solution fractionnaire.', ['f = le plus grand nombre d’ensembles contenant un même élément.', 'Garde S si x_S* ≥ 1/f.', 'Coût = nombre d’ensembles gardés.', 'Garantie : coût ≤ f × Σ x*.'], 'Le seuil est 1/f, pas 1/2 : il dépend de l’instance.',
  ({ sets, fr, F, x, keep, lp }) => [
    S((v) => `Fréquences des éléments 1 à 6 : ${fr.join(', ')}. Le maximum : f = ${v}.`, { v: F, k: 'f', bad: nb(F), ask: 'f', why: 'On compte dans combien d’ensembles est chaque élément.' }),
    ...sets.map((_, i) => S((v) => `S${i + 1} : ${qs(x[i])} ${qv(x[i]) >= 1 / F - 1e-9 ? '≥' : '<'} 1/${F}. Gardé ? ${v}.`, { v: keep.includes(i) ? 'oui' : 'non', bad: [keep.includes(i) ? 'non' : 'oui'], opt: ['oui', 'non'], ask: `S${i + 1} (x* = ${qs(x[i])}) est-il gardé, avec f = ${F} ?`, why: 'On compare au seuil 1/f.' })),
    S((v) => `Solution : ${v}.`, { v: keep.map((i) => 'S' + (i + 1)).join(','), k: 'c', bad: ['S1,S2,S3,S4,S5', 'S2'], ask: 'Ensembles gardés', why: 'Elle couvre tout : chaque élément a un ensemble d’au moins 1/f.' }),
    S((v) => `Coût : ${v} ensembles.`, { v: keep.length, k: 'n', bad: nb(keep.length), ask: 'Coût', why: 'Chaque ensemble coûte 1.' }),
    S((v) => `OPT_{LP} = ${qs(lp)}, donc la borne vaut ${F} × ${qs(lp)} = ${v}.`, { v: qs(qmul(Q(F), lp)), k: 'b', bad: [qs(qadd(qmul(Q(F), lp), Q(1))), qs(qadd(lp, Q(F + 4)))], ask: 'f × OPT_LP', num: true, why: 'Pour S gardé : 1 ≤ f x_S*.' })
  ]);

  add({
    id: 'etats', titre: 'Sac à dos : méthode des états', theme: 'Programmation dynamique', icon: 'layers', desc: 'Dérouler les états [utilité, volume] en gardant le meilleur par volume.',
    gen() {
      const its = Array.from({ length: 3 }, () => ({ w: rnd(3, 12), v: rnd(2, 6) })), V = rnd(7, 11);
      const E = [[[0, 0]]], info = [];
      its.forEach((o) => {
        const m = new Map(); let cr = 0, dom = 0;
        const put = ([u, v]) => { if (m.has(v)) { dom++; if (m.get(v) >= u) return; } m.set(v, u); };
        E[E.length - 1].forEach(([u, v]) => { put([u, v]); cr++; if (v + o.v <= V) { put([u + o.w, v + o.v]); cr++; } });
        info.push({ cr, dom }); E.push([...m].map(([v, u]) => [u, v]).sort((a, b) => a[1] - b[1]));
      });
      const last = E[3], opt = Math.max(...last.map((s) => s[0]));
      return {
        raw: { its, V, E, info, opt },
        prompt: `Vmax = <span class="hl">${V}</span>. État [utilité, volume], E0 = {[0, 0]}. On garde un seul état par volume, le plus utile.${mini(its.map((o, i) => [`Objet ${i + 1}`, `utilité ${o.w}, volume ${o.v}`]))}`,
        fields: [{ k: 'n2', label: 'Nombre d’états dans E2', ph: 'nombre' }, { k: 'n3', label: 'Nombre d’états dans E3', ph: 'nombre' }, { k: 'o', label: 'Valeur optimale', ph: 'nombre' }],
        expected: { n2: String(E[2].length), n3: String(last.length), o: String(opt) }
      };
    }
  }, 'progdyn', null, 'Au lieu de remplir tout le tableau, on garde seulement les situations atteignables. Deux situations de même volume : la moins utile est oubliée.',
  'Dérouler la méthode des états.', ['Chaque état donne deux états : sans l’objet, et avec l’objet si le volume tient.', 'Pour un même volume, garde la plus grande utilité.', 'Réponse : la plus grande utilité du dernier ensemble.'], 'La dominance compare des états de même volume.',
  ({ its, V, E, info, opt }) => [...its.flatMap((o, i) => [
    S((v) => `Objet ${i + 1} (utilité ${o.w}, volume ${o.v}) : on crée ${v} états avant dominance.`, { v: info[i].cr, bad: nb(info[i].cr), ask: `États créés avec l’objet ${i + 1}, avant dominance`, why: `Chaque état, plus chaque état où le volume + ${o.v} ne dépasse pas ${V}.` }),
    S((v) => `Après dominance, E${i + 1} a ${v} états : ${E[i + 1].map(([u, w]) => `[${u}, ${w}]`).join(', ')}.`, { v: E[i + 1].length, ...(i ? { k: 'n' + (i + 1) } : {}), bad: nb(E[i + 1].length), ask: `Nombre d’états dans E${i + 1}`, why: info[i].dom ? 'On garde un seul état par volume.' : 'Aucun volume en double ici.' })
  ]), S((v) => `Plus grande utilité de E3 : ${v}.`, { v: opt, k: 'o', bad: nb(opt), ask: 'Valeur optimale', why: 'Tous les états respectent Vmax.' })]);

  add({
    id: 'elag', titre: 'Élagage d’états', theme: 'Schémas', icon: 'calc', desc: 'Pas δ, nombre de zones et zone d’un état pour P2 || Cmax.',
    gen() {
      const n = pick([4, 5, 6, 8]), eps = pick([0.5, 1, 0.25]), dl = pick([1, 2, 3]), L = (2 * n * dl) / eps;
      const pt = () => [rnd(0, Math.floor(L / dl / 4)) * dl + 0.5 * dl, rnd(0, Math.floor(L / dl / 4)) * dl + 0.5 * dl], a = pt(), same = Math.random() < 0.5, b = same ? a.map((v) => v + 0.3 * dl) : [a[0] + dl * rnd(1, 2), a[1]];
      return {
        raw: { n, eps, dl, L, a, b, same },
        prompt: `P2 || Cmax avec <span class="hl">n = ${n}</span> tâches, <span class="hl">L = ${L}</span>, <span class="hl">ε = ${f(eps)}</span>. Zones carrées de côté δ. États [${a.map((v) => f(v)).join(' ; ')}] et [${b.map((v) => f(v)).join(' ; ')}].`,
        fields: [{ k: 'd', label: 'δ', ph: 'nombre', num: true, tol: 0.005 }, { k: 'z', label: 'Zones par axe (L / δ)', ph: 'nombre', num: true, tol: 0.005 }, { k: 'm', label: 'Même zone ?', type: 'choice', options: ['oui', 'non'] }, { k: 'e', label: 'Erreur cumulée au plus (nδ)', ph: 'nombre', num: true, tol: 0.005 }],
        expected: { d: dl, z: L / dl, m: same ? 'oui' : 'non', e: n * dl }
      };
    }
  }, 'schemas', 'Schémas', 'Deux situations presque identiques mènent à des résultats presque identiques : on n’en garde qu’une par petite zone. Chaque étape fait perdre au plus δ.',
  'Régler la taille des zones.', ['δ = εL / (2n).', 'Zones par axe : L / δ = 2n / ε.', 'Deux états sont dans la même zone si leurs deux charges tombent dans les mêmes intervalles de longueur δ.', 'Erreur totale : nδ = εL/2 ≤ ε OPT.'], 'Il faut la même zone sur les deux machines, pas sur une seule.',
  ({ n, eps, dl, L, a, b, same }) => [
    S((v) => `δ = εL / (2n) = ${f(eps)} × ${L} / ${2 * n} = ${v}.`, { v: f(dl), k: 'd', bad: [f(dl * 2), f(dl * n)], ask: 'δ', num: true, why: 'n étapes de perte δ doivent faire au plus εL/2.' }),
    S((v) => `Zones par axe : ${L} / ${f(dl)} = ${v}.`, { v: f(L / dl), k: 'z', bad: [f(L / dl / 2), f((L / dl) * 2)], ask: 'Zones par axe', num: true, why: 'C’est 2n/ε : polynomial en n et 1/ε.' }),
    S((v) => `Premier état : zone (${v} ; ${Math.floor(a[1] / dl)}).`, { v: Math.floor(a[0] / dl), bad: nb(Math.floor(a[0] / dl)), ask: `Numéro de zone de ${f(a[0])} (partie entière de ${f(a[0])} / ${f(dl)})`, why: 'On divise par δ et on prend la partie entière.' }),
    S((v) => `Second état : zone (${Math.floor(b[0] / dl)} ; ${Math.floor(b[1] / dl)}). Même zone ? ${v}.`, { v: same ? 'oui' : 'non', k: 'm', bad: [same ? 'non' : 'oui'], opt: ['oui', 'non'], ask: 'Même zone ?', why: same ? 'On garde seulement celui de plus petit ℓ_1.' : 'Ils sont gardés tous les deux.' }),
    S((v) => `Erreur cumulée : n × δ = ${n} × ${f(dl)} = ${v}.`, { v: f(n * dl), k: 'e', bad: [f(dl), f(n * dl * 2)], ask: 'nδ', num: true, why: 'Au plus δ par tâche placée. Et nδ = εL/2 ≤ ε OPT.' })
  ]);

  add({
    id: 'treedec', titre: 'Décomposition jolie', theme: 'Baker', icon: 'layers', desc: 'Calculer c[t, S] pour un nœud d’introduction, d’oubli et de jointure.',
    gen() {
      const a = rnd(0, 5), adj = Math.random() < 0.4, p = rnd(1, 6), q = rnd(1, 6), r = rnd(2, 6), t = rnd(2, 6), s = rnd(0, 2);
      return {
        raw: { a, adj, p, q, r, t, s },
        prompt: `Stable maximum, programmation dynamique sur une décomposition jolie.${mini([['Introduction de v', `v ∈ S, c[t′, S sans v] = ${a}, ${adj ? 'S contient un voisin de v' : 'S ne contient aucun voisin de v'}`], ['Oubli de v', `c[t′, S] = ${p}, c[t′, S avec v] = ${q}`], ['Jointure', `c[t1, S] = ${r}, c[t2, S] = ${t}, |S| = ${s}`]])}`,
        fields: [{ k: 'i', label: 'Introduction : c[t, S]', type: 'choice', options: [String(a), String(a + 1), '−∞'] }, { k: 'o', label: 'Oubli : c[t, S]', ph: 'nombre' }, { k: 'j', label: 'Jointure : c[t, S]', ph: 'nombre' }],
        expected: { i: adj ? '−∞' : String(a + 1), o: String(Math.max(p, q)), j: String(r + t - s) }
      };
    }
  }, 'baker', null, 'On parcourt l’arbre des sacs en ajoutant, oubliant ou fusionnant. Dans chaque cas une petite règle dit comment mettre à jour le meilleur stable.',
  'Appliquer les règles de la décomposition jolie.', ['Feuille : c[t, ∅] = 0.', 'Introduction de v : v ∉ S recopie ; v ∈ S avec un voisin dans S donne −∞ ; sinon c[t′, S sans v] + 1.', 'Oubli de v : le maximum des deux cas, avec et sans v.', 'Jointure : somme moins |S|.'], 'À la jointure, les sommets de S sont dans les deux branches : on les retire une fois.',
  ({ a, adj, p, q, r, t, s }) => [
    S((v) => `Introduction : ${adj ? 'un voisin de v est déjà dans S, ce n’est pas un stable' : `v s’ajoute, ${a} + 1`}. c = ${v}.`, { v: adj ? '−∞' : a + 1, k: 'i', bad: others(adj ? '−∞' : String(a + 1), [String(a), String(a + 1), '−∞']), opt: [String(a), String(a + 1), '−∞'], ask: 'Introduction de v, v dans S', why: 'On vérifie d’abord que S reste un stable.' }),
    S((v) => `Oubli : max(${p}, ${q}) = ${v}.`, { v: Math.max(p, q), k: 'o', bad: [p + q, Math.max(p, q) + 1], ask: 'Oubli de v', why: 'v quitte le sac : on garde le meilleur des deux choix.' }),
    S((v) => `Jointure : ${r} + ${t} − ${s} = ${v}.`, { v: r + t - s, k: 'j', bad: [r + t - s + 1, Math.max(r, t) === r + t - s ? r + t + 2 : Math.max(r, t)], ask: 'Jointure', why: 'S est compté dans chaque branche.' })
  ]);
})();
