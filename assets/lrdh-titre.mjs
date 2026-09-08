// =============================================================================
// lrdh-titre.mjs · découpe du bloc-titre des covers LinkedIn LRDH
// -----------------------------------------------------------------------------
// SOURCE DE VÉRITÉ. Ce fichier est recopié à l'identique dans le hub
// (`larevue-ops/larevue-hub` → `assets/lrdh-titre.mjs`) pour que l'aperçu de
// l'éditeur découpe les lignes exactement comme le générateur, et non « à peu
// près ». Un aperçu approximatif serait pire que pas d'aperçu du tout.
//
// Contraintes à respecter si on le modifie :
//  · aucune dépendance Node ni navigateur · il tourne des deux côtés ;
//  · il ne dessine rien, il MESURE · le rendu reste chez l'appelant ;
//  · le `ctx` reçu peut être celui de @napi-rs/canvas comme celui du navigateur,
//    les deux exposent `font` et `measureText()` ;
//  · les familles de polices portent le MÊME nom des deux côtés
//    (`GlobalFonts.registerFromPath` côté Node, `@font-face` côté hub).
//
// Après toute modification : `npm run titre:diffuser` puis pousser les deux
// dépôts. `npm run titre:verifier` échoue si les deux copies divergent.
// =============================================================================

export const W = 1080;
export const H = 1350;

export const EDITORIAL_TITLE_FONT = 'EditorialPlayfair';
export const EDITORIAL_TITLE_ITALIC = 'EditorialPlayfairItalic';

export const GOLD = '#c9a24a';

// Gabarit « Actu · éditorial » (buildEditorialCover)
export const NEWS = {
  marginX: 60,
  maxWidth: W - 60 * 2 - 20,
  sizeMax: 78,
  sizeMin: 36,
  sizeStep: 2,
  // 08/09/2026 (demande user) : le corps ne se réduit PLUS avec la longueur du
  // titre · un titre long prend plus de lignes, à la même taille.
  fixe: true,
  maxLines: 6,
  lineHeightRatio: 1.06,
  markerBg: '#dc2626',
  markerText: '#ffffff',
  color: '#ffffff',
};

// Gabarit « On a testé » (buildTestCover) : le titre y est une citation
export const TEST = {
  marginX: 58,
  maxWidth: W - 58 * 2 - 12,
  sizeMax: 66,
  sizeMin: 34,
  sizeStep: 2,
  fixe: true,
  maxLines: 5,
  lineHeightRatio: 1.12,
  markerBg: GOLD,
  markerText: '#141414',
  color: '#ffffff',
};

const ITALIC_FAMILY = `"${EDITORIAL_TITLE_ITALIC}", "${EDITORIAL_TITLE_ITALIC}Fallback", "Times New Roman", Times, serif`;
const NORMAL_FAMILY = `"${EDITORIAL_TITLE_FONT}", "${EDITORIAL_TITLE_FONT}Fallback", "Times New Roman", Times, serif`;

// Chaîne `ctx.font` d'un segment. `italic` = passage entre *astérisques*,
// c'est-à-dire le texte surligné, dessiné en italique gras.
export function fontFor(italic, size) {
  return `${italic ? 'italic bold' : 'bold'} ${size}px ${italic ? ITALIC_FAMILY : NORMAL_FAMILY}`;
}

export function decodeHtmlEntities(text = '') {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
    ndash: '–', mdash: '—', hellip: '…',
  };
  return String(text || '')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&([a-zA-Z]+);/g, (m, name) => (named[name] !== undefined ? named[name] : m));
}

export function stripHtml(input = '') {
  return decodeHtmlEntities(String(input || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Comme stripHtml, mais les SAUTS DE LIGNE survivent. Dans l'editeur, appuyer
// sur Entree est une intention de mise en page, pas une espace de plus : le
// generateur ecrasait ce signal, l'apercu le montrait donc fidelement disparu.
// Les espaces multiples, eux, restent normalises (personne ne veut cadrer un
// titre a coups d'espaces).
export function nettoyerTitre(input = '') {
  return decodeHtmlEntities(String(input || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[^\S\n]+/g, ' ').trim())
    .filter((l) => l !== '')
    .join('\n');
}

// Coupe une liste de segments en BLOCS aux sauts de ligne. Sans saut de ligne,
// renvoie un bloc unique : le comportement d'avant, a l'identique.
export function decouperEnBlocs(segments) {
  const blocs = [[]];
  for (const seg of segments) {
    const morceaux = String(seg.text).split('\n');
    morceaux.forEach((m, i) => {
      if (i > 0) blocs.push([]);
      if (m !== '') blocs[blocs.length - 1].push({ ...seg, text: m });
    });
  }
  return blocs.filter((b) => b.length > 0);
}

// *mots* = marqueur (fond plein) · _mots_ = souligné · =mots= = encerclé au
// trait rouge (comme un stylo qui entoure un mot). Le cercle est un trait, pas
// un fond : le texte garde sa couleur, seul le contour est dessiné.
export const CIRCLE_MARKER_RE = /=([^=\n]+)=/;
export function parseItalicMarkers(text = '') {
  const t = String(text || '');
  const segments = [];
  const re = /\*([^*]+)\*|_([^_]+)_|=([^=\n]+)=/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(t)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ text: t.slice(lastIndex, m.index), italic: false });
    }
    if (m[1] !== undefined) segments.push({ text: m[1], italic: true });
    else if (m[2] !== undefined) segments.push({ text: m[2], italic: false, underline: true });
    else segments.push({ text: m[3], italic: false, circle: true });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < t.length) {
    segments.push({ text: t.slice(lastIndex), italic: false });
  }
  if (segments.length === 0) return [{ text: t, italic: false }];
  return segments.filter((s) => s.text.length > 0);
}

export function autoItaliciseBrand(title = '', brand = '') {
  if (!brand) return parseItalicMarkers(title);
  if (title.includes('*') || /_[^_]+_/.test(title) || CIRCLE_MARKER_RE.test(title)) return parseItalicMarkers(title);
  const idx = title.toLowerCase().indexOf(brand.toLowerCase());
  if (idx === -1) return [{ text: title, italic: false }];
  const segments = [];
  if (idx > 0) segments.push({ text: title.slice(0, idx), italic: false });
  segments.push({ text: title.slice(idx, idx + brand.length), italic: true });
  if (idx + brand.length < title.length) {
    segments.push({ text: title.slice(idx + brand.length), italic: false });
  }
  return segments;
}

export function measureEditorialSegments(ctx, segments, size) {
  let total = 0;
  for (const seg of segments) {
    ctx.font = fontFor(seg.italic, size);
    total += ctx.measureText(seg.text).width;
  }
  return total;
}

// Decoupe en unites insecables. Un passage surligne (*mots*) ou souligne
// (_mots_) forme UN pave de couleur : le couper en fin de ligne en fabrique
// deux, ce qui se voit immediatement et se lit mal. On le garde donc entier,
// SAUF s'il est a lui seul plus large que la colonne · dans ce cas il faut
// bien le casser, et on retombe sur la decoupe mot a mot.
function uniteInsecables(ctx, segments, maxW, size) {
  const unites = [];
  for (const seg of segments) {
    const tok = { text: seg.text, italic: !!seg.italic, underline: !!seg.underline, circle: !!seg.circle };
    if ((tok.italic || tok.underline || tok.circle) && measureEditorialSegments(ctx, [tok], size) <= maxW) {
      unites.push(tok);
      continue;
    }
    for (const p of seg.text.split(/(\s+)/)) {
      if (!p) continue;
      unites.push({ ...tok, text: p });
    }
  }
  return unites;
}

export function wrapEditorialSegments(ctx, segments, maxW, size) {
  const tokens = uniteInsecables(ctx, segments, maxW, size);
  const lines = [];
  let curLine = [];
  for (const tok of tokens) {
    const test = [...curLine, tok];
    const w = measureEditorialSegments(ctx, test, size);
    if (w > maxW && curLine.length > 0) {
      lines.push(curLine);
      curLine = /^\s+$/.test(tok.text) ? [] : [tok];
    } else {
      curLine.push(tok);
    }
  }
  if (curLine.length > 0) lines.push(curLine);
  for (const line of lines) {
    while (line.length && /^\s+$/.test(line[line.length - 1].text)) line.pop();
  }
  return lines;
}

// Le titre du style « On a testé » est une CITATION : majuscule initiale
// + guillemets français, ajoutés seulement s'ils manquent.
export function toCitation(title = '') {
  let rawTitle = String(title || '').trim();
  rawTitle = rawTitle.replace(/^([^\p{L}]*)(\p{L})/u, (m, pre, c) => pre + c.toLocaleUpperCase('fr'));
  const alreadyQuoted = /^[«"“”'']/.test(rawTitle.replace(/^\*+/, ''));
  return alreadyQuoted ? rawTitle : `« ${rawTitle} »`;
}

// Rétrécit le corps jusqu'à tenir dans `maxLines`, puis coupe le surplus —
// exactement comme le générateur, y compris la coupe silencieuse, que
// l'appelant peut signaler grâce à `truncated`.
function ajuster(ctx, segments, g) {
  // ⚠️ Boucle recopiee TELLE QUELLE du generateur, quirk compris : quand le
  // titre ne rentre toujours pas au corps minimum, on sort avec `size` un cran
  // EN DESSOUS du corps qui a servi a la decoupe. Le generateur dessine donc
  // ces titres-la un peu plus petits que la mesure. C'est bancal, mais l'apercu
  // doit montrer ce qui sera dessine, pas ce qui aurait du l'etre. Si on
  // corrige un jour, ce sera ici, et les deux cotes suivront ensemble.
  const blocs = decouperEnBlocs(segments);
  let size = g.sizeMax;
  let lines = [];
  // Corps FIXE (08/09/2026) : on habille au corps maximal et on s'arrête là,
  // quel que soit le nombre de lignes. La boucle de réduction ci-dessous ne
  // sert plus qu'aux gabarits qui n'ont pas `fixe`.
  if (g.fixe) {
    lines = blocs.flatMap((b) => wrapEditorialSegments(ctx, b, g.maxWidth, size));
  } else while (size >= g.sizeMin) {
    // Chaque bloc est habille separement, puis les lignes s'enchainent : un
    // saut de ligne force donc une nouvelle ligne, et le corps se reduit sur
    // le TOTAL, comme le ferait un titre d'un seul tenant.
    lines = blocs.flatMap((b) => wrapEditorialSegments(ctx, b, g.maxWidth, size));
    if (lines.length <= g.maxLines) break;
    size -= g.sizeStep;
  }
  const truncated = lines.length > g.maxLines;
  if (truncated) lines = lines.slice(0, g.maxLines);
  return {
    size,
    lines,
    truncated,
    lineHeight: Math.round(size * g.lineHeightRatio),
    marginX: g.marginX,
    maxWidth: g.maxWidth,
    markerBg: g.markerBg,
    markerText: g.markerText,
    color: g.color,
  };
}

// Gabarit « Actu » · le titre reprend la marque en surligné si l'auteur
// n'a posé aucun marqueur lui-même.
export function layoutNewsTitle(ctx, { title = '', brand = '' } = {}) {
  const clean = nettoyerTitre(title);
  return ajuster(ctx, autoItaliciseBrand(clean, stripHtml(brand)), NEWS);
}

// Gabarit « On a testé » · pas de reprise de marque, mais une mise en citation.
export function layoutTestTitle(ctx, { title = '' } = {}) {
  const clean = nettoyerTitre(title);
  return ajuster(ctx, parseItalicMarkers(toCitation(clean)), TEST);
}

export function layoutTitle(ctx, { style = 'news', title = '', brand = '' } = {}) {
  return style === 'test'
    ? layoutTestTitle(ctx, { title })
    : layoutNewsTitle(ctx, { title, brand });
}

// Dessine UNE ligne deja decoupee : surlignage des *mots*, texte, soulignage
// des _mots_. Partagee elle aussi, pour que l'apercu du hub place les blocs
// de couleur au pixel pres comme le generateur.
export function drawEditorialTitleLine(ctx, segments, x, y, size, color, opts = {}) {
  const markerBg = opts.markerBg || '#dc2626';
  const markerText = opts.markerText || '#ffffff';
  const police = (it) => fontFor(it, size);

  // 1) Surlignage (marqueur) derrière les passages entre *astérisques*.
  //    Couleur par défaut = rouge #dc2626 (style news) ; surchargeable en or.
  let cx = x;
  let runStart = null;
  let runW = 0;
  const flushRun = () => {
    if (runStart !== null && runW > 0) {
      const padX = Math.round(size * 0.09);
      const rectY = y - Math.round(size * 0.80);
      const rectH = Math.round(size * 1.02);
      ctx.fillStyle = markerBg;
      ctx.fillRect(runStart - padX, rectY, runW + padX * 2, rectH);
    }
    runStart = null;
    runW = 0;
  };
  for (const seg of segments) {
    ctx.font = police(seg.italic);
    const w = ctx.measureText(seg.text).width;
    if (seg.italic) {
      if (runStart === null) runStart = cx;
      runW += w;
    } else {
      flushRun();
    }
    cx += w;
  }
  flushRun();

  // 2) Texte par-dessus : surligné en `markerText`, le reste dans `color`.
  cx = x;
  for (const seg of segments) {
    ctx.font = police(seg.italic);
    ctx.fillStyle = seg.italic ? markerText : color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(seg.text, cx, y);
    cx += ctx.measureText(seg.text).width;
  }

  // 3) Soulignement des passages entre _underscores_ (runs contigus).
  cx = x;
  let ulStart = null;
  let ulW = 0;
  const flushUl = () => {
    if (ulStart !== null && ulW > 0) {
      const lh = Math.max(3, Math.round(size * 0.07));
      ctx.fillStyle = color;
      ctx.fillRect(ulStart, y + Math.round(size * 0.14), ulW, lh);
    }
    ulStart = null;
    ulW = 0;
  };
  for (const seg of segments) {
    ctx.font = police(seg.italic);
    const w = ctx.measureText(seg.text).width;
    if (seg.underline) {
      if (ulStart === null) ulStart = cx;
      ulW += w;
    } else {
      flushUl();
    }
    cx += w;
  }
  flushUl();

  // 4) Cercle rouge autour des passages entre =signes égal= : une ellipse
  //    tracée à main levée (deux passes légèrement décalées, trait irrégulier),
  //    par-dessus le texte comme un coup de stylo. Toujours rouge, quel que
  //    soit le gabarit : c'est un geste, pas un fond.
  cx = x;
  let ciStart = null;
  let ciW = 0;
  const flushCircle = () => {
    if (ciStart !== null && ciW > 0) drawHandCircle(ctx, ciStart, y, ciW, size, opts.circleColor || '#dc2626');
    ciStart = null;
    ciW = 0;
  };
  for (const seg of segments) {
    ctx.font = police(seg.italic);
    const w = ctx.measureText(seg.text).width;
    if (seg.circle) {
      if (ciStart === null) ciStart = cx;
      ciW += w;
    } else {
      flushCircle();
    }
    cx += w;
  }
  flushCircle();
}

// Ellipse « au stylo » autour d'un passage de texte : centre sur la hauteur
// d'x, un peu plus large que le mot, trait épais légèrement penché, second
// passage décalé pour l'aspect main levée. Déterministe (aucun aléa) : le
// hub et le générateur dessinent exactement la même chose.
export function drawHandCircle(ctx, x, baseline, w, size, color = '#dc2626') {
  const cx = x + w / 2;
  const cy = baseline - size * 0.30;
  const rx = w / 2 + size * 0.14;      // serré autour du mot, sans mordre les voisins
  const ry = size * 0.56;
  const tilt = -0.05;                  // légère pente, comme un geste rapide
  const lw = Math.max(4, Math.round(size * 0.095));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // passe 1 : le tour complet, qui dépasse un peu son point de départ
  ctx.globalAlpha = 1;
  ctx.lineWidth = lw;
  ctx.beginPath();
  // ⚠️ jamais un balayage ≥ 2π : @napi-rs/canvas n'en dessine alors rien du
  //    tout (constaté le 08/09/2026) · on ferme le tour à 1,97π, le second
  //    passage recouvre la jointure.
  ctx.ellipse(cx, cy, rx, ry, tilt, Math.PI * 0.55, Math.PI * 0.55 + Math.PI * 1.97);
  ctx.stroke();
  // passe 2 : le même tracé décalé d'un cheveu sur la moitié basse, pour
  // l'épaisseur irrégulière d'un trait de feutre
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(3, Math.round(lw * 0.55));
  ctx.beginPath();
  ctx.ellipse(cx + size * 0.02, cy + size * 0.03, rx + size * 0.02, ry + size * 0.03, tilt + 0.02, Math.PI * 0.15, Math.PI * 0.95);
  ctx.stroke();
  ctx.restore();
}

// Le texte d'une ligne, utile pour un aperçu textuel ou un test.
export function lineText(line) {
  return line.map((seg) => seg.text).join('');
}
