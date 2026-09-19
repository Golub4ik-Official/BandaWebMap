/**
 * map-viewer.js
 * Controls Leaflet map rendering, layer management, Z-level switching,
 * grid overlay, and procedural placeholders.
 */

import { CoordinateManager } from './coords.js';

export class MapViewer {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = options;
    this.map = null;
    this.currentMapData = null;
    this.currentZ = 1;
    this.baseImageLayer = null;
    this.pipeImageLayer = null;
    this.gridLayer = null;
    this.showGrid = true;
    this.showPipenet = false;
    this.coordManager = null;
    this.onCoordChange = options.onCoordChange || null;
    this.onTileSelect = options.onTileSelect || null;

    this.initMap();
  }

  initMap() {
    this.map = L.map(this.containerId, {
      crs: L.CRS.Simple,
      minZoom: -1,
      maxZoom: 6,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 80,
      attributionControl: false
    });

    // Custom attribution
    L.control.attribution({
      position: 'bottomright',
      prefix: '<a href="https://github.com/ss220club" target="_blank">Banda SS13</a> | WebMap'
    }).addTo(this.map);

    // Grid layer
    this.createGridLayer();

    // Mouse events
    this.map.on('mousemove', (e) => {
      if (this.coordManager) {
        this.coordManager.onMouseMove(e, this.onCoordChange);
      }
    });

    this.map.on('click', (e) => {
      if (this.coordManager) {
        this.coordManager.onClick(e, this.onTileSelect);
      }
    });
  }

  loadMap(mapData, initialZ = 1, targetCoords = null, targetZoom = null) {
    this.currentMapData = mapData;
    this.currentZ = initialZ;

    const width = mapData.width || 255;
    const height = mapData.height || 255;
    const bounds = [[0, 0], [-height, width]];

    if (!this.coordManager) {
      this.coordManager = new CoordinateManager(this.map, bounds);
    } else {
      this.coordManager.updateBounds(bounds);
    }

    this.map.setMaxBounds([
      [50, -50],
      [-height - 50, width + 50]
    ]);

    this.updateLayers();

    if (targetCoords && targetCoords.x && targetCoords.y) {
      const targetLatLng = this.coordManager.ss13ToLeaflet(targetCoords.x, targetCoords.y);
      const zoom = targetZoom !== null ? targetZoom : 3;
      this.map.setView([targetLatLng.lat, targetLatLng.lng], zoom);
      this.coordManager.selectTile(targetCoords.x, targetCoords.y);
    } else {
      this.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  setZLevel(z) {
    if (this.currentZ === z) return;
    this.currentZ = z;
    this.updateLayers();
  }

  updateLayers() {
    if (!this.currentMapData) return;

    const width = this.currentMapData.width || 255;
    const height = this.currentMapData.height || 255;
    const bounds = [[0, 0], [-height, width]];

    const layerInfo = (this.currentMapData.layers && this.currentMapData.layers.find(l => l.z === this.currentZ)) || {
      z: this.currentZ,
      imageUrl: '',
      pipenetUrl: ''
    };

    // Remove existing base layer
    if (this.baseImageLayer) {
      this.baseImageLayer.remove();
      this.baseImageLayer = null;
    }

    // Remove existing pipenet layer
    if (this.pipeImageLayer) {
      this.pipeImageLayer.remove();
      this.pipeImageLayer = null;
    }

    // Load or generate base map
    if (layerInfo.imageUrl) {
      this.baseImageLayer = L.imageOverlay(layerInfo.imageUrl, bounds, {
        interactive: false,
        errorOverlayUrl: this.generatePlaceholderSvg(this.currentMapData, this.currentZ)
      }).addTo(this.map);
    } else {
      // Fallback placeholder
      const placeholderSvg = this.generatePlaceholderSvg(this.currentMapData, this.currentZ);
      this.baseImageLayer = L.imageOverlay(placeholderSvg, bounds, { interactive: false }).addTo(this.map);
    }

    // Pipenet overlay
    if (this.showPipenet && layerInfo.pipenetUrl) {
      this.pipeImageLayer = L.imageOverlay(layerInfo.pipenetUrl, bounds, {
        interactive: false,
        opacity: 0.85
      }).addTo(this.map);
    }

    // Refresh grid
    if (this.showGrid) {
      if (!this.map.hasLayer(this.gridLayer)) {
        this.gridLayer.addTo(this.map);
      }
      this.gridLayer.bringToFront();
    } else {
      if (this.map.hasLayer(this.gridLayer)) {
        this.gridLayer.remove();
      }
    }
  }

  createGridLayer() {
    const Grid = L.GridLayer.extend({
      createTile: function(coords) {
        const tile = document.createElement('div');
        tile.className = 'ss13-grid-tile';
        return tile;
      }
    });

    this.gridLayer = new Grid({
      tileSize: 32,
      opacity: 0.18,
      zIndex: 400
    });
  }

  toggleGrid(enable) {
    this.showGrid = enable;
    if (this.showGrid) {
      if (!this.map.hasLayer(this.gridLayer)) {
        this.gridLayer.addTo(this.map);
      }
    } else {
      if (this.map.hasLayer(this.gridLayer)) {
        this.gridLayer.remove();
      }
    }
  }

  togglePipenet(enable) {
    this.showPipenet = enable;
    this.updateLayers();
  }

  toggleRuler(enable) {
    if (this.coordManager) {
      this.coordManager.setRulerMode(enable);
    }
  }

  goToCoords(x, y, zoom = 4) {
    if (!this.coordManager) return;
    const { lat, lng } = this.coordManager.ss13ToLeaflet(x, y);
    this.map.setView([lat, lng], zoom, { animate: true });
    this.coordManager.selectTile(x, y);
  }

  generatePlaceholderSvg(mapData, z) {
    const width = mapData.width || 255;
    const height = mapData.height || 255;
    const serverName = (mapData.server || '').toUpperCase();
    const mapName = mapData.name || 'Unknown Map';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width * 32}" height="${height * 32}" viewBox="0 0 ${width} ${height}">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" stroke-width="0.3"/>
          </pattern>
          <pattern id="majorGrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <rect width="50" height="50" fill="url(#grid)" />
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#334155" stroke-width="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#0a0f1d"/>
        <rect width="100%" height="100%" fill="url(#majorGrid)" />
        <rect x="5" y="5" width="${width - 10}" height="${height - 10}" fill="none" stroke="#0284c7" stroke-width="0.6" stroke-dasharray="4,4"/>
        <text x="${width / 2}" y="${height / 2 - 10}" fill="#38bdf8" font-family="monospace" font-size="6" font-weight="bold" text-anchor="middle">
          [ ${serverName} // ${mapName} ]
        </text>
        <text x="${width / 2}" y="${height / 2}" fill="#94a3b8" font-family="monospace" font-size="3.5" text-anchor="middle">
          Z-LEVEL ${z} | РАЗМЕР: ${width}x${height}
        </text>
        <text x="${width / 2}" y="${height / 2 + 8}" fill="#64748b" font-family="monospace" font-size="2.8" text-anchor="middle">
          Рендер карты генерируется / Наномап формируется
        </text>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
}
