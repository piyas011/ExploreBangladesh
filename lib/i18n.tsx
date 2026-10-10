"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Language = "en" | "bn";

const languageStorageKey = "bangladesh-travel-tracker-language";
let currentLanguage: Language = "en";
const listeners = new Set<() => void>();

const messages = {
  en: {
    brand: "Bangladesh travel tracker",
    headline: "Explore Bangladesh by division, district, and upazila",
    dashboard: "Dashboard",
    dashboardTitle: "Bangladesh travel summary",
    backToMap: "Back to map",
    map: "Map",
    interactiveMap: "Interactive map",
    mapTitle: "Bangladesh travel map",
    addPin: "Add travel pin",
    selectionMode: "Selection mode",
    pinMode: "Pin mode",
    dragSelect: "Drag to select",
    dragSelectActive: "Drag selection on",
    dragSelectHint:
      "Drag across an area; its center must fall inside a boundary.",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    saveFailed: "Could not save",
    exportJson: "JSON",
    exportCsv: "CSV",
    exportPng: "PNG",
    coverage: "Data coverage",
    dataStatus: "data status",
    verified: "Verified boundary data",
    missing: "Missing dataset",
    approximate: "Approximate / user-authored",
    divisions: "Divisions",
    districts: "Districts",
    upazilas: "Upazilas",
    unions: "Unions / municipalities",
    villages: "Villages",
    wards: "Wards / mahallas",
    coverageDivisionNote:
      "Verified division boundaries and codes are available.",
    coverageDistrictNote: "District polygons are available for map selection.",
    coverageUpazilaNote:
      "Upazila boundaries are available in the bundled dataset.",
    coverageUnionNote:
      "No complete, verified union boundary layer is included.",
    coverageVillageNote: "No verified village boundary dataset is included.",
    coverageWardNote:
      "Ward and mahalla boundaries are incomplete or approximate.",
    selectionStatus: "Selection status",
    selectedCount: "selected",
    travelPins: "Travel pins",
    selectedAreaColors: "Selected areas",
    resetPalette: "Reset colors",
    noAreasSelected: "No areas selected yet.",
    savedPins: "Saved travel pins",
    noPins: "No travel pins saved yet.",
    addPinPrompt: "Choose pin mode, then click the map to add a place.",
    remove: "Remove",
    searchAreas: "Search geographic areas",
    showVisitedOnly: "Visited only",
    allAreas: "All areas",
    allLevels: "All levels",
    division: "Division",
    district: "District",
    upazila: "Upazila",
    searchPlaceholder: "Search by division, district, or upazila…",
    noResults: "No matching areas found.",
    selected: "Selected",
    select: "Select",
    newPin: "New travel pin",
    saveVisitedPlace: "Save a visited place",
    nearestKnownArea: "Nearest known area",
    noNearbyBoundary: "No nearby boundary match",
    coordinates: "Coordinates",
    placeName: "Place name",
    placePlaceholder: "Enter a place name",
    visitDate: "Visit date",
    notes: "Notes",
    notesPlaceholder: "Optional note about the visit",
    cancel: "Cancel",
    savePin: "Save pin",
    unnamedPlace: "Unnamed place",
    live: "live",
    visitedDivisions: "Visited divisions",
    visitedDistricts: "Visited districts",
    visitedUpazilas: "Visited upazilas",
    markedPlaces: "Marked places",
    trackedPoints: "tracked points",
    denominator: "of",
    individualPlaces: "individual places",
    pinnedPlaces: "Pinned places",
    pinDate: "Visit date",
    language: "Language",
    english: "English",
    bangla: "বাংলা",
    areaNotFound: "No boundary contains the center of that selection.",
    exportFailed: "Could not export the map image.",
  },
  bn: {
    brand: "বাংলাদেশ ভ্রমণ ট্র্যাকার",
    headline: "বিভাগ, জেলা ও উপজেলা ধরে বাংলাদেশ ঘুরে দেখুন",
    dashboard: "ড্যাশবোর্ড",
    dashboardTitle: "বাংলাদেশ ভ্রমণের সারসংক্ষেপ",
    backToMap: "মানচিত্রে ফিরুন",
    map: "মানচিত্র",
    interactiveMap: "ইন্টারঅ্যাকটিভ মানচিত্র",
    mapTitle: "বাংলাদেশ ভ্রমণ মানচিত্র",
    addPin: "ভ্রমণ পিন যোগ করুন",
    selectionMode: "নির্বাচন মোড",
    pinMode: "পিন মোড",
    dragSelect: "টেনে নির্বাচন",
    dragSelectActive: "টেনে নির্বাচন চালু",
    dragSelectHint:
      "এলাকার ওপর টানুন; টানের কেন্দ্রটি সীমানার ভেতরে থাকতে হবে।",
    save: "সংরক্ষণ",
    saving: "সংরক্ষণ হচ্ছে…",
    saved: "সংরক্ষিত",
    saveFailed: "সংরক্ষণ করা যায়নি",
    exportJson: "JSON",
    exportCsv: "CSV",
    exportPng: "PNG",
    coverage: "ডেটার আওতা",
    dataStatus: "ডেটার অবস্থা",
    verified: "যাচাইকৃত সীমানার ডেটা",
    missing: "ডেটাসেট নেই",
    approximate: "আনুমানিক / ব্যবহারকারীর দেওয়া",
    divisions: "বিভাগ",
    districts: "জেলা",
    upazilas: "উপজেলা",
    unions: "ইউনিয়ন / পৌরসভা",
    villages: "গ্রাম",
    wards: "ওয়ার্ড / মহল্লা",
    coverageDivisionNote: "বিভাগের যাচাইকৃত সীমানা ও কোড আছে।",
    coverageDistrictNote: "মানচিত্রে নির্বাচনের জন্য জেলার বহুভুজ সীমানা আছে।",
    coverageUpazilaNote: "অন্তর্ভুক্ত ডেটাসেটে উপজেলার সীমানা আছে।",
    coverageUnionNote:
      "সম্পূর্ণ ও যাচাইকৃত ইউনিয়ন সীমানার স্তর অন্তর্ভুক্ত নেই।",
    coverageVillageNote: "যাচাইকৃত গ্রাম সীমানার ডেটাসেট অন্তর্ভুক্ত নেই।",
    coverageWardNote: "ওয়ার্ড ও মহল্লার সীমানা অসম্পূর্ণ বা আনুমানিক।",
    selectionStatus: "নির্বাচনের অবস্থা",
    selectedCount: "টি নির্বাচিত",
    travelPins: "ভ্রমণ পিন",
    selectedAreaColors: "নির্বাচিত এলাকা",
    resetPalette: "রং পুনর্নির্ধারণ",
    noAreasSelected: "এখনো কোনো এলাকা নির্বাচন করা হয়নি।",
    savedPins: "সংরক্ষিত ভ্রমণ পিন",
    noPins: "এখনো কোনো ভ্রমণ পিন সংরক্ষিত নেই।",
    addPinPrompt: "পিন মোড চালু করে জায়গা যোগ করতে মানচিত্রে ক্লিক করুন।",
    remove: "সরান",
    searchAreas: "ভৌগোলিক এলাকা খুঁজুন",
    showVisitedOnly: "শুধু ভ্রমণ করা",
    allAreas: "সব এলাকা",
    allLevels: "সব স্তর",
    division: "বিভাগ",
    district: "জেলা",
    upazila: "উপজেলা",
    searchPlaceholder: "বিভাগ, জেলা বা উপজেলা খুঁজুন…",
    noResults: "মিলে এমন কোনো এলাকা পাওয়া যায়নি।",
    selected: "নির্বাচিত",
    select: "নির্বাচন",
    newPin: "নতুন ভ্রমণ পিন",
    saveVisitedPlace: "ভ্রমণ করা জায়গা সংরক্ষণ",
    nearestKnownArea: "নিকটবর্তী পরিচিত এলাকা",
    noNearbyBoundary: "কাছাকাছি কোনো সীমানা মেলেনি",
    coordinates: "স্থানাঙ্ক",
    placeName: "জায়গার নাম",
    placePlaceholder: "জায়গার নাম লিখুন",
    visitDate: "ভ্রমণের তারিখ",
    notes: "নোট",
    notesPlaceholder: "ভ্রমণ সম্পর্কে ঐচ্ছিক নোট",
    cancel: "বাতিল",
    savePin: "পিন সংরক্ষণ",
    unnamedPlace: "নামহীন জায়গা",
    live: "বর্তমান",
    visitedDivisions: "ভ্রমণ করা বিভাগ",
    visitedDistricts: "ভ্রমণ করা জেলা",
    visitedUpazilas: "ভ্রমণ করা উপজেলা",
    markedPlaces: "চিহ্নিত জায়গা",
    trackedPoints: "সংরক্ষিত স্থান",
    denominator: "মোট",
    individualPlaces: "টি জায়গা",
    pinnedPlaces: "পিন করা জায়গা",
    pinDate: "ভ্রমণের তারিখ",
    language: "ভাষা",
    english: "English",
    bangla: "বাংলা",
    areaNotFound: "নির্বাচনের কেন্দ্র কোনো সীমানার ভেতরে পড়েনি।",
    exportFailed: "মানচিত্রের ছবি তৈরি করা যায়নি।",
  },
} as const;

export type TranslationKey = keyof typeof messages.en;

function readStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(languageStorageKey);
    if (stored === "bn" || stored === "en") currentLanguage = stored;
  } catch {
    return currentLanguage;
  }
  return currentLanguage;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== languageStorageKey) return;
    currentLanguage = event.newValue === "bn" ? "bn" : "en";
    listeners.forEach((notify) => notify());
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getServerLanguage(): Language {
  return "en";
}

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribe,
    readStoredLanguage,
    getServerLanguage,
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function setLanguage(nextLanguage: Language) {
    currentLanguage = nextLanguage;
    try {
      window.localStorage.setItem(languageStorageKey, nextLanguage);
    } catch {}
    listeners.forEach((notify) => notify());
  }

  const value = {
    language,
    setLanguage,
    t: (key: TranslationKey) => messages[language][key],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
