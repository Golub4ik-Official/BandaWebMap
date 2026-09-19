/**
 * coords.js
 * Precision coordinate system conversion between Leaflet Simple CRS and Space Station 13 tile coordinates.
 * In SS13, (1, 1) is the bottom-left tile.
 * In Leaflet Simple CRS with bounds [[0, 0], [-height, width]],
 * Lat goes from 0 (top) down to -height (bottom).
 * Lng goes from 0 (left) to width (right).
 */

export class CoordinateManager {
  constructor(map, bounds) {
    this.map = map;
    this.bounds = bounds; // [[0, 0], [-height, width]]
    this.height = Math.abs(bounds[1][0]);
    this.width = Math.abs(bounds[1][1]);
    this.hoverPolygon = null;
    this.selectedMarker = null;
    this.rulerPoints = [];
    this.rulerLine = null;
    this.rulerActive = false;

    this.initHoverPolygon();
  }

  updateBounds(bounds) {
    this.bounds = bounds;
    this.height = Math.abs(bounds[1][0]);
    this.width = Math.abs(bounds[1][1]);
    this.clearRuler();
    this.clearSelection();
  }

  initHoverPolygon() {
    this.hoverPolygon = L.polygon([[0, 0]], {
      color: '#38bdf8',
      weight: 1.5,
      fillColor: '#38bdf8',
      fillOpacity: 0.25,
      interactive: false
    });
  }

  /**
   * Converts Leaflet LatLng to SS13 integer grid coordinates
   * @param {number} lat 
   * @param {number} lng 
   * @returns {{x: number, y: number}}
   */
  leafletToSS13(lat, lng) {
    const rawX = Math.floor(lng) + 1;
    // Since lat is <= 0: -lat is positive distance from top (0) to bottom (height)
    // In SS13, y=1 is at the bottom (-height), y=height is at the top (0)
    const rawY = this.height - Math.floor(-lat);

    const x = Math.max(1, Math.min(this.width, rawX));
    const y = Math.max(1, Math.min(this.height, rawY));

    return { x, y };
  }

  /**
   * Converts SS13 coordinates to Leaflet LatLng center of tile
   * @param {number} x 
   * @param {number} y 
   * @returns {{lat: number, lng: number}}
   */
  ss13ToLeaflet(x, y) {
    const lng = x - 0.5;
    const lat = -(this.height - y + 0.5);
    return { lat, lng };
  }

  /**
   * Returns polygon corners for a tile at SS13 (x, y)
   */
  getTileBounds(x, y) {
    const left = x - 1;
    const right = x;
    const topLat = -(this.height - y);
    const bottomLat = -(this.height - y + 1);

    return [
      [topLat, left],
      [topLat, right],
      [bottomLat, right],
      [bottomLat, left]
    ];
  }

  /**
   * Update hover polygon on mouse move
   */
  onMouseMove(e, onCoordUpdate) {
    if (!this.map) return;
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Check if within map boundaries
    if (lng < 0 || lng > this.width || lat > 0 || lat < -this.height) {
      if (this.hoverPolygon && this.map.hasLayer(this.hoverPolygon)) {
        this.hoverPolygon.remove();
      }
      if (onCoordUpdate) onCoordUpdate(null);
      return;
    }

    const { x, y } = this.leafletToSS13(lat, lng);
    const tileCorners = this.getTileBounds(x, y);

    this.hoverPolygon.setLatLngs(tileCorners);
    if (!this.map.hasLayer(this.hoverPolygon)) {
      this.hoverPolygon.addTo(this.map);
    }

    if (onCoordUpdate) {
      onCoordUpdate({ x, y, lat, lng });
    }
  }

  /**
   * Handle click to pin or measure
   */
  onClick(e, onSelect) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    if (lng < 0 || lng > this.width || lat > 0 || lat < -this.height) return;

    const { x, y } = this.leafletToSS13(lat, lng);

    if (this.rulerActive) {
      this.addRulerPoint(x, y);
      return;
    }

    this.selectTile(x, y);
    if (onSelect) {
      onSelect({ x, y, lat, lng });
    }
  }

  selectTile(x, y) {
    this.clearSelection();
    const center = this.ss13ToLeaflet(x, y);

    const customIcon = L.divIcon({
      className: 'ss13-pin-marker',
      html: `<div class="pin-pulse"></div><div class="pin-label">X:${x} Y:${y}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    this.selectedMarker = L.marker([center.lat, center.lng], { icon: customIcon }).addTo(this.map);
  }

  clearSelection() {
    if (this.selectedMarker) {
      this.selectedMarker.remove();
      this.selectedMarker = null;
    }
  }

  // --- Ruler Tool ---
  setRulerMode(active) {
    this.rulerActive = active;
    if (!active) {
      this.clearRuler();
    }
  }

  addRulerPoint(x, y) {
    const latlng = this.ss13ToLeaflet(x, y);
    this.rulerPoints.push({ x, y, latlng });

    if (this.rulerPoints.length > 2) {
      this.clearRuler();
      this.rulerPoints.push({ x, y, latlng });
    }

    if (this.rulerPoints.length === 2) {
      const p1 = this.rulerPoints[0];
      const p2 = this.rulerPoints[1];
      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);
      const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
      const manhattan = dx + dy;

      if (this.rulerLine) this.rulerLine.remove();

      this.rulerLine = L.polyline([
        [p1.latlng.lat, p1.latlng.lng],
        [p2.latlng.lat, p2.latlng.lng]
      ], {
        color: '#f43f5e',
        weight: 3,
        dashArray: '6, 6'
      }).addTo(this.map);

      const midLat = (p1.latlng.lat + p2.latlng.lat) / 2;
      const midLng = (p1.latlng.lng + p2.latlng.lng) / 2;

      this.rulerLine.bindTooltip(`Дистанция: ${dist} тайлов (ΔX: ${dx}, ΔY: ${dy})`, {
        permanent: true,
        className: 'ruler-tooltip'
      }).openTooltip([midLat, midLng]);
    }
  }

  clearRuler() {
    this.rulerPoints = [];
    if (this.rulerLine) {
      this.rulerLine.remove();
      this.rulerLine = null;
    }
  }
}
