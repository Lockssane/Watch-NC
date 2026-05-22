# Architecture Watch-NC

Watch-NC est une application web statique. Le point d'entree est `web/index.html`.

## Arborescence

```text
Watch-NC/
  README.md
  docs/
    architecture.md
  web/
    index.html
    assets/
      css/
        styles.css
      js/
        app.js
```

## Roles

- `web/index.html` fournit la structure DOM attendue par le script.
- `web/assets/css/styles.css` regroupe l'habillage de la carte, des panneaux, des pistes et des popups.
- `web/assets/js/app.js` contient la logique historique du projet : Leaflet, Cesium, couches officielles, AISStream, rendu de liste et interactions.

## Dependances chargees par CDN

- Leaflet pour la carte 2D.
- Cesium pour la vue globe 3D.

Le projet ne necessite pas de build pour l'instant.
