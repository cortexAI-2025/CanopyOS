# Recette CanopyOS V1 — journal par plante

Ce document ne consigne que ce qui a **réellement été exécuté**. Les scénarios non joués sont listés
séparément ; aucun d'eux ne doit être présenté comme validé.

## 1. Exécution de référence

| Élément | Valeur |
|---|---|
| PR | #2 (brouillon) — base `feat/mobile-grow-journal-v1` |
| Commit testé | `57febe7` (`feature/canopyos-v1-finalization`) |
| Run Actions | [41793058907](https://github.com/cortexAI-2025/CanopyOS/actions/runs/41793058907) — 4 jobs verts |
| Run précédent (blocage) | [41598906282](https://github.com/cortexAI-2025/CanopyOS/actions/runs/41598906282) — `backend` en échec **P3005** |
| Environnement | runners GitHub Actions, PostgreSQL 15 jetable par job, comptes `@example.test`, secret `JWT_SECRET` de test |
| Rapport Playwright | artefact `playwright-mobile-report` du run ci-dessus |

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

## 3. Scénarios non joués

- Appareil Android réel, autres navigateurs (Firefox, WebKit), autres tailles d'écran : seul un Chromium émulé a été utilisé.
- Mise à niveau d'une **copie réelle** de la base existante : seule une base héritée synthétique a été testée. La vérification de l'étape 1 de `docs/MIGRATIONS.md` (diff avec `baseline.prisma`) est la protection si la base réelle diffère.
- Sauvegarde `pg_dump` / restauration `pg_restore` documentées dans `docs/MIGRATIONS.md` : procédure écrite, non rejouée.
- Isolation des routes héritées (`/projects`, tâches, journaux de projet, plans nutritifs) : non couverte par les nouveaux tests.
- `npm run prisma:seed`, tableau de bord, pages héritées : non exercés.
- Installation et exécution locales hors CI : non rejouées (voir §4, commandes identiques à celles de la CI).
- `npm audit`, lint frontend (pas de configuration ESLint), tests de charge : non exécutés.

## 4. Rejouer la recette

Les commandes ci-dessous reprennent celles de la CI. Utiliser une base **de test** ; les tests d'intégration
ne suppriment que leurs deux comptes jetables mais ne doivent jamais viser une base contenant des données réelles.

```bash
docker-compose up -d                         # PostgreSQL (ou toute base de test vide)
cd backend && npm install
export DATABASE_URL="postgresql://postgres:password@localhost:5432/canopyos"
export JWT_SECRET="test-only-not-production"
npx prisma generate && npx prisma migrate deploy    # M1 ; pour une base existante : docs/MIGRATIONS.md
npm run build && npm run test:ci && npm run test:int

# Parcours mobile : backend (node dist/main) et frontend (npm run build && npm start) démarrés, puis
cd ../e2e && npm install && npx playwright install chromium && npx playwright test
```

## 5. Limites connues

- Photos sur disque local privé (`CANOPYOS_UPLOAD_DIR`, `backend/private-uploads` par défaut, ignoré par git) : volume persistant et sauvegarde requis ; incompatible avec des instances sans stockage persistant.
- Les photos forment une galerie distincte des entrées du journal (pas d'association photo ↔ entrée) ; pas de suppression, de miniature ni de rétention. L'URL de photo HTTPS facultative reste disponible dans les entrées.
- Aucune modification ni suppression d'entrée ou de plante n'est exposée par l'API.
- Pas de `package-lock.json` : les dépendances `^` sont résolues à chaque installation, la CI n'est pas reproductible à l'identique.
- Origine CORS codée en dur (`http://localhost:3000`) dans `backend/src/main.ts` ; jeton JWT valable 7 jours ; pas de limitation de débit sur l'authentification.
- `backend/.env.example` contient un `JWT_SECRET` d'exemple : il doit être remplacé, jamais réutilisé.
- Les tests d'intégration et le parcours mobile utilisent un seul scénario nominal par domaine ; ils ne remplacent pas une recette sur appareil réel.
- Pas de publication ni de fusion avant décision explicite.
