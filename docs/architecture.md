# Architecture COSS WATCH NC / Noumea Traffic

Le projet conserve l'interface operationnelle actuelle dans `web/` et ajoute un backend AIS local dans `server/`.
L'objectif est de garder le visuel existant tout en separant progressivement les responsabilites.

## Arborescence

```text
Watch-NC/
  README.md
  .env.example
  docs/
    architecture.md
    ais-sources.md
  server/
    ais-relay.mjs
    config/
      env.mjs
    streams/
      sse-bus.mjs
    ais/
      ais-service.mjs
      normalize-vessel.mjs
      providers/
        aisstream-provider.mjs
        aishub-provider.mjs
        aiscatcher-provider.mjs
  web/
    index.html
    styles.css
    app.js
```

## Roles

- `web/index.html` fournit la structure DOM attendue par le script.
- `web/styles.css` regroupe l'habillage de la carte, des panneaux, des pistes et des popups.
- `web/app.js` contient encore la logique historique du projet : Leaflet, Cesium, couches officielles, rendu de liste et interactions.
- `server/ais-relay.mjs` expose les endpoints locaux `/health`, `/events`, `/connect` et `/disconnect`.
- `server/ais/ais-service.mjs` selectionne une source AIS gratuite ou locale.
- `server/ais/providers/` contient les adaptateurs AISStream, AISHub et AIS-catcher.
- `server/ais/normalize-vessel.mjs` prepare le format interne unique des navires.

## Flux AIS

```text
AISStream / AISHub / AIS-catcher
        |
        v
server/ais/providers/*
        |
        v
server/ais/ais-service.mjs
        |
        v
SSE /events
        |
        v
web/app.js
```

## Dependances chargees par CDN

- Leaflet pour la carte 2D.
- Cesium pour la vue globe 3D.

## Evolution prevue

`web/app.js` doit etre allege progressivement en modules :

- services API frontend
- logique cartographique
- rendu navires
- panneaux UI
- geofencing SAR/SRR/ZEE
- journal d'evenements

Cette extraction doit se faire par petites passes pour ne pas casser l'interface existante.
