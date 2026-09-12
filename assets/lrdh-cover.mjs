// [12/09/2026] Aperçu DIRECT de la cover LinkedIn LRDH, dessiné dans le
// navigateur pendant qu'on tape (demande user).
//
// ⚠️ Le bloc-titre n'est PAS redessiné ici : il vient de `lrdh-titre.mjs`, la
// copie conforme du module du générateur. Tout le reste (photo, dégradé,
// bandeau, badge, pastille, photo ronde) est un portage des fonctions de
// `lib/generators/lrdh.js` du dépôt larevue-social-runner, avec les MÊMES
// constantes. Une valeur modifiée là-bas doit être reportée ici, sinon
// l'aperçu ment — et un aperçu qui ment est pire que pas d'aperçu.
//
// Style « Actu · éditorial » seulement. Le style « On a testé » garde l'image
// déjà générée : sa carte, son sceau et sa plaque de note ne sont pas portés.

import * as TITRE from './lrdh-titre.mjs?v=20260912c';

export const W = 1080;
export const H = 1350;
const HANDLE = '@LAREVUEDESHOTELS';
const LOGO_URL = 'https://larevuedeshotels.com/wp-content/uploads/2024/02/cropped-Les-hotels-de-luxe-influenceur-hotels-de-luxe-magazine-hotels-de-luxe-avis-hotellerie-de-luxe-avis-hotels.png';
const PLAYFAIR = '"EditorialPlayfair", "EditorialPlayfairFallback", "Times New Roman", Times, serif';
const SANS = 'Helvetica, Arial, sans-serif';

// ── Drapeau du bandeau ──────────────────────────────────────────────────────
const COUNTRY_ISO_FR = {
  'ETATS-UNIS':'us','ETATS UNIS':'us','USA':'us','NEW YORK':'us','MIAMI':'us','LOS ANGELES':'us','LAS VEGAS':'us','CALIFORNIE':'us','BOSTON':'us','CHICAGO':'us',
  'ROYAUME-UNI':'gb','ROYAUME UNI':'gb','ANGLETERRE':'gb','LONDRES':'gb','ECOSSE':'gb',
  'EMIRATS ARABES UNIS':'ae','EMIRATS':'ae','DUBAI':'ae','ABU DHABI':'ae',
  'ARABIE SAOUDITE':'sa','RIYAD':'sa','MER ROUGE':'sa',
  'REPUBLIQUE DOMINICAINE':'do','REPUBLIQUE TCHEQUE':'cz','PRAGUE':'cz',
  'NOUVELLE-ZELANDE':'nz','NOUVELLE ZELANDE':'nz',
  'AFRIQUE DU SUD':'za','COREE DU SUD':'kr','SEOUL':'kr',
  'COSTA RICA':'cr','HONG KONG':'hk','PORTO RICO':'pr',
  'POLYNESIE':'pf','BORA BORA':'pf','TAHITI':'pf',
  'FRANCE':'fr','PARIS':'fr','PROVENCE':'fr','CORSE':'fr','SOLOGNE':'fr','COURCHEVEL':'fr','SAINT-TROPEZ':'fr','CANNES':'fr','NICE':'fr','BORDEAUX':'fr','LYON':'fr','MEGEVE':'fr',
  'JAPON':'jp','TOKYO':'jp','KYOTO':'jp','HAKONE':'jp','OSAKA':'jp',
  'ITALIE':'it','ROME':'it','MILAN':'it','VENISE':'it','TOSCANE':'it','SICILE':'it','SARDAIGNE':'it','CAPRI':'it','PORTOFINO':'it',
  'ESPAGNE':'es','MADRID':'es','BARCELONE':'es','MAJORQUE':'es','IBIZA':'es','SEVILLE':'es','MARBELLA':'es',
  'PORTUGAL':'pt','LISBONNE':'pt','PORTO':'pt','ALGARVE':'pt','MADERE':'pt',
  'SUISSE':'ch','GENEVE':'ch','ZURICH':'ch','ZERMATT':'ch','GSTAAD':'ch','ST. MORITZ':'ch','ST MORITZ':'ch','VERBIER':'ch','LAUSANNE':'ch','MONTREUX':'ch','INTERLAKEN':'ch','LUCERNE':'ch','CRANS-MONTANA':'ch',
  'ALLEMAGNE':'de','BERLIN':'de','MUNICH':'de',
  'AUTRICHE':'at','VIENNE':'at','BELGIQUE':'be','BRUXELLES':'be',
  'PAYS-BAS':'nl','AMSTERDAM':'nl',
  'GRECE':'gr','ATHENES':'gr','MYKONOS':'gr','SANTORIN':'gr','CRETE':'gr','PAROS':'gr',
  'CROATIE':'hr','IRLANDE':'ie','DUBLIN':'ie','TURQUIE':'tr','ISTANBUL':'tr','BODRUM':'tr',
  'MONACO':'mc','MONTE-CARLO':'mc','MONTE CARLO':'mc',
  'QATAR':'qa','DOHA':'qa','OMAN':'om','ISRAEL':'il','JORDANIE':'jo','LIBAN':'lb',
  'MAROC':'ma','MARRAKECH':'ma','CASABLANCA':'ma','TUNISIE':'tn','EGYPTE':'eg',
  'KENYA':'ke','TANZANIE':'tz','ZANZIBAR':'tz','MAURICE':'mu','SEYCHELLES':'sc','MALDIVES':'mv',
  'INDE':'in','CHINE':'cn','SHANGHAI':'cn','PEKIN':'cn','SINGAPOUR':'sg',
  'THAILANDE':'th','BANGKOK':'th','PHUKET':'th','VIETNAM':'vn','INDONESIE':'id','BALI':'id','MALAISIE':'my','PHILIPPINES':'ph','CAMBODGE':'kh','SRI LANKA':'lk','NEPAL':'np','BHOUTAN':'bt',
  'AUSTRALIE':'au','SYDNEY':'au',
  'CANADA':'ca','MONTREAL':'ca','TORONTO':'ca','MEXIQUE':'mx','BRESIL':'br','ARGENTINE':'ar','CHILI':'cl','PEROU':'pe','COLOMBIE':'co',
  'BAHAMAS':'bs','JAMAIQUE':'jm','CUBA':'cu','FIDJI':'fj',
  'ISLANDE':'is','NORVEGE':'no','SUEDE':'se','STOCKHOLM':'se','DANEMARK':'dk','COPENHAGUE':'dk','FINLANDE':'fi','LAPONIE':'fi',
  'POLOGNE':'pl','HONGRIE':'hu','BUDAPEST':'hu','MALTE':'mt','CHYPRE':'cy','LUXEMBOURG':'lu','ANDORRE':'ad',
};
const CLES_PAYS = Object.keys(COUNTRY_ISO_FR).sort((a, b) => b.length - a.length);

export function isoDepuisLieu(lieu = '') {
  const norm = String(lieu || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (!norm.trim()) return null;
  for (const cle of CLES_PAYS) {
    const re = new RegExp(`(^|[^A-Z])${cle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Z]|$)`);
    if (re.test(norm)) return COUNTRY_ISO_FR[cle];
  }
  return null;
}

// ── Chargement d'images, mémorisé ───────────────────────────────────────────
const cacheImg = new Map();
export function charger(url) {
  if (!url) return Promise.resolve(null);
  if (cacheImg.has(url)) return cacheImg.get(url);
  // ⚠️ Pas de `crossOrigin` : le CDN de larevuedeshotels.com ne renvoie pas
  // d'en-tête CORS, et une première tentative en `anonymous` ne ferait que
  // remplir la console d'erreurs avant de retomber sur le chargement simple.
  // Le canevas devient « teinté », ce qui interdit de l'exporter — on ne
  // l'exporte jamais, c'est un aperçu, l'image finale vient du générateur.
  const p = new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
  cacheImg.set(url, p);
  return p;
}

// ── Formes de base ──────────────────────────────────────────────────────────
function cheminPastille(ctx, x, y, w, h) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function cheminArrondi(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Le bandeau blanc du haut ────────────────────────────────────────────────
function bandeauBlanc(ctx, texte, cy, { maxTagW = W - 24 } = {}) {
  let fontSize = 32, padX = 52, padY = 28, tracking = 5;
  const maj = String(texte).toLocaleUpperCase('fr-FR');
  let textW = 0, tagW = 0;
  for (;;) {
    ctx.font = `bold ${fontSize}px ${PLAYFAIR}`;
    textW = 0;
    for (const c of maj) textW += ctx.measureText(c).width + tracking;
    textW -= tracking;
    tagW = textW + padX * 2;
    if (tagW <= maxTagW) break;
    if (fontSize > 22) { fontSize -= 1; continue; }
    if (tracking > 2) { tracking -= 0.5; continue; }
    if (fontSize > 16) { fontSize -= 1; continue; }
    break;
  }
  const tagH = fontSize + padY * 2;
  const x = (W - tagW) / 2, y = cy - tagH / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, tagW, tagH);
  ctx.restore();
  ctx.fillStyle = '#0a0a0a'; ctx.strokeStyle = '#0a0a0a';
  ctx.lineWidth = Math.max(1, fontSize * 0.05); ctx.lineJoin = 'round';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let cx = x + padX;
  for (const c of maj) {
    ctx.fillText(c, cx, y + tagH / 2 + 1);
    ctx.strokeText(c, cx, y + tagH / 2 + 1);
    cx += ctx.measureText(c).width + tracking;
  }
  return { w: tagW, h: tagH, x, y };
}

function medaillon(ctx, img, cx, cy, h, { fond = '#0e0e0e', ratio = 1 } = {}) {
  const w = h * ratio;
  const x = cx - w / 2, y = cy - h / 2;
  const r = Math.max(5, Math.round(h * 0.16));
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 3;
  cheminArrondi(ctx, x, y, w, h, r);
  ctx.fillStyle = fond; ctx.fill();
  ctx.restore();
  if (img) {
    ctx.save(); cheminArrondi(ctx, x, y, w, h, r); ctx.clip();
    ctx.drawImage(img, x, y, w, h); ctx.restore();
  }
  ctx.save(); cheminArrondi(ctx, x, y, w, h, r);
  ctx.strokeStyle = 'rgba(201,169,97,0.95)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}

// ── Le badge de rubrique ────────────────────────────────────────────────────
function badgeRubrique(ctx, texte, x, y) {
  const fontSize = 34, padX = 28, padY = 16, tracking = 3.2;
  ctx.font = `bold ${fontSize}px ${PLAYFAIR}`;
  const maj = String(texte).toLocaleUpperCase('fr-FR');
  let textW = 0;
  for (const c of maj) textW += ctx.measureText(c).width + tracking;
  textW -= tracking;
  const tagW = textW + padX * 2, tagH = fontSize + padY * 2;
  ctx.fillStyle = '#dc2626'; ctx.fillRect(x, y, tagW, tagH);
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let cx = x + padX;
  for (const c of maj) { ctx.fillText(c, cx, y + tagH / 2 + 1); cx += ctx.measureText(c).width + tracking; }
}

// ── La pastille du bas ──────────────────────────────────────────────────────
function pastilleBas(ctx) {
  const taille = 30, tracking = 2.6;
  ctx.font = `bold ${taille}px ${SANS}`;
  let larg = 0;
  for (const c of HANDLE) larg += ctx.measureText(c).width + tracking;
  larg -= tracking;
  const pillH = 60;
  const padX = Math.round((pillH - taille) / 2);
  const pillW = larg + padX * 2;
  const pillX = (W - pillW) / 2, pillY = H - pillH - 36;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
  cheminPastille(ctx, pillX, pillY, pillW, pillH);
  ctx.fillStyle = '#101010'; ctx.fill(); ctx.restore();
  ctx.save(); cheminPastille(ctx, pillX, pillY, pillW, pillH);
  ctx.strokeStyle = 'rgba(201,169,97,0.95)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${taille}px ${SANS}`;
  let hx = pillX + (pillW - larg) / 2;
  const cy = pillY + pillH / 2;
  for (const c of HANDLE) { ctx.fillText(c, hx, cy); hx += ctx.measureText(c).width + tracking; }
  ctx.restore();
}

// ── La photo ronde incrustée ────────────────────────────────────────────────
function photoRonde(ctx, img, legende) {
  const D = 300;
  const icx = Math.round(W * 0.78);
  const bannerBottom = 88;
  const rightMargin = W - (icx + D / 2);
  const icy = bannerBottom + rightMargin + D / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 6;
  ctx.beginPath(); ctx.arc(icx, icy, D / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#151515'; ctx.fill(); ctx.restore();
  if (img) {
    ctx.save(); ctx.beginPath(); ctx.arc(icx, icy, D / 2, 0, Math.PI * 2); ctx.clip();
    const s = D / Math.min(img.width, img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, icx - dw / 2, icy - dh / 2, dw, dh); ctx.restore();
  }
  ctx.save();
  ctx.beginPath(); ctx.arc(icx, icy, D / 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 10; ctx.stroke();
  ctx.beginPath(); ctx.arc(icx, icy, D / 2 + 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();

  const texte = legende ? String(legende).trim() : '';
  if (!texte) return;
  const ZONE_FLECHE = 120;
  const droite = icx - D / 2 - ZONE_FLECHE;
  const maxW = droite - 70;
  ctx.save();
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  let taille = 40, lignes = [];
  for (; taille >= 26; taille -= 2) {
    ctx.font = `italic bold ${taille}px "EditorialPlayfairItalic", "EditorialPlayfairItalicFallback", Georgia, serif`;
    lignes = []; let cur = '';
    for (const mot of texte.split(/\s+/)) {
      const t = cur ? cur + ' ' + mot : mot;
      if (!cur || ctx.measureText(t).width <= maxW) cur = t;
      else { lignes.push(cur); cur = mot; }
    }
    if (cur) lignes.push(cur);
    if (lignes.length <= 2) break;
  }
  const lh = Math.round(taille * 1.18);
  const y0 = icy - ((lignes.length - 1) * lh) / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';
  lignes.forEach((l, i) => ctx.fillText(l, droite, y0 + i * lh));
  const sx = droite + 18, sy = icy + 24;
  const ex = icx - D / 2 - 20, ey = icy + 8;
  const cpx = (sx + ex) / 2, cpy = icy + 62;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke();
  const ang = Math.atan2(ey - cpy, ex - cpx);
  for (const da of [-0.5, 0.5]) {
    ctx.beginPath(); ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 24 * Math.cos(ang + da), ey - 24 * Math.sin(ang + da)); ctx.stroke();
  }
  ctx.restore();
}

// ── Le recadrage de la photo de fond, comme resizeWithCrop() ────────────────
function cadrer(ctx, img, { x = 50, y = 50, zoom = 100 } = {}) {
  const sW = img.naturalWidth || img.width, sH = img.naturalHeight || img.height;
  const ratio = W / H;
  let rw, rh;
  if (sW / sH > ratio) { rh = sH; rw = sH * ratio; } else { rw = sW; rh = sW / ratio; }
  const zf = Math.max(100, Math.min(300, zoom)) / 100;
  rw = Math.min(rw / zf, sW);
  rh = Math.min(rh / zf, sH);
  const top = Math.round(Math.max(0, sH - rh) * (Math.max(0, Math.min(100, y)) / 100));
  const left = Math.round(Math.max(0, sW - rw) * (Math.max(0, Math.min(100, x)) / 100));
  ctx.drawImage(img, left, top, rw, rh, 0, 0, W, H);
}

// ── L'aperçu complet ────────────────────────────────────────────────────────
export async function dessinerCoverActu(ctx, {
  imageUrl = '', category = '', title = '', brand = '', location = '',
  crop = { x: 50, y: 50, zoom: 100 }, insetImage = '', insetLabel = '', titleSize = 0,
} = {}) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, W, H);

  const [fond, logo, incruste] = await Promise.all([
    charger(imageUrl), charger(LOGO_URL), charger(insetImage),
  ]);
  if (fond) { try { cadrer(ctx, fond, crop); } catch (e) { /* photo illisible : fond noir */ } }

  // Dégradé : il monte avec le bloc-titre, sinon les premières lignes
  // tomberaient sur la photo claire (même calcul que le générateur).
  const mise = TITRE.layoutNewsTitle(ctx, { title, brand, size: titleSize });
  const hautBloc = (H - 60 - 36 - 75) - mise.lines.length * mise.lineHeight - 84 - 70;
  const depart = Math.min(Math.round(H * 0.45), hautBloc - 160);
  const grad = ctx.createLinearGradient(0, depart, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, depart, W, H - depart);

  if (insetImage) photoRonde(ctx, incruste, insetLabel);
  pastilleBas(ctx);

  // Bandeau du haut + médaillons logo / drapeau
  const hauteurBandeau = 32 + 28 * 2;
  const cyBandeau = hauteurBandeau / 2;
  const iso = isoDepuisLieu(location);
  const drapeau = iso ? await charger(`https://flagcdn.com/w320/${iso}.png`) : null;
  const ratioDrapeau = drapeau ? drapeau.width / drapeau.height : 0;
  const IMBRIC = 14, MARGE = 10;
  const largeurChip = drapeau ? Math.ceil(88 * ratioDrapeau) : 0;
  const reserveG = 88 - IMBRIC + MARGE + 8;
  const reserveD = drapeau ? (largeurChip - IMBRIC + MARGE + 8) : reserveG;
  const libelle = location ? `${brand} · ${location}` : String(brand || '');
  const tag = bandeauBlanc(ctx, libelle, cyBandeau, { maxTagW: W - 2 * Math.max(reserveG, reserveD) });
  const borner = (cx, demi) => Math.max(demi + MARGE, Math.min(W - demi - MARGE, cx));
  medaillon(ctx, logo, borner(tag.x - tag.h / 2 + IMBRIC, tag.h / 2), cyBandeau, tag.h);
  if (drapeau) {
    const cw = tag.h * ratioDrapeau;
    medaillon(ctx, drapeau, borner(tag.x + tag.w + cw / 2 - IMBRIC, cw / 2), cyBandeau, tag.h,
      { fond: '#ffffff', ratio: ratioDrapeau });
  }

  // Badge de rubrique + titre
  const hauteurTitre = mise.lines.length * mise.lineHeight;
  const basTitre = (H - 60 - 36) - 75;
  let ty = basTitre - hauteurTitre + mise.size;
  badgeRubrique(ctx, category || 'ACTUALITÉS', mise.marginX, ty - mise.size - 84);
  for (const ligne of mise.lines) {
    TITRE.drawEditorialTitleLine(ctx, ligne, mise.marginX, ty, mise.size, '#ffffff',
      { markerBg: mise.markerBg, markerText: mise.markerText });
    ty += mise.lineHeight;
  }
  return mise;
}
