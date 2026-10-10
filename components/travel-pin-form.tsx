"use client";

import { Calendar, MapPin, NotebookPen, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getAreaDisplayName } from "@/lib/geo-data";
import { useLanguage } from "@/lib/i18n";

export type PinDraft = {
  latitude: number;
  longitude: number;
  nearestAreaId?: string;
  nearestAreaName?: string;
  nearestAreaNameBn?: string;
};

export type TravelPinFormProps = {
  open: boolean;
  draft: PinDraft | null;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    latitude: number;
    longitude: number;
    visitedAt: string;
    notes: string;
    relatedAreaId?: string;
  }) => void;
};

export function TravelPinForm({
  open,
  draft,
  onClose,
  onSave,
}: TravelPinFormProps) {
  const { language, t } = useLanguage();
  const [name, setName] = useState("");
  const [visitedAt, setVisitedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");

  const coordinates = useMemo(
    () =>
      `${draft?.latitude?.toFixed(5) ?? "-"}, ${draft?.longitude?.toFixed(5) ?? "-"}`,
    [draft],
  );

  if (!open || !draft) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
              {t("newPin")}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              {t("saveVisitedPlace")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("cancel")}
            className="rounded-full border border-slate-200 p-2 text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-700">
          <div className="flex items-center gap-2 font-medium">
            <MapPin className="h-4 w-4" />
            {draft.nearestAreaName
              ? `${t("nearestKnownArea")}: ${getAreaDisplayName({ name: draft.nearestAreaName, nameBn: draft.nearestAreaNameBn }, language)}`
              : t("noNearbyBoundary")}
          </div>
          <div className="mt-1 text-xs text-sky-700/80">
            {t("coordinates")}: {coordinates}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-slate-700">
            {t("placeName")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("placePlaceholder")}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
            />
          </label>

          <label className="block text-sm text-slate-700">
            {t("visitDate")}
            <div className="relative mt-1">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={visitedAt}
                onChange={(event) => setVisitedAt(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
            </div>
          </label>

          <label className="block text-sm text-slate-700">
            {t("notes")}
            <div className="relative mt-1">
              <NotebookPen className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder={t("notesPlaceholder")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pl-9 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
            </div>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({
                name: name.trim() || t("unnamedPlace"),
                latitude: draft.latitude,
                longitude: draft.longitude,
                visitedAt,
                notes,
                relatedAreaId: draft.nearestAreaId,
              });
            }}
            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            {t("savePin")}
          </button>
        </div>
      </div>
    </div>
  );
}
