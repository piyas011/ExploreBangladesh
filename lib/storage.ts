import type { GeoArea, GeoLevel } from "@/lib/geo-data";

export type SelectedArea = {
  id: string;
  name: string;
  nameBn?: string;
  level: GeoLevel;
  color: string;
  visitedAt: string;
};

export type TravelPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  visitedAt: string;
  notes: string;
  relatedAreaId?: string;
};

export type TravelState = {
  selectedAreas: Record<string, SelectedArea>;
  pins: TravelPin[];
  showSelectedNames?: boolean;
};

export const STORAGE_KEY = "bangladesh-travel-tracker-state";

export function hashString(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateStableColor(seed: string) {
  const hue = hashString(seed) % 360;
  return `hsl(${hue} 68% 46%)`;
}

function generateAvailableColor(seed: string, unavailable: Set<string>) {
  const baseHue = hashString(seed) % 360;
  const saturations = [62, 72, 82];
  const lightnesses = [38, 46, 54, 62];
  for (
    let attempt = 0;
    attempt < 360 * saturations.length * lightnesses.length;
    attempt += 1
  ) {
    const hue = (baseHue + (attempt % 360) * 137) % 360;
    const saturation =
      saturations[Math.floor(attempt / 360) % saturations.length];
    const lightness =
      lightnesses[Math.floor(attempt / (360 * saturations.length))];
    const color = `hsl(${hue} ${saturation}% ${lightness}%)`;
    if (!unavailable.has(color)) return color;
  }
  return generateStableColor(seed);
}

export function getDefaultBackgroundColor() {
  return "rgba(92, 153, 255, 0.28)";
}

export function loadTravelState(): TravelState {
  if (typeof window === "undefined") {
    return { selectedAreas: {}, pins: [], showSelectedNames: true };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { selectedAreas: {}, pins: [], showSelectedNames: true };

    const parsed = JSON.parse(saved) as Partial<TravelState>;
    const selectedAreas =
      parsed.selectedAreas && typeof parsed.selectedAreas === "object"
        ? parsed.selectedAreas
        : {};
    const pins = Array.isArray(parsed.pins) ? parsed.pins : [];

    return {
      selectedAreas,
      pins,
      showSelectedNames:
        typeof parsed.showSelectedNames === "boolean"
          ? parsed.showSelectedNames
          : true,
    };
  } catch {
    return { selectedAreas: {}, pins: [], showSelectedNames: true };
  }
}

export function saveTravelState(state: TravelState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      selectedAreas: state.selectedAreas,
      pins: state.pins,
      showSelectedNames: state.showSelectedNames ?? true,
    }),
  );
}

export function ensureAreaColor(
  area: GeoArea,
  current: Record<string, SelectedArea>,
) {
  const currentSelection = current[area.id];
  if (currentSelection?.color) return currentSelection.color;
  const unavailable = new Set(
    Object.values(current).map((selected) => selected.color),
  );
  return generateAvailableColor(area.id, unavailable);
}

export function resetAreaColors(current: Record<string, SelectedArea>) {
  const reset: Record<string, SelectedArea> = {};
  for (const area of Object.values(current).sort((first, second) =>
    first.id.localeCompare(second.id),
  )) {
    const unavailable = new Set(
      Object.values(reset).map((selected) => selected.color),
    );
    reset[area.id] = {
      ...area,
      color: generateAvailableColor(area.id, unavailable),
    };
  }
  return reset;
}
