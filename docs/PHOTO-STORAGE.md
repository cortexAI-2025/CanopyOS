# Stockage des photos : fonctionnement, persistance, sauvegarde

## Où sont les photos

- Les octets sont écrits **sur disque**, dans `CANOPYOS_UPLOAD_DIR` ; la base ne conserve que la ligne
  `PlantPhoto` (identifiant, nom de fichier, type MIME, date).
- Dossier créé en mode `0700`, fichiers en `0600`, nommés `<uuid aléatoire>.<ext>` (aucun nom fourni par l'utilisateur).
- Hors production, valeur par défaut `backend/private-uploads` (ignoré par git). **En production,
  `CANOPYOS_UPLOAD_DIR` est obligatoire**, absolu, et le démarrage échoue s'il n'est pas inscriptible.

## Ce qui est contrôlé à l'envoi

| Contrôle | Comportement |
|---|---|
| Authentification et propriété de la plante | 401 sans jeton ; 404 si la plante n'appartient pas au compte |
| Taille | 5 Mo maximum (refus au-delà) |
| Type réel | signature des octets (JPEG, PNG, WebP) ; extension et type déclarés ignorés ; SVG et autres formats refusés |
| Fichier corrompu | structure invalide → 400, rien n'est stocké |
| Quota | `PHOTOS_MAX_PER_PLANT` (50 par défaut) → 400 au-delà |
| **Métadonnées** | position GPS, appareil, dates, commentaires, XMP et IPTC **supprimés** ; seule l'orientation EXIF est conservée pour que les photos de téléphone restent à l'endroit. Les pixels ne sont pas ré-encodés. |
| Échec en base | le fichier déjà écrit est supprimé (pas de fichier orphelin) |

À la lecture : `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, authentification et
propriété vérifiées. Fichier absent du disque → 404.

La suppression des métadonnées est vérifiée par des tests unitaires (octets synthétiques) et d'intégration, et
par un décodage réel dans Chromium pour JPEG, PNG et WebP lors du développement.

## Persistance : ce que l'exploitant doit garantir

1. **Volume persistant** monté sur `CANOPYOS_UPLOAD_DIR`. Sur un hébergeur à système de fichiers éphémère
   (conteneur sans volume, plateforme « serverless »), les photos disparaissent au redéploiement : à proscrire.
2. **Une seule instance** (ou un volume partagé) : le stockage est local à la machine.
3. **Sauvegarde cohérente base + fichiers.** La base référence des fichiers : sauvegarder les deux ensemble
   (`pg_dump` puis copie/snapshot du dossier). Restaurer la base sans le dossier produit des photos en 404 ;
   l'inverse laisse des fichiers sans ligne (inoffensif, nettoyable).
4. Droits : le dossier n'appartient qu'à l'utilisateur qui exécute le backend ; ne jamais l'exposer via un serveur web statique.

## Limites connues

- Pas de suppression de photo, ni de miniature, ni de redimensionnement côté serveur ou client (une photo de téléphone
  récente peut dépasser 5 Mo et sera refusée avec un message d'erreur).
- Pas d'analyse antivirus. Pas de chiffrement au repos (à confier au volume / au disque).
- Pas de migration automatique vers un stockage objet (S3 ou équivalent) : à prévoir si plusieurs instances sont nécessaires.
