import type { Property } from "@/lib/types";

/** Official trial properties from the portal brief. */
export const PROPERTIES: Property[] = [
  {
    id: "olympic-paddington",
    name: "Olympic Hotel Paddington",
    shortName: "Olympic Paddington",
    bookingSlug: "olympic-paddington",
    bookingUrl: "https://www.booking.com/hotel/au/olympic-paddington.html",
    suburb: "Paddington",
  },
  {
    id: "potts-point",
    name: "Azzurro Pod Hotel Potts Point",
    shortName: "Potts Point",
    bookingSlug: "venus-potts-point-sydney",
    bookingUrl: "https://www.booking.com/hotel/au/venus-potts-point-sydney.html",
    suburb: "Potts Point",
  },
  {
    id: "central-sydney",
    name: "Azzurro Pod Hotel Central Sydney",
    shortName: "Central Sydney",
    bookingSlug: "venus-surry-hills",
    bookingUrl: "https://www.booking.com/hotel/au/venus-surry-hills.html",
    suburb: "Surry Hills",
  },
  {
    id: "darling-harbour",
    name: "Azzurro Pod Hotel Darling Harbour",
    shortName: "Darling Harbour",
    bookingSlug: "chateau-de-venus",
    bookingUrl: "https://www.booking.com/hotel/au/chateau-de-venus.html",
    suburb: "Pyrmont",
  },
];

export const PROPERTY_BY_ID = Object.fromEntries(
  PROPERTIES.map((p) => [p.id, p]),
) as Record<Property["id"], Property>;
