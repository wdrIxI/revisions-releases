// Générateurs ajoutés après l'annale du CC de Réseaux : mise à jour RIP et décodage au plus proche
TRAINERS.push(
  {
    id: 'rip', titre: 'Mise à jour de table RIP', theme: 'Couche réseau', icon: 'arrowR',
    desc: 'Appliquer l’annonce d’un voisin : coût + 1, meilleur coût, prochain saut actuel, 16 = infini.',
    gen() {
      const pool = [...['10.0.0.0', '40.0.0.0', '94.0.0.0', '140.16.0.0', '172.20.0.0', '196.35.250.0', '217.66.40.0', '12.0.0.0', '88.0.0.0', '203.0.113.0']].sort(() => Math.random() - 0.5);
      const table = pool.slice(0, 5).map((d, i) => ({ d, nh: i < 2 ? 'R2' : pick(['R3', 'R4']), c: rnd(1, 12) }));
      const known = table.slice(0, 4);
      const ann = [
        ...known.map((t) => ({ d: t.d, c: rnd(0, 14) })),
        { d: pool[6], c: rnd(0, 13) },
        { d: pool[7], c: 16 }
      ];
      const rows = [], solution = [];
      ann.forEach((a) => {
        const prop = Math.min(16, a.c + 1);
        const cur = table.find((t) => t.d === a.d);
        let fin, why;
        if (!cur) { fin = prop >= 16 ? 16 : prop; why = prop >= 16 ? 'inaccessible, on ne l’ajoute pas' : `nouvelle route via R2, coût ${prop}`; }
        else if (cur.nh === 'R2') { fin = prop; why = `l’annonce vient du prochain saut actuel (R2) : on l’applique, ${cur.c} devient ${prop}`; }
        else if (prop < cur.c) { fin = prop; why = `${prop} < ${cur.c} : on passe par R2`; }
        else { fin = cur.c; why = `${prop} ≥ ${cur.c} : on garde la route via ${cur.nh}`; }
        rows.push({ d: a.d, fin });
        solution.push(`${a.d} : annoncé ${a.c}, proposé ${prop}, ${why}.`);
      });
      return {
        raw: { table, ann, rows },
        prompt: `Table de R1 :<div class="mini-table">${table.map((t) => `<div><span class="mono">${t.d}</span><span>${t.c} saut(s) via ${t.nh}</span></div>`).join('')}</div>
          <div style="margin-top:0.75rem">Annonce reçue du voisin R2 :</div><div class="mini-table">${ann.map((a) => `<div><span class="mono">${a.d}</span><span>${a.c}</span></div>`).join('')}</div>`,
        fields: rows.map((r, i) => ({ k: 'c' + i, label: `Coût final vers ${r.d} (16 si absent)`, ph: 'sauts' })),
        expected: Object.fromEntries(rows.map((r, i) => ['c' + i, String(r.fin)])),
        solution
      };
    }
  },
  {
    id: 'decode', titre: 'Décodage au plus proche', theme: 'Couche liaison', icon: 'target',
    desc: 'Code de 6 bits (3 de données, 3 de redondance) : le mot reçu est-il valide, et comment le corriger ?',
    gen() {
      const dist = (a, b) => a.split('').filter((x, i) => x !== b[i]).length;
      let words;
      do {
        const P = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => rnd(0, 1)));
        words = [];
        for (let m = 0; m < 8; m++) {
          const d = [m >> 2 & 1, m >> 1 & 1, m & 1];
          const r = [0, 1, 2].map((j) => (d[0] * P[0][j] + d[1] * P[1][j] + d[2] * P[2][j]) % 2);
          words.push(d.join('') + r.join(''));
        }
      } while (Math.min(...words.flatMap((a, i) => words.slice(i + 1).map((b) => dist(a, b)))) < 3);
      const sent = pick(words);
      const flip = Math.random() < 0.3 ? -1 : rnd(0, 5);
      const recv = flip < 0 ? sent : sent.split('').map((b, i) => (i === flip ? (b === '0' ? '1' : '0') : b)).join('');
      return {
        raw: { words, sent, recv, valid: flip < 0 },
        prompt: `Code (3 bits de données + 3 de redondance) :<div class="mini-table">${words.map((w) => `<div><span class="mono">${w.slice(0, 3)}</span><span class="mono">${w}</span></div>`).join('')}</div><div style="margin-top:0.625rem">Mot reçu : <span class="mono hl">${recv}</span></div>`,
        fields: [
          { k: 'ok', label: 'Est-ce un mot du code ?', type: 'choice', options: ['oui', 'non'] },
          { k: 'w', label: 'Mot transmis (corrigé)', ph: '6 bits' },
          { k: 'm', label: 'Message (3 bits)', ph: '3 bits' }
        ],
        expected: { ok: flip < 0 ? 'oui' : 'non', w: sent, m: sent.slice(0, 3) },
        solution: [
          'Distance minimale du code : 3, donc il corrige 1 erreur.',
          `Distances de ${recv} : ${words.map((w) => `${w} (${dist(recv, w)})`).join(', ')}.`,
          flip < 0 ? 'Distance 0 : le mot est valide.' : `Le seul mot à distance 1 est ${sent} : on corrige en ${sent}, message ${sent.slice(0, 3)}.`
        ]
      };
    }
  }
);
