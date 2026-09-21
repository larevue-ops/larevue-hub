// ⚠️ FICHIER GENERE par larevue-social-runner/scripts/sync-hub.sh
// Source : lib/generators/lrdh-instagram-noyau.js · toute edition ici sera ecrasee.
// ─── Coeur de dessin des carrousels LRDH · SANS dependance d'environnement ───
//
// Ce fichier ne connait ni le disque, ni napi-rs, ni le DOM : il recoit un
// contexte 2D deja dimensionne, une image deja chargee et un logo deja charge,
// et il dessine. C'est ce qui permet au serveur (napi-rs/canvas) et au
// navigateur (canvas du DOM) de produire EXACTEMENT le meme visuel.
//
// ⚠️ Source unique. La copie du hub est produite par `npm run sync-hub` et
// porte un en-tete « genere ». Ne jamais editer la copie : on a deja paye le
// prix d'un fichier qualite.mjs en trois exemplaires divergents.

// ─── Formats (17/09/2026) : Instagram 4:5, TikTok 9:16 ───────────────────────
// `dessiner()` bascule W/H (liaisons vivantes) le temps d'un rendu. TikTok pose
// ses propres commandes par-dessus l'image : onglets en haut (~200 px), icônes
// à droite (~130 px), pseudo et légende en bas (~260 px) · les marges FMT
// écartent le texte de ces zones. Instagram n'en a pas besoin.
export const FORMATS = {
  instagram: { W: 1080, H: 1350, haut: 0, bas: 0, droite: 0 },
  tiktok:    { W: 1080, H: 1920, haut: 200, bas: 260, droite: 130 },
};
export let W = FORMATS.instagram.W;
export let H = FORMATS.instagram.H;     // 4:5, le plus haut format tolere par Instagram
let FMT = FORMATS.instagram;
export const dimensions = (plateforme) => { const f = FORMATS[plateforme] || FORMATS.instagram; return { W: f.W, H: f.H }; };
export const SANS = 'ExqzSans';         // Inter Bold · le bouton « Suivre » d'Instagram
export const COMPTES = { instagram: '@larevuedeshotels', tiktok: '@larevuedeshotels' };
export const LARGEUR_MINI = 900;        // en deca, l'image serait etiree
export const INK = '#0d0d0c';
export const CTA_DEFAUT = "Plus d'infos via le lien dans la bio.";

// ─── Gouttière du texte (21/09/2026, demande user) ──────────────────────────
// Le texte courait d'un bord à l'autre, à 66 px des côtés : sur le vrai fil
// Instagram, les avatars de collaboration, la pastille de son et les points du
// carrousel viennent mordre dessus, et les premiers mots de chaque ligne se
// perdent. La référence donnée par la rédaction (un carrousel @nylonfrance)
// tient son texte dans les 70 % centraux et le pose plus haut.
//
// GOUTTIERE = marge latérale de chaque côté · FOND_TEXTE = distance au bas.
// Modifier ces deux valeurs suffit à recadrer TOUS les slides d'un coup.
export const GOUTTIERE = 160;          // 14,8 % de 1080 de chaque côté
export const FOND_TEXTE = 236;         // au-dessus des commandes d'Instagram
export const largeurTexte = (retrait = 0) => W - 2 * GOUTTIERE - retrait;

// ⚠️ Newsreader etait une erreur d'identification : je l'avais lue dans la
// feuille de style d'exqz.com en supposant que le site et les visuels
// partageaient la meme police. C'est faux · leurs carrousels emploient un
// display serif resserre a fort contraste. Comparaison de lettres a l'appui
// (le mot « Norway's Whale » de leur visuel, agrandi et mis en regard de six
// candidates), Playfair Display en graisse 500 est ce qui s'en approche le
// plus parmi les fontes libres. Newsreader rendait trop large et trop douce.
export const SERIF = 'ExqzSerif';       // Playfair Display 500
export const SERIF_REG = 'ExqzSerifReg';// Playfair Display 400
export const LOGO_LARGE_COUV = 88;
export const LOGO_LARGE_SUITE = 58;

// ─── helpers de dessin ──────────────────────────────────────────────────────
// Écho de la marque (17/09/2026, idée user) : slide après slide, le contour du
// logo se répète un peu plus large · rien sur la couverture, un anneau sur la
// 2e, deux sur la 3e… jusqu'à ECHO_MAX. Feuilleté, ça fait une onde qui
// s'élargit ; à l'arrêt, c'est à peine là. `index` = position du slide (1 = couverture).
export const ECHO_MAX = 4;
const ECHO_PAS = 6;
const echoDe = (index) => Math.max(0, Math.min(ECHO_MAX, (Number(index) || 0) - 1));
function echoMarque(ctx, x, y, w, h, n) {
  if (n <= 0) return;
  const r0 = Math.round(w * 0.12);
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1;
  for (let k = 1; k <= n; k++) {
    const pad = ECHO_PAS * k;
    ctx.strokeStyle = `rgba(255,255,255,${(0.55 * (n - k + 1) / n).toFixed(3)})`;
    ctx.beginPath();
    ctx.roundRect(x - pad, y - pad, w + 2 * pad, h + 2 * pad, r0 + pad);
    ctx.stroke();
  }
  ctx.restore();
}
function marque(ctx, logo, y, large, echo = 0) {
  if (!logo) return 0;
  const h = Math.round(logo.height * large / logo.width);
  const x = (W - large) / 2;
  echoMarque(ctx, x, y, large, h, echo);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.30)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
  ctx.drawImage(logo, x, y, large, h);
  ctx.restore();
  return h;
}

function signer(ctx, logo, echo = 0) {
  if (!logo) return;
  const h = Math.round(logo.height * LOGO_LARGE_SUITE / logo.width);
  marque(ctx, logo, H - h - 54 - FMT.bas, LOGO_LARGE_SUITE, echo);
}

// Calque (17/09/2026) : dessiner SANS la photo, sur fond transparent. Pour poser
// du texte sur une VIDÉO, le hub rend ce calque (dégradé, marque, texte, compteur)
// en PNG transparent et Cloudinary le superpose à la vidéo. `dessiner()` l'arme.
let CALQUE = false;
function fond(ctx, img) {
  if (CALQUE) return;
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  coverDraw(ctx, img);
}

export function coverDraw(ctx, img, w = W, h = H) {
  if (img.width < LARGEUR_MINI) throw new Error(`image trop petite (${img.width}px, minimum ${LARGEUR_MINI})`);
  const r = Math.max(w / img.width, h / img.height);
  const dw = img.width * r, dh = img.height * r;
  // cadrage legerement haut : sur une photo d'hotel, le ciel se sacrifie mieux
  // que le batiment, et le bas doit rester lisible sous le titre.
  ctx.drawImage(img, (w - dw) / 2, (h - dh) * 0.38, dw, dh);
}

function ombreTexte(ctx, force = 1) {
  ctx.shadowColor = `rgba(0,0,0,${Math.min(0.55, 0.42 * force)})`;
  ctx.shadowBlur = 22 * force;
  ctx.shadowOffsetY = 2;
}
function sansOmbre(ctx) { ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'; }

// ─── marqueurs dans le texte (09/09/2026, comme sur les covers LinkedIn) ────
//   *mots*   → surligné rouge (rectangle plein, texte blanc)
//   =mots=   → encerclé au feutre rouge, tracé DERRIÈRE le texte
//   ==mots== → le même ovale, mais REMPLI de rouge (demande user 17/09/2026)
// Le texte est découpé en mots porteurs de leurs marques ; l'habillage et le
// centrage se font sur le texte nu, les marques ne changent pas la coupe.
export const ROUGE = '#dc2626';
export function parseMarqueurs(text) {
  const s = String(text || '');
  const out = [];
  // `colle` : le mot se colle au précédent, sans espace · c'est la ponctuation
  // qui suit une marque (« *Sogni*, le » → « Sogni, le », pas « Sogni , le »).
  const pousser = (morceau, hl, ci, pa = false) => {
    const colle = /^[,.;:!?…»)\]]/.test(morceau) && out.length > 0;
    morceau.split(/\s+/).filter(Boolean).forEach((w, k) => out.push({ t: w, hl, ci, pa, colle: colle && k === 0 }));
  };
  // ⚠️ `==mots==` AVANT `=mots=` dans l'alternance : dans l'autre ordre, la
  // première branche mange le `=` intérieur et laisse deux `=` en texte brut.
  const re = /\*([^*\n]+)\*|==([^=\n]+)==|=([^=\n]+)=/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) pousser(s.slice(last, m.index), false, false);
    if (m[1] != null) pousser(m[1], true, false);
    else if (m[2] != null) pousser(m[2], false, false, true);
    else pousser(m[3], false, true);
    last = m.index + m[0].length;
  }
  if (last < s.length) pousser(s.slice(last), false, false);
  return out;
}
const texteDe = (mots) => mots.map((m, i) => (i && !m.colle ? ' ' : '') + m.t).join('');

export function clarteDuBas(ctx, y0, hauteur) {
  const haut = Math.max(0, Math.round(y0 ?? H * 0.62));
  const h = Math.min(H - haut, Math.round(hauteur ?? H * 0.30));
  if (h <= 0) return 0.5;
  const d = ctx.getImageData(0, haut, W, h).data;
  let somme = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 23) { somme += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114); n++; }
  return somme / n / 255;
}

// Habillage sur des MOTS (objets), pas sur une chaîne : les marques suivent
// chaque mot jusqu'au dessin.
function wrap(ctx, mots, maxW, size) {
  ctx.font = `${size}px "${SERIF}"`;
  const lignes = []; let cur = [];
  for (const m of mots) {
    const test = [...cur, m];
    if (ctx.measureText(texteDe(test)).width <= maxW || !cur.length) cur = test;
    else { lignes.push(cur); cur = [m]; }
  }
  if (cur.length) lignes.push(cur);
  // orpheline de ponctuation : « ... qui manquent \n ? »
  if (lignes.length > 1 && lignes[lignes.length - 1].length === 1 && /^[?!.…»;:]+$/.test(lignes[lignes.length - 1][0].t)) {
    lignes[lignes.length - 2].push(...lignes.pop());
  }
  // dernier mot seul : on redescend un mot pour equilibrer les deux dernieres lignes
  for (let garde = 0; garde < 3; garde++) {
    const n = lignes.length;
    if (n < 2) break;
    const derniere = lignes[n - 1];
    if (ctx.measureText(texteDe(derniere)).width > maxW * 0.42) break;
    if (lignes[n - 2].length < 2) break;
    const report = lignes[n - 2][lignes[n - 2].length - 1];
    if (ctx.measureText(texteDe([report, ...derniere])).width > maxW) break;
    lignes[n - 2].pop();
    lignes[n - 1] = [report, ...derniere];
  }
  return lignes;
}

// `taille` (0,6 → 1,6, défaut 1) : réglage de la rédaction depuis le hub. Il
// déplace les bornes du corps ; au-dessus de 1, on tolère une ligne de plus.
function fitTitle(ctx, text, maxW, maxLignes = 3, hi = 82, lo = 52, taille = 1) {
  const mots = parseMarqueurs(text);
  const k = Math.min(1.6, Math.max(0.6, Number(taille) || 1));
  const H1 = Math.round(hi * k), L1 = Math.round(lo * k), max = k > 1 ? maxLignes + 1 : maxLignes;
  for (let s = H1; s >= L1; s -= 2) {
    const l = wrap(ctx, mots, maxW, s);
    if (l.length <= max) return { size: s, lignes: l };
  }
  return { size: L1, lignes: wrap(ctx, mots, maxW, L1).slice(0, max) };
}

// Super-ellipse rouge « au feutre », derrière un passage : flancs redressés
// (exposant 2,6), bornée à la boîte de sa ligne · même geste que sur les
// covers LinkedIn.
// L'ovale « tracé à la main » : une superellipse (n = 2,6) légèrement inclinée.
// Partagée par le contour au feutre (=mots=) et la pastille pleine (==mots==),
// pour que les deux marques aient exactement la même forme.
function ovale(ctx, cx, cy, rx, ry, kx = 0, ky = 0, de = 0, a = Math.PI * 2) {
  const n = 2.6, tilt = -0.03, cos = Math.cos(tilt), sin = Math.sin(tilt);
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const t = de + (a - de) * (i / 200), ct = Math.cos(t), st = Math.sin(t);
    const px = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n) * (rx + kx);
    const py = Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * (ry + ky);
    const X = cx + px * cos - py * sin, Y = cy + px * sin + py * cos;
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
}

// `==mots==` (17/09/2026, demande user) : le même ovale, rempli de rouge · le
// texte reste blanc par-dessus, comme sur le surlignage.
function pastille(ctx, x, baseline, w, size) {
  const haut = baseline - size * 0.86, bas = baseline + size * 0.28;
  const cy = (haut + bas) / 2, ry = (bas - haut) / 2, cx = x + w / 2, rx = w / 2 + size * 0.20;
  ctx.save();
  // une ombre courte décolle la pastille de la photo, sans la faire flotter
  ctx.shadowColor = 'rgba(0,0,0,0.30)'; ctx.shadowBlur = Math.round(size * 0.22); ctx.shadowOffsetY = Math.round(size * 0.04);
  ovale(ctx, cx, cy, rx, ry);
  ctx.closePath();
  ctx.fillStyle = ROUGE;
  ctx.fill();
  ctx.restore();
}

function cercle(ctx, x, baseline, w, size) {
  const lw = Math.max(3, Math.round(size * 0.07));
  const haut = baseline - size * 0.80 + lw / 2, bas = baseline + size * 0.22 - lw / 2;
  const cy = (haut + bas) / 2, ry = (bas - haut) / 2, cx = x + w / 2, rx = w / 2 + size * 0.13;
  const trace = (kx, ky, de, a) => { ovale(ctx, cx, cy, rx, ry, kx, ky, de, a); ctx.stroke(); };
  ctx.save();
  ctx.strokeStyle = ROUGE; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = lw; trace(0, 0, Math.PI * 0.62, Math.PI * 0.62 + Math.PI * 2.04);
  ctx.lineWidth = Math.max(2, Math.round(lw * 0.5)); ctx.globalAlpha = 0.65;
  trace(-size * 0.02, -size * 0.03, Math.PI * 0.2, Math.PI * 0.95);
  ctx.restore();
}

// Dessine des lignes de MOTS centrées : d'abord les fonds (surlignage, cercle),
// puis le texte, blanc partout. Plus de voile sombre derrière le texte
// (demande user 09/09/2026) : seuls une ombre portée et, sur une photo très
// claire, un fin filet sombre assurent la lecture.
function ecrireLignes(ctx, lignes, cx, haut, lh, clarte, size) {
  ctx.font = `${size}px "${SERIF}"`;
  ctx.textAlign = 'left';
  const esp = ctx.measureText(' ').width;
  const passes = lignes.map((mots, i) => {
    const y = haut + i * lh;
    const total = ctx.measureText(texteDe(mots)).width;
    let x = cx - total / 2;
    const runs = [];
    mots.forEach((m, k) => {
      if (k && m.colle) x -= esp;                 // ponctuation collée : on reprend l'espace
      const w = ctx.measureText(m.t).width;
      const genre = m.hl ? 'hl' : m.pa ? 'pa' : m.ci ? 'ci' : null;
      const dernier = runs[runs.length - 1];
      if (genre && dernier && dernier.genre === genre && Math.abs(dernier.fin - (x - esp)) < 0.5) dernier.fin = x + w;
      else if (genre) runs.push({ genre, debut: x, fin: x + w });
      x += w + esp;
    });
    return { y, total, runs };
  });
  // 1) fonds
  for (const p of passes) for (const r of p.runs) {
    if (r.genre === 'hl') {
      const padX = Math.round(size * 0.08);
      ctx.fillStyle = ROUGE;
      ctx.fillRect(r.debut - padX, p.y - size * 0.78, r.fin - r.debut + padX * 2, size * 1.0);
    } else if (r.genre === 'pa') pastille(ctx, r.debut, p.y, r.fin - r.debut, size);
    else cercle(ctx, r.debut, p.y, r.fin - r.debut, size);
  }
  // 2) texte
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  const textes = lignes.map(texteDe);
  if (clarte > 0.62) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.30)';
    ctx.lineWidth = Math.max(3, Math.round(size * 0.05));
    ctx.lineJoin = 'round';
    textes.forEach((t, i) => ctx.strokeText(t, cx, passes[i].y));
    ctx.restore();
  }
  const n = clarte > 0.5 ? 2 : 1;
  for (let k = 0; k < n; k++) { ombreTexte(ctx, clarte > 0.5 ? 1.3 : 1); textes.forEach((t, i) => ctx.fillText(t, cx, passes[i].y)); }
  sansOmbre(ctx);
  textes.forEach((t, i) => ctx.fillText(t, cx, passes[i].y));
}

function credit(ctx, texte, taille, alpha, y) {
  y = y < H / 2 ? y + FMT.haut : y - FMT.bas;
  if (!texte) return;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.font = `${taille}px "${SERIF_REG}"`;
  ctx.textAlign = 'left';
  ombreTexte(ctx, 0.5);
  ctx.fillText(`Photo : ${texte}`, 46, y);
  sansOmbre(ctx);
}

// ─── les trois gabarits ─────────────────────────────────────────────────────
// `taille` : facteur de corps choisi dans le hub (défaut 1).
// ─── Lisibilité du texte sur la photo (16/09/2026 soir, retour user) ─────────
// Le style exqz pose le texte à nu sur la photo ; sur un fond clair ou chargé
// (la nef cuivrée de Sous Sous), il ne se lit plus. `lisibilite`, porté par la
// recette, choisit le traitement :
//   'auto'    → un dégradé sombre sous le texte si le bas de la photo est clair
//               (clarté > 0,42), rien sinon · le défaut
//   'degrade' → toujours le dégradé (celui de la V2)
//   'plaque'  → une plaque sombre translucide derrière le bloc (logo compris)
//   'bandeau' → la photo en haut, le texte dans un bandeau plein en bas
//   'ombre'   → juste un peu de sombre derrière le texte : un halo doux, sans bord
//   'aucune'  → le rendu exqz d'origine
export const LISIBILITES = ['auto', 'degrade', 'plaque', 'bandeau', 'ombre', 'aucune'];
function modeLisibilite(lisibilite, clarte) {
  const m = LISIBILITES.includes(lisibilite) ? lisibilite : 'auto';
  return m === 'auto' ? (clarte > 0.42 ? 'degrade' : 'aucune') : m;
}
// `bloc` = { haut, bas, gauche, droite } : la zone couverte par le logo et le texte
function traiterFond(ctx, mode, bloc) {
  if (mode === 'degrade') degradeBas(ctx, Math.max(0, bloc.haut - 200), 0.80);
  else if (mode === 'plaque') {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.beginPath();
    ctx.roundRect(bloc.gauche, bloc.haut, bloc.droite - bloc.gauche, bloc.bas - bloc.haut, 26);
    ctx.fill();
    ctx.restore();
  } else if (mode === 'ombre') {
    // un halo sombre aux bords fondus : trois passes d'un rectangle très flou,
    // rien de net, juste assez pour poser le texte
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.62)';
    ctx.shadowBlur = 110;
    ctx.fillStyle = 'rgba(0,0,0,0.001)';
    const m = 40;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.roundRect(bloc.gauche + m, bloc.haut + m, bloc.droite - bloc.gauche - 2 * m, bloc.bas - bloc.haut - 2 * m, 40);
      ctx.fill();
    }
    ctx.restore();
  }
}
const largeurLignes = (ctx, lignes, size) => { ctx.font = `${size}px "${SERIF}"`; return Math.max(...lignes.map(l => ctx.measureText(texteDe(l)).width)); };
// Bandeau plein : la photo occupe le haut, le texte (et le logo) un bandeau INK en bas.
function dessinerEnBandeau(ctx, { img, logo, texte, credit: cr, taille, hi, lo, maxLignes, logoLarge, echo = 0 }) {
  if (!CALQUE) { ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H); }
  const { size, lignes } = fitTitle(ctx, texte, largeurTexte(), maxLignes, hi, lo, taille);
  const lh = Math.round(size * 1.17);
  const hLogo = logo ? Math.round(logo.height * logoLarge / logo.width) : 0;
  const bande = 56 + hLogo + 30 + size + (lignes.length - 1) * lh + 64;
  const hPhoto = H - bande - FMT.bas;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hPhoto); ctx.clip();
  if (!CALQUE) coverDraw(ctx, img, W, hPhoto);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 19, 0.78, 60);
  ctx.fillStyle = INK; ctx.fillRect(0, hPhoto, W, bande);
  marque(ctx, logo, hPhoto + 56, logoLarge, echo);
  const haut = hPhoto + 56 + hLogo + 30 + size;
  ecrireLignes(ctx, lignes, W / 2, haut, lh, 0.1, size);
}

export function dessinerCouverture(ctx, { img, logo, titre, credit: cr, taille = 1, lisibilite = 'auto', index = 0 }) {
  if (lisibilite === 'bandeau') return dessinerEnBandeau(ctx, { img, logo, texte: titre, credit: cr, taille, hi: 74, lo: 46, maxLignes: 3, logoLarge: LOGO_LARGE_SUITE, echo: echoDe(index) });
  fond(ctx, img);
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 20, 0.80, 62);
  const { size, lignes } = fitTitle(ctx, titre, largeurTexte(2 * FMT.droite), 3, 82, 52, taille);
  const lh = Math.round(size * 1.17);
  const bas = H - FOND_TEXTE - FMT.bas;
  const haut = bas - (lignes.length - 1) * lh;
  let clarte = clarteDuBas(ctx, haut - size, (lignes.length - 1) * lh + size * 1.4);
  const hLogo = logo ? Math.round(logo.height * LOGO_LARGE_COUV / logo.width) : 0;
  const mode = modeLisibilite(lisibilite, clarte);
  if (mode !== 'aucune') {
    const demi = largeurLignes(ctx, lignes, size) / 2 + 40;
    traiterFond(ctx, mode, { haut: haut - size - 30 - hLogo - 26, bas: haut + (lignes.length - 1) * lh + size * 0.34 + 26, gauche: Math.max(30, W / 2 - demi), droite: Math.min(W - 30, W / 2 + demi) });
    clarte = 0.2;
  }
  marque(ctx, logo, haut - size - 30 - LOGO_LARGE_COUV, LOGO_LARGE_COUV, echoDe(index));
  ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte, size);
}

export function dessinerPhoto(ctx, { img, logo, legende, credit: cr, taille = 1, lisibilite = 'auto', index = 0 }) {
  if (lisibilite === 'bandeau' && String(legende || '').trim()) { dessinerEnBandeau(ctx, { img, logo, texte: legende, credit: cr, taille, hi: 46, lo: 32, maxLignes: 3, logoLarge: LOGO_LARGE_SUITE, echo: echoDe(index) }); return { legendeRetiree: false }; }
  fond(ctx, img);
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 19, 0.78, 60);
  let leg = legende;
  // ⚠️ Seuil volontairement haut : a 0,72 il retirait la legende qui NOMMAIT
  // l'Hotel Martinez, et le visuel devenait muet. Une legende qui porte
  // l'information vaut mieux qu'un peu de contraste en moins. Avec un
  // traitement de fond (16/09), on ne retire plus rien.
  if (leg && lisibilite === 'aucune' && clarteDuBas(ctx, H * 0.70, H * 0.22) > 0.82) leg = '';
  if (leg) {
    const { size, lignes } = fitTitle(ctx, leg, largeurTexte(2 * FMT.droite), 3, 62, 42, taille);
    const lh = Math.round(size * 1.25);
    const haut = H - FOND_TEXTE - FMT.bas - (lignes.length - 1) * lh;
    let clarte = clarteDuBas(ctx, haut - size, (lignes.length - 1) * lh + size * 1.4);
    const mode = modeLisibilite(lisibilite, clarte);
    if (mode !== 'aucune') {
      const demi = largeurLignes(ctx, lignes, size) / 2 + 36;
      traiterFond(ctx, mode, { haut: haut - size - 24, bas: H - 40 - FMT.bas, gauche: Math.max(30, W / 2 - demi), droite: Math.min(W - 30, W / 2 + demi) });
      clarte = 0.2;
    }
    ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte, size);
  }
  signer(ctx, logo, echoDe(index));
  return { legendeRetiree: Boolean(legende) && !leg };
}

export function dessinerChute(ctx, { img, logo, texte, credit: cr, taille = 1, lisibilite = 'auto', index = 0 }) {
  const t = String(texte || CTA_DEFAUT).trim() || CTA_DEFAUT;
  if (lisibilite === 'bandeau') return dessinerEnBandeau(ctx, { img, logo, texte: t, credit: cr, taille, hi: 54, lo: 38, maxLignes: 3, logoLarge: LOGO_LARGE_COUV, echo: echoDe(index) });
  fond(ctx, img);
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 19, 0.78, 60);
  const { size, lignes } = fitTitle(ctx, t, largeurTexte(), 3, 54, 38, taille);
  const lh = Math.round(size * 1.24);
  const hBloc = LOGO_LARGE_COUV + 30 + size + (lignes.length - 1) * lh;
  const haut = Math.round((H - hBloc) / 2) + LOGO_LARGE_COUV + 30 + size;
  let clarte = clarteDuBas(ctx, haut - size - LOGO_LARGE_COUV - 30, hBloc + size * 0.4);
  const mode = modeLisibilite(lisibilite, clarte);
  if (mode !== 'aucune') {
    // au milieu de l'image, un dégradé bas ne couvrirait pas le texte : on voile toute la photo
    if (mode === 'degrade') { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H); }
    else { const demi = largeurLignes(ctx, lignes, size) / 2 + 44; traiterFond(ctx, mode, { haut: haut - size - 30 - LOGO_LARGE_COUV - 30, bas: haut + (lignes.length - 1) * lh + size * 0.34 + 30, gauche: Math.max(30, W / 2 - demi), droite: Math.min(W - 30, W / 2 + demi) }); }
    clarte = 0.2;
  }
  marque(ctx, logo, haut - size - 30 - LOGO_LARGE_COUV, LOGO_LARGE_COUV, echoDe(index));
  ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte, size);
}

// ─── Version 2 (16/09/2026, demande user : « une V2 qu'on choisit à la génération ») ─
// Même grammaire (photo plein cadre 4:5, serif Playfair, marque LRDH), mais ce que
// le diagnostic du 16/09 reprochait à la V1 est corrigé :
//  · un dégradé sombre sous le texte sur CHAQUE visuel : lisible sur mobile, sans
//    dépendre de la clarté de la photo ni retirer de légende ;
//  · la marque à la MÊME place partout, en haut au centre ;
//  · titre et légendes alignés à GAUCHE, un surtitre en capitales espacées
//    (rubrique · lieu) sous un filet rouge maison sur la couverture ;
//  · un compteur « 2/8 » en bas à droite, qui dit qu'il y a une suite ;
//  · une chute qui sert à quelque chose : la promesse du média, un bouton
//    « + Suis @larevuedeshotels », puis l'appel à la bio en petit.
// Le choix se porte dans la recette (`variante: 'v2'`) : le hub re-rend à l'identique.
export const V2 = { MARGE: 72, LOGO: 62, HANDLE: '@larevuedeshotels', PROMESSE: 'Pour ne rater aucune news sur les hôtels' };

function degradeBas(ctx, depuis, alpha = 0.78) {
  const g = ctx.createLinearGradient(0, depuis, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, `rgba(0,0,0,${(alpha * 0.62).toFixed(3)})`);
  g.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, depuis, W, H - depuis);
}
function marqueHautV2(ctx, logo, index = 0) { return marque(ctx, logo, 52 + FMT.haut, V2.LOGO, echoDe(index)); }
function compteurV2(ctx, index, total) {
  if (!index || !total) return;
  ctx.save();
  ctx.font = `26px "${SERIF_REG}"`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ombreTexte(ctx, 0.6);
  ctx.fillText(`${index}/${total}`, W - V2.MARGE - FMT.droite, H - 62 - FMT.bas);
  ctx.restore();
  sansOmbre(ctx);
}
// capitales espacées, dessinées lettre à lettre (pas de letterSpacing canvas à espérer partout)
function capsEspacees(ctx, texte, x, y, size, tracking, alpha = 0.92) {
  ctx.save();
  ctx.font = `${size}px "${SERIF_REG}"`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ombreTexte(ctx, 0.6);
  let cx = x;
  for (const ch of String(texte).toUpperCase()) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + tracking; }
  ctx.restore();
  sansOmbre(ctx);
  return cx - tracking - x;
}
// lignes de MOTS alignées à gauche : ecrireLignes (centrée) ligne par ligne, chaque ligne
// centrée sur sa propre largeur · les marqueurs *mots* et =mots= restent actifs.
function ecrireLignesGauche(ctx, lignes, x, haut, lh, clarte, size) {
  ctx.font = `${size}px "${SERIF}"`;
  lignes.forEach((mots, i) => {
    const w = ctx.measureText(texteDe(mots)).width;
    ecrireLignes(ctx, [mots], x + w / 2, haut + i * lh, lh, clarte, size);
  });
}

// En V2 le dégradé fait partie du gabarit : 'auto' et 'degrade' le gardent,
// 'aucune' l'enlève, 'ombre' et 'plaque' le remplacent par un fond posé sur le
// seul bloc de texte (aligné à gauche), 'bandeau' bascule sur le bandeau plein.
function modeV2(lisibilite) {
  const m = LISIBILITES.includes(lisibilite) ? lisibilite : 'auto';
  return m === 'auto' ? 'degrade' : m;
}
export function dessinerCouvertureV2(ctx, { img, logo, titre, credit: cr, kicker = '', taille = 1, index = 1, total = 0, lisibilite = 'auto' }) {
  if (lisibilite === 'bandeau') { dessinerEnBandeau(ctx, { img, logo, texte: titre, credit: cr, taille, hi: 74, lo: 46, maxLignes: 3, logoLarge: LOGO_LARGE_COUV, echo: echoDe(index) }); compteurV2(ctx, index, total); return; }
  const mode = modeV2(lisibilite);
  fond(ctx, img);
  ctx.textBaseline = 'alphabetic';
  if (mode === 'degrade') degradeBas(ctx, Math.round(H * 0.40), 0.84);
  marqueHautV2(ctx, logo, index);
  credit(ctx, cr, 19, 0.70, H - 38);
  // 3 lignes au plus : à 4 lignes de 92 px, l'habillage laissait des lignes courtes au milieu
  // (« 84 / villas sur / pilotis en 2027 ? » sur le premier rendu réel du 16/09).
  const { size, lignes } = fitTitle(ctx, titre, W - 2 * V2.MARGE - FMT.droite, 3, 84, 50, taille);
  const lh = Math.round(size * 1.10);
  const bas = H - 172 - FMT.bas;
  const haut = bas - (lignes.length - 1) * lh;
  const yK = haut - size - 30;
  if (mode === 'ombre' || mode === 'plaque') {
    const large = largeurLignes(ctx, lignes, size);
    traiterFond(ctx, mode, { haut: yK - 44 - 34, bas: bas + Math.round(size * 0.34) + 30, gauche: V2.MARGE - 36, droite: Math.min(W - 24, V2.MARGE + large + 36) });
  }
  ecrireLignesGauche(ctx, lignes, V2.MARGE, haut, lh, 0.2, size);
  ctx.fillStyle = ROUGE; ctx.fillRect(V2.MARGE, yK - 44, 46, 5);
  if (kicker) capsEspacees(ctx, kicker, V2.MARGE, yK, 22, 4.5);
  compteurV2(ctx, index, total);
}

export function dessinerPhotoV2(ctx, { img, logo, legende, credit: cr, taille = 1, index = 0, total = 0, lisibilite = 'auto' }) {
  const leg = String(legende || '').trim();
  if (lisibilite === 'bandeau' && leg) {
    dessinerEnBandeau(ctx, { img, logo, texte: leg, credit: cr, taille, hi: 46, lo: 32, maxLignes: 3, logoLarge: V2.LOGO, echo: echoDe(index) });
    compteurV2(ctx, index, total);
    return { legendeRetiree: false };
  }
  const mode = modeV2(lisibilite);
  fond(ctx, img);
  ctx.textBaseline = 'alphabetic';
  if (mode === 'degrade') degradeBas(ctx, Math.round(H * (leg ? 0.52 : 0.74)), leg ? 0.80 : 0.45);
  marqueHautV2(ctx, logo, index);
  credit(ctx, cr, 19, 0.70, H - 38);
  if (leg) {
    const { size, lignes } = fitTitle(ctx, leg, W - 2 * V2.MARGE - FMT.droite, 3, 52, 36, taille);
    const lh = Math.round(size * 1.18);
    const haut = H - 150 - FMT.bas - (lignes.length - 1) * lh;
    if (mode === 'ombre' || mode === 'plaque') {
      const large = largeurLignes(ctx, lignes, size);
      traiterFond(ctx, mode, { haut: haut - size - 30, bas: H - 150 - FMT.bas + Math.round(size * 0.34) + 28, gauche: V2.MARGE - 36, droite: Math.min(W - 24, V2.MARGE + large + 36) });
    }
    ecrireLignesGauche(ctx, lignes, V2.MARGE, haut, lh, 0.2, size);
  }
  compteurV2(ctx, index, total);
  return { legendeRetiree: false };
}

export function dessinerChuteV2(ctx, { img, logo, texte, credit: cr, taille = 1, index = 0, total = 0 }) {
  fond(ctx, img);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fillRect(0, 0, W, H);
  degradeBas(ctx, Math.round(H * 0.5), 0.5);
  credit(ctx, cr, 19, 0.6, H - 38);
  const yLogo = Math.round(H * 0.24);
  const hl = marque(ctx, logo, yLogo, 120, echoDe(index));
  const { size, lignes } = fitTitle(ctx, V2.PROMESSE, W - 2 * V2.MARGE - 40, 3, 64, 44, taille);
  const lh = Math.round(size * 1.12);
  let y = yLogo + hl + 64 + size;
  ecrireLignes(ctx, lignes, W / 2, y, lh, 0.2, size);
  y += (lignes.length - 1) * lh;
  // le bouton « Suivre » de la plateforme, tel que l'abonné le connaît (17/09/2026)
  const finBouton = FMT === FORMATS.tiktok ? suivreTikTok(ctx, logo, y + 58) : suivreInstagram(ctx, y + 58);
  // l'appel à la bio, en petit
  const t = String(texte || CTA_DEFAUT).trim() || CTA_DEFAUT;
  const petit = fitTitle(ctx, t, W - 2 * V2.MARGE, 2, 32, 26, 1);
  const lhp = Math.round(petit.size * 1.25);
  ctx.globalAlpha = 0.9;
  ecrireLignes(ctx, petit.lignes, W / 2, finBouton + 74 + petit.size, lhp, 0.2, petit.size);
  ctx.globalAlpha = 1;
  compteurV2(ctx, index, total);
}

// Le bouton « Suivre » d'Instagram (bleu, sans, coins arrondis), précédé du pseudo.
// Renvoie le bas du bloc.
function suivreInstagram(ctx, y) {
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `34px "${SERIF_REG}"`; ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ombreTexte(ctx, 0.6);
  ctx.fillText(COMPTES.instagram, W / 2, y + 34);
  ctx.restore(); sansOmbre(ctx);
  const w = 400, h = 96, x = (W - w) / 2, yb = y + 34 + 28;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  ctx.beginPath(); ctx.roundRect(x, yb, w, h, 26); ctx.fillStyle = '#4b5df5'; ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 40px "${SANS}", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText('Suivre', W / 2, yb + h / 2 + 2);
  ctx.textBaseline = 'alphabetic';
  return yb + h;
}

// Le suivi de TikTok : l'avatar rond cerclé de blanc, la pastille rouge « + »
// en dessous, puis le pseudo. Renvoie le bas du bloc.
function suivreTikTok(ctx, logo, y) {
  const d = 200, cx = W / 2, cy = y + d / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  ctx.beginPath(); ctx.arc(cx, cy, d / 2 + 5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = INK; ctx.fillRect(cx - d / 2, cy - d / 2, d, d);
  if (logo) ctx.drawImage(logo, cx - d / 2, cy - d / 2, d, d);
  ctx.restore();
  const r = 32, py = cy + d / 2;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, py, r + 4, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, py, r, 0, Math.PI * 2); ctx.fillStyle = '#fe2c55'; ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 15, py); ctx.lineTo(cx + 15, py); ctx.moveTo(cx, py - 15); ctx.lineTo(cx, py + 15); ctx.stroke();
  ctx.restore();
  const yt = py + r + 4 + 66;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `44px "${SERIF}"`; ctx.fillStyle = '#ffffff';
  ombreTexte(ctx, 0.8);
  ctx.fillText(`Suis ${COMPTES.tiktok}`, cx, yt);
  ctx.restore(); sansOmbre(ctx);
  return yt + 12;
}

// Aiguillage unique, serveur et navigateur : une entrée de recette, une image et
// un logo déjà chargés → le bon gabarit, dans la bonne variante.
export function dessiner(ctx, item, extra = {}) {
  // `extra.calque` : calque transparent pour une vidéo (pas de fond, pas de photo).
  // On n'y mesure pas la clarté d'une image absente : 'auto' devient 'degrade'.
  CALQUE = Boolean(extra.calque);
  const f = FORMATS[item.plateforme || extra.plateforme] || FORMATS.instagram;
  W = f.W; H = f.H; FMT = f;
  try {
    const v2 = (item.variante || extra.variante) === 'v2';
    let lisibilite = item.lisibilite ?? extra.lisibilite ?? 'auto';
    if (CALQUE && lisibilite === 'auto') lisibilite = 'degrade';
    const base = { img: extra.img, logo: extra.logo, credit: item.credit, taille: item.taille ?? extra.taille ?? 1,
                   index: item.index ?? extra.index ?? 0, total: item.total ?? extra.total ?? 0, lisibilite };
    if (item.type === 'couverture') return v2
      ? dessinerCouvertureV2(ctx, { ...base, titre: item.texte, kicker: item.kicker || extra.kicker || '' })
      : dessinerCouverture(ctx, { ...base, titre: item.texte });
    if (item.type === 'chute') return v2
      ? dessinerChuteV2(ctx, { ...base, texte: item.texte })
      : dessinerChute(ctx, { ...base, texte: item.texte });
    return v2 ? dessinerPhotoV2(ctx, { ...base, legende: item.texte }) : dessinerPhoto(ctx, { ...base, legende: item.texte });
  } finally { CALQUE = false; W = FORMATS.instagram.W; H = FORMATS.instagram.H; FMT = FORMATS.instagram; }
}

export default { dessinerCouverture, dessinerPhoto, dessinerChute, dessinerCouvertureV2, dessinerPhotoV2, dessinerChuteV2, dessiner, clarteDuBas, parseMarqueurs, dimensions, FORMATS, SANS, COMPTES, W, H, CTA_DEFAUT, V2, LISIBILITES, ECHO_MAX };
