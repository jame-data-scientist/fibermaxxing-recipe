"use client";

import { useEffect, useRef, useState } from "react";

import type { FoodOption } from "@/lib/foods";
import { formatNumber } from "@/lib/utils";

/**
 * Ingredient search. Results come from the local USDA catalog first, so
 * typing never waits on USDA; only a cache miss reaches the API.
 */
export function FoodPicker({
  onSelect,
  placeholder = "Search an ingredient — oats, lentils, chicken…",
  autoFocus = false,
}: {
  onSelect: (food: FoodOption) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/foods/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { foods?: FoodOption[] };
        setResults(data.foods ?? []);
        setActive(0);
      } catch {
        /* aborted or offline: keep the previous list */
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  function choose(food: FoodOption) {
    onSelect(food);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="food-results"
        aria-autocomplete="list"
        autoFocus={autoFocus}
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!results.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % results.length);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + results.length) % results.length);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const food = results[active];
            if (food) choose(food);
          }
        }}
        className="h-11 w-full rounded-md border border-line-strong bg-white px-3 text-[16px] text-ink placeholder:text-moss/60 focus:border-forest focus:outline-none sm:text-[15px]"
      />

      {open ? (
        <div
          id="food-results"
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto border border-line bg-white shadow-[0_12px_32px_rgba(18,20,15,0.08)]"
          onMouseDown={(event) => event.preventDefault()}
        >
          {loading && !results.length ? (
            <p className="px-3 py-3 text-[12px] text-moss">Searching…</p>
          ) : null}

          {!loading && !results.length ? (
            <p className="px-3 py-3 text-[12px] text-moss">
              No match. Try a simpler word — “oats” rather than “rolled oats”.
            </p>
          ) : null}

          {results.map((food, index) => (
            <button
              key={food.fdcId}
              type="button"
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(food)}
              className={`block w-full px-3 py-2.5 text-left ${
                index === active ? "bg-paper-deep" : "bg-white"
              }`}
            >
              <span className="block text-[13px] font-medium text-ink">
                {food.commonName ?? food.description}
              </span>
              {food.commonName ? (
                <span className="mt-0.5 block truncate text-[11px] text-moss">
                  {food.description}
                </span>
              ) : null}
              <span className="mt-0.5 block font-mono text-[10px] text-moss">
                {formatNumber(food.fiberG ?? 0)} g fibre ·{" "}
                {formatNumber(food.proteinG ?? 0)} g protein / 100 g
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
