# CanopyOS — MVP journal de culture mobile-first

## Objectif
Parcours inspiré de la simplicité de Grow with Jane, sans copier son interface ou son code.
Créer une plante, lui attribuer une variété, ajouter une photo et consulter son historique.

## Périmètre V1
- Plantes individuelles, éventuellement regroupées en espaces ou projets.
- Catalogue de variétés indépendant, recherche et saisie manuelle; intégration SeedFinder conditionnée à un accès et une licence autorisés.
- Environnements INDOOR, OUTDOOR, GREENHOUSE.
- Supports SOIL, COCO, HYDROPONIC, AEROPONIC.
- Journal chronologique: notes, photo, pH, EC, température, humidité, actions.
- Rappels simples et phases de culture.
- Interface mobile-first, états vide/chargement/erreur, accessibilité.

## Contraintes de migration
Le schéma existant rattache GrowLog et Task à GrowProject. Introduire Plant sans supprimer les relations existantes; migrer progressivement et conserver les données. Ajouter COCO à GrowMethod via migration Prisma. Une plante peut être créée sans variété du catalogue (nom libre). Contrôler l'appartenance de chaque ressource à l'utilisateur authentifié.

## Critères d'acceptation
1. Utilisateur connecté crée une plante avec nom, environnement et support.
2. Il choisit une variété ou renseigne un nom libre.
3. Il enregistre une observation avec photo facultative.
4. La timeline affiche les observations de la plante, du plus récent au plus ancien.
5. Un autre compte ne peut ni lire ni modifier cette plante ou ses observations.
6. Les anciennes cultures et leurs journaux restent accessibles après migration.
7. Tests unitaires API, intégration BDD et parcours mobile validés avant fusion.

## Hors périmètre
Automatisation d'éclairage, capteurs IoT, nutrition automatisée, assistant IA et abonnement payant.
