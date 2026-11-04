# Rapport GO / NO-GO — bêta privée CanopyOS V1

**Périmètre** : journal par plante (plantes, entrées de mesures, photos), sur mobile, pour un petit nombre de testeurs invités.
**Base de la décision** : PR #2, commit `0c95a3e`, [run CI 41797526283](https://github.com/cortexAI-2025/CanopyOS/actions/runs/41797526283) (5 jobs verts).
Seuls des résultats réellement exécutés sont comptés ; voir `docs/RECETTE-V1.md` pour le détail et ce qui n'a pas été joué.

## Verdict

> **GO CONDITIONNEL** pour une bêta privée **restreinte** (testeurs nommés, données de culture non critiques, instance unique).
> **NO-GO** pour une ouverture plus large tant que les points « avant ouverture élargie » ci-dessous ne sont pas traités.

« Conditionnel » signifie : les réserves techniques *du code* sont levées et prouvées en CI, mais quatre conditions
d'exploitation et de validation sur appareil **ne peuvent pas être levées depuis la CI** et doivent être remplies avant d'inviter le premier testeur.

## Réserves de la mission précédente : état

| # | Réserve | État | Preuve |
|---|---|---|---|
| 1 | PR et workflows | Vérifiés : PR #2 ouverte sur `feature/canopyos-v1-finalization`, 5 jobs CI verts | run 41797526283 |
| 2 | Isolation des routes héritées | **Levée** côté API | 9 tests (`legacy-isolation.int-spec.ts`) |
| 3 | CORS par environnement | **Levée** | liste d'origines exactes, obligatoire en production, 6 tests + démarrage de production en CI |
| 4 | Limitation de débit d'authentification | **Levée** (limites ci-dessous) | 429 constaté sur la 6e tentative (limite 5) |
| 5 | Stockage des photos | **Levée** pour une instance unique avec volume persistant | dossier absolu obligatoire, métadonnées/GPS supprimées, plafond, 404 propres ; `docs/PHOTO-STORAGE.md` |
| 6 | Lockfile reproductible | **Levée** | `npm ci` partout, lockfiles vérifiés par SHA-256 |
| 7 | `pg_dump` / `pg_restore` | **Levée** sur base jetable | `backup-restore` : contenu identique, retour arrière dans une base neuve |
| 8 | Migration d'une copie de production | **Procédure prête, non jouée sur données réelles** | `docs/PRODUCTION-COPY-RUNBOOK.md`, contrôle en lecture seule testé en CI |
| 9 | Android physique | **Procédure et critères écrits, NON exécutés** | `docs/RECETTE-ANDROID.md` |
| 10 | CI complète | 5/5 verts | run 41797526283 |

## Conditions à remplir AVANT d'inviter le premier testeur (bloquantes)

1. **Exécuter la recette Android sur un téléphone réel** (A1–A6, A8–A11, A13, A14 de `docs/RECETTE-ANDROID.md`) et consigner les résultats. Sans cela, la qualité mobile n'est démontrée que sur un Chromium émulé.
2. **Décider de la limite de 5 Mo** après le test A7 : les clichés récents de smartphone dépassent souvent cette taille et il n'existe pas de redimensionnement côté client. Si la majorité des photos de test sont refusées, c'est un bloquant d'usage à corriger avant la bêta.
3. **Exploiter correctement l'instance** : HTTPS devant le backend et le frontend, `NODE_ENV=production`, `CORS_ORIGINS`, secret `JWT_SECRET` généré (`openssl rand -hex 32`), `TRUST_PROXY_HOPS` renseigné, **volume persistant** pour `CANOPYOS_UPLOAD_DIR`, sauvegarde conjointe base + photos et **test de restauration** réalisé une fois (`docs/CONFIGURATION.md`, `docs/PHOTO-STORAGE.md`). Le backend refuse de démarrer si les éléments obligatoires manquent.
4. **Au niveau du reverse proxy, bloquer `/_next/image`** (l'application n'utilise pas `next/image`) : des avis de sécurité de Next.js 14.x sans correctif visent l'optimiseur d'images. À lever après la montée de version de Next.js.
5. **Si une base de production existante doit être migrée** : exécuter d'abord `docs/PRODUCTION-COPY-RUNBOOK.md` sur une copie, y compris le retour arrière. Pour une instance neuve, `prisma migrate deploy` suffit (prouvé en CI).

## Risques résiduels (hiérarchisés)

### Élevés — à planifier avant toute ouverture élargie

| Risque | Détail | Atténuation actuelle | Action |
|---|---|---|---|
| Dépendance Next.js 14.x | `npm audit` : 1 critique + 1 haute en frontend ; il reste des avis sans correctif sur la branche 14.x (images, Server Components/Actions, réécritures, middleware). L'application n'utilise ni middleware, ni réécritures, ni `next/image`, ni Server Actions, mais utilise l'App Router (Server Components : risque de DoS). | montée à 14.2.35 (a retiré, entre autres, le contournement d'autorisation du middleware) ; blocage de `/_next/image` au proxy | migrer vers Next 15/16 (changement majeur) |
| Dépendances NestJS 10 | 16 avis en backend (dont `multer` : DoS sur l'envoi multipart ; `body-parser`, `qs`, `@nestjs/core`) dont le correctif exige NestJS 11/12. Le `tar` critique vient de `bcrypt` à l'**installation** seulement. | l'envoi de photo exige un jeton valide (garde avant l'intercepteur), 5 Mo max, limitation de débit sur l'authentification ; instance derrière un proxy | migration NestJS 11+, puis remise à zéro de l'audit |
| Photos de smartphone > 5 Mo | pas de redimensionnement côté client | message d'erreur à l'envoi | test A7, puis redimensionnement client si nécessaire |
| Aucune validation sur appareil réel ni sur données de production réelles | voir conditions 1 et 5 | procédures écrites | les exécuter |

### Moyens

| Risque | Détail |
|---|---|
| Limitation de débit en mémoire | compteurs par instance, perdus au redémarrage, non partagés entre instances ; pas de verrouillage par compte ; un attaquant utilisant plusieurs adresses les contourne. Mal configuré derrière un proxy (`TRUST_PROXY_HOPS` = 0), tous les clients partagent un compteur. |
| Jetons JWT de 7 jours sans révocation | un jeton volé reste valable jusqu'à expiration ; pas de déconnexion côté serveur ; jeton conservé dans `localStorage` (exposé à un XSS). |
| Photos locales, une instance | pas de stockage objet ; sauvegarde photos/base à synchroniser à la main ; pas d'antivirus ; pas de chiffrement au repos propre à l'application. |
| `POST /strains` ouvert à tout utilisateur connecté | n'importe quel compte peut ajouter des variétés au catalogue partagé (pas de rôle administrateur). |
| Interface des projets hérités non fonctionnelle de bout en bout | l'API est isolée et testée, mais les pages `/projects` n'ont pas été remises en état ; le lien « Mes plantes » est le point d'entrée V1. |

### Faibles

- Pas de suppression de photo, de plante ou d'entrée ; pas de modification d'entrée ; pas d'association photo ↔ entrée.
- Aucun test de charge, de pénétration, d'accessibilité ou de compatibilité hors Chromium ; pas de lint frontend.
- Pas de PWA ni de mode hors ligne.
- Les métadonnées de photo sont supprimées au conteneur (pixels non ré-encodés) : un contenu visible (visage, lieu reconnaissable) reste dans l'image.

## Ce que ce rapport ne prétend pas

- Aucune exécution sur la production ni sur des données réelles.
- Aucune recette sur appareil Android physique.
- Aucune fusion, aucun déploiement : la décision de fusionner et de mettre en production appartient au propriétaire du produit.
