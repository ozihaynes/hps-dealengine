"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { cn } from "../ui";

export type AddressSelection = {
  description: string;
  formattedAddress: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  lat: number;
  lng: number;
};

type AddressAutocompleteProps = {
  value: string;
  onValueChange?: (value: string) => void;
  onSelect: (selection: AddressSelection) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
};

type AutocompleteSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText?: string;
  fullText: string;
};

const libraries: ("places")[] = ["places"];

function parseAddressComponents(
  components: Array<{ longText?: string; shortText?: string; types?: string[] }> | undefined,
) {
  function pickComponent(
    comps: Array<{ longText?: string; shortText?: string; types?: string[] }> | undefined,
    type: string,
  ): string {
    return (
      comps?.find((c) => (c.types ?? []).includes(type))?.longText ??
      comps?.find((c) => (c.types ?? []).includes(type))?.shortText ??
      ""
    );
  }

  const streetNumber = pickComponent(components, "street_number");
  const route = pickComponent(components, "route");

  return {
    street: [streetNumber, route].filter(Boolean).join(" ").trim(),
    city:
      pickComponent(components, "locality") ||
      pickComponent(components, "sublocality") ||
      pickComponent(components, "administrative_area_level_2"),
    state: pickComponent(components, "administrative_area_level_1"),
    postalCode: pickComponent(components, "postal_code"),
  };
}

async function fetchAutocomplete(apiKey: string, input: string): Promise<AutocompleteSuggestion[]> {
  const response = await fetch("/api/places/autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new Error(`Places autocomplete failed (${response.status})`);
  }

  const data = (await response.json()) as any;
  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];

  return suggestions
    .map((s: any) => {
      const pred = s?.placePrediction;
      if (!pred?.placeId || !pred?.text?.text) return null;

      const mainText = pred.structuredFormat?.mainText?.text ?? pred.text.text;
      const secondaryText = pred.structuredFormat?.secondaryText?.text;

      return {
        placeId: pred.placeId,
        mainText,
        secondaryText,
        fullText: pred.text.text,
      } as AutocompleteSuggestion;
    })
    .filter(Boolean) as AutocompleteSuggestion[];
}

async function fetchPlaceDetails(apiKey: string, placeId: string) {
  const response = await fetch("/api/places/details", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ placeId }),
  });

  if (!response.ok) {
    throw new Error(`Place details failed (${response.status})`);
  }

  return (await response.json()) as any;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onValueChange,
  onSelect,
  label = "Property Street",
  placeholder = "Search address",
  disabled,
  className,
  inputClassName,
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 1. Load the script (required for legal attribution, even if using REST)
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-maps-script",
    googleMapsApiKey: apiKey ?? "",
    libraries,
  });

  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [query, setQuery] = useState(value);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  // Guard ref to prevent loop-back
  const skipFetch = useRef(false);

  // 2. Sync internal query with external value (BUT skip fetch when syncing)
  useEffect(() => {
    if (value !== query) {
      skipFetch.current = true; // <--- CRITICAL: Don't search if parent updated the value
      setQuery(value);
    }
  }, [value, query]);

  const readyToSearch = useMemo(
    () => Boolean(apiKey) && isLoaded && !loadError,
    [apiKey, isLoaded, loadError],
  );

  // 3. Debounced Fetch Effect
  useEffect(() => {
    if (!readyToSearch || disabled) return;

    // Check if we should skip this run (because we just selected/filled)
    if (skipFetch.current) {
      skipFetch.current = false; // Reset for next time
      return;
    }

    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setFetchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setFetching(true);
        setFetchError(null);
        const results = await fetchAutocomplete(apiKey!, query.trim());
        if (!controller.signal.aborted) {
          setSuggestions(results);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.warn("[AddressAutocomplete] fetch suggestions error", err);
          // Silent fail on abort or network blur
        }
      } finally {
        if (!controller.signal.aborted) {
          setFetching(false);
        }
      }
    }, 300); // 300ms debounce

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, apiKey, readyToSearch, disabled]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    onValueChange?.(event.target.value);
  };

  const handleSelect = async (suggestion: AutocompleteSuggestion) => {
    setResolving(true);

    // Flag to skip the next useEffect fetch
    skipFetch.current = true;

    setQuery(suggestion.fullText);
    onValueChange?.(suggestion.fullText);
    setSuggestions([]); // Clear dropdown immediately

    try {
      const detail = await fetchPlaceDetails(apiKey!, suggestion.placeId);
      const parsed = parseAddressComponents(detail?.addressComponents);

      onSelect({
        description: suggestion.fullText,
        formattedAddress: detail?.formattedAddress ?? suggestion.fullText,
        street: parsed.street || suggestion.fullText,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        lat: detail?.location?.latitude ?? Number.NaN,
        lng: detail?.location?.longitude ?? Number.NaN,
      });
    } catch (error) {
      console.warn("[AddressAutocomplete] failed to resolve selection", error);
      // Fallback
      onSelect({
        description: suggestion.fullText,
        formattedAddress: suggestion.fullText,
        street: suggestion.mainText,
        city: "",
        state: "",
        postalCode: "",
        lat: Number.NaN,
        lng: Number.NaN,
      });
    } finally {
      setResolving(false);
    }
  };

  const showSuggestions = suggestions.length > 0;

  return (
    <div className={cn("relative", className)}>
      {label ? <label className="mb-1 block text-base font-medium text-text-primary">{label}</label> : null}
      <div className="relative">
        <input
          value={query}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-md border border-white/10 bg-slate-800/90 px-3 py-2 text-sm text-white placeholder:text-slate-400",
            "focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/40",
            "disabled:cursor-not-allowed disabled:opacity-60",
            inputClassName,
          )}
          onBlur={() => setTimeout(() => setSuggestions([]), 200)}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-300/70">
          {resolving ? "Resolving..." : readyToSearch ? "Powered by Google" : "Manual entry"}
        </div>
      </div>

      {readyToSearch && showSuggestions ? (
        <ul className="absolute z-[60] mt-2 w-full overflow-hidden rounded-md border border-white/10 bg-slate-800/95 shadow-xl backdrop-blur">
          {suggestions.map((suggestion) => (
            <li key={suggestion.placeId}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-white hover:bg-slate-700"
                onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                onClick={() => handleSelect(suggestion)}
              >
                <span className="flex-1">
                  <span className="block font-medium">{suggestion.mainText}</span>
                  {suggestion.secondaryText ? (
                    <span className="block text-xs text-slate-300/80">{suggestion.secondaryText}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1 text-[10px] text-slate-500 bg-slate-900/50 text-right">Google Places</li>
        </ul>
      ) : null}

      {fetchError ? <p className="mt-1 text-xs text-accent-orange">{fetchError}</p> : null}

      {(!apiKey || loadError) && (
        <p className="mt-1 text-xs text-accent-orange">
          Google Maps API key missing or invalid. Check .env.local
        </p>
      )}
    </div>
  );
};

export default AddressAutocomplete;
