// ─── Editeur de carrousels LRDH · rendu dans le navigateur ──────────────────
//
// Le hub n'affichait que des JPEG deja fabriques : pour changer un mot, il
// fallait relancer le workflow et attendre. Ce module recharge la RECETTE d'un
// carrousel (photo source + texte, par visuel) et re-dessine avec le MEME
// noyau que le serveur, donc au pixel pres.
//
// Trois conditions, toutes remplies par la file depuis la version 1 de la
// recette : les sources sont sur Cloudinary (entetes CORS, sans quoi
// `toBlob` refuserait un canvas contamine), les fontes sont servies par le hub,
// et la marque aussi.
import * as N from './noyau.js';

const CLOUD = 'dghhiz8ou';
const PRESET = 'larevue_articles';
const BASE = './assets/ig-lrdh';

let _pret = null;
export function pret() {
  if (_pret) return _pret;
  _pret = (async () => {
    const fontes = [
      [N.SERIF, `${BASE}/fonts/Newsreader-SemiBold.ttf`],
      [N.SERIF_REG, `${BASE}/fonts/Newsreader-Medium.ttf`],
    ];
    await Promise.all(fontes.map(async ([nom, url]) => {
      const f = new FontFace(nom, `url(${url})`);
      await f.load(); document.fonts.add(f);
    }));
    const logo = await charger(`${BASE}/lrdh-marque.png`);
    return { logo };
  })();
  return _pret;
}

export function charger(url) {
  return new Promise((ok, non) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => non(new Error('image illisible : ' + String(url).slice(0, 70)));
    i.src = url;
  });
}

const CACHE = new Map();
async function source(url) {
  if (!CACHE.has(url)) CACHE.set(url, charger(url));
  return CACHE.get(url);
}

/**
 * Dessine un visuel sur un canvas neuf, a partir d'une entree de recette.
 * @param {{type:string, src:string, texte:string, credit:string}} item
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function rendre(item) {
  const { logo } = await pret();
  const img = await source(item.src);
  const c = document.createElement('canvas');
  c.width = N.W; c.height = N.H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (item.type === 'couverture') N.dessinerCouverture(ctx, { img, logo, titre: item.texte, credit: item.credit });
  else if (item.type === 'chute')  N.dessinerChute(ctx, { img, logo, texte: item.texte, credit: item.credit });
  else                             N.dessinerPhoto(ctx, { img, logo, legende: item.texte, credit: item.credit });
  return c;
}

const blob = (canvas) => new Promise(ok => canvas.toBlob(ok, 'image/jpeg', 0.92));

/**
 * Televerse un visuel re-rendu. On ecrit sous un NOUVEL identifiant horodate
 * plutot que d'ecraser : le preset est non signe, et Cloudinary n'autorise pas
 * l'ecrasement dans ce mode. L'ancienne version reste donc accessible, ce qui
 * est aussi un filet de securite en cas de mauvaise manipulation.
 */
export async function televerser(canvas, publicId) {
  const fd = new FormData();
  fd.append('file', await blob(canvas));
  fd.append('upload_preset', PRESET);
  if (publicId) fd.append('public_id', publicId);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd });
  const j = await r.json();
  if (!j.secure_url) throw new Error('Cloudinary : ' + JSON.stringify(j.error || j).slice(0, 140));
  return j.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
}

/** Rend puis televerse les visuels dont la recette a change. */
export async function publier(recette, postId, surAvancement) {
  const stamp = Date.now().toString(36);
  const urls = [];
  for (let i = 0; i < recette.length; i++) {
    surAvancement?.(i, recette.length);
    const c = await rendre(recette[i]);
    urls.push(await televerser(c, `lrdh_instagram/${postId || 'edit'}-${i + 1}-${stamp}`));
  }
  return urls;
}

export const W = N.W, H = N.H, CTA_DEFAUT = N.CTA_DEFAUT;
export default { pret, rendre, televerser, publier, W, H };
