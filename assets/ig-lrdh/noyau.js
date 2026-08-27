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

export const W = 1080;
export const H = 1350;                  // 4:5, le plus haut format tolere par Instagram
export const LARGEUR_MINI = 900;        // en deca, l'image serait etiree
export const INK = '#0d0d0c';
export const CTA_DEFAUT = "Plus d'infos via le lien dans la bio.";

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
function marque(ctx, logo, y, large) {
  if (!logo) return 0;
  const h = Math.round(logo.height * large / logo.width);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.30)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
  ctx.drawImage(logo, (W - large) / 2, y, large, h);
  ctx.restore();
  return h;
}

function signer(ctx, logo) {
  if (!logo) return;
  const h = Math.round(logo.height * LOGO_LARGE_SUITE / logo.width);
  marque(ctx, logo, H - h - 54, LOGO_LARGE_SUITE);
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
  ctx.shadowColor = `rgba(0,0,0,${Math.min(0.62, 0.5 * force)})`;
  ctx.shadowBlur = 26 * force;
  ctx.shadowOffsetY = 2;
}
function sansOmbre(ctx) { ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'; }

function ecrireLignes(ctx, lignes, cx, haut, lh, clarte) {
  const passes = clarte > 0.62 ? 4 : clarte > 0.48 ? 3 : 2;
  const force = clarte > 0.62 ? 1.5 : 1;
  if (clarte > 0.50) {
    ctx.save();
    ctx.strokeStyle = `rgba(0,0,0,${clarte > 0.68 ? 0.42 : 0.3})`;
    ctx.lineWidth = Math.max(3, Math.round(parseInt(ctx.font, 10) * 0.055));
    ctx.lineJoin = 'round';
    lignes.forEach((l, i) => ctx.strokeText(l, cx, haut + i * lh));
    ctx.restore();
  }
  for (let n = 0; n < passes; n++) {
    ombreTexte(ctx, force);
    lignes.forEach((l, i) => ctx.fillText(l, cx, haut + i * lh));
  }
  sansOmbre(ctx);
  lignes.forEach((l, i) => ctx.fillText(l, cx, haut + i * lh));   // passe nette
}

export function clarteDuBas(ctx, y0, hauteur) {
  const haut = Math.max(0, Math.round(y0 ?? H * 0.62));
  const h = Math.min(H - haut, Math.round(hauteur ?? H * 0.30));
  if (h <= 0) return 0.5;
  const d = ctx.getImageData(0, haut, W, h).data;
  let somme = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 23) { somme += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114); n++; }
  return somme / n / 255;
}

function wrap(ctx, text, maxW, size) {
  ctx.font = `${size}px "${SERIF}"`;
  const mots = String(text).split(/\s+/).filter(Boolean);
  const lignes = []; let cur = '';
  for (const m of mots) {
    const t = cur ? cur + ' ' + m : m;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t;
    else { lignes.push(cur); cur = m; }
  }
  if (cur) lignes.push(cur);
  // orpheline de ponctuation : « ... qui manquent \n ? »
  if (lignes.length > 1 && /^[?!.…»;:]+$/.test(lignes[lignes.length - 1])) {
    lignes[lignes.length - 2] += ' ' + lignes.pop();
  }
  // dernier mot seul : on redescend un mot pour equilibrer les deux dernieres lignes
  for (let garde = 0; garde < 3; garde++) {
    const n = lignes.length;
    if (n < 2) break;
    const derniere = lignes[n - 1];
    if (ctx.measureText(derniere).width > maxW * 0.42) break;
    const mm = lignes[n - 2].split(' ');
    if (mm.length < 2) break;
    const report = mm.pop();
    if (ctx.measureText(report + ' ' + derniere).width > maxW) break;
    lignes[n - 2] = mm.join(' ');
    lignes[n - 1] = report + ' ' + derniere;
  }
  return lignes;
}

function fitTitle(ctx, text, maxW, maxLignes = 3, hi = 82, lo = 52) {
  for (let s = hi; s >= lo; s -= 2) {
    const l = wrap(ctx, text, maxW, s);
    if (l.length <= maxLignes) return { size: s, lignes: l };
  }
  return { size: lo, lignes: wrap(ctx, text, maxW, lo).slice(0, maxLignes) };
}

function credit(ctx, texte, taille, alpha, y) {
  if (!texte) return;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.font = `${taille}px "${SERIF_REG}"`;
  ctx.textAlign = 'left';
  ombreTexte(ctx, 0.5);
  ctx.fillText(`Photo : ${texte}`, 46, y);
  sansOmbre(ctx);
}

// ─── les trois gabarits ─────────────────────────────────────────────────────
export function dessinerCouverture(ctx, { img, logo, titre, credit: cr }) {
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  coverDraw(ctx, img);
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 20, 0.80, 62);
  ctx.textAlign = 'center';
  const { size, lignes } = fitTitle(ctx, titre, W - 132);
  const lh = Math.round(size * 1.17);
  const bas = H - 196;
  const haut = bas - (lignes.length - 1) * lh;
  const clarte = clarteDuBas(ctx, haut - size, (lignes.length - 1) * lh + size * 1.4);
  ctx.fillStyle = '#fff';
  ctx.font = `${size}px "${SERIF}"`;
  marque(ctx, logo, haut - size - 30 - LOGO_LARGE_COUV, LOGO_LARGE_COUV);
  ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte);
}

export function dessinerPhoto(ctx, { img, logo, legende, credit: cr }) {
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  coverDraw(ctx, img);
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 19, 0.78, 60);
  let leg = legende;
  // ⚠️ Seuil volontairement haut : a 0,72 il retirait la legende qui NOMMAIT
  // l'Hotel Martinez, et le visuel devenait muet. Une legende qui porte
  // l'information vaut mieux qu'un peu de contraste en moins.
  if (leg && clarteDuBas(ctx, H * 0.70, H * 0.22) > 0.82) leg = '';
  if (leg) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    const { size, lignes } = fitTitle(ctx, leg, W - 150, 3, 46, 32);
    const lh = Math.round(size * 1.25);
    const haut = H - 172 - (lignes.length - 1) * lh;
    const clarte = clarteDuBas(ctx, haut - size, (lignes.length - 1) * lh + size * 1.4);
    ctx.font = `${size}px "${SERIF}"`;
    ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte);
  }
  signer(ctx, logo);
  return { legendeRetiree: Boolean(legende) && !leg };
}

// Le carton de fin ecrit AU MILIEU de l'image, la ou aucune photo ne garantit
// un fond sombre : sur un ciel de Cappadoce ou une facade monegasque en plein
// soleil, l'ombre portee et le filet ne suffisent pas et l'appel a l'action
// disparait. On pose alors un voile RADIAL, centre sur le bloc de texte et
// fondu sur les bords. Ce n'est pas le bandeau rectangulaire qu'on s'interdit :
// il epouse le texte et laisse la photo respirer partout ailleurs.
function voileRadial(ctx, cx, cy, rayon, force) {
  const g = ctx.createRadialGradient(cx, cy, rayon * 0.18, cx, cy, rayon);
  g.addColorStop(0, `rgba(0,0,0,${force})`);
  g.addColorStop(0.62, `rgba(0,0,0,${force * 0.55})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

export function dessinerChute(ctx, { img, logo, texte, credit: cr }) {
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  coverDraw(ctx, img);
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 19, 0.78, 60);
  const t = String(texte || CTA_DEFAUT).trim() || CTA_DEFAUT;
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  const { size, lignes } = fitTitle(ctx, t, W - 300, 3, 54, 38);
  const lh = Math.round(size * 1.24);
  const hBloc = LOGO_LARGE_COUV + 30 + size + (lignes.length - 1) * lh;
  const haut = Math.round((H - hBloc) / 2) + LOGO_LARGE_COUV + 30 + size;
  const clarte = clarteDuBas(ctx, haut - size - LOGO_LARGE_COUV - 30, hBloc + size * 0.4);
  if (clarte > 0.45) {
    const cy = haut - size / 2 - (hBloc - size - (lignes.length - 1) * lh) / 2 + (lignes.length - 1) * lh / 2;
    voileRadial(ctx, W / 2, cy, W * 0.62, Math.min(0.58, 0.30 + (clarte - 0.45) * 1.1));
  }
  marque(ctx, logo, haut - size - 30 - LOGO_LARGE_COUV, LOGO_LARGE_COUV);
  ctx.font = `${size}px "${SERIF}"`;
  ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte);
}

export default { dessinerCouverture, dessinerPhoto, dessinerChute, clarteDuBas, W, H, CTA_DEFAUT };
