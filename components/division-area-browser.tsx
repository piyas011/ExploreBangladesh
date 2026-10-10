"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  getAreaDisplayName,
  type GeoArea,
  type GeoLevel,
} from "@/lib/geo-data";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

type DivisionAreaBrowserProps = {
  areas: GeoArea[];
  selectedAreas: Record<string, { id: string; name: string; color: string }>;
  onToggleArea: (area: GeoArea) => void;
  onVisibleLevelChange: (level: GeoLevel | "all") => void;
};

export function DivisionAreaBrowser({
  areas,
  selectedAreas,
  onToggleArea,
  onVisibleLevelChange,
}: DivisionAreaBrowserProps) {
  const { language, t } = useLanguage();
  const [expandedDivisionId, setExpandedDivisionId] = useState<string | null>(
    null,
  );
  const [expandedDistrictId, setExpandedDistrictId] = useState<string | null>(
    null,
  );
  const divisions = areas.filter((area) => area.level === "division");
  const districts = areas.filter((area) => area.level === "district");
  const upazilas = areas.filter((area) => area.level === "upazila");
  const expandedDivision = divisions.find(
    (area) => area.id === expandedDivisionId,
  );
  const divisionDistricts = expandedDivision
    ? districts.filter((area) => area.parentName === expandedDivision.name)
    : [];

  return (
    <section className="rounded-md border border-[#e4dfd4] bg-[#fffdfa] p-3 shadow-sm xl:sticky xl:top-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">
          {t("divisions")}
        </h2>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          {divisions.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {divisions.map((division) => {
          const selected = Boolean(selectedAreas[division.id]);
          const expanded = expandedDivisionId === division.id;
          const districtCount = districts.filter(
            (district) => district.parentName === division.name,
          ).length;

          return (
            <div
              key={division.id}
              className={`flex min-w-0 items-stretch overflow-hidden rounded-md border transition ${
                selected
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
              }`}
            >
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  onToggleArea(division);
                  setExpandedDivisionId(division.id);
                  setExpandedDistrictId(null);
                  onVisibleLevelChange("division");
                }}
                className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-800">
                    {getAreaDisplayName(division, language)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {districtCount} {t("districts")}
                  </span>
                </span>
                {selected ? (
                  <Check
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-emerald-700"
                  />
                ) : null}
              </button>
              <button
                type="button"
                aria-label={t("districts")}
                aria-expanded={expanded}
                title={t("districts")}
                onClick={() => {
                  setExpandedDivisionId(expanded ? null : division.id);
                  setExpandedDistrictId(null);
                  onVisibleLevelChange("district");
                }}
                className="grid w-8 shrink-0 place-items-center border-l border-slate-200/80 text-slate-500 hover:bg-emerald-100 hover:text-emerald-800"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {expandedDivision ? (
        <div className="mt-3 border-t border-[#e4dfd4] pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">
              {getAreaDisplayName(expandedDivision, language)}
            </h3>
            <span className="text-xs text-slate-500">
              {divisionDistricts.length} {t("districts")}
            </span>
          </div>
          <div className="max-h-[390px] space-y-1 overflow-y-auto pr-1">
            {divisionDistricts.map((district) => {
              const districtSelected = Boolean(selectedAreas[district.id]);
              const districtExpanded = expandedDistrictId === district.id;
              const districtUpazilas = upazilas.filter(
                (upazila) => upazila.parentName === district.name,
              );

              return (
                <div key={district.id}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={districtSelected}
                      onClick={() => {
                        onToggleArea(district);
                        onVisibleLevelChange("district");
                      }}
                      className={`flex min-w-0 flex-1 items-center justify-between rounded-full border px-2.5 py-1.5 text-left text-xs transition ${
                        districtSelected
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-[#e4dfd4] bg-[#f5f2ea] text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      <span className="truncate">
                        {getAreaDisplayName(district, language)}
                      </span>
                      {districtSelected ? (
                        <Check
                          aria-hidden="true"
                          className="ml-2 h-4 w-4 shrink-0 text-emerald-700"
                        />
                      ) : null}
                    </button>
                    <button
                      type="button"
                      aria-label={t("upazilas")}
                      aria-expanded={districtExpanded}
                      title={t("upazilas")}
                      onClick={() => {
                        setExpandedDistrictId(
                          districtExpanded ? null : district.id,
                        );
                        onVisibleLevelChange("upazila");
                      }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 transition-transform ${districtExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                  {districtExpanded ? (
                    <div className="mb-1 ml-2 grid grid-cols-2 gap-1 border-l border-slate-200 py-1 pl-2">
                      {districtUpazilas.map((upazila) => {
                        const selected = Boolean(selectedAreas[upazila.id]);

                        return (
                          <button
                            key={upazila.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              onToggleArea(upazila);
                              onVisibleLevelChange("upazila");
                            }}
                            className={`flex min-w-0 items-center justify-between rounded-full border px-2 py-1 text-left text-[11px] transition ${
                              selected
                                ? "border-emerald-700 bg-emerald-700 text-white"
                                : "border-[#e4dfd4] bg-[#f5f2ea] text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                            }`}
                          >
                            <span className="truncate">
                              {getAreaDisplayName(upazila, language)}
                            </span>
                            {selected ? (
                              <Check
                                aria-hidden="true"
                                className="ml-2 h-3.5 w-3.5 shrink-0 text-emerald-700"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
