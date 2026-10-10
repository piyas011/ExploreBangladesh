"use client";

import L from "leaflet";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  Rectangle,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  findAreaAtPoint,
  getAreaDisplayName,
  toArea,
  type GeoArea,
  type GeoLevel,
} from "@/lib/geo-data";
import type { Language } from "@/lib/i18n";
import { useEffect, useRef, useState, type RefObject } from "react";

export type TravelMapProps = {
  divisionData: GeoJSON.FeatureCollection[];
  districtData: GeoJSON.FeatureCollection[];
  upazilaData: GeoJSON.FeatureCollection[];
  activeLevel: GeoLevel | "all";
  language: Language;
  dragSelectMode: boolean;
  selectedAreas: Record<string, { id: string; name: string; color: string }>;
  onToggleArea: (area: GeoArea) => void;
  onMapPinRequest: (latlng: { lat: number; lng: number }) => void;
  onSelectionMiss: () => void;
  pins: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    visitedAt?: string;
    notes?: string;
    relatedAreaId?: string;
  }[];
  mapMode: "select" | "pin";
  showSelectedNames: boolean;
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function getFeatureArea(feature: GeoJSON.Feature, level: GeoLevel): GeoArea {
  return toArea(feature, level);
}

function styleArea(selected?: { color: string }) {
  if (!selected) {
    return {
      color: "transparent",
      fillColor: "transparent",
      fillOpacity: 0,
      weight: 0,
      opacity: 0,
    };
  }

  return {
    color: "#ffffff",
    fillColor: "#b7d9c5",
    fillOpacity: 0.68,
    weight: 1.5,
    opacity: 0.98,
  };
}

function levelForZoom(zoom: number): GeoLevel {
  if (zoom >= 9) return "upazila";
  if (zoom >= 7.5) return "district";
  return "division";
}

function MapEvents({
  onMapPinRequest,
  mapMode,
}: {
  onMapPinRequest: (latlng: { lat: number; lng: number }) => void;
  mapMode: "select" | "pin";
}) {
  useMapEvents({
    click(event) {
      if (mapMode === "pin") {
        onMapPinRequest({ lat: event.latlng.lat, lng: event.latlng.lng });
      }
    },
  });

  return null;
}

function ZoomLevelSync({
  automatic,
  onLevelChange,
}: {
  automatic: boolean;
  onLevelChange: (level: GeoLevel) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (automatic) onLevelChange(levelForZoom(map.getZoom()));
  }, [automatic, map, onLevelChange]);

  useMapEvents({
    zoomend() {
      if (automatic) onLevelChange(levelForZoom(map.getZoom()));
    },
  });

  return null;
}

function MapSelectionFocus({
  selectedAreas,
  visibleLevel,
  featureLayers,
}: {
  selectedAreas: Record<string, { id: string; name: string; color: string }>;
  visibleLevel: GeoLevel;
  featureLayers: RefObject<Map<string, { path: L.Polygon; area: GeoArea }>>;
}) {
  const map = useMap();
  const previousIds = useRef(new Set<string>());
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    const currentIds = new Set(Object.keys(selectedAreas));
    const addedIds = [...currentIds].filter(
      (id) => !previousIds.current.has(id),
    );
    if (addedIds.length === 1) pendingFocus.current = addedIds[0];
    if (pendingFocus.current && !currentIds.has(pendingFocus.current)) {
      pendingFocus.current = null;
    }
    previousIds.current = currentIds;

    const feature = pendingFocus.current
      ? featureLayers.current.get(pendingFocus.current)
      : undefined;
    if (!feature || feature.area.level !== visibleLevel) return;

    const maximumZoom =
      visibleLevel === "upazila" ? 11 : visibleLevel === "district" ? 8 : 7;
    map.fitBounds(feature.path.getBounds().pad(0.18), {
      maxZoom: maximumZoom,
      animate: true,
    });
    pendingFocus.current = null;
  }, [featureLayers, map, selectedAreas, visibleLevel]);

  return null;
}

function SelectedAreaMarkers({
  featureLayers,
  selectedAreas,
  visibleLevel,
  language,
  showSelectedNames,
}: {
  featureLayers: RefObject<Map<string, { path: L.Polygon; area: GeoArea }>>;
  selectedAreas: Record<string, { id: string; name: string; color: string }>;
  visibleLevel: GeoLevel;
  language: Language;
  showSelectedNames: boolean;
}) {
  if (!showSelectedNames) return null;

  return (
    <>
      {Object.values(selectedAreas).map((area) => {
        const entry = featureLayers.current.get(area.id);
        if (!entry || entry.area.level !== visibleLevel) return null;

        const center = entry.path.getBounds().getCenter();

        return (
          <CircleMarker
            key={area.id}
            center={[center.lat, center.lng]}
            radius={4.1}
            pathOptions={{
              color: "#0f766e",
              fillColor: "#0f766e",
              fillOpacity: 1,
              weight: 0,
            }}
          >
            <Tooltip
              permanent
              direction="bottom"
              offset={[0, 10]}
              className="area-selection-label"
            >
              {getAreaDisplayName(entry.area, language)}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

function DragAreaSelector({
  enabled,
  mapMode,
  collections,
  level,
  onToggleArea,
  onSelectionMiss,
}: {
  enabled: boolean;
  mapMode: "select" | "pin";
  collections: GeoJSON.FeatureCollection[];
  level: GeoLevel;
  onToggleArea: (area: GeoArea) => void;
  onSelectionMiss: () => void;
}) {
  const map = useMap();
  const startPoint = useRef<L.Point | null>(null);
  const didDrag = useRef(false);
  const suppressClick = useRef(false);
  const [selectionBounds, setSelectionBounds] = useState<L.LatLngBounds | null>(
    null,
  );

  useEffect(() => {
    if (!enabled || mapMode !== "select") {
      return;
    }

    const container = map.getContainer();
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || !container.contains(event.target as Node))
        return;
      startPoint.current = map.mouseEventToContainerPoint(event);
      didDrag.current = false;
      map.dragging.disable();
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!startPoint.current) return;
      const currentPoint = map.mouseEventToContainerPoint(event);
      const distance = startPoint.current.distanceTo(currentPoint);
      if (distance < 8 && !didDrag.current) return;
      didDrag.current = true;
      const start = map.containerPointToLatLng(startPoint.current);
      const end = map.containerPointToLatLng(currentPoint);
      setSelectionBounds(L.latLngBounds(start, end));
    };
    const onMouseUp = (event: MouseEvent) => {
      if (!startPoint.current) return;
      const start = startPoint.current;
      const wasDrag = didDrag.current;
      startPoint.current = null;
      map.dragging.enable();
      setSelectionBounds(null);
      if (!wasDrag) return;

      suppressClick.current = true;
      const end = map.mouseEventToContainerPoint(event);
      const center = map.containerPointToLatLng(
        L.point((start.x + end.x) / 2, (start.y + end.y) / 2),
      );
      const area = findAreaAtPoint(collections, level, {
        lat: center.lat,
        lng: center.lng,
      });
      if (area) onToggleArea(area);
      else onSelectionMiss();
    };
    const onClick = (event: MouseEvent) => {
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      suppressClick.current = false;
    };

    container.addEventListener("mousedown", onMouseDown, true);
    container.addEventListener("click", onClick, true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      container.removeEventListener("mousedown", onMouseDown, true);
      container.removeEventListener("click", onClick, true);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      startPoint.current = null;
      map.dragging.enable();
    };
  }, [
    enabled,
    map,
    mapMode,
    collections,
    level,
    onSelectionMiss,
    onToggleArea,
  ]);

  return enabled && mapMode === "select" && selectionBounds ? (
    <Rectangle
      bounds={selectionBounds}
      interactive={false}
      pathOptions={{
        color: "#0f766e",
        dashArray: "6 5",
        fillOpacity: 0.12,
        weight: 2,
      }}
    />
  ) : null;
}

export function TravelMap({
  divisionData,
  districtData,
  upazilaData,
  activeLevel,
  language,
  dragSelectMode,
  selectedAreas,
  onToggleArea,
  onMapPinRequest,
  pins,
  mapMode,
  onSelectionMiss,
  showSelectedNames,
}: TravelMapProps) {
  const [zoomLevel, setZoomLevel] = useState<GeoLevel>("division");
  const visibleLevel = activeLevel === "all" ? zoomLevel : activeLevel;
  const visibleData =
    visibleLevel === "division"
      ? divisionData
      : visibleLevel === "district"
        ? districtData
        : upazilaData;
  const featureLayers = useRef(
    new Map<string, { path: L.Polygon; area: GeoArea }>(),
  );

  useEffect(() => {
    for (const [id, { path }] of featureLayers.current) {
      path.setStyle(styleArea(selectedAreas[id]));
    }
  }, [activeLevel, selectedAreas, visibleLevel]);

  return (
    <div className="h-[min(68vh,760px)] min-h-[360px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#edf5f2]">
      <MapContainer
        center={[23.7, 90.3]}
        zoom={7}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom
        className="h-full w-full bg-[#edf5f2]"
      >
        <ZoomLevelSync
          automatic={activeLevel === "all"}
          onLevelChange={setZoomLevel}
        />
        <MapSelectionFocus
          selectedAreas={selectedAreas}
          visibleLevel={visibleLevel}
          featureLayers={featureLayers}
        />

        <SelectedAreaMarkers
          featureLayers={featureLayers}
          selectedAreas={selectedAreas}
          visibleLevel={visibleLevel}
          language={language}
          showSelectedNames={showSelectedNames}
        />

        {visibleData.map((collection, collectionIndex) => (
          <GeoJSON
            key={`${visibleLevel}-${collectionIndex}`}
            data={collection}
            style={(feature) =>
              styleArea(
                selectedAreas[
                  getFeatureArea(feature as GeoJSON.Feature, visibleLevel).id
                ],
              )
            }
            onEachFeature={(feature, layer) => {
              const area = getFeatureArea(feature, visibleLevel);
              const polygonLayer = layer as L.Polygon;
              featureLayers.current.set(area.id, { path: polygonLayer, area });
              polygonLayer.setStyle(styleArea(selectedAreas[area.id]));
            }}
          />
        ))}

        {dragSelectMode ? (
          <DragAreaSelector
            enabled={dragSelectMode}
            mapMode={mapMode}
            collections={visibleData}
            level={visibleLevel}
            onToggleArea={onToggleArea}
            onSelectionMiss={onSelectionMiss}
          />
        ) : null}

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div>
                <strong>{pin.name}</strong>
                <div>{pin.visitedAt}</div>
                {pin.notes ? <div>{pin.notes}</div> : null}
              </div>
            </Popup>
          </Marker>
        ))}

        <MapEvents onMapPinRequest={onMapPinRequest} mapMode={mapMode} />
      </MapContainer>
    </div>
  );
}
