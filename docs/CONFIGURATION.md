# Configuration de CanopyOS (référence)

Aucune valeur secrète n'est versionnée. `backend/.env.example` ne contient que des emplacements à remplacer.

## Backend

| Variable | Obligatoire | Défaut | Rôle et règles |
|---|---|---|---|
| `DATABASE_URL` | oui | — | URL PostgreSQL. Ne jamais pointer une base de test vers des données réelles. |
| `JWT_SECRET` | oui | — | Signature des jetons. **Le backend refuse de démarrer sans.** En production : ≥ 32 caractères et pas de valeur d'exemple (`change`, `example`, `your-secret`, `fallback`, `password`, `test-only`…). Générer avec `openssl rand -hex 32`. |
| `NODE_ENV` | non | — | `production` active les exigences ci-dessous. |
| `PORT` | non | `3001` | Port d'écoute. |
| `CORS_ORIGINS` | **en production** | `http://localhost:3000` hors production | Liste séparée par des virgules d'origines **exactes** (`https://app.exemple.com`). Refusés : `*`, jokers, chemin, `/` final, schéma autre que http(s). Une origine non listée ne reçoit aucun en-tête CORS ; les requêtes sans en-tête `Origin` (applications, curl, supervision) restent servies. |
| `CANOPYOS_UPLOAD_DIR` | **en production** | `./private-uploads` hors production | Dossier des photos : chemin **absolu** d'un volume persistant et sauvegardé. Créé (mode 0700) et testé en écriture au démarrage ; le démarrage échoue s'il n'est pas utilisable. Voir `docs/PHOTO-STORAGE.md`. |
| `PHOTOS_MAX_PER_PLANT` | non | `50` | Nombre maximal de photos par plante (400 au-delà). |
| `AUTH_RATE_LIMIT` | non | `10` | Requêtes autorisées par fenêtre, par adresse cliente et par route, sur `/auth/register` et `/auth/login`. Au-delà : `429 Too Many Requests`. |
| `AUTH_RATE_WINDOW_SEC` | non | `60` | Durée de la fenêtre en secondes. |
| `TRUST_PROXY_HOPS` | non | `0` | Nombre de reverse proxies devant le backend (0–5). À renseigner derrière un proxy, sinon toutes les requêtes semblent venir de l'adresse du proxy et partagent le même compteur. |

Limites de la limitation de débit : compteurs **en mémoire**, propres à chaque instance (pas partagés entre
plusieurs instances ni conservés après redémarrage) ; ils freinent le bourrage d'identifiants depuis une
même adresse mais ne remplacent ni un verrouillage par compte ni une protection au niveau du proxy.

## Frontend

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL publique du backend. Intégrée **à la construction** (`npm run build`) : la changer exige de reconstruire. |

## Exemple minimal de production (valeurs fictives)

```bash
NODE_ENV=production
DATABASE_URL=postgresql://<utilisateur>:<mot-de-passe>@<hôte>:5432/<base>
JWT_SECRET=<sortie de: openssl rand -hex 32>
CORS_ORIGINS=https://app.exemple.com
CANOPYOS_UPLOAD_DIR=/var/lib/canopyos/photos
TRUST_PROXY_HOPS=1
```

La CI vérifie qu'une configuration complète démarre et que chacune des configurations dangereuses
suivantes est refusée : `CORS_ORIGINS` absent ou `*`, `CANOPYOS_UPLOAD_DIR` absent ou relatif,
`JWT_SECRET` faible ou trop court.
