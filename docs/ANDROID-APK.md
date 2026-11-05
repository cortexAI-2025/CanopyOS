# CanopyOS Android — bêta

## Ce que contient l'APK
L'application Android charge votre instance **web CanopyOS** dans une WebView. Au premier démarrage, saisissez l'adresse HTTPS du site (frontend Next.js), pas celle de l'API. Aucun domaine de production n'est présumé. Le serveur, son API et sa base restent nécessaires ; l'APK ne crée pas de mode hors ligne.

Le frontend et le backend existants ne sont pas modifiés. Les connexions et journaux utilisent les écrans et l'API de l'instance choisie. L'import de photos utilise le sélecteur Android. La prise de photo directe avec la caméra n'est pas ajoutée dans cette bêta.

## Compilation GitHub
Workflow : `.github/workflows/android-apk.yml`, **CanopyOS Android APK**.
- Déclenchement automatique sur la branche Android ou sur la PR.
- Déclenchement manuel `workflow_dispatch` une fois le workflow disponible sur la branche par défaut.
- Java 17, Gradle 8.9, AGP 8.7.3, API 35 ; Android minimum 8 (API 26).
- Lint, assemblage debug, signature vérifiée, SHA-256 et commit conservés.
- Artefact : `CanopyOS-Android-beta-<sha>`, contenant l'APK et ses preuves.
- L'APK utilise une **clé debug de test**, pas une clé durable de publication. Un prochain build peut nécessiter de désinstaller le précédent si la clé du runner change. Ne pas le distribuer comme une version Play Store.

En local : Gradle 8.9 + SDK Android requis, puis `gradle -p android :app:lintDebug :app:assembleDebug`.

## Connexion
1. Installer l'APK, ouvrir CanopyOS.
2. Renseigner l'adresse HTTPS de l'instance frontend.
3. Se connecter avec un compte de recette.
4. Créer une plante, ajouter une observation et importer une photo.
5. Fermer/rouvrir et vérifier le journal.
6. Le bouton **Serveur** permet de changer l'instance ; changer d'origine supprime les données de session WebView locales.

La version debug accepte aussi `http://localhost:<port>` pour une recette avec `adb reverse`. Les hôtes distants HTTP sont refusés. La version release n'accepte que HTTPS.

## Sécurité
Aucun pont JavaScript natif ni permission caméra/stockage générale. Accès aux fichiers locaux désactivé ; les fichiers choisis doivent être des URI content fournies par le sélecteur. Navigation principale limitée à l'origine choisie, liens HTTPS externes ouverts par le navigateur après un geste utilisateur. Contenu mixte refusé, erreurs TLS jamais ignorées, sauvegarde Android des données de l'app désactivée.

## Limites de validation
La recette automatisée Android utilise une page HTML locale : ouverture, refus d'adresse HTTP distante, choix de fichier et annulation, persistance de l'adresse. **Elle ne constitue pas une validation des parcours CanopyOS réels ni de son hébergement.** Les tests web/API existants restent distincts. Le Galaxy A14 réel, l'instance hébergée et les photos réelles restent à tester.
