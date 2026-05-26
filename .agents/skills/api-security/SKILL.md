\---

name: api-security

description: Utiliser ce skill pour sécuriser les clés API, fichiers .env, appels externes, erreurs réseau, limites de requêtes et intégrations avec des API comme Kpler AIS.

\---



\# Rôle du skill



Tu aides à sécuriser les appels API et les informations sensibles du projet.



L’objectif est d’éviter toute fuite de clé API, toute mauvaise configuration et toute exposition de données sensibles dans GitHub ou dans le code source.



\# Règles obligatoires



\- Ne jamais écrire une vraie clé API directement dans le code.

\- Toujours utiliser un fichier `.env`.

\- Toujours vérifier que `.env` est présent dans `.gitignore`.

\- Créer un fichier `.env.example` sans vraie clé.

\- Ne jamais afficher une clé API dans la console.

\- Ne jamais envoyer une clé API vers GitHub.

\- Ne jamais exposer une clé API côté frontend.

\- Utiliser le backend comme intermédiaire pour les appels sensibles.

\- Gérer les erreurs API proprement.

\- Prévoir les limites de requêtes.

\- Prévoir les cas où l’API est indisponible.



\# Exemple correct



Utiliser une variable d’environnement :



```env

KPLER\_API\_KEY=ta\_cle\_ici

