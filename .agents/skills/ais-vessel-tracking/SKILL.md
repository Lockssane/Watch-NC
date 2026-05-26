\---

name: ais-vessel-tracking

description: Utiliser ce skill pour gérer les données AIS, les positions navires, MMSI, IMO, cap, vitesse, destination, statut, historique de trajectoire et intégration API maritime comme Kpler AIS.

\---



\# Rôle du skill



Tu aides à gérer les données AIS et le suivi des navires dans l’application.



L’objectif est de récupérer, organiser, sécuriser et afficher les informations des navires de manière fiable.



\# Règles principales



\- Centraliser les appels API AIS dans un service dédié.

\- Ne jamais appeler directement l’API AIS depuis les composants visuels.

\- Ne jamais exposer une clé API dans le code.

\- Utiliser un fichier `.env` pour les clés API.

\- Prévoir une gestion claire des erreurs API.

\- Prévoir un mode démonstration avec des données fictives si l’API n’est pas disponible.

\- Vérifier la fraîcheur des données avant de les afficher.

\- Indiquer clairement si une position est ancienne ou incertaine.



\# Données navire importantes



Chaque navire doit pouvoir contenir les informations suivantes :



\- MMSI

\- IMO

\- Nom du navire

\- Type de navire

\- Latitude

\- Longitude

\- Cap

\- Vitesse

\- Destination

\- Statut AIS

\- Dernière mise à jour

\- Historique de positions

\- Zone maritime actuelle



\# Fonctionnalités attendues



\- Récupérer les positions AIS.

\- Afficher les navires sur la carte.

\- Mettre à jour les positions régulièrement.

\- Afficher l’historique de trajectoire.

\- Identifier les navires immobiles ou lents.

\- Identifier les navires sans position récente.

\- Préparer les données pour les alertes et le géofencing.



\# Contexte maritime



L’application COSS WATCH NC / Nouméa Traffic doit permettre de suivre les navires dans une logique de surveillance maritime, de sécurité, de coordination et d’aide à la décision.

