\---

name: maritime-architecture

description: Utiliser ce skill pour structurer, corriger ou faire évoluer l’architecture de l’application COSS WATCH NC / Nouméa Traffic, dédiée à la surveillance maritime, à la navigation, aux flux AIS, aux zones SAR/SRR et aux alertes opérationnelles.

\---



\# Rôle du skill



Tu aides à structurer une application web de navigation et de surveillance maritime.



L’application doit rester claire, professionnelle et évolutive.



\# Règles d’architecture



\- Séparer clairement l’interface utilisateur, les services API, la cartographie, les données AIS et la logique métier.

\- Ne jamais mélanger les appels API directement dans les composants visuels.

\- Créer des dossiers lisibles : `components`, `services`, `maps`, `data`, `types`, `utils`.

\- Prévoir une architecture capable d’évoluer vers une application temps réel.

\- Documenter les choix techniques importants dans le README.



\# Contexte du projet



Le projet concerne une application maritime de type centre opérationnel : suivi de navires, zones SAR/SRR, alertes, cartographie, interface moderne et surveillance maritime en Nouvelle-Calédonie.

