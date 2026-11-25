import type { Property } from "@/lib/types";

/**
 * Swap / reorder if the trial portal names different properties
 * (e.g. Olympic Hotel Paddington instead of Boutique Surry Hills).
 */
export const PROPERTIES: Property[] = [
  {
    id: "darling-harbour",
    name: "Azzurro Pod Hotel Darling Harbour",
    shortName: "Darling Harbour",
    address: "22 Allen Street, Pyrmont NSW 2009",
    suburb: "Pyrmont",
  },
  {
    id: "central-sydney",
    name: "Azzurro Pod Hotel Central Sydney",
    shortName: "Central Sydney",
    address: "90 Wentworth Avenue, Surry Hills NSW 2010",
    suburb: "Surry Hills",
  },
  {
    id: "potts-point",
    name: "Azzurro Pod Hotel Potts Point",
    shortName: "Potts Point",
    address: "141–143 Victoria Street, Potts Point NSW 2011",
    suburb: "Potts Point",
  },
  {
    id: "surry-hills",
    name: "Azzurro Boutique Hotel Surry Hills",
    shortName: "Boutique Surry Hills",
    address: "84 Flinders Street, Darlinghurst NSW 2010",
    suburb: "Darlinghurst",
  },
];

export const PROPERTY_BY_ID = Object.fromEntries(
  PROPERTIES.map((p) => [p.id, p]),
) as Record<Property["id"], Property>;
