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
// GROUPS, each labelled by UTC offset + a short region/country + representative
// cities + (unambiguous) abbreviations, and each carrying a rich searchTerms
// array so a familiar city/country/abbreviation/old-IANA-name resolves to the
// right group. The STORED value is always a canonical IANA identifier
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
// D1. `offset` is the zone's STANDARD-time UTC offset. It is a DISPLAY +
//     SORT key ONLY and is NEVER used for time math. All real scheduling
//     offsets are resolved DST-correctly from `ianaIdentifier` via Intl in
//     schedule/optimize-time.ts. So labelling Los Angeles "(UTC-8:00)"
//     year-round (it is -7 in summer) is the intentional, OS-picker-standard
//     convention; the (PST/PDT) abbreviation pair signals DST applies.
// D2. Entries are keyed by (standard offset + DST behaviour), NOT by offset
//     alone. Two regions that share a standard offset but differ in DST get
//     SEPARATE entries — required for correctness, because mapping a no-DST
//     recipient onto a DST IANA id (or vice-versa) is wrong by an hour for
//     half the year (US Central vs. Mexico City; Mountain vs. Arizona;
//     US Eastern vs. Bogotá; Sydney vs. Brisbane).
// D3. ONE descriptor before the em-dash (a recognised zone name like "Pacific
//     Time" / "Central European Time", OR a single country, OR a tight
//     regional pair), then representative CITIES after it. NEVER a country
//     listed alongside its own cities, never a name repeated. Offsets shared
//     by several UNRELATED sovereign nations are SPLIT into one row per
//     country/place (each storing its own IANA id) rather than jammed onto a
//     single line — owner UX call (Session 11): "totally different countries"
//     on one row read as a jumble (the old "China, Singapore, Hong Kong,
//     Taiwan, … — Beijing, Shanghai, Singapore" row that named Singapore
//     twice). Single-country / coherent-regional offsets stay one short row.
// D4. `ianaIdentifier` = the most-canonical zone for the place. The stored
//     value is always a current canonical IANA id.
// D5. Ambiguous abbreviations are omitted from labels, kept in searchTerms.
//     "CST" (US Central vs. China) → shown only for US Central. "BST"
//     (British Summer vs. Bangladesh Standard) → shown only for the UK. "IST"
//     (India / Israel) is well-known per region and intentionally appears in
//     both entries' searchTerms (see INTENTIONAL_SHARED_TERMS in the test).
//     The all-caps search rule (search.ts) matches abbreviations
//     case-sensitively, so typing "IST" finds India/Israel, not "Istanbul".
// D6. Deprecated / alternative IANA ids and obscure same-region zones are NOT
//     separate dropdown rows — they live in the relevant entry's searchTerms.
//     Typing "Calcutta", "Saigon", "Godthab" or "McMurdo" resolves to the
//     correct group.
// D7. Offset-string queries ("+5:30", "gmt+5:30", "0530") are matched at query
//     time against the `offset` field by the picker, NOT duplicated into all
//     searchTerms arrays.
// D8. No "(no DST)" notes in labels (owner UX call, Session 11 — they were
//     noise on the majority of rows). DST is signalled positively: by the
//     standard/daylight abbreviation pair (PST/PDT) where one exists, or by a
//     bare "(DST)" tag on the few DST zones with no well-known abbreviation
//     (Chile, Greenland, Azores, Chatham). The absence of any DST marker means
//     the zone is fixed-offset.
//
// Entries with thin/edge populations or imperfect folds are tagged FLAG in a
// trailing comment; see the decisions summary for the owner-review list.

/** A curated, display-friendly timezone group backed by a canonical IANA id. */
export interface CuratedTimezone {
  /** Standard-time UTC offset, zero-padded, sign always present: "+05:30",
   * "-08:00", "+00:00". DISPLAY + SORT ONLY — never used for time math (D1). */
  offset: string;

  /** The dropdown label, rendered verbatim. Format:
   * "(UTC±H:MM) Descriptor — City, City (ABBR/ABBR)". */
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
  }, // FLAG: no inhabited region — OS-picker parity only; owner kept (Session 11).
  {
    offset: "-11:00",
    label: "(UTC-11:00) American Samoa, Niue — Pago Pago",
    ianaIdentifier: "Pacific/Pago_Pago",
    searchTerms: [
      "american samoa",
      "pago pago",
      "niue",
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
      "(UTC-8:00) Pacific Time — Los Angeles, Seattle, Vancouver (PST/PDT)",
    ianaIdentifier: "America/Los_Angeles",
    searchTerms: [
      "pacific time",
      "los angeles",
      "san francisco",
      "seattle",
      "portland",
      "vancouver",
      "san diego",
      "las vegas",
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
    label: "(UTC-7:00) Mountain Time — Denver, Calgary (MST/MDT)",
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
    label: "(UTC-6:00) Central Time — Chicago, Dallas, Winnipeg (CST/CDT)",
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
  }, // D2/D3: Mexico dropped DST in 2022 — split from US Central and from Central America.
  {
    offset: "-06:00",
    label:
      "(UTC-6:00) Central America — Guatemala City, San José, San Salvador",
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
  },
  {
    offset: "-05:00",
    label: "(UTC-5:00) Eastern Time — New York, Toronto, Miami (EST/EDT)",
    ianaIdentifier: "America/New_York",
    searchTerms: [
      "eastern time",
      "new york",
      "nyc",
      "toronto",
      "ottawa",
      "washington",
      "washington dc",
      "boston",
      "miami",
      "atlanta",
      "philadelphia",
      "detroit",
      "est",
      "edt",
    ],
    abbreviations: ["EST", "EDT"],
    observesDST: true,
  },
  {
    offset: "-05:00",
    label: "(UTC-5:00) Colombia, Peru, Ecuador — Bogotá, Lima, Quito",
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
  }, // D2: no-DST -5 bloc, distinct from US Eastern. (Cuba/Havana observes DST → not here.)
  {
    offset: "-04:00",
    label: "(UTC-4:00) Atlantic Time — Halifax, Bermuda (AST/ADT)",
    ianaIdentifier: "America/Halifax",
    searchTerms: [
      "atlantic time",
      "halifax",
      "nova scotia",
      "new brunswick",
      "bermuda",
      "ast",
      "adt",
    ],
    abbreviations: ["AST", "ADT"],
    observesDST: true,
  },
  {
    offset: "-04:00",
    label: "(UTC-4:00) Venezuela, Bolivia — Caracas, La Paz",
    ianaIdentifier: "America/Caracas",
    searchTerms: [
      "venezuela",
      "caracas",
      "bolivia",
      "la paz",
      "caribbean",
      "puerto rico",
      "san juan",
      "dominican republic",
      "santo domingo",
      "guyana",
      "georgetown",
      "manaus",
      "amazonas",
    ],
    abbreviations: null,
    observesDST: false,
  }, // D2: no-DST -4 bloc, distinct from Atlantic (Halifax) and Chile (Santiago).
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
    label: "(UTC-3:00) Brazil — São Paulo, Rio de Janeiro (BRT)",
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
    label: "(UTC-3:00) Argentina, Uruguay — Buenos Aires, Montevideo",
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
  }, // D3: separate sovereign bloc from Brazil. Paraguay permanent UTC-3 since 2024. "America/Buenos_Aires" is the deprecated alias.
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
    label: "(UTC-1:00) Azores, Cape Verde — Ponta Delgada, Praia (DST)",
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
  }, // FLAG: thin. Azores observes DST; Cape Verde (folded for search) does NOT.
  {
    offset: "+00:00",
    label:
      "(UTC+0:00) United Kingdom, Ireland, Portugal — London, Dublin, Lisbon (GMT/BST)",
    ianaIdentifier: "Europe/London",
    searchTerms: [
      "united kingdom",
      "uk",
      "great britain",
      "britain",
      "england",
      "london",
      "edinburgh",
      "ireland",
      "dublin",
      "portugal",
      "lisbon",
      "lisboa",
      "gmt",
      "bst",
      "wet",
      "utc",
    ],
    abbreviations: ["GMT", "BST"],
    observesDST: true,
  },
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
    label: "(UTC+0:00) Ghana, Senegal — Accra, Dakar (GMT)",
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
    abbreviations: ["GMT"],
    observesDST: false,
  },
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
  },
  {
    offset: "+01:00",
    label: "(UTC+1:00) Nigeria, Algeria — Lagos, Algiers (WAT)",
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
    abbreviations: ["WAT"],
    observesDST: false,
  }, // D2: no-DST UTC+1, distinct from CET. Morocco (Casablanca) special-cases a Ramadan dip; folded for search.
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
    label: "(UTC+2:00) South Africa — Johannesburg, Cape Town (SAST)",
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
    label: "(UTC+3:00) Russia — Moscow, St Petersburg (MSK)",
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
    label: "(UTC+3:00) Saudi Arabia, Iraq — Riyadh, Baghdad",
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
  }, // Arabian Peninsula bloc, permanent UTC+3 no DST (Jordan/Syria 2022).
  {
    offset: "+03:00",
    label: "(UTC+3:00) East Africa — Nairobi, Addis Ababa, Dar es Salaam (EAT)",
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
    label: "(UTC+4:00) Gulf — Dubai, Abu Dhabi, Muscat (GST)",
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
  },
  {
    offset: "+04:00",
    label: "(UTC+4:00) Azerbaijan, Georgia, Armenia — Baku, Tbilisi, Yerevan",
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
  }, // "georgia" here = the country.
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
    label:
      "(UTC+5:30) India, Sri Lanka — Mumbai, Delhi, Bengaluru, Colombo (IST)",
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
      "sri lanka",
      "colombo",
      "ist",
    ],
    abbreviations: ["IST"],
    observesDST: false,
  }, // "Calcutta" (deprecated Asia/Calcutta) → resolves here; stored value is the canonical Asia/Kolkata.
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
    label: "(UTC+7:00) Thailand, Vietnam — Bangkok, Hanoi, Ho Chi Minh (ICT)",
    ianaIdentifier: "Asia/Bangkok",
    searchTerms: [
      "thailand",
      "bangkok",
      "vietnam",
      "hanoi",
      "ho chi minh",
      "ho chi minh city",
      "saigon",
      "cambodia",
      "phnom penh",
      "laos",
      "vientiane",
      "ict",
    ],
    abbreviations: ["ICT"],
    observesDST: false,
  }, // "Asia/Saigon" is the deprecated alias for Ho Chi Minh City.
  {
    offset: "+07:00",
    label: "(UTC+7:00) Indonesia (West) — Jakarta",
    ianaIdentifier: "Asia/Jakarta",
    searchTerms: ["indonesia", "jakarta", "surabaya", "bandung", "wib"],
    abbreviations: null,
    observesDST: false,
  },
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
  }, // D3/D5: split out per owner. "CST" (China) ambiguous with US Central → searchTerms only.
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
  }, // D3: split from Japan (corrects the original "Tokyo, Seoul" conflation).
  {
    offset: "+09:30",
    label: "(UTC+9:30) Australia Central — Adelaide (ACST/ACDT)",
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
      "(UTC+10:00) Australia Eastern — Sydney, Melbourne, Canberra (AEST/AEDT)",
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
    label: "(UTC+10:00) Papua New Guinea, Guam — Port Moresby, Hagåtña",
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
    label: "(UTC+11:00) Solomon Islands, New Caledonia — Honiara, Nouméa",
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
      "fiji",
      "suva",
      "nzst",
      "nzdt",
      "mcmurdo",
      "south pole",
    ],
    abbreviations: ["NZST", "NZDT"],
    observesDST: true,
  }, // McMurdo / South Pole follow NZ time — correct fold. FLAG: Fiji (folded) is now no-DST +12.
  {
    offset: "+12:45",
    label: "(UTC+12:45) Chatham Islands (NZ) — Waitangi (DST)",
    ianaIdentifier: "Pacific/Chatham",
    searchTerms: ["chatham islands", "chatham", "waitangi"],
    abbreviations: null,
    observesDST: true,
  }, // FLAG: tiny population; the only quarter-hour zone east of +12.
  {
    offset: "+13:00",
    label: "(UTC+13:00) Samoa, Tonga — Apia, Nukuʻalofa",
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
    label: "(UTC+14:00) Kiribati (Line Islands) — Kiritimati",
    ianaIdentifier: "Pacific/Kiritimati",
    searchTerms: [
      "kiribati",
      "line islands",
      "kiritimati",
      "christmas island kiribati",
      "lint",
    ],
    abbreviations: null,
    observesDST: false,
  }, // The world's easternmost offset.
];

/** Parse a "+05:30" / "-08:00" offset to signed minutes. Used for sorting and
 * by the dataset's validation tests. Throws on malformed input. */
export function offsetToMinutes(offset: string): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) throw new Error(`Malformed offset: ${offset}`);
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}
