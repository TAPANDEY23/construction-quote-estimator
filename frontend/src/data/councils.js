/**
 * Postcode → Council planning controls (NSW primary, other states via defaults).
 * FSR = Floor Space Ratio (e.g. 0.55 means 550m² floor on a 1000m² block).
 * Source: NSW LEP data, approximate for common residential zones (R2/R3).
 */

const NSW_POSTCODES = {
  // ── Blacktown City ──────────────────────────────────────────
  2145: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2146: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2147: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2148: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2760: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2761: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2763: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2765: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2766: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2767: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2768: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2770: { council: 'Blacktown City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },

  // ── Penrith City ────────────────────────────────────────────
  2745: { council: 'Penrith City',       fsr: 0.50, heightM: 8,  coverage: 0.50 },
  2747: { council: 'Penrith City',       fsr: 0.50, heightM: 8,  coverage: 0.50 },
  2748: { council: 'Penrith City',       fsr: 0.50, heightM: 8,  coverage: 0.50 },
  2749: { council: 'Penrith City',       fsr: 0.50, heightM: 8,  coverage: 0.50 },
  2750: { council: 'Penrith City',       fsr: 0.50, heightM: 8,  coverage: 0.50 },
  2751: { council: 'Penrith City',       fsr: 0.50, heightM: 8,  coverage: 0.50 },
  2753: { council: 'Penrith City',       fsr: 0.50, heightM: 8,  coverage: 0.50 },

  // ── Parramatta City ─────────────────────────────────────────
  2150: { council: 'City of Parramatta', fsr: 0.60, heightM: 9,  coverage: 0.55 },
  2151: { council: 'City of Parramatta', fsr: 0.60, heightM: 9,  coverage: 0.55 },
  2152: { council: 'City of Parramatta', fsr: 0.60, heightM: 9,  coverage: 0.55 },
  2153: { council: 'City of Parramatta', fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2154: { council: 'City of Parramatta', fsr: 0.50, heightM: 9,  coverage: 0.50 },
  2155: { council: 'City of Parramatta', fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2160: { council: 'City of Parramatta', fsr: 0.60, heightM: 9,  coverage: 0.55 },
  2161: { council: 'City of Parramatta', fsr: 0.55, heightM: 9,  coverage: 0.50 },

  // ── Liverpool City ──────────────────────────────────────────
  2168: { council: 'Liverpool City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2170: { council: 'Liverpool City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2171: { council: 'Liverpool City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2172: { council: 'Liverpool City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2174: { council: 'Liverpool City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2176: { council: 'Liverpool City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },

  // ── The Hills Shire ─────────────────────────────────────────
  2153: { council: 'The Hills Shire',    fsr: 0.40, heightM: 8,  coverage: 0.45 },
  2155: { council: 'The Hills Shire',    fsr: 0.40, heightM: 8,  coverage: 0.45 },
  2156: { council: 'The Hills Shire',    fsr: 0.40, heightM: 8,  coverage: 0.45 },
  2157: { council: 'The Hills Shire',    fsr: 0.35, heightM: 8,  coverage: 0.40 },
  2158: { council: 'The Hills Shire',    fsr: 0.40, heightM: 8,  coverage: 0.45 },
  2159: { council: 'The Hills Shire',    fsr: 0.40, heightM: 8,  coverage: 0.45 },
  2154: { council: 'The Hills Shire',    fsr: 0.35, heightM: 8,  coverage: 0.40 },

  // ── Canterbury-Bankstown ────────────────────────────────────
  2193: { council: 'Canterbury-Bankstown', fsr: 0.55, heightM: 9, coverage: 0.50 },
  2194: { council: 'Canterbury-Bankstown', fsr: 0.55, heightM: 9, coverage: 0.50 },
  2195: { council: 'Canterbury-Bankstown', fsr: 0.55, heightM: 9, coverage: 0.50 },
  2196: { council: 'Canterbury-Bankstown', fsr: 0.55, heightM: 9, coverage: 0.50 },
  2200: { council: 'Canterbury-Bankstown', fsr: 0.55, heightM: 9, coverage: 0.50 },
  2202: { council: 'Canterbury-Bankstown', fsr: 0.55, heightM: 9, coverage: 0.50 },
  2206: { council: 'Canterbury-Bankstown', fsr: 0.60, heightM: 9, coverage: 0.55 },

  // ── Fairfield City ──────────────────────────────────────────
  2165: { council: 'Fairfield City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2166: { council: 'Fairfield City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2167: { council: 'Fairfield City',     fsr: 0.55, heightM: 9,  coverage: 0.50 },

  // ── Camden / Campbelltown ───────────────────────────────────
  2560: { council: 'Campbelltown City',  fsr: 0.50, heightM: 8,  coverage: 0.50 },
  2567: { council: 'Camden Council',     fsr: 0.50, heightM: 8,  coverage: 0.50 },
  2570: { council: 'Camden Council',     fsr: 0.50, heightM: 8,  coverage: 0.50 },

  // ── Sutherland Shire ────────────────────────────────────────
  2217: { council: 'Sutherland Shire',   fsr: 0.50, heightM: 9,  coverage: 0.50 },
  2220: { council: 'Sutherland Shire',   fsr: 0.50, heightM: 9,  coverage: 0.50 },
  2221: { council: 'Sutherland Shire',   fsr: 0.50, heightM: 9,  coverage: 0.50 },
  2229: { council: 'Sutherland Shire',   fsr: 0.50, heightM: 9,  coverage: 0.50 },
  2230: { council: 'Sutherland Shire',   fsr: 0.50, heightM: 9,  coverage: 0.50 },

  // ── Georges River ───────────────────────────────────────────
  2207: { council: 'Georges River',      fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2209: { council: 'Georges River',      fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2210: { council: 'Georges River',      fsr: 0.55, heightM: 9,  coverage: 0.50 },
  2213: { council: 'Georges River',      fsr: 0.55, heightM: 9,  coverage: 0.50 },

  // ── Hornsby Shire ───────────────────────────────────────────
  2076: { council: 'Hornsby Shire',      fsr: 0.40, heightM: 8,  coverage: 0.45 },
  2077: { council: 'Hornsby Shire',      fsr: 0.40, heightM: 8,  coverage: 0.45 },
  2120: { council: 'Hornsby Shire',      fsr: 0.40, heightM: 8,  coverage: 0.45 },
  2126: { council: 'Hornsby Shire',      fsr: 0.40, heightM: 8,  coverage: 0.45 },

  // ── Northern Beaches ────────────────────────────────────────
  2086: { council: 'Northern Beaches',   fsr: 0.45, heightM: 8,  coverage: 0.45 },
  2088: { council: 'Northern Beaches',   fsr: 0.50, heightM: 9,  coverage: 0.50 },
  2095: { council: 'Northern Beaches',   fsr: 0.50, heightM: 9,  coverage: 0.50 },
  2101: { council: 'Northern Beaches',   fsr: 0.45, heightM: 8,  coverage: 0.45 },
  2107: { council: 'Northern Beaches',   fsr: 0.40, heightM: 8,  coverage: 0.40 },

  // ── Inner West ──────────────────────────────────────────────
  2037: { council: 'Inner West',         fsr: 0.70, heightM: 9,  coverage: 0.60 },
  2038: { council: 'Inner West',         fsr: 0.70, heightM: 9,  coverage: 0.60 },
  2039: { council: 'Inner West',         fsr: 0.70, heightM: 9,  coverage: 0.60 },
  2040: { council: 'Inner West',         fsr: 0.70, heightM: 9,  coverage: 0.60 },
  2041: { council: 'Inner West',         fsr: 0.70, heightM: 9,  coverage: 0.60 },
  2042: { council: 'Inner West',         fsr: 0.70, heightM: 9,  coverage: 0.60 },
  2048: { council: 'Inner West',         fsr: 0.70, heightM: 9,  coverage: 0.60 },
  2049: { council: 'Inner West',         fsr: 0.70, heightM: 9,  coverage: 0.60 },

  // ── Randwick / Eastern suburbs ──────────────────────────────
  2031: { council: 'Randwick City',      fsr: 0.55, heightM: 9,  coverage: 0.55 },
  2032: { council: 'Randwick City',      fsr: 0.55, heightM: 9,  coverage: 0.55 },
  2033: { council: 'Randwick City',      fsr: 0.55, heightM: 9,  coverage: 0.55 },
  2034: { council: 'Randwick City',      fsr: 0.60, heightM: 9,  coverage: 0.55 },
  2035: { council: 'Randwick City',      fsr: 0.60, heightM: 9,  coverage: 0.55 },
};

// ── State-level defaults where no postcode match ───────────────────────────
const STATE_DEFAULTS = {
  NSW: { council: null, fsr: 0.50, heightM: 9,  coverage: 0.50, approx: true },
  VIC: { council: null, fsr: 0.50, heightM: 9,  coverage: 0.50, approx: true },
  QLD: { council: null, fsr: 0.50, heightM: 9,  coverage: 0.50, approx: true },
  WA:  { council: null, fsr: 0.50, heightM: 9,  coverage: 0.50, approx: true },
  SA:  { council: null, fsr: 0.50, heightM: 8,  coverage: 0.50, approx: true },
  TAS: { council: null, fsr: 0.50, heightM: 8,  coverage: 0.50, approx: true },
  ACT: { council: null, fsr: 0.55, heightM: 9,  coverage: 0.50, approx: true },
  NT:  { council: null, fsr: 0.50, heightM: 9,  coverage: 0.50, approx: true },
};

const FALLBACK = { council: null, fsr: 0.50, heightM: 9, coverage: 0.50, approx: true };

/** Return council planning controls for a given postcode + state. */
export function getCouncilData(postcode, state) {
  const pc = Number(postcode);
  if (state === 'NSW' && pc && NSW_POSTCODES[pc]) {
    return { ...NSW_POSTCODES[pc], approx: false };
  }
  return STATE_DEFAULTS[state] || FALLBACK;
}
