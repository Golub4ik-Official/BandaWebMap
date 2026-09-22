import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GameMap, MapLocation } from '../types';

interface MapViewProps {
  currentMap: GameMap | null;
  currentZ: number;
  showGrid: boolean;
  showPipenet: boolean;
  showLocations: boolean;
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
  showLocations,
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
  const locationsLayerRef = useRef<L.LayerGroup | null>(null);

  const [isLoadingFullRes, setIsLoadingFullRes] = useState<boolean>(false);
  const [locations, setLocations] = useState<MapLocation[]>([]);


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

  // Ultra-lightweight SVG placeholder generator (fast to render, zero GPU overhead)
  const getPlaceholderSvg = useCallback((map: GameMap, z: number) => {
    const width = map.width || 255;
    const height = map.height || 255;
    const serverName = (map.server || '').toUpperCase();
    const mapName = map.name || 'Unknown';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#070b14"/><rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="#0ea5e9" stroke-width="0.8" stroke-dasharray="3,3"/><text x="${width / 2}" y="${height / 2 - 4}" fill="#38bdf8" font-family="monospace" font-size="5" font-weight="bold" text-anchor="middle">[ ${serverName} // ${mapName} ]</text><text x="${width / 2}" y="${height / 2 + 4}" fill="#94a3b8" font-family="monospace" font-size="3" text-anchor="middle">Z:${z} | РАЗМЕР: ${width}x${height}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -1.5,
      maxZoom: 5,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      preferCanvas: true,
      fadeAnimation: false,
      zoomAnimation: true,
      wheelPxPerZoomLevel: 100,
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

    // Grid layer - canvas based for 60fps performance (tileSize: 256)
    const GridClass = L.GridLayer.extend({
      createTile: function () {
        const tile = document.createElement('canvas');
        const tileSize = 256;
        tile.width = tileSize;
        tile.height = tileSize;
        const ctx = tile.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x <= tileSize; x += 32) {
            ctx.moveTo(x, 0); ctx.lineTo(x, tileSize);
          }
          for (let y = 0; y <= tileSize; y += 32) {
            ctx.moveTo(0, y); ctx.lineTo(tileSize, y);
          }
          ctx.stroke();
        }
        return tile;
      }
    });
    // @ts-ignore
    gridLayerRef.current = new GridClass({
      tileSize: 256,
      opacity: 0.8,
      zIndex: 400
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Event handlers with requestAnimationFrame throttling
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentMap) return;

    let rafId: number | null = null;
    let pendingEvent: L.LeafletMouseEvent | null = null;

    const processMouseMove = () => {
      if (!pendingEvent || !mapInstanceRef.current) return;
      const width = currentMap.width || 255;
      const height = currentMap.height || 255;
      const { lat, lng } = pendingEvent.latlng;

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
      pendingEvent = null;
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      pendingEvent = e;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          processMouseMove();
          rafId = null;
        });
      }
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
      if (rafId !== null) cancelAnimationFrame(rafId);
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
        color: '#00ff41',
        weight: 2.5,
        dashArray: '5, 5'
      }).addTo(map);

      const midLat = (p1.latlng.lat + p2.latlng.lat) / 2;
      const midLng = (p1.latlng.lng + p2.latlng.lng) / 2;

      line.bindTooltip(`[ ДИСТАНЦИЯ: ${dist} ТАЙЛОВ | ΔX:${dx} ΔY:${dy} ]`, {
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
    let rawFullUrl = layerInfo?.fullUrl || '';
    if (rawFullUrl && !rawFullUrl.startsWith('http')) {
      rawFullUrl = `${import.meta.env.BASE_URL}${rawFullUrl}`;
    }
    const fullUrl = rawFullUrl;
    const pipenetUrl = layerInfo?.pipenetUrl || '';

    // If we have a local WebP render, it's instant Full-HD! Use it directly.
    const isLocalWebp = rawFullUrl.endsWith('.webp');
    const initialSource = isLocalWebp 
      ? fullUrl 
      : (previewUrl || fullUrl || getPlaceholderSvg(currentMap, currentZ));

    if (baseOverlayRef.current) {
      baseOverlayRef.current.remove();
      baseOverlayRef.current = null;
    }

    setIsLoadingFullRes(true);
    const overlay = L.imageOverlay(initialSource, bounds, {
      interactive: false,
      opacity: 1.0
    }).addTo(map);
    baseOverlayRef.current = overlay;

    overlay.on('load', () => {
      setIsLoadingFullRes(false);
    });
    overlay.on('error', () => {
      setIsLoadingFullRes(false);
    });

    // Step 2: Asynchronously load high-res image only if we used a low-res preview
    let isCancelled = false;

    if (fullUrl && !isLocalWebp && initialSource !== fullUrl) {
      const highResImg = new Image();
      highResImg.src = fullUrl;

      highResImg.onload = () => {
        if (isCancelled || !mapInstanceRef.current) return;
        setIsLoadingFullRes(false);
        if (baseOverlayRef.current) {
          baseOverlayRef.current.setUrl(fullUrl);
          baseOverlayRef.current.setOpacity(1.0);
        }
      };

      highResImg.onerror = () => {
        if (isCancelled) return;
        setIsLoadingFullRes(false);
        console.warn(`Could not load Full-HD render from ${fullUrl}`);
      };
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

    return () => {
      isCancelled = true;
    };
  }, [currentMap, currentZ, showPipenet, showGrid, getBounds, getPlaceholderSvg]);

  // Load location points for current map
  useEffect(() => {
    if (!currentMap) {
      setLocations([]);
      return;
    }

    const locUrl = `${import.meta.env.BASE_URL}data/locations/${currentMap.server}/${currentMap.id}.json`;
    fetch(locUrl)
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data: MapLocation[]) => {
        setLocations(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setLocations([]);
      });
  }, [currentMap?.server, currentMap?.id]);

  // Render interactive locations layer with zoom-adaptive LOD
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!locationsLayerRef.current) {
      locationsLayerRef.current = L.layerGroup().addTo(map);
    }
    const layerGroup = locationsLayerRef.current;
    layerGroup.clearLayers();

    if (!showLocations || !currentMap || locations.length === 0) {
      return;
    }

    const updateVisibleMarkers = () => {
      layerGroup.clearLayers();
      const zoom = map.getZoom();

      const zLocations = locations.filter(l => l.z === currentZ);

      zLocations.forEach(loc => {
        // Zoom-level Level of Detail (LOD)
        // Zoom <= -0.5: show only landmarks and major areas (Western Caves, Sand Temple, LZ)
        if (zoom <= -0.5 && loc.category === 'room') {
          return;
        }
        // Zoom < 1.0: show landmarks, major, and larger rooms (>= 25 tiles)
        if (zoom < 1.0 && loc.category === 'room' && loc.tileCount < 25) {
          return;
        }

        const { lat, lng } = ss13ToLeaflet(loc.x, loc.y);

        let iconHtml = '';
        if (loc.category === 'landmark') {
          iconHtml = `<div class="location-badge location-badge-landmark" title="${loc.name} (X:${loc.x} Y:${loc.y})"><span>📍</span><span>${loc.name}</span></div>`;
        } else if (loc.category === 'major') {
          iconHtml = `<div class="location-badge location-badge-major" title="${loc.name} (X:${loc.x} Y:${loc.y})"><span>${loc.name}</span></div>`;
        } else {
          iconHtml = `<div class="location-badge location-badge-room" title="${loc.name} (X:${loc.x} Y:${loc.y})"><span>${loc.name}</span></div>`;
        }

        const customIcon = L.divIcon({
          className: 'map-location-marker',
          html: iconHtml,
          iconSize: undefined,
          iconAnchor: [0, 0]
        });

        const marker = L.marker([lat, lng], {
          icon: customIcon,
          interactive: true,
          zIndexOffset: loc.category === 'landmark' ? 1000 : (loc.category === 'major' ? 500 : 100)
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setPin(loc.x, loc.y);
          onTileClick({ x: loc.x, y: loc.y, z: currentZ });
        });

        layerGroup.addLayer(marker);
      });
    };

    updateVisibleMarkers();
    map.on('zoomend', updateVisibleMarkers);

    return () => {
      map.off('zoomend', updateVisibleMarkers);
      layerGroup.clearLayers();
    };
  }, [showLocations, currentZ, locations, currentMap, ss13ToLeaflet, setPin, onTileClick]);

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
    <div className="relative w-full h-full bg-[#010803] overflow-hidden select-none font-mono">
      <div ref={mapContainerRef} className="w-full h-full outline-none" />

      {/* Subtle Progressive Loading Tactical Banner */}
      {isLoadingFullRes && (
        <div className="absolute top-16 right-4 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#011406]/95 border-2 border-[#00ff41] text-xs font-mono font-bold text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.4)] animate-pulse select-none">
          <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-ping" />
          <span>[ LINKING FULL-HD SATELLITE FEED... ]</span>
        </div>
      )}
    </div>
  );
};
