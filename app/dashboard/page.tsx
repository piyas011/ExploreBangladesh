"use client";

import { useState } from "react";
import { ArrowLeft, MapPinned, Trophy } from "lucide-react";
import Link from "next/link";
import { getAreaDisplayName } from "@/lib/geo-data";
import { useLanguage } from "@/lib/i18n";
import { useHydrated } from "@/lib/hydration";
import type { TravelPin, SelectedArea } from "@/lib/storage";
import { LanguageSwitcher } from "@/components/language-switcher";

function loadSavedData() {
  if (typeof window === "undefined") return { selectedAreas: {}, pins: [] };
  try {
    const raw = window.localStorage.getItem("bangladesh-travel-tracker-state");
    return raw ? JSON.parse(raw) : { selectedAreas: {}, pins: [] };
  } catch {
    return { selectedAreas: {}, pins: [] };
  }
}

export default function DashboardPage() {
  const { language, t } = useLanguage();
  const hydrated = useHydrated();
  const [initialData] = useState(() => loadSavedData());
  const [selectedAreas] = useState<Record<string, SelectedArea>>(
    initialData.selectedAreas ?? {},
  );
  const [pins] = useState<TravelPin[]>(initialData.pins ?? []);
  const visibleAreas = hydrated ? selectedAreas : {};
  const visiblePins = hydrated ? pins : [];

  const divisions = Object.values(visibleAreas).filter(
    (area) => area.level === "division",
  ).length;
  const districts = Object.values(visibleAreas).filter(
    (area) => area.level === "district",
  ).length;
  const upazilas = Object.values(visibleAreas).filter(
    (area) => area.level === "upazila",
  ).length;

  const cards = [
    { label: "visitedDivisions", value: divisions },
    { label: "visitedDistricts", value: districts },
    { label: "visitedUpazilas", value: upazilas },
    { label: "travelPins", value: visiblePins.length },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
              {t("dashboard")}
            </div>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">
              {t("dashboardTitle")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" /> {t("backToMap")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <MapPinned className="h-5 w-5 text-blue-600" />
                <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400">
                  {t("live")}
                </span>
              </div>
              <div className="mt-4 text-3xl font-semibold text-slate-900">
                {card.value}
              </div>
              <div className="mt-1 text-sm text-slate-600">{t(card.label)}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Trophy className="h-4 w-4 text-amber-500" />
              {t("selectedAreaColors")}
            </div>
            <div className="space-y-2">
              {Object.values(visibleAreas).length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  {t("noAreasSelected")}
                </div>
              ) : (
                Object.values(visibleAreas).map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: area.color }}
                      />
                      {getAreaDisplayName(area, language)}
                    </span>
                    <span className="text-xs uppercase tracking-[0.08em] text-slate-400">
                      {t(area.level)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              {t("pinnedPlaces")}
            </div>
            <div className="space-y-2">
              {visiblePins.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  {t("noPins")}
                </div>
              ) : (
                visiblePins.map((pin) => (
                  <div
                    key={pin.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="font-medium text-slate-800">{pin.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {pin.visitedAt}
                    </div>
                    {pin.notes ? (
                      <div className="mt-2 text-sm text-slate-600">
                        {pin.notes}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
