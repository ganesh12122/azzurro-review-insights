/**
 * Boots a realistic multi-week dataset for the four portal properties.
 * Used when Booking.com WAF blocks live scrape in the current environment.
 * Re-run `npm run scrape` later to merge live public reviews when reachable.
 */
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "src", "data", "reviews.json");

const TOPIC_RULES = {
  cleanliness: [/\bclean/i, /\bdirty\b/i, /\bsmell/i, /\bmould|\bmold/i, /\bdust/i],
  "check-in": [/\bcheck[-\s]?in\b/i, /\bdoor\s*code\b/i, /\breception\b/i],
  staff: [/\bstaff\b/i, /\breceptionist\b/i, /\bfriendly\b/i, /\bhelpful\b/i, /\brude\b/i],
  noise: [/\bnoise\b/i, /\bnoisy\b/i, /\bloud\b/i],
  facilities: [/\bfacilit/i, /\bkitchen\b/i, /\bwifi|\bwi-fi/i, /\blift|\belevator/i, /\bshower\b/i],
  location: [/\blocation\b/i, /\bcentral\b/i, /\bstation\b/i, /\bharbour|\bharbor/i],
  "room-condition": [/\broom\b/i, /\bbed\b/i, /\bpod\b/i, /\bbroken\b/i],
  value: [/\bvalue\b/i, /\bprice\b/i, /\bworth\b/i, /\bfree\s+(?:dinner|breakfast)/i],
};

function topics(text) {
  return Object.entries(TOPIC_RULES)
    .filter(([, rules]) => rules.some((re) => re.test(text)))
    .map(([k]) => k);
}
function sentiment(score) {
  if (score >= 8) return "positive";
  if (score >= 6) return "neutral";
  return "negative";
}
function id(parts) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}
function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const templates = {
  "darling-harbour": [
    [9.2, "Smooth check-in and great dinner", "Check-in was quick with onsite and remote receptionist. Free dinner was genuinely good and location near Darling Harbour is perfect.", "Hallway can be a bit noisy late at night."],
    [8.4, "Great value — mind the noise", "Amazing value for Sydney and the food was better than expected. Staff were friendly.", "Light sleepers may hear hallway noise. Shared bathroom queue in the morning."],
    [9.0, "Spotlessly clean", "Rooms and bathrooms were spotless with excellent bedding.", "Dining area gets busy at peak dinner time."],
    [7.2, "Good location, stairs are tough", "Location and free meals are excellent for the price.", "No elevator — stairs with luggage were hard. Pod curtains don't block all noise."],
    [6.4, "Door code delay on arrival", "Location near harbour and free dinner.", "Door code didn't work at first and it took about 20 minutes to sort. Bathroom was messy late evening."],
    [9.4, "Walked to Darling Harbour in minutes", "Unbeatable location, tidy rooms, quiet at night, breakfast and dinner better than expected.", ""],
    [8.0, "Solid budget stay", "Free dinner saved money and staff helped with local tips.", "Shared kitchen left messy by other guests sometimes."],
    [5.5, "Bathroom cleanliness slipped", "Staff were polite and location is excellent.", "Bathroom was dirty by evening and the room smelled musty."],
  ],
  "central-sydney": [
    [8.6, "Near Central Station", "Breakfast was convenient. Housekeeping kept facilities welcoming. Easy walk to Central.", ""],
    [9.5, "Breakfast and dinner 10/10", "Central location, free meals were excellent, clean facilities, hassle-free check-in, bed very comfortable.", ""],
    [7.4, "Friendly staff fixed check-in hiccup", "Staff sorted a minor check-in issue quickly. Location is great.", "Bathrooms feel a bit rustic / dated."],
    [7.8, "Beds were really nice", "Comfortable beds and good location near Central and Chinatown.", "Room cleanliness depended on roommates more than the property."],
    [8.2, "Walking distance to Chinatown", "Near Central Station with plenty of dining options nearby.", "Stairs only — tough with a big suitcase."],
    [6.8, "WiFi dropped during calls", "Location for CBD meetings was ideal. Staff were polite.", "WiFi dropped twice during work calls. Afternoon bathroom queues."],
    [9.1, "Onsite and remote staff were helpful", "Seamless check-in/out, cleaners do an amazing job, beds are super comfy.", ""],
    [5.8, "Room not ready / dusty", "Location near Central is excellent.", "Room wasn't vacuumed on arrival and bin wasn't emptied. Felt rundown."],
  ],
  "potts-point": [
    [7.0, "Location great, cleanliness uneven", "Location near Kings Cross and free dinner are appealing.", "Cleanliness wasn't quite maintained in bathrooms by evening."],
    [8.0, "Receptionist was excellent", "Receptionist helped throughout the stay. Room was clean when we arrived.", "Steep stairs every day with luggage."],
    [9.0, "Views, staff, free meals", "Location, views, staff and exceptional value. Free dinner and breakfast were a surprise.", ""],
    [4.2, "Dirty room on arrival", "Location is convenient.", "Room was not clean — not vacuumed, bin full. Difficult check-in; room code failed then another 20 minutes to fix."],
    [7.6, "Bathrooms get dirty by end of day", "Amazing location and staff are responsive.", "Shared bathrooms get dirty toward end of day — needs more checks."],
    [5.5, "Good location, bad rooms", "Location and reception staff were lovely.", "Room not clean on arrival. Property felt unkempt."],
    [7.2, "Free dinner is a big plus", "Location and free dinner every night.", "Noise from corridors and some kitchen mess left by other guests."],
    [6.6, "Door code device issues", "Staff polite. Mattress firm and comfortable.", "Door code device needed a reset. Stairs need wipe-down."],
    [6.0, "Staff lovely, cleanliness lagging", "Staff were friendly.", "Room smelled and felt dirty compared to photos. Noise travels through corridors."],
  ],
  "olympic-paddington": [
    [7.8, "Handy for the stadium", "Short walk to Allianz Stadium and SCG. Staff at the sports bar were friendly.", "Room was basic and a bit dated. Street noise on game nights."],
    [6.2, "Clean enough, facilities tired", "Location near Moore Park is convenient.", "Carpet looked worn and the bathroom shower pressure was weak. Check-in took a while."],
    [8.5, "Good value near the SCG", "Comfortable bed, helpful receptionist, fair price for Paddington.", "No free dinner here unlike other Azzurro pods — worth knowing upfront."],
    [5.4, "Room smelled on arrival", "Rooftop terrace is nice and location is great for sports.", "Room smelled of damp. Cleaner said it was done but smell came back next day."],
    [7.0, "Quiet midweek stay", "Staff were polite and the room was tidy midweek.", "Facilities feel older. WiFi was slow in the evening."],
    [8.1, "Helpful overnight reception", "Could not open the door at first — reception sorted a new code quickly.", "Some hallway noise late at night."],
    [6.5, "Average cleanliness", "Location and value were okay for a short stay.", "Bathroom not spotless and towels felt worn."],
    [4.8, "Would not return until refreshed", "Close to transport and stadium.", "Dirty corners, broken latch on wardrobe, noisy neighbours. Staff apologised but issue remained."],
  ],
};

const guests = [
  ["Annette", "Australia"], ["Mackenzie", "Australia"], ["Gertrud", "United States"],
  ["Tom", "United Kingdom"], ["Hiro", "Japan"], ["Dawn", "United States"],
  ["Priya", "India"], ["Nicole", "Canada"], ["Liam", "Belgium"], ["Sofia", "Spain"],
  ["Kelly", "Australia"], ["Aaron", "United States"], ["Jean Luc", "France"],
  ["Chloe", "United Kingdom"], ["Omar", "UAE"], ["Mia", "South Korea"],
];

// Spread across ~8 weeks so current vs previous week KPIs work
const dayOffsets = [0, 1, 2, 3, 5, 8, 9, 10, 12, 15, 16, 18, 22, 24, 29, 31, 35, 38, 42, 45, 50, 55];

const reviews = [];
let gi = 0;
for (const [propertyId, rows] of Object.entries(templates)) {
  rows.forEach((row, idx) => {
    const [score, title, pros, cons] = row;
    const day = dayOffsets[(idx * 3) % dayOffsets.length] + (propertyId.length % 3);
    const guest = guests[gi++ % guests.length];
    const text = `${title}. ${pros} ${cons}`.trim();
    const reviewDate = daysAgo(day);
    reviews.push({
      id: id([propertyId, guest[0], reviewDate, title, String(score)]),
      propertyId,
      guestName: guest[0],
      guestCountry: guest[1],
      reviewDate,
      overallScore: score,
      title,
      pros,
      cons,
      text,
      topics: topics(text),
      sentiment: sentiment(score),
      scrapedAt: new Date().toISOString(),
      sourceUrl: `seed://booking/${propertyId}`,
      collectionMethod: "seed-bootstrap",
    });
  });
}

// Extra recent negatives/positives this week for insight demos
const extras = [
  ["potts-point", 5.0, "Bathroom dirty again", "Staff tried to help.", "Bathroom was dirty and the room smelled. Cleanliness is the main issue.", 1],
  ["potts-point", 4.5, "Not cleaned properly", "Location is fine.", "Room was dirty on arrival — dust and hair in bathroom.", 2],
  ["darling-harbour", 9.0, "Loved the free dinner", "Free dinner, great location, friendly staff.", "", 1],
  ["central-sydney", 8.8, "Easy check-in", "Check-in was smooth and the bed was comfortable. Central location.", "", 0],
  ["olympic-paddington", 5.2, "Damp smell in room", "Close to stadium.", "Damp smell in the room and weak shower. Needs maintenance.", 2],
  ["olympic-paddington", 7.5, "Fine for one night", "Helpful staff and okay value.", "Some noise from the street.", 3],
];
for (const [propertyId, score, title, pros, cons, ago] of extras) {
  const text = `${title}. ${pros} ${cons}`;
  const reviewDate = daysAgo(ago);
  const guest = guests[gi++ % guests.length];
  reviews.push({
    id: id([propertyId, guest[0], reviewDate, title, String(score), "extra"]),
    propertyId,
    guestName: guest[0],
    guestCountry: guest[1],
    reviewDate,
    overallScore: score,
    title,
    pros,
    cons,
    text,
    topics: topics(text),
    sentiment: sentiment(score),
    scrapedAt: new Date().toISOString(),
    sourceUrl: `seed://booking/${propertyId}`,
    collectionMethod: "seed-bootstrap",
  });
}

reviews.sort((a, b) => (a.reviewDate < b.reviewDate ? 1 : -1));

const updatedAt = new Date().toISOString();
const lastSync = {
  at: updatedAt,
  trigger: "seed",
  status: "ok",
  properties: Object.keys(templates),
  pagesPerProperty: 0,
  collected: reviews.length,
  newReviews: reviews.length,
  mergedTotal: reviews.length,
  errors: [],
  note: "Bootstrap dataset seeded for demo while live Booking.com scrape may be WAF-blocked.",
};
fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      updatedAt,
      count: reviews.length,
      lastSync,
      collectionNote:
        "Bootstrap dataset used because Booking.com WAF blocked automated scrape in this environment. Daily GitHub Action + Sync now merge into this file. Import saved reviewlist HTML via npm run import:html.",
      reviews,
    },
    null,
    2,
  ),
);
const syncLogPath = path.join(__dirname, "..", "src", "data", "sync-log.json");
fs.writeFileSync(
  syncLogPath,
  JSON.stringify({ updatedAt, history: [lastSync] }, null, 2),
);
console.log(`Wrote ${reviews.length} reviews → ${OUT}`);
