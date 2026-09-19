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
    <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-slate-950/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск карты по названию или файлу..."
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:text-white text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[11px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-black/30 border-b border-white/5 overflow-x-auto scrollbar-none">
          {categories.map(c => {
            const Icon = c.icon;
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredMaps.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Карты по запросу не найдены
            </div>
          ) : (
            filteredMaps.map(map => {
              const isSelected = map.id === currentMapId;
              const hasRenders = map.layers && map.layers.some(l => (l.fullUrl && l.fullUrl.length > 0) || (l.previewUrl && l.previewUrl.length > 0));

              return (
                <button
                  key={map.id}
                  onClick={() => {
                    onSelectMap(map);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-sky-500/15 border border-sky-500/30 text-white'
                      : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{map.name}</span>
                      {hasRenders && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" title="Доступен Full-HD рендер" />
                      )}
                    </div>
                    {map.fluffName && map.fluffName !== map.name && (
                      <span className="text-xs text-slate-400">{map.fluffName}</span>
                    )}
                    <span className="text-[11px] font-mono text-slate-500">{map.mapFile}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                      {map.width}×{map.height}
                    </span>
                    {map.zLevels > 1 && (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Layers className="w-3 h-3" />
                        <span>{map.zLevels} палуб</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
