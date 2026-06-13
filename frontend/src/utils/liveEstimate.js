/**
 * Live cost estimate formula.
 *
 * Base rate: $1,850 / m² — benchmarked against Sydney outer metro
 * (Blacktown, Parramatta, Liverpool, Penrith). That region = 1.0×.
 * Every other location is expressed as a multiple of that baseline.
 */

// ── Location multipliers by postcode range ─────────────────────────────────
const POSTCODE_MULTIPLIERS = [
  // Sydney CBD / inner east / inner west (premium)
  { from: 2000, to: 2050, mult: 1.20 },
  // North Shore / Ku-ring-gai
  { from: 2060, to: 2084, mult: 1.18 },
  // Northern Beaches
  { from: 2085, to: 2108, mult: 1.15 },
  // Eastern suburbs (Randwick, Bondi, Waverley)
  { from: 2020, to: 2036, mult: 1.20 },
  // Sydney outer metro — the 1.0× baseline
  { from: 2140, to: 2180, mult: 1.00 },
  { from: 2744, to: 2774, mult: 1.00 },
  // Sydney south-west (Liverpool, Campbelltown)
  { from: 2560, to: 2580, mult: 1.00 },
  // Sydney north-west (Hills Shire)
  { from: 2153, to: 2160, mult: 1.02 },
  // NSW regional
  { from: 2300, to: 2500, mult: 0.90 },
  { from: 2580, to: 2700, mult: 0.88 },
  { from: 2700, to: 2900, mult: 0.85 },
  // Melbourne metro
  { from: 3000, to: 3210, mult: 0.95 },
  // Melbourne outer / regional VIC
  { from: 3210, to: 3999, mult: 0.88 },
  // Brisbane metro
  { from: 4000, to: 4200, mult: 0.92 },
  // QLD regional
  { from: 4200, to: 4999, mult: 0.85 },
  // Perth metro
  { from: 6000, to: 6120, mult: 0.93 },
  // WA regional
  { from: 6120, to: 6999, mult: 0.82 },
  // Adelaide metro
  { from: 5000, to: 5100, mult: 0.88 },
  // SA regional
  { from: 5100, to: 5999, mult: 0.83 },
  // ACT (Canberra)
  { from: 2600, to: 2620, mult: 0.95 },
  // Tasmania
  { from: 7000, to: 7999, mult: 0.82 },
  // NT (Darwin, remote premium)
  { from: 800,  to: 999,  mult: 1.18 },
];

// State fallback when postcode is unknown
const STATE_MULT = {
  NSW: 1.00, VIC: 0.93, QLD: 0.90,
  WA:  0.92, SA:  0.87, TAS: 0.82,
  ACT: 0.95, NT:  1.15,
};

function locationMultiplier(postcode, state) {
  const pc = Number(postcode);
  if (pc) {
    for (const r of POSTCODE_MULTIPLIERS) {
      if (pc >= r.from && pc <= r.to) return r.mult;
    }
  }
  return STATE_MULT[state] ?? 1.00;
}

// ── Quality-tier multipliers ───────────────────────────────────────────────
const QUALITY_MULT = { budget: 1.00, mid: 1.30, premium: 1.89 };

// ── Site-condition multipliers ─────────────────────────────────────────────
const SITE_MULT = { flat: 1.00, gentle_slope: 1.12, steep: 1.22, not_sure: 1.12 };

// ── Storey multiplier ──────────────────────────────────────────────────────
const STOREY_MULT = { 1: 1.00, 2: 1.07 };

// ── Roof type multipliers (Q4) ─────────────────────────────────────────────
const ROOF_MULT = {
  colorbond:   1.00,
  tiles:       1.05,
  skillion:    1.14,
  mixed_arch:  1.20,
};

// ── Facade / cladding multipliers (Q5 — C5) ───────────────────────────────
// Default brick_veneer = 1.00; field absent → 1.00 (backwards compatible)
const FACADE_MULT = {
  brick_veneer:       1.00,
  rendered_masonry:   1.04,
  weatherboard:       1.02,
  colorbond_cladding: 0.97,
  timber_cladding:    1.08,
  architectural:      1.14,
};

// ── Ceiling height multipliers (Q7) ───────────────────────────────────────
const CEILING_MULT = {
  standard:   1.00,
  high_2_7:   1.03,
  extra_3_0:  1.06,
  raked:      1.10,
};

// ── Glazing multipliers (Q8) ───────────────────────────────────────────────
const GLAZING_MULT = {
  single_aluminium: 1.00,
  double_aluminium: 1.04,
  double_upvc:      1.08,
  large_format:     1.13,
};

// ── Living areas multipliers (Q11) ────────────────────────────────────────
const LIVING_MULT = {
  open_plan:   1.00,
  plus_lounge: 1.03,
  plus_formal: 1.06,
};

// ── Laundry multipliers (Q13) ─────────────────────────────────────────────
const LAUNDRY_MULT = {
  standard:       1.00,
  with_cabinetry: 1.02,
  combined:       1.01,
  premium:        1.03,
};

// ── C2: Flooring multipliers (Q12) ────────────────────────────────────────
const FLOORING_MULT = {
  mixed:              1.00,
  tiles_throughout:   1.02,
  timber_living:      1.03,
  timber_throughout:  1.05,
};

// ── C3: Garage quality scaling ─────────────────────────────────────────────
const GARAGE_QUALITY_MULT = { budget: 0.80, mid: 1.00, premium: 1.30 };

// ── Fixed add-ons (mid-estimate, garage quality-scaled separately) ─────────
const ADDON = {
  single_garage: 30_000,
  double_garage: 55_000,
  triple_garage: 75_000,
  carport:       12_000,
  pool:          80_000,
  solar:         12_000,
  ductedAC:      22_000,
  alfresco:      28_000,
  study:         15_000,
  homeTheatre:       25_000,
  walkInRobe:        8_000,
  smartHome:         18_000,
  homeLift:          55_000,
  fireplace:         12_000,
  prayerRoom:        15_000,
  extraGuestBedroom: 22_000,
};

// ── C4: Kitchen cost model (scales with house size above 200 m²) ───────────
const KITCHEN_BASE      = { standard: 0, mid_range: 12_000, premium: 35_000, luxury: 65_000 };
const KITCHEN_SIZE_RATE = { standard: 0, mid_range: 25,     premium: 55,     luxury: 90     };

function kitchenAddOn(finish, size) {
  const base = KITCHEN_BASE[finish]      ?? 0;
  const rate = KITCHEN_SIZE_RATE[finish] ?? 0;
  return base + Math.max(0, size - 200) * rate;
}

/**
 * Compute live estimate.
 * Returns null until houseSize is known; otherwise returns { low, mid, high }.
 */
export function calcLiveEstimate(formData) {
  const size = Number(formData.houseSize);
  if (!size || size < 50) return null;

  const BASE_RATE = 1_850; // $/m² (Sydney outer metro baseline)

  const locMult      = locationMultiplier(formData.postcode, formData.state);
  const qualMult     = QUALITY_MULT[formData.qualityTier]    ?? 1.00;
  const siteMult     = SITE_MULT[formData.siteCondition]     ?? 1.12;
  const stMult       = STOREY_MULT[formData.storeys]          ?? 1.00;
  const roofMult     = ROOF_MULT[formData.roofType]           ?? 1.00;
  const facadeMult   = FACADE_MULT[formData.facadeType]       ?? 1.00;  // C5
  const ceilingMult  = CEILING_MULT[formData.ceilingHeight]   ?? 1.00;
  const glazingMult  = GLAZING_MULT[formData.glazingType]     ?? 1.00;
  const livingMult   = LIVING_MULT[formData.livingAreas]      ?? 1.00;
  const laundryMult  = LAUNDRY_MULT[formData.laundryType]     ?? 1.00;
  const flooringMult = FLOORING_MULT[formData.flooringType]   ?? 1.00;  // C2

  // Base construction cost
  let mid = size * BASE_RATE
    * locMult * qualMult * siteMult * stMult * facadeMult
    * roofMult * ceilingMult * glazingMult * livingMult * laundryMult * flooringMult;

  // C1: Room count adders (beyond the base assumption: 3 bed, 1 bath, 0 ensuite)
  const bedrooms  = Number(formData.bedrooms)  || 4;
  const bathrooms = Number(formData.bathrooms) || 2;
  const ensuites  = Number(formData.ensuites)  || 0;
  const toilets   = Number(formData.toilets)   || 2;

  mid += Math.max(0, bedrooms  - 3) * 18_000;
  mid += Math.max(0, bathrooms - 1) * 22_000;
  mid += ensuites * 15_000;
  mid += Math.max(0, toilets - bathrooms) * 8_000;

  // C3: Garage (quality-scaled)
  const garageQMult = GARAGE_QUALITY_MULT[formData.qualityTier] ?? 1.00;
  if (formData.garageType === 'single_garage')      mid += ADDON.single_garage * garageQMult;
  else if (formData.garageType === 'double_garage') mid += ADDON.double_garage * garageQMult;
  else if (formData.garageType === 'triple_garage') mid += ADDON.triple_garage * garageQMult;
  else if (formData.garageType === 'carport')       mid += ADDON.carport       * garageQMult;

  // Optional add-ons
  if (formData.pool)              mid += ADDON.pool;
  if (formData.solar)             mid += ADDON.solar;
  if (formData.ductedAC)          mid += ADDON.ductedAC;
  if (formData.alfresco)          mid += ADDON.alfresco;
  if (formData.study)             mid += ADDON.study;
  if (formData.homeTheatre)       mid += ADDON.homeTheatre;
  if (formData.walkInRobe)        mid += ADDON.walkInRobe;
  if (formData.smartHome)         mid += ADDON.smartHome;
  if (formData.homeLift)          mid += ADDON.homeLift;
  if (formData.fireplace)         mid += ADDON.fireplace;
  if (formData.prayerRoom)        mid += ADDON.prayerRoom;
  if (formData.extraGuestBedroom) mid += ADDON.extraGuestBedroom;

  // C4: Kitchen (size-aware) + butler's pantry
  mid += kitchenAddOn(formData.kitchenFinish || 'standard', size);
  if (formData.pantry) mid += 12_000;

  // Landscaping
  if (formData.landscaping === 'standard') mid += 15_000;
  else if (formData.landscaping === 'premium') mid += 40_000;
  else if (formData.landscaping === 'luxury')  mid += 80_000;

  // Round to nearest $1k
  mid = Math.round(mid / 1000) * 1000;

  return {
    low:  Math.round(mid * 0.92 / 1000) * 1000,
    mid,
    high: Math.round(mid * 1.12 / 1000) * 1000,
  };
}

/** Format a dollar amount as $XXX,XXX */
export function fmtAUD(n) {
  return '$' + n.toLocaleString('en-AU');
}
