// Résolution pas à pas de chaque exercice généré, avec ses propres nombres. Une étape = une seule opération.
// De cette liste viennent l'exemple guidé, l'exercice à trous, la recherche d'erreur, les indices et la correction.
// Étape : s(v) phrase affichée, why la raison, ask la question posée, v la réponse, bad les réponses fausses,
// opt choix proposés, num comparaison numérique, k champ de l'exercice vérifié, b bloc (tableau, programme, figure)
const PAS = (() => {
  const S = (s, o = {}) => ({ s: typeof s === 'function' ? s : () => s, ...o, v: o.v === undefined ? undefined : String(o.v), bad: (o.bad || []).map(String).filter((x, i, l) => x !== String(o.v) && l.indexOf(x) === i) });
  const T = (h, r) => ({ t: 'tab', h: h.map(String), r: r.map((l) => l.map(String)) });
  const P = (...l) => ({ t: 'pl', l });
  const F = (s, c) => ({ t: 'fig', s, c });
  const nb = (v) => [v + 1, v > 1 ? v - 1 : v + 2, v * 2 || 3];
  const flip = (w, i) => w.slice(0, i) + (w[i] === '1' ? '0' : '1') + w.slice(i + 1);
  const flips = (w) => [flip(w, 0), flip(w, w.length - 1), flip(w, Math.floor(w.length / 2))];
  const f = (x, d = 3) => String(Number(x.toFixed(d))).replace('.', ',').replace('-', '−');
  const svg = (w, h, b) => `<svg viewBox="0 0 ${w} ${h}" role="img">${b}</svg>`;
  const tx = (x, y, s, o = '') => `<text x="${x}" y="${y}" ${o}>${s}</text>`;

  /* ---------- Figures ---------- */
  const bitsFig = (ip, p, cap) => {
    const bits = ip2int(ip).toString(2).padStart(32, '0');
    let b = '';
    ip.split('.').forEach((o, k) => {
      const x0 = 4 + k * 154;
      b += tx(x0 + 72, 16, o, 'class="nt"');
      for (let i = 0; i < 8; i++) {
        const n = k * 8 + i;
        b += `<rect class="${n < p ? 'bn' : 'bh'}" x="${x0 + i * 18}" y="24" width="17" height="26" rx="3"/>${tx(x0 + i * 18 + 8.5, 42, bits[n], 'class="nt"')}`;
      }
    });
    const xc = p >= 32 ? 616 : 4 + Math.floor(p / 8) * 154 + (p % 8) * 18 - (p % 8 ? 0.5 : 5);
    b += `<line class="cut" x1="${xc}" y1="20" x2="${xc}" y2="58"/>` + tx(xc, 72, `/${p}`, 'class="nt"');
    return F(svg(620, 78, b), cap || 'À gauche du trait : le réseau (bits fixes). À droite : les hôtes (bits libres).');
  };
  const delayFig = (ttx, tp) => {
    const tot = ttx + tp, H = 150, y = (t) => 34 + (t / tot) * H;
    return F(svg(420, 220, tx(90, 20, 'Émetteur', 'class="nt"') + tx(330, 20, 'Récepteur', 'class="nt"')
      + `<polygon class="pg" points="90,${y(0)} 330,${y(tp)} 330,${y(tot)} 90,${y(ttx)}"/><line class="ax" x1="90" y1="28" x2="90" y2="205"/><line class="ax" x1="330" y1="28" x2="330" y2="205"/>`
      + `<line class="dr" x1="90" y1="${y(0)}" x2="330" y2="${y(tp)}"/><line class="dr" x1="90" y1="${y(ttx)}" x2="330" y2="${y(tot)}"/>`
      + tx(82, (y(0) + y(ttx)) / 2 + 4, 'T émission', 'text-anchor="end"') + tx(338, y(tp) / 2 + 20, 'T propagation') + tx(338, y(tot) + 4, 'fin')), 'Le temps descend. La bande est le paquet : son premier bit part à 0, son dernier arrive à T émission + T propagation.');
  };
  const pipeFig = (ko) => F(svg(460, 110, '<rect class="bh" x="20" y="34" width="420" height="44" rx="22"/>' + Array.from({ length: 9 }, (_, i) => `<rect class="bn" x="${36 + i * 44}" y="42" width="36" height="28" rx="4"/>`).join('')
    + tx(230, 22, 'longueur du tuyau : le RTT', 'class="nt"') + tx(230, 100, `contenu : débit × RTT = ${ko} ko`, 'class="nt"')), 'Le lien est un tuyau : son épaisseur est le débit, sa longueur le temps. Le BDP est son volume.');
  const ripFig = () => F(svg(440, 92, '<line class="ar" x1="70" y1="46" x2="220" y2="46"/><line class="ar" x1="220" y1="46" x2="370" y2="46"/>' + [['R1', 70], ['R2', 220], ['?', 370]].map(([n, x]) => `<circle class="nd" cx="${x}" cy="46" r="20"/>${tx(x, 51, n, 'class="nt"')}`).join('') + tx(145, 34, '+ 1 saut', 'class="lb"') + tx(295, 34, 'coût annoncé', 'class="lb"')), 'Le coût par R2 = ce que R2 annonce, plus le saut de R1 à R2.');
  const crcFig = (bits, gen, i, after) => {
    const L = gen.length, pre = ' '.repeat(i), row = (a, c) => `<span class="${c}">${a}</span>`;
    return F(`<pre class="crc">${pre}${row(bits.slice(i, i + L), 'a')}${row(bits.slice(i + L), 'z')}\n${pre}${row(gen, 'g')}\n${pre}${'─'.repeat(L)}\n${pre}${row(after, 'r')}</pre>`);
  };
  const tabl = (st) => T(['Base', ...st.names, 't'], [...st.T.map((r, i) => [st.names[st.base[i]], ...r.map(qs), qs(st.t[i])]), ['(d, −z)', ...st.d.map(qs), qs(qneg(st.z))]]);
  const others = (v, l) => l.filter((x) => x !== v);

  /* ---------- Étapes ---------- */
  const simplexIt = (st, ch, n, last) => {
    const ent = st.names[ch.s], sor = st.names[st.base[ch.r]], rat = qdiv(st.t[ch.r], st.T[ch.r][ch.s]), nx = simplexPivot(st, ch.r, ch.s);
    const cand = st.names.filter((_, j) => !st.base.includes(j));
    return [
      S((v) => `${n}Dans la ligne d, le plus grand coût réduit positif est celui de ${v} : ${v} entre dans la base.`, { v: ent, bad: others(ent, cand), ask: 'Quelle variable entre ?', opt: cand, why: 'd mesure ce que z gagne quand la variable augmente de 1. On prend la plus rentable.', b: tabl(st) }),
      S((v) => `Rapports t / coefficient dans la colonne ${ent}, pour les coefficients strictement positifs : ${st.T.map((r, i) => (qv(r[ch.s]) > 0 ? `${st.names[st.base[i]]} : ${qs(st.t[i])} / ${qs(r[ch.s])} = ${qs(qdiv(st.t[i], r[ch.s]))}` : `${st.names[st.base[i]]} : ignoré`)).join(' ; ')}. Le plus petit fait sortir ${v}.`, { v: sor, bad: others(sor, st.base.map((j) => st.names[j])), ask: 'Quelle variable sort ?', opt: st.base.map((j) => st.names[j]), why: 'Le plus petit rapport est la première variable de base à tomber à 0 : aller plus loin la rendrait négative.' }),
      S((v) => `z augmente de d × rapport = ${qs(st.d[ch.s])} × ${qs(rat)}. Nouvelle valeur : z = ${v}.`, { v: qs(nx.z), bad: [qs(qadd(st.z, rat)), qs(qadd(st.z, st.d[ch.s])), qs(qadd(nx.z, Q(1)))], ask: 'Nouvelle valeur de z', num: true, why: `${ent} monte de 0 à ${qs(rat)}, et chaque unité rapporte ${qs(st.d[ch.s])}.`, ...(last ? { k: 'z' } : {}) }),
      S(`Pivot : on divise la ligne de ${sor} par ${qs(st.T[ch.r][ch.s])}, puis on annule la colonne ${ent} dans les autres lignes (ligne − coefficient × nouvelle ligne du pivot).`, { why: 'La colonne d’une variable de base doit avoir un seul 1 et des 0.', b: tabl(nx) })
    ];
  };

  return {
    cidr({ ip, p, m, n, b }) {
      const o = Math.min(3, Math.floor(p / 8)), mo = (m >>> (24 - 8 * o)) & 255, bl = 256 - mo, x = Number(ip.split('.')[o]), st = Math.floor(x / bl) * bl, oct = ['1er', '2e', '3e', '4e'][o], net = int2ip(n), bc = int2ip(b);
      const l = [
        S((v) => `/${p} : ${o ? `${o} octet${o > 1 ? 's' : ''} entier${o > 1 ? 's' : ''} (${8 * o} bits)` : 'aucun octet entier'}, puis ${p - 8 * o} bit${p - 8 * o > 1 ? 's' : ''} dans l’octet suivant. L’octet à travailler est le ${v}.`, { v: oct, bad: others(oct, ['2e', '3e', '4e']), opt: ['2e', '3e', '4e'], ask: 'Quel octet faut-il travailler ?', why: 'Un octet fait 8 bits : le préfixe dit combien de bits sont fixes en partant de la gauche.', b: bitsFig(ip, p) }),
        S((v) => `Dans cet octet, ${p - 8 * o} bit${p - 8 * o > 1 ? 's' : ''} à 1 : le masque y vaut ${v}.`, { v: mo, bad: [mo ? 256 - mo : 255, 255, 128].filter((z) => z < 256), ask: 'Valeur du masque dans cet octet', why: 'Les bits d’un octet valent 128, 64, 32, 16, 8, 4, 2, 1. Additionne autant de valeurs, depuis la gauche, qu’il y a de bits à 1.' }),
        S((v) => `Taille de bloc : 256 − ${mo} = ${v}. Les réseaux commencent tous les ${v}.`, { v: bl, bad: [bl * 2, bl / 2, mo].filter((z) => z >= 1), ask: 'Taille de bloc', why: `Il reste ${8 * (o + 1) - p} bit(s) libre(s) dans cet octet : ils font 2^{${8 * (o + 1) - p}} valeurs, et 256 − masque donne le même nombre.` }),
        S((v) => `${x} est entre ${st} et ${st + bl - 1} : le bloc commence à ${v}.`, { v: st, bad: [st + bl, st - bl, x].filter((z) => z >= 0), ask: `Plus grand multiple de ${bl} inférieur ou égal à ${x}`, why: 'Mettre les bits d’hôte à 0, c’est revenir au début du bloc.' }),
        S((v) => `Adresse réseau : on garde les octets de gauche, on met ${st}, puis des 0. Réseau ${v}.`, { v: net, k: 'net', bad: [int2ip((n + 2 ** (32 - p)) >>> 0), int2ip(n + 1), ip], ask: 'Adresse réseau', why: 'Le réseau est l’adresse dont tous les bits d’hôte valent 0.' }),
        S((v) => `Le bloc suivant commence à ${int2ip((b + 1) >>> 0)} : le broadcast est juste avant, ${v}.`, { v: bc, k: 'bc', bad: [int2ip(b - 1), int2ip((b + 1) >>> 0)], ask: 'Broadcast', why: 'Le broadcast est l’adresse dont tous les bits d’hôte valent 1.' }),
        S((v) => `Premier hôte : réseau + 1 = ${v}.`, { v: int2ip(n + 1), k: 'first', bad: [net, int2ip(n + 2)], ask: 'Premier hôte', why: 'L’adresse réseau n’est pas donnée à une machine.' }),
        S((v) => `Dernier hôte : broadcast − 1 = ${v}.`, { v: int2ip(b - 1), k: 'last', bad: [bc, int2ip(b - 2)], ask: 'Dernier hôte', why: 'Le broadcast n’est pas donné à une machine.' }),
        S((v) => `${32 - p} bits d’hôte : 2^{${32 - p}} − 2 = ${v} hôtes.`, { v: 2 ** (32 - p) - 2, k: 'hosts', bad: [2 ** (32 - p), 2 ** (32 - p) - 1, 2 ** (31 - p) - 2].filter((z) => z > 0), ask: 'Nombre d’hôtes', why: 'On retire le réseau et le broadcast.' })
      ];
      return l;
    },
    mask({ p, m, dir }) {
      const full = Math.floor(p / 8), r = p % 8, val = r ? 256 - 2 ** (8 - r) : 0, w = [128, 64, 32, 16, 8, 4, 2, 1].slice(0, r);
      if (!dir) return [
        S((v) => `${p} = ${full} × 8 + ${r} : ${v} octet${full > 1 ? 's' : ''} plein${full > 1 ? 's' : ''}.`, { v: full, bad: nb(full).slice(0, 2), ask: 'Nombre d’octets pleins', why: 'Un octet plein a ses 8 bits à 1 et vaut 255.', b: bitsFig(m, p, 'Le masque : des 1 pour la partie réseau, des 0 pour la partie hôte.') }),
        S((v) => `Il reste ${v} bit${r > 1 ? 's' : ''} à 1 dans l’octet suivant.`, { v: r, bad: nb(r).slice(0, 2), ask: 'Bits restants', why: `${p} − ${8 * full} = ${r}.` }),
        S((v) => (r ? `${w.join(' + ')} = ${v}.` : `Aucun bit entamé : cet octet vaut ${v}.`), { v: val, bad: [2 ** r, 256 - val, 255].filter((z) => z < 256), ask: 'Valeur de cet octet', why: 'Les bits à 1 se remplissent toujours par la gauche, donc depuis 128.' }),
        S((v) => `Les octets restants valent 0. Masque : ${v}.`, { v: m, k: 'm', bad: [int2ip(maskInt(Math.min(30, p + 1))), int2ip(maskInt(p - 1))], ask: 'Masque complet', why: 'Après le dernier 1, il n’y a que des 0.' })
      ];
      return [
        S((v) => `Octets à 255 : ${v}.`, { v: full, bad: nb(full).slice(0, 2), ask: 'Combien d’octets valent 255 ?', why: 'Chacun apporte 8 bits.', b: bitsFig(m, p, 'Le masque en binaire : on compte les 1.') }),
        S((v) => (r ? `${val} = ${w.join(' + ')} : ${v} bit${r > 1 ? 's' : ''} à 1.` : `L’octet suivant vaut 0 : ${v} bit.`), { v: r, bad: nb(r).slice(0, 2), ask: 'Bits à 1 dans l’octet entamé', why: 'Parcours les valeurs 128, 64, 32, 16, 8, 4, 2, 1 dans l’ordre. Soustrais une valeur seulement si le résultat reste positif ou nul : bit à 1. Sinon, bit à 0 et on passe à la suivante.' }),
        S((v) => `${full} × 8 + ${r} = ${v}, donc /${v}.`, { v: p, k: 'p', bad: nb(p).slice(0, 2), ask: 'Préfixe', why: 'Le préfixe est le nombre total de bits à 1.' })
      ];
    },
    same({ a, b, p, na, nb: nB, ans }) {
      const o = Math.min(3, Math.floor(p / 8)), bl = 256 - ((maskInt(p) >>> (24 - 8 * o)) & 255), x = a.split('.')[o], y = b.split('.')[o];
      return [
        S((v) => `/${p} : on travaille le ${o + 1}e octet, par blocs de ${v}.`, { v: bl, bad: [bl * 2, bl / 2].filter((z) => z >= 1), ask: `Taille de bloc (${o + 1}e octet)`, why: 'Taille de bloc = 256 − masque de l’octet.', b: bitsFig(a, p) }),
        S((v) => `A : ${x} est dans le bloc ${Math.floor(x / bl) * bl} à ${Math.floor(x / bl) * bl + bl - 1}. Réseau de A : ${v}.`, { v: int2ip(na), bad: [int2ip((na + 2 ** (32 - p)) >>> 0), a], ask: 'Réseau de A', why: 'On met à 0 tous les bits d’hôte.' }),
        S((v) => `B : ${y} est dans le bloc ${Math.floor(y / bl) * bl} à ${Math.floor(y / bl) * bl + bl - 1}. Réseau de B : ${v}.`, { v: int2ip(nB), bad: [int2ip((nB + 2 ** (32 - p)) >>> 0), b], ask: 'Réseau de B', why: 'Même calcul, avec le même masque.', b: bitsFig(b, p) }),
        S((v) => `Même réseau ? ${v}. ${ans === 'oui' ? 'A envoie directement à B (ARP sur B).' : 'A envoie à sa passerelle (ARP sur la passerelle).'}`, { v: ans, k: 'r', bad: [ans === 'oui' ? 'non' : 'oui'], opt: ['oui', 'non'], ask: 'Sont-ils dans le même sous-réseau ?', why: 'On compare les deux adresses réseau, pas les adresses elles-mêmes.' })
      ];
    },
    lpm({ dest, routes, best }) {
      const d = ip2int(dest);
      return [...routes.map((r) => {
        const [net, len] = r.p.split('/'), L = Number(len), ok = ((d & maskInt(L)) >>> 0) === ip2int(net) ? 'oui' : 'non', hi = int2ip((ip2int(net) | ~maskInt(L)) >>> 0);
        return S((v) => `${r.p} va de ${net} à ${hi}. ${dest} est dedans ? ${v}.`, { v: ok, bad: [ok === 'oui' ? 'non' : 'oui'], opt: ['oui', 'non'], ask: `${r.p} contient-elle ${dest} ?`, why: L ? `On compare seulement les ${L} premiers bits${L % 8 ? ' : /25 coupe le dernier octet à 128.' : ` (${L / 8} octet${L > 8 ? 's' : ''}).`}` : 'Aucun bit à comparer : la route par défaut correspond toujours.' });
      }), S((v) => `Parmi celles qui correspondent, la plus précise est ${best.p} : prochain saut ${v}.`, { v: best.nh, k: 'r', bad: others(best.nh, routes.map((r) => r.nh)), opt: routes.map((r) => r.nh), ask: 'Prochain saut', why: 'Plus le préfixe est long, plus la route est précise.' })];
    },
    crc({ data, gen, rem }) {
      const r = gen.length - 1; let bits = data + '0'.repeat(r);
      const l = [S((v) => `Le générateur a ${gen.length} bits, donc un degré de ${r}. On ajoute ${v} zéros : ${data}${'0'.repeat(r)}.`, { v: r, bad: [r + 1, r - 1], ask: 'Combien de zéros ajouter ?', why: 'Le reste aura autant de bits que le degré : on lui fait de la place.' })];
      for (let i = 0; i <= bits.length - gen.length; i++) {
        if (bits[i] !== '1') continue;
        const bf = bits.slice(i, i + gen.length), af = [...bf].map((c, j) => (c === gen[j] ? '0' : '1')).join('');
        l.push(S((v) => `On place ${gen} sous le 1 en position ${i + 1} : ${bf} XOR ${gen} = ${v}.`, { v: af, bad: [flip(af, af.length - 1), flip(af, 1)], ask: `${bf} XOR ${gen} = ?`, why: 'Bits identiques : 0. Bits différents : 1. Le premier bit s’annule toujours.', b: crcFig(bits, gen, i, af) }));
        bits = bits.slice(0, i) + af + bits.slice(i + gen.length);
      }
      l.push(S((v) => `Il n’y a plus la place : le reste est les ${r} derniers bits, ${v}.`, { v: rem, k: 'rem', bad: flips(rem), ask: 'Reste (CRC)', why: 'Le reste garde ses zéros de tête : il a toujours autant de bits que le degré.' }));
      l.push(S((v) => `Trame = message suivi du reste : ${v}.`, { v: data + rem, k: 'frame', bad: [data + '0'.repeat(r), rem + data], ask: 'Trame transmise', why: 'Le récepteur divise toute la trame : il doit trouver un reste nul.' }));
      return l;
    },
    stuff({ s }) {
      const l = []; let run = 0, out = '', from = 0;
      for (let i = 0; i < s.length; i++) {
        out += s[i];
        run = s[i] === '1' ? run + 1 : 0;
        if (run === 5) {
          out += '0'; run = 0; const o = out, st = from;
          l.push(S((v) => `Bits ${st + 1} à ${i + 1} (${s.slice(st, i + 1)}) : cinquième 1 d’affilée, on insère ${v}. Sortie : ${o}`, { v: '0', bad: ['1'], opt: ['0', '1'], ask: `Après ${s.slice(Math.max(0, i - 6), i + 1)}, quel bit insérer ?`, why: 'Six 1 d’affilée feraient croire à un fanion 01111110. On insère toujours un 0, puis le compteur repart à 0.' }));
          from = i + 1;
        }
      }
      const n = out.length - s.length;
      l.unshift(S('On lit de gauche à droite avec un compteur de 1. Un 0 remet le compteur à zéro.', { why: 'Seules les suites de 1 posent problème.', b: P(s) }));
      l.push(S((v) => `Plus aucune suite de cinq 1 : ${v} bit${n > 1 ? 's' : ''} inséré${n > 1 ? 's' : ''} en tout.`, { v: n, bad: [n + 1, n > 0 ? n - 1 : 2], ask: 'Nombre de bits insérés', why: 'Une insertion par groupe complet de cinq 1.' }));
      l.push(S((v) => `Résultat : ${v}.`, { v: out, k: 's', bad: [n ? s : out + '0', out + '0'], ask: 'Charge utile après stuffing', why: 'Le récepteur retire chaque 0 qui suit cinq 1.' }));
      return l;
    },
    hamming({ W, d }) {
      const l = [];
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const x = hd(W[i], W[j]); l.push(S((v) => `${W[i]} et ${W[j]} : ${v} bit${x > 1 ? 's' : ''} différent${x > 1 ? 's' : ''}.`, { v: x, bad: [x + 1, x > 1 ? x - 1 : 2], ask: `Distance entre ${W[i]} et ${W[j]}`, why: 'On compare position par position et on compte les différences.' })); }
      return [...l,
        S((v) => `La plus petite des 6 distances : d_{min} = ${v}.`, { v: d, k: 'd', bad: [d + 1, d + 2], ask: 'dmin', why: 'Le code est aussi fragile que ses deux mots les plus proches.' }),
        S((v) => `Détection : d_{min} − 1 = ${v}.`, { v: d - 1, k: 'det', bad: [d, d + 1], ask: 'Erreurs détectées', why: 'Avec d_{min} erreurs, un mot peut devenir un autre mot valide : on ne voit rien.' }),
        S((v) => `Correction : ⌊(${d} − 1) / 2⌋ = ${v}.`, { v: Math.floor((d - 1) / 2), k: 'cor', bad: [Math.floor((d - 1) / 2) + 1, d - 1], ask: 'Erreurs corrigées', why: 'Le mot reçu doit rester plus proche du mot envoyé que de tout autre.' })];
    },
    delay({ size, rate, dist, ttx, tprop }) {
      const bits = size * 8;
      return [
        S((v) => `Taille en bits : ${size} × 8 = ${v} bits.`, { v: bits, bad: [size, size * 10], ask: 'Taille en bits', num: true, why: 'Les débits sont en bits par seconde, les tailles en octets.', b: delayFig(ttx, tprop) }),
        S((v) => `${rate} Mbit/s, c’est ${v} bits par µs.`, { v: rate, bad: [rate * 1000, rate / 10], ask: 'Débit en bits par µs', num: true, why: '1 Mbit/s = 10^6 bits en 10^6 µs = 1 bit par µs.' }),
        S((v) => `T_{tx} = ${bits} / ${rate} = ${v} µs.`, { v: f(ttx), k: 'ttx', bad: [f(ttx / 8), f(ttx * 10)], ask: 'Ttx (µs)', num: true, why: 'Temps pour pousser tous les bits sur le lien.' }),
        S((v) => `T_{prop} = ${dist} / 200 000 s = ${v} µs.`, { v: f(tprop), k: 'tprop', bad: [f(tprop / 10), f(tprop * 10)], ask: 'Tprop (µs)', num: true, why: 'Temps de voyage d’un bit : 200 000 km/s, c’est 0,2 km par µs, donc 5 µs par km.' }),
        S((v) => `Dernier bit reçu : ${f(ttx)} + ${f(tprop)} = ${v} µs.`, { v: f(ttx + tprop), k: 'tot', bad: [f((ttx + tprop) * 2), f((ttx + tprop) / 2)], ask: 'Dernier bit reçu à (µs)', num: true, why: 'Le dernier bit part à T_{tx}, puis voyage pendant T_{prop}.' })
      ];
    },
    bdp({ rate, rtt, frame, bdpBytes, ttx, u }) {
      return [
        S((v) => `RTT en secondes : ${rtt} ms = ${v} s.`, { v: f(rtt / 1000), bad: [f(rtt / 100), f(rtt / 10000, 4)], ask: 'RTT en secondes', num: true, why: 'Le débit est par seconde.', b: pipeFig(f(bdpBytes / 1000)) }),
        S((v) => `BDP en bits : ${rate} × 10^6 × ${f(rtt / 1000)} = ${v} Mbit.`, { v: f(rate * rtt / 1000), bad: [f(rate * rtt / 100), f(rate * rtt / 8000, 4)], ask: 'BDP en Mbit', num: true, why: 'Débit × temps = quantité de données dans le tuyau.' }),
        S((v) => `En octets : divisé par 8, soit ${v} ko.`, { v: f(bdpBytes / 1000), k: 'bdp', bad: [f(bdpBytes * 8 / 1000), f(bdpBytes / 8000)], ask: 'BDP en ko', num: true, why: '8 bits par octet, et 1 ko = 1000 octets.' }),
        S((v) => `Trames en vol : ${f(bdpBytes, 0)} / ${frame} = ${f(bdpBytes / frame, 2)}, arrondi au-dessus : ${v}.`, { v: Math.ceil(bdpBytes / frame), k: 'w', bad: [Math.ceil(bdpBytes / frame) + 1, Math.ceil(bdpBytes / frame) * 8], ask: 'Nombre de trames', num: true, why: 'Il faut remplir le tuyau : une trame entamée compte.' }),
        S((v) => `T_{tx} d’une trame : ${frame * 8} bits / ${rate} Mbit/s = ${v} ms.`, { v: f(ttx), bad: [f(ttx * 10), f(ttx / 8, 4)], ask: 'Ttx en ms', num: true, why: 'Temps utile pendant lequel on émet vraiment.' }),
        S((v) => `Stop-and-Wait : ${f(ttx)} / (${f(ttx)} + ${rtt}) = ${v} %.`, { v: f(u, 4), k: 'u', bad: [f(u * 10, 3), f(100 - u, 2)], ask: 'Utilisation en %', num: true, tol: 0.06, why: 'On émet une trame, puis on attend un RTT sans rien envoyer.' })
      ];
    },
    shannon({ B, M, snrDb, ny, snr, sh }) {
      const lg = Math.log2(M);
      return [
        S((v) => `log_2(${M}) = ${v}, car 2^${lg} = ${M}.`, { v: lg, bad: [lg + 1, M], ask: `log2(${M})`, num: true, why: 'Avec M niveaux, un symbole porte log_2(M) bits.' }),
        S((v) => `Nyquist : 2 × ${B} × ${lg} = ${f(ny * 1000, 0)} bit/s = ${v} kbit/s.`, { v: f(ny), k: 'ny', bad: [f(ny / 2), f(2 * B * M / 1000)], ask: 'Nyquist (kbit/s)', num: true, why: 'Sans bruit : au plus 2B symboles par seconde.' }),
        S((v) => `S/N = 10^{${snrDb}/10} = ${v}.`, { v: snr, bad: [snrDb, snr * 10], ask: 'S/N (sans dB)', num: true, why: 'Les décibels sont un logarithme : il faut revenir au vrai rapport.' }),
        S((v) => `log_2(1 + ${snr}) = ln(${1 + snr}) / ln 2 = ${v}.`, { v: f(Math.log2(1 + snr)), bad: [f(Math.log10(1 + snr)), f(Math.log(1 + snr))], ask: `log2(${1 + snr})`, num: true, why: 'La calculatrice n’a pas de log_2 : on divise deux ln.' }),
        S((v) => `Shannon : ${B} × ${f(Math.log2(1 + snr))} = ${v} kbit/s.`, { v: f(sh, 2), k: 'sh', bad: [f(sh * 2, 2), f(B * Math.log2(1 + snrDb) / 1000, 2)], ask: 'Shannon (kbit/s)', num: true, why: 'Avec bruit : la capacité maximale, quel que soit le codage.' })
      ];
    },
    rip({ table, ann, rows }) {
      return [S('On prend chaque ligne annoncée par R2, on ajoute 1, puis on compare avec la table de R1.', { why: 'Pour passer par R2, il faut d’abord l’atteindre : un saut de plus.', b: ripFig() }), ...ann.map((a, i) => {
        const pr = Math.min(16, a.c + 1), cur = table.find((t) => t.d === a.d), fin = rows[i].fin;
        const why = !cur ? (pr >= 16 ? 'Coût 16 = inaccessible : on n’ajoute pas la route.' : 'Destination inconnue : toute route finie est bonne à prendre.') : cur.nh === 'R2' ? 'L’annonce vient de notre prochain saut actuel : on l’applique toujours, même si c’est pire.' : pr < cur.c ? `${pr} < ${cur.c} : on change pour R2.` : `${pr} ≥ ${cur.c} : on garde la route actuelle.`;
        return S((v) => `${a.d} : annoncé ${a.c}, donc ${pr} par R2. ${cur ? `Actuel : ${cur.c} via ${cur.nh}.` : 'Pas dans la table.'} Coût final : ${v}.`, { v: fin, k: 'c' + i, bad: [a.c, cur && cur.c !== fin ? cur.c : fin + 1, pr], ask: `Coût final vers ${a.d}`, why });
      })];
    },
    decode({ words, sent, recv, valid }) {
      return [
        S((v) => `${recv} est dans la liste des mots du code ? ${v}.`, { v: valid ? 'oui' : 'non', k: 'ok', bad: [valid ? 'non' : 'oui'], opt: ['oui', 'non'], ask: 'Est-ce un mot du code ?', why: 'Un mot du code est considéré comme reçu sans erreur.' }),
        S((v) => `Distances : le mot le plus proche est à distance ${v}.`, { v: valid ? 0 : 1, bad: [valid ? 1 : 0, 2], ask: 'Plus petite distance à un mot du code', why: 'On compte les bits différents avec chaque mot.', b: T(['Mot', 'Distance'], words.map((w) => [w, hd(w, recv)])) }),
        S((v) => `On corrige vers ce mot : ${v}.`, { v: sent, k: 'w', bad: words.filter((w) => w !== sent).slice(0, 3), ask: 'Mot corrigé', why: 'd_{min} = 3 : un seul mot peut être à distance 1.' }),
        S((v) => `Message : les 3 premiers bits, ${v}.`, { v: sent.slice(0, 3), k: 'm', bad: [sent.slice(3) === sent.slice(0, 3) ? flip(sent.slice(0, 3), 0) : sent.slice(3), flip(sent.slice(0, 3), 1)], ask: 'Message', why: 'Les 3 derniers bits sont la redondance ajoutée pour corriger.' })
      ];
    },
    landau({ fe, ge, i, j, ans }) {
      const all = ORDERS.map((x) => x[0]);
      return [
        S((v) => `Terme dominant de f = ${fe} : ${v}.`, { v: all[i], bad: others(all[i], all).slice(0, 3), opt: all, ask: `Terme dominant de ${fe}`, why: 'On garde le terme qui grandit le plus vite, sans sa constante.' }),
        S((v) => `Terme dominant de g = ${ge} : ${v}.`, { v: all[j], bad: others(all[j], all).slice(0, 3), opt: all, ask: `Terme dominant de ${ge}`, why: 'On garde le terme qui grandit le plus vite, sans sa constante.', b: P('1 < log n < √n < n < n log n < n² < n³ < 2^n') }),
        S((v) => `${i === j ? 'Même rang' : i < j ? 'f est avant g' : 'f est après g'} dans l’échelle : ${v}.`, { v: ans, k: 'r', bad: others(ans, ['O seulement', 'Θ', 'Ω seulement']), opt: ['O seulement', 'Θ', 'Ω seulement'], ask: 'Relation', why: 'O : f est dominée par g. Ω : f domine g. Θ : les deux.' })
      ];
    },
    knap({ items, Vmax, F: G }) {
      const l = [S(`Ligne j = 0 : aucun objet, donc que des 0. Ligne 1 : objet 1 (v = ${items[0].v}, w = ${items[0].w}), soit 0 avant V = ${items[0].v}, puis ${items[0].w}.`, { why: 'F(j, V) est la meilleure utilité avec les j premiers objets et un volume V.', b: T(['V', ...G[0].map((_, V) => V)], [['j = 1', ...G[1]]]) })];
      for (let j = 2; j <= 4; j++) {
        const it = items[j - 1], fits = it.v <= Vmax, av = fits ? G[j - 1][Vmax - it.v] + it.w : null, sans = G[j - 1][Vmax], r = G[j][Vmax];
        if (fits) l.push(S((v) => `Avec l’objet ${j} : F(${j - 1}, ${Vmax} − ${it.v}) + ${it.w} = ${G[j - 1][Vmax - it.v]} + ${it.w} = ${v}.`, { v: av, bad: [sans + it.w === av ? av + 1 : sans + it.w, av + it.v], ask: `F(${j - 1}, ${Vmax - it.v}) + ${it.w}`, why: `Prendre l’objet ${j} consomme ${it.v} : on regarde la ligne du dessus, décalée de ${it.v}.`, b: T(['V', ...G[0].map((_, V) => V)], [[`j = ${j - 1}`, ...G[j - 1]]]) }));
        l.push(S((v) => (fits ? `F(${j}, ${Vmax}) = max(${sans} sans, ${av} avec) = ${v}.` : `L’objet ${j} (v = ${it.v}) ne rentre pas : F(${j}, ${Vmax}) = ${v}.`), { v: r, ...(j === 2 ? { k: 'f2' } : j === 4 ? { k: 'opt' } : {}), bad: [fits && Math.min(sans, av) !== r ? Math.min(sans, av) : r + 1, r + 2], ask: `F(${j}, ${Vmax})`, why: 'On garde le meilleur des deux choix : prendre l’objet ou non.', b: T(['V', ...G[0].map((_, V) => V)], [[`j = ${j}`, ...G[j]]]) }));
      }
      return l;
    },
    bf({ E, hist, N }) {
      const inf = (x) => (x === Infinity ? '∞' : String(x)), l = [S('Départ : 0 pour A, ∞ pour les autres.', { why: 'On ne connaît encore aucun chemin.', b: T(['', ...N], [['k = 0', ...hist[0].map(inf)]]) })];
      for (let k = 1; k <= 4; k++) {
        const ch = N.map((_, i) => i).filter((i) => hist[k][i] !== hist[k - 1][i]);
        if (!ch.length) { l.push(S(`Tour ${k} : aucune distance ne change, on peut s’arrêter.`, { why: 'Si un tour n’améliore rien, les suivants non plus.' })); break; }
        ch.forEach((i) => {
          const inc = E.filter((e) => e[1] === i && hist[k - 1][e[0]] < Infinity);
          l.push(S((v) => `Tour ${k}, sommet ${N[i]} : ${inc.map((e) => `${N[e[0]]} ${hist[k - 1][e[0]]} + ${e[2]} = ${hist[k - 1][e[0]] + e[2]}`).join(' ; ')}. On garde ${v}.`, { v: hist[k][i], bad: [hist[k][i] + 1, hist[k][i] + 3], ask: `Distance de ${N[i]} après le tour ${k}`, why: hist[k - 1][i] === Infinity ? 'Premier chemin trouvé vers ce sommet.' : `Mieux que l’ancienne valeur ${hist[k - 1][i]}.` }));
        });
        l[l.length - 1].b = T(['', ...N], [[`k = ${k}`, ...hist[k].map(inf)]]);
      }
      const last = hist[4];
      N.slice(1).forEach((x, i) => l.push(S((v) => `Distance finale A → ${x} : ${v}.`, { v: inf(last[i + 1]), k: x, bad: nb(last[i + 1]).slice(0, 2), ask: `Distance A → ${x}`, why: 'Lue sur la dernière ligne.' })));
      return l;
    },
    ls({ m, p, a, b, L, lb }) {
      const M = Array.from({ length: m }, (_, i) => 'M' + (i + 1));
      const seq = (nm, r) => r.tr.map((t) => S((v) => `${nm}, tâche ${t.x} : la moins chargée est ${v}. Charges : ${t.l.join(' / ')}.`, { v: M[t.i], bad: others(M[t.i], M), opt: M, ask: `${nm} : où va la tâche ${t.x} ?`, why: 'En cas d’égalité, la machine de plus petit numéro.' }));
      return [...seq('LS', a), S((v) => `C_{max} de List Scheduling = plus grande charge = ${v}.`, { v: a.c, k: 'ls', bad: [a.c + 1, Math.min(...a.l) === a.c ? a.c + 2 : Math.min(...a.l)], ask: 'Cmax List Scheduling', why: 'Le makespan est l’heure où la dernière machine finit.' }),
        S(`LPT : on trie d’abord les durées en décroissant : ${[...p].sort((x, y) => y - x).join(', ')}.`, { why: 'Placer les grosses tâches tôt évite qu’une grosse tombe à la fin.' }), ...seq('LPT', b),
        S((v) => `C_{max} de LPT = ${v}.`, { v: b.c, k: 'lpt', bad: [b.c + 1, b.c - 1], ask: 'Cmax LPT', why: 'Plus grande charge.' }),
        S((v) => `Borne : L / m = ${L} / ${m} = ${f(L / m, 2)}, p_{max} = ${Math.max(...p)}. Le plus grand, arrondi au-dessus : ${v}.`, { v: lb, k: 'lb', bad: [lb + 1, L], ask: 'Borne inférieure de OPT', why: 'OPT ne peut faire mieux que la charge moyenne, ni couper la plus longue tâche.' })];
    },
    round(r) {
      if (r.add) return [
        S((v) => `L = somme des durées = ${v}.`, { v: r.L, bad: nb(r.L).slice(0, 2), ask: 'L', num: true, tol: 0.001, why: 'Charge totale.' }),
        S((v) => `Borne inférieure : L / m = ${r.L} / ${r.m} = ${v}.`, { v: f(r.L / r.m), bad: [f(r.L), f(r.L / r.n)].filter((z) => z !== f(r.L / r.m)), ask: 'L / m', num: true, why: 'C’est l’échelle de OPT.' }),
        S((v) => `K = ε × (L / m) / n = ${f(r.eps)} × ${f(r.L / r.m)} / ${r.n} = ${v}.`, { v: f(r.K, 4), k: 'K', bad: [f(r.K * r.n, 4), f(r.K / r.m, 4)], ask: 'K', num: true, why: 'n arrondis d’erreur K au plus font une erreur totale de ε × LB.' }),
        S((v) => `${r.pj} / K = ${f(r.pj / r.K, 2)}, arrondi au-dessus : ${v}.`, { v: Math.round(r.ps / r.K), bad: nb(Math.round(r.ps / r.K)).slice(0, 2), ask: `⌈${r.pj} / K⌉`, why: 'On arrondit vers le haut pour que la solution reste valable avec les vraies durées.' }),
        S((v) => `p^# = K × ${Math.round(r.ps / r.K)} = ${v}.`, { v: f(r.ps, 4), k: 'ps', bad: [f(r.ps - r.K, 4), f(r.ps + r.K, 4)], ask: 'p#', num: true, tol: 0.005, why: 'Multiple de K juste au-dessus.' })
      ];
      const ex = Math.log(r.v) / Math.log(1 + r.eps);
      return [
        S((v) => `log_{1+ε}(v) = ln ${r.v} / ln ${f(1 + r.eps)} = ${v}.`, { v: f(ex), bad: [f(ex + 1), f(Math.log(r.v))].filter((z) => z !== f(ex)), ask: 'ln v / ln(1 + ε)', num: true, why: 'On cherche à quelle puissance élever 1 + ε pour obtenir v.' }),
        S((v) => `Arrondi au-dessus : k = ${v}.`, { v: r.k, k: 'k', bad: [r.k + 1, r.k - 1], ask: 'k', why: 'On veut v^# ≥ v.' }),
        S((v) => `v^# = ${f(1 + r.eps)}^{${r.k}} = ${v}.`, { v: f(r.vs), k: 'vs', bad: [f(r.vs / (1 + r.eps)), f(r.vs * (1 + r.eps))], ask: 'v#', num: true, why: `Contrôle : ${r.v} ≤ v^# < ${f((1 + r.eps) * r.v)}.` })
      ];
    },
    greedysc({ sets, tours, price }) {
      const names = sets.map((_, i) => 'S' + (i + 1)), l = [];
      tours.forEach((t, i) => {
        l.push(S((v) => `Tour ${i + 1}, nouveaux éléments couverts : ${names.map((n, j) => `${n} ${t.counts[j]}`).join(', ')}. On prend ${v}.`, { v: 'S' + t.s, bad: others('S' + t.s, names), opt: names, ask: `Tour ${i + 1} : quel ensemble ?`, why: 'Celui qui couvre le plus d’éléments pas encore couverts ; à égalité, le plus petit indice.' }));
        l.push(S((v) => `S${t.s} couvre ${t.nw.join(', ')} : chacun paie 1 / ${v}.`, { v: t.nw.length, bad: [t.nw.length + 1, sets[t.s - 1].length === t.nw.length ? t.nw.length + 2 : sets[t.s - 1].length], ask: `Par combien se partage le coût de S${t.s} ?`, why: 'Seuls les nouveaux éléments se partagent le coût 1 de l’ensemble.' }));
      });
      const seq = tours.map((t) => 'S' + t.s).join(',');
      l.push(S((v) => `Ensembles choisis dans l’ordre : ${v}.`, { v: seq, k: 'seq', bad: [names.join(','), tours.map((t) => 'S' + t.s).reverse().join(',')], ask: 'Ensembles choisis', why: 'On s’arrête quand tout est couvert.' }));
      l.push(S((v) => `Prix de l’élément 1 : ${v}.`, { v: f(price[1]), k: 'p1', bad: [f(price[1] / 2), f(price[1] + 0.5)], ask: 'Prix de l’élément 1', num: true, why: 'Le prix payé au tour où il a été couvert.' }));
      return l;
    },
    tree({ n, par, inn, out }) {
      const kids = (v) => Array.from({ length: n }, (_, i) => i + 1).filter((c) => c > 1 && par[c] === v), leaves = Array.from({ length: n }, (_, i) => i + 1).filter((v) => !kids(v).length);
      const l = [S(`Feuilles ${leaves.join(', ')} : in = 1, out = 0.`, { why: 'Une feuille seule : 1 si on la prend, 0 sinon.', b: T(['Sommet', 'Enfants'], Array.from({ length: n }, (_, i) => [i + 1, kids(i + 1).join(', ') || 'aucun'])) })];
      for (let v = n; v >= 1; v--) {
        const c = kids(v); if (!c.length) continue;
        l.push(S((x) => `in[${v}] = 1 + ${c.map((k) => out[k]).join(' + ')} = ${x}.`, { v: inn[v], ...(v === 1 ? { k: 'in1' } : {}), bad: [inn[v] + 1, inn[v] - 1], ask: `in[${v}]`, why: 'On prend le sommet : aucun de ses enfants ne peut être pris, on additionne leurs out.' }));
        l.push(S((x) => `out[${v}] = ${c.map((k) => `max(${inn[k]}, ${out[k]})`).join(' + ')} = ${x}.`, { v: out[v], bad: [out[v] + 1, out[v] - 1], ask: `out[${v}]`, why: 'Sans le sommet, chaque enfant choisit son meilleur cas.' }));
      }
      const a = Math.max(inn[1], out[1]);
      l.push(S((x) => `α(T) = max(in[1], out[1]) = max(${inn[1]}, ${out[1]}) = ${x}.`, { v: a, k: 'a', bad: nb(a).slice(0, 2), ask: 'α(T)', why: 'À la racine, on prend le meilleur des deux.' }));
      return l;
    },
    pivot({ S: st, ch }) {
      const l = simplexIt(st, ch, '', true);
      l[0].k = 'in'; l[1].k = 'out';
      return l;
    },
    simplexe({ hist, S: st, x }) {
      return [...hist.flatMap((h, i) => simplexIt(h.S, h.ch, `Itération ${i + 1}. `, false)),
        S('Tous les coûts réduits sont ≤ 0 : la base est optimale.', { why: 'Aucune variable hors base ne peut plus améliorer z.' }),
        ...[0, 1].map((j) => S((v) => `x_${j + 1} = ${v}${st.base.includes(j) ? ' (lu dans la colonne t)' : ' (hors base)'}.`, { v: qs(x[j]), k: 'x' + (j + 1), bad: [qs(qadd(x[j], Q(1))), qs(qadd(x[j], Q(1, 2)))], ask: `x${j + 1}`, num: true, why: 'Une variable de base se lit dans t ; une variable hors base vaut 0.' })),
        S((v) => `v(P) = ${v}.`, { v: qs(st.z), k: 'z', bad: [qs(qadd(st.z, Q(1))), qs(qadd(st.z, Q(1, 2)))], ask: 'v(P)', num: true, why: 'Opposé de la case en bas à droite.' })];
    },
    dualw({ max, c, A, b, rel, sg, uSign, cRel, names, un }) {
      return [S(`Le primal est un ${max ? 'max' : 'min'} : le dual est un ${max ? 'min' : 'max'}, avec les seconds membres en objectif : ${max ? 'min' : 'max'} ${linExpr(b, un)}.`, { why: 'Chaque contrainte devient une variable, chaque variable devient une contrainte.' }),
        ...un.map((u, i) => S((v) => `Contrainte ${i + 1} en « ${rel[i]} » dans un ${max ? 'max' : 'min'} : ${u} ${v}.`, { v: uSign[i], k: u, bad: others(uSign[i], ['≥ 0', '≤ 0', 'libre']), opt: ['≥ 0', '≤ 0', 'libre'], ask: `Signe de ${u} (contrainte ${i + 1} : ${rel[i]})`, why: rel[i] === '=' ? 'Une égalité donne une variable libre.' : `Sens naturel d’un ${max ? 'max : ≤' : 'min : ≥'}. Sens naturel : u ≥ 0 ; sens contraire : u ≤ 0.` })),
        ...names.map((x, j) => S((v) => `Colonne de ${x} (${sg[j] === 'libre' ? 'libre' : sg[j]}) : ${linExpr(A.map((r) => r[j]), un)} ${v} ${c[j]}.`, { v: cRel[j], k: 'c' + j, bad: others(cRel[j], ['≥', '≤', '=']), opt: ['≥', '≤', '='], ask: `Sens de la contrainte de ${x} (${sg[j] === 'libre' ? 'libre' : sg[j]})`, why: sg[j] === 'libre' ? 'Une variable libre donne une égalité.' : max ? 'Primal max : le signe de x donne le même sens à la contrainte duale.' : 'Primal min : le signe de x donne le sens contraire.' }))];
    },
    sadrelax({ order, b, R, G, maj }) {
      const l = [S(`Objets triés par profit / poids : ${order.map((x) => `x_${x.j} (${f(x.c / x.a, 2)})`).join(', ')}.`, { why: 'On veut le plus de profit par unité de poids.' })];
      let rest = b;
      R.C.forEach((x) => { const r = rest - x.a; l.push(S((v) => `x_${x.j} (poids ${x.a}) entre : reste ${rest0(r, x)} − ${x.a} = ${v}.`, { v: r, bad: [r + 1, r + x.a], ask: `Capacité restante après x${x.j} (poids ${x.a}, il reste ${r + x.a})`, why: 'Il rentre en entier.' })); rest = r; });
      function rest0(r, x) { return r + x.a; }
      return [...l,
        S((v) => `L’objet suivant, ${v} (poids ${R.s.a}), ne rentre pas dans ${R.rest} : c’est l’objet critique.`, { v: 'x' + R.s.j, bad: others('x' + R.s.j, order.map((x) => 'x' + x.j)).slice(0, 3), ask: 'Objet critique (ex. x3)', why: 'Le premier, dans l’ordre des ratios, qui ne rentre pas en entier.' }),
        S((v) => `Relaxation : ${R.C.reduce((s, x) => s + x.c, 0)} + ${R.s.c} × ${R.rest}/${R.s.a} = ${v}.`, { v: qs(R.val), k: 'v', bad: [qs(qadd(R.val, Q(1))), qs(Q(R.C.reduce((s, x) => s + x.c, 0)))].filter((z) => z !== qs(R.val)), ask: 'Valeur de la relaxation', num: true, why: 'On prend la fraction de l’objet critique qui remplit exactement le sac.' }),
        S((v) => `Données entières : majorant ⌊${f(qv(R.val), 2)}⌋ = ${v}.`, { v: maj, k: 'maj', bad: [maj + 1, maj - 1], ask: 'Majorant entier', why: 'v(P) est entier et ne dépasse pas la relaxation.' }),
        S((v) => `Glouton : x_${R.s.j} à 0, puis les suivants qui rentrent${G.steps.length ? ` (${G.steps.join(' ; ')})` : ''}. Valeur ${v}.`, { v: G.val, k: 'g', bad: [G.val + 1, maj === G.val ? G.val - 1 : maj], ask: 'Valeur gloutonne', why: 'On ne s’arrête pas à l’objet critique : un plus petit peut encore rentrer.' })];
    },
    sadfix({ order, b, G, it, at1, bound, fix }) {
      const R = at1 ? dantzig(order, b, new Set([it.j])) : dantzig(order, b - it.a, new Set([it.j])), z = at1 ? 0 : 1;
      return [
        S((v) => `Dans la relaxation x_${it.j} vaut ${at1 ? 1 : 0} : on teste l’opposé, x_${it.j} = ${v}.`, { v: z, bad: [1 - z], opt: ['0', '1'], ask: `Quelle valeur forcer pour x${it.j} ?`, why: 'Si l’opposé est inutile, la variable est fixée.' }),
        S((v) => `Capacité restante pour les autres : ${at1 ? b : `${b} − ${it.a}`} = ${v}.`, { v: at1 ? b : b - it.a, bad: [at1 ? b - it.a : b], ask: 'Capacité pour les autres objets', num: true, tol: 0.001, why: at1 ? 'L’objet n’est pas pris : toute la capacité reste.' : `L’objet est pris : il consomme ${it.a} et rapporte déjà ${it.c}.` }),
        S(`On remplit les autres par ratio : ${R.C.map((x) => `x_${x.j}`).join(', ') || 'aucun'} en entier${R.s ? `, puis ${R.rest}/${R.s.a} de x_${R.s.j}` : ''}.`, { why: 'C’est la relaxation de Dantzig sur les objets restants.' }),
        S((v) => `Relaxation${at1 ? '' : ` (avec + ${it.c})`} : ${v}.`, { v: qs(bound), k: 'v', bad: [qs(qadd(bound, Q(1))), qs(qsub(bound, Q(at1 ? 2 : it.c)))], ask: 'Valeur de la relaxation forcée', num: true, why: 'C’est le mieux qu’on puisse espérer avec cette valeur forcée.' }),
        S((v) => `${f(qv(bound), 2)} ${fix ? '≤' : '>'} ${G.val} : peut-on fixer x_${it.j} à ${at1 ? 1 : 0} ? ${v}.`, { v: fix ? 'oui' : 'non', k: 'f', bad: [fix ? 'non' : 'oui'], opt: ['oui', 'non'], ask: `Peut-on fixer x${it.j} à ${at1 ? 1 : 0} ?`, why: fix ? 'Même en étant optimiste, on ne bat pas le glouton.' : 'On pourrait encore battre le glouton : rien à conclure.' })
      ];
    },
    sadpd({ c, a, b, f: G, entier }) {
      const l = [S(`f_1(y) : ${entier ? `${c[0]} × ⌊y / ${a[0]}⌋` : `${c[0]} dès que y ≥ ${a[0]}, 0 avant`}.`, { why: entier ? 'On prend l’objet 1 autant de fois qu’il rentre.' : 'En 0-1, l’objet 1 ne se prend qu’une fois.', b: T(['y', ...G[0].map((_, y) => y)], [['f_1', ...G[0]]]) })];
      for (let q = 1; q < 4; q++) {
        const fits = a[q] <= b, src = entier ? G[q] : G[q - 1], av = fits ? c[q] + src[b - a[q]] : 0, r = G[q][b];
        if (fits) l.push(S((v) => `Avec l’objet ${q + 1} : ${c[q]} + f_${entier ? q + 1 : q}(${b} − ${a[q]}) = ${c[q]} + ${src[b - a[q]]} = ${v}.`, { v: av, bad: [av + 1, c[q] + G[q - 1][b] === av ? av + 2 : c[q] + G[q - 1][b]], ask: `${c[q]} + f${entier ? q + 1 : q}(${b - a[q]})`, why: entier ? 'Entiers : on reste sur la même colonne, l’objet peut resservir.' : '0-1 : on revient à la colonne précédente, l’objet ne sert qu’une fois.', b: T(['y', ...G[0].map((_, y) => y)], [[`f_${q}`, ...G[q - 1]], ...(entier ? [[`f_${q + 1}`, ...G[q].map((x, y) => (y < b ? x : '?'))]] : [])]) }));
        l.push(S((v) => (fits ? `f_${q + 1}(${b}) = max(${G[q - 1][b]}, ${av}) = ${v}.` : `L’objet ${q + 1} ne rentre pas : f_${q + 1}(${b}) = ${v}.`), { v: r, ...(q > 1 ? { k: 'f' + (q + 1) } : {}), bad: nb(r).slice(0, 2), ask: `f${q + 1}(${b})`, why: 'On garde le meilleur : sans ou avec l’objet.', b: T(['y', ...G[0].map((_, y) => y)], [[`f_${q + 1}`, ...G[q]]]) }));
      }
      return l;
    },
    sensb({ t, col, l: li, al, lo, hi }) {
      const L = [S('La base reste réalisable tant que t + λ × colonne ≥ 0, ligne par ligne.', { why: 'Changer un second membre ne change pas d : la base reste optimale, seul t bouge.' })];
      col.forEach((v, i) => {
        if (!v.n) { L.push(S(`Ligne ${i + 1} : coefficient nul, aucune condition.`, { why: 'Cette variable ne bouge pas.' })); return; }
        const r = qdiv(qneg(t[i]), v), pos = qv(v) > 0;
        L.push(S((x) => `Ligne ${i + 1} : ${qs(t[i])} + λ × (${qs(v)}) ≥ 0 donne λ ${pos ? '≥' : '≤'} ${x}.`, { v: qs(r), bad: [qs(qneg(r)), qs(qadd(r, Q(1)))], ask: `Ligne ${i + 1} : λ ${pos ? '≥' : '≤'} ?`, num: true, why: pos ? 'On divise par un nombre positif : le sens reste.' : 'On divise par un nombre négatif : le sens s’inverse.' }));
      });
      return [...L,
        S((x) => `Plus grande des bornes basses : λ ≥ ${x}.`, { v: qs(lo), k: 'lo', bad: [qs(qadd(lo, Q(1))), qs(qneg(lo))], ask: 'λ minimal', num: true, why: 'Toutes les conditions doivent être vraies en même temps.' }),
        S((x) => `Plus petite des bornes hautes : λ ≤ ${x}.`, { v: qs(hi), k: 'hi', bad: [qs(qadd(hi, Q(1))), qs(qneg(hi))], ask: 'λ maximal', num: true, why: `Donc a_${li} varie de ${qs(qadd(Q(al), lo))} à ${qs(qadd(Q(al), hi))}.` })];
    }
  };
})();

// Idée de départ, avant toute formule
const IDEES = {
  cidr: 'Une adresse IP est comme un numéro de téléphone : le début dit le quartier (réseau), la fin dit la maison (hôte). Le préfixe dit où couper, et toutes les adresses d’un même quartier se suivent.',
  mask: 'Le masque et le préfixe disent la même chose : où s’arrête la partie réseau. Le préfixe compte les bits, le masque les écrit en décimal, octet par octet.',
  same: 'Deux machines se parlent directement si elles sont dans le même quartier. Il suffit de trouver le quartier de chacune et de comparer.',
  lpm: 'Plusieurs routes peuvent convenir, comme « France » et « Metz » pour une lettre. Le routeur choisit toujours la plus précise.',
  crc: 'On ajoute au message quelques bits calculés pour que le tout soit divisible par le générateur. Si un bit change en route, la division ne tombe plus juste.',
  stuff: 'La trame est délimitée par 01111110. On casse toute suite de cinq 1 dans les données pour qu’elles ne ressemblent jamais à ce fanion.',
  hamming: 'Plus les mots d’un code sont différents entre eux, plus il faut d’erreurs pour les confondre. La distance minimale mesure cette sécurité.',
  delay: 'Comme un train : il faut du temps pour que tous les wagons quittent la gare (émission), puis du temps pour faire le trajet (propagation). Les deux ne dépendent pas des mêmes choses.',
  bdp: 'Un lien long et rapide contient beaucoup de données en voyage. Si on attend un accusé après chaque trame, le tuyau reste presque vide.',
  shannon: 'Deux limites : la vitesse à laquelle on peut changer de symbole (Nyquist) et le bruit qui empêche de distinguer trop de niveaux (Shannon).',
  rip: 'Chaque routeur croit ses voisins. Quand R2 dit « je suis à 4 sauts », R1 comprend « par R2, j’y suis à 5 ».',
  decode: 'Si un mot reçu n’existe pas, on suppose qu’il y a eu peu d’erreurs : on choisit le mot valide le plus proche.',
  landau: 'Pour de grands n, seul compte le terme qui grandit le plus vite. Le reste et les constantes deviennent invisibles.',
  knap: 'On résout d’abord des petits sacs avec peu d’objets. Pour chaque nouvel objet : est-ce que je gagne à le prendre, sachant la place qu’il prend ?',
  bf: 'On part sans rien savoir et on améliore : si passer par u raccourcit le chemin vers v, on met à jour. Après assez de tours, plus rien ne bouge.',
  ls: 'On donne chaque tâche à la machine la plus libre. Le danger est une grosse tâche qui arrive en dernier : LPT la place en premier.',
  round: 'On simplifie les nombres pour avoir moins de cas à tester. Tout le travail est de choisir une simplification assez fine pour perdre au plus ε.',
  greedysc: 'À chaque tour, l’ensemble le plus utile. Chaque élément garde en mémoire ce qu’il a coûté : la somme de ces prix sert à prouver la garantie.',
  tree: 'Pour chaque sommet, deux notes : le meilleur résultat si on le prend, et si on ne le prend pas. On remonte des feuilles à la racine.',
  pivot: 'On est sur un coin du domaine. On choisit l’arête qui fait le plus monter l’objectif, et on avance jusqu’au prochain coin.',
  simplexe: 'On va de coin en coin en montant toujours. Quand aucune arête ne monte, on est à l’optimum.',
  dualw: 'Le dual cherche la meilleure borne sur l’objectif en combinant les contraintes. Son écriture suit toujours le même tableau de correspondance.',
  sadrelax: 'On encadre la valeur inconnue : en trichant avec une fraction d’objet, on a un plafond ; avec un remplissage honnête, un plancher.',
  sadfix: 'On suppose le contraire de ce que conseille la relaxation. Si même le plafond de ce cas ne bat pas notre solution, ce cas est inutile.',
  sadpd: 'On construit la réponse pour toutes les capacités, objet après objet. La seule question : l’objet peut-il servir plusieurs fois ?',
  sensb: 'On change un peu une ressource et on regarde quand une variable de base deviendrait négative. Entre les deux limites, la base ne change pas.'
};
