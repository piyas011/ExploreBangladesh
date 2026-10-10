"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="inline-flex items-center rounded-md border border-slate-200 bg-white p-1"
    >
      <Languages aria-hidden="true" className="mx-1 h-4 w-4 text-slate-500" />
      {(["en", "bn"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
          aria-pressed={language === option}
          className={`rounded px-2 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
            language === option
              ? "bg-teal-800 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {option === "en" ? t("english") : t("bangla")}
        </button>
      ))}
    </div>
  );
}
