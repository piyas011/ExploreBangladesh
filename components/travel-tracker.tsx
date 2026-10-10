"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Download,
  Globe2,
  Move,
  Save,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import divisionGeoJson from "@/data/bangladesh-admin1.json";
import districtGeoJson from "@/data/bangladesh-admin2.json";
import upazilaGeoJson from "@/data/bangladesh-admin3.json";
import {
  coverageReport,
  findAreaAtPoint,
  getAreaDisplayName,
  type GeoArea,
  type GeoLevel,
  normalizeAreaList,
  searchMatches,
} from "@/lib/geo-data";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { useHydrated } from "@/lib/hydration";
import {
  ensureAreaColor,
  loadTravelState,
  resetAreaColors,
  saveTravelState,
  type SelectedArea,
  type TravelPin,
} from "@/lib/storage";
import { GeographicSearch } from "@/components/geographic-search";
import { TravelStats } from "@/components/travel-stats";
import { TravelPinForm, type PinDraft } from "@/components/travel-pin-form";

const coverageNameKeys: Record<
  (typeof coverageReport)[number]["level"],
  TranslationKey
> = {
  division: "divisions",
  district: "districts",
  upazila: "upazilas",
  union: "unions",
  village: "villages",
  ward: "wards",
};

const coverageNoteKeys: Record<
  (typeof coverageReport)[number]["level"],
  TranslationKey
> = {
  division: "coverageDivisionNote",
  district: "coverageDistrictNote",
  upazila: "coverageUpazilaNote",
  union: "coverageUnionNote",
  village: "coverageVillageNote",
  ward: "coverageWardNote",
};

const TravelMap = dynamic(
  () => import("@/components/travel-map").then((mod) => mod.TravelMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-slate-500">
        Loading map…
      </div>
    ),
  },
);

export function TravelTrackerPage() {
  const { language, t } = useLanguage();
  const hydrated = useHydrated();
  const [initialState] = useState(() => loadTravelState());
  const [showSelectedNames, setShowSelectedNames] = useState<boolean>(
    initialState.showSelectedNames ?? true,
  );
  const [divisionFeatures] = useState<GeoJSON.FeatureCollection[]>([
    divisionGeoJson as GeoJSON.FeatureCollection,
  ]);
  const [districtFeatures] = useState<GeoJSON.FeatureCollection[]>([
    districtGeoJson as GeoJSON.FeatureCollection,
  ]);
  const [upazilaFeatures] = useState<GeoJSON.FeatureCollection[]>([
    upazilaGeoJson as GeoJSON.FeatureCollection,
  ]);
  const [selectedAreas, setSelectedAreas] = useState<
    Record<string, SelectedArea>
  >(initialState.selectedAreas);
  const [pins, setPins] = useState<TravelPin[]>(initialState.pins);
  const [saveState, setSaveState] = useState<
    "idle" | "saved" | "saving" | "error"
  >("idle");
  const [searchTerm, setSearchTerm] = useState("");
  const [mapMode, setMapMode] = useState<"select" | "pin">("select");
  const [dragSelectMode, setDragSelectMode] = useState(false);
  const [activeLevel, setActiveLevel] = useState<GeoLevel | "all">("all");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [pinDraft, setPinDraft] = useState<PinDraft | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const visibleSelectedAreas = hydrated ? selectedAreas : {};
  const visiblePins = hydrated ? pins : [];

  useEffect(() => {
    saveTravelState({ selectedAreas, pins, showSelectedNames });
  }, [selectedAreas, pins, showSelectedNames]);

  const areaList = useMemo<GeoArea[]>(() => {
    const all: GeoArea[] = [];
    if (divisionFeatures[0])
      all.push(...normalizeAreaList("division", divisionFeatures[0]));
    if (districtFeatures[0])
      all.push(...normalizeAreaList("district", districtFeatures[0]));
    if (upazilaFeatures[0])
      all.push(...normalizeAreaList("upazila", upazilaFeatures[0]));
    return all.filter(
      (area) => typeof area.name === "string" && area.name.length > 0,
    );
  }, [divisionFeatures, districtFeatures, upazilaFeatures]);

  const visibleItems = useMemo(
    () => areaList.filter((area) => searchMatches(area, searchTerm)),
    [areaList, searchTerm],
  );

  const selectedDivisionCount = Object.values(visibleSelectedAreas).filter(
    (area) => area.level === "division",
  ).length;
  const selectedDistrictCount = Object.values(visibleSelectedAreas).filter(
    (area) => area.level === "district",
  ).length;
  const selectedUpazilaCount = Object.values(visibleSelectedAreas).filter(
    (area) => area.level === "upazila",
  ).length;

  function onToggleArea(area: GeoArea) {
    setNotice(null);
    setSelectedAreas((current) => {
      const selected = current[area.id];

      if (selected) {
        const next = { ...current };
        delete next[area.id];
        return next;
      }

      const nextSelection: SelectedArea = {
        id: area.id,
        name: area.name,
        nameBn: area.nameBn,
        level: area.level,
        color: ensureAreaColor(area, current),
        visitedAt: new Date().toISOString(),
      };

      return { ...current, [area.id]: nextSelection };
    });
  }

  function handleSaveState() {
    setSaveState("saving");
    try {
      saveTravelState({ selectedAreas, pins });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 1200);
    }
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify({ selectedAreas, pins }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bangladesh-travel-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCsv() {
    const rows = [
      ["name", "level", "color", "visitedAt"],
      ...Object.values(selectedAreas).map((area) => [
        area.name,
        area.level,
        area.color,
        area.visitedAt,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bangladesh-travel-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleMapExportPng() {
    if (!mapPanelRef.current) return;

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(mapPanelRef.current, {
        backgroundColor: "#edf5f2",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "bangladesh-travel-map.png";
      link.click();
    } catch {
      setNotice("exportFailed");
    }
  }

  function handleResetAllSelections() {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm(t("resetAllSelections"));
    if (!confirmed) return;
    setSelectedAreas({});
  }

  function handlePinRequest(latlng: { lat: number; lng: number }) {
    const containingArea =
      findAreaAtPoint(upazilaFeatures, "upazila", latlng) ??
      findAreaAtPoint(districtFeatures, "district", latlng) ??
      findAreaAtPoint(divisionFeatures, "division", latlng);

    setPinDraft({
      latitude: latlng.lat,
      longitude: latlng.lng,
      nearestAreaId: containingArea?.id,
      nearestAreaName: containingArea?.name,
      nearestAreaNameBn: containingArea?.nameBn,
    });
  }

  function handlePinSave(payload: {
    name: string;
    latitude: number;
    longitude: number;
    visitedAt: string;
    notes: string;
    relatedAreaId?: string;
  }) {
    const nextPin: TravelPin = {
      id: `${payload.latitude}-${payload.longitude}-${Date.now()}`,
      name: payload.name,
      latitude: payload.latitude,
      longitude: payload.longitude,
      visitedAt: payload.visitedAt,
      notes: payload.notes,
      relatedAreaId: payload.relatedAreaId,
    };

    setPins((current) => [nextPin, ...current]);
    setPinDraft(null);
    setMapMode("select");
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
              {t("brand")}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {t("headline")}
            </h1>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <a
              href="/dashboard"
              className="rounded-full border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              {t("dashboard")}
            </a>
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() =>
                setMapMode((next) => (next === "select" ? "pin" : "select"))
              }
              className="rounded-full bg-emerald-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              {mapMode === "select" ? t("addPin") : t("selectionMode")}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.75fr)]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("interactiveMap")}
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {t("mapTitle")}
                </h2>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  aria-pressed={dragSelectMode}
                  disabled={mapMode === "pin"}
                  onClick={() => {
                    setMapMode("select");
                    setDragSelectMode((current) => !current);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${dragSelectMode ? "border-teal-800 bg-teal-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  <Move aria-hidden="true" className="h-4 w-4" />
                  {dragSelectMode ? t("dragSelectActive") : t("dragSelect")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveState}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Save className="h-4 w-4" />{" "}
                  {t(
                    saveState === "saving"
                      ? "saving"
                      : saveState === "saved"
                        ? "saved"
                        : saveState === "error"
                          ? "saveFailed"
                          : "save",
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> JSON
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UploadCloud className="h-4 w-4" /> CSV
                </button>
                <button
                  type="button"
                  onClick={handleMapExportPng}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Sparkles className="h-4 w-4" /> PNG
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={showSelectedNames}
                  onChange={(event) =>
                    setShowSelectedNames(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t("showSelectedPlaceNames")}
              </label>

              <button
                type="button"
                onClick={handleResetAllSelections}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                {t("resetAllSelections")}
              </button>
            </div>

            <div
              ref={mapPanelRef}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-[#edf5f2]"
            >
              <TravelMap
                divisionData={divisionFeatures}
                districtData={districtFeatures}
                upazilaData={upazilaFeatures}
                activeLevel={activeLevel}
                language={language}
                dragSelectMode={dragSelectMode}
                selectedAreas={visibleSelectedAreas}
                onToggleArea={onToggleArea}
                onMapPinRequest={handlePinRequest}
                pins={visiblePins}
                mapMode={mapMode}
                onSelectionMiss={() => setNotice("areaNotFound")}
                showSelectedNames={showSelectedNames}
              />
            </div>

            {dragSelectMode && mapMode === "select" ? (
              <p className="mt-2 text-xs text-slate-500">
                {t("dragSelectHint")}
              </p>
            ) : null}
            {notice ? (
              <p role="status" className="mt-2 text-sm text-rose-700">
                {t(notice)}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Globe2 className="h-4 w-4 text-violet-600" />
                  {t("coverage")}
                </div>
                <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-violet-700">
                  {t("dataStatus")}
                </span>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                {coverageReport.map((item) => (
                  <div
                    key={item.level}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-800">
                        {t(coverageNameKeys[item.level])}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-600">
                        {t(
                          item.level === "ward"
                            ? "approximate"
                            : item.level === "union" || item.level === "village"
                              ? "missing"
                              : "verified",
                        )}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t(coverageNoteKeys[item.level])}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">
                  {t("selectionStatus")}
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  {Object.keys(visibleSelectedAreas).length}{" "}
                  {t("selectedCount")}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{t("divisions")}</span>
                  <span>{selectedDivisionCount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{t("districts")}</span>
                  <span>{selectedDistrictCount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{t("upazilas")}</span>
                  <span>{selectedUpazilaCount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{t("travelPins")}</span>
                  <span>{visiblePins.length}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_1.3fr]">
          <GeographicSearch
            items={visibleItems}
            selectedAreas={visibleSelectedAreas}
            onToggleArea={onToggleArea}
            visibleLevel={activeLevel}
            onVisibleLevelChange={setActiveLevel}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showOnlySelected={showOnlySelected}
            onShowOnlySelectedChange={setShowOnlySelected}
          />

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">
                  {t("selectedAreaColors")}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAreas((current) => resetAreaColors(current))
                  }
                  className="text-xs font-medium text-blue-600"
                >
                  {t("resetPalette")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.values(visibleSelectedAreas).map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: area.color }}
                    />
                    {getAreaDisplayName(area, language)}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">
                  {t("savedPins")}
                </div>
                <button
                  type="button"
                  onClick={() => setMapMode("pin")}
                  className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                >
                  {t("addPin")}
                </button>
              </div>
              <div className="space-y-2">
                {visiblePins.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    {t("addPinPrompt")}
                  </div>
                ) : (
                  visiblePins.map((pin) => (
                    <div
                      key={pin.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-800">
                          {pin.name}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPins((current) =>
                              current.filter((item) => item.id !== pin.id),
                            )
                          }
                          className="text-xs font-medium text-rose-600"
                        >
                          {t("remove")}
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {pin.visitedAt} · {pin.latitude.toFixed(4)},{" "}
                        {pin.longitude.toFixed(4)}
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
        </section>

        <TravelStats
          divisions={selectedDivisionCount}
          districts={selectedDistrictCount}
          upazilas={selectedUpazilaCount}
          pins={pins.length}
          totalDivisions={8}
          totalDistricts={64}
          totalUpazilas={507}
        />
      </main>

      {pinDraft ? (
        <TravelPinForm
          open
          draft={pinDraft}
          onClose={() => setPinDraft(null)}
          onSave={handlePinSave}
        />
      ) : null}
    </div>
  );
}
