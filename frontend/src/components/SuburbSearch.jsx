import { useState, useRef, useEffect } from 'react';
import { SUBURBS } from '../data/suburbs';

const MAX_RESULTS = 8;

// Fast prefix match against the static list for instant results while API loads
function staticSearch(q) {
  const lower = q.toLowerCase();
  const isPostcode = /^\d+$/.test(q);
  return SUBURBS.filter(([name, postcode]) =>
    isPostcode ? postcode.startsWith(q) : name.toLowerCase().startsWith(lower)
  ).slice(0, MAX_RESULTS);
}

export default function SuburbSearch({ value, onChange, onStateDetected }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [highlighted, setHighlighted] = useState(-1);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    setHighlighted(-1);
    clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    // Show static results instantly while the API call is in flight
    const instant = staticSearch(q.trim());
    if (instant.length > 0) {
      setSuggestions(instant);
      setOpen(true);
    }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setSearching(true);

      try {
        const res = await fetch(`/api/suburbs?q=${encodeURIComponent(q.trim())}`, {
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          // Merge API results with static, deduplicate by name+postcode
          const seen = new Set(data.map(([n, p]) => `${n.toLowerCase()}|${p}`));
          const merged = [...data];
          for (const item of instant) {
            const key = `${item[0].toLowerCase()}|${item[1]}`;
            if (!seen.has(key)) { seen.add(key); merged.push(item); }
          }
          setSuggestions(merged.slice(0, MAX_RESULTS));
          setOpen(true);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        // API failed — static results already shown, no further action needed
      } finally {
        setSearching(false);
      }
    }, 450);
  }

  function selectSuggestion(item) {
    const [name, , state] = item;
    setQuery(name);
    onChange(name);
    if (onStateDetected) onStateDetected(state);
    setSuggestions([]);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && suggestions[highlighted]) {
        e.preventDefault();
        selectSuggestion(suggestions[highlighted]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="suburb-search" ref={wrapRef}>
      <input
        type="text"
        placeholder="e.g. West Melbourne, Parramatta, Chermside"
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
        autoFocus
      />
      {searching && <div className="suburb-searching">Searching all suburbs…</div>}
      {open && (
        <ul className="suburb-dropdown" role="listbox">
          {suggestions.map((item, i) => {
            const [name, postcode, state] = item;
            return (
              <li
                key={`${name}-${postcode}`}
                role="option"
                aria-selected={i === highlighted}
                className={i === highlighted ? 'highlighted' : ''}
                onMouseDown={() => selectSuggestion(item)}
                onMouseEnter={() => setHighlighted(i)}
              >
                <span className="suburb-name">{name}</span>
                <span className="suburb-meta">{postcode} &middot; {state}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
