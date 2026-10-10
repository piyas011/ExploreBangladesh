"use client";

import { Check, MapPinned, Search } from "lucide-react";
import {
  getAreaDisplayName,
  type GeoArea,
  type GeoLevel,
} from "@/lib/geo-data";
import { useLanguage } from "@/lib/i18n";

export type GeographicSearchProps = {
  items: GeoArea[];
  selectedAreas: Record<string, { id: string; color: string; name: string }>;
  onToggleArea: (area: GeoArea) => void;
  visibleLevel: GeoLevel | "all";
  onVisibleLevelChange: (next: GeoLevel | "all") => void;
  searchTerm: string;
  onSearchChange: (next: string) => void;
  showOnlySelected: boolean;
  onShowOnlySelectedChange: (next: boolean) => void;
};

export function GeographicSearch({
  items,
  selectedAreas,
  onToggleArea,
  visibleLevel,
  onVisibleLevelChange,
  searchTerm,
  onSearchChange,
  showOnlySelected,
  onShowOnlySelectedChange,
}: GeographicSearchProps) {
  const { language, t } = useLanguage();
  const filtered = items.filter((area) => {
    const matchesLevel = visibleLevel === "all" || area.level === visibleLevel;
    const query = searchTerm.trim().toLocaleLowerCase();
    const matchesSearch = [
      area.name,
      area.nameBn ?? "",
      area.parentName ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(query));
    const selected = Boolean(selectedAreas[area.id]);
    const matchesSelection = !showOnlySelected || selected;
    return matchesLevel && matchesSearch && matchesSelection;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <MapPinned className="h-4 w-4 text-emerald-600" />
          {t("searchAreas")}
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
          aria-pressed={showOnlySelected}
          onClick={() => onShowOnlySelectedChange(!showOnlySelected)}
        >
          {showOnlySelected ? t("showVisitedOnly") : t("allAreas")}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["all", "division", "district", "upazila"] as const).map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={visibleLevel === level}
            onClick={() => onVisibleLevelChange(level)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              visibleLevel === level
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {level === "all" ? t("allLevels") : t(level)}
          </button>
        ))}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchAreas")}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none ring-0 transition focus:border-blue-300 focus:bg-white"
        />
      </label>

      <div className="mt-4 max-h-[440px] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            {t("noResults")}
          </div>
        ) : (
          filtered.map((area) => {
            const chosenColor = selectedAreas[area.id]?.color ?? "#dbeafe";
            const isSelected = Boolean(selectedAreas[area.id]);

            return (
              <button
                type="button"
                key={area.id}
                onClick={() => {
                  onToggleArea(area);
                  onVisibleLevelChange(area.level);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                  isSelected
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-200"
                    style={{ background: chosenColor }}
                    aria-label={`Selected color for ${area.name}`}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">
                      {getAreaDisplayName(area, language)}
                    </span>
                    <span className="block text-[11px] uppercase tracking-[0.08em] text-slate-400">
                      {t(area.level)}
                    </span>
                  </span>
                </span>

                <span className="flex items-center gap-2">
                  {isSelected ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                      <Check className="h-3 w-3" /> {t("selected")}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">
                      {t("select")}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
