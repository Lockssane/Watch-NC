\---

name: sar-srr-geofencing

description: Utiliser ce skill pour importer, corriger, afficher et exploiter les zones SAR/SRR, KML, KMZ, GeoJSON, polygones, limites de responsabilité maritime et alertes de franchissement de zone.

\---



\# Rôle du skill



Tu aides à gérer les zones SAR, SRR et les limites opérationnelles maritimes.



L’objectif est de représenter correctement les zones de responsabilité, les zones de recherche et sauvetage, les limites aéronautiques ou maritimes et les zones d’alerte.



\# Règles principales



\- Utiliser GeoJSON comme format de travail principal lorsque c’est possible.

\- Ne jamais simplifier une zone si cela fausse ses limites.

\- Vérifier que les polygones sont correctement fermés.

\- Vérifier que les coordonnées sont dans le bon ordre : longitude, latitude.

\- Documenter la source des coordonnées utilisées.

\- Prévoir une distinction claire entre SAR, SRR, ZEE, zones d’alerte et zones personnalisées.

\- Ne pas modifier une limite sans justification.



\# Formats à gérer



\- KML

\- KMZ

\- GeoJSON

\- CSV de coordonnées

\- JSON interne de zones



\# Fonctionnalités attendues



\- Importer une zone maritime.

\- Convertir une zone en GeoJSON.

\- Afficher une zone sur la carte.

\- Détecter si un navire est dans une zone.

\- Détecter si un navire entre dans une zone.

\- Détecter si un navire sort d’une zone.

\- Détecter si un navire approche d’une limite.

\- Générer une alerte de franchissement.

\- Afficher le nom de la zone concernée.



\# Contexte maritime



Ce skill est important pour l’application COSS WATCH NC / Nouméa Traffic, car elle doit pouvoir afficher et exploiter des zones comme les SRR de Nouvelle-Calédonie, Australie, Nouvelle-Zélande, Fidji ou autres zones de responsabilité.

