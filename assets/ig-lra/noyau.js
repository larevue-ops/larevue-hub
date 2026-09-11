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
  const lignes = String(o.titre || '').split('|').map(s => s.trim()).filter(Boolean);
  const px = o.taille || corpsAuto(ctx, lignes, o.hauteurMax || 520);
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
    ctx.fillText(String(o.rubrique).toUpperCase(), MARGE, H - 44);
    ctx.letterSpacing = '0px';
  }
  return px;
}
