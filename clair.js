// Explications détaillées des étapes de calcul, avec les nombres de l'exercice.
// Chaque règle : [motif cherché dans la question ou la phrase de l'étape, paragraphes ou tableaux].
// L'indice (why) reste court et ne donne pas la réponse ; le détail (d) s'affiche avec l'étape.
(() => {
  const T = (h, r) => ({ t: 'tab', h: h.map(String), r: r.map((l) => l.map(String)) });
  const f = (x, d = 3) => String(Number(x.toFixed(d))).replace('.', ',').replace('-', '−');
  const W = [128, 64, 32, 16, 8, 4, 2, 1];
  // Décomposition d'un octet : on parcourt les huit valeurs, on soustrait quand c'est possible
  const octet = (v) => {
    let r = v;
    const rows = W.map((w) => { const a = r, ok = r >= w; if (ok) r -= w; return [w, a, ok ? `${a} − ${w} = ${a - w}, oui` : `${a} − ${w} serait négatif, non`, ok ? '1' : '0', r]; });
    return [`On parcourt les valeurs des bits dans l’ordre : 128, 64, 32, 16, 8, 4, 2, 1. À chaque valeur, on regarde si on peut la soustraire du reste sans passer sous 0. Si oui, on soustrait et on écrit 1. Sinon, on ne soustrait pas et on écrit 0.`,
      `Exemple avec ${v} :`, T(['Valeur', 'Reste', 'Soustraction', 'Bit', 'Nouveau reste'], rows),
      `En lisant la colonne « Bit » de haut en bas : ${v} = ${rows.map((x) => x[3]).join('')} en binaire, soit ${rows.filter((x) => x[3] === '1').length} bit(s) à 1.`];
  };
  const poids = (n) => (n ? [`Les bits d’un octet valent, de gauche à droite : 128, 64, 32, 16, 8, 4, 2, 1. Un masque met ses 1 à gauche, donc on prend ${n === 1 ? 'la première valeur.' : `les ${n} premières valeurs et on les additionne.`}`, T(['Valeur', ...W], [['Bit', ...W.map((_, i) => (i < n ? '1' : '0'))]]), `${W.slice(0, n).join(' + ')} = ${W.slice(0, n).reduce((a, b) => a + b, 0)}.`] : ['Aucun bit à 1 dans cet octet : il vaut 0.']);
  const bloc = (v, b) => { const k = Math.floor(v / b); return [`Les blocs commencent à 0, puis tous les ${b}. Pour trouver celui de ${v} : ${v} ÷ ${b} = ${f(v / b, 2)}, on garde la partie entière ${k}, puis ${k} × ${b} = ${k * b}.`, `Le bloc va donc de ${k * b} à ${k * b + b - 1}, et ${v} est bien dedans.`]; };
  const octInfo = (p) => { const o = Math.min(3, Math.floor(p / 8)); return { o, mo: (maskInt(p) >>> (24 - 8 * o)) & 255, n: p - 8 * o }; };

  const CL = {
    cidr: ({ ip, p, m, n, b }) => {
      const { o, mo, n: nb } = octInfo(p), x = Number(ip.split('.')[o]), bl = 256 - mo;
      return [
        [/Quel octet/, [`Une adresse IP a 4 octets de 8 bits. Le préfixe /${p} dit que les ${p} premiers bits sont le réseau.`, T(['Octet', '1er', '2e', '3e', '4e'], [['Bits couverts', '1 à 8', '9 à 16', '17 à 24', '25 à 32']]), p % 8 ? `Le bit ${p} tombe dans le ${o + 1}e octet : c’est là que le réseau s’arrête, donc le seul octet où il y a un calcul à faire.` : `Le réseau s’arrête exactement à la fin du ${p / 8}e octet : la partie libre commence au ${o + 1}e.`]],
        [/masque dans cet octet/, poids(nb)],
        [/Taille de bloc/, [`Dans cet octet, ${nb} bit(s) sont fixes et ${8 - nb} sont libres. Avec ${8 - nb} bits libres, on peut écrire 2^{${8 - nb}} = ${2 ** (8 - nb)} valeurs différentes.`, `C’est la taille d’un bloc, et on la retrouve plus vite avec 256 − ${mo} = ${bl}.`]],
        [/Plus grand multiple/, bloc(x, bl)],
        [/Adresse réseau/, [`On recopie les octets à gauche du ${o + 1}e, on remplace ce ${o + 1}e octet par le début du bloc, et on met 0 dans ceux qui suivent.`, `${ip} devient ${int2ip(n)}.`]],
        [/Broadcast/, [`Le réseau suivant commencerait à ${int2ip((b + 1) >>> 0)}. L’adresse juste avant est la dernière de notre réseau : ${int2ip(b)}. C’est elle qui sert à parler à tout le monde.`]],
        [/Premier hôte/, [`${int2ip(n)} désigne le réseau lui-même, on ne peut pas la donner à une machine. La première utilisable est la suivante.`]],
        [/Dernier hôte/, [`${int2ip(b)} est le broadcast, on ne peut pas la donner à une machine. La dernière utilisable est celle d’avant.`]],
        [/Nombre d’hôtes/, [`32 − ${p} = ${32 - p} bits libres, donc 2^{${32 - p}} = ${2 ** (32 - p)} adresses en tout. On en retire 2 : le réseau et le broadcast.`]]
      ];
    },
    mask: ({ p, m, dir }) => {
      const full = Math.floor(p / 8), r = p % 8, val = r ? 256 - 2 ** (8 - r) : 0;
      return dir ? [
        [/valent 255/, [`Un octet qui vaut 255 a ses 8 bits à 1 (128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255). Dans ${m}, il y en a ${full}, donc ${full} × 8 = ${8 * full} bits à 1.`]],
        [/octet entamé/, octet(val)],
        [/Préfixe/, [`Les octets pleins donnent ${8 * full} bits, l’octet entamé en donne ${r}. ${8 * full} + ${r} = ${p}.`]]
      ] : [
        [/octets pleins/, [`Un octet fait 8 bits. ${p} ÷ 8 = ${full}, et il reste ${r} bit(s). Chaque octet plein vaut 255.`]],
        [/Bits restants/, [`${full} octet(s) plein(s) utilisent ${8 * full} bits. Il reste ${p} − ${8 * full} = ${r} bit(s) à placer dans l’octet suivant.`]],
        [/Valeur de cet octet/, poids(r)],
        [/Masque complet/, [`On écrit dans l’ordre : ${full} fois 255, puis ${val}, puis des 0 jusqu’à avoir 4 octets. Cela donne ${m}.`]]
      ];
    },
    same: ({ a, b, p, na, nb }) => {
      const { o, mo, n } = octInfo(p), bl = 256 - mo, x = Number(a.split('.')[o]), y = Number(b.split('.')[o]);
      return [
        [/Taille de bloc/, [...poids(n), `Le masque de cet octet vaut ${mo}, donc la taille de bloc est 256 − ${mo} = ${bl}.`]],
        [/Réseau de A/, [...bloc(x, bl), `On recopie les octets de gauche et on met des 0 à droite : ${int2ip(na)}.`]],
        [/Réseau de B/, [...bloc(y, bl), `On recopie les octets de gauche et on met des 0 à droite : ${int2ip(nb)}.`]],
        [/même sous-réseau/, [`On compare ${int2ip(na)} et ${int2ip(nb)}. Identiques : mêmes voisins, envoi direct. Différents : il faut passer par la passerelle.`]]
      ];
    },
    lpm: ({ dest, best }) => [
      [/0\.0\.0\.0\/0/, ['/0 veut dire « zéro bit à comparer ». Toutes les adresses conviennent : c’est la route utilisée quand rien d’autre ne convient.']],
      [/contient-elle/, (x) => { const r = x.ask.match(/^(\S+)/)[1], [net, l] = r.split('/'), L = Number(l); return [`On écrit l’adresse de destination et celle de la route, et on compare seulement le début :`, T(['', 'Adresse', `${L} premiers bits`], [['Destination', dest, L === 25 ? `${dest.split('.').slice(0, 3).join('.')} puis ${Number(dest.split('.')[3]) >= 128 ? '1' : '0'}` : dest.split('.').slice(0, L / 8).join('.')], ['Route', net, L === 25 ? `${net.split('.').slice(0, 3).join('.')} puis 1` : net.split('.').slice(0, L / 8).join('.')]]), L === 25 ? 'Le 25e bit est le premier du dernier octet : il vaut 1 si cet octet est au moins 128.' : 'Si ces débuts sont identiques, la route convient.']; }],
      [/Prochain saut/, [`Plusieurs routes peuvent convenir en même temps. On prend celle qui a le plus grand nombre après la barre, car elle décrit la plus petite zone : ici ${best.p}.`]]
    ],
    crc: ({ gen, data }) => [
      [/zéros ajouter/, [`Le degré est le nombre de bits du générateur moins 1 : ${gen.length} − 1 = ${gen.length - 1}. Le reste aura ${gen.length - 1} bits, et ces zéros lui réservent la place.`]],
      [/XOR/, (x) => { const [a, , g] = x.ask.replace(' = ?', '').split(' '); return ['On compare les bits un par un : deux bits identiques donnent 0, deux bits différents donnent 1.', T(['', ...[...a].map((_, i) => `bit ${i + 1}`)], [['Message', ...a], ['Générateur', ...g], ['Résultat', ...x.v]]), 'Le premier bit donne toujours 0. Ensuite on avance jusqu’au 1 suivant et on recommence.']; }],
      [/Reste/, [`On s’arrête quand il ne reste plus assez de bits pour placer le générateur. On garde les ${gen.length - 1} derniers bits, même s’ils commencent par des 0.`]],
      [/Trame transmise/, [`On colle le reste derrière le message d’origine ${data}, à la place des zéros ajoutés. Le récepteur refait la division : s’il trouve 0, il accepte.`]]
    ],
    stuff: () => [
      [/quel bit insérer/, ['Le fanion 01111110 contient six 1 à la suite. Pour qu’il n’apparaisse jamais dans les données, on casse la suite après cinq 1 en ajoutant un 0, quel que soit le bit d’après. Puis on recommence à compter à partir de 0.']],
      [/Nombre de bits insérés/, ['On compte les 0 ajoutés. Attention : après une insertion, le compteur repart à 0, donc six 1 ne provoquent qu’une insertion.']],
      [/après stuffing/, ['On recopie les données en ajoutant les 0 trouvés. À l’arrivée, le récepteur fait l’inverse : il supprime tout 0 placé après cinq 1.']]
    ],
    hamming: ({ d }) => [
      [/Distance entre (\d+) et (\d+)/, (x) => { const [, a, b] = x.ask.match(/(\d+) et (\d+)/); return ['On écrit les deux mots l’un sous l’autre et on compte les colonnes différentes.', T(['', ...[...a].map((_, i) => i + 1)], [['Mot 1', ...a], ['Mot 2', ...b], ['Différent ?', ...[...a].map((c, i) => (c === b[i] ? '' : 'oui'))]])]; }],
      [/dmin/, [`On prend la plus petite des distances calculées : ${d}. C’est le plus petit nombre d’erreurs qui transforme un mot du code en un autre.`]],
      [/détectées/, [`Avec ${d} erreurs, un mot peut devenir un autre mot valide, et on ne voit rien. Avec ${d - 1} erreur(s) au plus, c’est impossible : on remarque toujours l’erreur.`]],
      [/corrigées/, [`Pour corriger, le mot reçu doit rester plus près du bon mot que des autres. Avec d = ${d} : (${d} − 1) ÷ 2 = ${f((d - 1) / 2)}, arrondi en dessous à ${Math.floor((d - 1) / 2)}.`]]
    ],
    delay: ({ size, rate, dist, ttx, tprop }) => [
      [/Taille en bits/, [`Un octet fait 8 bits, et les débits sont donnés en bits. ${size} octets × 8 = ${size * 8} bits.`]],
      [/bits par µs/, [`1 Mbit/s veut dire un million de bits en une seconde. Une seconde contient un million de microsecondes, donc 1 Mbit/s fait 1 bit par µs. ${rate} Mbit/s font ${rate} bits par µs.`]],
      [/Ttx/, [`C’est le temps pour faire sortir tous les bits. On a ${size * 8} bits, à ${rate} bits par µs : ${size * 8} ÷ ${rate} = ${f(ttx)} µs.`]],
      [/Tprop/, [`C’est le temps de trajet d’un bit. ${dist} km ÷ 200 000 km/s = ${f(dist / 200000, 6)} s. On multiplie par 1 000 000 pour avoir des µs : ${f(tprop)}.`, 'Raccourci : 5 µs par km.']],
      [/Dernier bit/, [`Le dernier bit ne part qu’après tous les autres, à ${f(ttx)} µs. Il lui faut ensuite ${f(tprop)} µs de trajet. On additionne.`]]
    ],
    bdp: ({ rate, rtt, frame, bdpBytes, ttx, u }) => [
      [/RTT en secondes/, [`1 seconde = 1000 ms. ${rtt} ÷ 1000 = ${f(rtt / 1000)} s.`]],
      [/BDP en Mbit/, [`Pendant un aller-retour de ${f(rtt / 1000)} s, l’émetteur a le temps d’envoyer ${rate} Mbit/s × ${f(rtt / 1000)} s = ${f(rate * rtt / 1000)} Mbit avant de recevoir le premier accusé.`]],
      [/BDP en ko/, [`${f(rate * rtt / 1000)} Mbit = ${f(rate * rtt * 1000, 0)} bits. On divise par 8 pour avoir des octets (${f(bdpBytes, 0)}), puis par 1000 pour des ko.`]],
      [/Nombre de trames/, [`${f(bdpBytes, 0)} octets ÷ ${frame} octets par trame = ${f(bdpBytes / frame, 2)}. Une trame ne se coupe pas : on arrondit au-dessus pour remplir tout le lien.`]],
      [/Ttx en ms/, [`${frame} octets = ${frame * 8} bits. ${frame * 8} ÷ ${rate} 000 000 bit/s = ${f(ttx / 1000, 7)} s, soit ${f(ttx)} ms.`]],
      [/Utilisation/, [`On émet pendant ${f(ttx)} ms, puis on attend ${rtt} ms sans rien faire. Un cycle dure donc ${f(ttx + rtt)} ms, dont ${f(ttx)} seulement sont utiles : ${f(ttx)} ÷ ${f(ttx + rtt)} = ${f(u / 100, 5)}, soit ${f(u, 2)} %.`]]
    ],
    shannon: ({ B, M, snrDb, snr }) => [
      [/^log2\((2|4|8|16)\)/, [`log_2(${M}) répond à la question : combien de fois faut-il multiplier 2 par lui-même pour obtenir ${M} ? 2^${Math.log2(M)} = ${M}.`]],
      [/Nyquist/, [`On multiplie 2 × la bande (${B} Hz) × le nombre de bits par symbole (${Math.log2(M)}). Le résultat est en bit/s : on divise par 1000 pour des kbit/s.`]],
      [/S\/N/, [`Les décibels se convertissent avec 10^{dB/10}. ${snrDb} ÷ 10 = ${snrDb / 10}, et 10^${snrDb / 10} = ${snr}. Le signal est ${snr} fois plus fort que le bruit.`]],
      [/^log2/, [`Sur la calculatrice : ln(${1 + snr}) = ${f(Math.log(1 + snr), 4)}, puis on divise par ln(2) = 0,6931. Cela donne ${f(Math.log2(1 + snr))}.`]],
      [/Shannon/, [`On multiplie la bande par ce logarithme : ${B} × ${f(Math.log2(1 + snr))} = ${f(B * Math.log2(1 + snr), 0)} bit/s, puis on divise par 1000.`]]
    ],
    rip: () => [[/Coût final vers/, (x) => [x.why, 'La règle, dans l’ordre : coût proposé = coût annoncé + 1. Route inconnue : on l’ajoute (sauf si le coût est 16). Même prochain saut : on prend la nouvelle valeur dans tous les cas. Autre prochain saut : on change seulement si c’est plus petit.']]],
    decode: ({ recv, sent }) => [
      [/Plus petite distance/, ['On écrit le mot reçu sous chaque mot du code et on compte les bits différents. On garde le plus petit nombre trouvé.']],
      [/^Est-ce un mot/, [`On cherche ${recv} dans la liste. S’il y est, on considère qu’il n’y a pas eu d’erreur.`]],
      [/Mot corrigé/, recv === sent ? ['Le mot est dans la liste, il n’y a rien à corriger.'] : ['On compare bit à bit avec le mot le plus proche :', T(['', ...[...recv].map((_, i) => i + 1)], [['Reçu', ...recv], ['Mot du code', ...sent], ['Différent ?', ...[...recv].map((c, i) => (c === sent[i] ? '' : 'oui'))]]), 'Une seule différence : c’est le bit qui a été inversé pendant le transport.']],
      [/Message/, ['Ce code envoie les 3 bits de données, puis 3 bits ajoutés pour corriger. Le message est donc le début du mot corrigé.']]
    ],
    landau: ({ fe, ge }) => [
      [/dominant/, (x) => [`Dans ${x.ask.replace('Terme dominant de ', '')}, on imagine n très grand, par exemple n = 1 000 000. Le terme le plus grand écrase les autres : c’est ${x.v}. On enlève aussi le nombre devant.`]],
      [/Relation/, [`On place les deux termes dans l’échelle : 1 < log n < √n < n < n log n < n² < n³ < 2^n. f plus à gauche : O seulement. Au même endroit : Θ. f plus à droite : Ω seulement.`]]
    ],
    knap: ({ items, Vmax }) => [
      [/^F\(\d, \d+\) \+/, (x) => { const m = x.ask.match(/F\((\d), (\d+)\) \+ (\d+)/); return [`Si on prend l’objet ${Number(m[1]) + 1}, il occupe ${Vmax - m[2]} : il reste un volume de ${m[2]} pour les objets précédents. Le mieux qu’ils puissent faire est écrit dans la ligne j = ${m[1]}, colonne ${m[2]}. On y ajoute l’utilité ${m[3]} de l’objet.`]; }],
      [/^F\(/, (x) => { const j = Number(x.ask.match(/F\((\d)/)[1]); return [items[j - 1].v <= Vmax ? `Deux possibilités : ne pas prendre l’objet ${j} (on recopie la case du dessus), ou le prendre (le calcul d’avant). On garde le plus grand des deux.` : `L’objet ${j} est trop gros pour le sac : on recopie la case du dessus.`]; }]
    ],
    bf: ({ N }) => [
      [/après le tour/, (x) => ['Pour chaque arête qui arrive sur ce sommet : distance du point de départ de l’arête + poids de l’arête. On garde la plus petite valeur obtenue, si elle est meilleure que celle qu’on avait.', x.why]],
      [/^Distance A/, ['Après le dernier tour, plus aucune distance ne peut s’améliorer : on lit simplement le tableau.']]
    ],
    ls: ({ m }) => [
      [/où va la tâche/, (x) => [`On compare les charges des ${m} machines juste avant, et on met la tâche sur la plus petite. On ajoute ensuite la durée à cette charge. À égalité : la machine de plus petit numéro.`]],
      [/^Cmax/, ['Toutes les machines travaillent en même temps : le travail est fini quand la plus chargée a terminé.']],
      [/Borne/, ['Même en partageant parfaitement le travail, chaque machine aurait L / m. Et la plus longue tâche doit tenir entière sur une machine. OPT est donc au moins égal à ces deux nombres, donc au plus grand des deux. Les durées sont entières, on arrondit au-dessus.']]
    ],
    round: (r) => (r.add ? [
      [/^L$/, [`On additionne toutes les durées : ${r.p.join(' + ')} = ${r.L}.`]],
      [/L \/ m/, [`Si le travail était parfaitement partagé entre les ${r.m} machines, chacune aurait ${r.L} ÷ ${r.m}.`]],
      [/^K/, [`On a droit à une erreur totale de ε × (L / m). Elle est partagée entre ${r.n} tâches, donc chacune a droit à K : ${f(r.eps)} × ${f(r.L / r.m)} = ${f(r.eps * r.L / r.m)}, puis ÷ ${r.n}.`]],
      [/⌈/, [`On cherche combien de fois K il faut pour atteindre ${r.pj}. ${r.pj} ÷ ${f(r.K, 4)} = ${f(r.pj / r.K, 2)}, et on arrondit au-dessus.`]],
      [/p#/, ['On multiplie ce nombre par K. La durée arrondie est toujours au moins égale à la vraie, donc le planning reste valable.']]
    ] : [
      [/ln v/, [`On cherche l’exposant qui donne ${r.v} : (${f(1 + r.eps)})^{?} = ${r.v}. ln(${r.v}) = ${f(Math.log(r.v), 4)} et ln(${f(1 + r.eps)}) = ${f(Math.log(1 + r.eps), 4)}, on divise.`]],
      [/^k$/, ['L’exposant doit être entier, et le résultat au moins égal à v : on arrondit au-dessus.']],
      [/v#/, [`(${f(1 + r.eps)})^{${r.k}} = ${f(r.vs)}. L’exposant d’avant, ${r.k - 1}, donnerait ${f(r.vs / (1 + r.eps))}, plus petit que ${r.v}.`]]
    ]),
    greedysc: () => [
      [/quel ensemble/, ['Pour chaque ensemble, on compte seulement ses éléments qui ne sont pas encore couverts. On prend celui qui en a le plus.']],
      [/Par combien/, (x) => [`L’ensemble coûte 1. Ses ${x.v} nouveaux éléments se partagent ce coût : chacun paie 1 ÷ ${x.v} = ${f(1 / Number(x.v))}. Les éléments déjà couverts avant ne paient rien de plus.`]],
      [/Prix de l’élément 1/, ['On retrouve le tour où l’élément 1 a été couvert pour la première fois, et on lit le prix payé à ce tour.']]
    ],
    tree: () => [
      [/^in\[/, ['On décide de prendre ce sommet : il compte pour 1. Ses enfants lui sont reliés, donc on ne peut pas les prendre : on ajoute leur valeur out.']],
      [/^out\[/, ['On décide de ne pas prendre ce sommet. Chaque enfant est alors libre : on garde pour lui le plus grand entre in (pris) et out (pas pris), et on additionne.']],
      [/α/, ['À la racine, on regarde si c’est mieux de la prendre ou non : le plus grand de in[1] et out[1].']]
    ],
    dualw: ({ max }) => [
      [/Signe de/, (x) => [max ? 'Dans un max, les contraintes « normales » sont en ≤ (une ressource à ne pas dépasser). Contrainte ≤ : u ≥ 0. Contrainte ≥ : u ≤ 0. Contrainte = : u libre.' : 'Dans un min, les contraintes « normales » sont en ≥ (une demande à satisfaire). Contrainte ≥ : u ≥ 0. Contrainte ≤ : u ≤ 0. Contrainte = : u libre.']],
      [/Sens de la contrainte/, [max ? 'On lit la colonne de la variable : ses coefficients multiplient les u, et son coût va à droite. Primal max : variable ≥ 0 donne ≥, variable ≤ 0 donne ≤, variable libre donne =.' : 'On lit la colonne de la variable : ses coefficients multiplient les u, et son coût va à droite. Primal min : variable ≥ 0 donne ≤, variable ≤ 0 donne ≥, variable libre donne =.']]
    ],
    sadrelax: ({ R }) => [
      [/Capacité restante/, ['L’objet rentre en entier : on le prend et on retire son poids de la place disponible.']],
      [/Objet critique/, [`Il reste ${R.rest} de place et l’objet pèse ${R.s.a} : il ne rentre pas en entier. C’est le premier dans ce cas, on l’appelle l’objet critique.`]],
      [/Valeur de la relaxation/, [`La relaxation autorise à couper un objet. On remplit les ${R.rest} unités restantes avec ${R.rest}/${R.s.a} de l’objet critique, qui rapporte ${R.s.c} × ${R.rest}/${R.s.a}.`]],
      [/Majorant/, ['Couper un objet est interdit en vrai, donc cette valeur est au moins aussi bonne que la vraie réponse. Comme les profits sont entiers, la vraie réponse est entière : on arrondit en dessous.']],
      [/gloutonne/, ['Cette fois on ne coupe rien : on laisse l’objet critique, et on essaie les suivants un par un. On prend chacun de ceux qui tiennent dans la place restante.']]
    ],
    sadfix: ({ it, at1, G, bound, fix }) => [
      [/Quelle valeur forcer/, [`La relaxation choisit x_${it.j} = ${at1 ? 1 : 0}. On essaie l’autre valeur pour voir si elle peut encore servir. Si elle ne peut mener à rien de mieux, on sait que x_${it.j} = ${at1 ? 1 : 0}.`]],
      [/relaxation forcée/, ['On refait le remplissage par ratio, avec un objet coupé à la fin, en respectant la valeur forcée. C’est le meilleur résultat qu’on puisse espérer dans ce cas.']],
      [/Peut-on fixer/, [`On a déjà une vraie solution qui vaut ${G.val}. Le cas testé promet au mieux ${f(qv(bound), 2)}. ${fix ? 'C’est inférieur ou égal : inutile de chercher là, on fixe la variable.' : 'C’est supérieur : il pourrait cacher une meilleure solution, on ne peut pas conclure.'}`]]
    ],
    sadpd: ({ entier, b }) => [
      [/^\d+ \+ f/, [entier ? 'On prend l’objet une fois, il reste moins de place. Comme l’objet peut resservir, on regarde la colonne en cours, déjà remplie pour cette place plus petite.' : 'On prend l’objet, il reste moins de place. Comme il ne peut servir qu’une fois, on regarde la colonne précédente, qui ne le contient pas.']],
      [/^f\d/, ['On compare : sans l’objet (la valeur de la colonne précédente) et avec l’objet (le calcul d’avant). On garde le plus grand.']]
    ],
    sensb: ({ t, col }) => [
      [/^Ligne \d : λ/, (x) => { const i = Number(x.ask.match(/Ligne (\d)/)[1]) - 1, pos = qv(col[i]) > 0; return [`La variable de base de cette ligne vaudra ${qs(t[i])} + λ × (${qs(col[i])}). Elle ne doit pas devenir négative.`, `${qs(t[i])} + λ × (${qs(col[i])}) ≥ 0, donc λ × (${qs(col[i])}) ≥ −${qs(t[i])}. On divise par ${qs(col[i])}, ${pos ? 'positif : le signe ≥ ne change pas' : 'négatif : ≥ devient ≤'}.`]; }],
      [/minimal/, ['λ doit respecter toutes les lignes « λ ≥ … » à la fois. La plus grande de ces bornes est la plus exigeante.']],
      [/maximal/, ['λ doit respecter toutes les lignes « λ ≤ … » à la fois. La plus petite de ces bornes est la plus exigeante.']]
    ],
    vlsm: () => [
      [/Bits d’hôte/, (x) => { const h = Number(x.ask.match(/(\d+) hôtes/)[1]), k = Number(x.v); return [`Avec k bits on a 2^k adresses, dont 2 réservées. On essaie :`, T(['k', '2^k adresses', 'utilisables', `assez pour ${h} ?`], [k - 1, k].map((z) => [z, 2 ** z, 2 ** z - 2, 2 ** z - 2 >= h ? 'oui' : 'non']))]; }],
      [/Préfixe/, (x) => [`Une adresse a 32 bits. Les bits d’hôte étant fixés, il reste 32 − ${32 - Number(x.v.slice(1))} = ${x.v.slice(1)} bits pour le réseau.`]],
      [/Réseau/, ['Les réseaux se placent les uns derrière les autres. Le premier commence à 0, puis chaque suivant commence où le précédent finit.']]
    ],
    agreg: ({ n, k, p }) => [
      [/Valeur de k/, [`On cherche combien de fois on multiplie 2 pour obtenir ${n} : 2^${k} = ${n}.`]],
      [/Taille totale/, (x) => ['On multiplie le nombre de réseaux par la place que chacun occupe dans le 3e octet. Dans le tableau binaire, on voit que seuls les derniers bits changent d’un réseau à l’autre.']],
      [/Adresse de l’agrégat/, ['On prend la plus petite adresse. Il faut vérifier qu’elle est un multiple de la taille totale, sinon une seule route ne peut pas les couvrir exactement.']],
      [/Préfixe/, [`Les ${n} réseaux ne diffèrent que sur ${k} bit(s). On ne les compare plus : le préfixe passe de ${p} à ${p - k}.`]]
    ],
    gbn: ({ l }) => [
      [/acceptées avant/, ['Elles arrivent dans l’ordre attendu, le récepteur les prend normalement.']],
      [/jetées/, [`Le récepteur Go-Back-N n’a pas de mémoire pour ranger des trames en avance. Tant qu’il n’a pas reçu la ${l}, il jette tout ce qui suit.`]],
      [/Go-Back-N/, ['Ce qui a été jeté est perdu : l’émetteur revient en arrière jusqu’à la trame perdue et renvoie tout depuis là.']],
      [/Selective/, ['Le récepteur range les trames suivantes et attend seulement la manquante. Il suffit de renvoyer celle-là.']]
    ],
    fen: ({ cw, r, seq, len, lost }) => [
      [/cwnd après/, ['En slow start, chaque accusé reçu permet d’envoyer un segment de plus. En un aller-retour, on reçoit un accusé par segment envoyé, donc la fenêtre double.']],
      [/en vol/, [`Le réseau accepte ${cw}, le récepteur accepte ${r}. Il faut respecter les deux : on prend le plus petit.`]],
      [/Premier octet/, [`Avant lui, ${lost === 1 ? '1 segment occupe' : `${lost} segments occupent`} ${lost} × ${len} = ${lost * len} octets, à partir de ${seq}.`]],
      [/ACK/, ['L’ACK annonce le prochain octet attendu, c’est-à-dire le premier qui manque. Les segments arrivés après le trou n’y changent rien.']]
    ],
    ligne: ({ c, bits, out }) => [
      [/Niveau du bit (\d+)/, (x) => { const i = Number(x.ask.match(/bit (\d+)/)[1]) - 1, b = bits[i], av = i ? out[i - 1] : ''; const last = out.slice(0, i).filter((z) => z !== '0').pop(); return [{ AMI: b ? `C’est un 1, donc il faut un niveau non nul, de signe contraire au dernier 1 (${last ? `c’était ${last}` : 'il n’y en a pas encore, on commence par +'}).` : 'C’est un 0 : le niveau est 0.', MLT: b ? `C’est un 1 : on avance d’un cran dans la suite 0, +, 0, −, puis on recommence. ${i ? `On était à ${av}.` : 'On part du premier 0.'}` : `C’est un 0 : on ne bouge pas${i ? `, on reste à ${av}` : ', on reste à 0'}.`, NRZI: b ? `C’est un 1 : on change de niveau (${i ? `on était à ${av}` : 'on partait de L'}).` : `C’est un 0 : on garde le niveau${i ? ` ${av}` : ' L de départ'}.`, MC: b ? 'C’est un 1 : dans la convention du cours, haut puis bas.' : 'C’est un 0 : dans la convention du cours, bas puis haut.', MI: b ? 'C’est un 1 : dans la convention IEEE, bas puis haut.' : 'C’est un 0 : dans la convention IEEE, haut puis bas.' }[c]]; }]
    ],
    dualsimp: ({ st, r, s, cand }) => [
      [/optimale/, ['Un coût réduit positif voudrait dire qu’on peut encore améliorer. Ici ils sont tous ≤ 0 : rien à gagner. Mais t contient des nombres négatifs, or une variable ne peut pas être négative : ce point n’est pas permis.']],
      [/sortante/, ['On corrige d’abord la variable la plus négative, celle qui viole le plus la règle x ≥ 0.']],
      [/entrante/, [`On regarde seulement les coefficients négatifs de la ligne de ${st.names[st.base[r]]}, car c’est en divisant par un nombre négatif que t deviendra positif. Pour chacun, on calcule d ÷ coefficient et on garde le plus petit résultat.`]],
      [/z après/, [`La variable entrante prendra la valeur t ÷ pivot = ${qs(st.t[r])} ÷ ${qs(st.T[r][s])} = ${qs(qdiv(st.t[r], st.T[r][s]))}. Chaque unité fait changer z de ${qs(st.d[s])}. On multiplie.`]]
    ],
    artif: () => [
      [/ajouter à la ligne/, (x) => [{ écart: 'Dans une contrainte ≤, il manque quelque chose à gauche pour atteindre la droite : on ajoute ce manque (l’écart). Au départ il vaut tout le second membre, donc il sert de variable de base.', 'surplus et artificielle': 'Dans une contrainte ≥, la gauche dépasse : on retire ce dépassement (le surplus). Mais avec tout le reste à 0, le surplus vaudrait un nombre négatif, ce qui est interdit. On ajoute donc une variable artificielle pour démarrer.', artificielle: 'Une égalité n’a ni manque ni dépassement. Aucune variable ne peut servir de départ : on en ajoute une artificielle.' }[x.v]]],
      [/Somme des/, ['Au départ, toutes les vraies variables valent 0. Dans chaque ligne avec artificielle, celle-ci doit donc valoir tout le second membre. On additionne ces seconds membres.']],
      [/entrante/, ['Pour chaque variable, on additionne ses coefficients dans les lignes qui ont une artificielle. Plus ce total est grand, plus augmenter la variable fait baisser les artificielles. On prend le plus grand.']]
    ],
    ecarts: ({ u, c, lhs, z, nm }) => [
      [/saturée/, (x) => ['La contrainte duale compare ce que la variable consomme (à gauche, au prix u des ressources) et ce qu’elle rapporte (à droite). Égalité : elle est saturée, la variable peut être utilisée. Plus grand à gauche : elle coûte plus qu’elle ne rapporte.']],
      [/Quelle variable/, [`Pour ${nm[z]} : elle consomme ${lhs[z]} et ne rapporte que ${c[z]}. On perdrait de l’argent à l’utiliser, donc elle vaut 0.`]],
      [/Valeur de x/, (x) => (x.v === '0' ? ['On vient de voir qu’elle coûte plus qu’elle ne rapporte.'] : ['Il reste deux équations et deux inconnues. On isole une variable dans la première, on la remplace dans la seconde, puis on vérifie dans les deux.'])],
      [/Valeur optimale/, [`On multiplie chaque second membre par le prix de sa ressource et on additionne. On doit retrouver la même chose avec l’objectif du primal : c’est une bonne vérification.`]]
    ],
    sensc: ({ d, tr, nm }) => [
      [/hors base/, ['Cette variable n’est pas utilisée car elle ne rapporte pas assez. Si son coût augmente de λ, son coût réduit augmente aussi de λ. Tant qu’il reste ≤ 0, elle reste inutile, donc le plan ne change pas.']],
      [/^x\d : λ/, (x) => { const j = nm.indexOf(x.ask.slice(0, 2)), pos = qv(tr[j]) > 0; return [`Le coût réduit de ${nm[j]} devient ${qs(d[j])} − λ × (${qs(tr[j])}). Il doit rester ≤ 0.`, `λ × (${qs(tr[j])}) ≥ ${qs(d[j])}. On divise par ${qs(tr[j])}, ${pos ? 'positif : le signe ≥ reste' : 'négatif : ≥ devient ≤'}.`]; }],
      [/minimal pour x2/, ['Toutes les bornes « λ ≥ … » doivent être respectées : on garde la plus grande.']],
      [/maximal pour x2/, ['Toutes les bornes « λ ≤ … » doivent être respectées : on garde la plus petite.']]
    ],
    bbn: () => [[/^Nœud/, (x) => [x.why, 'On se pose trois questions dans l’ordre. Le domaine est-il vide ? Le majorant (arrondi en dessous) est-il ≤ au minorant ? Si oui à l’une des deux, on abandonne. Sinon, la solution est-elle entière ? Si oui, elle devient la meilleure connue. Sinon, on sépare.']]],
    graph2: ({ a1, b1, c1, a2, b2, c2, p, q }) => [
      [/axe x1/, [`Sur cet axe x_2 = 0. La première contrainte devient ${a1}x_1 ≤ ${c1}, donc x_1 ≤ ${qs(Q(c1, a1))}. La seconde devient ${a2}x_1 ≤ ${c2}, donc x_1 ≤ ${qs(Q(c2, a2))}. Il faut respecter les deux : on garde la plus petite.`]],
      [/axe x2/, [`Sur cet axe x_1 = 0. La première donne x_2 ≤ ${qs(Q(c1, b1))}, la seconde x_2 ≤ ${qs(Q(c2, b2))}. On garde la plus petite.`]],
      [/intersection/, [`On cherche le point qui vérifie les deux égalités : ${a1}x_1 + ${b1}x_2 = ${c1} et ${a2}x_1 + ${b2}x_2 = ${c2}.`, `Vérification avec (${p} ; ${q}) : ${a1} × ${p} + ${b1} × ${q} = ${c1}, et ${a2} × ${p} + ${b2} × ${q} = ${c2}.`]],
      [/Valeur optimale/, ['On a calculé l’objectif en chaque coin du domaine. Comme on maximise, on garde le plus grand.']]
    ],
    pdsc: () => [
      [/Valeur de y/, ['Le reste d’un ensemble est son poids moins ce que ses éléments ont déjà payé. On augmente y jusqu’au plus petit de ces restes : à cet instant, cet ensemble est entièrement payé. Aller plus loin dépasserait son poids, ce qui est interdit.']],
      [/serrés grâce/, ['Serré veut dire : son poids est entièrement payé, son reste vaut 0. On achète tous ceux qui viennent d’arriver à 0.']],
      [/Somme des y/, ['On additionne tout ce que les éléments ont payé. Cette somme ne dépasse jamais le coût de la meilleure solution : elle sert de repère.']]
    ],
    seuil: ({ F }) => [
      [/^f$/, ['Pour chaque élément, on compte le nombre d’ensembles qui le contiennent. f est le plus grand de ces nombres.']],
      [/gardé/, [`Le seuil est 1/${F}. On compare : si x* est au moins égal à 1/${F}, on garde l’ensemble.`]],
      [/Ensembles gardés/, [`Pourquoi tout est couvert : un élément est dans au plus ${F} ensembles, et leurs x* font au moins 1 ensemble. Au moins l’un d’eux vaut donc 1/${F} ou plus, et il est gardé.`]],
      [/OPT_LP/, ['On additionne les x* (c’est la valeur du LP), puis on multiplie par f. Le coût trouvé ne peut pas dépasser cette borne.']]
    ],
    etats: ({ V }) => [
      [/États créés/, [`Chaque état existant donne une copie (objet pas pris). Il donne aussi un second état (objet pris) si le volume total ne dépasse pas ${V}. On compte les deux.`]],
      [/Nombre d’états/, ['Si deux états ont le même volume, on garde celui qui a la plus grande utilité : il occupe autant de place et rapporte plus. L’autre ne servira jamais.']]
    ],
    elag: ({ n, eps, L, dl, a }) => [
      [/^δ/, [`On s’autorise à se tromper au total de εL/2 = ${f(eps)} × ${L} ÷ 2 = ${f(eps * L / 2)}. On partage cette erreur entre ${n} étapes : ${f(eps * L / 2)} ÷ ${n} = ${f(dl)}.`]],
      [/Zones par axe/, [`La charge va de 0 à ${L}. On la découpe en morceaux de longueur ${f(dl)} : ${L} ÷ ${f(dl)}.`]],
      [/Numéro de zone/, [`${f(a[0])} ÷ ${f(dl)} = ${f(a[0] / dl, 2)}. On garde la partie entière : ${Math.floor(a[0] / dl)}. La première zone porte le numéro 0.`]],
      [/Même zone/, ['Il faut que les deux numéros soient identiques, celui de la machine 1 et celui de la machine 2. Si un seul diffère, les états restent séparés.']],
      [/nδ/, ['Chaque tâche placée peut décaler la charge d’au plus δ. Après n tâches, le décalage est au plus n × δ.']]
    ],
    cplexs: ({ p, up, dn, rc, p2, R, rup, y, dv }) => [
      [/Prix minimal de x1/, [`x1 est fabriqué (coût réduit zero). La ligne de x1 donne Down = ${dn} et Up = ${up} : tant que son prix reste entre les deux, le plan de production ne change pas.`]],
      [/x2 est intéressant/, [`x2 n’est pas fabriqué : il lui manque ${rc} par unité pour être rentable (son coût réduit). ${p2} + ${rc} = ${p2 + rc}. C’est aussi le Up de sa ligne.`]],
      [/Variation de z/, [`Dual Price dit ce que rapporte une unité de plus : ${f(y)}. On change de ${f(dv)} unités, donc ${f(y)} × (${f(dv)}) = ${f(y * dv)}. ${R + dv} est bien entre Down et Up, le calcul est donc valable.`]],
      [/Nouvelle valeur/, ['On ajoute cette variation à l’ancienne valeur. Si la ressource baisse, la variation est négative.']],
      [/Quantité maximale/, [`Le Dual Price n’est valable que jusqu’à Up = ${rup}. On a déjà ${R}, donc on peut en ajouter ${rup} − ${R}.`]],
      [/Prix maximal/, [`Une unité de plus rapporte ${f(y)}. Payée moins cher, on gagne. Payée plus cher, on perd.`]]
    ],
    treedec: () => [
      [/Introduction/, ['On ajoute v au sac et on veut le prendre. S’il a un voisin déjà pris dans S, c’est interdit : −∞ veut dire « impossible ». Sinon, on gagne 1 par rapport au cas sans v.']],
      [/Oubli/, ['On n’a plus besoin de savoir si v est pris : on garde le meilleur des deux cas.']],
      [/Jointure/, ['On réunit deux morceaux du graphe qui partagent les sommets de S. En additionnant, on a compté S deux fois : on le retire une fois.']]
    ]
  };
  const simplexe = () => [
    [/Quelle variable entre/, ['La ligne d dit combien on gagne sur l’objectif pour chaque unité de la variable. On prend la plus grande valeur positive : c’est la plus rentable. S’il n’y en a aucune de positive, c’est fini.']],
    [/Quelle variable sort/, ['Quand la nouvelle variable augmente, les variables de base diminuent. Pour chaque ligne, t ÷ coefficient dit jusqu’où on peut aller avant que celle-ci tombe à 0. La plus petite limite arrive en premier : c’est elle qui sort. Un coefficient négatif ou nul ne bloque jamais.']],
    [/Nouvelle valeur de z|^z/, (x) => ['On multiplie ce que rapporte une unité par le nombre d’unités ajoutées (le plus petit rapport), puis on ajoute à l’ancienne valeur de z.', x.why]],
    [/Pivot/, ['Deux opérations. 1 : on divise toute la ligne qui sort par le pivot, pour avoir un 1. 2 : pour chaque autre ligne, on soustrait (son coefficient dans la colonne du pivot) × (la nouvelle ligne du pivot), pour avoir un 0.']],
    [/^x\d/, ['On cherche la variable dans la colonne « Base ». Si elle y est, sa valeur est dans la colonne t, sur la même ligne. Si elle n’y est pas, elle vaut 0.']],
    [/v\(P\)/, ['La dernière case du tableau contient −z. On change son signe.']]
  ];
  CL.pivot = simplexe; CL.simplexe = simplexe;

  Object.entries(CL).forEach(([id, rules]) => {
    const g = PAS[id];
    PAS[id] = (raw) => {
      const l = g(raw), R = rules(raw);
      l.forEach((x) => { const r = R.find(([re]) => re.test(x.ask || x.s(x.v))); if (r) x.d = typeof r[1] === 'function' ? r[1](x) : r[1]; });
      return l;
    };
  });
})();
