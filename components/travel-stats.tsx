"use client";

import { MapPinned, Map as MapIcon, Route, Landmark } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export type TravelStatsProps = {
  divisions: number;
  districts: number;
  upazilas: number;
  pins: number;
  totalDivisions: number;
  totalDistricts: number;
  totalUpazilas: number;
};

const cards = [
  { key: "divisions", label: "visitedDivisions", icon: MapIcon },
  { key: "districts", label: "visitedDistricts", icon: Landmark },
  { key: "upazilas", label: "visitedUpazilas", icon: Route },
  { key: "pins", label: "markedPlaces", icon: MapPinned },
] as const;

export function TravelStats({
  divisions,
  districts,
  upazilas,
  pins,
  totalDivisions,
  totalDistricts,
  totalUpazilas,
}: TravelStatsProps) {
  const { t } = useLanguage();
  const values: Record<string, number> = {
    divisions,
    districts,
    upazilas,
    pins,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ key, label, icon: Icon }) => {
        const value = values[key];
        const denominator =
          key === "divisions"
            ? totalDivisions
            : key === "districts"
              ? totalDistricts
              : key === "upazilas"
                ? totalUpazilas
                : 1;

        const percent =
          denominator > 0 ? Math.round((value / denominator) * 100) : 0;

        return (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-right text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
                {key === "pins" ? t("trackedPoints") : `${percent}%`}
              </div>
            </div>

            <div className="mt-4 text-2xl font-semibold text-slate-900">
              {value}
            </div>
            <div className="mt-1 text-sm text-slate-600">{t(label)}</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              {t("denominator")}:{" "}
              {denominator === 1 ? t("individualPlaces") : denominator}
            </div>
          </div>
        );
      })}
    </div>
  );
}
