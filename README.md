# Watch-NC

Interface web de surveillance maritime centree sur la Nouvelle-Caledonie.

## Lancer en local

Depuis la racine du projet :

```powershell
cd web
python -m http.server 8788 --bind 127.0.0.1
```

Puis ouvrir :

```text
http://127.0.0.1:8788
```

## Structure

```text
Watch-NC/
  docs/
    architecture.md
  web/
    index.html
    assets/
      css/styles.css
      js/app.js
```

## Fonctionnalites actuelles

- Carte satellite Leaflet.
- Couches maritimes officielles depuis ArcGIS et data.gouv.nc.
- Vue globe Cesium si la bibliotheque charge correctement.
- Connexion AISStream via cle API utilisateur.
- Liste de pistes, fiche detail, popups, filtres, recherche et alertes SAR.

## Notes

La cle AISStream est stockee dans `localStorage` par le navigateur. Pour une version de production, il faudra deplacer cette gestion cote serveur ou utiliser un mecanisme plus controle.
