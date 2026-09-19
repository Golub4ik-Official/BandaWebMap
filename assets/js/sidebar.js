/**
 * sidebar.js
 * Controls server switcher, map lists, search, filtering, and active map details.
 */

export class Sidebar {
  constructor(options = {}) {
    this.manifest = options.manifest || null;
    this.currentServer = options.initialServer || 'bandastation';
    this.currentMapId = null;
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.onMapSelect = options.onMapSelect || null;
    this.onZChange = options.onZChange || null;
    this.onServerChange = options.onServerChange || null;
    this.onToggleGrid = options.onToggleGrid || null;
    this.onTogglePipenet = options.onTogglePipenet || null;
    this.onToggleRuler = options.onToggleRuler || null;

    this.dom = {
      serverTabs: document.getElementById('server-tabs'),
      categoryFilters: document.getElementById('category-filters'),
      searchInput: document.getElementById('map-search'),
      mapList: document.getElementById('map-list'),
      mapCount: document.getElementById('map-count'),
      activeMapCard: document.getElementById('active-map-card'),
      sidebarToggle: document.getElementById('sidebar-toggle'),
      sidebar: document.getElementById('sidebar')
    };

    this.bindEvents();
  }

  setManifest(manifest) {
    this.manifest = manifest;
    this.renderServerTabs();
    this.renderCategoryFilters();
    this.renderMapList();
  }

  bindEvents() {
    if (this.dom.searchInput) {
      this.dom.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderMapList();
      });
    }

    if (this.dom.sidebarToggle) {
      this.dom.sidebarToggle.addEventListener('click', () => {
        this.dom.sidebar.classList.toggle('collapsed');
      });
    }
  }

  renderServerTabs() {
    if (!this.manifest || !this.dom.serverTabs) return;

    this.dom.serverTabs.innerHTML = '';
    Object.values(this.manifest.servers).forEach(server => {
      const btn = document.createElement('button');
      btn.className = `server-tab-btn ${server.id === this.currentServer ? 'active' : ''}`;
      btn.dataset.serverId = server.id;
      btn.innerHTML = `
        <span class="server-tab-indicator" style="background-color: ${server.color};"></span>
        <span class="server-tab-name">${server.name}</span>
        <span class="server-tab-badge">${server.maps.length}</span>
      `;

      btn.addEventListener('click', () => {
        this.selectServer(server.id);
      });

      this.dom.serverTabs.appendChild(btn);
    });
  }

  renderCategoryFilters() {
    if (!this.dom.categoryFilters) return;

    const categories = [
      { id: 'all', label: 'Все карты' },
      { id: 'Station', label: 'Станции' },
      { id: 'Ship', label: 'Корабли' },
      { id: 'Ground', label: 'Поверхность' }
    ];

    this.dom.categoryFilters.innerHTML = '';
    categories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `filter-pill ${this.currentCategory === cat.id ? 'active' : ''}`;
      pill.textContent = cat.label;
      pill.addEventListener('click', () => {
        this.currentCategory = cat.id;
        this.renderCategoryFilters();
        this.renderMapList();
      });
      this.dom.categoryFilters.appendChild(pill);
    });
  }

  selectServer(serverId, triggerCallback = true) {
    if (this.currentServer === serverId) return;
    this.currentServer = serverId;

    document.querySelectorAll('.server-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.serverId === serverId);
    });

    // Reset map selection
    this.currentMapId = null;
    this.renderMapList();

    if (triggerCallback && this.onServerChange) {
      this.onServerChange(serverId);
    }
  }

  renderMapList() {
    if (!this.manifest || !this.dom.mapList) return;

    const serverData = this.manifest.servers[this.currentServer];
    if (!serverData) return;

    let maps = serverData.maps;

    // Filter by category
    if (this.currentCategory !== 'all') {
      maps = maps.filter(m => m.category === this.currentCategory);
    }

    // Filter by search
    if (this.searchQuery) {
      maps = maps.filter(m => 
        (m.name && m.name.toLowerCase().includes(this.searchQuery)) ||
        (m.fluffName && m.fluffName.toLowerCase().includes(this.searchQuery)) ||
        (m.id && m.id.toLowerCase().includes(this.searchQuery))
      );
    }

    if (this.dom.mapCount) {
      this.dom.mapCount.textContent = `${maps.length} карт`;
    }

    this.dom.mapList.innerHTML = '';

    if (maps.length === 0) {
      this.dom.mapList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>Карты не найдены</p>
        </div>
      `;
      return;
    }

    maps.forEach(map => {
      const item = document.createElement('div');
      item.className = `map-list-item ${map.id === this.currentMapId ? 'active' : ''}`;
      item.dataset.mapId = map.id;

      const hasNanomap = map.layers && map.layers.some(l => l.imageUrl && l.imageUrl.length > 0);
      const categoryClass = map.category ? `badge-${map.category.toLowerCase()}` : 'badge-default';

      item.innerHTML = `
        <div class="map-item-header">
          <span class="map-item-title">${map.name}</span>
          ${hasNanomap ? '<span class="map-status-dot" title="Рендер доступен"></span>' : ''}
        </div>
        ${map.fluffName && map.fluffName !== map.name ? `<div class="map-item-sub">${map.fluffName}</div>` : ''}
        <div class="map-item-meta">
          <span class="meta-tag ${categoryClass}">${map.category || 'Map'}</span>
          <span class="meta-tag">Z: ${map.zLevels || 1}</span>
          <span class="meta-tag">${map.width}x${map.height}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectMap(map.id);
      });

      this.dom.mapList.appendChild(item);
    });
  }

  selectMap(mapId, z = 1, triggerCallback = true) {
    this.currentMapId = mapId;

    document.querySelectorAll('.map-list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.mapId === mapId);
    });

    const serverData = this.manifest.servers[this.currentServer];
    const mapData = serverData.maps.find(m => m.id === mapId);
    if (!mapData) return;

    this.renderActiveMapCard(mapData, z);

    if (triggerCallback && this.onMapSelect) {
      this.onMapSelect(mapData, z);
    }
  }

  renderActiveMapCard(mapData, activeZ = 1) {
    if (!this.dom.activeMapCard) return;

    const layers = mapData.layers || [{ z: 1, name: 'Deck 1' }];
    const hasPipenet = layers.some(l => l.pipenetUrl && l.pipenetUrl.length > 0);

    let zButtonsHtml = '';
    layers.forEach(layer => {
      zButtonsHtml += `
        <button class="z-btn ${layer.z === activeZ ? 'active' : ''}" data-z="${layer.z}">
          ${layer.name || `Deck ${layer.z}`}
        </button>
      `;
    });

    this.dom.activeMapCard.innerHTML = `
      <div class="active-card-header">
        <div class="active-card-title-group">
          <h3 class="active-card-title">${mapData.name}</h3>
          <span class="active-card-file">${mapData.mapFile}</span>
        </div>
        <button id="copy-link-btn" class="icon-action-btn" title="Скопировать прямую ссылку на карту">
          <i class="fas fa-link"></i>
        </button>
      </div>

      ${mapData.announceText ? `<p class="active-card-desc">${mapData.announceText}</p>` : ''}

      <div class="card-section">
        <span class="section-label">Палубы / Z-Уровни:</span>
        <div class="z-buttons-container" id="z-buttons">
          ${zButtonsHtml}
        </div>
      </div>

      <div class="card-section">
        <span class="section-label">Слои и инструменты:</span>
        <div class="layer-toggles">
          <label class="toggle-control">
            <input type="checkbox" id="toggle-grid" checked>
            <span class="toggle-slider"></span>
            <span class="toggle-label"><i class="fas fa-border-all"></i> Сетка</span>
          </label>
          ${hasPipenet ? `
            <label class="toggle-control">
              <input type="checkbox" id="toggle-pipe">
              <span class="toggle-slider"></span>
              <span class="toggle-label"><i class="fas fa-wave-square"></i> Трубы</span>
            </label>
          ` : ''}
          <label class="toggle-control">
            <input type="checkbox" id="toggle-ruler">
            <span class="toggle-slider"></span>
            <span class="toggle-label"><i class="fas fa-ruler-combined"></i> Линейка</span>
          </label>
        </div>
      </div>
    `;

    // Bind Z-level button clicks
    const zContainer = document.getElementById('z-buttons');
    if (zContainer) {
      zContainer.querySelectorAll('.z-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const z = parseInt(btn.dataset.z, 10);
          zContainer.querySelectorAll('.z-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.onZChange) {
            this.onZChange(z);
          }
        });
      });
    }

    // Bind layer toggles
    const gridToggle = document.getElementById('toggle-grid');
    if (gridToggle && this.onToggleGrid) {
      gridToggle.addEventListener('change', (e) => this.onToggleGrid(e.target.checked));
    }

    const pipeToggle = document.getElementById('toggle-pipe');
    if (pipeToggle && this.onTogglePipenet) {
      pipeToggle.addEventListener('change', (e) => this.onTogglePipenet(e.target.checked));
    }

    const rulerToggle = document.getElementById('toggle-ruler');
    if (rulerToggle && this.onToggleRuler) {
      rulerToggle.addEventListener('change', (e) => this.onToggleRuler(e.target.checked));
    }

    // Bind copy link button
    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
          copyBtn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-link"></i>', 2000);
        });
      });
    }
  }
}
