# Recette CanopyOS V1 — journal par plante

Ce document ne consigne que ce qui a **réellement été exécuté**. Les scénarios non joués sont listés
séparément ; aucun d'eux ne doit être présenté comme validé.

## 1. Exécution de référence

| Élément | Valeur |
|---|---|
| PR | #2 — base `feat/mobile-grow-journal-v1` |
| Commit testé | `0c95a3e` (`feature/canopyos-v1-finalization`) |
| Run Actions | [41797526283](https://github.com/cortexAI-2025/CanopyOS/actions/runs/41797526283) — **5 jobs verts** : `backend`, `migration-upgrade`, `backup-restore`, `e2e-mobile`, `frontend` |
| Runs précédents | [41793058907](https://github.com/cortexAI-2025/CanopyOS/actions/runs/41793058907) (`57febe7`, recette précédente) · [41598906282](https://github.com/cortexAI-2025/CanopyOS/actions/runs/41598906282) (blocage **P3005**) |
| Parcours intermédiaires échoués (pour mémoire) | [41796289344](https://github.com/cortexAI-2025/CanopyOS/actions/runs/41796289344) : étape « configurations de production refusées » en échec à cause du script de test (shell `bash -e`), corrigée ; [41797278129](https://github.com/cortexAI-2025/CanopyOS/actions/runs/41797278129) : `npm ci` refuse volontairement un `package.json` et un lockfile désynchronisés (état intermédiaire du changement de version de Next.js) |
| Environnement | runners GitHub Actions (Node 20), PostgreSQL 15 jetable par job, comptes `@example.test`, secrets générés pour le run |
| Rapport Playwright | artefact `playwright-mobile-report` du run ci-dessus |
| Installations | `npm ci` depuis des lockfiles versionnés (backend, frontend, e2e) |

Aucune base de production, aucun secret de production, aucune migration sur base distante.

## 2. Scénarios joués (CI)

### Migrations

| # | Scénario | Job | Ce qui est vérifié |
|---|---|---|---|
| M1 | Installation neuve | `backend` | Base vide → `prisma migrate deploy` applique `0_init` puis `20261026194500_plant_journal` ; `migrate diff --exit-code` vers `schema.prisma` : *No difference detected* |
| M2 | Second déploiement | `backend` | `migrate deploy` : *No pending migrations to apply* ; `migrate status` : *Database schema is up to date* |
| M3 | Équivalence de la baseline | `migration-upgrade` | Le SQL de `0_init` appliqué sur une base vide est identique à `prisma/baseline.prisma` (*No difference detected*) |
| M4 | Reproduction du blocage | `migration-upgrade` | Base héritée (créée par `db push` du schéma antérieur) + `migrate deploy` sans baseline → **P3005** |
| M5 | Mise à niveau avec données | `migration-upgrade` | Schéma antérieur vérifié identique à `baseline.prisma`, puis `migrate resolve --applied 0_init`, puis `migrate deploy` n'applique que `20261026194500_plant_journal` ; comptages avant/après identiques (2 comptes, 1 variété, 2 projets, 3 entrées `GrowLog`, 1 tâche) ; contenu des `GrowLog` inchangé ; insertion d'une `Plant` et d'un `PlantLog` rattachés à un compte hérité réussie |
| M6 | Pas de dérive après mise à niveau | `migration-upgrade` | `migrate diff --exit-code` vers `schema.prisma` : aucune différence ; second `migrate deploy` : rien en attente |

L'étape de migration reste bloquante en CI (aucun `continue-on-error`).

### API réelle, deux comptes (`backend/test/*.int-spec.ts`, job `backend`, 17 tests)

- Sans jeton : `GET`/`POST /plants` → 401. Jeton signé avec l'ancien secret de repli `fallback-secret` → 401.
- Compte A : création d'une plante COCO (variété libre), entrée de journal avec pH/EC/température/humidité relue depuis la base, photo PNG stockée puis relue octet pour octet (`Cache-Control: private, no-store`).
- Validation : pH hors 0–14, humidité > 100, EC négative, `photoUrl` non HTTPS, champ inconnu → 400 ; fichier texte déguisé en `.png`, SVG, fichier > 5 Mo → refusés, rien n'est stocké.
- Compte B : liste vide ; lecture de la plante, des entrées, des photos de A → 404 ; ajout d'une entrée ou d'une photo sur la plante de A → 404 et aucune ligne créée ; `PATCH`/`PUT`/`DELETE` → 403/404 et plante de A inchangée ; photo de A demandée via une plante de B → refusée ; création d'une plante avec `userId` d'un autre compte → 400.
- Le backend **refuse de démarrer** sans `JWT_SECRET` (processus `node dist/main` : code de sortie 1, message `Configuration key "JWT_SECRET" does not exist`) et avec un `JWT_SECRET` vide (test Jest).

### Parcours mobile (`e2e/tests/mobile-journal.spec.ts`, job `e2e-mobile`, 1 test)

Chromium émulant un Pixel 5 (393 × 727, tactile), backend et frontend réels, base jetable :

1. connexion par l'interface ;
2. état vide, création d'une plante (Intérieur / Coco) ;
3. ajout de 3 entrées avec mesures, affichage du plus récent en premier ;
4. pH hors plage refusé par le formulaire, rien n'est enregistré ;
5. import d'une photo PNG (affichée et décodée), fichier texte refusé avec message d'erreur ;
6. **rechargement** : session, plante, 3 entrées, mesures et photo toujours présentes ;
7. liste des plantes ; absence de défilement horizontal sur les pages de connexion, liste, création et détail ;
8. compte B (contexte de navigateur séparé) : liste vide, page de détail de la plante de A en erreur, aucune donnée de A affichée ; appels directs à l'API avec le jeton de B → 404.

### Ajouts de cette recette (préproduction) — tous exécutés en CI sur `0c95a3e`

**Tests** : unitaires 45/45 (4 suites) · intégration 38/38 (4 suites, PostgreSQL réel, HTTP réel) · parcours mobile 1/1.

| # | Scénario | Où | Ce qui est vérifié |
|---|---|---|---|
| H1 | Isolation des routes héritées | `legacy-isolation.int-spec.ts` | Routes `/grow-projects`, `/grow-projects/:id/{tasks,logs,nutrients}`, `PATCH /tasks/:id`, `/users/me`, `POST /strains` : 401 sans jeton. Compte B : liste vide, lecture/écriture/suppression du projet de A refusées (403/404), tâche et journaux de A inchangés (relus en base), projet de A toujours lisible par A ; création avec `userId` forgé → 400 ; `/users/me` sans champ mot de passe ; B supprime uniquement son propre projet |
| H2 | CORS par environnement | `security.int-spec.ts` + `config.spec.ts` | Préflight d'une origine listée : origine reflétée (jamais `*`), credentials ; origine non listée : aucun en-tête CORS (préflight et requête simple) ; requêtes sans `Origin` servies ; `X-Powered-By` absent ; `*`, jokers, chemin, `/` final, schémas non http(s) rejetés ; production sans `CORS_ORIGINS` refusée |
| H3 | Limitation de débit | `security.int-spec.ts` | Limite 5 : 5 mauvais mots de passe → 401, 6e et 7e → **429** ; compteur propre à chaque route (l'inscription reste possible) ; l'API du journal n'est pas limitée |
| H4 | Photos | `security.int-spec.ts`, `image-metadata.spec.ts`, `photo-storage.spec.ts` | GPS, commentaires, XMP/IPTC retirés d'un JPEG, orientation conservée ; PNG/WebP : chunks de métadonnées retirés, RIFF recalculé ; fichier corrompu → 400 sans stockage ; fichier disparu du disque → 404 ; photo inconnue → 404 ; plafond par plante → 400 ; dossier absolu obligatoire en production |
| H5 | Configuration de production | job `backend` | Démarrage réel (`node dist/main`) avec `NODE_ENV=production`, `CORS_ORIGINS`, secret de 64 caractères hexadécimaux, `CANOPYOS_UPLOAD_DIR` : répond 401 sans jeton, origine listée acceptée, origine inconnue sans en-tête CORS. Six configurations dangereuses **refusées avec code 1 et le bon motif** : `CORS_ORIGINS` absent, `CORS_ORIGINS=*`, dossier de photos absent, dossier relatif, secret d'exemple, secret trop court |
| H6 | Sauvegarde / restauration | job `backup-restore` (`scripts/test-backup-restore.sh`) | Client `pg_dump`/`pg_restore` 16.15, serveur 15.19. Dump au format custom ; table de matières lisible ; restauration dans une base neuve : comptages et empreinte md5 de chaque table **identiques**, schéma identique à `schema.prisma`, aucune migration en attente, écriture possible. Retour arrière : sauvegarde de la base héritée → mise à niveau → restauration dans une base neuve = **état d'avant identique** (pas de tables `Plant*`, pas d'historique) → nouvelle mise à niveau réussie, données héritées intactes |
| H7 | Contrôle d'une copie de production (lecture seule) | job `migration-upgrade` (`scripts/preflight-copy.sh`) | Refus sans confirmation (code 64) ; refus d'un hôte interdit (64) ; base héritée reconnue « prête pour la baseline » ; base inspectée **non modifiée** (liste des tables identique avant/après, aucune table d'historique créée ; session forcée en lecture seule) ; copie modifiée à la main (colonne ajoutée) rejetée (code 2, colonne citée dans le diff) |
| H8 | Parcours mobile après changement de page d'arrivée | job `e2e-mobile` | Connexion → arrivée sur `/plants` (désormais atteignable depuis l'interface : redirections de connexion/inscription/accueil et lien « Mes plantes ») ; reste du parcours inchangé |

Vérifications faites pendant le développement, **hors CI** (non reproductibles par le lecteur sans les mêmes outils) :
les fonctions de suppression des métadonnées ont été appliquées à de vraies images JPEG/PNG/WebP produites par Chromium, puis décodées de
nouveau par Chromium (dimensions et orientation conservées, aucune chaîne de métadonnées résiduelle) ; les scripts de sauvegarde et de contrôle ont été répétés une
première fois sur un PostgreSQL 16 local avec un substitut de la CLI Prisma. Seuls les résultats de la CI font foi.

### Audit des dépendances (`npm audit --omit=dev`, informatif, non bloquant) — état réel au run `0c95a3e`

| Paquet | Résultat | Détail |
|---|---|---|
| Frontend | 2 vulnérabilités (1 critique, 1 haute) | `next@14.2.35` : la montée depuis 14.2.0 a supprimé, entre autres, le contournement d'autorisation du middleware et plusieurs empoisonnements de cache ; il reste des avis **sans correctif sur la branche 14.x** (correctif en Next 16, changement majeur) : optimiseur d'images, Server Components / Server Actions (DoS), réécritures, middleware/proxy. `postcss` intégré à Next : 4 avis (fichiers `.map`, XSS en sortie CSS) |
| Backend | 16 vulnérabilités (8 modérées, 7 hautes, 1 critique) | `@nestjs/core`, `@nestjs/platform-express`, `multer` (DoS sur l'envoi multipart), `body-parser`, `qs`, `file-type` : correctifs uniquement en NestJS 11/12 (majeur). `lodash` via `@nestjs/config`. `tar` (critique) via `bcrypt` → `@mapbox/node-pre-gyp` : utilisé à l'**installation** du module natif, pas à l'exécution. `npm audit fix` non destructif : aucun correctif applicable |

Ces mises à jour majeures n'ont **pas** été faites ici (risque de régression contre la consigne « conserver les fonctionnalités existantes ») ; elles figurent dans les risques résiduels de `docs/GO-NO-GO-BETA.md`.

## 3. Scénarios non joués

- **Appareil Android réel** : procédure et critères écrits dans `docs/RECETTE-ANDROID.md`, **non exécutés** ; seul un Chromium émulant un Pixel 5 a été utilisé. Firefox, WebKit/iOS, autres tailles d'écran : non joués.
- **Mise à niveau d'une copie réelle de la base de production** : procédure dans `docs/PRODUCTION-COPY-RUNBOOK.md`, contrôle en lecture seule testé sur bases synthétiques ; **aucune donnée réelle n'a été touchée ni consultée**.
- Sauvegarde/restauration sur le serveur PostgreSQL et le volume de photos réels de l'hébergeur : seule une base jetable (PostgreSQL 15 en CI) a été rejouée ; la sauvegarde conjointe base + dossier de photos n'est pas testée.
- Photos de smartphone réelles (> 5 Mo, HEIC, orientations variées) : seules des images synthétiques et un JPEG/PNG/WebP généré par Chromium ont été traités.
- `npm run prisma:seed`, tableau de bord, pages de projets hérités : non exercés. Les routes héritées sont isolées côté API (H1), mais l'interface des projets hérités n'est pas fonctionnelle de bout en bout (voir risques).
- Limitation de débit derrière un vrai reverse proxy (`TRUST_PROXY_HOPS` > 0) : non testée ; plusieurs instances : non testé (compteurs en mémoire).
- Lint frontend (pas de configuration ESLint), tests de charge, test d'intrusion : non exécutés.
- Installation locale hors CI : non rejouée par le lecteur (commandes ci-dessous identiques à celles de la CI).

## 4. Rejouer la recette

Les commandes ci-dessous reprennent celles de la CI. Utiliser une base **de test** ; les tests d'intégration
ne suppriment que leurs deux comptes jetables mais ne doivent jamais viser une base contenant des données réelles.

```bash
docker-compose up -d                         # PostgreSQL (ou toute base de test vide)
cd backend && npm ci
export DATABASE_URL="postgresql://postgres:password@localhost:5432/canopyos"
export JWT_SECRET="test-only-not-production"
npx prisma generate && npx prisma migrate deploy    # M1 ; pour une base existante : docs/MIGRATIONS.md
npm run build && npm run test:ci && npm run test:int
bash ../scripts/test-backup-restore.sh   # avec PG_ADMIN_URL (serveur JETABLE) et CONFIRM_THROWAWAY_SERVER=yes

# Parcours mobile : backend (node dist/main) et frontend (npm run build && npm start) démarrés, puis
cd ../e2e && npm ci && npx playwright install chromium && npx playwright test
```

## 5. Limites connues

La liste complète, hiérarchisée, figure dans `docs/GO-NO-GO-BETA.md` (risques résiduels). Rappel :

- Photos sur disque local (`CANOPYOS_UPLOAD_DIR`, obligatoire et absolu en production) : volume persistant et sauvegarde jointe à celle de la base requis (`docs/PHOTO-STORAGE.md`) ; une seule instance.
- Pas de suppression de photo, pas de redimensionnement (plafond de 5 Mo), pas d'association photo ↔ entrée.
- Aucune modification ni suppression d'entrée ou de plante n'est exposée par l'API.
- Jetons JWT valables 7 jours, sans révocation ; limitation de débit en mémoire, par instance.
- Dépendances : avis connus non corrigés (voir audit ci-dessus).
- Pas de publication ni de fusion avant décision explicite du propriétaire.
