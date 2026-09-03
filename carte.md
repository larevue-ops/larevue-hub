# Carte du système · La Revue

Où vit quoi. Établi le 3 septembre 2026, en vérifiant chaque ligne plutôt qu'en
la recopiant de mémoire. À corriger dès qu'une information se révèle fausse ·
une carte inexacte coûte plus cher que pas de carte du tout.

## Les cinq médias

| Média | Site | Dépôt qui écrit les articles | Firestore |
|---|---|---|---|
| LRDH · Hôtels | larevuedeshotels.com | `larevue-media/lrdh-auto-scraper` | historique + `larevue-auto-dashboard-2` |
| LRDL · Luxe | larevueduluxe.com | `larevue-wordpress-publisher/larevue-publication-dashboard` | historique |
| LRDR · Restaurants | larevuedesrestaurants.com | `larevue-ops/larevuedesrestaurants-scraper` | historique |
| LRDV · Voyages | larevuedesvoyages.com | `larevue-voyages-scraper` (local) | historique |
| LRA · La Revue | larevue.app | `larevue-news/larevue-auto-scraper` | historique → `larevue-firestore-lra` |

⚠️ Le dossier local et le dépôt distant ne portent pas toujours le même nom.
`~/Documents/lrdh-auto-dashboard` pousse vers `larevue-media/lrdh-auto-scraper`.

## Les réseaux sociaux

Tout passe par **`larevue-media/larevue-social-runner`** · un seul dépôt pour
les cinq médias.

- `publish-social.yml` · enfile ET publie, 28 passages par jour
- `instagram-lrdh.yml` · carrousels
- `miroir-firestore.yml` · recopie vers le projet de secours, 7h15
- `backup.yml` · 7h30 · `cleanup.yml` · dimanche 7h20

Le hub qui pilote tout ça est **`larevue-ops/larevue-hub`**, publié sur GitHub Pages.

## Firestore

| Projet | Nom affiché | Contenu |
|---|---|---|
| `larevue-auto-dashboard` | — | le fourre-tout, 21 collections |
| `larevue-auto-dashboard-2` | LRDH · Firestore | file LinkedIn LRDH + son jeton |
| `larevue-firestore-lra` | La Revue Firestore LRA | en attente de la copie |
| `larevue-firestore-lrdv` | La Revue Firestore LRDV | inutilisé |

⚠️ Quota Spark : **50 000 lectures par jour et par projet**. Épuisé, le
publieur bascule sur le miroir et annonce « 0/0 à publier » · ce n'est pas une
panne, c'est le repli. La ligne à chercher dans les journaux :
`🛟 Quota du projet 1 epuise · lecture sur le projet de secours`

⚠️ L'identifiant d'un projet Google ne se renomme jamais, seul le nom affiché.

## L'exécution

Un **runner auto-hébergé** sur le Mac de la rédaction, étiquettes
`self-hosted, macOS, ARM64, larevue`. Un seul agent en ligne · tous les jobs se
sérialisent.

⚠️ Les crons GitHub ne partent pas de façon fiable · le 3 septembre, aucun des
quatorze créneaux de `publish-social` n'a été honoré. Un filet launchd
(`com.larevue.reveil-crons`) contrôle toutes les quinze minutes et déclenche ce
qui a trop tardé. Il est planifié en `StartCalendarInterval` et non en
`StartInterval`, sans quoi il ne rattrape pas les sommeils du Mac.

## Les pièges qui reviennent

- **Permalink Manager** fige l'URI d'un article à sa création : changer le slug
  ne suffit pas, il faut appeler `/lrdh/v1/set-uri/{id}`.
- **L'og:image ne suit pas la cover** · la poser explicitement via
  `aioseo/v1/post`, sinon le partage social sert la première image du corps.
- **Les sessions Firebase sont par projet** · se connecter à l'un ne connecte
  pas à l'autre, d'où le même mot de passe partout.
- **`posts?lang=`** ne filtre rien sur LRDH : il rend le total du site.
- **Code Snippets** · une erreur PHP fait tomber tout le front en 500. Toujours
  sauvegarder avant, vérifier après, restaurer au moindre doute.
