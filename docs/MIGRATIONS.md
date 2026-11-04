# Migrations Prisma — procédure documentée

L'historique versionné contient deux migrations, appliquées dans l'ordre alphabétique :

| Migration | Rôle |
|---|---|
| `0_init` | Baseline : schéma antérieur au journal par plante (équivalent de `prisma/baseline.prisma`). |
| `20261026194500_plant_journal` | Ajoute `Plant`, `PlantLog`, `PlantPhoto` et la valeur `COCO` de `GrowMethod`. |

`prisma/baseline.prisma` n'est **pas** utilisé par l'application ; il sert de référence du schéma
antérieur (CI et vérification d'une base existante avant baseline).

## 1. Installation neuve (base vide)

```bash
cd backend
cp .env.example .env        # renseigner DATABASE_URL et JWT_SECRET (obligatoire)
npx prisma migrate deploy   # applique 0_init puis 20261026194500_plant_journal
```

Un second `npx prisma migrate deploy` ne doit rien appliquer (`npx prisma migrate status` : à jour).

## 2. Mise à niveau d'une base existante (créée avant le versionnement des migrations)

Une base qui contient déjà le schéma antérieur mais aucun historique Prisma fait échouer
`migrate deploy` avec **P3005** (« The database schema is not empty »). Il faut d'abord
enregistrer la baseline, sans réexécuter son SQL :

```bash
cd backend
# 0. Sauvegarde obligatoire avant toute opération sur une base qui contient des données
pg_dump "$DATABASE_URL" -Fc -f canopyos-before-upgrade.dump

# 1. Vérifier que la base correspond bien au schéma antérieur (code retour 0 = aucune différence)
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/baseline.prisma --exit-code

# 2. Enregistrer la baseline (n'exécute pas le SQL de 0_init)
npx prisma migrate resolve --applied 0_init

# 3. Appliquer la migration du journal par plante
npx prisma migrate deploy
```

`migrate resolve --applied` ne doit être utilisé **que** si l'étape 1 est concluante : il déclare
la migration comme déjà appliquée sans le vérifier.

Restauration en cas de problème : `pg_restore --clean --if-exists -d "$DATABASE_URL" canopyos-before-upgrade.dump`.

## 3. Règles

- Ne jamais lancer ces commandes sur une base de production sans sauvegarde et sans validation préalable sur une copie.
- Le workflow CI rejoue les deux parcours sur des PostgreSQL jetables (`backend` : installation neuve ;
  `migration-upgrade` : mise à niveau avec données fictives) et reste bloquant.
- Toute évolution de `schema.prisma` s'accompagne d'une migration ; la CI échoue en cas de dérive
  (`prisma migrate diff --exit-code`).
