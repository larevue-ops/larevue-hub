// ─── Visuels Instagram · La Revue (larevue.app) ─────────────────────────────
//
// Gabarit « pleine photo » : image en fond, marque en haut à droite, titre en
// bas à gauche en capitales très grasses, passages surlignés en jaune.
//
// Le rendu se fait sur un canvas, dans le navigateur, pour trois raisons :
// l'aperçu est immédiat, l'export ne dépend d'aucun serveur, et le même noyau
// pourra tourner dans un worker le jour où la publication sera automatique.
//
// ⚠️ La photo DOIT être servie avec des en-têtes CORS, sinon `toBlob` refuse un
// canvas contaminé. Cloudinary les envoie, le wp-content de larevue.app aussi.

export const L = 1080, H = 1350;            // format 4:5, celui d'Instagram
export const POLICE = 'AntonLRA';
const BASE = './assets/ig-lra';

export const THEMES = {
  jaune:  { accent: '#F5D142', encre: '#0b0b0b' },
  blanc:  { accent: '#FFFFFF', encre: '#0b0b0b' },
  or:     { accent: '#C9A24A', encre: '#0b0b0b' },
  rouge:  { accent: '#E23A2E', encre: '#FFFFFF' },
};

let _pret = null;
export function pret() {
  if (_pret) return _pret;
  _pret = (async () => {
    const f = new FontFace(POLICE, `url(${BASE}/fonts/Anton.ttf)`);
    await f.load(); document.fonts.add(f);
    await document.fonts.load(`100px ${POLICE}`);
    const marque = await charger(`${BASE}/marque.png`);
    return { marque };
  })();
  return _pret;
}

export function charger(url) {
  return new Promise((ok, ko) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => ko(new Error('image illisible : ' + url));
    i.src = url;
  });
}

/** « Le retour de =Céline Dion= » → [{t:'Le retour de ',s:false},{t:'Céline Dion',s:true}] */
export function decouper(ligne) {
  return ligne.split(/(=[^=]+=)/).filter(Boolean).map(m =>
    m.startsWith('=') && m.endsWith('=')
      ? { t: m.slice(1, -1), s: true }
      : { t: m, s: false });
}

// ⚠️ WordPress renvoie du HTML, pas du texte : « Sciences &amp; Tech »,
// « l&#8217;iPhone ». Sans decodage, le visuel affiche « SCIENCES &AMP; TECH ».
// Vu le 11/09 sur la rubrique Sciences & Tech.
const NOMMEES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d',
  laquo: '«', raquo: '»', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç',
  ndash: '\u2013', mdash: '\u2014', deg: '°', euro: '€', middot: '·' };

export function decoder(t) {
  return String(t || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NOMMEES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ').trim();
}

const SKEW = -0.122;                         // ≈ 7° d'inclinaison, comme la référence
const MARGE = 64, BAS = 86, LARGEUR_MAX = L - MARGE * 2;

function mesurer(ctx, lignes, px) {
  ctx.font = `${px}px ${POLICE}`;
  return lignes.map(l => {
    const morceaux = decouper(l);
    const larg = morceaux.reduce((s, m) => s + ctx.measureText(m.t.toUpperCase()).width, 0);
    return { morceaux, larg };
  });
}

/** Cherche le plus grand corps qui tienne dans la zone basse. */
export function corpsAuto(ctx, lignes, hauteurMax = 520, depart = 118) {
  for (let px = depart; px >= 40; px -= 2) {
    const m = mesurer(ctx, lignes, px);
    const h = lignes.length * px * 1.06;
    if (h <= hauteurMax && m.every(x => x.larg <= LARGEUR_MAX)) return px;
  }
  return 40;
}

// ─── Coupe equilibree ──────────────────────────────────────────────────────
//
// Couper au nombre de CARACTERES donne des lignes ragees : en capitales Anton,
// un « I » et un « M » ne font pas la meme largeur. Le user l'a signale sur les
// visuels LinkedIn le 11/09 (« y'a un gros trou apres publication de »). Meme
// remede ici : on mesure, et on repartit les mots pour reduire les creux.
//
// ⚠️ Ce calcul est recopie a l'identique dans le runner
// (larevue-social-runner/lib/generators/lra-instagram.js) : la publication
// automatique doit produire exactement ce que montre cet apercu. Toute
// retouche ici est a reporter la-bas, sinon l'apercu ment.
const POIDS_DER = 0.6;

/** Un surlignage `=deux mots=` reste un seul jeton : il ne doit pas etre coupe. */
function jetonsDe(titre) {
  const bruts = String(titre).match(/=[^=]+=|\S+/g) || [];
  // ⚠️ En francais, deux-points, point-virgule, points d'exclamation et
  // d'interrogation et guillemet fermant sont precedes d'une espace : un
  // decoupage naif les renvoie en TETE de ligne (« Celine Dion a Paris / : la
  // ferveur intacte »). Ils restent colles au mot qui precede. Symetriquement,
  // un guillemet ouvrant ne finit jamais une ligne.
  const out = [];
  for (const j of bruts) {
    if (out.length && /^[:;!?»,.]+$/.test(j)) out[out.length - 1] += ' ' + j;
    else if (out.length && /[«(]$/.test(out[out.length - 1])) out[out.length - 1] += ' ' + j;
    else out.push(j);
  }
  return out;
}

/** Largeur reellement dessinee : capitales, sans les signes de surlignage. */
function largeurDe(ctx, mots) {
  return ctx.measureText(mots.join(' ').replace(/=/g, '').toUpperCase()).width;
}

function equilibrer(ctx, jetons, largeurMax, nLignes) {
  const n = jetons.length;
  if (n === 0 || nLignes < 1 || nLignes > n) return null;
  const larg = [];
  for (let i = 0; i < n; i++) {
    larg.push([]);
    for (let k = i; k < n; k++) larg[i][k] = largeurDe(ctx, jetons.slice(i, k + 1));
  }
  const INF = Infinity;
  const c = Array.from({ length: nLignes + 1 }, () => new Array(n + 1).fill(INF));
  const d = Array.from({ length: nLignes + 1 }, () => new Array(n + 1).fill(-1));
  for (let i = 0; i < n; i++) {
    const w = larg[i][n - 1];
    if (w > largeurMax) continue;
    c[1][i] = POIDS_DER * (largeurMax - w) ** 2;
  }
  for (let l = 2; l <= nLignes; l++) {
    for (let i = 0; i <= n - l; i++) {
      for (let k = i; k <= n - l; k++) {
        const w = larg[i][k];
        if (w > largeurMax) break;
        const suite = c[l - 1][k + 1];
        if (suite === INF) continue;
        const cout = (largeurMax - w) ** 2 + suite;
        if (cout < c[l][i]) { c[l][i] = cout; d[l][i] = k; }
      }
    }
  }
  if (c[nLignes][0] === INF) return null;
  const out = [];
  let i = 0;
  for (let l = nLignes; l >= 1; l--) {
    const k = l === 1 ? n - 1 : d[l][i];
    if (k < i) return null;
    out.push(jetons.slice(i, k + 1).join(' '));
    i = k + 1;
  }
  return i === n ? out : null;
}

/** Le plus gros corps qui tienne, et a corps egal le moins de creux. */
export function coupeAuto(ctx, titre, hauteurMax = 520, depart = 118) {
  const jetons = jetonsDe(decoder(titre));
  let meilleur = null;
  for (let n = 1; n <= 5 && n <= jetons.length; n++) {
    for (let px = depart; px >= 40; px -= 2) {
      if (n * px * 1.06 > hauteurMax) continue;
      ctx.font = `${px}px ${POLICE}`;
      const rep = equilibrer(ctx, jetons, LARGEUR_MAX, n);
      if (!rep) continue;
      if (!meilleur || px > meilleur.px) meilleur = { lignes: rep, px };
      break;                       // px decroissant : le premier tenu est le plus grand
    }
  }
  return meilleur;
}

let _mesureur = null;
/** Coupe un titre pour le champ de saisie : « mot mot | mot mot | … ». */
export function coupeTitre(titre, hauteurMax = 520) {
  if (!_mesureur) _mesureur = document.createElement('canvas').getContext('2d');
  const r = coupeAuto(_mesureur, titre, hauteurMax);
  return r ? r.lignes.join(' | ') : decoder(titre);
}

export function dessiner(cv, o) {
  const ctx = cv.getContext('2d');
  cv.width = L; cv.height = H;
  const th = THEMES[o.theme || 'jaune'];

  // 1. photo, recadrée en « cover »
  ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, L, H);
  if (o.photo) {
    const r = Math.max(L / o.photo.width, H / o.photo.height);
    const w = o.photo.width * r, h = o.photo.height * r;
    const ax = o.ancrageX === undefined ? 0.5 : o.ancrageX;
    const ay = o.ancrageY === undefined ? 0.5 : o.ancrageY;
    ctx.drawImage(o.photo, (L - w) * ax, (H - h) * ay, w, h);
  }

  // 2. voile : le haut reste lisible, le bas porte le texte
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,.36)'); g.addColorStop(.26, 'rgba(0,0,0,0)');
  g.addColorStop(.44, 'rgba(0,0,0,0)');  g.addColorStop(.70, 'rgba(0,0,0,.64)');
  g.addColorStop(1, 'rgba(0,0,0,.90)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);

  // 3. marque
  if (o.marque) {
    const lw = 156, lh = o.marque.height * lw / o.marque.width;
    ctx.drawImage(o.marque, L - 56 - lw, 52, lw, lh);
  }

  // 4. titre
  // Les barres verticales sont les choix du redacteur : on les respecte. Sans
  // barre, on coupe en mesurant, comme le fait le runner a la publication.
  const brut = String(o.titre || '');
  let lignes, px;
  if (brut.includes('|')) {
    lignes = brut.split('|').map(x => decoder(x)).filter(Boolean);
    px = o.taille || corpsAuto(ctx, lignes, o.hauteurMax || 520);
    // ⚠️ `corpsAuto` a un plancher a 40 px : atteint, il rend 40 px MEME si la
    // ligne deborde du cadre. Mieux vaut recouper que deborder.
    if (!o.taille && mesurer(ctx, lignes, px).some(x => x.larg > LARGEUR_MAX)) {
      const r = coupeAuto(ctx, lignes.join(' '), o.hauteurMax || 520);
      if (r) { lignes = r.lignes; px = r.px; }
    }
  } else {
    const r = coupeAuto(ctx, brut, o.hauteurMax || 520);
    lignes = r ? r.lignes : [decoder(brut)];
    px = o.taille || (r ? r.px : corpsAuto(ctx, [decoder(brut)], o.hauteurMax || 520));
  }
  const interligne = px * 1.06;
  const mesures = mesurer(ctx, lignes, px);
  let y = H - BAS - (lignes.length - 1) * interligne;
  ctx.textBaseline = 'alphabetic';
  for (const { morceaux } of mesures) {
    let x = MARGE;
    ctx.save();
    ctx.transform(1, 0, SKEW, 1, -SKEW * y, 0);   // inclinaison autour de la ligne de base
    for (const m of morceaux) {
      const txt = m.t.toUpperCase();
      const w = ctx.measureText(txt).width;
      if (m.s) {
        ctx.fillStyle = th.accent;
        ctx.fillRect(x - px * 0.055, y - px * 0.80, w + px * 0.11, px * 0.99);
        ctx.fillStyle = th.encre;
      } else {
        ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = px * 0.28; ctx.shadowOffsetY = px * 0.03;
        ctx.fillStyle = '#fff';
      }
      ctx.font = `${px}px ${POLICE}`;
      ctx.fillText(txt, x, y);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      x += w;
    }
    ctx.restore();
    y += interligne;
  }

  // 5. rubrique
  if (o.rubrique) {
    ctx.font = `19px ${POLICE}`;
    ctx.fillStyle = th.accent;
    ctx.letterSpacing = '4.2px';
    ctx.fillText(decoder(o.rubrique).toUpperCase(), MARGE, H - 44);
    ctx.letterSpacing = '0px';
  }
  return px;
}
