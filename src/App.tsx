import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapView } from './components/MapView';
import { FloatingHeader } from './components/FloatingHeader';
import { MapSearchModal } from './components/MapSearchModal';
import { CoordHUD } from './components/CoordHUD';
import { GameMap, MapsManifest } from './types';

export const App: React.FC = () => {
  const [manifest, setManifest] = useState<MapsManifest | null>(null);
  const [currentServer, setCurrentServer] = useState<'bandamarines' | 'bandastation' | 'bandatroopers'>('bandastation');
  const [currentMap, setCurrentMap] = useState<GameMap | null>(null);
  const [currentZ, setCurrentZ] = useState<number>(1);

  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showPipenet, setShowPipenet] = useState<boolean>(false);
  const [showLocations, setShowLocations] = useState<boolean>(true);
  const [rulerActive, setRulerActive] = useState<boolean>(false);

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [activeCoords, setActiveCoords] = useState<{ x: number; y: number; z: number } | null>(null);
  const [targetCoords, setTargetCoords] = useState<{ x: number; y: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const resetViewFnRef = useRef<(() => void) | null>(null);
  const goToCoordsFnRef = useRef<((x: number, y: number) => void) | null>(null);

  // Load manifest
  useEffect(() => {
    const dataUrl = `${import.meta.env.BASE_URL}data/maps.json`;
    fetch(dataUrl)
      .then(r => r.json())
      .then((data: MapsManifest) => {
        setManifest(data);
        initFromUrl(data);
      })
      .catch(err => {
        console.error('Failed to load maps manifest:', err);
      });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K for map search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // Ignore single key shortcuts if input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
        setShowLocations(prev => !prev);
      } else if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
        setShowGrid(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const getDefaultZ = useCallback((map: GameMap | null): number => {
    if (!map) return 1;
    if (map.id === 'cyberiad') return 2;
    if (map.id === 'almayer') return 2;
    return 1;
  }, []);

  const initFromUrl = useCallback((data: MapsManifest) => {
    const params = new URLSearchParams(window.location.search);
    const sParam = params.get('server') as 'bandamarines' | 'bandastation' | 'bandatroopers' | null;
    const mParam = params.get('map');
    const zParam = parseInt(params.get('z') || '', 10);
    const xParam = parseInt(params.get('x') || '', 10);
    const yParam = parseInt(params.get('y') || '', 10);

    const sId = (sParam && data.servers[sParam]) ? sParam : 'bandastation';
    setCurrentServer(sId);

    const serverMaps = data.servers[sId]?.maps || [];
    let initialMap = serverMaps[0] || null;
    if (mParam) {
      const found = serverMaps.find(m => m.id.toLowerCase() === mParam.toLowerCase());
      if (found) initialMap = found;
    }

    const targetZ = !isNaN(zParam) ? zParam : getDefaultZ(initialMap);

    setCurrentMap(initialMap);
    setCurrentZ(targetZ);

    if (!isNaN(xParam) && !isNaN(yParam)) {
      setTargetCoords({ x: xParam, y: yParam });
    }
  }, [getDefaultZ]);

  const updateUrl = useCallback((updates: { server?: string; map?: string; z?: number; x?: number; y?: number }) => {
    const url = new URL(window.location.href);
    if (updates.server) url.searchParams.set('server', updates.server);
    if (updates.map) url.searchParams.set('map', updates.map);
    if (updates.z !== undefined) url.searchParams.set('z', updates.z.toString());
    if (updates.x !== undefined) url.searchParams.set('x', updates.x.toString());
    if (updates.y !== undefined) url.searchParams.set('y', updates.y.toString());

    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleServerChange = (serverId: 'bandamarines' | 'bandastation' | 'bandatroopers') => {
    setCurrentServer(serverId);
    if (!manifest) return;
    const maps = manifest.servers[serverId]?.maps || [];
    if (maps.length > 0) {
      const nextMap = maps[0];
      const nextZ = getDefaultZ(nextMap);
      setCurrentMap(nextMap);
      setCurrentZ(nextZ);
      updateUrl({ server: serverId, map: nextMap.id, z: nextZ });
    }
  };

  const handleSelectMap = (map: GameMap) => {
    const nextZ = getDefaultZ(map);
    setCurrentMap(map);
    setCurrentZ(nextZ);
    updateUrl({ map: map.id, z: nextZ });
  };

  const handleZChange = (z: number) => {
    setCurrentZ(z);
    updateUrl({ z });
  };

  const handleTileClick = (coords: { x: number; y: number; z: number }) => {
    updateUrl({ x: coords.x, y: coords.y, z: coords.z });
    navigator.clipboard.writeText(window.location.href);
    showToast(`Точка X:${coords.x} Y:${coords.y} Z:${coords.z} скопирована`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showToast('Ссылка на карту скопирована');
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const currentMapsList = manifest ? manifest.servers[currentServer]?.maps || [] : [];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060911] text-white font-sans">
      {/* Minimal Floating Top Bar */}
      <FloatingHeader
        currentServer={currentServer}
        currentMap={currentMap}
        currentZ={currentZ}
        showGrid={showGrid}
        showPipenet={showPipenet}
        showLocations={showLocations}
        rulerActive={rulerActive}
        onServerChange={handleServerChange}
        onOpenMapSearch={() => setIsSearchOpen(true)}
        onZChange={handleZChange}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onTogglePipenet={() => setShowPipenet(!showPipenet)}
        onToggleLocations={() => setShowLocations(prev => !prev)}
        onToggleRuler={() => setRulerActive(!rulerActive)}
        onCopyLink={handleCopyLink}
        isCopied={isCopied}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Map Canvas on 100% viewport */}
      <MapView
        currentMap={currentMap}
        currentZ={currentZ}
        showGrid={showGrid}
        showPipenet={showPipenet}
        showLocations={showLocations}
        rulerActive={rulerActive}
        targetCoords={targetCoords}
        onCoordChange={setActiveCoords}
        onTileClick={handleTileClick}
        onResetViewReady={fn => (resetViewFnRef.current = fn)}
        onGoToCoordsReady={fn => (goToCoordsFnRef.current = fn)}
      />

      {/* Minimal Bottom Corner HUD */}
      <CoordHUD
        coords={activeCoords}
        onResetView={() => resetViewFnRef.current?.()}
        onGoToCoords={(x, y) => goToCoordsFnRef.current?.(x, y)}
      />

      {/* Command Palette Map Search Modal */}
      <MapSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        maps={currentMapsList}
        currentMapId={currentMap?.id || ''}
        onSelectMap={handleSelectMap}
      />

      {/* Minimal Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[3000] px-4 py-2 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-white/10 text-white text-xs font-medium shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
