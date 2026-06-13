import { useState, useRef, useEffect } from 'react';

const STEP_META = {
  1:  { label: '📍 Location Insights',    chips: ['What are typical council fees here?', 'How do site costs compare to the state?', 'What permits will I need?'] },
  2:  { label: '📐 Land & Size Insights', chips: ['Can I build a granny flat on this land?', 'What is a site coverage ratio?', 'How do setbacks affect my floor plan?'] },
  3:  { label: '⛰️ Site Conditions',       chips: ['How much does a sloping block add?', 'What is a retaining wall likely to cost?', 'Can I still build double-storey on a slope?'] },
  4:  { label: '🏠 Roof Type',            chips: ['Which roof type suits my climate best?', 'Tiles vs Colorbond — 20-year cost?', 'What roof type is best for solar?'] },
  5:  { label: '🏗️ Build Method',         chips: ['What is the cheapest build method?', 'Project home vs custom — real cost difference?', 'Which quality tier gives best resale?'] },
  6:  { label: '✨ Finish Level',          chips: ['What is included in a premium build?', 'How much more does premium cost per m²?', 'Does finish level affect resale value?'] },
  7:  { label: '📏 Ceiling Heights',      chips: ['Do higher ceilings make rooms feel bigger?', 'How do ceilings affect heating costs?', 'Can I mix ceiling heights in different rooms?'] },
  8:  { label: '🪟 Windows & Glazing',    chips: ['What is BASIX compliance?', 'Double glazing — is it worth the cost?', 'What glazing do I need for a BAL rating?'] },
  9:  { label: '🛏️ Bedroom Insights',     chips: ['What is the standard bedroom size in Australia?', 'Master suite vs standard master — cost difference?', 'Can I convert a study to a bedroom later?'] },
  10: { label: '🚿 Bathroom Insights',    chips: ['What does a full bathroom cost to build?', 'Is a second bathroom worth adding?', 'Back-to-back bathrooms — why is it recommended?'] },
  11: { label: '🛋️ Living Areas',         chips: ['Open-plan vs separate rooms — which sells better?', 'How much space for open-plan living?', 'What does a formal dining room add to cost?'] },
  12: { label: '🍳 Kitchen & Flooring',   chips: ['Which kitchen upgrade adds most resale value?', 'Timber vs tiles — long-term pros and cons?', 'What does an average Australian kitchen cost?'] },
  13: { label: '🫧 Laundry',              chips: ['How big does a laundry need to be?', 'Combined laundry/bathroom — pros and cons?', 'Does a premium laundry affect resale value?'] },
  14: { label: '🚗 Garage Insights',      chips: ['Does a garage add resale value?', 'What are garage setback rules?', 'Carport vs garage — real cost difference?'] },
  15: { label: '🌿 Outdoor Living',       chips: ['Is a pool worth adding in my area?', 'What does an alfresco add to resale value?', 'Landscaping now vs later — which saves money?'] },
  16: { label: '📋 Pre-Estimate Summary', chips: ['What should I ask my builder?', 'How accurate will the estimate be?', 'What costs are typically underestimated?'] },
};

const WELCOME_CHIPS = [
  'What build method is cheapest?',
  'How do bedrooms affect cost?',
  'Is a project home or custom better value?',
  'What adds the most to construction costs?',
];

const ESTIMATE_CHIPS = [
  'How can I reduce my build cost by 20%?',
  "What's included in the builder's margin?",
  'Explain the contingency cost',
  'What are the biggest cost drivers?',
];

const GARAGE_LABELS = {
  none: 'no garage',
  single_garage: 'single internal garage',
  double_garage: 'double internal garage',
  triple_garage: 'triple internal garage',
  single_carport: 'single carport',
  double_carport: 'double carport',
};

const FACADE_LABELS = {
  brick_veneer:       'Brick veneer',
  rendered_masonry:   'Rendered / painted masonry',
  weatherboard:       'Weatherboard',
  colorbond_cladding: 'Colorbond cladding',
  timber_cladding:    'Timber cladding',
  architectural:      'Architectural mixed facade',
};

const QUALITY_LABELS = {
  budget: 'budget/entry-level',
  mid: 'mid-range',
  premium: 'premium/luxury',
};


const KITCHEN_LABELS = {
  standard: 'standard (laminate)',
  mid_range: 'mid-range (stone benchtops)',
  premium: 'premium (stone + integrated appliances)',
  luxury: "luxury bespoke with butler's pantry",
};

const FLOORING_LABELS = {
  mixed: 'mixed carpet & tiles',
  tiles_throughout: 'tiles throughout',
  timber_living: 'timber in living areas',
  timber_throughout: 'timber/hybrid throughout',
};

const LANDSCAPING_LABELS = {
  none: 'none',
  basic: 'basic (turf, driveway, pathways)',
  standard: 'standard (garden beds, paving, fencing)',
  premium: 'premium (full design, irrigation)',
};

const SITE_LABELS = {
  flat: 'flat',
  gentle_slope: 'gently sloping',
  steep: 'steeply sloping',
  not_sure: 'unsure of slope',
};

const ROOF_LABELS = {
  colorbond:   'Colorbond (metal) roof',
  tiles:       'terracotta or concrete tile roof',
  skillion:    'skillion (flat/angled) roof',
  mixed_arch:  'architectural mixed-style roof',
};

const CEILING_LABELS = {
  standard:  'standard 2.4m ceilings',
  high_2_7:  'high 2.7m ceilings',
  extra_3_0: 'extra-high 3.0m ceilings',
  raked:     'raked / vaulted ceilings',
};

const GLAZING_LABELS = {
  single_aluminium: 'single-glazed aluminium frames',
  double_aluminium: 'double-glazed aluminium frames',
  double_upvc:      'double-glazed uPVC frames',
  large_format:     'large-format / floor-to-ceiling glazing',
};

const LIVING_LABELS = {
  open_plan:   'open-plan living, dining and kitchen',
  plus_lounge: 'open-plan plus a separate lounge',
  plus_formal: 'open-plan plus separate lounge and formal dining',
};

const LAUNDRY_LABELS = {
  standard:       'standard laundry',
  with_cabinetry: 'laundry with extra cabinetry',
  combined:       'combined laundry and bathroom',
  premium:        'premium laundry',
};

export default function CopilotChat({ formData, estimate, isFloating = false, currentStep = 1, userName = '', onMessagesChange }) {
  const [open, setOpen] = useState(!isFloating);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [suburbBanner, setSuburbBanner] = useState('');
  const [activeStep, setActiveStep] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);
  const lastSuburbKeyRef = useRef('');
  const lastSizeKeyRef = useRef('');
  const visitedStepsRef = useRef(new Set());
  const suburbDebounceRef = useRef(null);
  const sizeDebounceRef = useRef(null);

  const currentStepRef = useRef(currentStep);
  const formDataRef = useRef(formData);
  const loadingRef = useRef(false);
  const lastStepDataRef = useRef({
    3: null, 4: null, 5: null, 6: null, 7: null, 8: null,
    9: null, 10: null, 11: null, 12: null, 13: null, 14: null, 15: null, 16: null,
  });
  const stepDebounceRef = useRef({});

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { onMessagesChange?.(messages); }, [messages]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { formDataRef.current = formData; });   // every render — no deps intentional
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // ── Data-key helpers ──────────────────────────────────────────────────────
  function getStepDataKey(step, fd) {
    if (!fd) return '';
    switch (step) {
      case 3:  return fd.siteCondition || '';
      case 4:  return fd.roofType || '';
      case 5:  return [fd.facadeType, fd.qualityTier].join('|');
      case 6:  return fd.qualityTier || '';
      case 7:  return fd.ceilingHeight || '';
      case 8:  return fd.glazingType || '';
      case 9:  return [fd.bedrooms, fd.study].join('|');
      case 10: return [fd.bathrooms, fd.toilets].join('|');
      case 11: return fd.livingAreas || '';
      case 12: return [fd.kitchenFinish, fd.flooringType].join('|');
      case 13: return fd.laundryType || '';
      case 14: return [fd.garageType, fd.garageSpaces, fd.houseSize, fd.landSize].join('|');
      case 15: return [fd.pool, fd.alfresco, fd.landscaping].join('|');
      case 16: return [fd.bedrooms, fd.bathrooms, fd.houseSize, fd.landSize, fd.buildMethod, fd.qualityTier, fd.solar, fd.ductedAC, fd.specialRequirements].join('|');
      default: return '';
    }
  }

  // ── Re-trigger: strip old step insight and regenerate ─────────────────────
  function retriggerStep(stepNum, triggerFn) {
    if (loadingRef.current) return;
    const stepLabel = STEP_META[stepNum]?.label;
    const msgs = messagesRef.current;
    let dividerIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'divider' && msgs[i].stepLabel === stepLabel) {
        dividerIdx = i;
        break;
      }
    }
    if (dividerIdx >= 0) {
      const truncated = msgs.slice(0, dividerIdx);
      setMessages(truncated);
      messagesRef.current = truncated;
    }
    lastStepDataRef.current[stepNum] = getStepDataKey(stepNum, formDataRef.current);
    setLoadingLabel('Updating insights…');
    triggerFn();
  }

  // ── Personalised greeting on first load ───────────────────────────────────
  useEffect(() => {
    if (!userName) return;
    const greeting = {
      role: 'assistant',
      isGreeting: true,
      content: `Welcome, ${userName} — and congratulations on your land purchase! You've chosen a truly wonderful place to live. Here are the 5 best things about this area:`,
    };
    setMessages([greeting]);
    messagesRef.current = [greeting];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1: suburb + state (data-driven) ─────────────────────────────────
  useEffect(() => {
    const suburb = formData?.suburb?.trim();
    const state = formData?.state?.trim();
    if (!suburb || suburb.length < 3 || !state) return;
    const key = `${suburb}|${state}`;
    if (key === lastSuburbKeyRef.current) return;
    clearTimeout(suburbDebounceRef.current);
    suburbDebounceRef.current = setTimeout(() => {
      lastSuburbKeyRef.current = key;
      lastSizeKeyRef.current = '';
      visitedStepsRef.current = new Set();
      lastStepDataRef.current = {
        3: null, 4: null, 5: null, 6: null, 7: null, 8: null,
        9: null, 10: null, 11: null, 12: null, 13: null, 14: null, 15: null, 16: null,
      };
      setOpen(true);
      triggerStep1(suburb, state);
    }, 800);
    return () => clearTimeout(suburbDebounceRef.current);
  }, [formData?.suburb, formData?.state]);

  // ── Step 2: land size + house size (data-driven) ──────────────────────────
  useEffect(() => {
    const land = parseInt(formData?.landSize);
    const house = parseInt(formData?.houseSize);
    if (!land || !house || land < 50 || house < 50) return;
    const key = `${land}|${house}|${formData?.storeys ?? 1}`;
    if (key === lastSizeKeyRef.current) return;
    clearTimeout(sizeDebounceRef.current);
    sizeDebounceRef.current = setTimeout(() => {
      const prevKey = lastSizeKeyRef.current;
      lastSizeKeyRef.current = key;
      if (prevKey !== '') {
        const stepLabel = STEP_META[2]?.label;
        const msgs = messagesRef.current;
        let dividerIdx = -1;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'divider' && msgs[i].stepLabel === stepLabel) { dividerIdx = i; break; }
        }
        if (dividerIdx >= 0) {
          const truncated = msgs.slice(0, dividerIdx);
          setMessages(truncated);
          messagesRef.current = truncated;
          setLoadingLabel('Updating insights…');
        }
      }
      setOpen(true);
      triggerStep2Land(land, house);
    }, 800);
    return () => clearTimeout(sizeDebounceRef.current);
  }, [formData?.landSize, formData?.houseSize, formData?.storeys]);

  // ── Steps 3–16: navigate to step ─────────────────────────────────────────
  // Step 1 is handled by the suburb effect; step 2 by the size effect.
  useEffect(() => {
    if (currentStep < 3) return;
    const stepFns = {
      3: triggerStep3,   4: triggerStep4,  5: triggerStep5,
      6: triggerStep6,   7: triggerStep7,  8: triggerStep8,
      9: triggerStep9,  10: triggerStep10, 11: triggerStep11,
      12: triggerStep12, 13: triggerStep13, 14: triggerStep14,
      15: triggerStep15, 16: triggerStep16,
    };
    const currentDataKey = getStepDataKey(currentStep, formDataRef.current);
    if (!visitedStepsRef.current.has(currentStep)) {
      visitedStepsRef.current.add(currentStep);
      lastStepDataRef.current[currentStep] = currentDataKey;
      setOpen(true);
      stepFns[currentStep]?.();
    } else if (lastStepDataRef.current[currentStep] !== currentDataKey) {
      setOpen(true);
      retriggerStep(currentStep, stepFns[currentStep]);
    }
  }, [currentStep, isFloating]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-step data-change effects (debounced 400 ms) ───────────────────────
  const step3Key  = formData?.siteCondition || '';
  const step4Key  = formData?.roofType || '';
  const step5Key  = [formData?.facadeType, formData?.qualityTier].join('|');
  const step6Key  = formData?.qualityTier || '';
  const step7Key  = formData?.ceilingHeight || '';
  const step8Key  = formData?.glazingType || '';
  const step9Key  = [formData?.bedrooms, formData?.study].join('|');
  const step10Key = [formData?.bathrooms, formData?.toilets].join('|');
  const step11Key = formData?.livingAreas || '';
  const step12Key = [formData?.kitchenFinish, formData?.flooringType].join('|');
  const step13Key = formData?.laundryType || '';
  const step14Key = [formData?.garageType, formData?.garageSpaces, formData?.houseSize, formData?.landSize].join('|');
  const step15Key = [formData?.pool, formData?.alfresco, formData?.landscaping].join('|');
  const step16Key = [formData?.solar, formData?.ductedAC, formData?.specialRequirements].join('|');

  useEffect(() => {
    if (currentStepRef.current !== 3 || !visitedStepsRef.current.has(3)) return;
    clearTimeout(stepDebounceRef.current[3]);
    stepDebounceRef.current[3] = setTimeout(() => { if (currentStepRef.current === 3) retriggerStep(3, triggerStep3); }, 400);
    return () => clearTimeout(stepDebounceRef.current[3]);
  }, [step3Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 4 || !visitedStepsRef.current.has(4)) return;
    clearTimeout(stepDebounceRef.current[4]);
    stepDebounceRef.current[4] = setTimeout(() => { if (currentStepRef.current === 4) retriggerStep(4, triggerStep4); }, 400);
    return () => clearTimeout(stepDebounceRef.current[4]);
  }, [step4Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 5 || !visitedStepsRef.current.has(5)) return;
    clearTimeout(stepDebounceRef.current[5]);
    stepDebounceRef.current[5] = setTimeout(() => { if (currentStepRef.current === 5) retriggerStep(5, triggerStep5); }, 400);
    return () => clearTimeout(stepDebounceRef.current[5]);
  }, [step5Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 6 || !visitedStepsRef.current.has(6)) return;
    clearTimeout(stepDebounceRef.current[6]);
    stepDebounceRef.current[6] = setTimeout(() => { if (currentStepRef.current === 6) retriggerStep(6, triggerStep6); }, 400);
    return () => clearTimeout(stepDebounceRef.current[6]);
  }, [step6Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 7 || !visitedStepsRef.current.has(7)) return;
    clearTimeout(stepDebounceRef.current[7]);
    stepDebounceRef.current[7] = setTimeout(() => { if (currentStepRef.current === 7) retriggerStep(7, triggerStep7); }, 400);
    return () => clearTimeout(stepDebounceRef.current[7]);
  }, [step7Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 8 || !visitedStepsRef.current.has(8)) return;
    clearTimeout(stepDebounceRef.current[8]);
    stepDebounceRef.current[8] = setTimeout(() => { if (currentStepRef.current === 8) retriggerStep(8, triggerStep8); }, 400);
    return () => clearTimeout(stepDebounceRef.current[8]);
  }, [step8Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 9 || !visitedStepsRef.current.has(9)) return;
    clearTimeout(stepDebounceRef.current[9]);
    stepDebounceRef.current[9] = setTimeout(() => { if (currentStepRef.current === 9) retriggerStep(9, triggerStep9); }, 400);
    return () => clearTimeout(stepDebounceRef.current[9]);
  }, [step9Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 10 || !visitedStepsRef.current.has(10)) return;
    clearTimeout(stepDebounceRef.current[10]);
    stepDebounceRef.current[10] = setTimeout(() => { if (currentStepRef.current === 10) retriggerStep(10, triggerStep10); }, 400);
    return () => clearTimeout(stepDebounceRef.current[10]);
  }, [step10Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 11 || !visitedStepsRef.current.has(11)) return;
    clearTimeout(stepDebounceRef.current[11]);
    stepDebounceRef.current[11] = setTimeout(() => { if (currentStepRef.current === 11) retriggerStep(11, triggerStep11); }, 400);
    return () => clearTimeout(stepDebounceRef.current[11]);
  }, [step11Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 12 || !visitedStepsRef.current.has(12)) return;
    clearTimeout(stepDebounceRef.current[12]);
    stepDebounceRef.current[12] = setTimeout(() => { if (currentStepRef.current === 12) retriggerStep(12, triggerStep12); }, 400);
    return () => clearTimeout(stepDebounceRef.current[12]);
  }, [step12Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 13 || !visitedStepsRef.current.has(13)) return;
    clearTimeout(stepDebounceRef.current[13]);
    stepDebounceRef.current[13] = setTimeout(() => { if (currentStepRef.current === 13) retriggerStep(13, triggerStep13); }, 400);
    return () => clearTimeout(stepDebounceRef.current[13]);
  }, [step13Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 14 || !visitedStepsRef.current.has(14)) return;
    clearTimeout(stepDebounceRef.current[14]);
    stepDebounceRef.current[14] = setTimeout(() => { if (currentStepRef.current === 14) retriggerStep(14, triggerStep14); }, 400);
    return () => clearTimeout(stepDebounceRef.current[14]);
  }, [step14Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 15 || !visitedStepsRef.current.has(15)) return;
    clearTimeout(stepDebounceRef.current[15]);
    stepDebounceRef.current[15] = setTimeout(() => { if (currentStepRef.current === 15) retriggerStep(15, triggerStep15); }, 400);
    return () => clearTimeout(stepDebounceRef.current[15]);
  }, [step15Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 16 || !visitedStepsRef.current.has(16)) return;
    clearTimeout(stepDebounceRef.current[16]);
    stepDebounceRef.current[16] = setTimeout(() => { if (currentStepRef.current === 16) retriggerStep(16, triggerStep16); }, 400);
    return () => clearTimeout(stepDebounceRef.current[16]);
  }, [step16Key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [messages, open, loading]);

  // ── Trigger functions ─────────────────────────────────────────────────────

  async function triggerStep1(suburb, state) {
    setSuburbBanner(`${suburb}, ${state}`);
    setActiveStep(1);
    setLoading(true);
    const existingGreeting = messagesRef.current.find(m => m.isGreeting);
    const base = existingGreeting ? [existingGreeting] : [];
    setMessages(base);
    messagesRef.current = base;
    const prompt = `I've just selected "${suburb}, ${state}" as my build location in Australia.
Give me exactly 5 bullet points:
- Points 1–4: key facts about building/construction in ${suburb} — local cost factors vs. state average, council and permit considerations, local market conditions, and any notable site conditions (slope, flooding, heritage, bushfire ratings).
- Point 5: A "Did you know" style fact about ${suburb}'s population growth, development pipeline, or major planned infrastructure — written in an engaging, specific way with real numbers or project names where possible.
Keep all points friendly, specific to ${suburb}, and focused on what a home builder needs to know.`;
    await callAPI(prompt, 1, false, base);
  }

  async function triggerStep3() {
    const { siteCondition = 'not_sure', suburb, state, landSize } = formDataRef.current || {};
    const siteLabel = SITE_LABELS[siteCondition] || siteCondition;
    setActiveStep(3);
    setLoading(true);
    const prompt = `I'm planning to build in ${suburb || 'Australia'}, ${state || ''} on a ${siteLabel} block${landSize ? ` of ${landSize}m²` : ''}.

Please explain:
1. **Site cost impact** — How much does a ${siteLabel} block typically add to construction costs vs a flat block in ${suburb || 'Australia'}? Give a realistic AUD range.
2. **Engineering requirements** — What site preparation, retaining walls, or structural engineering is commonly needed for a ${siteLabel} block?
3. **Hidden costs** — The 2 most commonly overlooked additional costs when building on a ${siteLabel} site.
4. **Design opportunity** — Is there a design approach that turns a ${siteLabel} site into a liveability or view advantage?`;
    await callAPI(prompt, 3, true);
  }

  async function triggerStep2Land(land, house) {
    const fd = formDataRef.current || {};
    const suburb = fd.suburb || 'your suburb';
    const state = fd.state || 'Australia';
    const storeys = fd.storeys || 1;
    const storeyWord = storeys === 1 ? 'storey' : 'storeys';
    const storeyLabel = storeys === 1 ? 'single-storey' : storeys === 2 ? 'double-storey' : 'three-storey';
    const pct = ((house / land) * 100).toFixed(1);
    setActiveStep(2);
    setLoading(true);
    const storeyQ = storeys === 1
      ? `Is a single-storey the best choice for a **${land}m²** block in ${suburb}? Would going double-storey make sense here, and what would it add in cost?`
      : `What are the specific council height restrictions, engineering requirements, and cost premium for a **${storeyLabel}** home in ${suburb}? How much more does it cost vs single storey for **${house}m²**?`;
    const prompt = `I'm building in ${suburb}, ${state}. Land: **${land}m²**, house floor area: **${house}m²** (${storeys} ${storeyWord}). Site coverage ≈ **${pct}%**.

Please analyse:
1. **Coverage check** — Is **${pct}%** within typical Australian council limits (40–60%)? Flag clearly if too high.
2. **Recommended size range** — For a **${land}m²** block in ${suburb}, what house size range maximises liveability while staying council-compliant?
3. **Setback requirements** — Typical front, side, and rear setbacks for ${suburb}, ${state}.
4. **${storeys}-storey implications** — ${storeyQ}`;
    await callAPI(prompt, 2, true);
  }

  async function triggerStep4() {
    const { roofType = 'colorbond', houseSize, suburb, state } = formDataRef.current || {};
    const roofLabel = ROOF_LABELS[roofType] || roofType;
    setActiveStep(4);
    setLoading(true);
    const prompt = `I'm planning a ${roofLabel} for my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Cost range** — What does a ${roofLabel} typically cost in ${suburb || 'Australia'}? Include supply and installation per m² and a total for ${houseSize || 'this'}m².
2. **Climate suitability** — Is a ${roofLabel} a good fit for ${suburb || 'this area'}'s climate, considering rainfall, heat, and any bushfire risk?
3. **Maintenance & lifespan** — Long-term maintenance requirements and expected lifespan vs the main alternatives.
4. **Council / BAL considerations** — Any planning overlays or Bushfire Attack Level restrictions relevant to ${roofLabel} in ${suburb || 'this area'}?`;
    await callAPI(prompt, 4, true);
  }

  async function triggerStep5() {
    const { facadeType = 'brick_veneer', qualityTier = 'mid', houseSize, suburb, state } = formDataRef.current || {};
    const facadeLabel = FACADE_LABELS[facadeType] || facadeType;
    const qualityLabel = QUALITY_LABELS[qualityTier] || qualityTier;
    setActiveStep(5);
    setLoading(true);
    const prompt = `I've chosen **${facadeLabel}** as the exterior facade / cladding for my ${houseSize || ''}m² ${qualityLabel} home in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Cost impact** — How does ${facadeLabel} compare in cost per m² to standard brick veneer in ${suburb || 'Australia'}? Give AUD low–high range for a ${houseSize || 'typical'}m² home.
2. **Local suitability** — Is ${facadeLabel} a good choice for ${suburb || 'this area'}'s climate, bushfire risk, and termite resistance?
3. **Maintenance & durability** — Long-term maintenance requirements and expected lifespan for ${facadeLabel} in Australian conditions.
4. **Best pairing** — What roof type and window style works best aesthetically and structurally with ${facadeLabel}?`;
    await callAPI(prompt, 5, true);
  }

  async function triggerStep6() {
    const { qualityTier = 'mid', houseSize, suburb, state } = formDataRef.current || {};
    const qualityLabel = QUALITY_LABELS[qualityTier] || qualityTier;
    setActiveStep(6);
    setLoading(true);
    const prompt = `I'm planning a **${qualityLabel}** finish level for my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please explain:
1. **Per-m² cost** — What does a ${qualityLabel} finish add per m² vs entry-level in ${suburb || 'Australia'}? Give AUD low–high range.
2. **What's included** — What specific fixtures, fittings, tiles, and finishes define a ${qualityLabel} Australian home?
3. **Resale return** — Does upgrading to ${qualityLabel} finish typically return more than it costs in this market?
4. **Smart upgrade targets** — Which 3 specific items deliver the best visible quality improvement per dollar at ${qualityLabel} level?`;
    await callAPI(prompt, 6, true);
  }

  async function triggerStep7() {
    const { ceilingHeight = 'standard', houseSize, suburb, state } = formDataRef.current || {};
    const ceilingLabel = CEILING_LABELS[ceilingHeight] || ceilingHeight;
    setActiveStep(7);
    setLoading(true);
    const prompt = `I'm planning **${ceilingLabel}** throughout my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please explain:
1. **Cost impact** — How much do ${ceilingLabel} add to the build budget vs standard 2.4m? Give AUD range for a ${houseSize || 'typical'}m² home.
2. **Practical benefits** — Real liveability and aesthetic benefits of ${ceilingLabel} in an Australian climate.
3. **Energy considerations** — How do ${ceilingLabel} affect heating, cooling, and energy star rating?
4. **Popular choice** — What ceiling height do most Australian builders choose in this size range and why?`;
    await callAPI(prompt, 7, true);
  }

  async function triggerStep8() {
    const { glazingType = 'single_aluminium', houseSize, suburb, state } = formDataRef.current || {};
    const glazingLabel = GLAZING_LABELS[glazingType] || glazingType;
    setActiveStep(8);
    setLoading(true);
    const prompt = `I'm planning **${glazingLabel}** for my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Cost premium** — How much more expensive is ${glazingLabel} vs standard single-glazed aluminium? Total premium for a ${houseSize || 'typical'}m² home.
2. **BASIX / NCC compliance** — What are the glazing energy efficiency requirements in ${suburb || 'this area'}, and does my selection meet them?
3. **Thermal performance** — Realistic heating/cooling bill difference with ${glazingLabel} vs single glazing in Australian conditions.
4. **Best upgrade** — If budget is limited, which single glazing upgrade gives the best thermal performance return per dollar?`;
    await callAPI(prompt, 8, true);
  }

  async function triggerStep9() {
    const { bedrooms = 4, study = false, houseSize, suburb, state } = formDataRef.current || {};
    setActiveStep(9);
    setLoading(true);
    const prompt = `I'm planning **${bedrooms} bedrooms**${study ? ' and a dedicated study/home office' : ''} in my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Space allocation** — Is ${houseSize || 'this'}m² enough for ${bedrooms} comfortably sized bedrooms? What is the recommended m² per bedroom in Australian design?
2. **Cost per bedroom** — What does adding an extra bedroom typically cost to build in ${suburb || 'Australia'}? Include framing, insulation, and fit-out.
3. **Layout strategy** — For ${bedrooms} bedrooms in ${houseSize || 'this'}m², what layout (master at rear, split bedrooms, etc.) works best for privacy and resale?
${study ? '4. **Study value** — Is a dedicated study worth the space, or is a flexible bedroom with built-in desk a smarter choice for resale?' : '4. **Future flexibility** — How can I build provisions for a future study or bedroom without committing the space now?'}`;
    await callAPI(prompt, 9, true);
  }

  async function triggerStep10() {
    const { bathrooms = 2, toilets = 2, houseSize, suburb, state } = formDataRef.current || {};
    setActiveStep(10);
    setLoading(true);
    const prompt = `I'm planning **${bathrooms} full bathroom(s)** and **${toilets} toilet(s)** in my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Wet area cost** — What does each full bathroom typically cost to build in ${suburb || 'Australia'}? Give the range from basic to premium fit-out.
2. **Toilet-to-bathroom ratio** — Is ${toilets} toilets for ${bathrooms} bathrooms a sensible ratio? When is adding a separate powder room worth it?
3. **Plumbing efficiency** — How can ${bathrooms} bathrooms be arranged to minimise plumbing run costs (back-to-back stacks, central core, etc.)?
4. **Best single upgrade** — Which one bathroom feature (frameless shower, floor-to-ceiling tiles, dual vanity) gives the best return in ${suburb || 'this area'}?`;
    await callAPI(prompt, 10, true);
  }

  async function triggerStep11() {
    const { livingAreas = 'open_plan', houseSize, suburb, state } = formDataRef.current || {};
    const livingLabel = LIVING_LABELS[livingAreas] || livingAreas;
    setActiveStep(11);
    setLoading(true);
    const prompt = `I'm planning **${livingLabel}** for my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please explain:
1. **Space requirement** — How much floor area does ${livingLabel} typically require to feel well-proportioned?
2. **Cost to add** — How much does ${livingLabel} add to the build cost vs a simple single open-plan space?
3. **Resale appeal** — Which living layout is most popular and best for resale in the ${suburb || 'Australian'} market right now?
4. **Design principle** — One key design principle for ${livingLabel} that most volume builders overlook?`;
    await callAPI(prompt, 11, true);
  }

  async function triggerStep12() {
    const { kitchenFinish = 'standard', flooringType = 'mixed', houseSize, suburb, state } = formDataRef.current || {};
    setActiveStep(12);
    setLoading(true);
    const prompt = `I'm planning **${KITCHEN_LABELS[kitchenFinish] || kitchenFinish}** with **${FLOORING_LABELS[flooringType] || flooringType}** flooring for my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Kitchen cost range** — Full installed cost for ${KITCHEN_LABELS[kitchenFinish] || kitchenFinish} in a ${houseSize || ''}m² home (AUD low–high).
2. **Flooring cost** — What does ${FLOORING_LABELS[flooringType] || flooringType} cost vs other options for ${houseSize || 'this'}m²?
3. **Best ROI upgrade** — Which single kitchen element (benchtops, appliances, cabinetry, splashback) gives the best resale return in ${suburb || 'this area'}?
4. **Common mistake** — The most common kitchen design mistake in Australian new builds that costs money to fix post-handover?`;
    await callAPI(prompt, 12, true);
  }

  async function triggerStep13() {
    const { laundryType = 'standard', houseSize, suburb, state } = formDataRef.current || {};
    const laundryLabel = LAUNDRY_LABELS[laundryType] || laundryType;
    setActiveStep(13);
    setLoading(true);
    const prompt = `I'm planning a **${laundryLabel}** for my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Cost range** — What does a ${laundryLabel} typically cost to build in Australia? Include plumbing, tiling, and cabinetry.
2. **Space & layout** — Minimum practical size for a ${laundryLabel}, and what layout tips make it most functional day-to-day?
3. **Resale impact** — Does a premium laundry meaningfully affect buyer perception or resale value in ${suburb || 'this area'}?
4. **Best value upgrade** — Which single laundry feature adds the most practical value per dollar?`;
    await callAPI(prompt, 13, true);
  }

  async function triggerStep14() {
    const { garageType = 'single_garage', houseSize, suburb, state, landSize } = formDataRef.current || {};
    const garageLabel = GARAGE_LABELS[garageType] || garageType;
    setActiveStep(14);
    setLoading(true);
    const prompt = `I'm planning a **${garageLabel}** for my ${houseSize || ''}m² home on a ${landSize || ''}m² block in ${suburb || 'Australia'}, ${state || ''}.

Please provide:
1. **Cost estimate** — What does a ${garageLabel} typically cost to build in ${suburb || 'Australia'}? Include budget to premium range.
2. **Council rules** — Key garage setback rules, maximum height limits, and other planning restrictions in ${suburb || 'this area'}.
3. **Value vs cost** — Does a ${garageLabel} typically add more to resale value than it costs to build in this market?
4. **Smart alternative** — Is there a cheaper parking option worth considering, and when does it make sense?`;
    await callAPI(prompt, 14, true);
  }

  async function triggerStep15() {
    const { pool = false, alfresco = false, landscaping = 'basic', houseSize, suburb, state, landSize } = formDataRef.current || {};
    const outdoorFeatures = [alfresco && 'alfresco/entertaining area', pool && 'swimming pool'].filter(Boolean);
    setActiveStep(15);
    setLoading(true);
    const prompt = `My outdoor living choices for a ${houseSize || ''}m² home on ${landSize || ''}m² land in ${suburb || 'Australia'}, ${state || ''}:
- Landscaping: ${LANDSCAPING_LABELS[landscaping] || landscaping}
- Outdoor features: ${outdoorFeatures.length ? outdoorFeatures.join(' + ') : 'none selected yet'}

Please advise:
1. **Total outdoor cost** — Realistic combined cost for these outdoor choices in ${suburb || 'Australia'} (AUD low–high range).
2. **Best ROI outdoor feature** — Which outdoor addition delivers the best return on investment in ${suburb || 'this area'}?
3. **Pool reality check** — ${pool ? "I've selected a pool — what are the ongoing annual costs (maintenance, heating, insurance) I should budget for?" : `Is a pool worth adding for this home size and block in ${suburb || 'this area'}?`}
4. **Landscaping timing** — Should landscaping be done at handover or deferred? What are the cost trade-offs?`;
    await callAPI(prompt, 15, true);
  }

  async function triggerStep16() {
    const { bedrooms = 4, bathrooms = 2, houseSize, landSize, buildMethod = 'brick_veneer', qualityTier = 'mid', suburb, state, specialRequirements, solar = false, ductedAC = false } = formDataRef.current || {};
    const methodLabel = BUILD_METHOD_LABELS[buildMethod] || buildMethod;
    const qualityLabel = QUALITY_LABELS[qualityTier] || qualityTier;
    setActiveStep(16);
    setLoading(true);
    const extras = [solar && 'solar panels', ductedAC && 'ducted air conditioning'].filter(Boolean);
    const prompt = `I'm about to generate a construction estimate for my project in ${suburb || 'Australia'}, ${state || ''}:
- Land: ${landSize || '?'}m², House: ${houseSize || '?'}m², ${bedrooms}bd/${bathrooms}ba
- ${methodLabel} construction, ${qualityLabel} finish
${extras.length ? `- Extras: ${extras.join(', ')}` : ''}
${specialRequirements ? `- Special requirements: ${specialRequirements}` : '- No special requirements noted'}

As a final pre-estimate check, please provide:
1. **Project snapshot** — A 2-sentence summary of this build and its main cost drivers.
2. **Biggest budget risk** — The #1 factor most likely to push the final cost above estimate for this specific project.
3. **Questions to ask your builder** — 3 specific questions to ask before signing a contract for this type of build.
4. **What to expect** — A rough price range to mentally prepare for before seeing the full AI estimate.`;
    await callAPI(prompt, 16, true);
  }

  // ── Core API caller ───────────────────────────────────────────────────────
  async function callAPI(prompt, stepNum, append, baseMsgs = []) {
    const hiddenMsg = { role: 'user', content: prompt, hidden: true, stepLabel: STEP_META[stepNum]?.label };
    const divider   = { role: 'divider', stepLabel: STEP_META[stepNum]?.label };

    if (append) {
      setMessages(prev => [...prev, divider, hiddenMsg]);
    }

    const history = messagesRef.current
      .filter(m => !m.hidden && m.role !== 'divider')
      .map(({ hidden, stepLabel, isGreeting, ...m }) => m);

    const apiMessages = append
      ? [...history, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, formData: formDataRef.current, estimate: null }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Chat error');

      const assistantMsg = { role: 'assistant', content: data.reply, stepLabel: STEP_META[stepNum]?.label };
      if (append) {
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages([...baseMsgs, hiddenMsg, assistantMsg]);
      }
    } catch (err) {
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate_limit') || err?.message?.includes('Rate limit') || err?.message?.includes('unavailable') || err?.message?.includes('quota');
      const fallback = {
        role: 'assistant',
        content: isRateLimit
          ? `⏳ AI insights are temporarily unavailable (daily quota reached). Feel free to continue filling in your project details — insights will load again shortly.`
          : `I couldn't load insights for this step right now. Feel free to ask me anything about your project!`,
        stepLabel: STEP_META[stepNum]?.label,
      };
      if (append) {
        setMessages(prev => [...prev, fallback]);
      } else {
        setMessages([...baseMsgs, hiddenMsg, fallback]);
      }
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }

  // ── User message sender ───────────────────────────────────────────────────
  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');

    const newMessages = [...messagesRef.current, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    const cleanMessages = newMessages
      .filter(m => m.role !== 'divider')
      .map(({ hidden, stepLabel, isGreeting, ...m }) => m);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: cleanMessages, formData: formDataRef.current, estimate }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Chat error');
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate_limit') || err?.message?.includes('Rate limit') || err?.message?.includes('unavailable') || err?.message?.includes('quota');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isRateLimit
          ? '⏳ AI service is temporarily busy (quota reached). Please wait a moment and try again.'
          : 'Sorry, I had trouble connecting. Please try again.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const visibleMessages = messages.filter(m => !m.hidden);
  const userHasTyped = messages.some(m => m.role === 'user' && !m.hidden);
  const chips = estimate ? ESTIMATE_CHIPS : (activeStep ? STEP_META[activeStep]?.chips : WELCOME_CHIPS);

  const chatPanel = (
    <div className={`copilot-panel ${isFloating ? 'copilot-panel-float' : 'copilot-panel-inline'}`}>
      <ChatHeader onClose={isFloating ? () => setOpen(false) : undefined} />
      {suburbBanner && (
        <div className="copilot-suburb-banner">
          <span className="copilot-suburb-pin">📍</span>
          <span>{suburbBanner}</span>
          <span className="copilot-suburb-tag">Build Location</span>
        </div>
      )}
      <ChatBody
        messages={visibleMessages}
        chips={chips}
        loading={loading}
        loadingLabel={loadingLabel}
        onSuggest={sendMessage}
        bottomRef={bottomRef}
        suburbBanner={suburbBanner}
        userHasTyped={userHasTyped}
      />
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={sendMessage}
        onKeyDown={handleKeyDown}
        loading={loading}
        inputRef={inputRef}
      />
    </div>
  );

  if (isFloating) {
    return (
      <div className={`copilot-float ${open ? 'copilot-float-open' : ''}`}>
        {open && chatPanel}
        <button className="copilot-fab" onClick={() => setOpen(o => !o)} title="Ask Homeygo AI">
          {open ? '✕' : <img src="/homeygo-logo.png" className="copilot-fab-logo" alt="Homeygo AI" />}
          {!open && <span className="copilot-fab-label">Ask Homeygo AI</span>}
          {!open && messages.length > 0 && <span className="copilot-fab-badge" />}
        </button>
      </div>
    );
  }

  return chatPanel;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChatHeader({ onClose }) {
  return (
    <div className="copilot-header">
      <div className="copilot-header-left">
        <img src="/homeygo-logo.png" className="copilot-logo-img" alt="Homeygo AI" />
        <div>
          <div className="copilot-title">Homeygo AI</div>
          <div className="copilot-subtitle">Ask me anything about your build</div>
        </div>
      </div>
      {onClose && <button className="copilot-close" onClick={onClose}>✕</button>}
    </div>
  );
}

function ChatBody({ messages, chips, loading, loadingLabel, onSuggest, bottomRef, suburbBanner, userHasTyped }) {
  const showWelcome = messages.length === 0 && !loading;

  return (
    <div className="copilot-body">
      {showWelcome && (
        <div className="copilot-welcome">
          {suburbBanner ? (
            <p className="copilot-welcome-text">Fetching insights for <strong>{suburbBanner}</strong>...</p>
          ) : (
            <>
              <p className="copilot-welcome-text">
                I can explain costs, suggest savings, or answer any questions about your build.
              </p>
              <div className="copilot-chips">
                {chips?.map((q, i) => (
                  <button key={i} className="copilot-chip" onClick={() => onSuggest(q)}>{q}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {messages.map((msg, i) => {
        if (msg.role === 'divider') {
          return (
            <div key={i} className="copilot-step-divider">
              <span className="copilot-step-divider-label">{msg.stepLabel}</span>
            </div>
          );
        }
        return (
          <div key={i} className={`copilot-msg copilot-msg-${msg.role}`}>
            {msg.role === 'assistant' && <img src="/homeygo-logo.png" className="copilot-msg-avatar copilot-msg-avatar-logo" alt="Homeygo AI" />}
            <div className="copilot-msg-bubble">
              {msg.role === 'assistant' && msg.stepLabel && (
                <div className="copilot-msg-step-tag">{msg.stepLabel}</div>
              )}
              <MessageText text={msg.content} />
            </div>
            {msg.role === 'user' && (
              <span className="copilot-msg-avatar copilot-msg-avatar-user">👤</span>
            )}
          </div>
        );
      })}

      {messages.length > 0 && !loading && !userHasTyped && chips?.length > 0 && (
        <div className="copilot-chips copilot-chips-follow">
          {chips.slice(0, 3).map((q, i) => (
            <button key={i} className="copilot-chip" onClick={() => onSuggest(q)}>{q}</button>
          ))}
        </div>
      )}

      {loading && (
        <div className="copilot-msg copilot-msg-assistant">
          <img src="/homeygo-logo.png" className="copilot-msg-avatar copilot-msg-avatar-logo" alt="Homeygo AI" />
          <div className="copilot-msg-bubble copilot-typing">
            {loadingLabel && <span className="copilot-updating-label">{loadingLabel}</span>}
            <span /><span /><span />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function ChatInput({ input, setInput, onSend, onKeyDown, loading, inputRef }) {
  return (
    <div className="copilot-input-row">
      <textarea
        ref={inputRef}
        className="copilot-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask about costs, savings, materials..."
        rows={1}
        disabled={loading}
      />
      <button className="copilot-send" onClick={() => onSend()} disabled={!input.trim() || loading} title="Send">
        ➤
      </button>
    </div>
  );
}

function renderInline(text) {
  if (!/\*\*/.test(text)) return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, j) =>
    /^\*\*.*\*\*$/.test(part)
      ? <strong key={j}>{part.replace(/\*\*/g, '')}</strong>
      : part
  );
}

function MessageText({ text }) {
  const lines = text.split('\n');
  return (
    <div className="copilot-msg-text">
      {lines.map((line, i) => {
        if (/^[•\-]\s/.test(line)) {
          return <div key={i} className="copilot-bullet">{renderInline(line.replace(/^[•\-]\s/, ''))}</div>;
        }
        if (/^\d+\.\s/.test(line)) {
          return <div key={i} className="copilot-bullet">{renderInline(line)}</div>;
        }
        if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
