"use client";

import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  Rectangle,
  TileLayer,
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
import { getDefaultBackgroundColor } from "@/lib/storage";
import { useEffect, useRef, useState, type RefObject } from "react";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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
};

function getFeatureArea(feature: GeoJSON.Feature, level: GeoLevel): GeoArea {
  return toArea(feature, level);
}

function styleArea(selected?: { color: string }, hovered = false) {
  return {
    color: selected?.color ?? (hovered ? "#176b68" : "#647b80"),
    fillColor:
      selected?.color ?? (hovered ? "#a8d5ce" : getDefaultBackgroundColor()),
    fillOpacity: selected ? 0.72 : hovered ? 0.55 : 0.32,
    weight: selected ? 3 : hovered ? 2 : 1,
    opacity: selected ? 1 : 0.86,
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
  const latestHandlers = useRef({ mapMode, onToggleArea, selectedAreas });
  useEffect(() => {
    latestHandlers.current = { mapMode, onToggleArea, selectedAreas };
  }, [mapMode, onToggleArea, selectedAreas]);

  useEffect(() => {
    for (const [id, { path, area }] of featureLayers.current) {
      const selected = selectedAreas[id];
      path.setStyle(styleArea(selected));
      path.unbindTooltip();
      if (selected) {
        path.bindTooltip(getAreaDisplayName(area, language), {
          permanent: true,
          direction: "center",
          className: "area-selection-label",
          opacity: 1,
        });
        path.openTooltip();
      }
    }
  }, [activeLevel, language, selectedAreas, visibleLevel]);

  return (
    <div className="h-[min(68vh,760px)] min-h-[360px] w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100">
      <MapContainer
        center={[23.7, 90.3]}
        zoom={7}
        scrollWheelZoom
        className="h-full w-full"
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
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
              const path = layer as L.Polygon;
              featureLayers.current.set(area.id, { path, area });
              path.on("add", () => {
                path.getElement()?.setAttribute("data-area-id", area.id);
              });
              path.on("click", (event: L.LeafletMouseEvent) => {
                if (latestHandlers.current.mapMode === "select") {
                  L.DomEvent.stopPropagation(event.originalEvent);
                  latestHandlers.current.onToggleArea(area);
                }
              });
              path.on("mouseover", () => {
                path.setStyle(
                  styleArea(
                    latestHandlers.current.selectedAreas[area.id],
                    true,
                  ),
                );
                path.bringToFront();
              });
              path.on("mouseout", () => {
                path.setStyle(
                  styleArea(latestHandlers.current.selectedAreas[area.id]),
                );
              });
            }}
          />
        ))}

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
        <DragAreaSelector
          enabled={dragSelectMode}
          mapMode={mapMode}
          collections={visibleData}
          level={visibleLevel}
          onToggleArea={onToggleArea}
          onSelectionMiss={onSelectionMiss}
        />
      </MapContainer>
    </div>
  );
}
