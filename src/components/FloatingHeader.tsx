import React from 'react';
import { 
  Compass, 
  Search, 
  Grid3X3, 
  Ruler, 
  Share2, 
  Maximize2, 
  Minimize2, 
  Layers, 
  GitCommitHorizontal,
  Check
} from 'lucide-react';
import { GameMap } from '../types';

interface FloatingHeaderProps {
  currentServer: 'bandamarines' | 'bandastation' | 'bandatroopers';
  currentMap: GameMap | null;
  currentZ: number;
  showGrid: boolean;
  showPipenet: boolean;
  rulerActive: boolean;
  onServerChange: (server: 'bandamarines' | 'bandastation' | 'bandatroopers') => void;
  onOpenMapSearch: () => void;
  onZChange: (z: number) => void;
  onToggleGrid: () => void;
  onTogglePipenet: () => void;
  onToggleRuler: () => void;
  onCopyLink: () => void;
  isCopied: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  currentServer,
  currentMap,
  currentZ,
  showGrid,
  showPipenet,
  rulerActive,
  onServerChange,
  onOpenMapSearch,
  onZChange,
  onToggleGrid,
  onTogglePipenet,
  onToggleRuler,
  onCopyLink,
  isCopied,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const servers = [
    { id: 'bandastation' as const, name: 'Station', color: 'hover:border-sky-500 hover:text-sky-400' },
    { id: 'bandamarines' as const, name: 'Marines', color: 'hover:border-emerald-500 hover:text-emerald-400' },
    { id: 'bandatroopers' as const, name: 'Troopers', color: 'hover:border-orange-500 hover:text-orange-400' }
  ];

  const layers = currentMap?.layers || [];
  const hasPipenet = layers.some(l => l.pipenetUrl && l.pipenetUrl.length > 0);

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60 max-w-[95vw] transition-all">
      {/* Brand logo & name */}
      <div className="flex items-center gap-2 pl-1 pr-2 border-r border-white/10 select-none">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-500/5 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
          <Compass className="w-4 h-4" />
        </div>
        <span className="hidden sm:inline font-bold tracking-tight text-sm text-white">
          BANDA <span className="text-sky-400">MAP</span>
        </span>
      </div>

      {/* Server selector pills */}
      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
        {servers.map(s => {
          const isActive = currentServer === s.id;
          let activeClass = '';
          if (s.id === 'bandastation') activeClass = 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]';
          if (s.id === 'bandamarines') activeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(34,197,94,0.25)]';
          if (s.id === 'bandatroopers') activeClass = 'bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.25)]';

          return (
            <button
              key={s.id}
              onClick={() => onServerChange(s.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                isActive ? activeClass : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Map selector button (Command Palette trigger) */}
      <button
        onClick={onOpenMapSearch}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-xs font-medium transition-all group max-w-[200px] truncate"
        title="Выбрать карту (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors shrink-0" />
        <span className="truncate">{currentMap?.name || 'Выберите карту...'}</span>
        <kbd className="hidden md:inline text-[10px] font-mono text-slate-500 bg-black/50 px-1.5 py-0.5 rounded border border-white/5">
          ⌘K
        </kbd>
      </button>

      {/* Z-Level Pills (Only rendered if map has multi-deck) */}
      {layers.length > 1 && (
        <div className="flex items-center gap-1 pl-2 border-l border-white/10">
          {layers.map(l => (
            <button
              key={l.z}
              onClick={() => onZChange(l.z)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg border transition-all ${
                currentZ === l.z
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.25)]'
                  : 'bg-white/5 border-transparent text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={l.name}
            >
              Z:{l.z}
            </button>
          ))}
        </div>
      )}

      {/* Actions & Tools */}
      <div className="flex items-center gap-1 pl-2 border-l border-white/10 text-slate-400">
        {/* Toggle Grid */}
        <button
          onClick={onToggleGrid}
          className={`p-2 rounded-xl border transition-all ${
            showGrid 
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-400' 
              : 'border-transparent hover:bg-white/10 hover:text-white'
          }`}
          title="Вкл/Выкл координатную сетку"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>

        {/* Toggle Pipenet */}
        {hasPipenet && (
          <button
            onClick={onTogglePipenet}
            className={`p-2 rounded-xl border transition-all ${
              showPipenet 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                : 'border-transparent hover:bg-white/10 hover:text-white'
            }`}
            title="Оверлей трубопроводов (Pipenet)"
          >
            <GitCommitHorizontal className="w-4 h-4" />
          </button>
        )}

        {/* Ruler */}
        <button
          onClick={onToggleRuler}
          className={`p-2 rounded-xl border transition-all ${
            rulerActive 
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
              : 'border-transparent hover:bg-white/10 hover:text-white'
          }`}
          title="Инструмент: Линейка расстояния"
        >
          <Ruler className="w-4 h-4" />
        </button>

        {/* Copy Link */}
        <button
          onClick={onCopyLink}
          className={`p-2 rounded-xl border transition-all ${
            isCopied
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'border-transparent hover:bg-white/10 hover:text-white'
          }`}
          title="Скопировать ссылку на текущую карту и точку"
        >
          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl border border-transparent hover:bg-white/10 hover:text-white transition-all hidden sm:block"
          title="Полноэкранный режим"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
