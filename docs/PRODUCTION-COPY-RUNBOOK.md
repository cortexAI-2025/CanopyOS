# Migration d'une copie de la base de production — procédure

**Objectif** : prouver, sur une **copie**, que la mise à niveau vers le journal par plante fonctionne avec les
vraies données, avant d'envisager toute opération sur la production.

**Cette procédure n'accède jamais à la production et ne la modifie pas.** Elle part d'une copie que
*l'exploitant* produit lui-même (sauvegarde ou instantané existant). Rien dans ce dépôt ne contient d'identifiant
de production, et rien n'a été exécuté sur des données réelles : seule une base héritée synthétique a été rejouée
en CI (job `migration-upgrade`).

## Règles

1. Travailler uniquement sur une copie, hébergée sur un serveur **distinct** de la production, avec des
   identifiants **distincts**. Idéalement, un rôle en lecture seule pour l'étape 2.
2. Aucune commande de ce document ne reçoit l'URL de production. Si une variable `DATABASE_URL` est déjà définie
   dans le terminal, la vider avant de commencer : `unset DATABASE_URL`.
3. Les données de la copie sont des données personnelles : chiffrer le dump, ne pas le déposer dans le dépôt,
   ni dans la CI, ni dans une conversation ; le supprimer en fin de recette.
4. Ne rien fusionner, ne rien déployer pendant cette recette.

## Étape 0 — Produire la copie (par l'exploitant)

Sauvegarde de production existante, ou instantané du fournisseur, restaurée **dans une base neuve d'un
serveur de test** :

```bash
createdb canopyos_copy
pg_restore --no-owner --no-acl --exit-on-error -d canopyos_copy <votre-sauvegarde.dump>
```

Noter la version du serveur de production ; `pg_dump`/`pg_restore` doivent être de version ≥ à celle du serveur.

## Étape 1 — Contrôle préalable en lecture seule

```bash
export COPY_DATABASE_URL='postgresql://<lecture-seule>@<hôte-de-test>:5432/canopyos_copy'
export CONFIRM_THIS_IS_A_COPY=yes
export FORBIDDEN_HOST_PATTERN='<nom d hôte de production>'   # le script refuse si l'URL le contient
bash scripts/preflight-copy.sh
```

Le script : exige la confirmation explicite, refuse un hôte interdit, force une session **en lecture seule**,
n'affiche jamais l'URL (seulement hôte/base), détecte l'état de la base et compare son schéma à
`backend/prisma/baseline.prisma`.

| Verdict | Code | Signification | Suite |
|---|---|---|---|
| `READY` | 0 | base vide | `prisma migrate deploy` |
| `READY FOR BASELINE` | 0 | schéma antérieur, sans historique Prisma (cas P3005), identique à la baseline | étape 2 |
| `READY (history managed…)` | 0 | historique Prisma présent | `prisma migrate deploy` |
| `SCHEMA DIFFERS` | 2 | le schéma de la copie diffère de la baseline | **s'arrêter** : ne pas lancer `migrate resolve` ; transmettre le diff affiché |
| `STOP` | 3 | état inattendu (ex. tables `Plant` sans historique) | s'arrêter, analyser |
| `REFUSED` | 64 | confirmation absente, hôte interdit, ou session non en lecture seule | corriger la cause |

Le comportement du script est testé en CI sur des bases jetables : refus sans confirmation, refus d'un hôte
interdit, base héritée reconnue prête, base modifiée à la main rejetée (code 2), aucune modification de la base inspectée.

## Étape 2 — Sauvegarde de la copie, puis mise à niveau de la copie

Avec un rôle autorisé à écrire **sur la copie uniquement** :

```bash
export DATABASE_URL='postgresql://<écriture-sur-la-copie>@<hôte-de-test>:5432/canopyos_copy'
cd backend && npm ci && npx prisma generate

pg_dump --format=custom --no-owner --no-acl -f ../copy-before-upgrade.dump "$DATABASE_URL"   # point de retour
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/baseline.prisma --exit-code
npx prisma migrate resolve --applied 0_init          # seulement si la commande précédente a retourné 0
npx prisma migrate deploy
npx prisma migrate status                            # doit indiquer : à jour
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

## Étape 3 — Contrôles de la copie mise à niveau

Comparer avec les comptages relevés à l'étape 1 :

```sql
select (select count(*) from "User") users, (select count(*) from "Strain") strains,
       (select count(*) from "GrowProject") projects, (select count(*) from "GrowLog") logs,
       (select count(*) from "Task") tasks;
```

Les nombres doivent être **identiques** à ceux d'avant. Puis, backend démarré sur la copie
(`DATABASE_URL` = copie, `JWT_SECRET` de test, `CANOPYOS_UPLOAD_DIR` temporaire), avec un compte de test créé pour l'occasion :

- création d'une plante, de trois entrées, d'une photo ; rechargement ;
- ouverture d'un projet hérité d'un compte existant avec **son** jeton (jamais en se faisant passer pour lui : utiliser un compte de test
  dont les données ont été copiées vers un compte fictif si nécessaire) ;
- un second compte de test ne voit rien du premier.

## Étape 4 — Retour arrière (à répéter au moins une fois)

```bash
createdb canopyos_copy_rollback
pg_restore --no-owner --no-acl --exit-on-error -d canopyos_copy_rollback ../copy-before-upgrade.dump
```

Vérifier que les comptages égalent l'état d'avant et que les tables `Plant*` sont absentes. **Ne pas** utiliser
`pg_restore --clean` sur la base déjà mise à niveau (voir `docs/MIGRATIONS.md`).

## Étape 5 — Compte rendu et nettoyage

Consigner dans `docs/RECETTE-V1.md` uniquement ce qui a été exécuté (date, version de PostgreSQL, comptages avant/après,
verdict du script, durée de la mise à niveau). Supprimer les bases `canopyos_copy*` et les dumps.

## Ce qui reste à décider par l'exploitant avant la production

- Fenêtre d'indisponibilité (la migration `plant_journal` ne touche pas aux tables existantes, mais l'application V1 doit être redéployée en même temps).
- Sauvegarde de production prise juste avant, et test de sa restauration (étape 4) **avant** le jour J.
- Volume et sauvegarde des photos (`docs/PHOTO-STORAGE.md`) et configuration (`docs/CONFIGURATION.md`).
- Décision explicite de mise en production : elle appartient au propriétaire du produit, pas à la CI.
