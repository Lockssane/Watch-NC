# COSS WATCH NC / Noumea Traffic

Interface web de surveillance maritime centree sur la Nouvelle-Caledonie et le Pacifique Sud.

## Lancer en local

Installer les dependances :

```powershell
npm install
```

Copier la configuration locale :

```powershell
Copy-Item .env.example .env
```

Demarrer le relais AIS local :

```powershell
npm run relay:ais
```

Dans un second terminal, lancer l'interface actuelle :

```powershell
cd web
python -m http.server 8787 --bind 127.0.0.1
```

Puis ouvrir :

```text
http://127.0.0.1:8787
```

## Structure

```text
Watch-NC/
  docs/
    architecture.md
    ais-sources.md
  server/
    ais-relay.mjs
    ais/
      ais-service.mjs
      providers/
  web/
    index.html
    styles.css
    app.js
```

## Fonctionnalites actuelles

- Premiere page immersive COSS WATCH NC inspiree des codes premium Hubtown, adaptee au maritime.
- Carte satellite Leaflet.
- Couches maritimes officielles depuis ArcGIS et data.gouv.nc.
- Vue globe Cesium si la bibliotheque charge correctement.
- Backend AIS local avec selection de source.
- AISStream.io via `.env` si une cle gratuite est disponible.
- Liste de pistes, fiche detail, popups, filtres, recherche et alertes SAR.

## Sources AIS prevues

- AISStream.io.
- AISHub si les conditions d'acces gratuites sont respectees.
- AIS-catcher / RTL-SDR pour une future station locale autour de Noumea.
Le mode demo AIS a ete retire pour privilegier uniquement les pistes reelles.

Voir [docs/ais-sources.md](docs/ais-sources.md).

## Securite

Les cles API restent cote backend dans `.env`. Le frontend ne doit pas stocker ni envoyer de cle AIS.
Sans source AIS reelle configuree, aucune piste AIS ne sera inventee.

## Premiere page

La page `web/index.html` s'ouvre sur une experience d'accueil sombre et maritime :

- intro courte avec progression de chargement ;
- hero COSS WATCH NC / Noumea Traffic ;
- sections Vision, Capacites, Interface operationnelle, Pacifique Sud, Technologie et appel a l'action ;
- boutons d'acces vers la carte operationnelle existante.

Cette page n'appelle aucune API sensible. Elle presente le produit, puis laisse l'interface cartographique prendre le relais via `#ops`.
