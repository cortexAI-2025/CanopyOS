# Recette CanopyOS V1 — non validée tant que la CI et la base de test n'ont pas tourné

## Exécution automatisée
Workflow `.github/workflows/canopyos-ci.yml` :
- PostgreSQL 15 éphémère, `prisma migrate deploy`
- Prisma client generate, compilation NestJS, tests Jest
- Compilation Next.js

Aucun succès ne doit être annoncé avant consultation des logs CI. Les migrations ne doivent pas être appliquées directement sur la base de production.

## Recette manuelle
1. Démarrer la base PostgreSQL de test et exécuter les migrations.
2. Lancer backend (3001) et frontend (3000) avec JWT_SECRET non vide.
3. Créer compte A et compte B.
4. A crée une plante avec variété libre, COCO, INDOOR.
5. A ajoute une observation avec pH, EC, température, humidité.
6. A importe une image JPEG/PNG/WebP de moins de 5 Mo, recharge et vérifie la galerie.
7. B ne voit pas la plante de A dans sa liste.
8. B ne peut pas lire la plante, ses journaux ou ses photos par ID.
9. B ne peut pas créer d'observation ni importer une photo pour la plante de A.
10. Vérifier le rejet d'un fichier non image et d'un fichier supérieur à 5 Mo.
11. Vérifier la conservation des anciens GrowProject/GrowLog.
12. Vérifier le parcours sur écran Android étroit.

## Limites connues
- Stockage des photos sur disque local privé : nécessite un volume persistant et une politique de sauvegarde en hébergement; incompatible avec des instances serverless sans stockage persistant.
- La galerie de photos est distincte des observations; association photo/observation à finaliser.
- Pas de génération de miniatures, ni suppression/retention des photos.
- URLs de photos externes facultatives encore disponibles dans les observations.
- Les tests de service utilisent des mocks; un test d'intégration réel à deux comptes et PostgreSQL reste obligatoire.
- Pas de publication ni de fusion avant validation complète.
