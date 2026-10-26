# Plan de livraison CanopyOS V1

1. Auditer modules NestJS, pages Next.js, auth, DTO et migrations.
2. Modifier Prisma: ajouter COCO, Plant, relation facultative au catalogue et journal individuel. Migration compatible avec les GrowProject existants.
3. Créer les endpoints REST de plantes et observations avec contrôles d'accès, validation et pagination.
4. Développer les écrans mobiles Mes plantes / Ajouter / Détail / Journal.
5. Ajouter gestion des images avec validation de type, taille, autorisation et stockage durable.
6. Tests backend, migration de données, E2E frontend, contrôle de sécurité.
7. PR de revue; ne pas fusionner sans CI verte.

Attention: docker-compose contient un mot de passe local de développement. Ne jamais utiliser cette valeur en production.
