import { useState, useRef, useEffect } from 'react';

const STEP_META = {
  1: { label: '📍 Location Insights',     chips: ['What are typical council fees here?', 'How do site costs compare to the state?', 'What permits will I need?'] },
  2: { label: '📐 Build Size Insights',   chips: ['Can I build a granny flat on this land?', 'What is a site coverage ratio?', 'How do setbacks affect my floor plan?'] },
  3: { label: '🛏️ Room & Layout Insights', chips: ['How much does an extra bathroom cost?', 'What is the ideal bedroom size?', 'Can I add an ensuite later?'] },
  4: { label: '🚗 Garage Insights',        chips: ['Does a garage add resale value?', 'What are garage setback rules?', 'Carport vs garage cost difference?'] },
  5: { label: '🏗️ Build Type Insights',   chips: ['What is the cheapest build method?', 'Project home vs custom — real cost difference?', 'Which quality tier gives best resale?'] },
  6: { label: '✨ Inclusions Insights',    chips: ['Which inclusions add the most resale value?', 'Is a pool worth it?', 'Solar payback period in my area?'] },
  7: { label: '📋 Pre-Estimate Summary',  chips: ['What should I ask my builder?', 'How accurate will the estimate be?', 'What costs are typically underestimated?'] },
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

const BUILD_METHOD_LABELS = {
  brick_veneer: 'Brick veneer',
  double_brick: 'Double brick',
  timber_frame: 'Timber frame',
  steel_frame: 'Steel frame',
};

const QUALITY_LABELS = {
  budget: 'budget/entry-level',
  mid: 'mid-range',
  premium: 'premium/luxury',
};

const DESIGN_LABELS = {
  project_home: 'project home (volume builder)',
  custom_design: 'custom architect-designed',
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

  // Mutable refs that always reflect latest values — safe to read inside timeouts
  const currentStepRef = useRef(currentStep);
  const formDataRef = useRef(formData);
  const loadingRef = useRef(false);
  // Stores the data key that was used the last time each step's insight was generated
  const lastStepDataRef = useRef({ 3: null, 4: null, 5: null, 6: null, 7: null });
  // Per-step debounce timers
  const stepDebounceRef = useRef({});

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { onMessagesChange?.(messages); }, [messages]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { formDataRef.current = formData; });   // every render — no deps intentional
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // ── Data-key helpers ──────────────────────────────────────────────────────
  // Returns a string representing the fields that drive a given step's insight.
  // If the key changes, that step's insight is stale and needs regenerating.
  function getStepDataKey(step, fd) {
    if (!fd) return '';
    switch (step) {
      case 3: return [fd.bedrooms, fd.bathrooms, fd.toilets, fd.study, fd.houseSize].join('|');
      case 4: return [fd.garageType, fd.garageSpaces, fd.houseSize, fd.landSize].join('|');
      case 5: return [fd.buildMethod, fd.designType, fd.qualityTier, fd.houseSize].join('|');
      case 6: return [fd.kitchenFinish, fd.flooringType, fd.landscaping, fd.pool, fd.solar, fd.ductedAC, fd.alfresco, fd.houseSize].join('|');
      case 7: return [fd.bedrooms, fd.bathrooms, fd.houseSize, fd.landSize, fd.buildMethod, fd.qualityTier, fd.specialRequirements].join('|');
      default: return '';
    }
  }

  // ── Re-trigger: strip the old step insight and regenerate ─────────────────
  // Finds the most recent divider for stepNum, truncates everything from there,
  // then calls triggerFn() which appends a fresh divider + new insight.
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

  // ── Step 1: suburb + state ────────────────────────────────────────────────
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
      // Reset all step data keys so re-navigate triggers correctly after suburb change
      lastStepDataRef.current = { 3: null, 4: null, 5: null, 6: null, 7: null };
      setOpen(true);
      triggerStep1(suburb, state);
    }, 800);
    return () => clearTimeout(suburbDebounceRef.current);
  }, [formData?.suburb, formData?.state]);

  // ── Step 2: land size, house size, storeys ───────────────────────────────
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

      // On re-trigger (not the very first time), strip the old Step 2 insight
      // so the user sees the fresh response instead of it appending below the stale one
      if (prevKey !== '') {
        const stepLabel = STEP_META[2]?.label;
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
          setLoadingLabel('Updating insights…');
        }
      }

      setOpen(true);
      triggerStep2(land, house);
    }, 800);
    return () => clearTimeout(sizeDebounceRef.current);
  }, [formData?.landSize, formData?.houseSize, formData?.storeys]);

  // ── Steps 3–7: navigate to step ──────────────────────────────────────────
  // Fires on first visit OR when re-navigating to a step whose data changed
  useEffect(() => {
    if (currentStep < 3 || currentStep > 7) return;
    const stepFns = { 3: triggerStep3, 4: triggerStep4, 5: triggerStep5, 6: triggerStep6, 7: triggerStep7 };
    const currentDataKey = getStepDataKey(currentStep, formDataRef.current);

    if (!visitedStepsRef.current.has(currentStep)) {
      visitedStepsRef.current.add(currentStep);
      lastStepDataRef.current[currentStep] = currentDataKey;
      setOpen(true);
      stepFns[currentStep]?.();
    } else if (lastStepDataRef.current[currentStep] !== currentDataKey) {
      // Re-navigated to this step and the relevant data changed since last insight
      setOpen(true);
      retriggerStep(currentStep, stepFns[currentStep]);
    }
  }, [currentStep, isFloating]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Steps 3–7: data change while user is on that step (debounced 400ms) ──
  // Each effect watches only the fields relevant to its step.
  // The check inside uses refs so the timeout callback has the latest values.

  const step3Key = [formData?.bedrooms, formData?.bathrooms, formData?.toilets, formData?.study, formData?.houseSize].join('|');
  const step4Key = [formData?.garageType, formData?.garageSpaces, formData?.houseSize, formData?.landSize].join('|');
  const step5Key = [formData?.buildMethod, formData?.designType, formData?.qualityTier, formData?.houseSize].join('|');
  const step6Key = [formData?.kitchenFinish, formData?.flooringType, formData?.landscaping, formData?.pool, formData?.solar, formData?.ductedAC, formData?.alfresco, formData?.houseSize].join('|');
  const step7Key = [formData?.bedrooms, formData?.bathrooms, formData?.houseSize, formData?.landSize, formData?.buildMethod, formData?.qualityTier, formData?.specialRequirements].join('|');

  useEffect(() => {
    if (currentStepRef.current !== 3 || !visitedStepsRef.current.has(3)) return;
    clearTimeout(stepDebounceRef.current[3]);
    stepDebounceRef.current[3] = setTimeout(() => {
      if (currentStepRef.current !== 3) return;
      retriggerStep(3, triggerStep3);
    }, 400);
    return () => clearTimeout(stepDebounceRef.current[3]);
  }, [step3Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 4 || !visitedStepsRef.current.has(4)) return;
    clearTimeout(stepDebounceRef.current[4]);
    stepDebounceRef.current[4] = setTimeout(() => {
      if (currentStepRef.current !== 4) return;
      retriggerStep(4, triggerStep4);
    }, 400);
    return () => clearTimeout(stepDebounceRef.current[4]);
  }, [step4Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 5 || !visitedStepsRef.current.has(5)) return;
    clearTimeout(stepDebounceRef.current[5]);
    stepDebounceRef.current[5] = setTimeout(() => {
      if (currentStepRef.current !== 5) return;
      retriggerStep(5, triggerStep5);
    }, 400);
    return () => clearTimeout(stepDebounceRef.current[5]);
  }, [step5Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 6 || !visitedStepsRef.current.has(6)) return;
    clearTimeout(stepDebounceRef.current[6]);
    stepDebounceRef.current[6] = setTimeout(() => {
      if (currentStepRef.current !== 6) return;
      retriggerStep(6, triggerStep6);
    }, 400);
    return () => clearTimeout(stepDebounceRef.current[6]);
  }, [step6Key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentStepRef.current !== 7 || !visitedStepsRef.current.has(7)) return;
    clearTimeout(stepDebounceRef.current[7]);
    stepDebounceRef.current[7] = setTimeout(() => {
      if (currentStepRef.current !== 7) return;
      retriggerStep(7, triggerStep7);
    }, 400);
    return () => clearTimeout(stepDebounceRef.current[7]);
  }, [step7Key]); // eslint-disable-line react-hooks/exhaustive-deps

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
- Point 5: A "Did you know" style fact about ${suburb}'s population growth, development pipeline, or major planned infrastructure — written in an engaging, specific way with real numbers or project names where possible. Example style: "Did you know that ${suburb} is rapidly transforming into one of [region]'s biggest growth hubs, with [specific project/investment] alongside [other developments], bringing thousands of new jobs and homes to the area."
Keep all points friendly, specific to ${suburb}, and focused on what a home builder needs to know.`;
    await callAPI(prompt, 1, false, base);
  }

  async function triggerStep2(land, house) {
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

  async function triggerStep3() {
    const { bedrooms = 4, bathrooms = 2, toilets = 2, study = false, houseSize, suburb, state } = formDataRef.current || {};
    setActiveStep(3);
    setLoading(true);
    const prompt = `I'm planning a ${bedrooms}-bedroom, ${bathrooms}-bathroom home with ${toilets} toilet(s) total${study ? ' and a study/home office' : ''}. Floor area: ${houseSize || 'not yet set'}m² in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Wet area cost impact** — How much do ${bathrooms} bathrooms + ${toilets} toilets add to the build? What does adding an extra bathroom typically cost?
2. **Room ratio check** — Is this bedroom/bathroom count appropriate for ${houseSize || 'this'} m²? Any layout red flags?
3. **Common layout mistakes** — Top 2 mistakes to avoid with ${bedrooms} bedrooms in Australian home design.
4. **Cost saving tip** — One practical way to reduce plumbing/tiling costs without sacrificing liveability.`;
    await callAPI(prompt, 3, true);
  }

  async function triggerStep4() {
    const { garageType = 'single_garage', houseSize, suburb, state, landSize } = formDataRef.current || {};
    const garageLabel = GARAGE_LABELS[garageType] || garageType;
    setActiveStep(4);
    setLoading(true);
    const prompt = `I'm planning a ${garageLabel} for my ${houseSize || ''}m² home on a ${landSize || ''}m² block in ${suburb || 'Australia'}, ${state || ''}.

Please provide:
1. **Cost estimate** — What does a ${garageLabel} typically cost to build in ${suburb || 'Australia'}, ${state || ''}? Include the range (budget to premium).
2. **Council rules** — Key garage setback rules, maximum height limits, and any other council restrictions for ${suburb || 'this area'}.
3. **Value vs cost** — Does a ${garageLabel} typically add more value than it costs in this market? What does the data say?
4. **Smart alternative** — Is there a cheaper parking option worth considering, and when does it make sense?`;
    await callAPI(prompt, 4, true);
  }

  async function triggerStep5() {
    const { buildMethod = 'brick_veneer', designType = 'project_home', qualityTier = 'mid', houseSize, suburb, state } = formDataRef.current || {};
    const methodLabel = BUILD_METHOD_LABELS[buildMethod] || buildMethod;
    const qualityLabel = QUALITY_LABELS[qualityTier] || qualityTier;
    const designLabel = DESIGN_LABELS[designType] || designType;
    setActiveStep(5);
    setLoading(true);
    const prompt = `I've chosen: **${methodLabel}** construction, **${designLabel}** design, **${qualityLabel}** finish quality — for my ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}.

Please advise:
1. **Cost comparison** — How does ${methodLabel} + ${designLabel} compare in cost per m² to other common combinations? Give approximate AUD ranges.
2. **Local suitability** — Is ${methodLabel} a good choice for ${suburb || 'this area'}'s climate, soil type, and termite risk?
3. **Quality tier reality** — What's the actual dollar difference between ${qualityLabel} and mid-range finishes for this size home?
4. **Builder selection tip** — What should I specifically look for or ask when choosing a builder for this combination?`;
    await callAPI(prompt, 5, true);
  }

  async function triggerStep6() {
    const { kitchenFinish = 'standard', flooringType = 'mixed', landscaping = 'basic', pool = false, solar = false, ductedAC = false, alfresco = false, houseSize, suburb, state } = formDataRef.current || {};
    const inclusions = [
      pool && 'swimming pool',
      solar && 'solar panels',
      ductedAC && 'ducted air conditioning',
      alfresco && 'alfresco/outdoor entertaining area',
    ].filter(Boolean);
    setActiveStep(6);
    setLoading(true);
    const prompt = `My inclusions for a ${houseSize || ''}m² home in ${suburb || 'Australia'}, ${state || ''}:
- Kitchen: ${KITCHEN_LABELS[kitchenFinish] || kitchenFinish}
- Flooring: ${FLOORING_LABELS[flooringType] || flooringType}
- Landscaping: ${LANDSCAPING_LABELS[landscaping] || landscaping}
- Extras: ${inclusions.length ? inclusions.join(', ') : 'none selected'}

Please provide:
1. **Total inclusions cost** — Approximate combined cost for these specific selections (AUD range).
2. **Best ROI pick** — Which of these inclusions adds the most resale value in ${suburb || 'this area'}?
3. **Biggest luxury vs need** — Which item is the most expensive relative to its everyday benefit?
4. **Smart deferral** — Which inclusion could I leave out now and add later without major extra cost?`;
    await callAPI(prompt, 6, true);
  }

  async function triggerStep7() {
    const { bedrooms = 4, bathrooms = 2, houseSize, landSize, buildMethod = 'brick_veneer', qualityTier = 'mid', suburb, state, specialRequirements } = formDataRef.current || {};
    const methodLabel = BUILD_METHOD_LABELS[buildMethod] || buildMethod;
    const qualityLabel = QUALITY_LABELS[qualityTier] || qualityTier;
    setActiveStep(7);
    setLoading(true);
    const prompt = `I'm about to generate a construction estimate for my project in ${suburb || 'Australia'}, ${state || ''}:
- Land: ${landSize || '?'}m², House: ${houseSize || '?'}m², ${bedrooms}bd/${bathrooms}ba
- ${methodLabel} construction, ${qualityLabel} finish
${specialRequirements ? `- Special requirements: ${specialRequirements}` : '- No special requirements noted'}

As a final pre-estimate check, please provide:
1. **Project snapshot** — A 2-sentence summary of this build and its main cost drivers.
2. **Biggest budget risk** — The #1 factor most likely to push the final cost above estimate for this specific project.
3. **Questions to ask your builder** — 3 specific questions to ask before signing a contract for this type of build.
4. **What to expect** — A rough price range to mentally prepare for before seeing the full AI estimate.`;
    await callAPI(prompt, 7, true);
  }

  // ── Core API caller ───────────────────────────────────────────────────────
  async function callAPI(prompt, stepNum, append, baseMsgs = []) {
    const hiddenMsg = { role: 'user', content: prompt, hidden: true, stepLabel: STEP_META[stepNum]?.label };
    const divider = { role: 'divider', stepLabel: STEP_META[stepNum]?.label };

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
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate_limit') || err?.message?.includes('Rate limit');
      const fallback = {
        role: 'assistant',
        content: isRateLimit
          ? `⏳ Groq API daily token limit reached. Insights will load again in a few minutes — feel free to continue filling in your project details.`
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
      setLoadingLabel(''); // clear "Updating insights…" once done
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
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate_limit') || err?.message?.includes('Rate limit');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isRateLimit
          ? '⏳ Groq API daily token limit reached. Please wait a few minutes and try again.'
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
        <button className="copilot-fab" onClick={() => setOpen(o => !o)} title="Ask the AI Copilot">
          {open ? '✕' : '💬'}
          {!open && <span className="copilot-fab-label">Ask Copilot</span>}
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
        <span className="copilot-icon">🤖</span>
        <div>
          <div className="copilot-title">AI Copilot</div>
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
            {msg.role === 'assistant' && <span className="copilot-msg-avatar">🤖</span>}
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
          <span className="copilot-msg-avatar">🤖</span>
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
