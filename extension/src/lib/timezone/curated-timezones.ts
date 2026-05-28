// Copyright 2026 Fenil Dedhia
// SPDX-License-Identifier: Apache-2.0

// Curated timezone dataset (PRD §5.1.3 / §5.3.5 / §5.8.2 — Session 11).
//
// ─── Why this file exists ────────────────────────────────────────────────
// The shared TimezonePicker historically rendered the raw ~600-entry IANA
// list from Intl.supportedValuesOf("timeZone"), one canonical city per zone,
// alphabetically by continent. Owner testing surfaced three usability gaps:
//   1. Legacy IANA city names confuse users (Asia/Calcutta vs. Kolkata).
//   2. One city per zone hides the zone from users who search a *different*
//      city in it ("Mumbai" finds nothing — the IANA id is Asia/Calcutta).
//   3. Alphabetical-by-continent ordering buries the regions most users live
//      in behind Africa.
// This dataset replaces raw-IANA display with a curated list of timezone
// GROUPS. The STORED value is always a canonical IANA identifier
// (`ianaIdentifier`); the friendly `label` is display only.
//
// ─── Data source & verification (2026-05-20) ─────────────────────────────
// Each entry was verified against IANA tzdb conventions and current
// geopolitical reality (web-researched). Recent changes confirmed and applied:
//   • Mexico (incl. Mexico City) — no DST since Oct 2022; split from US
//     Central (which still observes DST). Border zone keeps US DST (search).
//   • Brazil — no DST since 2019.  Argentina/Uruguay/Paraguay — no DST.
//   • Iran (Tehran) — no DST since 2022 (permanent UTC+3:30).
//   • Türkiye (Istanbul), Russia (Moscow), Saudi Arabia, Iraq, Jordan, Syria
//     — permanent UTC+3, no DST.
//   • Egypt (Cairo) — DST reinstated 2023 (own schedule, separate from EU).
//   • Israel (Jerusalem) — DST on its own schedule (IST/IDT).
//   • Kazakhstan — unified to a single UTC+5 zone on 1 Mar 2024 (was +6).
//   • Greenland (Nuuk) — standard UTC-2, EU-aligned DST since 2024.
//   • Samoa, Fiji — DST suspended/abolished (now fixed offset).
//
// ─── Design decisions encoded here ───────────────────────────────────────
// D1. `offset` is the zone's STANDARD-time UTC offset. DISPLAY + SORT key
//     ONLY — never used for time math (resolved DST-correctly from
//     `ianaIdentifier` via Intl in schedule/optimize-time.ts). Labelling Los
//     Angeles "(UTC-8:00)" year-round is the OS-picker-standard convention;
//     the (PST/PDT) pair signals DST applies.
// D2. Entries are keyed by (standard offset + DST behaviour), NOT offset
//     alone — mapping a no-DST recipient onto a DST IANA id (or vice-versa)
//     is wrong by an hour for half the year (US Central vs. Mexico City;
//     Mountain vs. Arizona; US Eastern vs. Bogotá; Sydney vs. Brisbane).
// D3. LABEL GRAMMAR (owner UX, Session 11 — the cleanliness rules). After the
//     "(UTC±H:MM) " prefix, a label is exactly ONE of:
//       (a) a recognised ZONE NAME + representative cities, cities grouped
//           country-by-country, NO country names — e.g.
//           "Eastern Time — New York, Miami, Toronto (EST/EDT)";
//       (b) a SINGLE country + its own cities — e.g.
//           "India — Mumbai, Delhi, Bengaluru (IST)";
//       (c) a single place (city-state / territory) — e.g. "Singapore";
//       (d) a bare LIST OF COUNTRIES, no cities — e.g.
//           "Colombia, Peru, Ecuador" / "Saudi Arabia, Iraq, Kuwait, Qatar".
//     NEVER mix a country name with another country's cities (so India and
//     Sri Lanka are SEPARATE rows, not "India, Sri Lanka — …, Colombo"), and
//     never interleave countries' cities ("New York, Miami, Toronto", not
//     "New York, Toronto, Miami"). Multi-sovereign offsets with no dominant
//     country use form (d); where one country dominates (UAE→Dubai) it gets
//     form (b) and the rest fold into searchTerms. Every name dropped from a
//     label stays in searchTerms, so findability is unchanged.
// D4. `ianaIdentifier` = the most-canonical zone for the place. Always a
//     current canonical IANA id.
// D5. Ambiguous abbreviations are omitted from labels, kept in searchTerms.
//     "CST" (US Central vs. China) → US Central only. "BST" (British Summer
//     vs. Bangladesh) → UK only. "IST" (India / Israel) intentionally in both
//     those entries' searchTerms (Ireland's "Irish Standard Time" is NOT
//     tagged, to keep the IST set to the two well-known ones). The all-caps
//     search rule (search.ts) matches abbreviations case-sensitively, so
//     typing "IST" finds India/Israel, not "Istanbul".
// D6. Deprecated / alternative IANA ids and obscure same-region zones are NOT
//     separate dropdown rows — they live in searchTerms. Typing "Calcutta",
//     "Saigon", "Godthab" or "McMurdo" resolves to the correct group.
// D7. Offset-string queries ("+5:30", "gmt+5:30", "0530") are matched at query
//     time against the `offset` field by the picker, NOT duplicated into all
//     searchTerms arrays.
// D8. No "(no DST)" notes in labels. DST is signalled positively: the
//     standard/daylight abbreviation pair (PST/PDT) where one exists, or a
//     bare "(DST)" on the few DST zones with no well-known abbreviation
//     (Chile, Greenland, Azores, Ireland, Chatham). No marker = fixed offset.
//
// Entries with thin/edge populations or imperfect folds are tagged FLAG.

/** A curated, display-friendly timezone group backed by a canonical IANA id. */
export interface CuratedTimezone {
  /** Standard-time UTC offset, zero-padded, sign always present: "+05:30",
   * "-08:00", "+00:00". DISPLAY + SORT ONLY — never used for time math (D1). */
  offset: string;

  /** The dropdown label, rendered verbatim (see the D3 grammar). */
  label: string;

  /** Canonical IANA id stored when this entry is picked (D4). */
  ianaIdentifier: string;

  /** Lowercased match terms: cities, sovereign countries, abbreviations
   * (standard + daylight), and deprecated/alternative IANA leaf names that
   * should resolve here (D6). Offset strings are matched separately (D7). */
  searchTerms: string[];

  /** Well-known abbreviation(s), or null when none is unambiguous (D5). For
   * DST zones this is the [standard, daylight] pair (e.g. ["PST","PDT"]). */
  abbreviations: string[] | null;

  /** True if the zone observes seasonal DST; false for fixed-offset zones. */
  observesDST: boolean;
}

// Authored west → east (ascending standard offset). The picker re-sorts by
// `offset`, but keeping the source in order makes the file maintainable and
// the ascending-order test trivially meaningful.
export const CURATED_TIMEZONES: CuratedTimezone[] = [
  {
    offset: "-12:00",
    label: "(UTC-12:00) International Date Line West — Baker Island",
    ianaIdentifier: "Etc/GMT+12",
    searchTerms: [
      "international date line west",
      "baker island",
      "howland",
      "idlw",
      "dateline",
    ],
    abbreviations: null,
    observesDST: false,
  }, // FLAG: no inhabited region — OS-picker parity only.
  {
    offset: "-11:00",
    label: "(UTC-11:00) American Samoa, Niue",
    ianaIdentifier: "Pacific/Pago_Pago",
    searchTerms: [
      "american samoa",
      "pago pago",
      "niue",
      "alofi",
      "midway",
      "sst",
      "samoa standard",
    ],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "-10:00",
    label: "(UTC-10:00) Hawaii — Honolulu (HST)",
    ianaIdentifier: "Pacific/Honolulu",
    searchTerms: [
      "hawaii",
      "honolulu",
      "hst",
      "tahiti",
      "papeete",
      "french polynesia",
      "cook islands",
      "rarotonga",
    ],
    abbreviations: ["HST"],
    observesDST: false,
  },
  {
    offset: "-09:00",
    label: "(UTC-9:00) Alaska — Anchorage (AKST/AKDT)",
    ianaIdentifier: "America/Anchorage",
    searchTerms: ["alaska", "anchorage", "juneau", "fairbanks", "akst", "akdt"],
    abbreviations: ["AKST", "AKDT"],
    observesDST: true,
  },
  {
    offset: "-08:00",
    label:
      "(UTC-8:00) Pacific Time — Los Angeles, Seattle, San Diego, Vancouver (PST/PDT)",
    ianaIdentifier: "America/Los_Angeles",
    searchTerms: [
      "pacific time",
      "los angeles",
      "san francisco",
      "seattle",
      "portland",
      "san diego",
      "las vegas",
      "vancouver",
      "tijuana",
      "baja california",
      "pst",
      "pdt",
    ],
    abbreviations: ["PST", "PDT"],
    observesDST: true,
  },
  {
    offset: "-07:00",
    label:
      "(UTC-7:00) Mountain Time — Denver, Salt Lake City, Calgary (MST/MDT)",
    ianaIdentifier: "America/Denver",
    searchTerms: [
      "mountain time",
      "denver",
      "salt lake city",
      "albuquerque",
      "calgary",
      "edmonton",
      "mst",
      "mdt",
    ],
    abbreviations: ["MST", "MDT"],
    observesDST: true,
  },
  {
    offset: "-07:00",
    label: "(UTC-7:00) Arizona — Phoenix (MST)",
    ianaIdentifier: "America/Phoenix",
    searchTerms: ["arizona", "phoenix", "tucson", "mst"],
    abbreviations: ["MST"],
    observesDST: false,
  }, // D2: Arizona does not observe DST — distinct from Mountain Time (Denver).
  {
    offset: "-06:00",
    label:
      "(UTC-6:00) Central Time — Chicago, Dallas, Houston, Winnipeg (CST/CDT)",
    ianaIdentifier: "America/Chicago",
    searchTerms: [
      "central time",
      "chicago",
      "dallas",
      "houston",
      "austin",
      "san antonio",
      "new orleans",
      "winnipeg",
      "cst",
      "cdt",
    ],
    abbreviations: ["CST", "CDT"],
    observesDST: true,
  },
  {
    offset: "-06:00",
    label: "(UTC-6:00) Mexico — Mexico City, Guadalajara, Monterrey",
    ianaIdentifier: "America/Mexico_City",
    searchTerms: [
      "mexico",
      "mexico city",
      "ciudad de mexico",
      "guadalajara",
      "monterrey",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D2: Mexico dropped DST in 2022 — distinct from US Central.
  {
    offset: "-06:00",
    label: "(UTC-6:00) Guatemala, Costa Rica, El Salvador",
    ianaIdentifier: "America/Guatemala",
    searchTerms: [
      "central america",
      "guatemala",
      "guatemala city",
      "costa rica",
      "san jose",
      "el salvador",
      "san salvador",
      "honduras",
      "tegucigalpa",
      "nicaragua",
      "managua",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(d): country list — no dominant single country at -6 (no DST).
  {
    offset: "-05:00",
    label: "(UTC-5:00) Eastern Time — New York, Miami, Toronto (EST/EDT)",
    ianaIdentifier: "America/New_York",
    searchTerms: [
      "eastern time",
      "new york",
      "nyc",
      "miami",
      "boston",
      "washington",
      "washington dc",
      "atlanta",
      "philadelphia",
      "detroit",
      "toronto",
      "ottawa",
      "est",
      "edt",
    ],
    abbreviations: ["EST", "EDT"],
    observesDST: true,
  }, // D3: US cities grouped first (New York, Miami), then Canada (Toronto).
  {
    offset: "-05:00",
    label: "(UTC-5:00) Colombia, Peru, Ecuador",
    ianaIdentifier: "America/Bogota",
    searchTerms: [
      "colombia",
      "bogota",
      "peru",
      "lima",
      "ecuador",
      "quito",
      "panama",
      "panama city",
      "jamaica",
      "kingston",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(d): no-DST -5 bloc, distinct from US Eastern. (Cuba observes DST → not here.)
  {
    offset: "-04:00",
    label: "(UTC-4:00) Atlantic Time — Halifax (AST/ADT)",
    ianaIdentifier: "America/Halifax",
    searchTerms: [
      "atlantic time",
      "halifax",
      "nova scotia",
      "new brunswick",
      "bermuda",
      "hamilton",
      "ast",
      "adt",
    ],
    abbreviations: ["AST", "ADT"],
    observesDST: true,
  },
  {
    offset: "-04:00",
    label: "(UTC-4:00) Venezuela, Bolivia, Dominican Republic",
    ianaIdentifier: "America/Caracas",
    searchTerms: [
      "venezuela",
      "caracas",
      "bolivia",
      "la paz",
      "dominican republic",
      "santo domingo",
      "puerto rico",
      "san juan",
      "guyana",
      "georgetown",
      "manaus",
      "amazonas",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(d): no-DST -4 bloc, distinct from Atlantic (Halifax) and Chile.
  {
    offset: "-04:00",
    label: "(UTC-4:00) Chile — Santiago (DST)",
    ianaIdentifier: "America/Santiago",
    searchTerms: ["chile", "santiago", "valparaiso", "clt", "clst"],
    abbreviations: null,
    observesDST: true,
  }, // Southern-hemisphere DST. CLT/CLST not widely searched → searchTerms only.
  {
    offset: "-03:30",
    label: "(UTC-3:30) Newfoundland — St. John's (NST/NDT)",
    ianaIdentifier: "America/St_Johns",
    searchTerms: [
      "newfoundland",
      "st johns",
      "st. john's",
      "saint johns",
      "labrador",
      "nst",
      "ndt",
    ],
    abbreviations: ["NST", "NDT"],
    observesDST: true,
  }, // FLAG: small population but the famous North-American half-hour zone.
  {
    offset: "-03:00",
    label: "(UTC-3:00) Brazil — São Paulo, Rio de Janeiro, Brasília (BRT)",
    ianaIdentifier: "America/Sao_Paulo",
    searchTerms: [
      "brazil",
      "sao paulo",
      "são paulo",
      "rio de janeiro",
      "rio",
      "brasilia",
      "brt",
    ],
    abbreviations: ["BRT"],
    observesDST: false,
  }, // Brazil abolished DST in 2019.
  {
    offset: "-03:00",
    label: "(UTC-3:00) Argentina, Uruguay, Paraguay",
    ianaIdentifier: "America/Argentina/Buenos_Aires",
    searchTerms: [
      "argentina",
      "buenos aires",
      "buenos_aires",
      "uruguay",
      "montevideo",
      "paraguay",
      "asuncion",
      "asunción",
      "art",
      "pyt",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(d): separate sovereign bloc from Brazil. Paraguay permanent -3 since 2024. "America/Buenos_Aires" is the deprecated alias.
  {
    offset: "-02:00",
    label: "(UTC-2:00) Greenland — Nuuk (DST)",
    ianaIdentifier: "America/Nuuk",
    searchTerms: [
      "greenland",
      "nuuk",
      "godthab",
      "fernando de noronha",
      "south georgia",
    ],
    abbreviations: null,
    observesDST: true,
  }, // FLAG: Greenland spans 4 zones (Nuuk -2 ≈ 90% of population). "America/Godthab" is the deprecated alias.
  {
    offset: "-01:00",
    label: "(UTC-1:00) Azores, Cape Verde (DST)",
    ianaIdentifier: "Atlantic/Azores",
    searchTerms: [
      "azores",
      "ponta delgada",
      "cape verde",
      "cabo verde",
      "praia",
    ],
    abbreviations: null,
    observesDST: true,
  }, // FLAG: thin. Azores (the primary) observes DST; Cape Verde (folded for search) does NOT.
  {
    offset: "+00:00",
    label: "(UTC+0:00) United Kingdom — London (GMT/BST)",
    ianaIdentifier: "Europe/London",
    searchTerms: [
      "united kingdom",
      "uk",
      "great britain",
      "britain",
      "england",
      "scotland",
      "wales",
      "london",
      "edinburgh",
      "manchester",
      "gmt",
      "bst",
      "utc",
    ],
    abbreviations: ["GMT", "BST"],
    observesDST: true,
  },
  {
    offset: "+00:00",
    label: "(UTC+0:00) Ireland — Dublin (DST)",
    ianaIdentifier: "Europe/Dublin",
    searchTerms: ["ireland", "dublin", "cork"],
    abbreviations: null,
    observesDST: true,
  }, // D3(b) split from the UK. Abbr omitted: "IST" (Irish Standard Time) collides with India/Israel — bare "(DST)" signals it instead (D5/D8).
  {
    offset: "+00:00",
    label: "(UTC+0:00) Portugal — Lisbon (WET/WEST)",
    ianaIdentifier: "Europe/Lisbon",
    searchTerms: [
      "portugal",
      "lisbon",
      "lisboa",
      "porto",
      "wet",
      "west",
      "western european",
    ],
    abbreviations: ["WET", "WEST"],
    observesDST: true,
  }, // D3(b) split out.
  {
    offset: "+00:00",
    label: "(UTC+0:00) Iceland — Reykjavík (GMT)",
    ianaIdentifier: "Atlantic/Reykjavik",
    searchTerms: ["iceland", "reykjavik", "reykjavík", "gmt"],
    abbreviations: ["GMT"],
    observesDST: false,
  }, // D2: no-DST UTC+0, distinct from the UK (which observes BST).
  {
    offset: "+00:00",
    label: "(UTC+0:00) Ghana, Senegal, Côte d'Ivoire",
    ianaIdentifier: "Africa/Accra",
    searchTerms: [
      "west africa",
      "ghana",
      "accra",
      "senegal",
      "dakar",
      "ivory coast",
      "cote d'ivoire",
      "côte d'ivoire",
      "abidjan",
      "mali",
      "bamako",
      "liberia",
      "monrovia",
      "sierra leone",
      "freetown",
      "gmt",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(d): no-DST UTC+0 West Africa.
  {
    offset: "+01:00",
    label:
      "(UTC+1:00) Central European Time — Berlin, Paris, Madrid, Rome (CET/CEST)",
    ianaIdentifier: "Europe/Berlin",
    searchTerms: [
      "central european time",
      "germany",
      "berlin",
      "munich",
      "france",
      "paris",
      "spain",
      "madrid",
      "barcelona",
      "italy",
      "rome",
      "milan",
      "netherlands",
      "amsterdam",
      "belgium",
      "brussels",
      "switzerland",
      "zurich",
      "austria",
      "vienna",
      "poland",
      "warsaw",
      "sweden",
      "stockholm",
      "norway",
      "oslo",
      "denmark",
      "copenhagen",
      "cet",
      "cest",
    ],
    abbreviations: ["CET", "CEST"],
    observesDST: true,
  }, // D3(a): zone name + one major city per country (no country names on the label).
  {
    offset: "+01:00",
    label: "(UTC+1:00) Nigeria, Algeria, DR Congo",
    ianaIdentifier: "Africa/Lagos",
    searchTerms: [
      "west africa",
      "central africa",
      "nigeria",
      "lagos",
      "abuja",
      "algeria",
      "algiers",
      "democratic republic of congo",
      "drc",
      "kinshasa",
      "angola",
      "luanda",
      "cameroon",
      "douala",
      "tunisia",
      "tunis",
      "morocco",
      "casablanca",
      "wat",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D2/D3(d): no-DST UTC+1, distinct from CET. Morocco special-cases a Ramadan dip; folded for search.
  {
    offset: "+02:00",
    label:
      "(UTC+2:00) Eastern European Time — Athens, Helsinki, Bucharest, Kyiv (EET/EEST)",
    ianaIdentifier: "Europe/Athens",
    searchTerms: [
      "eastern european time",
      "greece",
      "athens",
      "finland",
      "helsinki",
      "romania",
      "bucharest",
      "ukraine",
      "kyiv",
      "kiev",
      "bulgaria",
      "sofia",
      "lithuania",
      "vilnius",
      "latvia",
      "riga",
      "estonia",
      "tallinn",
      "lebanon",
      "beirut",
      "eet",
      "eest",
    ],
    abbreviations: ["EET", "EEST"],
    observesDST: true,
  },
  {
    offset: "+02:00",
    label: "(UTC+2:00) Egypt — Cairo (EET/EEST)",
    ianaIdentifier: "Africa/Cairo",
    searchTerms: ["egypt", "cairo", "alexandria", "eet", "eest"],
    abbreviations: ["EET", "EEST"],
    observesDST: true,
  }, // D2: Egypt reinstated DST in 2023 on its OWN schedule (distinct from EU-EET dates).
  {
    offset: "+02:00",
    label: "(UTC+2:00) Israel — Jerusalem, Tel Aviv (IST/IDT)",
    ianaIdentifier: "Asia/Jerusalem",
    searchTerms: ["israel", "jerusalem", "tel aviv", "ist", "idt"],
    abbreviations: ["IST", "IDT"],
    observesDST: true,
  }, // D5: "IST" (Israel Standard Time) intentionally collides with India's IST.
  {
    offset: "+02:00",
    label: "(UTC+2:00) South Africa — Johannesburg, Cape Town, Pretoria (SAST)",
    ianaIdentifier: "Africa/Johannesburg",
    searchTerms: [
      "south africa",
      "johannesburg",
      "cape town",
      "pretoria",
      "durban",
      "zimbabwe",
      "harare",
      "zambia",
      "lusaka",
      "sast",
    ],
    abbreviations: ["SAST"],
    observesDST: false,
  }, // D2: no-DST UTC+2, distinct from EET/Egypt/Israel.
  {
    offset: "+03:00",
    label: "(UTC+3:00) Russia — Moscow, Saint Petersburg (MSK)",
    ianaIdentifier: "Europe/Moscow",
    searchTerms: [
      "moscow",
      "russia",
      "saint petersburg",
      "st petersburg",
      "msk",
    ],
    abbreviations: ["MSK"],
    observesDST: false,
  }, // Permanent UTC+3 since 2014.
  {
    offset: "+03:00",
    label: "(UTC+3:00) Türkiye — Istanbul, Ankara",
    ianaIdentifier: "Europe/Istanbul",
    searchTerms: ["turkey", "türkiye", "turkiye", "istanbul", "ankara", "trt"],
    abbreviations: null,
    observesDST: false,
  }, // Permanent UTC+3 since 2016. (D5: case-sensitive all-caps search keeps "IST" off "Istanbul".)
  {
    offset: "+03:00",
    label: "(UTC+3:00) Saudi Arabia, Iraq, Kuwait, Qatar",
    ianaIdentifier: "Asia/Riyadh",
    searchTerms: [
      "saudi arabia",
      "riyadh",
      "jeddah",
      "iraq",
      "baghdad",
      "kuwait",
      "qatar",
      "doha",
      "bahrain",
      "manama",
      "jordan",
      "amman",
      "syria",
      "damascus",
      "ast",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(d): Arabian Peninsula bloc, permanent UTC+3 no DST (Jordan/Syria 2022).
  {
    offset: "+03:00",
    label: "(UTC+3:00) Kenya, Ethiopia, Tanzania (EAT)",
    ianaIdentifier: "Africa/Nairobi",
    searchTerms: [
      "east africa",
      "kenya",
      "nairobi",
      "ethiopia",
      "addis ababa",
      "tanzania",
      "dar es salaam",
      "uganda",
      "kampala",
      "somalia",
      "mogadishu",
      "eat",
    ],
    abbreviations: ["EAT"],
    observesDST: false,
  },
  {
    offset: "+03:30",
    label: "(UTC+3:30) Iran — Tehran",
    ianaIdentifier: "Asia/Tehran",
    searchTerms: ["iran", "tehran", "irst", "irdt"],
    abbreviations: null,
    observesDST: false,
  }, // Iran abolished DST in 2022 — the only +3:30 zone in use.
  {
    offset: "+04:00",
    label: "(UTC+4:00) United Arab Emirates — Dubai, Abu Dhabi (GST)",
    ianaIdentifier: "Asia/Dubai",
    searchTerms: [
      "gulf",
      "uae",
      "united arab emirates",
      "dubai",
      "abu dhabi",
      "oman",
      "muscat",
      "mauritius",
      "réunion",
      "reunion",
      "gst",
    ],
    abbreviations: ["GST"],
    observesDST: false,
  }, // D3(b): UAE leads (Dubai); Oman/Mauritius fold into search.
  {
    offset: "+04:00",
    label: "(UTC+4:00) Azerbaijan, Georgia, Armenia",
    ianaIdentifier: "Asia/Baku",
    searchTerms: [
      "azerbaijan",
      "baku",
      "georgia",
      "tbilisi",
      "armenia",
      "yerevan",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(d): Caucasus. "georgia" here = the country.
  {
    offset: "+04:30",
    label: "(UTC+4:30) Afghanistan — Kabul",
    ianaIdentifier: "Asia/Kabul",
    searchTerms: ["afghanistan", "kabul", "aft"],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+05:00",
    label: "(UTC+5:00) Pakistan — Karachi, Islamabad, Lahore (PKT)",
    ianaIdentifier: "Asia/Karachi",
    searchTerms: ["pakistan", "karachi", "islamabad", "lahore", "pkt"],
    abbreviations: ["PKT"],
    observesDST: false,
  },
  {
    offset: "+05:00",
    label: "(UTC+5:00) Kazakhstan — Almaty, Astana",
    ianaIdentifier: "Asia/Almaty",
    searchTerms: ["kazakhstan", "almaty", "astana", "nur-sultan", "shymkent"],
    abbreviations: null,
    observesDST: false,
  }, // Kazakhstan unified to a single UTC+5 zone on 1 Mar 2024 (was +6).
  {
    offset: "+05:00",
    label: "(UTC+5:00) Uzbekistan — Tashkent",
    ianaIdentifier: "Asia/Tashkent",
    searchTerms: [
      "uzbekistan",
      "tashkent",
      "turkmenistan",
      "ashgabat",
      "maldives",
      "male",
    ],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+05:30",
    label: "(UTC+5:30) India — Mumbai, Delhi, Bengaluru, Kolkata (IST)",
    ianaIdentifier: "Asia/Kolkata",
    searchTerms: [
      "india",
      "mumbai",
      "bombay",
      "delhi",
      "new delhi",
      "bengaluru",
      "bangalore",
      "kolkata",
      "calcutta",
      "chennai",
      "madras",
      "hyderabad",
      "pune",
      "ist",
    ],
    abbreviations: ["IST"],
    observesDST: false,
  }, // "Calcutta" (deprecated Asia/Calcutta) → resolves here; stored value is the canonical Asia/Kolkata.
  {
    offset: "+05:30",
    label: "(UTC+5:30) Sri Lanka — Colombo",
    ianaIdentifier: "Asia/Colombo",
    searchTerms: ["sri lanka", "colombo", "ceylon"],
    abbreviations: null,
    observesDST: false,
  }, // D3(b): split from India (owner UX — "India, Sri Lanka — …, Colombo" was ambiguous).
  {
    offset: "+05:45",
    label: "(UTC+5:45) Nepal — Kathmandu",
    ianaIdentifier: "Asia/Kathmandu",
    searchTerms: ["nepal", "kathmandu", "katmandu", "npt"],
    abbreviations: null,
    observesDST: false,
  }, // "Asia/Katmandu" is the deprecated alias. Only +5:45 zone in use.
  {
    offset: "+06:00",
    label: "(UTC+6:00) Bangladesh — Dhaka",
    ianaIdentifier: "Asia/Dhaka",
    searchTerms: [
      "bangladesh",
      "dhaka",
      "dacca",
      "bhutan",
      "thimphu",
      "kyrgyzstan",
      "bishkek",
      "bst",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D5: "BST" (Bangladesh Standard Time) collides with British Summer Time → searchTerms only.
  {
    offset: "+06:30",
    label: "(UTC+6:30) Myanmar — Yangon",
    ianaIdentifier: "Asia/Yangon",
    searchTerms: [
      "myanmar",
      "burma",
      "yangon",
      "rangoon",
      "mmt",
      "cocos islands",
    ],
    abbreviations: null,
    observesDST: false,
  }, // "Asia/Rangoon" is the deprecated alias.
  {
    offset: "+07:00",
    label: "(UTC+7:00) Thailand — Bangkok",
    ianaIdentifier: "Asia/Bangkok",
    searchTerms: [
      "thailand",
      "bangkok",
      "cambodia",
      "phnom penh",
      "laos",
      "vientiane",
      "ict",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(b) split from Vietnam. Cambodia/Laos (also ICT) fold into search.
  {
    offset: "+07:00",
    label: "(UTC+7:00) Vietnam — Hanoi, Ho Chi Minh City",
    ianaIdentifier: "Asia/Ho_Chi_Minh",
    searchTerms: [
      "vietnam",
      "hanoi",
      "ho chi minh",
      "ho chi minh city",
      "saigon",
    ],
    abbreviations: null,
    observesDST: false,
  }, // "Asia/Saigon" is the deprecated alias for Ho Chi Minh City.
  {
    offset: "+07:00",
    label: "(UTC+7:00) Indonesia — Jakarta",
    ianaIdentifier: "Asia/Jakarta",
    searchTerms: ["indonesia", "jakarta", "surabaya", "bandung", "wib"],
    abbreviations: null,
    observesDST: false,
  }, // Western Indonesia (WIB).
  {
    offset: "+08:00",
    label: "(UTC+8:00) China — Beijing, Shanghai, Shenzhen",
    ianaIdentifier: "Asia/Shanghai",
    searchTerms: [
      "china",
      "beijing",
      "shanghai",
      "shenzhen",
      "guangzhou",
      "chengdu",
      "cst",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D5: "CST" (China) ambiguous with US Central → searchTerms only.
  {
    offset: "+08:00",
    label: "(UTC+8:00) Hong Kong",
    ianaIdentifier: "Asia/Hong_Kong",
    searchTerms: ["hong kong", "hongkong", "hkt", "macau", "macao"],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+08:00",
    label: "(UTC+8:00) Singapore",
    ianaIdentifier: "Asia/Singapore",
    searchTerms: ["singapore", "sgt"],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+08:00",
    label: "(UTC+8:00) Taiwan — Taipei",
    ianaIdentifier: "Asia/Taipei",
    searchTerms: ["taiwan", "taipei", "kaohsiung"],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+08:00",
    label: "(UTC+8:00) Philippines — Manila",
    ianaIdentifier: "Asia/Manila",
    searchTerms: [
      "philippines",
      "manila",
      "quezon city",
      "cebu",
      "davao",
      "pht",
    ],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+08:00",
    label: "(UTC+8:00) Malaysia — Kuala Lumpur",
    ianaIdentifier: "Asia/Kuala_Lumpur",
    searchTerms: [
      "malaysia",
      "kuala lumpur",
      "brunei",
      "bandar seri begawan",
      "myt",
    ],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+08:00",
    label: "(UTC+8:00) Western Australia — Perth (AWST)",
    ianaIdentifier: "Australia/Perth",
    searchTerms: ["western australia", "perth", "awst"],
    abbreviations: ["AWST"],
    observesDST: false,
  },
  {
    offset: "+09:00",
    label: "(UTC+9:00) Japan — Tokyo, Osaka (JST)",
    ianaIdentifier: "Asia/Tokyo",
    searchTerms: ["japan", "tokyo", "osaka", "kyoto", "yokohama", "jst"],
    abbreviations: ["JST"],
    observesDST: false,
  },
  {
    offset: "+09:00",
    label: "(UTC+9:00) South Korea — Seoul (KST)",
    ianaIdentifier: "Asia/Seoul",
    searchTerms: ["south korea", "korea", "seoul", "busan", "incheon", "kst"],
    abbreviations: ["KST"],
    observesDST: false,
  }, // D3(b): split from Japan (corrects the original "Tokyo, Seoul" conflation).
  {
    offset: "+09:30",
    label: "(UTC+9:30) Australia (Central) — Adelaide (ACST/ACDT)",
    ianaIdentifier: "Australia/Adelaide",
    searchTerms: [
      "australia central",
      "adelaide",
      "south australia",
      "broken hill",
      "darwin",
      "northern territory",
      "acst",
      "acdt",
    ],
    abbreviations: ["ACST", "ACDT"],
    observesDST: true,
  }, // FLAG: Adelaide observes DST; Darwin / NT (folded for search) do NOT.
  {
    offset: "+10:00",
    label:
      "(UTC+10:00) Australia (Eastern) — Sydney, Melbourne, Canberra (AEST/AEDT)",
    ianaIdentifier: "Australia/Sydney",
    searchTerms: [
      "australia eastern",
      "sydney",
      "melbourne",
      "canberra",
      "new south wales",
      "victoria",
      "tasmania",
      "hobart",
      "aest",
      "aedt",
    ],
    abbreviations: ["AEST", "AEDT"],
    observesDST: true,
  },
  {
    offset: "+10:00",
    label: "(UTC+10:00) Queensland — Brisbane (AEST)",
    ianaIdentifier: "Australia/Brisbane",
    searchTerms: ["queensland", "brisbane", "gold coast", "aest"],
    abbreviations: ["AEST"],
    observesDST: false,
  }, // D2: Queensland does not observe DST — distinct from NSW/Victoria (Sydney).
  {
    offset: "+10:00",
    label: "(UTC+10:00) Papua New Guinea, Guam",
    ianaIdentifier: "Pacific/Port_Moresby",
    searchTerms: [
      "papua new guinea",
      "port moresby",
      "guam",
      "hagatna",
      "hagåtña",
      "chuuk",
      "chst",
      "chamorro",
    ],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+11:00",
    label: "(UTC+11:00) Solomon Islands, New Caledonia",
    ianaIdentifier: "Pacific/Guadalcanal",
    searchTerms: [
      "solomon islands",
      "honiara",
      "new caledonia",
      "noumea",
      "nouméa",
      "vanuatu",
      "port vila",
    ],
    abbreviations: null,
    observesDST: false,
  },
  {
    offset: "+12:00",
    label: "(UTC+12:00) New Zealand — Auckland, Wellington (NZST/NZDT)",
    ianaIdentifier: "Pacific/Auckland",
    searchTerms: [
      "new zealand",
      "auckland",
      "wellington",
      "christchurch",
      "nzst",
      "nzdt",
      "mcmurdo",
      "south pole",
    ],
    abbreviations: ["NZST", "NZDT"],
    observesDST: true,
  }, // McMurdo / South Pole follow NZ time — correct fold.
  {
    offset: "+12:00",
    label: "(UTC+12:00) Fiji, Marshall Islands, Kiribati",
    ianaIdentifier: "Pacific/Fiji",
    searchTerms: [
      "fiji",
      "suva",
      "marshall islands",
      "majuro",
      "kwajalein",
      "kiribati",
      "tarawa",
      "gilbert islands",
      "tuvalu",
      "funafuti",
      "nauru",
      "wallis",
      "wake island",
      "kamchatka",
      "petropavlovsk",
      "anadyr",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D3(d): the +12 NO-DST bloc (closes the coverage gap; gives Fiji a correct home rather than folding to NZ/DST). Russia Far East (Kamchatka/Anadyr) folds into search.
  {
    offset: "+12:45",
    label: "(UTC+12:45) Chatham Islands — Waitangi (DST)",
    ianaIdentifier: "Pacific/Chatham",
    searchTerms: ["chatham islands", "chatham", "waitangi"],
    abbreviations: null,
    observesDST: true,
  }, // FLAG: tiny population; the only quarter-hour zone east of +12.
  {
    offset: "+13:00",
    label: "(UTC+13:00) Samoa, Tonga",
    ianaIdentifier: "Pacific/Apia",
    searchTerms: [
      "samoa",
      "apia",
      "tonga",
      "nuku'alofa",
      "nukualofa",
      "tokelau",
    ],
    abbreviations: null,
    observesDST: false,
  }, // Samoa abolished DST; now fixed UTC+13.
  {
    offset: "+14:00",
    label: "(UTC+14:00) Kiribati — Kiritimati",
    ianaIdentifier: "Pacific/Kiritimati",
    searchTerms: [
      "line islands",
      "kiritimati",
      "christmas island kiribati",
      "lint",
    ],
    abbreviations: null,
    observesDST: false,
  }, // The world's easternmost offset. ("kiribati" → the +12 Gilbert Islands row where most Kiribati live; "christmas island kiribati" still finds this Line Islands row.)
];

/** Parse a "+05:30" / "-08:00" offset to signed minutes. Used for sorting and
 * by the dataset's validation tests. Throws on malformed input. */
export function offsetToMinutes(offset: string): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) throw new Error(`Malformed offset: ${offset}`);
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}
