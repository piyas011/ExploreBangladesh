export type GeoLevel = "division" | "district" | "upazila";

export type GeoArea = {
  id: string;
  level: GeoLevel;
  name: string;
  nameBn?: string;
  parentName?: string;
  code?: string;
  geometry: GeoJSON.Feature;
};

export const coverageReport = [
  {
    level: "division",
    label: "Divisions",
    total: 8,
    status: "Verified polygon data",
    source: "Bangladesh administrative boundaries dataset (admin1)",
    note: "High-confidence division boundaries and codes are available.",
  },
  {
    level: "district",
    label: "Districts",
    total: 64,
    status: "Verified polygon data",
    source: "Bangladesh administrative boundaries dataset (admin2)",
    note: "District polygons are available and suitable for selection and map highlighting.",
  },
  {
    level: "upazila",
    label: "Upazilas",
    total: 507,
    status: "Verified polygon data",
    source: "Bangladesh administrative boundaries dataset (admin3)",
    note: "Upazila features are available in the open source dataset used for this app.",
  },
  {
    level: "union",
    label: "Unions / municipalities",
    total: 0,
    status: "Missing or incomplete",
    source: "Government and HDX sources",
    note: "No reliable, openly licensed full union boundary layer is bundled for this prototype.",
  },
  {
    level: "village",
    label: "Villages",
    total: 0,
    status: "Missing or incomplete",
    source: "BBS / LGED / OSM / HDX",
    note: "Official village boundaries are not consistently available in a usable public format.",
  },
  {
    level: "ward",
    label: "Wards / mahallas",
    total: 0,
    status: "Approximate or user-authored only",
    source: "City and municipal data",
    note: "Urban boundary data requires local verification and may be incomplete or approximate.",
  },
] as const;

const divisionNamesBn: Record<string, string> = {
  Barishal: "বরিশাল",
  Chattogram: "চট্টগ্রাম",
  Dhaka: "ঢাকা",
  Khulna: "খুলনা",
  Mymensingh: "ময়মনসিংহ",
  Rajshahi: "রাজশাহী",
  Rangpur: "রংপুর",
  Sylhet: "সিলেট",
};

export function getAreaNameFromFeature(
  feature: GeoJSON.Feature,
  level: GeoLevel,
): string {
  const props = feature.properties ?? {};
  const key =
    level === "division"
      ? "adm1_name"
      : level === "district"
        ? "adm2_name"
        : "adm3_name";

  return String(props[key] ?? "Unnamed area");
}

export function getAreaCode(feature: GeoJSON.Feature, level: GeoLevel): string {
  const props = feature.properties ?? {};
  const key =
    level === "division"
      ? "adm1_pcode"
      : level === "district"
        ? "adm2_pcode"
        : "adm3_pcode";

  return String(props[key] ?? "unknown");
}

export function getAreaParentName(
  feature: GeoJSON.Feature,
  level: GeoLevel,
): string | undefined {
  const props = feature.properties ?? {};
  const key =
    level === "division"
      ? "adm0_name"
      : level === "district"
        ? "adm1_name"
        : "adm2_name";

  return props[key] ? String(props[key]) : undefined;
}

function getBengaliName(
  feature: GeoJSON.Feature,
  level: GeoLevel,
  englishName: string,
) {
  const props = feature.properties ?? {};
  const prefix =
    level === "division" ? "adm1" : level === "district" ? "adm2" : "adm3";
  const candidates = [
    props[`${prefix}_name_bn`],
    props[`${prefix}_name1`],
    props[`${prefix}_name2`],
    props[`${prefix}_name3`],
  ];
  const fromData = candidates.find(
    (value): value is string =>
      typeof value === "string" && /[\u0980-\u09ff]/u.test(value),
  );

  return fromData ?? divisionNamesBn[englishName];
}

export function toArea(feature: GeoJSON.Feature, level: GeoLevel): GeoArea {
  const name = getAreaNameFromFeature(feature, level);
  const id = `${level}-${getAreaCode(feature, level)}`;

  return {
    id,
    level,
    name,
    nameBn: getBengaliName(feature, level, name),
    parentName: getAreaParentName(feature, level),
    code: getAreaCode(feature, level),
    geometry: feature,
  };
}

export function getAreaDisplayName(
  area: Pick<GeoArea, "name" | "nameBn">,
  language: "en" | "bn",
) {
  return language === "bn" ? (area.nameBn ?? area.name) : area.name;
}

export function normalizeAreaList(
  level: GeoLevel,
  collection: GeoJSON.FeatureCollection,
) {
  return (collection.features ?? []).map((feature) => toArea(feature, level));
}

function positionInRing(
  longitude: number,
  latitude: number,
  ring: GeoJSON.Position[],
) {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[previous];
    const cross = (longitude - x1) * (y2 - y1) - (latitude - y1) * (x2 - x1);
    if (
      Math.abs(cross) < 1e-9 &&
      longitude >= Math.min(x1, x2) &&
      longitude <= Math.max(x1, x2) &&
      latitude >= Math.min(y1, y2) &&
      latitude <= Math.max(y1, y2)
    )
      return true;
    if (
      y1 > latitude !== y2 > latitude &&
      longitude < ((x2 - x1) * (latitude - y1)) / (y2 - y1) + x1
    )
      inside = !inside;
  }
  return inside;
}

function polygonContainsPoint(
  rings: GeoJSON.Position[][],
  longitude: number,
  latitude: number,
) {
  return Boolean(
    rings[0] &&
    positionInRing(longitude, latitude, rings[0]) &&
    !rings.slice(1).some((ring) => positionInRing(longitude, latitude, ring)),
  );
}

export function featureContainsPoint(
  feature: GeoJSON.Feature,
  latitude: number,
  longitude: number,
) {
  const geometry = feature.geometry;
  if (geometry.type === "Polygon") {
    return polygonContainsPoint(geometry.coordinates, longitude, latitude);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      polygonContainsPoint(polygon, longitude, latitude),
    );
  }
  return false;
}

export function findAreaAtPoint(
  collections: GeoJSON.FeatureCollection[],
  level: GeoLevel,
  point: { lat: number; lng: number },
) {
  const matches = collections
    .flatMap((collection) => collection.features)
    .filter((feature) => featureContainsPoint(feature, point.lat, point.lng))
    .sort(
      (first, second) =>
        Number(first.properties?.area_sqkm ?? Infinity) -
        Number(second.properties?.area_sqkm ?? Infinity),
    );
  return matches[0] ? toArea(matches[0], level) : null;
}

export function searchMatches(area: GeoArea, search: string) {
  const text = search.trim().toLowerCase();
  if (!text) return true;

  const haystacks = [
    area.name,
    area.nameBn ?? "",
    area.parentName ?? "",
    area.level,
  ]
    .join(" ")
    .toLowerCase();

  return haystacks.includes(text);
}

export const levelLabels: Record<GeoLevel, string> = {
  division: "Division",
  district: "District",
  upazila: "Upazila",
};
