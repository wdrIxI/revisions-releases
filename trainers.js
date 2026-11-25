// Generateurs d'exercices aleatoires corriges automatiquement
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rnd(0, arr.length - 1)];

const ip2int = (ip) => ip.split('.').reduce((acc, o) => ((acc << 8) + Number(o)) >>> 0, 0);
const int2ip = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
const maskInt = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
const randIp = () => `${pick([10, 172, 192, 143, 81, 194, 100, 203])}.${rnd(0, 255)}.${rnd(0, 255)}.${rnd(1, 254)}`;

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '').replace(',', '.');
const numOk = (given, expected, tol = 0.02) => {
  const t = norm(given).replace(/−/g, '-');
  const fr = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  const g = fr ? Number(fr[1]) / Number(fr[2]) : parseFloat(t);
  if (Number.isNaN(g)) return false;
  if (expected === 0) return Math.abs(g) < 1e-9;
  return Math.abs(g - expected) / Math.abs(expected) <= tol;
};
const fmt = (x, d = 2) => Number(x.toFixed(d)).toLocaleString('fr-FR');

function crcSteps(data, gen) {
  const r = gen.length - 1;
  let bits = (data + '0'.repeat(r)).split('').map(Number);
  const g = gen.split('').map(Number);
  const steps = [];
  for (let i = 0; i <= bits.length - g.length; i++) {
    if (bits[i] === 1) {
      const before = bits.slice(i, i + g.length).join('');
      for (let j = 0; j < g.length; j++) bits[i + j] ^= g[j];
      const after = bits.slice(i, i + g.length).join('');
      steps.push(`Position ${i + 1} : ${before} XOR ${gen} = ${after}`);
    }
  }
  return { rem: bits.slice(bits.length - r).join(''), steps };
}

function stuff(bits) {
  let out = '', run = 0;
  for (const b of bits) {
    out += b;
    if (b === '1') { run++; if (run === 5) { out += '0'; run = 0; } } else run = 0;
  }
  return out;
}

const hd = (a, b) => a.split('').filter((c, i) => c !== b[i]).length;

const TRAINERS = [
  {
    id: 'cidr', titre: 'Calcul de sous-réseau', theme: 'Couche réseau', icon: 'calc',
    desc: 'Réseau, broadcast, plage d’hôtes et nombre d’hôtes à partir d’une IP et d’un préfixe.',
    gen(d) {
      const p = d === 0 ? rnd(25, 28) : d === 1 ? rnd(17, 23) : d === 2 ? pick([16, 24, 29, 30, 31 - rnd(1, 2)]) : rnd(16, 30), ip = randIp();
      const m = maskInt(p), n = (ip2int(ip) & m) >>> 0, b = (n | (~m >>> 0)) >>> 0;
      return {
        raw: { ip, p, m, n, b },
        prompt: `Adresse <span class="mono hl">${ip}/${p}</span> (masque ${int2ip(m)})`,
        fields: [
          { k: 'net', label: 'Adresse réseau', ph: 'a.b.c.d' },
          { k: 'bc', label: 'Broadcast', ph: 'a.b.c.d' },
          { k: 'first', label: 'Premier hôte', ph: 'a.b.c.d' },
          { k: 'last', label: 'Dernier hôte', ph: 'a.b.c.d' },
          { k: 'hosts', label: 'Hôtes utilisables', ph: 'nombre' }
        ],
        expected: { net: int2ip(n), bc: int2ip(b), first: int2ip(n + 1), last: int2ip(b - 1), hosts: String(2 ** (32 - p) - 2) },
        solution: [
          `/${p} : ${32 - p} bits d’hôte, soit ${2 ** (32 - p)} adresses par bloc.`,
          `Réseau = IP AND masque = ${int2ip(n)}.`,
          `Broadcast = réseau avec tous les bits d’hôte à 1 = ${int2ip(b)}.`,
          `Hôtes : ${int2ip(n + 1)} à ${int2ip(b - 1)}, soit 2^${32 - p} - 2 = ${2 ** (32 - p) - 2}.`
        ]
      };
    }
  },
  {
    id: 'mask', titre: 'Masque et préfixe', theme: 'Couche réseau', icon: 'layers',
    desc: 'Convertir un préfixe CIDR en masque décimal, et inversement.',
    gen(d) {
      const p = d === 0 ? rnd(25, 28) : d === 1 ? rnd(17, 23) : d === 2 ? pick([8, 9, 16, 24, 30]) : rnd(8, 30), m = int2ip(maskInt(p));
      if (Math.random() < 0.5) {
        return {
          raw: { p, m, dir: 0 },
          prompt: `Quel masque correspond au préfixe <span class="mono hl">/${p}</span> ?`,
          fields: [{ k: 'm', label: 'Masque', ph: '255.255.x.x' }],
          expected: { m },
          solution: [`/${p} = ${p} bits à 1 puis ${32 - p} bits à 0, soit ${m}.`]
        };
      }
      return {
          raw: { p, m, dir: 1 },
          prompt: `Quel préfixe correspond au masque <span class="mono hl">${m}</span> ?`,
        fields: [{ k: 'p', label: 'Préfixe (sans /)', ph: 'ex. 24' }],
        expected: { p: String(p) },
        solution: [`On compte les bits à 1 : ${p}, donc /${p}.`]
      };
    }
  },
  {
    id: 'same', titre: 'Même sous-réseau ?', theme: 'Couche réseau', icon: 'target',
    desc: 'Décider si deux hôtes sont voisins IP (remise directe ou passerelle).',
    gen(d) {
      const p = d === 0 ? rnd(25, 28) : d === 1 ? rnd(18, 23) : rnd(17, 29), a = randIp(), m = maskInt(p);
      const na = (ip2int(a) & m) >>> 0;
      const same = Math.random() < 0.5;
      const size = 2 ** (32 - p);
      let bInt = same ? na + rnd(1, size - 2) : (na + size * pick([1, -1, 2]) + rnd(1, size - 2)) >>> 0;
      const b = int2ip(bInt >>> 0), nb = (bInt & m) >>> 0;
      const ans = na === nb ? 'oui' : 'non';
      return {
        raw: { a, b, p, na, nb, ans },
        prompt: `A = <span class="mono hl">${a}/${p}</span> et B = <span class="mono hl">${b}/${p}</span>. Sont-ils dans le même sous-réseau ?`,
        fields: [{ k: 'r', label: 'Réponse', type: 'choice', options: ['oui', 'non'] }],
        expected: { r: ans },
        solution: [`Réseau de A : ${int2ip(na)}. Réseau de B : ${int2ip(nb)}.`, ans === 'oui' ? 'Même réseau : remise directe (ARP sur B).' : 'Réseaux différents : A passe par sa passerelle (ARP sur la passerelle).']
      };
    }
  },
  {
    id: 'lpm', titre: 'Longest Prefix Match', theme: 'Couche réseau', icon: 'arrowR',
    desc: 'Choisir la route qui sera utilisée dans une table de routage.',
    gen() {
      const a = rnd(10, 200), b = rnd(0, 255), c = rnd(0, 255);
      const routes = [
        { p: '0.0.0.0/0', nh: 'R0' },
        { p: `${a}.0.0.0/8`, nh: 'R1' },
        { p: `${a}.${b}.0.0/16`, nh: 'R2' },
        { p: `${a}.${b}.${c}.0/24`, nh: 'R3' },
        { p: `${a}.${b}.${c}.128/25`, nh: 'R4' }
      ];
      const scenario = rnd(0, 4);
      let dest;
      if (scenario === 0) dest = `${(a + 7) % 223 + 1}.${rnd(0, 255)}.${rnd(0, 255)}.${rnd(1, 254)}`;
      else if (scenario === 1) dest = `${a}.${(b + rnd(1, 200)) % 256}.${rnd(0, 255)}.${rnd(1, 254)}`;
      else if (scenario === 2) dest = `${a}.${b}.${(c + rnd(1, 200)) % 256}.${rnd(1, 254)}`;
      else if (scenario === 3) dest = `${a}.${b}.${c}.${rnd(1, 127)}`;
      else dest = `${a}.${b}.${c}.${rnd(129, 254)}`;
      const d = ip2int(dest);
      let best = null;
      routes.forEach((r) => {
        const [net, len] = r.p.split('/');
        const m = maskInt(Number(len));
        if (((d & m) >>> 0) === ((ip2int(net) & m) >>> 0) && (!best || Number(len) > best.len)) best = { ...r, len: Number(len) };
      });
      return {
        raw: { dest, routes, best },
        prompt: `Destination <span class="mono hl">${dest}</span>. Table :<div class="mini-table">${routes.map((r) => `<div><span class="mono">${r.p}</span><span>via ${r.nh}</span></div>`).join('')}</div>`,
        fields: [{ k: 'r', label: 'Prochain saut', type: 'choice', options: routes.map((r) => r.nh) }],
        expected: { r: best.nh },
        solution: [`Routes qui correspondent : toutes celles dont le préfixe englobe ${dest}.`, `La plus spécifique est ${best.p} : prochain saut ${best.nh}.`]
      };
    }
  },
  {
    id: 'crc', titre: 'Calcul de CRC', theme: 'Couche liaison', icon: 'check',
    desc: 'Division polynomiale modulo 2 : trouver le reste et la trame transmise.',
    gen(d) {
      const gen = pick(d === 0 ? ['101', '111'] : d === 1 ? ['1001', '1011', '1101'] : ['1001', '1011', '1101', '10011', '10101', '11001']);
      let data = '1';
      const len = d === 0 ? 5 : d === 2 ? rnd(8, 10) : rnd(6, 10);
      for (let i = 1; i < len; i++) data += rnd(0, 1);
      const { rem, steps } = crcSteps(data, gen);
      return {
        raw: { data, gen, rem },
        prompt: `Message <span class="mono hl">${data}</span>, générateur <span class="mono hl">${gen}</span> (degré ${gen.length - 1}).`,
        fields: [
          { k: 'rem', label: 'Reste (CRC)', ph: `${gen.length - 1} bits` },
          { k: 'frame', label: 'Trame transmise', ph: 'bits' }
        ],
        expected: { rem, frame: data + rem },
        solution: [`On ajoute ${gen.length - 1} zéros : ${data}${'0'.repeat(gen.length - 1)}.`, ...steps, `Reste : ${rem}. Trame : ${data}${rem}.`]
      };
    }
  },
  {
    id: 'stuff', titre: 'Bit stuffing HDLC', theme: 'Couche liaison', icon: 'layers',
    desc: 'Insérer un 0 après chaque suite de cinq 1 consécutifs.',
    gen(d) {
      let s = '';
      while (s.length < 18) s += pick(d === 0 ? ['0', '10', '111110', '01'] : d === 2 ? ['1111110', '11111', '0', '11111110'] : ['0', '1', '11111', '111111', '10', '0111', '1111']);
      s = s.slice(0, rnd(16, 22));
      return {
        raw: { s },
        prompt: `Données : <span class="mono hl">${s}</span>. Donner la charge utile après stuffing (sans les fanions).`,
        fields: [{ k: 's', label: 'Après stuffing', ph: 'bits' }],
        expected: { s: stuff(s) },
        solution: ['Compter les 1 consécutifs, le compteur repart à 0 après chaque 0 (y compris un 0 inséré).', `Résultat : ${stuff(s)} (${stuff(s).length - s.length} bit(s) inséré(s)).`, `Trame : 01111110 ${stuff(s)} 01111110.`]
      };
    }
  },
  {
    id: 'hamming', titre: 'Distance de Hamming', theme: 'Couche liaison', icon: 'target',
    desc: 'Distance minimale d’un code, capacités de détection et de correction.',
    gen() {
      const n = 6, words = new Set();
      while (words.size < 4) { let w = ''; for (let i = 0; i < n; i++) w += rnd(0, 1); words.add(w); }
      const W = [...words];
      let d = Infinity; const pairs = [];
      for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) { const x = hd(W[i], W[j]); pairs.push(`d(${W[i]}, ${W[j]}) = ${x}`); d = Math.min(d, x); }
      return {
        raw: { W, d },
        prompt: `Code <span class="mono hl">{ ${W.join(', ')} }</span>`,
        fields: [
          { k: 'd', label: 'dmin', ph: 'nombre' },
          { k: 'det', label: 'Erreurs détectées', ph: 'nombre' },
          { k: 'cor', label: 'Erreurs corrigées', ph: 'nombre' }
        ],
        expected: { d: String(d), det: String(d - 1), cor: String(Math.floor((d - 1) / 2)) },
        solution: [...pairs, `dmin = ${d} : détecte ${d - 1}, corrige ⌊(${d} - 1) / 2⌋ = ${Math.floor((d - 1) / 2)}.`]
      };
    }
  },
  {
    id: 'delay', titre: 'Délais de transmission', theme: 'Couche physique', icon: 'timer',
    desc: 'Calculer Ttx = taille / débit et Tprop = distance / vitesse.',
    gen() {
      const size = pick([64, 500, 1000, 1500, 9000]), rate = pick([10, 100, 1000]), dist = pick([1, 10, 100, 500, 2000]);
      const ttx = size * 8 / (rate * 1e6) * 1e6, tprop = dist / 200000 * 1e6;
      return {
        raw: { size, rate, dist, ttx, tprop },
        prompt: `Paquet de <span class="hl">${size} octets</span>, lien à <span class="hl">${rate} Mbit/s</span>, distance <span class="hl">${dist} km</span>, propagation 200 000 km/s.`,
        fields: [
          { k: 'ttx', label: 'Ttx (µs)', ph: 'µs', num: true },
          { k: 'tprop', label: 'Tprop (µs)', ph: 'µs', num: true },
          { k: 'tot', label: 'Dernier bit reçu à (µs)', ph: 'µs', num: true }
        ],
        expected: { ttx, tprop, tot: ttx + tprop },
        solution: [`Ttx = ${size} × 8 / ${rate}·10^6 = ${fmt(ttx)} µs.`, `Tprop = ${dist} / 200 000 = ${fmt(tprop)} µs.`, `Total = ${fmt(ttx + tprop)} µs.`]
      };
    }
  },
  {
    id: 'bdp', titre: 'BDP et fenêtre', theme: 'Liaison / transport', icon: 'chart',
    desc: 'Quantité de données en vol pour remplir un lien, et efficacité du Stop-and-Wait.',
    gen() {
      const rate = pick([10, 100, 1000]), rtt = pick([5, 10, 20, 40, 80]), frame = 1500;
      const bdpBytes = rate * 1e6 * rtt / 1000 / 8;
      const ttx = frame * 8 / (rate * 1e6) * 1000;
      const u = ttx / (ttx + rtt) * 100;
      return {
        raw: { rate, rtt, frame, bdpBytes, ttx, u },
        prompt: `Lien <span class="hl">${rate} Mbit/s</span>, RTT <span class="hl">${rtt} ms</span>, trames de ${frame} octets.`,
        fields: [
          { k: 'bdp', label: 'BDP (ko, 1 ko = 1000 o)', ph: 'ko', num: true },
          { k: 'w', label: 'Trames en vol (arrondi sup.)', ph: 'nombre', num: true },
          { k: 'u', label: 'Utilisation Stop-and-Wait (%)', ph: '%', num: true, tol: 0.06 }
        ],
        expected: { bdp: bdpBytes / 1000, w: Math.ceil(bdpBytes / frame), u },
        solution: [`BDP = ${rate}·10^6 × ${rtt / 1000} s = ${fmt(bdpBytes * 8 / 1e6, 3)} Mbit = ${fmt(bdpBytes / 1000)} ko.`, `Fenêtre ≈ ${fmt(bdpBytes)} / ${frame} ≈ ${Math.ceil(bdpBytes / frame)} trames.`, `Ttx = ${fmt(ttx, 3)} ms ; U ≈ Ttx / (Ttx + RTT) = ${fmt(u, 2)} %.`]
      };
    }
  },
  {
    id: 'shannon', titre: 'Nyquist et Shannon', theme: 'Couche physique', icon: 'chart',
    desc: 'Débit maximal selon la bande passante, la valence et le rapport signal/bruit.',
    gen() {
      const B = pick([3, 4, 20, 40, 80]) * 1000, M = pick([2, 4, 8, 16]), snrDb = pick([10, 20, 30, 40]);
      const ny = 2 * B * Math.log2(M) / 1000, snr = 10 ** (snrDb / 10), sh = B * Math.log2(1 + snr) / 1000;
      return {
        raw: { B, M, snrDb, ny, snr, sh },
        prompt: `Bande passante <span class="hl">${B / 1000} kHz</span>, <span class="hl">M = ${M}</span> niveaux, SNR = <span class="hl">${snrDb} dB</span>.`,
        fields: [
          { k: 'ny', label: 'Nyquist (kbit/s)', ph: 'kbit/s', num: true },
          { k: 'sh', label: 'Shannon (kbit/s)', ph: 'kbit/s', num: true }
        ],
        expected: { ny, sh },
        solution: [`Nyquist : 2 × ${B} × log2(${M}) = ${fmt(ny)} kbit/s.`, `S/N = 10^(${snrDb}/10) = ${fmt(snr, 0)}.`, `Shannon : ${B} × log2(1 + ${fmt(snr, 0)}) = ${fmt(sh)} kbit/s.`]
      };
    }
  }
];

function checkTrainer(problem, answers) {
  const res = {};
  problem.fields.forEach((f) => {
    const exp = problem.expected[f.k];
    res[f.k] = f.num ? numOk(answers[f.k], exp, f.tol || 0.02) : norm(answers[f.k]) === norm(exp);
  });
  return res;
}

function formatExpected(problem, k) {
  const f = problem.fields.find((x) => x.k === k);
  const v = problem.expected[k];
  if (f && f.disp) return f.disp;
  return f && f.num ? fmt(v) : v;
}
