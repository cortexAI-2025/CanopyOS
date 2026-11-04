# Recette Android sur appareil physique — instructions et critères

> **Statut : NON EXÉCUTÉE.** Ce document est une procédure. Aucun appareil Android réel n'a été utilisé ; la seule
> validation mobile existante est un Chromium émulant un Pixel 5 (job CI `e2e-mobile`). Tant que le tableau de
> résultats (§6) n'est pas rempli par un testeur, **aucun critère ci-dessous ne doit être présenté comme validé**.

## 1. Matériel et préparation

- Un téléphone Android réel (noter modèle, version d'Android, version de Chrome) ; idéalement un second, plus ancien / petit écran.
- Un poste de développement avec le dépôt, Node 20, PostgreSQL **de test** (jamais de données réelles), `adb` (Android Platform Tools) et un câble USB.
- Options du développeur et **débogage USB** activés sur le téléphone.

## 2. Mise en place (choisir A ou B)

### A. Câble USB + `adb reverse` (recommandé : l'origine reste `http://localhost:3000`, la configuration CORS par défaut convient)

```bash
# Poste : base de test, backend et frontend
cd backend && cp .env.example .env     # DATABASE_URL de test, JWT_SECRET généré (openssl rand -hex 32)
npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
node dist/main &                                           # écoute sur 3001
cd ../frontend && NEXT_PUBLIC_API_URL=http://localhost:3001 npm run build && npm start &   # 3000

adb devices                                                # le téléphone doit apparaître « device »
adb reverse tcp:3000 tcp:3000
adb reverse tcp:3001 tcp:3001
```

Sur le téléphone : Chrome → `http://localhost:3000`.

### B. Réseau local Wi-Fi (plus proche de l'usage réel)

Backend avec `CORS_ORIGINS=http://<IP-du-poste>:3000`, frontend construit avec
`NEXT_PUBLIC_API_URL=http://<IP-du-poste>:3001` (la valeur est figée à la construction), pare-feu ouvert sur 3000 et 3001,
téléphone sur le même Wi-Fi. Le trafic n'est **pas chiffré** : comptes de test uniquement.

## 3. Jeu d'essai

Créer deux comptes fictifs (`recette-a@example.test`, `recette-b@example.test`). Préparer sur le téléphone :
une photo prise avec l'appareil photo (orientation portrait, localisation activée dans l'appareil photo), une photo de
plus de 5 Mo si possible, un fichier non image (PDF ou texte).

## 4. Scénarios et critères d'acceptation

| # | Scénario | Critère d'acceptation |
|---|---|---|
| A1 | Ouvrir l'application, se connecter (compte A) | Arrivée sur la liste des plantes ; clavier numérique/e-mail adaptés ; aucun zoom involontaire ni défilement horizontal |
| A2 | Liste vide puis « + Ajouter » | Message d'accueil lisible ; boutons utilisables au pouce (zone ≥ 44 px) |
| A3 | Créer une plante (Intérieur / Coco) | Plante visible dans la liste, rechargement compris |
| A4 | Ajouter 3 entrées avec pH, EC, température, humidité | Entrées listées, la plus récente d'abord ; valeur hors plage (pH 15) refusée avec message |
| A5 | **Photo depuis l'appareil photo** (choix « Appareil photo ») | Photo importée et affichée **à l'endroit** (orientation conservée) |
| A6 | **Photo de la galerie** | Idem |
| A7 | Photo > 5 Mo | Message d'erreur compréhensible, application utilisable ensuite (voir §7 : limite connue) |
| A8 | Fichier non image | Refusé avec message |
| A9 | **Confidentialité de la photo** | Télécharger la photo stockée (ouverture de l'URL authentifiée, ou lecture dans le dossier `CANOPYOS_UPLOAD_DIR` du poste) et vérifier avec `exiftool` : **aucune** coordonnée GPS, aucun modèle d'appareil |
| A10 | Verrouiller l'écran 1 min, changer d'application, revenir | Session conservée, données présentes |
| A11 | Fermer complètement Chrome, rouvrir | Session et données conservées (jeton valable 7 jours) |
| A12 | Mode avion puis action | Message d'erreur clair, pas d'écran blanc ; rétablir le réseau → l'action refonctionne |
| A13 | Rotation portrait ↔ paysage | Mise en page utilisable, aucune perte de saisie en cours |
| A14 | Se déconnecter, se connecter avec le compte B | Liste vide ; l'URL d'une plante de A saisie à la main affiche une erreur sans donnée de A |
| A15 | 6 mauvais mots de passe d'affilée (limite par défaut : 10 / minute) | Message d'erreur ; au-delà de la limite, message « trop de tentatives » et non écran blanc ; reconnexion possible après la fenêtre |
| A16 | Fluidité | Pas de blocage > 2 s sur les actions courantes en Wi-Fi ou câble (ressenti noté) |

## 5. Preuves à conserver (sans données réelles)

Pour chaque scénario : capture d'écran du téléphone (`adb exec-out screencap -p > a05.png`), résultat de
`exiftool` (A9), `adb logcat -d | grep -i chromium` en cas d'écran blanc, modèle/version. Consigner dans
`docs/RECETTE-V1.md` (§ recette physique) : date, testeur, appareil, résultat par scénario, anomalies.

## 6. Tableau de résultats (à remplir par le testeur)

| Appareil / Android / Chrome | Date | Testeur | A1–A16 (OK / KO / non joué) | Anomalies |
|---|---|---|---|---|
| *non renseigné* | | | | |

## 7. Limites connues à garder en tête

- Pas de redimensionnement des photos côté client : un cliché récent de smartphone dépasse souvent 5 Mo et sera refusé (A7). Si cela concerne la majorité des essais, **c'est un bloquant d'usage** à traiter avant la bêta.
- Pas de mode hors ligne, pas d'application installable (PWA) : le navigateur doit rester connecté.
- Seul Chrome Android est ciblé ; Firefox, Samsung Internet et iOS ne sont pas couverts.

## 8. Décision

La recette Android est **réussie** si A1–A6, A8–A11, A13, A14 sont OK sur au moins un appareil réel, sans anomalie bloquante, et si
A7 est soit OK soit accepté explicitement comme limite par le propriétaire du produit.
