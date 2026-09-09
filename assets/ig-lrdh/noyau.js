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
  ctx.shadowColor = `rgba(0,0,0,${Math.min(0.55, 0.42 * force)})`;
  ctx.shadowBlur = 22 * force;
  ctx.shadowOffsetY = 2;
}
function sansOmbre(ctx) { ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'; }

// ─── marqueurs dans le texte (09/09/2026, comme sur les covers LinkedIn) ────
//   *mots* → surligné rouge (fond plein, texte blanc)
//   =mots= → encerclé au feutre rouge, tracé DERRIÈRE le texte
// Le texte est découpé en mots porteurs de leurs marques ; l'habillage et le
// centrage se font sur le texte nu, les marques ne changent pas la coupe.
export const ROUGE = '#dc2626';
export function parseMarqueurs(text) {
  const s = String(text || '');
  const out = [];
  // `colle` : le mot se colle au précédent, sans espace · c'est la ponctuation
  // qui suit une marque (« *Sogni*, le » → « Sogni, le », pas « Sogni , le »).
  const pousser = (morceau, hl, ci) => {
    const colle = /^[,.;:!?…»)\]]/.test(morceau) && out.length > 0;
    morceau.split(/\s+/).filter(Boolean).forEach((w, k) => out.push({ t: w, hl, ci, colle: colle && k === 0 }));
  };
  const re = /\*([^*\n]+)\*|=([^=\n]+)=/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) pousser(s.slice(last, m.index), false, false);
    if (m[1] != null) pousser(m[1], true, false); else pousser(m[2], false, true);
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
function cercle(ctx, x, baseline, w, size) {
  const lw = Math.max(3, Math.round(size * 0.07));
  const haut = baseline - size * 0.80 + lw / 2, bas = baseline + size * 0.22 - lw / 2;
  const cy = (haut + bas) / 2, ry = (bas - haut) / 2, cx = x + w / 2, rx = w / 2 + size * 0.13;
  const n = 2.6, tilt = -0.03, cos = Math.cos(tilt), sin = Math.sin(tilt);
  const trace = (kx, ky, de, a) => {
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const t = de + (a - de) * (i / 160), ct = Math.cos(t), st = Math.sin(t);
      const px = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n) * (rx + kx);
      const py = Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * (ry + ky);
      const X = cx + px * cos - py * sin, Y = cy + px * sin + py * cos;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();
  };
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
      const genre = m.hl ? 'hl' : m.ci ? 'ci' : null;
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
    } else cercle(ctx, r.debut, p.y, r.fin - r.debut, size);
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
export function dessinerCouverture(ctx, { img, logo, titre, credit: cr, taille = 1 }) {
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  coverDraw(ctx, img);
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 20, 0.80, 62);
  const { size, lignes } = fitTitle(ctx, titre, W - 132, 3, 82, 52, taille);
  const lh = Math.round(size * 1.17);
  const bas = H - 196;
  const haut = bas - (lignes.length - 1) * lh;
  const clarte = clarteDuBas(ctx, haut - size, (lignes.length - 1) * lh + size * 1.4);
  marque(ctx, logo, haut - size - 30 - LOGO_LARGE_COUV, LOGO_LARGE_COUV);
  ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte, size);
}

export function dessinerPhoto(ctx, { img, logo, legende, credit: cr, taille = 1 }) {
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
    const { size, lignes } = fitTitle(ctx, leg, W - 150, 3, 46, 32, taille);
    const lh = Math.round(size * 1.25);
    const haut = H - 172 - (lignes.length - 1) * lh;
    const clarte = clarteDuBas(ctx, haut - size, (lignes.length - 1) * lh + size * 1.4);
    ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte, size);
  }
  signer(ctx, logo);
  return { legendeRetiree: Boolean(legende) && !leg };
}

export function dessinerChute(ctx, { img, logo, texte, credit: cr, taille = 1 }) {
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  coverDraw(ctx, img);
  ctx.textBaseline = 'alphabetic';
  credit(ctx, cr, 19, 0.78, 60);
  const t = String(texte || CTA_DEFAUT).trim() || CTA_DEFAUT;
  const { size, lignes } = fitTitle(ctx, t, W - 300, 3, 54, 38, taille);
  const lh = Math.round(size * 1.24);
  const hBloc = LOGO_LARGE_COUV + 30 + size + (lignes.length - 1) * lh;
  const haut = Math.round((H - hBloc) / 2) + LOGO_LARGE_COUV + 30 + size;
  const clarte = clarteDuBas(ctx, haut - size - LOGO_LARGE_COUV - 30, hBloc + size * 0.4);
  marque(ctx, logo, haut - size - 30 - LOGO_LARGE_COUV, LOGO_LARGE_COUV);
  ecrireLignes(ctx, lignes, W / 2, haut, lh, clarte, size);
}

export default { dessinerCouverture, dessinerPhoto, dessinerChute, clarteDuBas, parseMarqueurs, W, H, CTA_DEFAUT };
