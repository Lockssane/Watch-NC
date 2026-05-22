import type { AgentResponse, EnvironmentMode, FilterMode, ViewMode } from "../types";

interface AgentOptions {
  availableTargets: string[];
}

function makeResponse(response: AgentResponse): AgentResponse {
  return response;
}

export function resolveCossCommand(input: string, options: AgentOptions): AgentResponse {
  const text = input.trim();
  const lower = text.toLowerCase();

  const viewMap: Array<{ mode: ViewMode; words: string[] }> = [
    { mode: "global", words: ["globale", "radar", "vigie"] },
    { mode: "maps", words: ["carte", "cartes", "map"] },
    { mode: "ais", words: ["ais", "trafic", "navires commerciaux"] },
    { mode: "ocean", words: ["meteo", "ocean", "3d", "mer"] },
    { mode: "control", words: ["controle", "rapport", "salle"] },
  ];

  for (const entry of viewMap) {
    if (entry.words.some((word) => lower.includes(word))) {
      return makeResponse({
        message:
          "Vue recalee. Je fais pivoter la passerelle sur le theatre demande afin de mettre la situation en lecture directe.",
        action: {
          type: "navigation",
          target: entry.mode,
          parameters: { smooth: true },
        },
        suggestions: [
          "Mettre un navire en surbrillance",
          "Basculer l'environnement tactique",
          "Lancer une demonstration SAR",
        ],
      });
    }
  }

  const target = options.availableTargets.find((entry) => lower.includes(entry.toLowerCase()));
  if (target) {
    return makeResponse({
      message:
        "Cible acquise. Je la prends sous projecteur radar et je recentre la situation pour une lecture plus nette de sa route.",
      action: {
        type: "highlight",
        target,
        parameters: { glow: "radar", persist: true },
      },
      suggestions: [
        "Afficher la route detaillee",
        "Filtrer uniquement les cibles en alerte",
        "Comparer avec les pistes de patrouille",
      ],
    });
  }

  const filterMap: Array<{ mode: FilterMode; words: string[] }> = [
    { mode: "commercial", words: ["commercial", "cargo", "commerce"] },
    { mode: "fishing", words: ["peche", "fishing"] },
    { mode: "sar", words: ["sar", "sauvetage", "rescue"] },
    { mode: "alerts", words: ["alerte", "alertes", "critique"] },
  ];

  for (const entry of filterMap) {
    if (entry.words.some((word) => lower.includes(word))) {
      return makeResponse({
        message:
          "Filtre applique. Je ne conserve a l'ecran que les pistes utiles au theatre que vous venez de designer.",
        action: {
          type: "filter",
          target: entry.mode,
          parameters: { isolate: true },
        },
        suggestions: [
          "Revenir a la situation generale",
          "Mettre en surbrillance une cible",
          "Afficher la meteo locale",
        ],
      });
    }
  }

  if (lower.includes("demo") || lower.includes("demonstration") || lower.includes("simulation")) {
    return makeResponse({
      message:
        "Demonstration engagee. Je peux vous montrer une derive de route, une alerte radar ou une mise en place SAR selon le scenario souhaite.",
      action: {
        type: "demo",
        target: lower.includes("sar") ? "sar-alert" : "route-deviation",
        parameters: { autoplay: true, duration: 16 },
      },
      suggestions: [
        "Demonstration de derive",
        "Demonstration SAR",
        "Demonstration de suivi radar",
      ],
    });
  }

  const environmentMap: Array<{ mode: EnvironmentMode; words: string[] }> = [
    { mode: "satellite", words: ["satellite"] },
    { mode: "storm", words: ["tempete", "storm", "mer agitee"] },
    { mode: "night", words: ["nuit", "night"] },
    { mode: "tactical", words: ["tactique", "tactical"] },
    { mode: "radar", words: ["radar classique"] },
  ];

  for (const entry of environmentMap) {
    if (entry.words.some((word) => lower.includes(word))) {
      return makeResponse({
        message:
          "Environnement recale. J'ajuste l'eclairage et les couches tactiques pour garder le theatre lisible dans cette configuration.",
        action: {
          type: "environment",
          target: entry.mode,
          parameters: { transition: "cinematic" },
        },
        suggestions: [
          "Reprendre la vue globale",
          "Mettre une cible en surbrillance",
          "Comparer deux theatres",
        ],
      });
    }
  }

  if (lower.includes("que surveillons") || lower.includes("fonction") || lower.includes("systeme")) {
    return makeResponse({
      message:
        "Le systeme veille sur le trafic, les deviations de route, les alertes SAR et les conditions d'environnement, avec une seule chaine de lecture pour la vigie et la decision.",
      action: {
        type: "explain",
        target: "system-overview",
        parameters: { level: "operational" },
      },
      suggestions: [
        "Expliquer le module AIS",
        "Montrer le theatre SAR",
        "Afficher les navires en alerte",
      ],
    });
  }

  return makeResponse({
    message:
      "Ordre recu. Je peux changer de vue, filtrer les pistes, designer une cible ou lancer une demonstration tactique. Donnez-moi un cap plus precis.",
    action: {
      type: "none",
      target: "standby",
      parameters: {},
    },
    suggestions: [
      "Passe en vue radar",
      "Montre les navires en alerte",
      "Lance une demonstration SAR",
    ],
  });
}
