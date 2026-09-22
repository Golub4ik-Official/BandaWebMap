import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Layers, Compass, Rocket, Building, Mountain } from 'lucide-react';
import { GameMap } from '../types';

interface MapSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  maps: GameMap[];
  currentMapId: string;
  onSelectMap: (map: GameMap) => void;
}

export const MapSearchModal: React.FC<MapSearchModalProps> = ({
  isOpen,
  onClose,
  maps,
  currentMapId,
  onSelectMap,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle keyboard ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'Все', icon: Compass },
    { id: 'Station', label: 'Станции', icon: Building },
    { id: 'Ship', label: 'Корабли', icon: Rocket },
    { id: 'Ground', label: 'Поверхность', icon: Mountain }
  ];

  const filteredMaps = maps.filter(m => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const q = query.toLowerCase();
    const matchesQuery = !query || 
      m.name.toLowerCase().includes(q) || 
      (m.fluffName && m.fluffName.toLowerCase().includes(q)) || 
      m.id.toLowerCase().includes(q) ||
      m.mapFile.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#010e04]/95 border-2 border-[#00ff41] rounded-sm shadow-[0_0_35px_rgba(0,255,65,0.45)] overflow-hidden flex flex-col max-h-[85vh] select-none font-mono">
        
        {/* Subtle Watermark: Weyland-Yutani Vector Globe in background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 overflow-hidden">
          <div className="w-[500px] h-[500px] rounded-full border-[12px] border-[#00ff41] flex items-center justify-center">
            <div className="w-[350px] h-[350px] rounded-full border-[6px] border-[#00ff41] flex items-center justify-center">
              <span className="text-4xl font-bold tracking-[0.3em] text-[#00ff41]">W-Y CORP</span>
            </div>
          </div>
        </div>

        {/* Window Title Bar (Late Join style with eye icon and green X) */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-[#021808] border-b-2 border-[#00ff41] text-[#00ff41]">
          <div className="flex items-center gap-2">
            <span className="text-[#00ff41] text-base animate-pulse">👁️</span>
            <span className="font-bold text-sm tracking-wider cm-text-glow">
              LATE JOIN // TACTICAL ARCHIVE
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-colors rounded-sm font-bold"
            title="Закрыть (ESC)"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Weyland-Yutani Header (From Image 2) */}
        <div className="px-4 py-2.5 bg-[#011406]/90 border-b border-[#00ff41]/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full border-2 border-[#00ff41] flex items-center justify-center text-[10px] text-[#00ff41] font-bold">
              ★W★
            </div>
            <div>
              <div className="text-[#00ff41] font-bold text-[12px] tracking-wide">
                WEYLAND-YUTANI CORP // TERMINAL WI-56
              </div>
              <div className="text-[#00aa2b] text-[10px] tracking-widest uppercase">
                "Building Better Worlds" • Tactical Uplink
              </div>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-[#00ff41] bg-[#00ff41]/10 px-2 py-0.5 rounded border border-[#00ff41]/30">
              SYS.STATUS: ONLINE
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-2.5 bg-[#010d03] border-b border-[#00ff41]/50 gap-2.5 text-[#00ff41]">
          <Search className="w-4 h-4 text-[#00ff41] shrink-0" />
          <span className="text-xs text-[#00aa2b] font-bold select-none">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ВВЕДИТЕ НАЗВАНИЕ КАРТЫ ИЛИ ФАЙЛА..."
            className="w-full bg-transparent text-[#00ff41] placeholder-[#00731d] text-xs font-mono font-bold tracking-wider outline-none uppercase"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-0.5 hover:text-white text-[#00ff41]">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] font-mono text-black bg-[#00e639] px-2 py-0.5 rounded font-bold">
            ESC
          </kbd>
        </div>

        {/* Categories (Military squad / theater tabs) */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#021406] border-b-2 border-[#00ff41]/40 overflow-x-auto scrollbar-none">
          {categories.map(c => {
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold uppercase transition-all rounded-sm ${
                  isSelected
                    ? 'bg-[#00e639] text-black shadow-[0_0_8px_rgba(0,255,65,0.7)]'
                    : 'text-[#00aa2b] hover:text-[#00ff41] hover:bg-[#00ff41]/10 border border-[#00ff41]/20'
                }`}
              >
                <span>[{c.label}]</span>
              </button>
            );
          })}
        </div>

        {/* Results List: Replicating Image 1 (Late Join Buttons) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#010903]">
          {filteredMaps.length === 0 ? (
            <div className="p-10 text-center text-[#00731d] font-bold text-sm tracking-wider uppercase">
              [ КАРТЫ ПО ДАННОМУ ЗАПРОСУ НЕ НАЙДЕНЫ В АРХИВЕ ]
            </div>
          ) : (
            filteredMaps.map(map => {
              const isSelected = map.id === currentMapId;
              const hasRenders = map.layers && map.layers.some(l => (l.fullUrl && l.fullUrl.length > 0) || (l.previewUrl && l.previewUrl.length > 0));

              return (
                <div
                  key={map.id}
                  onClick={() => {
                    onSelectMap(map);
                    onClose();
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-sm border cursor-pointer transition-all duration-100 ${
                    isSelected
                      ? 'bg-[#00e639] text-black border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.8)]'
                      : 'bg-[#011606] hover:bg-[#00e639] text-[#00ff41] hover:text-black border-[#00ff41]/50 hover:border-[#00ff41] hover:shadow-[0_0_12px_rgba(0,255,65,0.6)]'
                  }`}
                >
                  {/* Left: Map identity & info */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-sm border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-black text-[#00ff41] border-black'
                        : 'bg-[#02200a] group-hover:bg-black text-[#00ff41] border-[#00ff41]/60 group-hover:border-black'
                    }`}>
                      {map.category === 'Ground' ? '🌍' : (map.category === 'Ship' ? '🚀' : '🛰️')}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm uppercase tracking-wide">
                          {map.name}
                        </span>
                        {hasRenders && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isSelected 
                              ? 'bg-black text-[#00ff41]' 
                              : 'bg-[#00ff41]/20 group-hover:bg-black text-[#00ff41] group-hover:text-[#00ff41]'
                          }`}>
                            HD
                          </span>
                        )}
                      </div>
                      {map.fluffName && map.fluffName !== map.name && (
                        <span className={`text-[11px] truncate max-w-xs transition-colors ${
                          isSelected ? 'text-black/80' : 'text-[#00bb2f] group-hover:text-black/80'
                        }`}>
                          {map.fluffName}
                        </span>
                      )}
                      <span className={`text-[10px] font-mono transition-colors ${
                        isSelected ? 'text-black/70' : 'text-[#00731d] group-hover:text-black/70'
                      }`}>
                        {map.mapFile} • {map.width}×{map.height}
                      </span>
                    </div>
                  </div>

                  {/* Right: Join / Deploy Action Button (Exact Late Join style) */}
                  <div className="flex items-center gap-2">
                    {map.zLevels > 1 && (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                        isSelected 
                          ? 'border-black/40 text-black' 
                          : 'border-[#00ff41]/30 group-hover:border-black/40 text-[#00aa2b] group-hover:text-black'
                      }`}>
                        {map.zLevels} DECKS
                      </span>
                    )}
                    
                    <button className={`flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase rounded-sm border transition-colors ${
                      isSelected
                        ? 'bg-black text-[#00ff41] border-black'
                        : 'bg-[#00ff41] group-hover:bg-black text-black group-hover:text-[#00ff41] border-[#00ff41] group-hover:border-black'
                    }`}>
                      <span>DEPLOY</span>
                      <span className="text-[10px]">▶</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="px-3.5 py-1.5 bg-[#021808] border-t-2 border-[#00ff41] flex items-center justify-between text-[11px] text-[#00aa2b]">
          <span>АРХИВ: {filteredMaps.length} ОБЪЕКТОВ</span>
          <span>ВЫБЕРИТЕ ДЛЯ ТАКТИЧЕСКОЙ ДИСПЛЕЯЦИИ</span>
        </div>
      </div>
    </div>
  );
};
