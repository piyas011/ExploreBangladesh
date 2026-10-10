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

function getSelectionWeight(zoom: number) {
  return Math.min(2.4, Math.max(0.55, 0.55 + (zoom - 5) * 0.25));
}

function styleArea(
  area: GeoArea,
  selected: { color: string } | undefined,
  zoom = 7,
  hovered = false,
) {
  if (!selected) {
    return {
      color: hovered ? "#ffffff" : "#fffdfa",
      fillColor: hovered ? "#9fc6a8" : "#d9d4c8",
      fillOpacity: 1,
      weight: hovered
        ? getSelectionWeight(zoom) + 0.4
        : Math.max(0.35, getSelectionWeight(zoom) * 0.55),
      opacity: hovered ? 1 : 0.92,
      className: "area-polygon",
    };
  }

  const centralDistrict =
    area.level === "district" && area.parentName === "Dhaka";

  return {
    color: "#ffffff",
    fillColor: centralDistrict
      ? hovered
        ? "#d96f66"
        : "#e98b82"
      : hovered
        ? "#17823f"
        : "#2f9e44",
    fillOpacity: 1,
    weight: getSelectionWeight(zoom) + (hovered ? 0.55 : 0),
    opacity: 1,
    className: "area-polygon",
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
  onZoomChange,
}: {
  automatic: boolean;
  onLevelChange: (level: GeoLevel) => void;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onZoomChange(map.getZoom());
    if (automatic) onLevelChange(levelForZoom(map.getZoom()));
  }, [automatic, map, onLevelChange, onZoomChange]);

  useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
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
              color: "#ffffff",
              fillColor: "#287b4a",
              fillOpacity: 1,
              weight: 2,
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
  const [mapZoom, setMapZoom] = useState(7);
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
  const selectionHandlers = useRef({
    mapMode,
    dragSelectMode,
    onToggleArea,
    selectedAreas,
    language,
    mapZoom,
  });

  useEffect(() => {
    selectionHandlers.current = {
      mapMode,
      dragSelectMode,
      onToggleArea,
      selectedAreas,
      language,
      mapZoom,
    };
  }, [mapMode, dragSelectMode, onToggleArea, selectedAreas, language, mapZoom]);

  useEffect(() => {
    for (const [id, { path, area }] of featureLayers.current) {
      path.setStyle(styleArea(area, selectedAreas[id], mapZoom));
    }
  }, [activeLevel, mapZoom, selectedAreas, visibleLevel]);

  return (
    <div className="h-[min(72vh,780px)] min-h-[380px] w-full overflow-hidden rounded-md border border-[#ded8cb] bg-[#f0ede5]">
      <MapContainer
        center={[23.7, 90.3]}
        zoom={7}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom
        className="h-full w-full bg-[#f0ede5]"
      >
        <ZoomLevelSync
          automatic={activeLevel === "all"}
          onLevelChange={setZoomLevel}
          onZoomChange={setMapZoom}
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
            style={(feature) => {
              const area = getFeatureArea(
                feature as GeoJSON.Feature,
                visibleLevel,
              );
              return styleArea(area, selectedAreas[area.id], mapZoom);
            }}
            onEachFeature={(feature, layer) => {
              const area = getFeatureArea(feature, visibleLevel);
              const polygonLayer = layer as L.Polygon;
              featureLayers.current.set(area.id, { path: polygonLayer, area });
              polygonLayer.setStyle(
                styleArea(area, selectedAreas[area.id], mapZoom),
              );
              polygonLayer.bindTooltip(
                () =>
                  getAreaDisplayName(area, selectionHandlers.current.language),
                {
                  sticky: true,
                  direction: "top",
                  className: "area-hover-label",
                },
              );
              polygonLayer.on("mouseover", () => {
                const handlers = selectionHandlers.current;
                polygonLayer.setStyle(
                  styleArea(
                    area,
                    handlers.selectedAreas[area.id],
                    handlers.mapZoom,
                    true,
                  ),
                );
                polygonLayer.bringToFront();
              });
              polygonLayer.on("mouseout", () => {
                const handlers = selectionHandlers.current;
                polygonLayer.setStyle(
                  styleArea(
                    area,
                    handlers.selectedAreas[area.id],
                    handlers.mapZoom,
                  ),
                );
              });
              polygonLayer.on("click", (event: L.LeafletMouseEvent) => {
                const handlers = selectionHandlers.current;
                if (handlers.mapMode !== "select" || handlers.dragSelectMode)
                  return;
                L.DomEvent.stopPropagation(event.originalEvent);
                handlers.onToggleArea(area);
              });
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
