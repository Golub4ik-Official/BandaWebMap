/**
 * app.js
 * Main application coordinator for Banda SS13 WebMap.
 */

import { MapViewer } from './map-viewer.js';
import { Sidebar } from './sidebar.js';

class BandaWebMapApp {
  constructor() {
    this.manifest = null;
    this.mapViewer = null;
    this.sidebar = null;
    this.currentServerId = 'bandastation';
    this.currentMapData = null;
    this.currentZ = 1;

    this.dom = {
      coordDisplay: document.getElementById('coord-display'),
      gotoInputX: document.getElementById('goto-x'),
      gotoInputY: document.getElementById('goto-y'),
      gotoBtn: document.getElementById('goto-btn'),
      resetViewBtn: document.getElementById('reset-view-btn'),
      fullscreenBtn: document.getElementById('fullscreen-btn'),
      toast: document.getElementById('toast'),
      lastUpdateBadge: document.getElementById('last-update-badge')
    };

    this.init();
  }

  async init() {
    this.mapViewer = new MapViewer('webmap', {
      onCoordChange: (coords) => this.updateCoordHUD(coords),
      onTileSelect: (coords) => this.onTileSelected(coords)
    });

    this.sidebar = new Sidebar({
      onServerChange: (serverId) => this.handleServerChange(serverId),
      onMapSelect: (mapData, z) => this.handleMapSelect(mapData, z),
      onZChange: (z) => this.handleZChange(z),
      onToggleGrid: (enable) => this.mapViewer.toggleGrid(enable),
      onTogglePipenet: (enable) => this.mapViewer.togglePipenet(enable),
      onToggleRuler: (enable) => this.mapViewer.toggleRuler(enable)
    });

    this.bindHUD();
    await this.loadData();
    this.handleUrlParams();
  }

  bindHUD() {
    if (this.dom.gotoBtn && this.dom.gotoInputX && this.dom.gotoInputY) {
      this.dom.gotoBtn.addEventListener('click', () => {
        const x = parseInt(this.dom.gotoInputX.value, 10);
        const y = parseInt(this.dom.gotoInputY.value, 10);
        if (!isNaN(x) && !isNaN(y)) {
          this.mapViewer.goToCoords(x, y);
          this.showToast(`Переход к координатам X: ${x}, Y: ${y}`);
          this.updateUrlParams({ x, y });
        }
      });
    }

    if (this.dom.resetViewBtn) {
      this.dom.resetViewBtn.addEventListener('click', () => {
        if (this.currentMapData) {
          const bounds = [[0, 0], [-(this.currentMapData.height || 255), this.currentMapData.width || 255]];
          this.mapViewer.map.fitBounds(bounds, { padding: [20, 20] });
        }
      });
    }

    if (this.dom.fullscreenBtn) {
      this.dom.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          this.dom.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
          document.exitFullscreen();
          this.dom.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
      });
    }
  }

  async loadData() {
    try {
      const response = await fetch('data/maps.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      this.manifest = await response.json();
      this.sidebar.setManifest(this.manifest);

      if (this.dom.lastUpdateBadge && this.manifest.generatedAt) {
        const date = new Date(this.manifest.generatedAt);
        this.dom.lastUpdateBadge.textContent = `Обновлено: ${date.toLocaleDateString()}`;
      }
    } catch (e) {
      console.error('Failed to load data/maps.json:', e);
      this.showToast('Ошибка загрузки манифеста карт', true);
    }
  }

  handleUrlParams() {
    if (!this.manifest) return;

    const params = new URLSearchParams(window.location.search);
    const serverParam = params.get('server');
    const mapParam = params.get('map');
    const zParam = parseInt(params.get('z'), 10) || 1;
    const xParam = parseInt(params.get('x'), 10);
    const yParam = parseInt(params.get('y'), 10);
    const zoomParam = parseFloat(params.get('zoom'));

    let serverId = this.currentServerId;
    if (serverParam && this.manifest.servers[serverParam]) {
      serverId = serverParam;
    }

    this.currentServerId = serverId;
    this.sidebar.selectServer(serverId, false);

    const serverData = this.manifest.servers[serverId];
    if (!serverData || !serverData.maps || serverData.maps.length === 0) return;

    // Find map or take first
    let mapData = null;
    if (mapParam) {
      mapData = serverData.maps.find(m => m.id.toLowerCase() === mapParam.toLowerCase());
    }
    if (!mapData) {
      mapData = serverData.maps[0];
    }

    const coords = (!isNaN(xParam) && !isNaN(yParam)) ? { x: xParam, y: yParam } : null;
    const zoom = !isNaN(zoomParam) ? zoomParam : null;

    this.sidebar.selectMap(mapData.id, zParam, false);
    this.currentMapData = mapData;
    this.currentZ = zParam;

    this.mapViewer.loadMap(mapData, zParam, coords, zoom);
    this.updateTheme(serverId);
  }

  handleServerChange(serverId) {
    this.currentServerId = serverId;
    this.updateTheme(serverId);

    const serverData = this.manifest.servers[serverId];
    if (serverData && serverData.maps.length > 0) {
      const firstMap = serverData.maps[0];
      this.handleMapSelect(firstMap, 1);
    }
  }

  handleMapSelect(mapData, z = 1) {
    this.currentMapData = mapData;
    this.currentZ = z;
    this.mapViewer.loadMap(mapData, z);
    this.updateUrlParams({ server: this.currentServerId, map: mapData.id, z });
  }

  handleZChange(z) {
    this.currentZ = z;
    this.mapViewer.setZLevel(z);
    this.updateUrlParams({ z });
  }

  updateCoordHUD(coords) {
    if (!this.dom.coordDisplay) return;

    if (!coords) {
      this.dom.coordDisplay.innerHTML = `
        <span class="coord-label">X:</span> <span class="coord-val">--</span>
        <span class="coord-label">Y:</span> <span class="coord-val">--</span>
        <span class="coord-label">Z:</span> <span class="coord-val">${this.currentZ}</span>
      `;
      return;
    }

    this.dom.coordDisplay.innerHTML = `
      <span class="coord-label">X:</span> <span class="coord-val">${coords.x}</span>
      <span class="coord-label">Y:</span> <span class="coord-val">${coords.y}</span>
      <span class="coord-label">Z:</span> <span class="coord-val">${this.currentZ}</span>
    `;
  }

  onTileSelected(coords) {
    this.updateUrlParams({ x: coords.x, y: coords.y });
    const directUrl = window.location.href;
    navigator.clipboard.writeText(directUrl).then(() => {
      this.showToast(`Координаты скопированы: X=${coords.x}, Y=${coords.y}, Z=${this.currentZ}`);
    });
  }

  updateUrlParams(newParams = {}) {
    const url = new URL(window.location.href);
    if (newParams.server) url.searchParams.set('server', newParams.server);
    if (newParams.map) url.searchParams.set('map', newParams.map);
    if (newParams.z !== undefined) url.searchParams.set('z', newParams.z);
    if (newParams.x !== undefined) url.searchParams.set('x', newParams.x);
    if (newParams.y !== undefined) url.searchParams.set('y', newParams.y);
    if (newParams.zoom !== undefined) url.searchParams.set('zoom', newParams.zoom);

    window.history.replaceState({}, '', url.toString());
  }

  updateTheme(serverId) {
    document.body.className = `theme-${serverId}`;
  }

  showToast(message, isError = false) {
    if (!this.dom.toast) return;
    this.dom.toast.textContent = message;
    this.dom.toast.className = `toast show ${isError ? 'error' : ''}`;
    setTimeout(() => {
      this.dom.toast.className = 'toast';
    }, 3200);
  }
}

// Start application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BandaWebMapApp();
});
