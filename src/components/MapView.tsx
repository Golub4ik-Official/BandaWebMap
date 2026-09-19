import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GameMap } from '../types';

interface MapViewProps {
  currentMap: GameMap | null;
  currentZ: number;
  showGrid: boolean;
  showPipenet: boolean;
  rulerActive: boolean;
  targetCoords?: { x: number; y: number } | null;
  onCoordChange: (coords: { x: number; y: number; z: number } | null) => void;
  onTileClick: (coords: { x: number; y: number; z: number }) => void;
  onResetViewReady: (resetFn: () => void) => void;
  onGoToCoordsReady: (gotoFn: (x: number, y: number) => void) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  currentMap,
  currentZ,
  showGrid,
  showPipenet,
  rulerActive,
  targetCoords,
  onCoordChange,
  onTileClick,
  onResetViewReady,
  onGoToCoordsReady,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const baseOverlayRef = useRef<L.ImageOverlay | null>(null);
  const pipeOverlayRef = useRef<L.ImageOverlay | null>(null);
  const gridLayerRef = useRef<L.GridLayer | null>(null);
  const hoverPolygonRef = useRef<L.Polygon | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);

  const rulerPointsRef = useRef<{ x: number; y: number; latlng: { lat: number; lng: number } }[]>([]);
  const rulerLineRef = useRef<L.Polyline | null>(null);

  const [isLoadingFullRes, setIsLoadingFullRes] = useState<boolean>(false);

  // Math conversions
  const getBounds = useCallback((): L.LatLngBoundsExpression => {
    const width = currentMap?.width || 255;
    const height = currentMap?.height || 255;
    return [[0, 0], [-height, width]];
  }, [currentMap]);

  const leafletToSS13 = useCallback((lat: number, lng: number) => {
    if (!currentMap) return { x: 1, y: 1 };
    const width = currentMap.width || 255;
    const height = currentMap.height || 255;

    const rawX = Math.floor(lng) + 1;
    const rawY = height - Math.floor(-lat);

    const x = Math.max(1, Math.min(width, rawX));
    const y = Math.max(1, Math.min(height, rawY));
    return { x, y };
  }, [currentMap]);

  const ss13ToLeaflet = useCallback((x: number, y: number) => {
    if (!currentMap) return { lat: 0, lng: 0 };
    const height = currentMap.height || 255;
    const lng = x - 0.5;
    const lat = -(height - y + 0.5);
    return { lat, lng };
  }, [currentMap]);

  // Procedural SVG placeholder generator
  const getPlaceholderSvg = useCallback((map: GameMap, z: number) => {
    const width = map.width || 255;
    const height = map.height || 255;
    const serverName = (map.server || '').toUpperCase();
    const mapName = map.name || 'Unknown';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width * 16}" height="${height * 16}" viewBox="0 0 ${width} ${height}">
        <defs>
          <pattern id="pgrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" stroke-width="0.3"/>
          </pattern>
          <pattern id="pmajor" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#pgrid)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#334155" stroke-width="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#080c16"/>
        <rect width="100%" height="100%" fill="url(#pmajor)" />
        <rect x="5" y="5" width="${width - 10}" height="${height - 10}" fill="none" stroke="#38bdf8" stroke-width="0.6" stroke-dasharray="4,4"/>
        <text x="${width / 2}" y="${height / 2 - 8}" fill="#38bdf8" font-family="monospace" font-size="6" font-weight="bold" text-anchor="middle">
          [ ${serverName} // ${mapName} ]
        </text>
        <text x="${width / 2}" y="${height / 2 + 2}" fill="#94a3b8" font-family="monospace" font-size="3.5" text-anchor="middle">
          Z-LEVEL ${z} | РАЗМЕР: ${width}x${height}
        </text>
        <text x="${width / 2}" y="${height / 2 + 10}" fill="#64748b" font-family="monospace" font-size="2.6" text-anchor="middle">
          Подключение высокоточного рендера...
        </text>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1.5,
      maxZoom: 6,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 75,
      attributionControl: false
    });

    L.control.attribution({
      position: 'bottomright',
      prefix: '<span class="text-xs text-slate-500 font-mono">Banda WebMap</span>'
    }).addTo(map);

    // Hover polygon (1x1 tile)
    const hoverPoly = L.polygon([[0, 0]], {
      color: '#38bdf8',
      weight: 1.5,
      fillColor: '#38bdf8',
      fillOpacity: 0.25,
      interactive: false
    });
    hoverPolygonRef.current = hoverPoly;

    // Grid layer
    const GridClass = L.GridLayer.extend({
      createTile: function () {
        const tile = document.createElement('div');
        tile.className = 'ss13-grid-tile';
        return tile;
      }
    });
    // @ts-ignore
    gridLayerRef.current = new GridClass({
      tileSize: 32,
      opacity: 0.15,
      zIndex: 400
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Event handlers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentMap) return;

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const width = currentMap.width || 255;
      const height = currentMap.height || 255;
      const { lat, lng } = e.latlng;

      if (lng < 0 || lng > width || lat > 0 || lat < -height) {
        if (hoverPolygonRef.current && map.hasLayer(hoverPolygonRef.current)) {
          hoverPolygonRef.current.remove();
        }
        onCoordChange(null);
        return;
      }

      const { x, y } = leafletToSS13(lat, lng);
      const topLat = -(height - y);
      const bottomLat = -(height - y + 1);

      if (hoverPolygonRef.current) {
        hoverPolygonRef.current.setLatLngs([
          [topLat, x - 1],
          [topLat, x],
          [bottomLat, x],
          [bottomLat, x - 1]
        ]);
        if (!map.hasLayer(hoverPolygonRef.current)) {
          hoverPolygonRef.current.addTo(map);
        }
      }

      onCoordChange({ x, y, z: currentZ });
    };

    const handleClick = (e: L.LeafletMouseEvent) => {
      const width = currentMap.width || 255;
      const height = currentMap.height || 255;
      const { lat, lng } = e.latlng;

      if (lng < 0 || lng > width || lat > 0 || lat < -height) return;
      const { x, y } = leafletToSS13(lat, lng);

      if (rulerActive) {
        handleRulerClick(x, y);
        return;
      }

      setPin(x, y);
      onTileClick({ x, y, z: currentZ });
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
    };
  }, [currentMap, currentZ, rulerActive, leafletToSS13, onCoordChange, onTileClick]);

  const setPin = useCallback((x: number, y: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }

    const { lat, lng } = ss13ToLeaflet(x, y);

    const pinIcon = L.divIcon({
      className: 'ss13-pin-marker',
      html: `<div class="pin-pulse"></div><div class="pin-label">X:${x} Y:${y}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    pinMarkerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
  }, [ss13ToLeaflet]);

  const handleRulerClick = useCallback((x: number, y: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const latlng = ss13ToLeaflet(x, y);
    const points = rulerPointsRef.current;

    points.push({ x, y, latlng });

    if (points.length > 2) {
      clearRuler();
      points.push({ x, y, latlng });
    }

    if (points.length === 2) {
      const p1 = points[0];
      const p2 = points[1];
      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);
      const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);

      if (rulerLineRef.current) rulerLineRef.current.remove();

      const line = L.polyline([
        [p1.latlng.lat, p1.latlng.lng],
        [p2.latlng.lat, p2.latlng.lng]
      ], {
        color: '#f43f5e',
        weight: 3,
        dashArray: '6, 6'
      }).addTo(map);

      const midLat = (p1.latlng.lat + p2.latlng.lat) / 2;
      const midLng = (p1.latlng.lng + p2.latlng.lng) / 2;

      line.bindTooltip(`${dist} тайлов (ΔX: ${dx}, ΔY: ${dy})`, {
        permanent: true,
        className: 'ruler-tooltip'
      }).openTooltip([midLat, midLng]);

      rulerLineRef.current = line;
    }
  }, [ss13ToLeaflet]);

  const clearRuler = useCallback(() => {
    rulerPointsRef.current = [];
    if (rulerLineRef.current) {
      rulerLineRef.current.remove();
      rulerLineRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!rulerActive) {
      clearRuler();
    }
  }, [rulerActive, clearRuler]);

  // Progressive Map Loading: Preview -> Full-HD swap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentMap) return;

    const bounds = getBounds();
    const width = currentMap.width || 255;
    const height = currentMap.height || 255;

    map.setMaxBounds([
      [50, -50],
      [-height - 50, width + 50]
    ]);

    const layerInfo = currentMap.layers?.find(l => l.z === currentZ) || currentMap.layers?.[0];
    const previewUrl = layerInfo?.previewUrl ? `${import.meta.env.BASE_URL}${layerInfo.previewUrl}` : '';
    const fullUrl = layerInfo?.fullUrl || '';
    const pipenetUrl = layerInfo?.pipenetUrl || '';

    // Step 1: Immediately render the preview or procedural SVG
    if (baseOverlayRef.current) {
      baseOverlayRef.current.remove();
      baseOverlayRef.current = null;
    }

    const initialSource = previewUrl || (fullUrl ? getPlaceholderSvg(currentMap, currentZ) : getPlaceholderSvg(currentMap, currentZ));

    const initialOverlay = L.imageOverlay(initialSource, bounds, {
      interactive: false,
      opacity: 0.95
    }).addTo(map);
    baseOverlayRef.current = initialOverlay;

    // Step 2: If fullUrl exists, asynchronously load the high-res render and swap smoothly
    if (fullUrl) {
      setIsLoadingFullRes(true);
      const highResImg = new Image();
      highResImg.src = fullUrl;

      highResImg.onload = () => {
        setIsLoadingFullRes(false);
        // Only swap if user hasn't switched maps/Z-levels
        if (mapInstanceRef.current) {
          if (baseOverlayRef.current) {
            baseOverlayRef.current.setUrl(fullUrl);
            baseOverlayRef.current.setOpacity(1.0);
          }
        }
      };

      highResImg.onerror = () => {
        setIsLoadingFullRes(false);
        console.warn(`Could not load Full-HD render from ${fullUrl}, keeping preview/placeholder.`);
      };
    } else {
      setIsLoadingFullRes(false);
    }

    // Pipenet overlay
    if (pipeOverlayRef.current) {
      pipeOverlayRef.current.remove();
      pipeOverlayRef.current = null;
    }

    if (showPipenet && pipenetUrl) {
      pipeOverlayRef.current = L.imageOverlay(pipenetUrl, bounds, {
        interactive: false,
        opacity: 0.85
      }).addTo(map);
    }

    // Grid toggle
    if (gridLayerRef.current) {
      if (showGrid && !map.hasLayer(gridLayerRef.current)) {
        gridLayerRef.current.addTo(map);
        gridLayerRef.current.bringToFront();
      } else if (!showGrid && map.hasLayer(gridLayerRef.current)) {
        gridLayerRef.current.remove();
      }
    }
  }, [currentMap, currentZ, showPipenet, showGrid, getBounds, getPlaceholderSvg]);

  // Initial bounds fit or target coords
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentMap) return;

    if (targetCoords) {
      const { lat, lng } = ss13ToLeaflet(targetCoords.x, targetCoords.y);
      map.setView([lat, lng], 3);
      setPin(targetCoords.x, targetCoords.y);
    } else {
      map.fitBounds(getBounds(), { padding: [24, 24] });
    }
  }, [currentMap, targetCoords, getBounds, ss13ToLeaflet, setPin]);

  // Register reset and goto hooks
  useEffect(() => {
    onResetViewReady(() => {
      const map = mapInstanceRef.current;
      if (map) {
        map.fitBounds(getBounds(), { padding: [24, 24], animate: true });
      }
    });

    onGoToCoordsReady((x: number, y: number) => {
      const map = mapInstanceRef.current;
      if (map) {
        const { lat, lng } = ss13ToLeaflet(x, y);
        map.setView([lat, lng], 4, { animate: true });
        setPin(x, y);
      }
    });
  }, [getBounds, ss13ToLeaflet, setPin, onResetViewReady, onGoToCoordsReady]);

  return (
    <div className="relative w-full h-full bg-[#04070e] overflow-hidden select-none">
      <div ref={mapContainerRef} className="w-full h-full outline-none" />

      {/* Subtle Progressive Loading Spinner in top-right */}
      {isLoadingFullRes && (
        <div className="absolute top-20 right-6 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-sky-500/30 text-xs text-sky-400 shadow-xl transition-all animate-pulse">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Загрузка Full-HD объектов...</span>
        </div>
      )}
    </div>
  );
};
