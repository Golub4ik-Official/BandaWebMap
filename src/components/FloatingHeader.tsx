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
  Check,
  MapPin,
  Target
} from 'lucide-react';
import { GameMap, RoundOffset } from '../types';

interface FloatingHeaderProps {
  currentServer: 'bandamarines' | 'bandastation' | 'bandatroopers';
  currentMap: GameMap | null;
  currentZ: number;
  showGrid: boolean;
  showPipenet: boolean;
  showLocations: boolean;
  roundOffset: RoundOffset | null;
  rulerActive: boolean;
  onServerChange: (server: 'bandamarines' | 'bandastation' | 'bandatroopers') => void;
  onOpenMapSearch: () => void;
  onZChange: (z: number) => void;
  onToggleGrid: () => void;
  onTogglePipenet: () => void;
  onToggleLocations: () => void;
  onOpenCalibration: () => void;
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
  showLocations,
  roundOffset,
  rulerActive,
  onServerChange,
  onOpenMapSearch,
  onZChange,
  onToggleGrid,
  onTogglePipenet,
  onToggleLocations,
  onOpenCalibration,
  onToggleRuler,
  onCopyLink,
  isCopied,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const servers = [
    { id: 'bandamarines' as const, name: 'MARINES', code: 'USCM' },
    { id: 'bandastation' as const, name: 'STATION', code: 'NT-01' },
    { id: 'bandatroopers' as const, name: 'TROOPERS', code: 'UNSC' }
  ];

  const layers = currentMap?.layers || [];
  const hasPipenet = layers.some(l => l.pipenetUrl && l.pipenetUrl.length > 0);

  return (
    <header className="fixed top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 px-3.5 py-2 rounded-md bg-[#021206]/95 border-2 border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.35)] max-w-[96vw] select-none transition-all">
      {/* Brand logo & Tactical Terminal Code */}
      <div className="flex items-center gap-2 pr-2 border-r-2 border-[#00ff41]/40">
        <div className="w-7 h-7 rounded-sm bg-[#00ff41] text-black flex items-center justify-center font-bold text-xs shadow-[0_0_10px_#00ff41]">
          <Compass className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-bold text-[13px] tracking-wider text-[#00ff41] cm-text-glow">
            USCM // TACTICAL
          </span>
          <span className="text-[10px] text-[#00b32c] tracking-widest font-mono">
            WI-56 NET
          </span>
        </div>
      </div>

      {/* Server frequency / Squad selector */}
      <div className="flex items-center gap-1 bg-[#010a03] p-0.5 rounded border border-[#00ff41]/40">
        {servers.map(s => {
          const isActive = currentServer === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onServerChange(s.id)}
              className={`px-2.5 py-1 text-xs font-mono font-bold tracking-wider rounded-sm transition-all duration-150 ${
                isActive 
                  ? 'bg-[#00e639] text-black shadow-[0_0_10px_rgba(0,255,65,0.7)]' 
                  : 'text-[#00aa2b] hover:text-[#00ff41] hover:bg-[#00ff41]/10'
              }`}
            >
              [{s.name}]
            </button>
          );
        })}
      </div>

      {/* Map selector button (Terminal Command trigger) */}
      <button
        onClick={onOpenMapSearch}
        className="flex items-center gap-2 px-3 py-1 rounded bg-[#011a07] hover:bg-[#02290b] border border-[#00ff41]/60 hover:border-[#00ff41] text-[#00ff41] text-xs font-mono tracking-wide transition-all group max-w-[220px] truncate shadow-[0_0_8px_rgba(0,255,65,0.15)]"
        title="Открыть архив карт (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-[#00ff41] group-hover:scale-110 transition-transform shrink-0" />
        <span className="truncate uppercase font-bold">{currentMap?.name || 'ВЫБРАТЬ КАРТУ...'}</span>
        <kbd className="hidden md:inline text-[10px] font-mono text-black bg-[#00ff41] px-1.5 py-0.2 rounded font-bold">
          ^K
        </kbd>
      </button>

      {/* Z-Level Pills (Tactical Decks) */}
      {layers.length > 1 && (
        <div className="flex items-center gap-1 pl-2 border-l-2 border-[#00ff41]/40">
          {layers.map(l => (
            <button
              key={l.z}
              onClick={() => onZChange(l.z)}
              className={`px-2 py-0.5 text-xs font-mono font-bold rounded-sm border transition-all ${
                currentZ === l.z
                  ? 'bg-[#00e639] text-black border-[#00ff41] shadow-[0_0_8px_#00ff41]'
                  : 'bg-[#011406] text-[#00aa2b] border-[#00ff41]/30 hover:text-[#00ff41] hover:border-[#00ff41]'
              }`}
              title={l.name}
            >
              Z:{l.z}
            </button>
          ))}
        </div>
      )}

      {/* Actions & Tools */}
      <div className="flex items-center gap-1.5 pl-2 border-l-2 border-[#00ff41]/40 text-[#00ff41]">
        {/* Toggle Grid */}
        <button
          onClick={onToggleGrid}
          className={`p-1.5 rounded-sm border transition-all ${
            showGrid 
              ? 'bg-[#00e639] text-black border-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.6)] font-bold' 
              : 'border-[#00ff41]/30 text-[#00aa2b] hover:text-[#00ff41] hover:border-[#00ff41] bg-[#011406]'
          }`}
          title="Сетка координат (G)"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>

        {/* Toggle Locations / Areas */}
        <button
          onClick={onToggleLocations}
          className={`p-1.5 rounded-sm border transition-all ${
            showLocations 
              ? 'bg-[#00e639] text-black border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.8)] font-bold' 
              : 'border-[#00ff41]/30 text-[#00aa2b] hover:text-[#00ff41] hover:border-[#00ff41] bg-[#011406]'
          }`}
          title="Названия секторов и зон (L)"
        >
          <MapPin className="w-4 h-4" />
        </button>

        {/* Tactical Calibration (OB & Mortar) */}
        <button
          onClick={onOpenCalibration}
          className={`p-1.5 rounded-sm border transition-all ${
            roundOffset 
              ? 'bg-[#00e639] text-black border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.8)] font-bold' 
              : 'border-[#00ff41]/30 text-[#00aa2b] hover:text-[#00ff41] hover:border-[#00ff41] bg-[#011406]'
          }`}
          title={roundOffset ? `Калибровка ОБ активна (ΔX:${roundOffset.x >= 0 ? `+${roundOffset.x}` : roundOffset.x}, ΔY:${roundOffset.y >= 0 ? `+${roundOffset.y}` : roundOffset.y}) [C]` : "Калибровка координат раунда для ОБ (C)"}
        >
          <Target className="w-4 h-4" />
        </button>

        {/* Toggle Pipenet */}
        {hasPipenet && (
          <button
            onClick={onTogglePipenet}
            className={`p-1.5 rounded-sm border transition-all ${
              showPipenet 
                ? 'bg-[#00e639] text-black border-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.6)] font-bold' 
                : 'border-[#00ff41]/30 text-[#00aa2b] hover:text-[#00ff41] hover:border-[#00ff41] bg-[#011406]'
            }`}
            title="Трубопроводы (Pipenet)"
          >
            <GitCommitHorizontal className="w-4 h-4" />
          </button>
        )}

        {/* Ruler */}
        <button
          onClick={onToggleRuler}
          className={`p-1.5 rounded-sm border transition-all ${
            rulerActive 
              ? 'bg-[#00e639] text-black border-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.6)] font-bold' 
              : 'border-[#00ff41]/30 text-[#00aa2b] hover:text-[#00ff41] hover:border-[#00ff41] bg-[#011406]'
          }`}
          title="Тактическая линейка дистанции"
        >
          <Ruler className="w-4 h-4" />
        </button>

        {/* Copy Link */}
        <button
          onClick={onCopyLink}
          className={`p-1.5 rounded-sm border transition-all ${
            isCopied
              ? 'bg-[#00ff41] text-black border-[#00ff41] shadow-[0_0_12px_#00ff41]'
              : 'border-[#00ff41]/30 text-[#00aa2b] hover:text-[#00ff41] hover:border-[#00ff41] bg-[#011406]'
          }`}
          title="Копировать тактические координаты"
        >
          {isCopied ? <Check className="w-4 h-4 stroke-[3]" /> : <Share2 className="w-4 h-4" />}
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-sm border border-[#00ff41]/30 text-[#00aa2b] hover:text-[#00ff41] hover:border-[#00ff41] bg-[#011406] transition-all hidden sm:block"
          title="Полноэкранный режим терминала"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
