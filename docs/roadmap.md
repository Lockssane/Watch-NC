# COSS Watch NC - Feuille de Route

## Vision

COSS Watch NC est une plateforme gratuite et open source de surveillance maritime pour la zone Nouvelle-Caledonie. L'application doit privilegier les pistes AIS reelles issues de sources gratuites ou locales.

## Version 0.1 - Prototype web

- Carte centree sur la Nouvelle-Caledonie.
- Connexion a des pistes AIS reelles via backend local.
- Mode globe 3D mondial type Google Earth avec CesiumJS.
- Routes maritimes mondiales et trafic AIS reel lorsque la source est disponible.
- Connexion AISStream live configurable localement.
- Filtres par type et par statut.
- Fiche navire operationnelle.
- Delimitation officielle de l'espace maritime.
- Delimitation officielle de l'espace maritime issue du Gouvernement de la Nouvelle-Caledonie / Georep.
- Aires protegees officielles du Gouvernement de la Nouvelle-Caledonie.
- Traces de navigation.
- Alertes actives.
- Creation simple d'un incident SAR.
- Interface responsive utilisable sur mobile.

## Version 0.2 - Backend gratuit

- API FastAPI.
- Stockage PostgreSQL/PostGIS.
- Historique des positions.
- Moteur d'alertes geographiques.
- Sources AIS gratuites ou locales cote serveur.
- WebSocket pour le temps reel.

## Version 0.3 - Donnees ouvertes

- Connecteur aisstream.io pour tests.
- Connecteur pyais pour flux NMEA.
- Preparation AIS-catcher pour station locale.
- Meteo marine via Open-Meteo.
- Import GeoJSON pour zones COSS, ports, recifs, ZEE et secteurs SAR.
- Source espace maritime NC: https://services1.arcgis.com/TZcrgU6CIbqWt9Qv/arcgis/rest/services/delimitation_espace_maritime/FeatureServer
- Source aires protegees NC: https://services1.arcgis.com/TZcrgU6CIbqWt9Qv/arcgis/rest/services/aires_protegees_gouvnc/FeatureServer
- Documentation AISStream: https://aisstream.io/documentation.html

## Version 0.4 - Mobile

- Application React Native ou PWA.
- Carte mobile simplifiee.
- Alertes et fiches navires.
- Consultation incidents SAR.
- Mode faible bande passante.

## Briques open source recommandees

- MapLibre ou Leaflet pour la cartographie.
- CesiumJS pour la navigation globe 3D.
- FastAPI pour le backend.
- pyais pour decoder AIS/NMEA.
- PostgreSQL/PostGIS pour les donnees geographiques.
- AIS-catcher pour une future station AIS locale.
- Signal K si un hub maritime devient utile.
