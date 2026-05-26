# Sources AIS gratuites

COSS WATCH NC / Noumea Traffic doit rester compatible avec des sources gratuites ou locales.

## Strategie

Le frontend ne contacte jamais directement une source AIS sensible. Il se connecte au backend local, qui choisit une source et transforme les messages vers un format commun.

Sources prevues :

- `AISStream.io` : source principale si une cle gratuite est disponible dans `.env`.
- `AISHub` : source possible si les conditions d'acces gratuites sont respectees.
- `AIS-catcher / RTL-SDR` : source locale future autour de Noumea, via flux NMEA TCP/UDP.
Le mode demo AIS est desactive : l'application ne doit afficher que des pistes reelles.

## Configuration

Copier `.env.example` vers `.env`.

```powershell
Copy-Item .env.example .env
```

Puis renseigner uniquement les variables necessaires. Exemple pour AISStream :

```env
AIS_SOURCE=auto
AISSTREAM_API_KEY=ta_cle_aisstream_locale
```

Le fichier `.env` est ignore par Git et ne doit pas etre publie.

## Format interne navire

Chaque source AIS doit etre normalisee vers ce modele :

```js
{
  id,
  mmsi,
  imo,
  name,
  vesselType,
  latitude,
  longitude,
  course,
  heading,
  speed,
  destination,
  navigationStatus,
  lastUpdate,
  source,
  zone,
  isStale,
  trackHistory
}
```

## Absence de source

Si `AIS_SOURCE=auto` et qu'aucune cle AISStream n'est configuree, le backend refuse la connexion AIS.
Le frontend doit indiquer que la source AIS reelle n'est pas configuree.

## Securite

- Aucune cle API ne doit etre stockee dans le frontend.
- Aucune cle API ne doit etre envoyee a GitHub.
- Le backend lit les cles depuis `.env`.
- Les erreurs doivent rester comprehensibles sans afficher de secret.
